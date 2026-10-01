/**
 * dsh-chat-thinking-editor — Host half.
 *
 * Provides the `assistantEdit` Remote namespace with two direct methods:
 *
 * - `replace(request)` — rewrite the reply text and reasoning chain of one
 *   finalized assistant message, durably.
 * - `list(request)` — report every edit already committed for a session, so
 *   the conversation UI can overlay them on the raw transcript.
 *
 * ## Why this is a message projection, not a surface replacement
 *
 * Up to DSH 0.1.x this plugin appended an `assistant/message` event carrying
 * `surfaceOp: { op: 'replace' }` plus `sourceEventSeqs`, shadowing the original
 * reply out of the model-visible surface — the same trick compaction uses.
 *
 * DSH 0.2.0 closes that door: an `assistant/message` event "embeds its source
 * stream" and may never carry `sourceEventSeqs`, while a replacement must cite
 * every surface node it shadows. `assistant/message` therefore cannot replace
 * itself any more.
 *
 * The supported mechanism for changing the content of an *existing* message is
 * a plugin-owned **message projection**: one event type whose pure interpreter
 * returns updated copies of already-materialized messages, preserving their
 * identities. `Session` owns atomic acceptance, live/detached folding and
 * cache invalidation; the plugin owns only the interpretation. See
 * `.agents/notes/implemented/architecture/2026-09-11-plugin-owned-message-projections.md`.
 *
 * ## Vocabulary admission
 *
 * `SessionEventMap` is merge-extensible, so declaring the event type below is
 * enough for the compiler. The *storage* read path is stricter: it refuses a
 * stored event whose type is outside the repository-generated
 * `KNOWN_SESSION_EVENT_TYPES` unless the envelope carries `ignorable: true`
 * (see `validateStoredEvents`). A live plugin cannot set `ignorable` —
 * `Session.append` writes only `type`/`seq`/`time`/`data` plus surface
 * metadata. This plugin therefore admits its own type into the runtime
 * vocabulary before it will ever write one, and refuses to edit when that
 * admission fails, so a session can never be left unreadable.
 *
 * That admission only protects a session when the `Set` it mutates is the one
 * the persistence seam reads, so the plugin also verifies — via `instanceof`
 * against the exported `SessionStore` — that its own `@deepseek-ai/dsh-session`
 * really is the module the host built `ctx.sessions` from, and disables editing
 * when it is not.
 *
 * @module dsh-chat-thinking-editor
 */

import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
// Value import: pulls the `ctx.sessions` Context merge, SessionStore API and
// the runtime event vocabulary.
import { KNOWN_SESSION_EVENT_TYPES, SessionStore } from '@deepseek-ai/dsh-session'
import type { SessionMessageProjection } from '@deepseek-ai/dsh-session'
import type { SessionEvent, SessionSeq } from '@deepseek-ai/dsh-session/types'
import type { AssistantMessage, ContentBlock, Message } from '@deepseek-ai/dsh-llm'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'

/** The one event type this plugin owns; its interpreter is registered below. */
export const EDIT_EVENT_TYPE = 'chat-thinking-editor/edit'

/**
 * One durable edit decision: rewrite the reply text and reasoning chain of the
 * assistant message currently occupying surface node `seq`.
 *
 * `seq` names the *surface node*, not the message id: a projection never
 * changes the surface, so the node address is stable for the whole session and
 * repeated edits to the same message compose in event order.
 */
export interface ChatThinkingEditorEditData {
  /** Surface node seq of the target `assistant/message` event. */
  seq: SessionSeq
  /** Replacement reply text; an empty string blanks the reply. */
  text: string
  /** Replacement reasoning; an empty string removes the reasoning block. */
  reasoning: string
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Rewrite the reply text and reasoning chain of one assistant message in
     * the model-visible history. The target must be a current surface node of
     * type `assistant/message`. Every non-text, non-reasoning block (images,
     * tool calls, unknown blocks) is preserved verbatim, and the message keeps
     * its identity. Later decisions on the same target compose in event order.
     * @messageProjection
     */
    'chat-thinking-editor/edit': ChatThinkingEditorEditData
  }
}

