// The demo as tests: `npm run test:demo` plays the scenes of docs/demo/filter.mjs in the real terminal and
// the real web view, on the demo's stage (docs/demo/stage.mjs), checks what each one shows, and records a video
// of every test, every run, into test-results/. Needs ttyd and Google Chrome; see spec/analysis.md#demo-tests.
import { defineConfig } from '@playwright/test';
import { browserEnv, contextOptions, root, serve, size, ttyd, ttyUrl, webUrl } from './docs/demo/stage.mjs';

export default defineConfig({
  testDir: 'tests/demo',
  outputDir: 'test-results',
  // One test at a time, in order, never retried: the same run every time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    channel: 'chrome',
    launchOptions: { env: { ...process.env, ...browserEnv } },
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
      cwd: root,
      reuseExistingServer: false,
    },
    { command: [serve.command, ...serve.args].join(' '), url: webUrl, cwd: root, reuseExistingServer: false },
  ],
});
