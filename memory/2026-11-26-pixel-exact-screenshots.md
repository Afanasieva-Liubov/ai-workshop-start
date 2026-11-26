# Pixel-exact screenshots in Chrome: the checkout path and partial raster break them
Task: #31, 2026-11-26

- The CLI and the web view print absolute `file://` paths, and the checkout is elsewhere in CI: the stage runs in a
  fixed real directory, `/tmp/skill-atlas-stage`, with links. A symlink to the checkout does not work: node's
  `process.cwd()` is the physical path, so `./fixture` resolves back to the checkout.
- Two web scenes differed by one shade on rounded corners in 1 run of 3: `--disable-partial-raster` fixed it (44/44).
- The screenshot comparator skips anti-aliased pixels: `N pixels are different` counts fewer than differ.
- `apt-get install ./chrome.deb` fails on a fresh machine until `sudo apt-get update`.
- "`npm run e2e`" in the issue meant the Playwright demo tests (the ones with a video): added as an alias of `test:demo`.
