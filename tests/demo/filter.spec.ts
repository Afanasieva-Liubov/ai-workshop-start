// The filter demo (docs/demo/filter.mjs) as tests: each of its scenes, in the real terminal and the real web view,
// on the demo's stage, checked for what it shows, and its key moment compared pixel for pixel with its screenshot in
// tests/demo/screenshots/, made on Linux, like CI. Every test is recorded: test-results/<test>/video.webm.
// `npm run test:demo`; spec/analysis.md#demo-tests.
import { expect, test, type Page } from '@playwright/test';
import { fixture, stage, ttyUrl, webUrl } from '../../docs/demo/stage.mjs';

// What a scene leaves on screen stays in its video for a moment, as in the demo.
test.afterEach(async ({ page }) => {
  await page.waitForTimeout(1000);
});

/** The terminal's text, one line per line of output: rows the terminal wrapped are joined again. */
function screen(page: Page) {
  return page.evaluate(() => {
    const buffer = (globalThis as any).term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      const row = buffer.getLine(i);
      const text = row.translateToString(true);
      if (row.isWrapped && lines.length) lines[lines.length - 1] += text;
      else lines.push(text);
    }
    return lines.join('\n').trimEnd();
  });
}

/** Types `command` into a new shell, as the demo does, and returns its output once the prompt is back. */
async function run(page: Page, command: string) {
  await page.goto(ttyUrl);
  await page.waitForSelector('.xterm-helper-textarea');
  await page.click('.xterm');
  await expect.poll(() => screen(page)).toBe('$');
  await page.keyboard.type(command, { delay: 55 });
  await page.keyboard.press('Enter');
  const prompt = `$ ${command}\n`;
  await expect.poll(() => screen(page), { timeout: 10_000 }).toMatch(/\n\$$/);
  const text = await screen(page);
  expect(text.startsWith(prompt)).toBe(true);
  return text.slice(prompt.length, -'\n$'.length);
}

/** Whether each character of the first line starting with `start` is bold, as the terminal draws it: `1` bold, `0` not. */
function boldness(page: Page, start: string) {
  return page.evaluate((start) => {
    const buffer = (globalThis as any).term.buffer.active;
    for (let i = 0; i < buffer.length; i++) {
      const row = buffer.getLine(i);
      if (!row.translateToString(true).startsWith(start)) continue;
      let bits = '';
      for (let x = 0; x < row.translateToString(true).length; x++) bits += row.getCell(x).isBold() ? '1' : '0';
      return bits;
    }
    return undefined;
  }, start);
}

// The stage's fixed paths, the same on every machine, so that the screenshots are too.
const link = (path: string) => `  file://${stage}/fixture/${path}/SKILL.md`;
const skills = {
  'code-style': ["Follow the project's code style.", link('.github/skills/code-style')],
  commits: ['Write commit messages the way this repository does.', link('.claude/skills/commits')],
  'mps-aspect-generator': ['Generate an MPS language aspect.',
    link('plugins/mcp-tools/resources/skills/mps-aspect-generator'), '  part of the product: plugins/mcp-tools/resources'],
  'mps-tests': ['Run the MPS tests for the module you changed.', link('.agents/skills/mps-tests'),
    '  also in .claude/skills/mps-tests/SKILL.md'],
  'release-checklist': ['', link('.agents/skills/release-checklist')],
  'writing-lint-checks': ['Write a lint check the way this repository does.', link('agent/skills/writing-lint-checks')],
};
/** The skills as the CLI prints them (spec/cli.md#output): a blank line before each, the names padded to the longest shown. */
const listed = (...names: (keyof typeof skills)[]) => {
  const width = Math.max(...names.map((name) => name.length));
  return names.flatMap((name) => {
    const [sentence, ...rest] = skills[name];
    return ['', sentence ? `${name.padEnd(width)}  ${sentence}` : name, ...rest];
  });
};

