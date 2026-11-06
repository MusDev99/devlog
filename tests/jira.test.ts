import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isJiraBase, jiraFromCells, jiraToCells, normalizeJiraBase } from '../src/lib/jira.ts';
import { linksIn, plainText, setJiraBase, sourceOf, splitLinks, titleText } from '../src/lib/links.ts';

const BASE = 'https://airasia.atlassian.net';

test('normalizeJiraBase: a bare host or any page on the site becomes the https origin; blank clears', () => {
  assert.equal(normalizeJiraBase('airasia.atlassian.net'), BASE);
  assert.equal(normalizeJiraBase('  https://airasia.atlassian.net/jira/software/projects/SKYIQ/boards/1  '), BASE);
  assert.equal(normalizeJiraBase('https://jira.example.com:8443/x'), 'https://jira.example.com:8443');
  assert.equal(normalizeJiraBase(''), '');
  assert.equal(normalizeJiraBase('   '), '');
});

test('normalizeJiraBase refuses anything that is not a plain https site', () => {
  for (const bad of ['http://airasia.atlassian.net', 'javascript:alert(1)', 'ftp://x.example.com', 'https://user:pw@airasia.atlassian.net', 'localhost', 'not a url', `https://${'a'.repeat(200)}.com`]) {
    assert.equal(normalizeJiraBase(bad), null, bad);
  }
});

test('isJiraBase accepts only the canonical stored form; cells round trip and bad cells read as none', () => {
  assert.equal(isJiraBase(BASE), true);
  assert.equal(isJiraBase(''), true);
  assert.equal(isJiraBase('airasia.atlassian.net'), false, 'must be normalised before it is stored or sent');
  assert.equal(isJiraBase(`${BASE}/browse`), false);
  assert.equal(isJiraBase(42), false);
  assert.deepEqual(jiraToCells(BASE), [BASE]);
  assert.equal(jiraFromCells([BASE]), BASE);
  assert.equal(jiraFromCells(['']), '');
  assert.equal(jiraFromCells(['http://evil.example.com']), '', 'a hand-edited unsafe cell is ignored');
  assert.equal(jiraFromCells([]), '');
});

test('a bare issue key links to the Jira site, in the middle of a sentence or at either end', () => {
  const parts = splitLinks('Fix SKYIQ-10143 before release', BASE);
  assert.deepEqual(parts, [
    { kind: 'text', value: 'Fix ' },
    { kind: 'link', href: `${BASE}/browse/SKYIQ-10143`, label: 'SKYIQ-10143' },
    { kind: 'text', value: ' before release' },
  ]);
  assert.equal(linksIn('SKYIQ-1', BASE)[0]?.href, `${BASE}/browse/SKYIQ-1`);
  assert.equal(linksIn('see (ABC-9).', BASE)[0]?.label, 'ABC-9');
  assert.equal(linksIn('SKYIQ-1,SKYIQ-2 and SKYIQ-3', BASE).length, 3);
});

test('no Jira site set: keys stay plain text (nothing changes for people who do not use Jira)', () => {
  assert.deepEqual(splitLinks('Fix SKYIQ-10143', null), [{ kind: 'text', value: 'Fix SKYIQ-10143' }]);
  assert.equal(linksIn('Fix SKYIQ-10143', null).length, 0);
});

test('things that look like keys but are not are left alone', () => {
  for (const text of ['UTF-8 handling', 'use SHA-256', 'ISO-8601 dates', 'COVID-19 plan', 'HTTP-2 push', 'v2-3 notes', 'a-12 lower', 'skyiq-12 lower', 'X-1', 'abcSKYIQ-12', 'SKYIQ-1234567', 'SKYIQ-12abc', 'SKYIQ--12', 'file_SKYIQ-12', '/browse/SKYIQ-12', 'a.SKYIQ-12']) {
    assert.equal(linksIn(text, BASE).length, 0, text);
  }
});

test('a full Jira URL and a bare key for the same ticket are one link; other links are untouched', () => {
  const text = `${BASE}/browse/SKYIQ-5 and SKYIQ-5 and https://github.com/a/b/pull/1`;
  assert.deepEqual(linksIn(text, BASE).map((l) => l.label), ['SKYIQ-5', 'a/b#1']);
});

test('titles, plain text and the work source use the key link like any other link', () => {
  assert.equal(titleText('SKYIQ-10143 fix seat map', BASE), 'fix seat map');
  assert.equal(titleText('SKYIQ-10143', BASE), 'SKYIQ-10143', 'a task that is only a key keeps it as its title');
  assert.equal(plainText('Fix SKYIQ-10143 today', BASE), 'Fix SKYIQ-10143 today');
  assert.deepEqual(sourceOf('Fix SKYIQ-10143', BASE), { kind: 'jira', key: 'jira:SKYIQ-10143', label: 'SKYIQ-10143', href: `${BASE}/browse/SKYIQ-10143` });
});

test('setJiraBase is what the app uses: later calls without a base read it', () => {
  setJiraBase(BASE);
  assert.equal(linksIn('SKYIQ-7')[0]?.href, `${BASE}/browse/SKYIQ-7`);
  setJiraBase(null);
  assert.equal(linksIn('SKYIQ-7').length, 0);
});
