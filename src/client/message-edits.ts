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

import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'

/** Projected replacement for one message. */
export interface MessageEdit {
  /** Replacement reply text. */
  text: string
  /** Replacement reasoning chain (empty removes the block). */
  reasoning: string
}

/** One `assistantEdit/list` item subset this store consumes. */
interface ListItem {
  messageId: string
  text: string
  reasoning: string
  edited: boolean
}

/** Wire shape of `assistantEdit/list`. */
type ListResult =
  | { ok: true; items: readonly ListItem[] }
  | { ok: false; error: { code: string; message: string } }

const EMPTY: ReadonlyMap<string, MessageEdit> = new Map()

type Listener = () => void

interface SessionEdits {
  /** messageId -> projected replacement */
  map: ReadonlyMap<string, MessageEdit>
  readonly listeners: Set<Listener>
  loaded: boolean
  loading?: Promise<void>
}

const stores = new Map<string, SessionEdits>()

/** Get or create the per-Session store. */
function storeOf(sessionId: string): SessionEdits {
  let store = stores.get(sessionId)
  if (store === undefined) {
    store = { map: EMPTY, listeners: new Set(), loaded: false }
    stores.set(sessionId, store)
  }
  return store
}

/** Notify every mounted assistant-step renderer for one Session. */
function emit(store: SessionEdits): void {
  for (const listener of [...store.listeners]) listener()
}

/**
 * Subscribe to one Session's edit map.
 * @param sessionId - Session whose edits changed.
 * @param listener - re-read callback.
 * @returns disposer.
 */
export function subscribeMessageEdits(sessionId: string, listener: Listener): () => void {
  const store = storeOf(sessionId)
  store.listeners.add(listener)
  return () => { store.listeners.delete(listener) }
}

/**
 * Read the Session's current edit map (stable between loads).
 * @param sessionId - Session owning the edits.
 * @returns messageId -> replacement.
 */
export function messageEditsOf(sessionId: string): ReadonlyMap<string, MessageEdit> {
  return storeOf(sessionId).map
}

/**
 * Load (or reuse) the Session's edit map.
 * @param sessionId - Session to load.
 * @param rpc - browser RPC caller.
 */
export async function ensureMessageEdits(sessionId: string, rpc: ClientConnectionRpc): Promise<void> {
  const store = storeOf(sessionId)
  if (store.loaded) return
  if (store.loading !== undefined) return store.loading
  store.loading = (async () => {
    try {
      const result = await rpc.call('/api', 'assistantEdit/list', {
        args: { request: { sessionId } },
      })
      const business = result.ok ? (result.value as ListResult | null) : null
      if (business?.ok !== true) return
      const next = new Map<string, MessageEdit>()
      for (const item of business.items) {
        if (!item.edited) continue
        next.set(item.messageId, { text: item.text, reasoning: item.reasoning })
      }
      store.map = next
      store.loaded = true
      emit(store)
    } catch {
      // Keep the original transcript; a later mount retries.
    } finally {
      store.loading = undefined
    }
  })()
  return store.loading
}

/**
 * Drop the cached map and load it again (after a save).
 * @param sessionId - Session whose edits changed.
 * @param rpc - browser RPC caller.
 */
export async function refreshMessageEdits(sessionId: string, rpc: ClientConnectionRpc): Promise<void> {
  const store = storeOf(sessionId)
  store.loaded = false
  store.loading = undefined
  await ensureMessageEdits(sessionId, rpc)
}
