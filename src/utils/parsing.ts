/**
 * Extracts executable code blocks from LLM response.
 *
 * @param text - LLM response text
 * @returns Array of extracted ```repl``` code blocks
 */
export function findCodeBlocks(text: string): string[] {
  const pattern = /```repl\s*\n(.*?)\n```/gs;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

/**
 * Detects FINAL() pattern in text and extracts its value.
 *
 * @param text - Text to search for FINAL pattern
 * @param environment - Optional variable context for FINAL_VAR resolution
 * @returns Extracted value or undefined if not found
 */
export function findFinalAnswer(
  text: string,
  _environment?: Record<string, unknown>,
): string | undefined {
  // Match FINAL with double quotes
  const doubleQuoteMatch = text.match(/FINAL\("([^"]*)"\)/);
  if (doubleQuoteMatch) {
    return doubleQuoteMatch[1];
  }

  // Match FINAL with single quotes
  const singleQuoteMatch = text.match(/FINAL\('([^']*)'\)/);
  if (singleQuoteMatch) {
    return singleQuoteMatch[1];
  }

  // Match FINAL with raw value (number, variable, etc.)
  const rawMatch = text.match(/FINAL\(([^)]+)\)/);
  if (rawMatch) {
    return rawMatch[1];
  }

  return undefined;
}