test.describe('the CLI, in a real terminal', () => {
  test('scan ./fixture: every skill, fixture · 6 skills', async ({ page }) => {
    expect(await run(page, './skill-atlas scan ./fixture 2>/dev/null')).toBe(['fixture · 6 skills',
      ...listed('code-style', 'commits', 'mps-aspect-generator', 'mps-tests', 'release-checklist', 'writing-lint-checks'),
    ].join('\n'));
    await expect(page).toHaveScreenshot('cli-scan.png');
  });

  test('scan ./fixture mps: fixture · 2 of 6 skills', async ({ page }) => {
    expect(await run(page, './skill-atlas scan ./fixture mps 2>/dev/null'))
      .toBe(['fixture · 2 of 6 skills', ...listed('mps-aspect-generator', 'mps-tests')].join('\n'));
    // On a terminal the names are bold, and only the names: the padding and the sentence are not.
    expect(await boldness(page, 'mps-tests ')).toBe('1'.repeat(9) + '0'.repeat('             Run the MPS tests for the module you changed.'.length));
    expect(await boldness(page, 'fixture · ')).not.toContain('1');
    await expect(page).toHaveScreenshot('cli-scan-mps.png');
  });

  test('scan ./fixture MPS tests: every word, case-insensitive, 1 of 6 skills', async ({ page }) => {
    expect(await run(page, './skill-atlas scan ./fixture MPS tests 2>/dev/null'))
      .toBe(['fixture · 1 of 6 skills', ...listed('mps-tests')].join('\n'));
    await expect(page).toHaveScreenshot('cli-scan-mps-tests.png');
  });

  test('scan ./fixture nothing: no skills match "nothing", exit code 0', async ({ page }) => {
    expect(await run(page, './skill-atlas scan ./fixture nothing 2>/dev/null; echo "exit code $?"'))
      .toBe(['fixture · 0 of 6 skills', 'no skills match "nothing"', 'exit code 0'].join('\n'));
    await expect(page).toHaveScreenshot('cli-scan-nothing.png');
  });
});

