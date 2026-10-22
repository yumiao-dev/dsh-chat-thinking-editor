/**
 * Client-side cache of edited assistant messages, keyed by message id.
 *
 * The Chat transcript folds raw `assistant/message` events in the browser and
 * cannot see the Host's `plugin:assistant-edit` message projection. This store
 * holds the Host-projected text/reasoning per message so the assistant-step
 * renderer can substitute them before handing the node to the shipped view.
 *
 * One store per Session; `assistantEdit/list` is fetched once per Session and
 * refreshed after every save.
 *
 * @module dsh-assistant-edit/client/message-edits
 */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
/** Projected replacement for one message. */
export interface MessageEdit {
    /** Replacement reply text. */
    text: string;
    /** Replacement reasoning chain (empty removes the block). */
    reasoning: string;
}
type Listener = () => void;
/**
 * Subscribe to one Session's edit map.
 * @param sessionId - Session whose edits changed.
 * @param listener - re-read callback.
 * @returns disposer.
 */
export declare function subscribeMessageEdits(sessionId: string, listener: Listener): () => void;
/**
 * Read the Session's current edit map (stable between loads).
 * @param sessionId - Session owning the edits.
 * @returns messageId -> replacement.
 */
export declare function messageEditsOf(sessionId: string): ReadonlyMap<string, MessageEdit>;
/**
 * Load (or reuse) the Session's edit map.
 * @param sessionId - Session to load.
 * @param rpc - browser RPC caller.
 */
export declare function ensureMessageEdits(sessionId: string, rpc: ClientConnectionRpc): Promise<void>;
/**
 * Drop the cached map and load it again (after a save).
 * @param sessionId - Session whose edits changed.
 * @param rpc - browser RPC caller.
 */
export declare function refreshMessageEdits(sessionId: string, rpc: ClientConnectionRpc): Promise<void>;
export {};
