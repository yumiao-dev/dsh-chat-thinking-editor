/**
 * Per-message edit action: a pencil in the assistant-actions strip that opens
 * the edit LIST modal (every finalized assistant message in the session, this
 * one pre-expanded and scrolled into view). The button reuses the IconActions
 * row chrome (28px circle, hover fill) and is disabled while the agent is
 * running, matching the conflict rule.
 * @module dsh-chat-thinking-editor/client/EditAction
 */
import type { AssistantEditActionProps } from './slots.ts';
/**
 * One message's edit entry.
 * @param props - owner message identity, session kit, and injected face.
 */
export declare function EditAction({ messageId, useSession, useChat, rpc, sessionId, t, }: AssistantEditActionProps): import("react").JSX.Element;
