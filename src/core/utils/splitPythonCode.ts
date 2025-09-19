/**
 * Splits Python source into logical, individually executable “cells” (Jupyter-like).
 *
 * Rules (heuristic, not a full parser):
 * - Multi-line strings: Tracks triple-quoted strings (""" / ''') and never splits inside them.
 * - New cell starts on top-level block starters: import/from, class/def, if/for/while/try/with,
 *   and `if __name__ == "__main__":`.
 * - Assignments: Top-level assignments (e.g., `x = ...`, `os.environ[...] = ...`) start a new cell.
 * - `.act(` calls: Any real `.act(` (not in comments/strings) starts a new cell.
 * - Imports grouping: Consecutive import/from statements are grouped into one cell.
 * - Docstrings: A docstring-only block forms a single cell and stays together.
 * - Comment “preamble”: Any run of comments/blank lines immediately preceding a split is moved
 *   forward and prefixed to the new cell (so headers like `# Perform the QA steps` attach to the
 *   code they describe). Indented comments at the end of a cell are treated the same.
 *
 * Limitations:
 * - Best-effort detection using regex/indent heuristics; not a full Python tokenizer/AST.
 * - `.act(` detection ignores occurrences inside quoted strings and comments only on a single line.
 *
 * @param code Full Python source as a single string.
 * @returns Array of trimmed cell strings (empty cells are omitted).
 */
