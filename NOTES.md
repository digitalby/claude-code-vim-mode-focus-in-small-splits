# Internal Notes — Vim Mode Scroll-Into-View Contribution

## Problem Statement

Claude Code's vim Normal mode `j`/`k` navigation moves `cursorRow` without adjusting a `scrollOffset`. In terminal splits shorter than the input buffer, the cursor exits the visible viewport. Edits become blind.

## Research Findings

### Contribution Model (Critical)

`anthropics/claude-code` is an **issues-only tracker**. Confirmed in issue #1525:
> "This repo is primarily intended for bug reports via issues... we don't expect external contributor pull requests."

The binary ships as a single obfuscated `cli.js` (~7.6 MB, no source maps). No surgical patch to the binary is possible. **The deliverable is a well-crafted issue + standalone PoC, not a PR.**

### No Existing Duplicate

Searched the tracker thoroughly:
- **#1467** — "Cursor Always Visible Across Multiple Terminal Instances": cursor *rendering state* across panes (focus events). Closed "not planned". **Distinct from our issue.**
- **#36128** — Transcript scroll (conversation history, not input buffer)
- **#4851** — Scrollback buffer performance in tmux (unrelated)
- **#9935** — Excessive scroll events rate (unrelated)

Filing is safe. Reference #1467 in the issue body to preempt a "duplicate" close.

### Ink Architecture

Claude Code uses:
- **Ink** (React for CLIs) — component-based rendering in raw mode terminal
- **Yoga WASM** — Facebook's flexbox engine for layout
- **`useInput`** — Ink's hook for capturing raw keystrokes (inferred from behavior, not confirmed via source)
- **`useStdout()`** — Ink hook that exposes `stdout.rows` and `stdout.columns`, updated on SIGWINCH (terminal resize)

The vim key handler is Anthropic's custom implementation, not a third-party library.

## Design Decisions

### Why `scrollOffset` state variable, not `ink-scroll-view`?

`ink-scroll-view` (ByteLandTechnology) wraps the component in a `ScrollView` container. Adopting it would require:
1. Restructuring the input component to be a child of `ScrollView`
2. Wiring scroll commands via ref or context
3. Coordinating `scrollView.scrollTo(cursorLine)` after each keypress

This is a structural refactor touching component hierarchy. Our approach instead adds:
- One `scrollOffset: number` state variable
- One `useEffect` that recomputes offset when `cursorRow` or `visibleRows` changes
- One render slice: `lines.slice(scrollOffset, scrollOffset + visibleRows)`

Net change: ~12 lines. The `ink-scroll-view` approach would be ~50+ lines with structural risk.

### `RESERVED_CHROME_ROWS` Value

The PoC uses `3` as the chrome row budget (mode indicator + border + help line). The actual value in Claude Code's implementation is unknown without source access. The issue body asks maintainers to confirm the correct value.

In practice, `RESERVED_CHROME_ROWS` only needs to be approximately correct — being off by 1 produces a minor visual artifact (viewport slightly too small/large) but does not break correctness or cause crashes.

### Why `useEffect` for offset, not inline in key handler?

Two reasons:
1. `visibleRows` can change independently of keypresses (terminal resize → `stdout.rows` updates → effect fires). An inline handler in `useInput` would miss resize events.
2. React batches state updates; reading `cursorRow` immediately after `setCursorRow` inside the same event handler gives stale values. `useEffect` observes the settled state.

### Deferred Scope: `gg` / `G` motions

`gg` (goto first line) and `G` (goto last line) have the same viewport problem — they jump the cursor by a potentially large offset. The fix (`ensureCursorVisible`) applies identically. These are out of scope for this issue to keep it narrow and actionable. File a follow-up if/when the maintainer acknowledges this issue.

### Deferred Scope: Insert mode typing at buffer bottom

When typing new lines at the bottom of the buffer in Insert mode, the content also eventually scrolls off-screen. This is a different trigger (append at boundary, not `j`/`k` navigation) and a different component state transition. Out of scope.

## Open Questions

1. **Exact `RESERVED_CHROME_ROWS` count** — only readable from Claude Code source. The PoC uses 3; the issue asks maintainers to verify.
2. **Ink version** — Claude Code likely uses a specific Ink version. `useStdout()` has been available since Ink v3; confirm for their version.
3. **React strict mode** — Ink's internal render may run effects twice in dev; the algorithm is idempotent so this is fine.
4. **`setCursorOffset` vs `scrollOffset`** — Ink exposes `setCursorOffset(n)` for physical cursor positioning. The scroll approach (rendering a window of lines) is different and does not conflict with this API.

## Issue Filing Checklist

- [ ] Build and run PoC in a small split — confirm bug reproduces
- [ ] Run `npm test` — all unit tests pass
- [ ] Push workspace repo to GitHub (make public) — get PoC URL
- [ ] Fill PoC link placeholder in `issue-body.md`
- [ ] Fill Claude Code version from `claude --version`
- [ ] Review `issue-body.md` one final time
- [ ] File issue at https://github.com/anthropics/claude-code/issues/new
- [ ] Record issue number here

## Issue Tracking

| Field | Value |
|---|---|
| Issue URL | https://github.com/anthropics/claude-code/issues/39828 |
| Filed date | 2026-03-27 |
| Status | Open |
| Maintainer response | (to fill) |