test.describe('the web view, ./skill-atlas serve', () => {
  const visible = (page: Page) => page.locator('#skills li:not([hidden]) .name');
  const names = (page: Page) => visible(page).evaluateAll((items) => items.map((item: any) => item.firstChild.textContent));

  /** Opens the web view and scans the fixture as a user would; counts the scans the page asks for. */
  async function scanFixture(page: Page) {
    const scans: string[] = [];
    page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/scan') scans.push(request.url()); });
    await page.goto(webUrl);
    await page.locator('#repository').pressSequentially(fixture, { delay: 25 });
    await page.click('#scan');
    await expect(page.locator('#status')).toHaveText('fixture · 6 skills');
    return scans;
  }

  test('the fixture scanned once: its skills, the warning under the field, the first skill selected', async ({ page }) => {
    const scans = await scanFixture(page);
    expect(await names(page)).toEqual(['code-style', 'commits', 'mps-aspect-generator', 'mps-tests', 'release-checklist', 'writing-lint-checks']);
    await expect(page.locator('#warnings li')).toHaveText([/^warning: \.agents\/skills\/release-checklist\/SKILL\.md: malformed front matter: /]);
    await expect(page.locator('#skill h2')).toHaveText('code-style');
    expect(scans).toHaveLength(1);
    await expect(page).toHaveScreenshot('web-scanned.png');
  });

  test('filtered as you type, with no new scan: mps → 2 of 6 skills; the selected code-style is no longer shown', async ({ page }) => {
    const scans = await scanFixture(page);
    await expect(page.locator('#skill h2')).toHaveText('code-style');
    await page.locator('#filter').pressSequentially('mps', { delay: 180 });
    await expect(page.locator('#status')).toHaveText('fixture · 2 of 6 skills');
    expect(await names(page)).toEqual(['mps-aspect-generator', 'mps-tests']);
    await expect(page.locator('#skill')).toBeHidden();
    expect(new URL(page.url()).searchParams.get('filter')).toBe('mps');
    expect(scans).toHaveLength(1);
    await expect(page).toHaveScreenshot('web-filter-mps.png');
  });

  test('repository → commits, writing-lint-checks: the arrow key skips the three skills between them', async ({ page }) => {
    await scanFixture(page);
    await page.locator('#filter').pressSequentially('repository', { delay: 120 });
    await expect(page.locator('#status')).toHaveText('fixture · 2 of 6 skills');
    expect(await names(page)).toEqual(['commits', 'writing-lint-checks']);
    await page.locator('#skills li', { hasText: 'commits' }).click();
    await expect(page.locator('#skill h2')).toHaveText('commits');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#skills li', { hasText: 'writing-lint-checks' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#skill h2')).toHaveText('writing-lint-checks');
    await expect(page).toHaveScreenshot('web-filter-repository.png');
  });

  test('nothing → no skills match "nothing"', async ({ page }) => {
    await scanFixture(page);
    await page.locator('#filter').pressSequentially('nothing', { delay: 150 });
    await expect(page.locator('#empty')).toHaveText('no skills match "nothing"');
    await expect(page.locator('#status')).toHaveText('fixture · 0 of 6 skills');
    await expect(page.locator('#skills')).toBeHidden();
    await expect(page.locator('#skill')).toBeHidden();
    await expect(page).toHaveScreenshot('web-filter-nothing.png');
  });

  test('?filter=test in the address fills the field on load and selects the first match', async ({ page }) => {
    await page.goto(`${webUrl}?${new URLSearchParams({ repository: fixture, filter: 'test' })}`);
    await expect(page.locator('#filter')).toHaveValue('test');
    await expect(page.locator('#status')).toHaveText('fixture · 1 of 6 skills');
    expect(await names(page)).toEqual(['mps-tests']);
    await expect(page.locator('#skill h2')).toHaveText('mps-tests');
    await expect(page).toHaveScreenshot('web-address-filter.png');
  });

  test('a changed pixel fails the check: the scanned fixture, one pixel changed, against its screenshot', async ({ page }, testInfo) => {
    // Making the screenshots again would store the changed pixel instead.
    test.skip(['all', 'changed'].includes(testInfo.config.updateSnapshots), 'the screenshots are being made again');
    await scanFixture(page);
    await expect(page.locator('#skill h2')).toHaveText('code-style');
    await page.evaluate(() => {
      const pixel = document.createElement('div');
      pixel.style.cssText = 'position: fixed; left: 640px; top: 700px; width: 1px; height: 1px; background: #f0f; z-index: 1';
      document.body.append(pixel);
    });
    const error = await expect(page).toHaveScreenshot('web-scanned.png', { timeout: 2_000 }).then(() => undefined, (e: Error) => e);
    expect(error?.message).toContain('1 pixels (ratio 0.01 of all image pixels) are different');
  });
});

test('the stage: the demo\'s viewport and its fonts, DejaVu, in the terminal and the web view', async ({ page }) => {
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
  const cdp = await page.context().newCDPSession(page);
  const fonts = async (selector: string) => {
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root: document } = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: document.nodeId, selector });
    return (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts.map((font) => font.postScriptName);
  };
  await page.goto(`${webUrl}?${new URLSearchParams({ repository: fixture })}`);
  await expect(page.locator('#skill pre')).toBeVisible();
  expect(await fonts('#status')).toEqual(['DejaVuSans']);
  expect(await fonts('#skills .name')).toEqual(['DejaVuSans-Bold']);
  expect(await fonts('#skill pre')).toEqual(['DejaVuSansMono']);
  // Only DejaVu: the fonts a machine may have installed are not seen, whatever it has.
  await page.setContent(`<p style="font-family: Ubuntu, 'Liberation Sans', Arial, 'Noto Sans', Cantarell, sans-serif">Skill Atlas · 6 skills</p>
    <code style="font-family: 'Ubuntu Mono', 'Liberation Mono', 'Noto Sans Mono', Courier, monospace">$ ./skill-atlas</code>`);
  expect(await fonts('p')).toEqual(['DejaVuSans']);
  expect(await fonts('code')).toEqual(['DejaVuSansMono']);
  await page.goto(ttyUrl);
  await page.waitForSelector('.xterm-helper-textarea');
  expect(await page.evaluate(() => {
    const { options } = (globalThis as any).term;
    return { fontFamily: options.fontFamily, fontSize: options.fontSize };
  })).toEqual({ fontFamily: 'DejaVu Sans Mono', fontSize: 17 });
});
