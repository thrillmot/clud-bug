import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isWorkflowFile, makeBranchName } from '../lib/edit-workflow.js';

test('isWorkflowFile: matches clud-bug-*.yml in .github/workflows', () => {
  assert.equal(isWorkflowFile('.github/workflows/clud-bug-review.yml'), true);
  assert.equal(isWorkflowFile('.github/workflows/clud-bug-audit.yml'), true);
  assert.equal(isWorkflowFile('.github/workflows/clud-bug-self-update.yml'), true);
  assert.equal(isWorkflowFile('.github/workflows/clud-bug-review.yaml'), true);
});

test('isWorkflowFile: does not match unrelated files', () => {
  assert.equal(isWorkflowFile('.github/workflows/ci.yml'), false);
  assert.equal(isWorkflowFile('.github/workflows/claude-code-review.yml'), false);
  assert.equal(isWorkflowFile('templates/workflow.yml.tmpl'), false);
  assert.equal(isWorkflowFile('package.json'), false);
  assert.equal(isWorkflowFile('clud-bug-review.yml'), false);
});

test('makeBranchName: ISO timestamp slug', () => {
  const branch = makeBranchName(new Date('2026-05-15T07:30:45Z'));
  assert.equal(branch, 'clud-bug/edit-workflow-2026-05-15T07-30-45');
});
