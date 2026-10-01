import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCloseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './assistant-edit.module.css';
/** Collect every finalized assistant reply visible in the window, in order. */
function collectEditable(snapshot) {
    if (snapshot === undefined)
        return [];
    const items = [];
    for (const node of snapshot.nodes.values()) {
        if (node.kind !== 'assistant-step')
            continue;
        const data = node.data;
        const final = data.finalNode;
        if (final?.messageId === undefined)
            continue;
        const blocks = final.blocks;
        items.push({
            key: String(final.messageId),
            messageId: final.messageId,
            seq: final.seq,
            turn: data.turn,
            step: data.step,
            interrupted: final.interrupted === true,
            text: blocks.filter(block => block.kind === 'text').map(block => block.text).join(''),
            reasoning: blocks.filter(block => block.kind === 'reasoning').map(block => block.text).join(''),
        });
    }
    items.sort((a, b) => a.turn - b.turn || a.step - b.step);
    return items;
}
/** Read the committed edits out of one `assistantEdit/list` response body. */
function readCommitted(value) {
    if (typeof value !== 'object' || value === null)
        return [];
    const body = value;
    if (body.ok !== true || !Array.isArray(body.edits))
        return [];
    const edits = [];
    for (const entry of body.edits) {
        if (typeof entry !== 'object' || entry === null)
            continue;
        const row = entry;
        if (typeof row.targetSeq !== 'number' || typeof row.text !== 'string' || typeof row.reasoning !== 'string')
            continue;
        edits.push({ targetSeq: row.targetSeq, text: row.text, reasoning: row.reasoning });
    }
    return edits;
}
/**
 * The modal dialog listing and editing every assistant message.
 * @param props - identity, read hooks, transport, and close callback.
 */
