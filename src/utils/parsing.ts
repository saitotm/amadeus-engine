/**
 * Parsing utilities for extracting code blocks and detecting
 * final answer patterns from LLM responses.
 *
 * @module
 */

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
 * Detects FINAL() or FINAL_VAR() pattern in text and extracts its value.
 *
 * @param text - Text to search for FINAL pattern
 * @param environment - Optional variable context for FINAL_VAR resolution
 * @returns Extracted value or undefined if not found
 */
export function findFinalAnswer(
  text: string,
  environment?: Record<string, unknown>,
): string | undefined {
  // Check for FINAL_VAR pattern first (takes precedence)
  const finalVarMatch = text.match(/FINAL_VAR\(([^)]+)\)/);
  if (finalVarMatch) {
    // removing quotes if present
    const varName = finalVarMatch[1].trim().replace(/^["']|["']$/g, "");

    if (!environment || !(varName in environment)) {
      return undefined;
    }

    // Convert value to string representation
    const value = environment[varName];
    if (typeof value === "string") {
      return value;
    }
    return JSON.stringify(value);
  }

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
