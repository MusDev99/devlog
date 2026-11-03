import assert from 'node:assert/strict';
import { test } from 'node:test';
import { profilePicture } from '../api/_lib/auth.ts';
import { googlePicture } from '../src/lib/db.ts';

/** The browser re-checks what the server already filtered: the same rule on both sides (the CSP allows only this host). */
test('profile picture rule: https on *.googleusercontent.com only, identical in server and browser', () => {
  const cases: [unknown, string][] = [
    ['https://lh3.googleusercontent.com/a/x=s96-c', 'https://lh3.googleusercontent.com/a/x=s96-c'],
    ['http://lh3.googleusercontent.com/a/x', ''],
    ['https://evil.example/pixel.gif', ''],
    ['https://googleusercontent.com.evil.example/x', ''],
    ['javascript:alert(1)', ''],
    ['', ''],
    [null, ''],
  ];
  for (const [input, expected] of cases) {
    assert.equal(googlePicture(input), expected, String(input));
    assert.equal(profilePicture(input), expected, String(input));
  }
});