export function EditModal({ messageId, useChat, sessionId, rpc, t, running, onClose, }) {
    const collected = useChat(collectEditable);
    const [committed, setCommitted] = useState({});
    const [drafts, setDrafts] = useState({});
    const [rowStates, setRowStates] = useState({});
    const [expandedKey, setExpandedKey] = useState(null);
    const anySavedRef = useRef(false);
    const rowRefs = useRef(new Map());
    // Overlay the committed edits: the rendered transcript keeps the original
    // events, so the modal is the only place the edited truth is visible.
    const items = useMemo(() => collected.map(item => {
        const override = committed[item.seq];
        return override === undefined ? item : { ...item, text: override.text, reasoning: override.reasoning };
    }), [collected, committed]);
    // Read back what earlier sessions already committed for this conversation.
    useEffect(() => {
        if (rpc === undefined)
            return;
        let cancelled = false;
        void (async () => {
            try {
                const result = await rpc.call('/api', 'assistantEdit/list', {
                    args: { request: { sessionId } },
                });
                if (cancelled || !result.ok)
                    return;
                const next = {};
                for (const edit of readCommitted(result.value)) {
                    next[edit.targetSeq] = { text: edit.text, reasoning: edit.reasoning };
                }
                setCommitted(next);
            }
            catch {
                // The modal still works from the transcript values alone.
            }
        })();
        return () => { cancelled = true; };
    }, [rpc, sessionId]);
    // On open: expand (and scroll to) the row whose pencil was clicked.
    useEffect(() => {
        const initialKey = String(messageId);
        if (items.some(item => item.key === initialKey)) {
            setExpandedKey(initialKey);
            // Defer to the next paint so the row is mounted before scrolling.
            requestAnimationFrame(() => {
                rowRefs.current.get(initialKey)?.scrollIntoView({ block: 'center' });
            });
        }
        else if (items.length > 0) {
            setExpandedKey(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const toggleRow = useCallback((key) => {
        setExpandedKey(current => (current === key ? null : key));
    }, []);
    const setDraft = useCallback((key, patch) => {
        setDrafts(current => {
            const existing = current[key];
            const next = {
                text: patch.text ?? existing?.text ?? '',
                reasoning: patch.reasoning ?? existing?.reasoning ?? '',
            };
            return { ...current, [key]: next };
        });
        setRowStates(current => {
            const state = current[key];
            if (state === undefined || state.status === 'idle')
                return current;
            return { ...current, [key]: { status: 'idle' } };
        });
    }, []);
    const saveRow = useCallback(async (item) => {
        const key = item.key;
        if (rpc === undefined) {
            setRowStates(current => ({ ...current, [key]: { status: 'error', message: t('error.generic') } }));
            return;
        }
        const draft = drafts[key] ?? { text: item.text, reasoning: item.reasoning };
        setRowStates(current => ({ ...current, [key]: { status: 'saving' } }));
        try {
            const result = await rpc.call('/api', 'assistantEdit/replace', {
                args: { request: { sessionId, messageId: item.messageId, text: draft.text, reasoning: draft.reasoning } },
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
                setRowStates(current => ({ ...current, [key]: { status: 'error', message } }));
                return;
            }
            // Success: the projection changes the model-visible history, not the
            // rendered transcript, so record the committed value for this row and
            // drop the draft that was shadowing it.
            anySavedRef.current = true;
            setCommitted(current => ({ ...current, [item.seq]: { text: draft.text, reasoning: draft.reasoning } }));
            setDrafts(current => {
                if (current[key] === undefined)
                    return current;
                const next = { ...current };
                delete next[key];
                return next;
            });
            setRowStates(current => ({ ...current, [key]: { status: 'saved' } }));
        }
        catch {
            setRowStates(current => ({ ...current, [key]: { status: 'error', message: t('error.generic') } }));
        }
    }, [drafts, rpc, sessionId, t]);
    const close = useCallback(() => {
        onClose(anySavedRef.current);
    }, [onClose]);
    const countLabel = useMemo(() => `${String(items.length)} ${t('row.count')}`, [items.length, t]);
    return createPortal(_jsxs("div", { className: css.overlay, role: "presentation", children: [_jsx("div", { className: css.mask, "aria-hidden": "true" }), _jsxs("div", { className: css.modal, role: "dialog", "aria-modal": "true", "aria-label": t('dialog.title'), children: [_jsxs("div", { className: css.modalHeader, children: [_jsx("button", { type: "button", className: css.close, "aria-label": t('dialog.close'), onClick: close, children: _jsx(IconCloseOutlineRegular, { size: 14 }) }), _jsxs("div", { className: css.titleWrap, children: [_jsx("h2", { className: css.modalTitle, children: t('dialog.title') }), _jsx("span", { className: css.count, children: countLabel })] })] }), running && _jsx("p", { className: css.notice, role: "status", children: t('dialog.runningNotice') }), _jsx("p", { className: css.hint, children: t('dialog.hint') }), items.length === 0
                        ? _jsx("p", { className: css.empty, children: t('dialog.empty') })
                        : (_jsx("div", { className: css.list, role: "list", children: items.map((item, index) => (_jsx(Row, { item: item, index: index, draft: drafts[item.key], state: rowStates[item.key] ?? { status: 'idle' }, expanded: expandedKey === item.key, running: running, t: t, onToggle: toggleRow, onDraftChange: setDraft, onSave: saveRow, registerRef: element => {
                                    if (element === null)
                                        rowRefs.current.delete(item.key);
                                    else
                                        rowRefs.current.set(item.key, element);
                                } }, item.key))) }))] })] }), document.body);
}
/** Keep Ctrl/Cmd+A scoped to the focused textarea so a "select all + delete"
 * in one editor never spills into (and erases) the sibling field too. */
function confineSelectAll(event) {
    if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
        event.preventDefault();
        event.currentTarget.select();
    }
}
/** One assistant message row: collapsed preview header + expandable editors. */
function Row({ item, index, draft, state, expanded, running, t, onToggle, onDraftChange, onSave, registerRef, }) {
    const text = draft?.text ?? item.text;
    const reasoning = draft?.reasoning ?? item.reasoning;
    const previewSource = text.trim() !== '' ? text : reasoning;
    const preview = previewSource.replace(/\s+/g, ' ').trim().slice(0, 80);
    const saving = state.status === 'saving';
    return (_jsxs("div", { className: css.row, ref: registerRef, "data-expanded": expanded || undefined, role: "listitem", children: [_jsxs("button", { type: "button", className: css.rowHead, onClick: () => { onToggle(item.key); }, children: [_jsx("span", { className: css.rowIndex, children: String(index + 1) }), _jsxs("span", { className: css.rowMeta, children: [_jsxs("span", { className: css.rowBadge, children: ["T", String(item.turn), "\u00B7S", String(item.step)] }), item.interrupted && _jsx("span", { className: css.rowBadgeMuted, children: t('row.interrupted') }), state.status === 'saved' && _jsx("span", { className: css.savedBadge, children: t('row.saved') })] }), _jsx("span", { className: css.rowPreview, children: preview }), _jsx("span", { className: css.chevron, "data-open": expanded || undefined, "aria-hidden": "true", children: "\u25BE" })] }), expanded && (_jsxs("div", { className: css.rowBody, children: [_jsxs("div", { className: css.field, children: [_jsx("label", { className: css.label, htmlFor: `assistant-edit-text-${item.key}`, children: t('dialog.replyLabel') }), _jsx("textarea", { id: `assistant-edit-text-${item.key}`, className: css.input, value: text, rows: 6, disabled: running || saving, onKeyDown: confineSelectAll, onChange: event => { onDraftChange(item.key, { text: event.target.value }); } })] }), _jsxs("div", { className: css.field, children: [_jsx("label", { className: css.label, htmlFor: `assistant-edit-reasoning-${item.key}`, children: t('dialog.reasoningLabel') }), _jsx("textarea", { id: `assistant-edit-reasoning-${item.key}`, className: css.input, value: reasoning, rows: 4, disabled: running || saving, onKeyDown: confineSelectAll, placeholder: item.reasoning === '' && reasoning === '' ? t('dialog.reasoningLabel') : undefined, onChange: event => { onDraftChange(item.key, { reasoning: event.target.value }); } })] }), _jsxs("div", { className: css.rowFooter, children: [state.status === 'error' && _jsx("span", { className: css.failure, role: "status", children: state.message }), _jsx("button", { type: "button", className: css.save, disabled: running || saving, onClick: () => { void onSave(item); }, children: saving ? t('dialog.saving') : t('dialog.save') })] })] }))] }));
}
