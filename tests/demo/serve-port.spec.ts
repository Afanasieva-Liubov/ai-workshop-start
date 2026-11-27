// The serve-port demo (docs/demo/serve-port.mjs) as tests: `serve` on a port it cannot use, in the real terminal,
// on the demo's stage; its key moments compared pixel for pixel with tests/demo/screenshots/. spec/web.md#server.
import { createServer } from 'node:net';
import { expect, test } from '@playwright/test';
import { WEB } from '../../docs/demo/stage.mjs';
import { run } from './terminal.ts';

test.afterEach(async ({ page }) => {
  await page.waitForTimeout(1000);
});

test.describe('serve on a port it cannot use, in a real terminal', () => {
  test('serve 80, not root: not allowed for this user, exit code 1', async ({ page }) => {
    // Only where port 80 really is closed to this user: root, or a lower ip_unprivileged_port_start, may open it.
    const probe = createServer();
    const code = await new Promise<string | undefined>((resolve) => {
      probe.once('error', (error: NodeJS.ErrnoException) => resolve(error.code));
      probe.listen(80, '127.0.0.1', () => probe.close(() => resolve(undefined)));
    });
    test.skip(code !== 'EACCES', `port 80 is not closed to this user (${code ?? 'it opens'})`);
    expect(await run(page, './skill-atlas serve 80; echo "exit code $?"'))
      .toBe(['Port 80 is not allowed for this user; try another: skill-atlas serve <port>', 'exit code 1'].join('\n'));
    await expect(page).toHaveScreenshot('cli-serve-80.png');
  });

  test(`serve ${WEB}, the stage's web view on it: in use, exit code 1`, async ({ page }) => {
    expect(await run(page, `./skill-atlas serve ${WEB}; echo "exit code $?"`))
      .toBe([`Port ${WEB} is in use; try another: skill-atlas serve <port>`, 'exit code 1'].join('\n'));
    await expect(page).toHaveScreenshot('cli-serve-in-use.png');
  });
});
