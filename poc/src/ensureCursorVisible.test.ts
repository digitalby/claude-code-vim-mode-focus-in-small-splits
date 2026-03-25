import { ensureCursorVisible } from './ensureCursorVisible.js';

describe('ensureCursorVisible', () => {
  // Baseline: 10-line buffer, 4 visible rows, initially at top.
  const VISIBLE = 4;

  describe('cursor already visible — no adjustment', () => {
    test('cursor at top of viewport', () => {
      expect(ensureCursorVisible(0, 0, VISIBLE)).toBe(0);
    });

    test('cursor in middle of viewport', () => {
      expect(ensureCursorVisible(2, 0, VISIBLE)).toBe(0);
    });

    test('cursor at bottom of viewport', () => {
      // viewport shows rows 0-3; cursor at row 3 is still visible
      expect(ensureCursorVisible(3, 0, VISIBLE)).toBe(0);
    });

    test('cursor mid-buffer, mid-viewport', () => {
      // viewport shows rows 3-6; cursor at row 5 is visible
      expect(ensureCursorVisible(5, 3, VISIBLE)).toBe(3);
    });
  });

  describe('cursor below viewport — scroll down', () => {
    test('cursor one row below viewport', () => {
      // viewport shows 0-3; cursor at row 4 — must scroll to show 1-4
      expect(ensureCursorVisible(4, 0, VISIBLE)).toBe(1);
    });

    test('cursor several rows below viewport', () => {
      // viewport shows 0-3; cursor at row 7 — must scroll to show 4-7
      expect(ensureCursorVisible(7, 0, VISIBLE)).toBe(4);
    });

    test('cursor at last row of a large buffer', () => {
      // 20-line buffer, viewport shows 0-3; cursor at row 19
      expect(ensureCursorVisible(19, 0, VISIBLE)).toBe(16);
    });
  });

  describe('cursor above viewport — scroll up', () => {
    test('cursor one row above viewport', () => {
      // viewport shows rows 3-6; cursor moves to row 2
      expect(ensureCursorVisible(2, 3, VISIBLE)).toBe(2);
    });

    test('cursor at top of buffer after scrolling down', () => {
      // viewport shows rows 5-8; cursor jumps to row 0
      expect(ensureCursorVisible(0, 5, VISIBLE)).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('visibleRows = 0 — guard against division/range errors', () => {
      // Should return scrollOffset unchanged without crashing
      expect(ensureCursorVisible(5, 0, 0)).toBe(0);
    });

    test('visibleRows = 1 — only one row visible', () => {
      expect(ensureCursorVisible(0, 0, 1)).toBe(0);
      expect(ensureCursorVisible(1, 0, 1)).toBe(1);
      expect(ensureCursorVisible(5, 0, 1)).toBe(5);
    });

    test('buffer exactly fits viewport — offset stays 0', () => {
      // 4 lines, 4 visible rows: all lines always on screen
      expect(ensureCursorVisible(0, 0, 4)).toBe(0);
      expect(ensureCursorVisible(3, 0, 4)).toBe(0);
    });

    test('terminal resize: viewport grows to fit all lines', () => {
      // Was scrolled to offset 3 in a small split; now tall enough for all 10 lines
      // cursorRow=5, scrollOffset=3, visibleRows=10: 5 is within [3, 13) — no change
      expect(ensureCursorVisible(5, 3, 10)).toBe(3);
    });

    test('terminal resize: viewport shrinks below current cursor', () => {
      // cursorRow=3, scrollOffset=0, visibleRows shrinks from 5 to 2
      // 3 >= 0 + 2 — scroll down to show cursor at bottom
      expect(ensureCursorVisible(3, 0, 2)).toBe(2);
    });

    test('cursor stays at 0 when pressing k at top of buffer', () => {
      // cursorRow is clamped to 0 by the caller; offset stays 0
      expect(ensureCursorVisible(0, 0, VISIBLE)).toBe(0);
    });

    test('idempotent: calling twice with same args returns same result', () => {
      const first = ensureCursorVisible(7, 0, VISIBLE);
      const second = ensureCursorVisible(7, first, VISIBLE);
      expect(first).toBe(second);
    });
  });
});
