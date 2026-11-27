// Records docs/demo/serve-port.mp4: `serve` on a port it cannot use, a clear message and exit code 1, not a stack.
// The plumbing is recorder.mjs; see README.md here.
import { record } from './recorder.mjs';

await record('serve-port', async ({ caption, terminal, run }) => {
  await caption('Skill Atlas · a port serve cannot use', 'A clear message and exit code 1, never a Node.js stack');
  await terminal();
  // Below 1024 and not root: the port is not allowed for this user.
  await run('./skill-atlas serve 80; echo "exit code $?"', 3500);
  // The recorder's own web view listens on 4173: the port is in use.
  await run('./skill-atlas serve 4173; echo "exit code $?"', 3500);
});
