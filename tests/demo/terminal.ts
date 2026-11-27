// The real terminal of the demo's tests (ttyd, on the demo's stage): a command typed as the demo types it, and its output.
import { expect, type Page } from '@playwright/test';
import { ttyUrl } from '../../docs/demo/stage.mjs';

/** The terminal's text, one line per line of output: rows the terminal wrapped are joined again. */
export function screen(page: Page) {
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
export async function run(page: Page, command: string) {
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
