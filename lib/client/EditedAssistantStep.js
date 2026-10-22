import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Transcript-side assistant-step wrapper.
 *
 * The Chat transcript folds raw `assistant/message` events in the browser and
 * cannot see the Host's `plugin:assistant-edit` message projection. The plugin
 * replaces the shipped `assistant-step` entry's component in place (it cannot
 * register a competing node: DSH allows one declarer per child slot) and hands
 * the shipped view a node whose text/reasoning blocks are substituted with the
 * Host-projected edits. This fixes the visible reply and the reasoning summary
 * without reimplementing any shipped UI.
 *
 * @module dsh-assistant-edit/client/EditedAssistantStep
 */
import { memo, useCallback, useEffect, useSyncExternalStore, } from 'react';
import { ensureMessageEdits, messageEditsOf, subscribeMessageEdits, } from "./message-edits.js";
/** Tag carrying the component this wrapper replaced, across HMR reloads. */
export const ASSISTANT_STEP_ORIGINAL = Symbol('assistant-edit:original-component');
/** Rewrite the text/reasoning blocks to the projection's values. */
export function rewriteBlocks(blocks, edit) {
    const out = [];
    let textDone = false;
    let reasoningDone = false;
    for (const block of blocks) {
        if (block.kind === 'text') {
            if (!textDone) {
                out.push({ ...block, text: edit.text });
                textDone = true;
            }
            continue;
        }
        if (block.kind === 'reasoning') {
            if (!reasoningDone && edit.reasoning !== '')
                out.push({ ...block, text: edit.reasoning });
            reasoningDone = true;
            continue;
        }
        out.push(block);
    }
    if (!textDone)
        out.unshift({ kind: 'text', text: edit.text });
    if (!reasoningDone && edit.reasoning !== '')
        out.unshift({ kind: 'reasoning', text: edit.reasoning });
    return out;
}
/** Apply one message edit to the node the shipped view will render. */
function editedNode(node, edit) {
    const final = node.data.finalNode;
    const blocks = rewriteBlocks(node.data.blocks, edit);
    if (final === undefined) {
        return { ...node, data: { ...node.data, blocks } };
    }
    return {
        ...node,
        data: {
            ...node.data,
            blocks,
            finalNode: {
                ...final,
                blocks: rewriteBlocks(final.blocks ?? node.data.blocks, edit),
            },
        },
    };
}
/**
 * Build the assistant-step wrapper for one captured shipped view.
 * @param official - the shipped `assistant-step` component.
 * @param rpc - browser RPC caller used to load projected edits.
 * @returns the wrapper component.
 */
export function createEditedAssistantStep(official, rpc) {
    const Official = official;
    return memo(function EditedAssistantStep(props) {
        const { node, sessionId } = props;
        const subscribe = useCallback((listener) => subscribeMessageEdits(sessionId, listener), [sessionId]);
        const read = useCallback(() => messageEditsOf(sessionId), [sessionId]);
        const edits = useSyncExternalStore(subscribe, read, read);
        useEffect(() => {
            if (rpc !== undefined)
                void ensureMessageEdits(sessionId, rpc);
        }, [sessionId]);
        const messageId = node.data.finalNode?.messageId;
        const edit = messageId === undefined ? undefined : edits.get(messageId);
        const routed = edit === undefined ? node : editedNode(node, edit);
        return _jsx(Official, { ...props, node: routed });
    });
}
