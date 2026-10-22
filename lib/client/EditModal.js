import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Single-message edit dialog, built entirely on shipped DSH primitives:
 * `Modal` for chrome/close/escape, `Button` for actions, `Tag` for state, and
 * `TextShimmer` for loading. No list, no nested scroll: the clicked message's
 * reply and reasoning are the only two fields.
 *
 * @module dsh-assistant-edit/client/EditModal
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Modal, Tag, TextShimmer, } from '@deepseek-ai/dsh-client-ui-primitives';
import { refreshMessageEdits } from "./message-edits.js";
import css from './assistant-edit.module.css';
/**
 * The dialog editing exactly the message whose pencil was clicked.
 * @param props - message identity, transport, running state, and close callback.
 */
export function EditModal({ messageId, sessionId, rpc, t, running, onClose, }) {
    const [item, setItem] = useState(null);
    const [draft, setDraft] = useState({ text: '', reasoning: '' });
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saveState, setSaveState] = useState({ status: 'idle' });
    const savedRef = useRef(false);
    /** Read this message's current projected content from the Host. */
    const load = useCallback(async () => {
        if (rpc === undefined) {
            setLoadFailed(true);
            setLoading(false);
            return null;
        }
        try {
            const result = await rpc.call('/api', 'assistantEdit/list', {
                args: { request: { sessionId } },
            });
            const business = result.ok ? result.value : null;
            if (business?.ok !== true) {
                setLoadFailed(true);
                return null;
            }
            const found = business.items.find(candidate => candidate.messageId === messageId) ?? null;
            setItem(found);
            setLoadFailed(found === null);
            if (found !== null)
                setDraft({ text: found.text, reasoning: found.reasoning });
            return found;
        }
        catch {
            setLoadFailed(true);
            return null;
        }
        finally {
            setLoading(false);
        }
    }, [messageId, rpc, sessionId]);
    useEffect(() => {
        void load();
    }, [load]);
    /** Send one replacement and refresh the transcript override. */
    const replace = useCallback(async (text, reasoning) => {
        if (rpc === undefined || item === null) {
            setSaveState({ status: 'error', message: t('error.generic') });
            return false;
        }
        setSaveState({ status: 'saving' });
        try {
            const result = await rpc.call('/api', 'assistantEdit/replace', {
                args: { request: { sessionId, messageId: item.messageId, text, reasoning } },
            });
            const business = result.ok
                ? result.value
                : null;
            if (business?.ok !== true) {
                const code = business?.error?.code;
                const message = code === 'session-not-found' ? t('error.sessionNotFound')
                    : code === 'message-not-found' ? t('error.messageNotFound')
                        : code === 'message-not-editable' ? t('error.messageEol')
                            : t('error.generic');
                setSaveState({ status: 'error', message });
                return false;
            }
            setSaveState({ status: 'saved' });
            savedRef.current = true;
            void refreshMessageEdits(sessionId, rpc);
            await load();
            return true;
        }
        catch {
            setSaveState({ status: 'error', message: t('error.generic') });
            return false;
        }
    }, [item, load, rpc, sessionId, t]);
    const editDraft = useCallback((patch) => {
        setDraft(current => ({ ...current, ...patch }));
        setSaveState({ status: 'idle' });
    }, []);
    const dirty = item !== null && (draft.text !== item.text || draft.reasoning !== item.reasoning);
    const saving = saveState.status === 'saving';
    const close = useCallback(() => {
        onClose(savedRef.current);
    }, [onClose]);
    const save = useCallback(() => {
        void replace(draft.text, draft.reasoning);
    }, [draft.reasoning, draft.text, replace]);
    const restore = useCallback(() => {
        if (item === null)
            return;
        void replace(item.sourceText, item.sourceReasoning);
    }, [item, replace]);
    /** Keep Ctrl/Cmd+A scoped to the focused textarea. */
    const confineSelectAll = useCallback((event) => {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
            event.preventDefault();
            event.currentTarget.select();
        }
    }, []);
    return (_jsxs(Modal, { open: true, onClose: close, title: t('dialog.title'), closeLabel: t('dialog.close'), description: t('dialog.hint'), className: css.modal, contentClassName: css.modalContent, footer: (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: close, children: t('dialog.close') }), _jsx(Button, { variant: "primary", size: "sm", disabled: !dirty || running || saving, onClick: save, children: saving ? t('dialog.saving') : t('dialog.save') })] })), children: [running && _jsx(Tag, { tone: "warning", children: t('dialog.runningNotice') }), loading
                ? (_jsx("p", { className: css.status, role: "status", children: _jsx(TextShimmer, { active: true, children: t('dialog.loading') }) }))
                : loadFailed || item === null
                    ? _jsx("p", { className: css.status, role: "status", children: t('error.messageNotFound') })
                    : (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.field, children: [_jsx("label", { className: css.label, htmlFor: "assistant-edit-text", children: t('dialog.replyLabel') }), _jsx("textarea", { id: "assistant-edit-text", className: css.textarea, value: draft.text, rows: 8, disabled: running || saving, onKeyDown: confineSelectAll, onChange: event => { editDraft({ text: event.target.value }); } })] }), _jsxs("div", { className: css.field, children: [_jsx("label", { className: css.label, htmlFor: "assistant-edit-reasoning", children: t('dialog.reasoningLabel') }), _jsx("textarea", { id: "assistant-edit-reasoning", className: css.textarea, value: draft.reasoning, rows: 6, disabled: running || saving, onKeyDown: confineSelectAll, placeholder: t('dialog.reasoningLabel'), onChange: event => { editDraft({ reasoning: event.target.value }); } })] }), (item.edited || saveState.status === 'saved' || saveState.status === 'error') && (_jsxs("div", { className: css.metaRow, children: [item.edited && _jsx(Tag, { tone: "info", children: t('row.edited') }), saveState.status === 'saved' && _jsx(Tag, { tone: "success", children: t('row.saved') }), saveState.status === 'error' && _jsx(Tag, { tone: "danger", children: saveState.message }), item.edited && (_jsx(Button, { variant: "ghost", size: "sm", disabled: running || saving, onClick: restore, children: t('dialog.restore') }))] }))] }))] }));
}
