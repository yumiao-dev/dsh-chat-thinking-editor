/**
 * The edit list modal: lists EVERY finalized assistant message in the current
 * conversation window (each reply the assistant produced — including the ones
 * between tool calls). Each row expands into two editors: reply text and
 * reasoning chain. Every row saves independently through the Host
 * `assistantEdit/replace` Remote, which records a plugin-owned message
 * projection: the model-visible history carries the edited content, and the
 * same message can be edited any number of times.
 *
 * The transcript rendered behind this modal is built from raw session events
 * and does not apply message projections, so the modal reads the committed
 * edits back through `assistantEdit/list` and overlays them on the collected
 * transcript values. A row with no committed edit shows the original reply.
 *
 * Closing: the dialog closes ONLY via the close button pinned at the TOP-LEFT
 * of the header. Backdrop taps, outside pointer-downs, touch swipes, and the
 * Escape key never close it — mobile remote access kept dismissing the modal
 * by accident while scrolling.
 *
 * @module dsh-chat-thinking-editor/client/EditModal
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ClientConnectionRpc, MessageId, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { ChatNode, ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import { IconCloseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { AssistantEditActionProps } from './slots.ts'
import css from './assistant-edit.module.css'

/** Locale prop narrowed to the keys this modal consumes. */
type ModalT = AssistantEditActionProps['t']

/** One modal's props: owner message (for initial focus) + session kit + injected face. */
export interface EditModalProps {
  /** Message whose pencil opened the modal; its row starts expanded. */
  messageId: MessageId
  /** Chat selector hook; the transcript supplies every editable reply. */
  useChat: AssistantEditActionProps['useChat']
  sessionId: SessionId
  rpc: ClientConnectionRpc | undefined
  t: ModalT
  running: boolean
  onClose: (edited: boolean) => void
}

/** One editable assistant reply collected from the conversation snapshot. */
interface EditableItem {
  /** Stable React key (the message identity). */
  key: string
  /** Stable identity carried by the `assistant/message` event. */
  messageId: MessageId
  /** Surface node seq of the source `assistant/message` event; the edit target. */
  seq: number
  /** Owning turn (1-based). */
  turn: number
  /** Owning step within the turn. */
  step: number
  /** Whether this reply was frozen by an interruption. */
  interrupted: boolean
  /** Current surface reply text. */
  text: string
  /** Current surface reasoning chain. */
  reasoning: string
}

/** Collect every finalized assistant reply visible in the window, in order. */
function collectEditable(snapshot: ChatSnapshot | undefined): EditableItem[] {
  if (snapshot === undefined) return []
  const items: EditableItem[] = []
  for (const node of snapshot.nodes.values() as readonly ChatNode[]) {
    if (node.kind !== 'assistant-step') continue
    const data = node.data
    const final = data.finalNode
    if (final?.messageId === undefined) continue
    const blocks = final.blocks
    items.push({
      key: String(final.messageId),
      messageId: final.messageId,
      seq: final.seq,
      turn: data.turn,
      step: data.step,
      interrupted: final.interrupted === true,
      text: blocks.filter(block => block.kind === 'text').map(block => block.text).join(''),
      reasoning: blocks.filter(block => block.kind === 'reasoning').map(block => block.text).join(''),
    })
  }
  items.sort((a, b) => a.turn - b.turn || a.step - b.step)
  return items
}

/** One row's transient lifecycle state. */
type RowState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

/** A local draft for one row, keyed by message identity. */
interface Draft {
  text: string
  reasoning: string
}

/** One committed edit as the Host reports it. */
interface CommittedEdit {
  targetSeq: number
  text: string
  reasoning: string
}

/** Read the committed edits out of one `assistantEdit/list` response body. */
function readCommitted(value: unknown): CommittedEdit[] {
  if (typeof value !== 'object' || value === null) return []
  const body = value as { ok?: unknown; edits?: unknown }
  if (body.ok !== true || !Array.isArray(body.edits)) return []
  const edits: CommittedEdit[] = []
  for (const entry of body.edits as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue
    const row = entry as { targetSeq?: unknown; text?: unknown; reasoning?: unknown }
    if (typeof row.targetSeq !== 'number' || typeof row.text !== 'string' || typeof row.reasoning !== 'string') continue
    edits.push({ targetSeq: row.targetSeq, text: row.text, reasoning: row.reasoning })
  }
  return edits
}

/**
 * The modal dialog listing and editing every assistant message.
 * @param props - identity, read hooks, transport, and close callback.
 */
