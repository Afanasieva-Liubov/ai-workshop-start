// The demo as tests: `npm run test:demo` plays the scenes of docs/demo/filter.mjs in the real terminal and
// the real web view, on the demo's stage (docs/demo/stage.mjs), checks what each one shows, and records a video
// of every test, every run, into test-results/. Its key moments are screenshots, compared pixel for pixel with the
// baselines in tests/demo/screenshots/, made on Linux, like CI. Needs ttyd and Google Chrome; see spec/analysis.md#demo-tests.
import { defineConfig } from '@playwright/test';
import { browserArgs, browserEnv, contextOptions, serve, size, stage, ttyd, ttyUrl, webUrl } from './docs/demo/stage.mjs';

export default defineConfig({
  testDir: 'tests/demo',
  outputDir: 'test-results',
  // One test at a time, in order, never retried: the same run every time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  timeout: 30_000,
  // The baselines: <name>-linux.png, made on Linux, like CI. In CI a missing one fails, it is never written;
  // here a missing one is written, and `--update-snapshots` makes them all again, on purpose.
  snapshotPathTemplate: '{testDir}/screenshots/{arg}-{platform}{ext}',
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  expect: {
    timeout: 5_000,
    // A changed pixel fails the check: no tolerance, neither in the number of pixels nor in their colour.
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    channel: 'chrome',
    launchOptions: { env: { ...process.env, ...browserEnv }, args: browserArgs },
    ...contextOptions,
    video: { mode: 'on', size },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: [ttyd.command, ...ttyd.args.map((arg) => `'${arg}'`)].join(' '),
      url: ttyUrl,
      env: ttyd.env,
      cwd: stage,
      reuseExistingServer: false,
    },
    { command: [serve.command, ...serve.args].join(' '), url: webUrl, cwd: stage, reuseExistingServer: false },
  ],
});
