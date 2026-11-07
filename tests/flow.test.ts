import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeText, emptyFlowDraft, FLOW_STEPS, flowResult, flowStepError, normalizeLink, type FlowDraft } from '../src/lib/flow.ts';
import { MAX_NOTE_LENGTH } from '../src/lib/notes.ts';

const draft = (over: Partial<FlowDraft> = {}): FlowDraft => ({ ...emptyFlowDraft(), ...over });

test('steps: title, link, size, place in that order; only the title is required', () => {
  assert.deepEqual(FLOW_STEPS.map((s) => s.id), ['title', 'link', 'size', 'place']);
  assert.deepEqual(FLOW_STEPS.map((s) => s.skippable), [false, true, true, true]);
  for (const s of FLOW_STEPS) assert.ok(s.question.length > 0 && s.hint.length > 0);
});

test('a new draft is empty, unsized and unsorted', () => {
  assert.deepEqual(emptyFlowDraft(), { title: '', link: '', size: null, place: 'unsorted' });
});

test('normalizeLink: blank is fine, http(s) and www. links are kept, everything else is refused', () => {
  assert.deepEqual(normalizeLink(''), { ok: true, href: '' });
  assert.deepEqual(normalizeLink('   '), { ok: true, href: '' });
  assert.deepEqual(normalizeLink(' https://airasia.atlassian.net/browse/SKYIQ-1 '), { ok: true, href: 'https://airasia.atlassian.net/browse/SKYIQ-1' });
  assert.deepEqual(normalizeLink('http://example.com/a'), { ok: true, href: 'http://example.com/a' });
  assert.deepEqual(normalizeLink('www.example.com/a'), { ok: true, href: 'https://www.example.com/a' });
  for (const bad of ['example.com', 'ftp://example.com', 'javascript:alert(1)', 'https://', 'https://localhost', 'https://exa mple.com', 'not a link', 'data:text/html,hi']) {
    assert.deepEqual(normalizeLink(bad), { ok: false, href: '' }, bad);
  }
});

test('composeText: tidies the title, appends the link, refuses empty or too-long text', () => {
  assert.deepEqual(composeText('  Fix   the seat   map ', ''), { text: 'Fix the seat map', error: '' });
  assert.deepEqual(composeText('Fix it', 'https://x.example.com/1'), { text: 'Fix it https://x.example.com/1', error: '' });
  assert.match(composeText('   ', '').error, /name/);
  const long = composeText('x'.repeat(MAX_NOTE_LENGTH - 5), 'https://example.com/12345');
  assert.equal(long.text, '');
  assert.match(long.error, /\d+ characters too long.*title or the link/);
  assert.match(composeText('x'.repeat(MAX_NOTE_LENGTH + 1), '').error, /1 characters too long\. Shorten the title\.$/);
  assert.equal(composeText('x'.repeat(MAX_NOTE_LENGTH), '').error, '', 'exactly the limit is fine');
});

test('flowStepError: the title is required, a bad link blocks the link step, size and place never block', () => {
  assert.match(flowStepError('title', draft()), /name/);
  assert.equal(flowStepError('title', draft({ title: 'Ok' })), '');
  assert.equal(flowStepError('link', draft({ title: 'Ok', link: '' })), '');
  assert.equal(flowStepError('link', draft({ title: 'Ok', link: 'https://example.com/a' })), '');
  assert.match(flowStepError('link', draft({ title: 'Ok', link: 'example' })), /does not look like a link/);
  assert.match(flowStepError('link', draft({ title: 'x'.repeat(MAX_NOTE_LENGTH - 2), link: 'https://example.com/a' })), /too long/);
  assert.equal(flowStepError('size', draft()), '');
  assert.equal(flowStepError('place', draft()), '');
});

test('flowResult: the finished answers for the app, with a default size of 1', () => {
  const r = flowResult(draft({ title: ' Fix it ', link: 'https://example.com/a', size: 5, place: 'do' }));
  assert.ok(r.ok);
  assert.deepEqual([r.draft, r.size, r.place], [{ text: 'Fix it https://example.com/a', tag: 'todo' }, 5, 'do']);
  const plain = flowResult(draft({ title: 'Plain' }));
  assert.ok(plain.ok);
  assert.deepEqual([plain.draft.text, plain.size, plain.place], ['Plain', 1, 'unsorted']);
});

test('flowResult: status prefixes still work, as in the quick add', () => {
  const r = flowResult(draft({ title: 'b: waiting on infra' }));
  assert.ok(r.ok);
  assert.deepEqual(r.draft, { text: 'waiting on infra', tag: 'blocker' });
  const wip = flowResult(draft({ title: 'wip: seat map', size: 3 }));
  assert.ok(wip.ok);
  assert.equal(wip.draft.tag, 'doing');
});

test('flowResult: what does not fit names the step that can fix it', () => {
  const empty = flowResult(draft({ title: '  ' }));
  assert.ok(!empty.ok);
  assert.deepEqual([empty.step, /name/.test(empty.error)], ['title', true]);
  const badLink = flowResult(draft({ title: 'Ok', link: 'nope' }));
  assert.ok(!badLink.ok);
  assert.equal(badLink.step, 'link');
  const tooLong = flowResult(draft({ title: 'x'.repeat(MAX_NOTE_LENGTH - 2), link: 'https://example.com/a' }));
  assert.ok(!tooLong.ok);
  assert.equal(tooLong.step, 'title', 'too long together: back to the title, which is always there to shorten');
  const prefixOnly = flowResult(draft({ title: 'b:' }));
  assert.ok(!prefixOnly.ok, 'a prefix with nothing after it is not a task');
  assert.equal(prefixOnly.step, 'title');
});
