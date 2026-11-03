import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linksIn, plainText, splitLinks, titleText } from '../src/lib/links.ts';

const OWNER = 'Fix bugs on 10143 https://airasia.atlassian.net/browse/SKYIQ-10143';

test("owner's example: words stay the title, the Jira link becomes SKYIQ-10143", () => {
  assert.equal(titleText(OWNER), 'Fix bugs on 10143');
  assert.deepEqual(linksIn(OWNER), [{ href: 'https://airasia.atlassian.net/browse/SKYIQ-10143', label: 'SKYIQ-10143' }]);
  assert.equal(plainText(OWNER), 'Fix bugs on 10143 SKYIQ-10143');
});

test('labels: Jira board links, GitHub PRs and issues, other sites shortened', () => {
  assert.equal(linksIn('https://airasia.atlassian.net/jira/software/projects/SKYIQ/boards/1?selectedIssue=SKYIQ-99')[0]?.label, 'SKYIQ-99');
  assert.equal(linksIn('see https://github.com/MusDev99/devlog/pull/27')[0]?.label, 'MusDev99/devlog#27');
  assert.equal(linksIn('https://github.com/MusDev99/devlog/issues/3')[0]?.label, 'MusDev99/devlog#3');
  assert.equal(linksIn('https://www.example.com/docs/')[0]?.label, 'example.com/docs');
  assert.equal(linksIn('https://example.com/a/very/long/path/that/keeps/going/on')[0]?.label, 'example.com/a/very/long/path/th…');
});

test('trailing punctuation is not part of the link; several links, duplicates once', () => {
  const t = 'Review (https://x.test/a), then https://x.test/b. Again https://x.test/a';
  assert.deepEqual(linksIn(t).map((l) => l.href), ['https://x.test/a', 'https://x.test/b']);
  assert.equal(titleText(t), 'Review, then. Again', 'brackets that only held a link go; no space before punctuation');
});

test('only http(s) links; other text untouched', () => {
  assert.deepEqual(splitLinks('javascript:alert(1) and ftp://x.test'), [{ kind: 'text', value: 'javascript:alert(1) and ftp://x.test' }]);
  assert.equal(titleText('Plain task'), 'Plain task');
  assert.deepEqual(linksIn('Plain task'), []);
});

test('a task that is only a link uses its label as the title', () => {
  assert.equal(titleText('https://airasia.atlassian.net/browse/SKYIQ-1'), 'SKYIQ-1');
});
