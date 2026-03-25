# GitHub Issue Draft

**Title:** `[BUG] Vim mode j/k navigation moves cursor off-screen in small terminal splits`

**Labels:** `bug`, `vim-mode`

---

## Description

When Claude Code runs inside a small terminal split (e.g., an iTerm2 native pane, a kitty split, or a tmux window resized to ~6–8 rows), pressing `j` or `k` in Vim Normal mode to navigate a multi-line input buffer causes the cursor to move outside the visible viewport. The cursor becomes physically off-screen. The user cannot see where they are editing and must resize the pane or blindly press `i` to recover.

This is a scroll-into-view invariant violation: the input component tracks `cursorRow` (position in the buffer) but does not maintain a `scrollOffset` (the first buffer row currently rendered). When `cursorRow` exits the visible window, no adjustment is made.

> **Note:** This is distinct from issue #1467 ("Cursor Always Visible Across Multiple Terminal Instances"), which concerns cursor rendering state signaling across panes. This issue is specifically the scroll-to-cursor invariant within a single terminal pane.

## Environment

- Claude Code version: `<!-- fill in: claude --version -->`
- OS: macOS 15.x
- Terminal: iTerm2 (native splits) — also reproducible in kitty splits and tmux panes
- Shell: zsh
- Vim mode enabled via: `/vim` (or `"editorMode": "vim"` in `~/.claude.json`)

## Steps to Reproduce

1. Open iTerm2 and create a native horizontal split pane. Drag the divider so the bottom pane is approximately **6–8 rows tall**.
2. Launch `claude` in the small pane.
3. Enable vim mode: type `/vim` and press Enter.
4. At the input prompt, paste or type a message with **10 or more lines** so the buffer exceeds the pane height.
5. Press `Esc` to enter Normal mode.
6. Press `j` repeatedly to move the cursor downward through the buffer.

## Expected Behavior

The visible portion of the input buffer scrolls to keep the cursor within the viewport at all times. The cursor is always visible. This is standard behavior in every terminal text editor (Vim, Nano, Helix, micro) and expected by users who work in split-pane terminal environments.

## Actual Behavior

The cursor moves to a buffer row that is outside the rendered viewport. Depending on the terminal emulator, the cursor either disappears or appears anchored at the terminal edge. The user has no visual indication of where the cursor is. Any characters typed in this state affect invisible lines. The only recovery is to resize the pane (which reflushes the Ink layout) or press `i` to re-enter Insert mode and navigate blindly.

## Root Cause

The vim input component tracks `cursorRow` (cursor's position within the buffer) but does not maintain a `scrollOffset` (the index of the first buffer row currently rendered). The fix requires enforcing this invariant after every `j`/`k` motion:

```
scrollOffset <= cursorRow < scrollOffset + visibleRows
```

The algorithm is O(1) and pure:

```typescript
function ensureCursorVisible(
  cursorRow: number,
  scrollOffset: number,
  visibleRows: number,
): number {
  if (visibleRows <= 0) return scrollOffset;
  if (cursorRow < scrollOffset) return cursorRow;
  if (cursorRow >= scrollOffset + visibleRows) return cursorRow - visibleRows + 1;
  return scrollOffset;
}
```

Where `visibleRows = stdout.rows - RESERVED_CHROME_ROWS` (using Ink's `useStdout()` hook). The render then slices `lines.slice(scrollOffset, scrollOffset + visibleRows)` instead of rendering the full buffer.

This is a narrowly scoped change (~12 lines) that:
- Does not affect Insert mode typing behavior
- Does not change any keybindings or vim commands
- Is resize-aware: `useStdout()` updates `stdout.rows` on terminal resize, so `visibleRows` recomputes automatically
- Degrades gracefully: when the terminal is tall enough to display all lines, `scrollOffset` stays 0 and behavior is identical to today

The fix should also be applied to `gg` (goto first line) and `G` (goto last line) motions, which have the same viewport problem when the buffer is large.

## Proof of Concept

A standalone Ink application that reproduces the bug and demonstrates the fix is available at:

`<!-- fill in: https://github.com/YOUR_USERNAME/claude-code-vim-mode-focus-in-small-splits/tree/main/poc -->`

To run:

```bash
cd poc
npm install

# Buggy mode — reproduces the off-screen cursor in a small split:
npm run start:buggy

# Fixed mode — demonstrates scroll-into-view:
npm start
```

The PoC includes unit tests for `ensureCursorVisible` covering all edge cases (resize, buffer shrink, cursor at boundaries, single-visible-row terminal):

```bash
npm test
```

## Additional Context

- `useStdout()` from Ink correctly reflects the height of the current pane, including in iTerm2 splits, kitty splits, and tmux panes, and updates on SIGWINCH.
- The algorithm is idempotent: `ensureCursorVisible(row, ensureCursorVisible(row, offset, n), n) === ensureCursorVisible(row, offset, n)`.
- Split-pane workflows are a primary use case for Claude Code (multi-agent, `--mcp`, side-by-side with an editor). Vim mode being non-functional in small splits is a meaningful correctness gap for this user base.

---

*This issue was prepared following the Claude Code OSS contribution guidelines. The PoC was built and tested before filing.*
