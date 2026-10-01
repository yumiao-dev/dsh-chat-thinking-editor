/**
 * The injected face of one assistant-edit entry: the browser RPC handle
 * (to reach the Host `assistantEdit/replace` and `assistantEdit/list` Remotes)
 * plus the session identity. The target slot is declared by ui-chat; this
 * package only contributes the entry.
 * @module dsh-chat-thinking-editor/client/slots
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ClientConnectionRpc, SessionId } from '@deepseek-ai/dsh-client-connection/client';
/** Injected business face of the assistant-edit entry. */
export interface AssistantEditInjected {
    /** The browser RPC caller used to reach the Host `assistantEdit` Remotes; absent when the connection handle is unavailable. */
    rpc: ClientConnectionRpc | undefined;
    /** Session owning the addressed assistant message. */
    sessionId: SessionId;
}
/** Full props of one assistant-edit entry. */
export type AssistantEditActionProps = PropsRuntime<'conversation.chat.assistant-actions'> & InjectFace<AssistantEditInjected> & PropsLocale<'assistant-edit'>;
