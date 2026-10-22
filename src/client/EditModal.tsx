/**
 * Single-message edit dialog, built entirely on shipped DSH primitives:
 * `Modal` for chrome/close/escape, `Button` for actions, `Tag` for state, and
 * `TextShimmer` for loading. No list, no nested scroll: the clicked message's
 * reply and reasoning are the only two fields.
 *
 * @module dsh-assistant-edit/client/EditModal
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ClientConnectionRpc, MessageId, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import {
  Button, Modal, Tag, TextShimmer,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { AssistantEditActionProps } from './slots.ts'
import { refreshMessageEdits } from './message-edits.ts'
import css from './assistant-edit.module.css'

/** Locale prop narrowed to the keys this dialog consumes. */
type ModalT = AssistantEditActionProps['t']

/** One dialog's props: the clicked message, session kit, and close callback. */
export interface EditModalProps {
  /** Message whose pencil opened the dialog. */
  messageId: MessageId
  sessionId: SessionId
  rpc: ClientConnectionRpc | undefined
  t: ModalT
  running: boolean
  onClose: (edited: boolean) => void
}

/** One editable assistant reply as the Host listed it. */
interface EditableItem {
  messageId: MessageId
  turn: number
  step: number
  interrupted: boolean
  text: string
  reasoning: string
  sourceText: string
  sourceReasoning: string
  edited: boolean
}

/** Wire shape of `assistantEdit/list` (business result carried by the RPC). */
type ListResult =
  | { ok: true; items: readonly EditableItem[] }
  | { ok: false; error: { code: string; message: string } }

/** One draft of the two editable fields. */
interface Draft {
  text: string
  reasoning: string
}

/** Transient save state. */
type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

/**
 * The dialog editing exactly the message whose pencil was clicked.
 * @param props - message identity, transport, running state, and close callback.
 */
export function EditModal({
  messageId, sessionId, rpc, t, running, onClose,
}: EditModalProps) {
  const [item, setItem] = useState<EditableItem | null>(null)
  const [draft, setDraft] = useState<Draft>({ text: '', reasoning: '' })
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })
  const savedRef = useRef(false)

  /** Read this message's current projected content from the Host. */
  const load = useCallback(async (): Promise<EditableItem | null> => {
    if (rpc === undefined) {
      setLoadFailed(true)
      setLoading(false)
      return null
    }
    try {
      const result = await rpc.call('/api', 'assistantEdit/list', {
        args: { request: { sessionId } },
      })
      const business = result.ok ? (result.value as ListResult | null) : null
      if (business?.ok !== true) {
        setLoadFailed(true)
        return null
      }
      const found = business.items.find(candidate => candidate.messageId === messageId) ?? null
      setItem(found)
      setLoadFailed(found === null)
      if (found !== null) setDraft({ text: found.text, reasoning: found.reasoning })
      return found
    } catch {
      setLoadFailed(true)
      return null
    } finally {
      setLoading(false)
    }
  }, [messageId, rpc, sessionId])

  useEffect(() => {
    void load()
  }, [load])

  /** Send one replacement and refresh the transcript override. */
  const replace = useCallback(async (text: string, reasoning: string): Promise<boolean> => {
    if (rpc === undefined || item === null) {
      setSaveState({ status: 'error', message: t('error.generic') })
      return false
    }
    setSaveState({ status: 'saving' })
    try {
      const result = await rpc.call('/api', 'assistantEdit/replace', {
        args: { request: { sessionId, messageId: item.messageId, text, reasoning } },
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
        setSaveState({ status: 'error', message })
        return false
      }
      setSaveState({ status: 'saved' })
      savedRef.current = true
      void refreshMessageEdits(sessionId, rpc)
      await load()
      return true
    } catch {
      setSaveState({ status: 'error', message: t('error.generic') })
      return false
    }
  }, [item, load, rpc, sessionId, t])

  const editDraft = useCallback((patch: Partial<Draft>) => {
    setDraft(current => ({ ...current, ...patch }))
    setSaveState({ status: 'idle' })
  }, [])

  const dirty = item !== null && (draft.text !== item.text || draft.reasoning !== item.reasoning)
  const saving = saveState.status === 'saving'

  const close = useCallback(() => {
    onClose(savedRef.current)
  }, [onClose])

  const save = useCallback(() => {
    void replace(draft.text, draft.reasoning)
  }, [draft.reasoning, draft.text, replace])

  const restore = useCallback(() => {
    if (item === null) return
    void replace(item.sourceText, item.sourceReasoning)
  }, [item, replace])

  /** Keep Ctrl/Cmd+A scoped to the focused textarea. */
  const confineSelectAll = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
      event.preventDefault()
      event.currentTarget.select()
    }
  }, [])

  return (
    <Modal
      open
      onClose={close}
      title={t('dialog.title')}
      closeLabel={t('dialog.close')}
      description={t('dialog.hint')}
      className={css.modal}
      contentClassName={css.modalContent}
      footer={(
        <>
          <Button variant="ghost" size="sm" onClick={close}>
            {t('dialog.close')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!dirty || running || saving}
            onClick={save}
          >
            {saving ? t('dialog.saving') : t('dialog.save')}
          </Button>
        </>
      )}
    >
      {running && <Tag tone="warning">{t('dialog.runningNotice')}</Tag>}
      {loading
        ? (
          <p className={css.status} role="status">
            <TextShimmer active>{t('dialog.loading')}</TextShimmer>
          </p>
        )
        : loadFailed || item === null
          ? <p className={css.status} role="status">{t('error.messageNotFound')}</p>
          : (
            <>
              <div className={css.field}>
                <label className={css.label} htmlFor="assistant-edit-text">{t('dialog.replyLabel')}</label>
                <textarea
                  id="assistant-edit-text"
                  className={css.textarea}
                  value={draft.text}
                  rows={8}
                  disabled={running || saving}
                  onKeyDown={confineSelectAll}
                  onChange={event => { editDraft({ text: event.target.value }) }}
                />
              </div>
              <div className={css.field}>
                <label className={css.label} htmlFor="assistant-edit-reasoning">{t('dialog.reasoningLabel')}</label>
                <textarea
                  id="assistant-edit-reasoning"
                  className={css.textarea}
                  value={draft.reasoning}
                  rows={6}
                  disabled={running || saving}
                  onKeyDown={confineSelectAll}
                  placeholder={t('dialog.reasoningLabel')}
                  onChange={event => { editDraft({ reasoning: event.target.value }) }}
                />
              </div>
              {(item.edited || saveState.status === 'saved' || saveState.status === 'error') && (
                <div className={css.metaRow}>
                  {item.edited && <Tag tone="info">{t('row.edited')}</Tag>}
                  {saveState.status === 'saved' && <Tag tone="success">{t('row.saved')}</Tag>}
                  {saveState.status === 'error' && <Tag tone="danger">{saveState.message}</Tag>}
                  {item.edited && (
                    <Button variant="ghost" size="sm" disabled={running || saving} onClick={restore}>
                      {t('dialog.restore')}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
    </Modal>
  )
}
