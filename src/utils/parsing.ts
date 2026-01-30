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
