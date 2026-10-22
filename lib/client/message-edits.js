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
const EMPTY = new Map();
const stores = new Map();
/** Get or create the per-Session store. */
function storeOf(sessionId) {
    let store = stores.get(sessionId);
    if (store === undefined) {
        store = { map: EMPTY, listeners: new Set(), loaded: false };
        stores.set(sessionId, store);
    }
    return store;
}
/** Notify every mounted assistant-step renderer for one Session. */
function emit(store) {
    for (const listener of [...store.listeners])
        listener();
}
/**
 * Subscribe to one Session's edit map.
 * @param sessionId - Session whose edits changed.
 * @param listener - re-read callback.
 * @returns disposer.
 */
export function subscribeMessageEdits(sessionId, listener) {
    const store = storeOf(sessionId);
    store.listeners.add(listener);
    return () => { store.listeners.delete(listener); };
}
/**
 * Read the Session's current edit map (stable between loads).
 * @param sessionId - Session owning the edits.
 * @returns messageId -> replacement.
 */
export function messageEditsOf(sessionId) {
    return storeOf(sessionId).map;
}
/**
 * Load (or reuse) the Session's edit map.
 * @param sessionId - Session to load.
 * @param rpc - browser RPC caller.
 */
export async function ensureMessageEdits(sessionId, rpc) {
    const store = storeOf(sessionId);
    if (store.loaded)
        return;
    if (store.loading !== undefined)
        return store.loading;
    store.loading = (async () => {
        try {
            const result = await rpc.call('/api', 'assistantEdit/list', {
                args: { request: { sessionId } },
            });
            const business = result.ok ? result.value : null;
            if (business?.ok !== true)
                return;
            const next = new Map();
            for (const item of business.items) {
                if (!item.edited)
                    continue;
                next.set(item.messageId, { text: item.text, reasoning: item.reasoning });
            }
            store.map = next;
            store.loaded = true;
            emit(store);
        }
        catch {
            // Keep the original transcript; a later mount retries.
        }
        finally {
            store.loading = undefined;
        }
    })();
    return store.loading;
}
/**
 * Drop the cached map and load it again (after a save).
 * @param sessionId - Session whose edits changed.
 * @param rpc - browser RPC caller.
 */
export async function refreshMessageEdits(sessionId, rpc) {
    const store = storeOf(sessionId);
    store.loaded = false;
    store.loading = undefined;
    await ensureMessageEdits(sessionId, rpc);
}