/** One replace request: target message identity plus the edited fields. */
export interface AssistantEditReplaceRequest {
  /** Session owning the target assistant message. */
  sessionId: string
  /** Stable identity carried by the target `assistant/message` event. */
  messageId: MessageId
  /** Replacement reply text; empty string blanks the reply. */
  text: string
  /** Replacement reasoning; empty string removes the reasoning block. */
  reasoning: string
}

/** Success branch. */
export interface AssistantEditReplaceSuccess {
  ok: true
  /** Seq of the appended edit event. */
  seq: number
}

/** Failure branch with a stable machine code and human message. */
export interface AssistantEditReplaceFailure {
  ok: false
  error: {
    /**
     * `session-not-found` | `message-not-found` | `message-not-editable` |
     * `invalid-content` | `unsupported`
     */
    code: string
    message: string
  }
}

/** The single exported replace result type. */
export type AssistantEditReplaceResult = AssistantEditReplaceSuccess | AssistantEditReplaceFailure

/** One list request. */
export interface AssistantEditListRequest {
  /** Session whose committed edits are requested. */
  sessionId: string
}

/** One committed edit, in event order. */
export interface AssistantEditListEntry {
  /** Seq of the edit event itself. */
  seq: number
  /** Surface node seq the edit targets. */
  targetSeq: number
  /** Message identity of the target, when it is still resolvable. */
  messageId?: string
  /** Replacement reply text. */
  text: string
  /** Replacement reasoning. */
  reasoning: string
}

/** List success branch. */
export interface AssistantEditListSuccess {
  ok: true
  edits: AssistantEditListEntry[]
}

/** List failure branch. */
export interface AssistantEditListFailure {
  ok: false
  error: { code: string; message: string }
}

/** The single exported list result type. */
export type AssistantEditListResult = AssistantEditListSuccess | AssistantEditListFailure

/** Whether a durable value is a canonical non-negative event sequence. */
function isEventSeq(value: unknown): value is SessionSeq {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)
}

/**
 * Build the edited content: replace the first text block with the edited reply
 * (an empty reply blanks it) and the first reasoning block with the edited
 * chain (an empty reasoning removes that block), keeping every other block in
 * place. A message with no text block gains the edited reply at the front; a
 * message with no reasoning block gains a non-empty reasoning at the front.
 * @param original - the message content being edited.
 * @param text - replacement reply text.
 * @param reasoning - replacement reasoning text.
 * @returns fresh content blocks; the input is not mutated.
 */
export function buildEditedContent(
  original: readonly ContentBlock[],
  text: string,
  reasoning: string,
): ContentBlock[] {
  const content: ContentBlock[] = []
  let textDone = false
  let reasoningDone = false
  for (const block of original) {
    if (block.type === 'text' && !textDone) {
      content.push({ type: 'text', text })
      textDone = true
      continue
    }
    if (block.type === 'reasoning' && !reasoningDone) {
      if (reasoning.length > 0) content.push({ type: 'reasoning', text: reasoning })
      reasoningDone = true
      continue
    }
    content.push(block)
  }
  if (!textDone) content.unshift({ type: 'text', text })
  if (!reasoningDone && reasoning.length > 0) content.unshift({ type: 'reasoning', text: reasoning })
  return content
}

/**
 * Pure interpreter for one edit decision. Validates the complete durable
 * payload against the history preceding it, then returns the rewritten message
 * keyed by its original sequence.
 */
export const chatThinkingEditorProjection: SessionMessageProjection<'chat-thinking-editor/edit'> = {
  type: 'chat-thinking-editor/edit',
  project(event, context) {
    const data: unknown = event.data
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('chat-thinking-editor/edit: data must be an object')
    }
    const record = data as Record<string, unknown>
    if (Object.keys(record).length !== 3) {
      throw new Error('chat-thinking-editor/edit: data must contain exactly seq, text and reasoning')
    }
    const seq = record['seq']
    const text = record['text']
    const reasoning = record['reasoning']
    if (!isEventSeq(seq)) {
      throw new Error('chat-thinking-editor/edit: seq must be a non-negative safe integer')
    }
    if (typeof text !== 'string' || typeof reasoning !== 'string') {
      throw new Error('chat-thinking-editor/edit: text and reasoning must be strings')
    }
    if (!context.nodes.includes(seq)) {
      throw new Error(`chat-thinking-editor/edit: target seq ${seq} is not a current surface node`)
    }
    const source = context.events[seq - context.baseSeq]
    if (source === undefined || source.type !== 'assistant/message') {
      throw new Error(`chat-thinking-editor/edit: target seq ${seq} must be an assistant/message`)
    }
    // Compose with any earlier decision for the same node instead of dropping it.
    const current: Message = context.messages.get(seq)
      ?? (source.data as { message: AssistantMessage }).message
    const edited: Message = {
      ...current,
      content: buildEditedContent(current.content, text, reasoning),
    }
    return new Map([[seq, edited]])
  },
}

