/**
 * Per-message edit action: a toolbar button in the assistant-actions strip
 * that opens the edit LIST modal (every finalized assistant message in the
 * session, this one pre-expanded and scrolled into view). It reuses the
 * shipped toolbar Button and is disabled while the agent is running.
 * @module dsh-assistant-edit/client/EditAction
 */
import type { AssistantEditActionProps } from './slots.ts';
/**
 * One message's edit entry.
 * @param props - owner message identity, session kit, and injected face.
 */
export declare function EditAction({ messageId, useSession, rpc, sessionId, t, }: AssistantEditActionProps): import("react").JSX.Element;
