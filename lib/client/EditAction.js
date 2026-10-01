import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Per-message edit action: a pencil in the assistant-actions strip that opens
 * the edit LIST modal (every finalized assistant message in the session, this
 * one pre-expanded and scrolled into view). The button reuses the IconActions
 * row chrome (28px circle, hover fill) and is disabled while the agent is
 * running, matching the conflict rule.
 * @module dsh-chat-thinking-editor/client/EditAction
 */
import { useCallback, useRef, useState } from 'react';
import { IconEditOutlineRegular, Tooltip, } from '@deepseek-ai/dsh-client-ui-primitives';
import { EditModal } from "./EditModal.js";
import css from './assistant-edit.module.css';
/**
 * One message's edit entry.
 * @param props - owner message identity, session kit, and injected face.
 */
export function EditAction({ messageId, useSession, useChat, rpc, sessionId, t, }) {
    // The addressed fragment is immutable and cache-stable; reuse it for the
    // closure below rather than a second read. `running` gates the pencil.
    const running = useSession(snapshot => snapshot.running) === true;
    const [open, setOpen] = useState(false);
    const [justEdited, setJustEdited] = useState(false);
    const justEditedTimer = useRef(null);
    const openModal = useCallback(() => {
        setJustEdited(false);
        setOpen(true);
    }, []);
    const closeModal = useCallback((edited) => {
        setOpen(false);
        if (!edited)
            return;
        setJustEdited(true);
        // Retire the transient "已编辑" state after a beat; the durable truth is
        // the host-side edit event, not this badge.
        if (justEditedTimer.current !== null)
            clearTimeout(justEditedTimer.current);
        justEditedTimer.current = setTimeout(() => { setJustEdited(false); }, 2500);
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx(Tooltip, { label: justEdited ? t('edited.badge') : t('action.edit'), side: "bottom", children: _jsx("button", { type: "button", className: css.action, "aria-label": justEdited ? t('edited.badge') : t('action.edit'), "data-active": justEdited || undefined, onClick: openModal, disabled: running, children: _jsx(IconEditOutlineRegular, {}) }) }), open && (_jsx(EditModal, { messageId: messageId, useChat: useChat, sessionId: sessionId, rpc: rpc, t: t, running: running, onClose: closeModal }))] }));
}
