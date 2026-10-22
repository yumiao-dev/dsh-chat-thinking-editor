/**
 * dsh-assistant-edit — Client half (locally adapted for DSH 0.2.1-rc.2).
 *
 * Contributes an edit pencil to the `conversation.chat.assistant-actions`
 * strip of every finalized assistant message. Clicking it opens a LIST modal
 * covering every assistant reply currently on the session surface; each row
 * expands into two editors (reply text and reasoning chain) and saves
 * independently through the Host `assistantEdit/replace` Remote via the
 * browser RPC channel. The Host appends a `plugin:assistant-edit` message
 * projection so the model only ever sees the edited version, and the
 * reasoning-body override below makes the transcript show the edited chain
 * too (the Chat view folds raw events and cannot see Host projections).
 * The modal closes via its top-left × or the always-visible bottom
 * 「关闭」 button (no backdrop tap, no outside pointer-down, no swipe, no
 * Escape), it is disabled while the agent is running, and a failed save keeps
 * the original content on screen.
 *
 * @module dsh-assistant-edit/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ComponentType } from 'react'
// Type-only: merges the `conversation.chat.assistant-actions` SlotMap entry.
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
// Type-only: merges SessionStandardProps (`useSession`, `sessionId`, ...).
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: pulls the renderer's Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import { EditAction } from './EditAction.tsx'
import {
  ASSISTANT_STEP_ORIGINAL,
  createEditedAssistantStep,
} from './EditedAssistantStep.tsx'
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
  ;(globalThis as Record<string, unknown>)['__assistantEditVersion'] = '0.2.0'
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'assistant-edit: dictionaries')

  // The connection handle is provided as a plain service property, not a typed
  // Context merge; resolve it at apply time and close the RPC caller over it.
  const connection = ctx.get('connection') as ConnectionHandle | undefined

  ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
    name: 'conversation.chat.assistant-actions',
    id: 'assistant-edit',
    order: 9,
    locale: NS,
    inject: (): AssistantEditInjected => ({
      rpc: connection?.rpc,
    }),
  }, EditAction))

  // The transcript folds raw events, so substitute the shipped assistant-step
  // node's blocks with the Host projection. DSH allows only one declarer per
  // child slot, so a competing node registration would throw; replace the
  // shipped entry's component in place instead. The entry may register AFTER
  // this plugin (ui-chat defers it behind the chat slot declaration), so keep
  // a subscription and wrap whichever assistant-step entry is current.
  type ShippedComponent = ComponentType<Record<string, unknown>> & {
    [ASSISTANT_STEP_ORIGINAL]?: ComponentType<Record<string, unknown>>
  }
  let active: { entry: StoredEntry; wrapped: ShippedComponent; original: ShippedComponent } | undefined

  const wrap = (component: ShippedComponent): ShippedComponent => {
    const original = component[ASSISTANT_STEP_ORIGINAL] ?? component
    const wrapped = createEditedAssistantStep(original, connection?.rpc) as unknown as ShippedComponent
    Object.defineProperty(wrapped, ASSISTANT_STEP_ORIGINAL, { value: original })
    return wrapped
  }

  const ensureWrapped = (): void => {
    const entry = ctx.slots.entries('conversation.chat.node')
      .find(candidate => candidate.options.key === 'assistant-step')
    if (entry === undefined) return
    if (active?.entry === entry && entry.component === active.wrapped) return
    const current = entry.component as ShippedComponent | undefined
    if (current === undefined) return
    if (current[ASSISTANT_STEP_ORIGINAL] !== undefined) {
      active = { entry, wrapped: current, original: current[ASSISTANT_STEP_ORIGINAL] }
      return
    }
    const wrapped = wrap(current)
    entry.component = wrapped
    active = { entry, wrapped, original: current }
    // The entry mutation bypasses the registry's own notification; announce
    // it so the renderer re-reads the cell and mounts the wrapper now.
    ;(ctx as unknown as { emit?: (event: string, key: string) => void })
      .emit?.('slots/changed', 'conversation.chat.node')
  }

  ctx.effect(() => {
    ensureWrapped()
    const unsubscribe = ctx.slots.subscribe('conversation.chat.node', ensureWrapped)
    // Belt and suspenders: if the entry registers before the subscription is
    // delivered (or a notification is missed), retry once after mount.
    const retry = setTimeout(() => {
      ensureWrapped()
      if (active === undefined) console.warn('[assistant-edit] assistant-step entry not found')
    }, 1000)
    return () => {
      clearTimeout(retry)
      unsubscribe()
      if (active !== undefined && active.entry.component === active.wrapped) {
        active.entry.component = active.original
      }
    }
  }, 'assistant-edit: assistant-step wrapper')
}
