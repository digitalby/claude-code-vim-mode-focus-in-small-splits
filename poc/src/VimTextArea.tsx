import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { ensureCursorVisible } from './ensureCursorVisible.js';

/**
 * Rows consumed by UI chrome above/below the text area:
 *   - 1 row: mode indicator line (-- NORMAL -- / -- INSERT --)
 *   - 1 row: top border / prompt prefix
 *   - 1 row: bottom status bar
 *
 * This mirrors the chrome Claude Code renders around its vim input component.
 * Adjust if the surrounding UI changes.
 */
const RESERVED_CHROME_ROWS = 3;

type VimMode = 'normal' | 'insert';

interface Props {
  /** When false, scroll-into-view is disabled — reproduces the bug. */
  fixed: boolean;
  onQuit: () => void;
}

export function VimTextArea({ fixed, onQuit }: Props): React.ReactElement {
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? 24;
  const visibleRows = Math.max(1, terminalRows - RESERVED_CHROME_ROWS);

  // The buffer: one string per logical line.
  const [lines, setLines] = useState<string[]>(() =>
    Array.from({ length: 20 }, (_, i) => `Line ${String(i + 1).padStart(2, '0')}: sample content here`),
  );

  const [cursorRow, setCursorRow] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);
  const [mode, setMode] = useState<VimMode>('normal');
  const [scrollOffset, setScrollOffset] = useState(0);

  // Enforce scroll-into-view invariant after every cursorRow or visibleRows change.
  useEffect(() => {
    if (!fixed) return; // Bug mode: no adjustment — cursor goes off-screen.
    setScrollOffset(prev => ensureCursorVisible(cursorRow, prev, visibleRows));
  }, [cursorRow, visibleRows, fixed]);

  useInput((input, key) => {
    if (mode === 'normal') {
      if (input === 'q') {
        onQuit();
        return;
      }

      if (input === 'j' || key.downArrow) {
        setCursorRow(r => Math.min(r + 1, lines.length - 1));
        return;
      }

      if (input === 'k' || key.upArrow) {
        setCursorRow(r => Math.max(r - 1, 0));
        return;
      }

      if (input === 'l' || key.rightArrow) {
        const lineLen = lines[cursorRow]?.length ?? 0;
        setCursorCol(c => Math.min(c + 1, Math.max(0, lineLen - 1)));
        return;
      }

      if (input === 'h' || key.leftArrow) {
        setCursorCol(c => Math.max(c - 1, 0));
        return;
      }

      if (input === 'i') {
        setMode('insert');
        return;
      }

      if (input === 'g') {
        // gg: jump to first line (simplified: single g goes to top for the PoC)
        setCursorRow(0);
        setCursorCol(0);
        return;
      }

      if (input === 'G') {
        setCursorRow(lines.length - 1);
        setCursorCol(0);
        return;
      }
    }

    if (mode === 'insert') {
      if (key.escape) {
        setMode('normal');
        setCursorCol(c => Math.max(c - 1, 0));
        return;
      }

      if (key.return) {
        setLines(prev => {
          const before = prev[cursorRow]?.slice(0, cursorCol) ?? '';
          const after = prev[cursorRow]?.slice(cursorCol) ?? '';
          const next = [...prev];
          next.splice(cursorRow, 1, before, after);
          return next;
        });
        setCursorRow(r => r + 1);
        setCursorCol(0);
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorCol > 0) {
          setLines(prev => {
            const next = [...prev];
            const line = next[cursorRow] ?? '';
            next[cursorRow] = line.slice(0, cursorCol - 1) + line.slice(cursorCol);
            return next;
          });
          setCursorCol(c => c - 1);
        }
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setLines(prev => {
          const next = [...prev];
          const line = next[cursorRow] ?? '';
          next[cursorRow] = line.slice(0, cursorCol) + input + line.slice(cursorCol);
          return next;
        });
        setCursorCol(c => c + 1);
      }
    }
  });

  const visibleLines = lines.slice(scrollOffset, scrollOffset + visibleRows);

  return (
    <Box flexDirection="column">
      {/* Mode indicator (1 row of chrome) */}
      <Box>
        <Text color={mode === 'normal' ? 'yellow' : 'green'} bold>
          {mode === 'normal' ? '-- NORMAL --' : '-- INSERT --'}
          {'  '}
        </Text>
        <Text dimColor>
          {fixed ? '[FIXED: scroll-into-view ON]' : '[BUGGY: scroll-into-view OFF]'}
          {'  '}
          row {cursorRow + 1}/{lines.length}{'  '}
          offset {scrollOffset}{'  '}
          visible {visibleRows} rows
        </Text>
      </Box>

      {/* Text buffer (visible window only) */}
      <Box flexDirection="column" borderStyle="single">
        {visibleLines.map((line, viewIdx) => {
          const bufferRow = scrollOffset + viewIdx;
          const isActiveLine = bufferRow === cursorRow;

          if (!isActiveLine) {
            return (
              <Box key={bufferRow}>
                <Text dimColor>{String(bufferRow + 1).padStart(3, ' ')} </Text>
                <Text>{line}</Text>
              </Box>
            );
          }

          // Render the cursor on the active line.
          const beforeCursor = line.slice(0, cursorCol);
          const atCursor = line[cursorCol] ?? ' ';
          const afterCursor = line.slice(cursorCol + 1);

          return (
            <Box key={bufferRow}>
              <Text color="cyan">{String(bufferRow + 1).padStart(3, ' ')} </Text>
              <Text>{beforeCursor}</Text>
              <Text backgroundColor="white" color="black">{atCursor}</Text>
              <Text>{afterCursor}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Help line (1 row of chrome) */}
      <Text dimColor>j/k: move  i: insert  Esc: normal  q: quit</Text>
    </Box>
  );
}