export function EditModal({
  messageId, useChat, sessionId, rpc, t, running, onClose,
}: EditModalProps) {
  const collected = useChat(collectEditable)
  const [committed, setCommitted] = useState<Record<number, Draft>>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const anySavedRef = useRef(false)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  // Overlay the committed edits: the rendered transcript keeps the original
  // events, so the modal is the only place the edited truth is visible.
  const items = useMemo<EditableItem[]>(() => collected.map(item => {
    const override = committed[item.seq]
    return override === undefined ? item : { ...item, text: override.text, reasoning: override.reasoning }
  }), [collected, committed])

  // Read back what earlier sessions already committed for this conversation.
  useEffect(() => {
    if (rpc === undefined) return
    let cancelled = false
    void (async () => {
      try {
        const result = await rpc.call('/api', 'assistantEdit/list', {
          args: { request: { sessionId } },
        })
        if (cancelled || !result.ok) return
        const next: Record<number, Draft> = {}
        for (const edit of readCommitted(result.value)) {
          next[edit.targetSeq] = { text: edit.text, reasoning: edit.reasoning }
        }
        setCommitted(next)
      } catch {
        // The modal still works from the transcript values alone.
      }
    })()
    return () => { cancelled = true }
  }, [rpc, sessionId])

  // On open: expand (and scroll to) the row whose pencil was clicked.
  useEffect(() => {
    const initialKey = String(messageId)
    if (items.some(item => item.key === initialKey)) {
      setExpandedKey(initialKey)
      // Defer to the next paint so the row is mounted before scrolling.
      requestAnimationFrame(() => {
        rowRefs.current.get(initialKey)?.scrollIntoView({ block: 'center' })
      })
    } else if (items.length > 0) {
      setExpandedKey(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleRow = useCallback((key: string) => {
    setExpandedKey(current => (current === key ? null : key))
  }, [])

  const setDraft = useCallback((key: string, patch: Partial<Draft>) => {
    setDrafts(current => {
      const existing = current[key]
      const next: Draft = {
        text: patch.text ?? existing?.text ?? '',
        reasoning: patch.reasoning ?? existing?.reasoning ?? '',
      }
      return { ...current, [key]: next }
    })
    setRowStates(current => {
      const state = current[key]
      if (state === undefined || state.status === 'idle') return current
      return { ...current, [key]: { status: 'idle' } }
    })
  }, [])

  const saveRow = useCallback(async (item: EditableItem) => {
    const key = item.key
    if (rpc === undefined) {
      setRowStates(current => ({ ...current, [key]: { status: 'error', message: t('error.generic') } }))
      return
    }
    const draft = drafts[key] ?? { text: item.text, reasoning: item.reasoning }
    setRowStates(current => ({ ...current, [key]: { status: 'saving' } }))
    try {
      const result = await rpc.call('/api', 'assistantEdit/replace', {
        args: { request: { sessionId, messageId: item.messageId, text: draft.text, reasoning: draft.reasoning } },
      })
      const business = result.ok
        ? (result.value as { ok: boolean; error?: { code: string } } | null)
        : null
      if (business?.ok !== true) {
        const code = business?.error?.code
        const message = code === 'session-not-found' ? t('error.sessionNotFound')
          : code === 'message-not-found' ? t('error.messageNotFound')
            : code === 'message-not-editable' ? t('error.messageEol')
              : t('error.generic')
        setRowStates(current => ({ ...current, [key]: { status: 'error', message } }))
        return
      }
      // Success: the projection changes the model-visible history, not the
      // rendered transcript, so record the committed value for this row and
      // drop the draft that was shadowing it.
      anySavedRef.current = true
      setCommitted(current => ({ ...current, [item.seq]: { text: draft.text, reasoning: draft.reasoning } }))
      setDrafts(current => {
        if (current[key] === undefined) return current
        const next = { ...current }
        delete next[key]
        return next
      })
      setRowStates(current => ({ ...current, [key]: { status: 'saved' } }))
    } catch {
      setRowStates(current => ({ ...current, [key]: { status: 'error', message: t('error.generic') } }))
    }
  }, [drafts, rpc, sessionId, t])

  const close = useCallback(() => {
    onClose(anySavedRef.current)
  }, [onClose])

  const countLabel = useMemo(
    () => `${String(items.length)} ${t('row.count')}`,
    [items.length, t],
  )

  return createPortal(
    <div className={css.overlay} role="presentation">
      {/* Pure visual mask: taps and swipes land here and are intentionally
          ignored — only the top-left close button dismisses the dialog. */}
      <div className={css.mask} aria-hidden="true" />
      <div
        className={css.modal}
        role="dialog"
        aria-modal="true"
        aria-label={t('dialog.title')}
      >
        <div className={css.modalHeader}>
          <button type="button" className={css.close} aria-label={t('dialog.close')} onClick={close}>
            <IconCloseOutlineRegular size={14} />
          </button>
          <div className={css.titleWrap}>
            <h2 className={css.modalTitle}>{t('dialog.title')}</h2>
            <span className={css.count}>{countLabel}</span>
          </div>
        </div>
        {running && <p className={css.notice} role="status">{t('dialog.runningNotice')}</p>}
        <p className={css.hint}>{t('dialog.hint')}</p>
        {items.length === 0
          ? <p className={css.empty}>{t('dialog.empty')}</p>
          : (
            <div className={css.list} role="list">
              {items.map((item, index) => (
                <Row
                  key={item.key}
                  item={item}
                  index={index}
                  draft={drafts[item.key]}
                  state={rowStates[item.key] ?? { status: 'idle' }}
                  expanded={expandedKey === item.key}
                  running={running}
                  t={t}
                  onToggle={toggleRow}
                  onDraftChange={setDraft}
                  onSave={saveRow}
                  registerRef={element => {
                    if (element === null) rowRefs.current.delete(item.key)
                    else rowRefs.current.set(item.key, element)
                  }}
                />
              ))}
            </div>
          )}
      </div>
    </div>,
    document.body,
  )
}

/** One list row's props. */
interface RowProps {
  item: EditableItem
  index: number
  draft: Draft | undefined
  state: RowState
  expanded: boolean
  running: boolean
  t: ModalT
  onToggle: (key: string) => void
  onDraftChange: (key: string, patch: Partial<Draft>) => void
  onSave: (item: EditableItem) => void
  registerRef: (element: HTMLDivElement | null) => void
}

/** Keep Ctrl/Cmd+A scoped to the focused textarea so a "select all + delete"
 * in one editor never spills into (and erases) the sibling field too. */
function confineSelectAll(event: KeyboardEvent<HTMLTextAreaElement>): void {
  if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
    event.preventDefault()
    event.currentTarget.select()
  }
}

/** One assistant message row: collapsed preview header + expandable editors. */
function Row({
  item, index, draft, state, expanded, running, t, onToggle, onDraftChange, onSave, registerRef,
}: RowProps) {
  const text = draft?.text ?? item.text
  const reasoning = draft?.reasoning ?? item.reasoning
  const previewSource = text.trim() !== '' ? text : reasoning
  const preview = previewSource.replace(/\s+/g, ' ').trim().slice(0, 80)
  const saving = state.status === 'saving'

  return (
    <div className={css.row} ref={registerRef} data-expanded={expanded || undefined} role="listitem">
      <button type="button" className={css.rowHead} onClick={() => { onToggle(item.key) }}>
        <span className={css.rowIndex}>{String(index + 1)}</span>
        <span className={css.rowMeta}>
          <span className={css.rowBadge}>T{String(item.turn)}·S{String(item.step)}</span>
          {item.interrupted && <span className={css.rowBadgeMuted}>{t('row.interrupted')}</span>}
          {state.status === 'saved' && <span className={css.savedBadge}>{t('row.saved')}</span>}
        </span>
        <span className={css.rowPreview}>{preview}</span>
        <span className={css.chevron} data-open={expanded || undefined} aria-hidden="true">▾</span>
      </button>
      {expanded && (
        <div className={css.rowBody}>
          <div className={css.field}>
            <label className={css.label} htmlFor={`assistant-edit-text-${item.key}`}>{t('dialog.replyLabel')}</label>
            <textarea
              id={`assistant-edit-text-${item.key}`}
              className={css.input}
              value={text}
              rows={6}
              disabled={running || saving}
              onKeyDown={confineSelectAll}
              onChange={event => { onDraftChange(item.key, { text: event.target.value }) }}
            />
          </div>
          <div className={css.field}>
            <label className={css.label} htmlFor={`assistant-edit-reasoning-${item.key}`}>{t('dialog.reasoningLabel')}</label>
            <textarea
              id={`assistant-edit-reasoning-${item.key}`}
              className={css.input}
              value={reasoning}
              rows={4}
              disabled={running || saving}
              onKeyDown={confineSelectAll}
              placeholder={item.reasoning === '' && reasoning === '' ? t('dialog.reasoningLabel') : undefined}
              onChange={event => { onDraftChange(item.key, { reasoning: event.target.value }) }}
            />
          </div>
          <div className={css.rowFooter}>
            {state.status === 'error' && <span className={css.failure} role="status">{state.message}</span>}
            <button
              type="button"
              className={css.save}
              disabled={running || saving}
              onClick={() => { void onSave(item) }}
            >
              {saving ? t('dialog.saving') : t('dialog.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
