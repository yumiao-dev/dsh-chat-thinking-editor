import assert from 'node:assert/strict'
import { rewriteBlocks } from '../lib/client/EditedAssistantStep.js'
const blocks = [
  { kind: 'reasoning', text: 'old-think' },
  { kind: 'text', text: 'old-answer' },
  { kind: 'tool-call', callId: 'c1' },
  { kind: 'text', text: 'tail' },
]
const out = rewriteBlocks(blocks, { text: 'new-answer', reasoning: 'new-think' })
assert.deepEqual(out, [
  { kind: 'reasoning', text: 'new-think' },
  { kind: 'text', text: 'new-answer' },
  { kind: 'tool-call', callId: 'c1' },
])
const removed = rewriteBlocks(blocks, { text: 'x', reasoning: '' })
assert.equal(removed.some(b => b.kind === 'reasoning'), false, 'empty reasoning removes the block')
const added = rewriteBlocks([{ kind: 'text', text: 'a' }], { text: 'b', reasoning: 'r' })
assert.deepEqual(added[0], { kind: 'reasoning', text: 'r' })
console.log('OK edit blocks')
