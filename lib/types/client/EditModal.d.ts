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
import type { ClientConnectionRpc, MessageId, SessionId } from '@deepseek-ai/dsh-client-connection/client';
import type { AssistantEditActionProps } from './slots.ts';
/** Locale prop narrowed to the keys this modal consumes. */
type ModalT = AssistantEditActionProps['t'];
/** One modal's props: owner message (for initial focus) + session kit + injected face. */
export interface EditModalProps {
    /** Message whose pencil opened the modal; its row starts expanded. */
    messageId: MessageId;
    /** Chat selector hook; the transcript supplies every editable reply. */
    useChat: AssistantEditActionProps['useChat'];
    sessionId: SessionId;
    rpc: ClientConnectionRpc | undefined;
    t: ModalT;
    running: boolean;
    onClose: (edited: boolean) => void;
}
/**
 * The modal dialog listing and editing every assistant message.
 * @param props - identity, read hooks, transport, and close callback.
 */
export declare function EditModal({ messageId, useChat, sessionId, rpc, t, running, onClose, }: EditModalProps): import("react").ReactPortal;
export {};
