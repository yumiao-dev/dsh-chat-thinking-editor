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
import { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { type SessionMessageProjection } from '@deepseek-ai/dsh-session';
import type { MessageId } from '@deepseek-ai/dsh-llm/brand';
/** The durable payload carried by one `plugin:assistant-edit` record. */
export interface AssistantEditRecord {
    /** Surface node (original assistant/message seq) this edit applies to. */
    targetSeq: number;
    /** Message identity the record was written for (checked on replay). */
    messageId: MessageId;
    /** Replacement reply text; empty string blanks the reply. */
    text: string;
    /** Replacement reasoning; empty string removes the reasoning block. */
    reasoning: string;
}
declare module '@deepseek-ai/dsh-session/types' {
    interface PluginRecordMap {
        /** One assistant-message content edit authored by this plugin. */
        'plugin:assistant-edit': AssistantEditRecord;
    }
}
/** One replace request: target message identity plus the edited fields. */
export interface AssistantEditReplaceRequest {
    /** Session owning the target assistant message. */
    sessionId: string;
    /** Stable identity carried by the target `assistant/message` event. */
    messageId: MessageId;
    /** Replacement reply text; empty string blanks the reply. */
    text: string;
    /** Replacement reasoning; empty string removes the reasoning block. */
    reasoning: string;
}
/** One list request: the session whose editable replies are wanted. */
export interface AssistantEditListRequest {
    /** Session whose current surface is enumerated. */
    sessionId: string;
}
/** One editable assistant reply as the modal renders it. */
export interface AssistantEditItem {
    /** Stable identity carried by the `assistant/message` event. */
    messageId: MessageId;
    /** Owning turn (1-based). */
    turn: number;
    /** Owning step within the turn. */
    step: number;
    /** Whether this reply was frozen by an interruption. */
    interrupted: boolean;
    /** Current (projected) surface reply text. */
    text: string;
    /** Current (projected) surface reasoning chain. */
    reasoning: string;
    /** Durable event reply text before this plugin's projection. */
    sourceText: string;
    /** Durable event reasoning chain before this plugin's projection. */
    sourceReasoning: string;
    /** Whether the projected content differs from the durable event. */
    edited: boolean;
}
/** Success branch of one replace. */
export interface AssistantEditReplaceSuccess {
    ok: true;
    /** Seq of the appended plugin record. */
    seq: number;
}
/** Success branch of one list. */
export interface AssistantEditListSuccess {
    ok: true;
    /** Every assistant reply currently on the model-visible surface, in order. */
    items: AssistantEditItem[];
}
/** Failure branch with a stable machine code and human message. */
export interface AssistantEditFailure {
    ok: false;
    error: {
        /** `session-not-found` | `message-not-found` | `message-not-editable` | `invalid-content` */
        code: string;
        message: string;
    };
}
/** The replace Remote result type. */
export type AssistantEditReplaceResult = AssistantEditReplaceSuccess | AssistantEditFailure;
/** The list Remote result type. */
export type AssistantEditListResult = AssistantEditListSuccess | AssistantEditFailure;
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
export declare const assistantEditProjection: SessionMessageProjection;
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
export declare class AssistantEditService extends TypertRemoteService {
    static inject: readonly ["sessions"];
    constructor(ctx: Context);
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
    list(request: AssistantEditListRequest): Promise<AssistantEditListResult>;
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
    replace(request: AssistantEditReplaceRequest): Promise<AssistantEditReplaceResult>;
}
/**
 * The plugin entrypoint: this class is the Host plugin. The loader
 * constructs it with the resolved context, registers the message projection,
 * and its `typertRemote` binding makes the gateway route
 * `assistantEdit/list` and `assistantEdit/replace` here.
 */
export default AssistantEditService;
