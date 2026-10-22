/**
 * dsh-assistant-edit — Host half (locally adapted for DSH 0.2.1-rc.2).
 *
 * Provides the `assistantEdit` Remote namespace with two direct methods:
 *
 * - `list(request)` — enumerate every assistant reply that is CURRENTLY on
 *   the session surface (the same folding rule the model sees), including the
 *   projected reply text and reasoning chain. The client modal renders this
 *   list.
 * - `replace(request)` — rewrite the reply text and reasoning chain of one
 *   finalized assistant message by appending a **plugin-owned message
 *   projection** record (`plugin:assistant-edit`) to the append-only log.
 *   The durable event is never mutated; every later fold derives the edited
 *   message for the model and for the UI, and repeated edits compose in log
 *   order. This is the 0.2.x successor to the old assistant/message surface
 *   replacement: 0.2.x forbids `sourceEventSeqs` on `assistant/message`, so a
 *   message cannot be surface-replaced by another assistant message any more.
 *   `image/offload` uses the same projection seam.
 *
 * The gateway discovers this service through SRC source-mode reflection
 * (`typertRemote` binding + `@Remote` markers), so no typert generator
 * output is required for the endpoint to exist.
 *
 * @module dsh-assistant-edit
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
// Value imports: pull the `ctx.sessions` Context merge, `appendPluginRecord`,
// and the projection/record types.
import { appendPluginRecord, pluginRecordOf, } from '@deepseek-ai/dsh-session';
import { isSurfaceEvent } from '@deepseek-ai/dsh-session/surface';
/** Required services: the session store (live sessions only). */
const INJECT = ['sessions'];
/**
 * Durable message projection for `plugin:assistant-edit` records.
 *
 * The record names the ORIGINAL surface node seq, not a later replacement, so
 * every edit composes onto the same node: the fold calls this projection in
 * log order and `context.messages` already carries the previous edit.
 *
 * Browser-safe and dependency-free: this function also runs when a detached
 * session is replayed (fork, export, restore), so it must not depend on the
 * live store.
 */
export const assistantEditProjection = {
    type: 'plugin:assistant-edit',
    project(event, context) {
        const record = pluginRecordOf(event);
        if (record === undefined)
            throw new Error('assistant-edit: event is not an ignorable plugin record');
        const data = record.data;
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            throw new Error('assistant-edit: record data must be an object');
        }
        if (!Number.isSafeInteger(data.targetSeq) || data.targetSeq < 0) {
            throw new Error('assistant-edit: targetSeq must be a non-negative safe integer');
        }
        if (typeof data.messageId !== 'string' || data.messageId.length === 0) {
            throw new Error('assistant-edit: messageId must be a non-empty string');
        }
        if (typeof data.text !== 'string' || typeof data.reasoning !== 'string') {
            throw new Error('assistant-edit: text and reasoning must be strings');
        }
        const seq = data.targetSeq;
        if (!context.nodes.includes(seq)) {
            throw new Error(`assistant-edit: target seq ${String(seq)} is not a current surface node`);
        }
        const source = context.events[seq - context.baseSeq];
        if (source === undefined || source.type !== 'assistant/message') {
            throw new Error(`assistant-edit: target seq ${String(seq)} is not an assistant/message`);
        }
        const current = context.messages.get(seq) ?? source.data.message;
        if (current.role !== 'assistant' || current.id !== data.messageId) {
            throw new Error(`assistant-edit: target seq ${String(seq)} does not carry message ${data.messageId}`);
        }
        const content = buildEditedContent(current.content, data.text, data.reasoning);
        return new Map([[seq, deepFreeze({ ...current, content })]]);
    },
};
/**
 * Replace and enumerate the editable content of live assistant messages.
 *
 * SRC source-mode contract: every method keeps a single plain `request`
 * parameter (the gateway derives the wire field from the JS parameter name),
 * and the result rides as loose JSON.
 *
 * The class IS the plugin entrypoint (Cordis class-plugin form): the loader
 * constructs it with `(ctx, config)`, resolves `static inject`, and mounts
 * it as the `assistantEdit` context service. A separate `apply()` would
 * bypass inject resolution, so none is provided — mirroring
 * `dsh-image-offload`'s pattern.
 */