/**
 * Admit this plugin's event type into the runtime vocabulary so the storage
 * read path can interpret a log that contains it.
 *
 * `validateStoredEvents` refuses an unknown type unless the stored envelope
 * carries `ignorable: true`, and a live plugin cannot write that marker. The
 * vocabulary is a plain `Set` behind a `ReadonlySet` type, and both this plugin
 * and the persistence seam resolve the same `@deepseek-ai/dsh-session`
 * instance, so admitting the type here makes the event readable by this build.
 * @returns true when the type is readable afterwards.
 */
export function admitEditEventType(): boolean {
  if (KNOWN_SESSION_EVENT_TYPES.has(EDIT_EVENT_TYPE)) return true
  try {
    ;(KNOWN_SESSION_EVENT_TYPES as Set<string>).add(EDIT_EVENT_TYPE)
  } catch {
    return false
  }
  return KNOWN_SESSION_EVENT_TYPES.has(EDIT_EVENT_TYPE)
}

/**
 * Whether this plugin's `@deepseek-ai/dsh-session` is the very module instance
 * the running host built `ctx.sessions` from.
 *
 * The vocabulary admission above only protects a session if the `Set` it
 * mutates is the one the persistence seam reads. A plugin resolved against its
 * own copy of the package (a `link:`ed development install that still has
 * `node_modules`) would silently mutate a shadow copy, believe it succeeded,
 * and then write events that make the session unreadable on the next boot.
 *
 * `ctx.sessions` is constructed by the host from its own `dsh-session`, so
 * `instanceof` against this module's exported class is true only when both
 * halves really are the same instance.
 * @param ctx - the host context carrying the live session store.
 * @returns true when the vocabulary this plugin mutates is the host's own.
 */
export function sharesHostSessionModule(ctx: Context): boolean {
  return ctx.sessions instanceof SessionStore
}

/** One surface-visible assistant/message event narrowed by the lookup. */
type AssistantMessageEvent = SessionEvent<'assistant/message'> & {
  data: { message: AssistantMessage }
}

/** Required services: the session store (live sessions only). */
const INJECT = ['sessions'] as const

/**
 * Rewrite one finalized assistant message's editable content.
 *
 * SRC source-mode contract: each method keeps a single plain `request`
 * parameter (the gateway derives the wire field from the JS parameter name),
 * and results ride as loose JSON.
 *
 * The class IS the plugin entrypoint (Cordis class-plugin form): the loader
 * constructs it with `(ctx, config)`, resolves `static inject`, and mounts it
 * as the `assistantEdit` context service. A separate `apply()` would bypass
 * inject resolution, so none is provided — mirroring
 * `dsh-message-feedback`'s default-export class entry.
 */
export class AssistantEditService extends TypertRemoteService {
  static inject = INJECT

  /** Whether this plugin's event type is readable by the persistence seam. */
  private readonly admitted: boolean

  constructor(ctx: Context) {
    super(ctx, 'assistantEdit')
    if (!sharesHostSessionModule(ctx)) {
      this.admitted = false
      ctx.logger.warn(
        `${EDIT_EVENT_TYPE}: this plugin resolved its own copy of @deepseek-ai/dsh-session instead of the `
        + "host's, so admitting the event type would not reach the persistence seam; editing is disabled to "
        + 'keep stored sessions readable (install the published package rather than a link:ed working copy)',
      )
      return
    }
    this.admitted = admitEditEventType()
    if (!this.admitted) {
      ctx.logger.warn(
        `${EDIT_EVENT_TYPE}: this DSH build does not admit the event type into its session `
        + 'vocabulary, so editing is disabled to keep stored sessions readable',
      )
      return
    }
    try {
      ctx.sessions.registerMessageProjection(chatThinkingEditorProjection)
    } catch (error: unknown) {
      ctx.logger.warn(`${EDIT_EVENT_TYPE}: message projection registration failed: ${String(error)}`)
    }
  }

