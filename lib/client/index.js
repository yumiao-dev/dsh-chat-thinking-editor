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
import { EditAction } from "./EditAction.js";
import { ASSISTANT_STEP_ORIGINAL, createEditedAssistantStep, } from "./EditedAssistantStep.js";
import { NS, en, zh } from "./locales.js";
/** Dictionary namespace owned by this plugin. */
export { NS } from "./locales.js";
/** Required services: the slot registry, the connection RPC handle, and the locale seat. */
export const inject = ['slots', 'connection', 'locale'];
/**
 * Client plugin body: the per-message edit entry.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ;
    globalThis['__assistantEditVersion'] = '0.2.0';
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'assistant-edit: dictionaries');
    // The connection handle is provided as a plain service property, not a typed
    // Context merge; resolve it at apply time and close the RPC caller over it.
    const connection = ctx.get('connection');
    ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
        name: 'conversation.chat.assistant-actions',
        id: 'assistant-edit',
        order: 9,
        locale: NS,
        inject: () => ({
            rpc: connection?.rpc,
        }),
    }, EditAction));
    let active;
    const wrap = (component) => {
        const original = component[ASSISTANT_STEP_ORIGINAL] ?? component;
        const wrapped = createEditedAssistantStep(original, connection?.rpc);
        Object.defineProperty(wrapped, ASSISTANT_STEP_ORIGINAL, { value: original });
        return wrapped;
    };
    const ensureWrapped = () => {
        const entry = ctx.slots.entries('conversation.chat.node')
            .find(candidate => candidate.options.key === 'assistant-step');
        if (entry === undefined)
            return;
        if (active?.entry === entry && entry.component === active.wrapped)
            return;
        const current = entry.component;
        if (current === undefined)
            return;
        if (current[ASSISTANT_STEP_ORIGINAL] !== undefined) {
            active = { entry, wrapped: current, original: current[ASSISTANT_STEP_ORIGINAL] };
            return;
        }
        const wrapped = wrap(current);
        entry.component = wrapped;
        active = { entry, wrapped, original: current };
        ctx
            .emit?.('slots/changed', 'conversation.chat.node');
    };
    ctx.effect(() => {
        ensureWrapped();
        const unsubscribe = ctx.slots.subscribe('conversation.chat.node', ensureWrapped);
        // Belt and suspenders: if the entry registers before the subscription is
        // delivered (or a notification is missed), retry once after mount.
        const retry = setTimeout(() => {
            ensureWrapped();
            if (active === undefined)
                console.warn('[assistant-edit] assistant-step entry not found');
        }, 1000);
        return () => {
            clearTimeout(retry);
            unsubscribe();
            if (active !== undefined && active.entry.component === active.wrapped) {
                active.entry.component = active.original;
            }
        };
    }, 'assistant-edit: assistant-step wrapper');
}
