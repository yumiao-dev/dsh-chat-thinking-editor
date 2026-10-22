/**
 * Per-message edit action: a toolbar button in the assistant-actions strip
 * that opens the edit LIST modal (every finalized assistant message in the
 * session, this one pre-expanded and scrolled into view). It reuses the
 * shipped toolbar Button and is disabled while the agent is running.
 * @module dsh-assistant-edit/client/EditAction
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  Button, IconEditOutlineRegular, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { AssistantEditActionProps } from './slots.ts'
import { EditModal } from './EditModal.tsx'
import { ensureMessageEdits, messageEditsOf, subscribeMessageEdits } from './message-edits.ts'

/**
 * One message's edit entry.
 * @param props - owner message identity, session kit, and injected face.
 */
export function EditAction({
  messageId, useSession, rpc, sessionId, t,
}: AssistantEditActionProps) {
  // The addressed fragment is immutable and cache-stable; reuse it for the
  // closure below rather than a second read. `running` gates the pencil.
  const running = useSession(snapshot => snapshot.running)
  const subscribe = useCallback(
    (listener: () => void) => subscribeMessageEdits(sessionId, listener),
    [sessionId],
  )
  const read = useCallback(() => messageEditsOf(sessionId), [sessionId])
  const edits = useSyncExternalStore(subscribe, read, read)
  const edited = edits.has(messageId)
  useEffect(() => {
    if (rpc !== undefined) void ensureMessageEdits(sessionId, rpc)
  }, [sessionId, rpc])
  const [open, setOpen] = useState(false)
  const [justEdited, setJustEdited] = useState(false)
  const justEditedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openModal = useCallback(() => {
    setJustEdited(false)
    setOpen(true)
  }, [])

  const closeModal = useCallback((didEdit: boolean) => {
    setOpen(false)
    if (!didEdit) return
    setJustEdited(true)
    // Retire the transient "已编辑" state after a beat; the durable truth is
    // the host-side replacement event, not this badge.
    if (justEditedTimer.current !== null) clearTimeout(justEditedTimer.current)
    justEditedTimer.current = setTimeout(() => { setJustEdited(false) }, 2500)
  }, [])

  return (
    <>
      <Tooltip label={edited || justEdited ? t('edited.badge') : t('action.edit')} side="bottom">
        <Button
          variant="toolbar"
          size="sm"
          icon={<IconEditOutlineRegular size={16} />}
          aria-label={edited || justEdited ? t('edited.badge') : t('action.edit')}
          aria-pressed={edited || justEdited}
          onClick={openModal}
          disabled={running}
        />
      </Tooltip>
      {open && (
        <EditModal
          messageId={messageId}
          sessionId={sessionId}
          rpc={rpc}
          t={t}
          running={running}
          onClose={closeModal}
        />
      )}
    </>
  )
}