let AssistantEditService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _replace_decorators;
    return class AssistantEditService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote('list')];
            _replace_decorators = [Remote('replace')];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _replace_decorators, { kind: "method", name: "replace", static: false, private: false, access: { has: obj => "replace" in obj, get: obj => obj.replace }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = INJECT;
        constructor(ctx) {
            super(ctx, 'assistantEdit');
            __runInitializers(this, _instanceExtraInitializers);
            // Registering on the store reaches every live and future Session (the
            // store passes the same projection array by reference). The call is
            // effect-scoped to this plugin's fiber.
            this.ctx.sessions.registerMessageProjection(assistantEditProjection);
        }
        /**
         * Enumerate every assistant reply currently on the session surface.
         *
         * Only surface nodes are returned, and the message is derived through
         * `session.deriveEventMessage`, so earlier plugin edits are already applied.
         * The order is turn then step so the modal lists replies in conversation
         * order.
         *
         * @param request - session whose surface is enumerated.
         * @returns the editable replies, or a business failure.
         */
        async list(request) {
            const session = this.ctx.sessions.get(request.sessionId);
            if (session === undefined) {
                return fail('session-not-found', `session ${String(request.sessionId)} is not live in this process`);
            }
            const items = [];
            for (const seq of session.surface.nodes) {
                const event = session.eventAt(seq);
                if (event === undefined || event.type !== 'assistant/message')
                    continue;
                const message = session.deriveEventMessage(event);
                if (message === null || message.role !== 'assistant')
                    continue;
                const source = event.data.message;
                const text = joinBlocks(message.content, 'text');
                const reasoning = joinBlocks(message.content, 'reasoning');
                const sourceText = joinBlocks(source.content, 'text');
                const sourceReasoning = joinBlocks(source.content, 'reasoning');
                items.push({
                    messageId: message.id,
                    turn: event.data.turn,
                    step: event.data.step,
                    interrupted: event.data.interrupted === true,
                    text,
                    reasoning,
                    sourceText,
                    sourceReasoning,
                    edited: text !== sourceText || reasoning !== sourceReasoning,
                });
            }
            items.sort((a, b) => a.turn - b.turn || a.step - b.step);
            return { ok: true, items };
        }
        /**
         * Rewrite the reply text and reasoning chain of one assistant message.
         *
         * The replacement keeps every non-text/non-reasoning block (images,
         * tool calls, unknown blocks) untouched, replaces the first text block
         * with the edited reply (an empty reply blanks it), and replaces the
         * first reasoning block with the edited chain (an empty reasoning
         * removes that block). If the message already has no reasoning block,
         * a non-empty reasoning is added at the front of the content.
         *
         * The target is the surface node carrying the message id; the append is a
         * `plugin:assistant-edit` record and never changes the surface node list.
         *
         * @param request - target identity and edited fields.
         * @returns appended record seq, or a business failure.
         */
        async replace(request) {
            const { sessionId, messageId, text, reasoning } = request;
            if (typeof text !== 'string' || typeof reasoning !== 'string') {
                return fail('invalid-content', 'text and reasoning must be strings');
            }
            const session = this.ctx.sessions.get(sessionId);
            if (session === undefined) {
                return fail('session-not-found', `session ${String(sessionId)} is not live in this process`);
            }
            // Locate the surface node carrying this message identity. Edits do not
            // move or add nodes, so this always finds the original message event even
            // after many edits.
            let targetSeq;
            let anyMatch = false;
            for (const seq of session.surface.nodes) {
                const event = session.eventAt(seq);
                if (event === undefined || event.type !== 'assistant/message' || !isSurfaceEvent(event))
                    continue;
                const message = session.deriveEventMessage(event);
                if (message === null || message.role !== 'assistant')
                    continue;
                if (message.id !== messageId)
                    continue;
                anyMatch = true;
                targetSeq = seq;
                break;
            }
            if (targetSeq === undefined) {
                if (!anyMatch) {
                    return fail('message-not-found', `no assistant message with id ${String(messageId)}`);
                }
                return fail('message-not-editable', 'this message is no longer on the model-visible surface (e.g. a compaction summary replaced it) and can no longer be edited');
            }
            const appended = appendPluginRecord(session, 'plugin:assistant-edit', {
                targetSeq,
                messageId,
                text,
                reasoning,
            });
            return { ok: true, seq: appended };
        }
    };
})();
export { AssistantEditService };
/** Join the text of every block of one kind (the modal edits the joined value). */
function joinBlocks(blocks, kind) {
    let out = '';
    for (const block of blocks) {
        if (block.type === kind)
            out += block.text;
    }
    return out;
}
/** Build the edited content: replace text + reasoning, keep everything else. */
function buildEditedContent(original, text, reasoning) {
    const content = [];
    let textDone = false;
    let reasoningDone = false;
    for (const block of original) {
        if (block.type === 'text' && !textDone) {
            content.push({ type: 'text', text });
            textDone = true;
            continue;
        }
        if (block.type === 'reasoning' && !reasoningDone) {
            if (reasoning.length > 0)
                content.push({ type: 'reasoning', text: reasoning });
            reasoningDone = true;
            continue;
        }
        content.push(block);
    }
    // A message with no text block at all: add the edited reply.
    if (!textDone)
        content.unshift({ type: 'text', text });
    // A message with no reasoning block: a non-empty reasoning joins the front.
    if (!reasoningDone && reasoning.length > 0)
        content.unshift({ type: 'reasoning', text: reasoning });
    return content;
}
/** Recursively freeze a JSON value (the projection contract requires immutable outputs). */
function deepFreeze(value) {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value))
            deepFreeze(child);
    }
    return value;
}
/** Build one business failure branch. */
function fail(code, message) {
    return { ok: false, error: { code, message } };
}
/**
 * The plugin entrypoint: this class is the Host plugin. The loader
 * constructs it with the resolved context, registers the message projection,
 * and its `typertRemote` binding makes the gateway route
 * `assistantEdit/list` and `assistantEdit/replace` here.
 */
export default AssistantEditService;
