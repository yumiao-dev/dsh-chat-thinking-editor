/**
 * The injected face of one assistant-edit entry: the browser RPC handle
 * (to reach the Host `assistantEdit/*` Remotes). The target slot and the
 * Session standard kit (`messageId`, `useSession`, `sessionId`) are declared
 * by ui-chat and ui-session; this package only contributes the RPC share.
 * @module dsh-assistant-edit/client/slots
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
/** Injected business face of the assistant-edit entry. */
export interface AssistantEditInjected {
    /** The browser RPC caller used to reach the Host `assistantEdit/*` Remotes; absent when the connection handle is unavailable. */
    rpc: ClientConnectionRpc | undefined;
}
/** Full props of one assistant-edit entry. */
export type AssistantEditActionProps = PropsRuntime<'conversation.chat.assistant-actions'> & InjectFace<AssistantEditInjected> & PropsLocale<'assistant-edit'>;
