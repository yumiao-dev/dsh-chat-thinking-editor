/**
 * Local integration check for the DSH 0.2.1 adaptation.
 *
 * Replays a real session log through `Session.create` with the plugin's
 * message projection, then drives the `assistantEdit` service methods directly
 * (no Cordis runtime needed): list -> replace -> list -> replace again. Also
 * verifies the durable event is untouched and a fresh replay (the restart /
 * fork path) still derives the edited text.
 *
 * Run: node test/local-0.2.1.mjs <session.jsonl>
 */

import fs from 'node:fs'
import { Session } from '@deepseek-ai/dsh-session'
import { AssistantEditService, assistantEditProjection } from '../lib/index.js'

const file = process.argv[2]
if (file === undefined) {
  console.error('usage: node test/local-0.2.1.mjs <session.jsonl>')
  process.exit(2)
}

const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line))
const header = lines[0]
const seed = lines.slice(1)
const session = Session.create(header.id, seed, undefined, 0, [assistantEditProjection])

const service = Object.create(AssistantEditService.prototype)
service.ctx = {
  sessions: {
    get: id => (id === header.id ? session : undefined),
  },
}

const fail = message => {
  console.error('FAIL:', message)
  process.exitCode = 1
}

const before = await service.list({ sessionId: header.id })
if (!before.ok) {
  fail(`list failed: ${JSON.stringify(before)}`)
} else {
  console.log(`list: ${before.items.length} editable assistant message(s)`)
  for (const item of before.items) {
    console.log(`  ${item.messageId} T${item.turn}S${item.step} text=${JSON.stringify(item.text.slice(0, 40))} reasoning=${JSON.stringify(item.reasoning.slice(0, 40))}`)
  }
  if (before.items.length === 0) fail('no assistant message in this log; pick another session')
}

const target = before.ok === true ? before.items[before.items.length - 1] : undefined
if (target !== undefined) {
  const surfaceBefore = [...session.surface.nodes]
  const targetEventBefore = surfaceBefore.map(seq => session.eventAt(seq)).find(event => event?.type === 'assistant/message')
  const originalText = targetEventBefore?.data.message.content.filter(block => block.type === 'text').map(block => block.text).join('')

  const editedText = `LOCAL-ADAPT-TEXT-${Date.now()}`
  const editedReasoning = `LOCAL-ADAPT-REASONING-${Date.now()}`

  const replaced = await service.replace({
    sessionId: header.id,
    messageId: target.messageId,
    text: editedText,
    reasoning: editedReasoning,
  })
  console.log('replace:', JSON.stringify(replaced))
  if (replaced.ok !== true) fail('replace failed')

  const surfaceAfter = [...session.surface.nodes]
  if (surfaceAfter.length !== surfaceBefore.length) {
    fail(`surface node count changed: ${surfaceBefore.length} -> ${surfaceAfter.length}`)
  }
  if (surfaceAfter.join(',') !== surfaceBefore.join(',')) fail('surface node order changed')

  const after = await service.list({ sessionId: header.id })
  if (after.ok !== true) {
    fail(`list after replace failed: ${JSON.stringify(after)}`)
  } else {
    const edited = after.items.find(item => item.messageId === target.messageId)
    if (edited === undefined) fail('edited message missing from list')
    else {
      console.log(`after replace: text=${JSON.stringify(edited.text)} reasoning=${JSON.stringify(edited.reasoning)}`)
      if (edited.text !== editedText) fail('edited text not surfaced')
      if (edited.reasoning !== editedReasoning) fail('edited reasoning not surfaced')
    }
  }

  // The durable event must remain untouched (append-only log).
  const durableText = targetEventBefore?.data.message.content.filter(block => block.type === 'text').map(block => block.text).join('')
  if (durableText !== originalText) fail('durable assistant/message content was mutated')

  // The model-facing derivation must carry the edit.
  const derived = session.deriveMessages().filter(message => message.role === 'assistant')
  const derivedLast = derived[derived.length - 1]
  if (derivedLast === undefined || !JSON.stringify(derivedLast).includes(editedText)) {
    fail('deriveMessages() did not apply the projection')
  }

  // Edit the same message again: edits compose in log order.
  const againText = `LOCAL-ADAPT-AGAIN-${Date.now()}`
  const again = await service.replace({
    sessionId: header.id,
    messageId: target.messageId,
    text: againText,
    reasoning: '',
  })
  console.log('replace again:', JSON.stringify(again))
  if (again.ok !== true) fail('second replace failed')

  const final = await service.list({ sessionId: header.id })
  if (final.ok === true) {
    const edited = final.items.find(item => item.messageId === target.messageId)
    console.log(`after second replace: text=${JSON.stringify(edited?.text)} reasoning=${JSON.stringify(edited?.reasoning)}`)
    if (edited?.text !== againText) fail('second edit text not surfaced')
    if (edited?.reasoning !== '') fail('empty reasoning did not remove the block')
  }

  // Replay from the persisted log (restart/fork path) with the projection.
  const replayed = Session.create(header.id, session.snapshotEvents(), undefined, 0, [assistantEditProjection])
  const replayedMessages = replayed.deriveMessages().filter(message => message.role === 'assistant')
  const replayedLast = replayedMessages[replayedMessages.length - 1]
  if (replayedLast === undefined || !JSON.stringify(replayedLast).includes(againText)) {
    fail('replay from the log did not re-apply the projection')
  } else {
    console.log('replay: projection re-applied from the durable log')
  }

  // A missing id must fail loudly.
  const missing = await service.replace({
    sessionId: header.id,
    messageId: 'does-not-exist',
    text: 'x',
    reasoning: '',
  })
  console.log('missing id:', JSON.stringify(missing))
  if (missing.ok !== false || missing.error.code !== 'message-not-found') fail('missing id did not report message-not-found')

  // A dead session must fail loudly.
  const dead = await service.list({ sessionId: 'session-dead' })
  if (dead.ok !== false || dead.error.code !== 'session-not-found') fail('dead session did not report session-not-found')
}

console.log(process.exitCode === 1 ? 'FAILED' : 'OK')
