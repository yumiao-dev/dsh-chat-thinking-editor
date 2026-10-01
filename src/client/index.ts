/**
 * dsh-chat-thinking-editor — Client half.
 *
 * Contributes an edit pencil to the `conversation.chat.assistant-actions`
 * strip of every finalized assistant message. Clicking it opens a LIST modal
 * covering EVERY finalized assistant message in the session; each row expands
 * into two editors (reply text and reasoning chain) and saves independently
 * through the Host `assistantEdit/replace` Remote via the browser RPC channel.
 *
 * The Host records the edit as a plugin-owned **message projection**, so the
 * model-visible history carries the edited content while the stored transcript
 * keeps its original events. The conversation UI renders those raw events and
 * does not apply message projections, so the modal overlays the committed
 * edits it reads back from `assistantEdit/list`.
 *
 * The modal closes ONLY via its top-left close button (no backdrop tap, no
 * outside pointer-down, no swipe, no Escape), it is disabled while the agent
 * is running, and a failed save keeps the original content on screen.
 *
 * @module dsh-chat-thinking-editor/client
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ui-chat SlotMap merge (the assistant-actions entry) and
// the `useChat` standard prop.
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { EditAction } from './EditAction.tsx'
import type { AssistantEditInjected } from './slots.ts'
import { NS, en, zh } from './locales.ts'

export type {} from './slots.ts'
export type { AssistantEditInjected } from './slots.ts'

/** Dictionary namespace owned by this plugin. */
export { NS } from './locales.ts'

/** Required services: the slot registry, the connection RPC handle, and the locale seat. */
export const inject = ['slots', 'connection', 'locale']

/**
 * Client plugin body: the per-message edit entry.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'assistant-edit: dictionaries')

  // The connection handle is provided as a plain property, not a typed
  // Context merge; resolve it at apply time and close the RPC caller over it.
  const connection = ctx.get('connection') as ConnectionHandle | undefined

  ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
    name: 'conversation.chat.assistant-actions',
    id: 'assistant-edit',
    order: 9,
    locale: NS,
    inject: (sessionId): AssistantEditInjected => ({
      rpc: connection?.rpc,
      sessionId,
    }),
  }, EditAction))
}
