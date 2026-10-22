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

import { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
// Value imports: pull the `ctx.sessions` Context merge, `appendPluginRecord`,
// and the projection/record types.
import {
  appendPluginRecord,
  pluginRecordOf,
  type SessionMessageProjection,
} from '@deepseek-ai/dsh-session'
import { isSurfaceEvent } from '@deepseek-ai/dsh-session/surface'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { AssistantMessage } from '@deepseek-ai/dsh-session'
import type { SessionEvent, SessionSeq } from '@deepseek-ai/dsh-session/types'

/** The durable payload carried by one `plugin:assistant-edit` record. */
export interface AssistantEditRecord {
  /** Surface node (original assistant/message seq) this edit applies to. */
  targetSeq: number
  /** Message identity the record was written for (checked on replay). */
  messageId: MessageId
  /** Replacement reply text; empty string blanks the reply. */
  text: string
  /** Replacement reasoning; empty string removes the reasoning block. */
  reasoning: string
}

declare module '@deepseek-ai/dsh-session/types' {
  interface PluginRecordMap {
    /** One assistant-message content edit authored by this plugin. */
    'plugin:assistant-edit': AssistantEditRecord
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

/** One list request: the session whose editable replies are wanted. */
export interface AssistantEditListRequest {
  /** Session whose current surface is enumerated. */
  sessionId: string
}

/** One editable assistant reply as the modal renders it. */
export interface AssistantEditItem {
  /** Stable identity carried by the `assistant/message` event. */
  messageId: MessageId
  /** Owning turn (1-based). */
  turn: number
  /** Owning step within the turn. */
  step: number
  /** Whether this reply was frozen by an interruption. */
  interrupted: boolean
  /** Current (projected) surface reply text. */
  text: string
  /** Current (projected) surface reasoning chain. */
  reasoning: string
  /** Durable event reply text before this plugin's projection. */
  sourceText: string
  /** Durable event reasoning chain before this plugin's projection. */
  sourceReasoning: string
  /** Whether the projected content differs from the durable event. */
  edited: boolean
}

/** Success branch of one replace. */
export interface AssistantEditReplaceSuccess {
  ok: true
  /** Seq of the appended plugin record. */
  seq: number
}

/** Success branch of one list. */
export interface AssistantEditListSuccess {
  ok: true
  /** Every assistant reply currently on the model-visible surface, in order. */
  items: AssistantEditItem[]
}

/** Failure branch with a stable machine code and human message. */
export interface AssistantEditFailure {
  ok: false
  error: {
    /** `session-not-found` | `message-not-found` | `message-not-editable` | `invalid-content` */
    code: string
    message: string
  }
}

/** The replace Remote result type. */
export type AssistantEditReplaceResult = AssistantEditReplaceSuccess | AssistantEditFailure

/** The list Remote result type. */
export type AssistantEditListResult = AssistantEditListSuccess | AssistantEditFailure

/** Required services: the session store (live sessions only). */
const INJECT = ['sessions'] as const

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
export const assistantEditProjection: SessionMessageProjection = {
  type: 'plugin:assistant-edit' as never,
  project(event, context) {
    const record = pluginRecordOf(event)
    if (record === undefined) throw new Error('assistant-edit: event is not an ignorable plugin record')
    const data = record.data as AssistantEditRecord
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('assistant-edit: record data must be an object')
    }
    if (!Number.isSafeInteger(data.targetSeq) || data.targetSeq < 0) {
      throw new Error('assistant-edit: targetSeq must be a non-negative safe integer')
    }
    if (typeof data.messageId !== 'string' || data.messageId.length === 0) {
      throw new Error('assistant-edit: messageId must be a non-empty string')
    }
    if (typeof data.text !== 'string' || typeof data.reasoning !== 'string') {
      throw new Error('assistant-edit: text and reasoning must be strings')
    }

    const seq = data.targetSeq
    if (!context.nodes.includes(seq as never)) {
      throw new Error(`assistant-edit: target seq ${String(seq)} is not a current surface node`)
    }
    const source = context.events[seq - context.baseSeq]
    if (source === undefined || source.type !== 'assistant/message') {
      throw new Error(`assistant-edit: target seq ${String(seq)} is not an assistant/message`)
    }
    const current = context.messages.get(seq as never) ?? source.data.message
    if (current.role !== 'assistant' || current.id !== data.messageId) {
      throw new Error(`assistant-edit: target seq ${String(seq)} does not carry message ${data.messageId}`)
    }

    const content = buildEditedContent(current.content, data.text, data.reasoning)
    return new Map([[seq as never, deepFreeze({ ...current, content })]])
  },
}

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
export class AssistantEditService extends TypertRemoteService {
  static inject = INJECT

  constructor(ctx: Context) {
    super(ctx, 'assistantEdit')
    // Registering on the store reaches every live and future Session (the
    // store passes the same projection array by reference). The call is
    // effect-scoped to this plugin's fiber.
    this.ctx.sessions.registerMessageProjection(assistantEditProjection)
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
  @Remote('list')
  async list(request: AssistantEditListRequest): Promise<AssistantEditListResult> {
    const session = this.ctx.sessions.get(request.sessionId as never)
    if (session === undefined) {
      return fail('session-not-found', `session ${String(request.sessionId)} is not live in this process`)
    }

    const items: AssistantEditItem[] = []
    for (const seq of session.surface.nodes) {
      const event = session.eventAt(seq)
      if (event === undefined || event.type !== 'assistant/message') continue
      const message = session.deriveEventMessage(event)
      if (message === null || message.role !== 'assistant') continue
      const source = (event as AssistantMessageEvent).data.message
      const text = joinBlocks(message.content, 'text')
      const reasoning = joinBlocks(message.content, 'reasoning')
      const sourceText = joinBlocks(source.content, 'text')
      const sourceReasoning = joinBlocks(source.content, 'reasoning')
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
      })
    }
    items.sort((a, b) => a.turn - b.turn || a.step - b.step)
    return { ok: true, items }
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
  @Remote('replace')
  async replace(request: AssistantEditReplaceRequest): Promise<AssistantEditReplaceResult> {
    const { sessionId, messageId, text, reasoning } = request
    if (typeof text !== 'string' || typeof reasoning !== 'string') {
      return fail('invalid-content', 'text and reasoning must be strings')
    }

    const session = this.ctx.sessions.get(sessionId as never)
    if (session === undefined) {
      return fail('session-not-found', `session ${String(sessionId)} is not live in this process`)
    }

    // Locate the surface node carrying this message identity. Edits do not
    // move or add nodes, so this always finds the original message event even
    // after many edits.
    let targetSeq: SessionSeq | undefined
    let anyMatch = false
    for (const seq of session.surface.nodes) {
      const event = session.eventAt(seq)
      if (event === undefined || event.type !== 'assistant/message' || !isSurfaceEvent(event)) continue
      const message = session.deriveEventMessage(event)
      if (message === null || message.role !== 'assistant') continue
      if (message.id !== messageId) continue
      anyMatch = true
      targetSeq = seq
      break
    }
    if (targetSeq === undefined) {
      if (!anyMatch) {
        return fail('message-not-found', `no assistant message with id ${String(messageId)}`)
      }
      return fail(
        'message-not-editable',
        'this message is no longer on the model-visible surface (e.g. a compaction summary replaced it) and can no longer be edited',
      )
    }

    const appended = appendPluginRecord(session, 'plugin:assistant-edit', {
      targetSeq,
      messageId,
      text,
      reasoning,
    })
    return { ok: true, seq: appended }
  }
}

/** One append-origin assistant/message event narrowed by the lookup. */
type AssistantMessageEvent = SessionEvent<'assistant/message'> & { data: { message: AssistantMessage } }

/** Join the text of every block of one kind (the modal edits the joined value). */
function joinBlocks(blocks: readonly ContentBlock[], kind: 'text' | 'reasoning'): string {
  let out = ''
  for (const block of blocks) {
    if (block.type === kind) out += block.text
  }
  return out
}

/** Build the edited content: replace text + reasoning, keep everything else. */
function buildEditedContent(original: readonly ContentBlock[], text: string, reasoning: string): ContentBlock[] {
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
  // A message with no text block at all: add the edited reply.
  if (!textDone) content.unshift({ type: 'text', text })
  // A message with no reasoning block: a non-empty reasoning joins the front.
  if (!reasoningDone && reasoning.length > 0) content.unshift({ type: 'reasoning', text: reasoning })
  return content
}

/** Recursively freeze a JSON value (the projection contract requires immutable outputs). */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

/** Build one business failure branch. */
function fail(code: string, message: string): AssistantEditFailure {
  return { ok: false, error: { code, message } }
}

/**
 * The plugin entrypoint: this class is the Host plugin. The loader
 * constructs it with the resolved context, registers the message projection,
 * and its `typertRemote` binding makes the gateway route
 * `assistantEdit/list` and `assistantEdit/replace` here.
 */
export default AssistantEditService

