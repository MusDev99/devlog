import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROLES = ['product-owner', 'project-manager', 'software-engineer', 'qa', 'devops'];
const READ_ONLY_ON_CODE = ['product-owner', 'project-manager', 'qa', 'devops'];

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function frontMatter(text: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, 'front matter missing');
  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const at = line.indexOf(':');
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return fields;
}

const toolsOf = (role: string): string[] =>
  (frontMatter(read(`.claude/agents/${role}.md`)).tools ?? '').split(',').map((t) => t.trim());

test('agents: each role file has a matching name, a description and a tool list', () => {
  for (const role of ROLES) {
    const fields = frontMatter(read(`.claude/agents/${role}.md`));
    assert.equal(fields.name, role);
    assert.ok((fields.description ?? '').length > 40, `${role}: description too short`);
    assert.ok(toolsOf(role).length > 0, `${role}: no tools`);
  }
});

test('agents: only the Engineer can both edit code and run commands', () => {
  for (const role of READ_ONLY_ON_CODE) {
    const tools = toolsOf(role);
    const writes = tools.includes('Edit') || tools.includes('Write');
    assert.ok(!(writes && tools.includes('Bash')), `${role}: Bash + write access`);
  }
  for (const role of ['qa', 'devops']) {
    assert.ok(!toolsOf(role).includes('Edit') && !toolsOf(role).includes('Write'), `${role} must not edit`);
  }
});

test('team command: names every role and both owner gates', () => {
  const command = read('.claude/commands/team.md');
  for (const role of ['Product Owner', 'Project Manager', 'Software Engineer', 'QA', 'DevOps']) {
    assert.ok(command.includes(role), `missing ${role}`);
  }
  assert.match(command, /Gate 1/);
  assert.match(command, /Gate 2/);
  assert.match(command, /3 rounds/);
});

test('settings: secrets and main are off limits', () => {
  const deny: string[] = JSON.parse(read('.claude/settings.json')).permissions.deny;
  assert.ok(deny.includes('Read(./.env)'));
  assert.ok(deny.includes('Bash(git push origin main:*)'));
  assert.ok(deny.includes('Bash(gh pr merge:*)'));
  assert.ok(!deny.some((rule) => rule.includes('.env.example')));
});
