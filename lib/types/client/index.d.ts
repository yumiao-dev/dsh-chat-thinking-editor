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
import type { Context } from '@deepseek-ai/cordis';
export type {} from './slots.ts';
export type { AssistantEditInjected } from './slots.ts';
/** Dictionary namespace owned by this plugin. */
export { NS } from './locales.ts';
/** Required services: the slot registry, the connection RPC handle, and the locale seat. */
export declare const inject: string[];
/**
 * Client plugin body: the per-message edit entry.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
