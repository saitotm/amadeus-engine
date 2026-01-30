import { assertEquals } from "@std/assert";
import { findCodeBlocks, findFinalAnswer } from "./parsing.ts";

Deno.test("findCodeBlocks", async (t) => {
  await t.step("extracts a single repl code block", () => {
    const text = `
Here is some code:
\`\`\`repl
const x = 1 + 2;
console.log(x);
\`\`\`
`;
    const blocks = findCodeBlocks(text);
    assertEquals(blocks.length, 1);
    assertEquals(blocks[0], "const x = 1 + 2;\nconsole.log(x);");
  });

  await t.step("extracts multiple repl code blocks", () => {
    const text = `
First block:
\`\`\`repl
const a = 1;
\`\`\`

Second block:
\`\`\`repl
const b = 2;
\`\`\`
`;
    const blocks = findCodeBlocks(text);
    assertEquals(blocks.length, 2);
    assertEquals(blocks[0], "const a = 1;");
    assertEquals(blocks[1], "const b = 2;");
  });

  await t.step("returns empty array when no repl code blocks exist", () => {
    const text = "No code blocks here.";
    const blocks = findCodeBlocks(text);
    assertEquals(blocks, []);
  });

  await t.step("ignores non-repl code blocks", () => {
    const text = `
\`\`\`typescript
const ts = "typescript";
\`\`\`

\`\`\`javascript
const js = "javascript";
\`\`\`

\`\`\`repl
const repl = "repl";
\`\`\`
`;
    const blocks = findCodeBlocks(text);
    assertEquals(blocks.length, 1);
    assertEquals(blocks[0], 'const repl = "repl";');
  });
});

Deno.test("findFinalAnswer - FINAL detection", async (t) => {
  await t.step("detects FINAL with simple string", () => {
    const text = 'FINAL("The answer is 42")';
    const result = findFinalAnswer(text);
    assertEquals(result, "The answer is 42");
  });

  await t.step("detects FINAL with number", () => {
    const text = "FINAL(42)";
    const result = findFinalAnswer(text);
    assertEquals(result, "42");
  });

  await t.step("detects FINAL with single quotes", () => {
    const text = "FINAL('hello world')";
    const result = findFinalAnswer(text);
    assertEquals(result, "hello world");
  });

  await t.step("returns undefined when no FINAL found", () => {
    const text = "This is just some text without any final answer.";
    const result = findFinalAnswer(text);
    assertEquals(result, undefined);
  });

  await t.step("handles FINAL with nested parentheses", () => {
    const text = 'FINAL("calculate(1 + 2)")';
    const result = findFinalAnswer(text);
    assertEquals(result, "calculate(1 + 2)");
  });
});
