import React from 'react';
import { render, Text } from 'ink';
import { VimTextArea } from './VimTextArea.js';

/**
 * Entry point for the scroll-into-view PoC.
 *
 * Run in FIXED mode (default):
 *   npm start
 *
 * Run in BUGGY mode (reproduces the off-screen cursor):
 *   npm run start:buggy
 *   -- or --
 *   FIXED=false npm start
 *
 * To reproduce the bug:
 *   1. Resize your terminal split to ~6-8 rows tall.
 *   2. Run `npm run start:buggy`.
 *   3. Press j repeatedly — the cursor disappears below the viewport.
 *
 * To see the fix:
 *   1. Same small split.
 *   2. Run `npm start`.
 *   3. Press j — the viewport scrolls to keep the cursor visible.
 */

const fixed = process.env['FIXED'] !== 'false';

const { unmount } = render(
  <VimTextArea
    fixed={fixed}
    onQuit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