  /**
   * Rewrite the reply text and reasoning chain of one assistant message.
   *
   * The edit keeps every non-text/non-reasoning block (images, tool calls,
   * unknown blocks) untouched, replaces the first text block with the edited
   * reply (an empty reply blanks it), and replaces the first reasoning block
   * with the edited chain (an empty reasoning removes that block). If the
   * message already has no reasoning block, a non-empty reasoning is added at
   * the front of the content.
   *
   * @param request - target identity and edited fields.
   * @returns the appended edit seq, or a business failure.
   */
  @Remote('replace')
  async replace(request: AssistantEditReplaceRequest): Promise<AssistantEditReplaceResult> {
    const { sessionId, messageId, text, reasoning } = request
    if (typeof text !== 'string' || typeof reasoning !== 'string') {
      return fail('invalid-content', 'text and reasoning must be strings')
    }
    if (!this.admitted) {
      return fail(
        'unsupported',
        'this DSH build does not admit the chat-thinking-editor event type; editing is disabled to keep stored sessions readable',
      )
    }

    const session = this.ctx.sessions.get(sessionId as never)
    if (session === undefined) {
      return fail('session-not-found', `session ${String(sessionId)} is not live in this process`)
    }

    // A projection never changes the surface, so the target is simply the
    // newest surface-visible assistant/message event carrying this identity.
    const nodes = new Set<number>(session.surface.nodes)
    let target: AssistantMessageEvent | undefined
    let anyMatch = false
    for (const event of session.snapshotEvents()) {
      if (event.type !== 'assistant/message') continue
      const candidate = event as AssistantMessageEvent
      if (candidate.data.message.id !== messageId) continue
      anyMatch = true
      // The projection refuses a node that left the surface; refuse the edit
      // instead of appending a decision the fold would reject.
      if (!nodes.has(candidate.seq)) continue
      if (target === undefined || candidate.seq > target.seq) target = candidate
    }
    if (target === undefined) {
      if (!anyMatch) {
        return fail('message-not-found', `no assistant message with id ${String(messageId)}`)
      }
      return fail(
        'message-not-editable',
        'this message left the model-visible surface (e.g. a compaction summary replaced it) and can no longer be edited',
      )
    }

    const appended = session.append(EDIT_EVENT_TYPE, {
      seq: target.seq,
      text,
      reasoning,
    })
    return { ok: true, seq: appended.seq }
  }

  /**
   * Report every edit committed for one session, in event order.
   *
   * The conversation UI renders the raw event transcript, which does not apply
   * message projections, so it uses this list to overlay committed edits.
   * @param request - session whose edits are requested.
   * @returns the committed edits, or a business failure.
   */
  @Remote('list')
  async list(request: AssistantEditListRequest): Promise<AssistantEditListResult> {
    const session = this.ctx.sessions.get(request.sessionId as never)
    if (session === undefined) {
      return { ok: false, error: { code: 'session-not-found', message: `session ${String(request.sessionId)} is not live in this process` } }
    }
    const edits: AssistantEditListEntry[] = []
    const events = session.snapshotEvents()
    // Resolve a target seq by identity, never by array index: `snapshotEvents`
    // is not guaranteed to start at seq 0 for every session log.
    const bySeq = new Map<number, SessionEvent>()
    for (const event of events) bySeq.set(event.seq, event)
    for (const event of events) {
      if (event.type !== EDIT_EVENT_TYPE) continue
      const data = event.data as ChatThinkingEditorEditData
      const target = bySeq.get(data.seq)
      const messageId = target?.type === 'assistant/message'
        ? (target.data as { message: AssistantMessage }).message.id
        : undefined
      edits.push({
        seq: event.seq,
        targetSeq: data.seq,
        ...(messageId === undefined ? {} : { messageId: String(messageId) }),
        text: data.text,
        reasoning: data.reasoning,
      })
    }
    return { ok: true, edits }
  }
}

/** Build one business failure branch. */
function fail(code: string, message: string): AssistantEditReplaceFailure {
  return { ok: false, error: { code, message } }
}

/**
 * The plugin entrypoint: this class is the Host plugin. The loader constructs
 * it with the resolved context, and its `typertRemote` binding makes the
 * gateway route `assistantEdit/replace` and `assistantEdit/list` here.
 */
export default AssistantEditService
