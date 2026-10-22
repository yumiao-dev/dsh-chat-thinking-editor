/**
 * Single-message edit dialog, built entirely on shipped DSH primitives:
 * `Modal` for chrome/close/escape, `Button` for actions, `Tag` for state, and
 * `TextShimmer` for loading. No list, no nested scroll: the clicked message's
 * reply and reasoning are the only two fields.
 *
 * @module dsh-assistant-edit/client/EditModal
 */
import type { ClientConnectionRpc, MessageId, SessionId } from '@deepseek-ai/dsh-client-connection/client';
import type { AssistantEditActionProps } from './slots.ts';
/** Locale prop narrowed to the keys this dialog consumes. */
type ModalT = AssistantEditActionProps['t'];
/** One dialog's props: the clicked message, session kit, and close callback. */
export interface EditModalProps {
    /** Message whose pencil opened the dialog. */
    messageId: MessageId;
    sessionId: SessionId;
    rpc: ClientConnectionRpc | undefined;
    t: ModalT;
    running: boolean;
    onClose: (edited: boolean) => void;
}
/**
 * The dialog editing exactly the message whose pencil was clicked.
 * @param props - message identity, transport, running state, and close callback.
 */
export declare function EditModal({ messageId, sessionId, rpc, t, running, onClose, }: EditModalProps): import("react").JSX.Element;
export {};
