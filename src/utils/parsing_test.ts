import { assertEquals } from "@std/assert";
import { findCodeBlocks } from "./parsing.ts";

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
