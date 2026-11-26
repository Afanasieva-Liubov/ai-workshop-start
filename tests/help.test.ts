// The help cases in spec/cli.md, checked on what the commands print.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { atlas, CLI } from './helpers.ts';

const full = (await atlas(['help'])).stdout;

test('help, or no command → every command, including help [command]', async () => {
  assert.match(full, /^Usage: skill-atlas <command>\n/);
  for (const command of ['scan <GitHub URL | directory>', 'serve [port]', 'help [command]']) assert.ok(full.includes(`  ${command} `), command);
  assert.deepEqual(await atlas([]), { code: 0, stdout: full, stderr: '' });
});

test('help <command> → the usage of that command alone, the line its wrong arguments print', async () => {
  for (const [command, usage] of [
    ['scan', 'Usage: skill-atlas scan <GitHub URL | directory>'],
    ['serve', 'Usage: skill-atlas serve [port]'],
    ['help', 'Usage: skill-atlas help [command]'],
  ]) {
    assert.deepEqual(await atlas(['help', command]), { code: 0, stdout: usage, stderr: '' });
  }
  assert.equal((await atlas(['scan'])).stderr, 'Usage: skill-atlas scan <GitHub URL | directory>');
  assert.equal((await atlas(['serve', 'nope'])).stderr, 'Usage: skill-atlas serve [port]');
});

test('help <command>, through the real CLI → stdout, exit code 0', () => {
  const help = spawnSync(process.execPath, [CLI, 'help', 'scan'], { encoding: 'utf8' });
  assert.equal(help.status, 0, help.stderr);
  assert.equal(help.stdout, 'Usage: skill-atlas scan <GitHub URL | directory>\n');
  assert.equal(help.stderr, '');
});

test('help with an unknown command, or more than one → the error and the full help on stderr, exit code 1', async () => {
  assert.deepEqual(await atlas(['help', 'nope']), { code: 1, stdout: '', stderr: `Unknown command: nope\n\n${full}` });
  assert.deepEqual(await atlas(['help', 'scan', 'serve']), { code: 1, stdout: '', stderr: `Usage: skill-atlas help [command]\n\n${full}` });
});
