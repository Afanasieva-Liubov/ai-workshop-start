// End to end: the real ./skill-atlas on real repositories, each at a fixed commit, against GitHub
// itself. What it printed is stored in e2e/expected/<name>.txt; a run must print the same.
//
//   GITHUB_TOKEN=… npm run test:e2e                     compare with e2e/expected
//   GITHUB_TOKEN=… UPDATE_EXPECTED=1 npm run test:e2e   store what it prints now
//
// The large repositories are listed directory by directory, which needs GITHUB_TOKEN's rate limit.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ATLAS = fileURLToPath(new URL('../skill-atlas', import.meta.url));
const expected = (name: string) => fileURLToPath(new URL(`expected/${name}.txt`, import.meta.url));

const REPOSITORIES = [
  // .agents and .claude copies, and the same skills shipped in plugins/mcp-tools/resources; a truncated tree.
  { name: 'MPS', url: 'github.com/JetBrains/MPS/tree/1cbf7f783dbc5c74c8e5231d31f61b02829143de' },
  // agent/skills, the parent of 50fda4f, which removed them; a truncated tree.
  { name: 'android', url: 'github.com/JetBrains/android/tree/6c1bcc42a2cbb45c241fafea9fbd82d32ac4d765' },
  // Test data under integration-tests/src/jvmTest/resources/skills.
  { name: 'koog', url: 'github.com/JetBrains/koog/tree/709079e4a34d6c9234583352550e6a2b88a0bb85' },
];

const update = Boolean(process.env.UPDATE_EXPECTED);
const skip = process.env.GITHUB_TOKEN ? false : 'set GITHUB_TOKEN: the end-to-end tests read large repositories from GitHub';

for (const { name, url } of REPOSITORIES) {
  test(`./skill-atlas scan ${url}`, { skip, timeout: 120_000 }, () => {
    const scanned = spawnSync(ATLAS, ['scan', url], { encoding: 'utf8' });
    assert.equal(scanned.status, 0, scanned.stderr);
    if (update) writeFileSync(expected(name), scanned.stdout);
    assert.equal(scanned.stdout, readFileSync(expected(name), 'utf8'));
  });
}