export function splitPythonCode(code: string): string[] {
  const lines = code.split('\n');
  const cells: string[] = [];
  let currentCellLines: string[] = [];

  let inMultiLineString = false;
  let multiLineStringDelimiter = '';

  const finalizeCell = () => {
    if (currentCellLines.length === 0) return;
    const cellContent = currentCellLines.join('\n').trim();
    if (cellContent.length > 0) {
      cells.push(cellContent);
    }
    currentCellLines = [];
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for multi-line string delimiters
    const tripleDoubleQuotes = '"""';
    const tripleSingleQuotes = "'''";

    // Handle multi-line string state changes
    if (!inMultiLineString) {
      // Check if we're starting a multi-line string
      if (line.includes(tripleDoubleQuotes)) {
        const count = (line.match(/"""/g) || []).length;
        if (count % 2 === 1) {
          inMultiLineString = true;
          multiLineStringDelimiter = tripleDoubleQuotes;
          // Check if it also ends on the same line
          if (count > 1) {
            inMultiLineString = false;
            multiLineStringDelimiter = '';
          }
        }
      } else if (line.includes(tripleSingleQuotes)) {
        const count = (line.match(/'''/g) || []).length;
        if (count % 2 === 1) {
          inMultiLineString = true;
          multiLineStringDelimiter = tripleSingleQuotes;
          // Check if it also ends on the same line
          if (count > 1) {
            inMultiLineString = false;
            multiLineStringDelimiter = '';
          }
        }
      }
    } else {
      // We're in a multi-line string, check if this line ends it
      if (line.includes(multiLineStringDelimiter)) {
        const count = (
          line.match(new RegExp(multiLineStringDelimiter.replace(/'/g, "\\'"), 'g')) || []
        ).length;
        if (count % 2 === 1) {
          // This line ends the multi-line string
          currentCellLines.push(line);
          inMultiLineString = false;
          multiLineStringDelimiter = '';
          continue;
        }
      }
      currentCellLines.push(line);
      continue;
    }

    // Top-level comments/blank lines stay with the current cell by default
    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      currentCellLines.push(line);
      continue;
    }

    const lineIndent = line.search(/\S|$/);
    const shouldStartNewCell = shouldSplitIntoNewCell(trimmedLine, lineIndent, currentCellLines);

    if (shouldStartNewCell) {
      // Always carry trailing comments/blanks to the next cell
      const carried = extractTrailingCommentsAndBlanks(currentCellLines);

      finalizeCell();
      if (carried.length > 0) {
        currentCellLines.push(...carried);
      }
    }

    currentCellLines.push(line);
  }

  finalizeCell();
  return cells;
}

/**
 * Returns true if this line should start a new cell.
 * Triggers:
 *   - top-level starters (import/def/class/if/…),
 *   - OR a top-level `.act(` call (not inside strings/comments).
 * Exceptions:
 *   - group consecutive imports,
 *   - keep docstring-only cells intact.
 */
function shouldSplitIntoNewCell(
  trimmedLine: string,
  lineIndent: number,
  currentCellLines: string[]
): boolean {
  if (currentCellLines.length === 0) return false;

  const isTopLevel = lineIndent === 0;
  const isNewTopLevelStatement = isTopLevelStatement(trimmedLine, lineIndent);
  const containsAct = hasActCall(trimmedLine);

  // Only split if a trigger fires:
  // - top-level starter, or
  // - top-level `.act(` (indented `.act` should NOT split)
  const shouldTrigger = isNewTopLevelStatement || (isTopLevel && containsAct);

  if (!shouldTrigger) return false;

  // Merge exceptions
  const current = currentCellLines.join('\n').trim();
  const currentIsImport = current.startsWith('import ') || current.startsWith('from ');
  const newIsImport = trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ');
  // group imports
  if (currentIsImport && newIsImport) return false;
  // keep docstring-only block
  if (isOnlyDocstrings(current)) return false;

  return true;
}

/**
 * Helper to check if a trimmed line is a new, top-level logical block
 */
function isTopLevelStatement(trimmedLine: string, indent: number): boolean {
  if (indent !== 0) return false;

  const topLevelKeywords = [
    'import ',
    'from ',
    'class ',
    'def ',
    'if ',
    'while ',
    'for ',
    'try:',
    'with ',
  ];

  if (
    topLevelKeywords.some((keyword) => trimmedLine.startsWith(keyword)) ||
    trimmedLine.startsWith('if __name__ == "__main__":')
  ) {
    return true;
  }

  // Top-level standalone docstrings
  if (trimmedLine.startsWith('"""') || trimmedLine.startsWith("'''")) return true;

  // Top-level assignments (heuristic; ignore explicit line continuations)
  if (trimmedLine.includes('=') && !trimmedLine.endsWith('\\')) return true;

  return false;
}

/**
 * Helper to check if a line contains a .act() call. Ignores comments and .act within strings
 * Note that this done via best-effort regex and may not be fully robust.
 */
function hasActCall(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith('#')) return false; // whole-line comment

  const noComments = line.replace(/#.*/, ''); // strip inline comment
  // Remove quoted string contents (single or double).
  // (['"])         -> capture opening quote
  // (?:(?!\1).)*   -> any chars that are not the same quote
  // \1             -> matching closing quote
  const withoutStrings = noComments.replace(/(['"])(?:(?!\1).)*\1/g, '');

  return withoutStrings.includes('.act(');
}

/**
 * True if content is only docstrings and/or whitespace/comments.
 */
function isOnlyDocstrings(content: string): boolean {
  const lines = content.split('\n');
  let hasDocstring = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    // Check if this line is a standalone docstring (starts with triple quotes)
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      hasDocstring = true;
      continue;
    }

    // If we find any non-docstring, non-comment, non-empty line, return false
    return false;
  }

  return hasDocstring;
}

/**
 * Extract trailing blank lines or comments from the end of the current cell.
 * Returns them in original order and removes them from `lines`.
 *
 * Example:
 *   ["code", "# comment", ""]  --> returns ["# comment", ""]
 *                                and mutates `lines` to ["code"].
 */
function extractTrailingCommentsAndBlanks(lines: string[]): string[] {
  const trailing: string[] = [];

  // Walk backwards until hitting a non-comment/non-blank line
  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (lastLine === undefined) {
      break;
    }
    const trimmed = lastLine.trim();
    const isBlank = trimmed.length === 0;
    const isComment = trimmed.startsWith('#');

    if (isBlank || isComment) {
      // Keep original order in the returned array
      trailing.unshift(lines.pop()!);
    } else {
      break;
    }
  }

  return trailing;
}
