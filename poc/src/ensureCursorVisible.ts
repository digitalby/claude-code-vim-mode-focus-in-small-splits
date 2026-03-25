/**
 * Computes the new scrollOffset that keeps cursorRow within the visible viewport.
 *
 * Invariant enforced: scrollOffset <= cursorRow < scrollOffset + visibleRows
 *
 * This is the core of the scroll-into-view fix for Claude Code's vim mode.
 * The function is pure (no side effects) and O(1).
 *
 * @param cursorRow    - 0-indexed row in the buffer where the cursor lives
 * @param scrollOffset - first buffer row currently rendered (0 = top of buffer)
 * @param visibleRows  - number of rows visible in the terminal (stdout.rows minus chrome)
 * @returns            - the new scrollOffset to apply
 */
export function ensureCursorVisible(
  cursorRow: number,
  scrollOffset: number,
  visibleRows: number,
): number {
  if (visibleRows <= 0) return scrollOffset;

  if (cursorRow < scrollOffset) {
    // Cursor moved above the top of the viewport — scroll up.
    return cursorRow;
  }

  if (cursorRow >= scrollOffset + visibleRows) {
    // Cursor moved below the bottom of the viewport — scroll down.
    return cursorRow - visibleRows + 1;
  }

  // Cursor is already within the visible range — no change.
  return scrollOffset;
}
