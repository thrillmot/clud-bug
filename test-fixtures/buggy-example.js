// Deliberately buggy example file used to verify clud-bug's PR review.
// If you're seeing this in production: it's a fixture, not real code.
//
// Planted issues (clud-bug should flag at least the security ones):
//   1. SQL injection via string concatenation
//   2. Hardcoded secret in source
//   3. Null dereference (caller never checks for null)
//   4. Missing await on a promise — race condition

import { spawnSync } from 'node:child_process';

const API_KEY = 'sk-prod-1234567890abcdef';

export function findUser(db, userId) {
  return db.query('SELECT * FROM users WHERE id = ' + userId);
}

export function lookupName(db, id) {
  const user = findUser(db, id);
  return user.profile.name.toUpperCase();
}

export function deletePath(userPath) {
  spawnSync('sh', ['-c', `rm -rf ${userPath}`]);
}

export async function saveAll(items) {
  for (const item of items) {
    db.save(item);
  }
  return items.length;
}

export function authHeader() {
  return { Authorization: `Bearer ${API_KEY}` };
}
