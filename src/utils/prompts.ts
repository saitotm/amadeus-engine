/**
 * System prompt and prompt building utilities for the RLM REPL environment.
 *
 * Provides the base system prompt that instructs the LLM how to use the
 * TypeScript/JavaScript REPL environment, along with functions to build
 * structured message sequences for RLM interactions.
 *
 * @module
 */

/** Metadata about the context provided to the RLM. */
export interface QueryMetadata {
  contextLengths: number[];
  contextTotalLength: number;
  contextType: "str" | "list" | "dict";
}

/** A message in the LLM conversation. */
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Options for building user prompts. */
export interface PromptOptions {
  rootPrompt?: string;
  iteration?: number;
  contextCount?: number;
  historyCount?: number;
}

/**
 * The base system prompt for the RLM REPL environment.
 *
 * Instructs the LLM on how to use the TypeScript/JavaScript REPL,
 * including `llm_query()`, `llm_query_batched()`, `FINAL()`, and `FINAL_VAR()`.
 * Contains chunking strategy examples and batch processing patterns.
 */
export const RLM_SYSTEM_PROMPT =
  `You are tasked with answering a query with associated context. You can access, transform, and analyze this context interactively in a REPL environment that can recursively query sub-LLMs, which you are strongly encouraged to use as much as possible. You will be queried iteratively until you provide a final answer.

The REPL environment is initialized with:
1. A \`context\` variable that contains extremely important information about your query. You should check the content of the \`context\` variable to understand what you are working with. Make sure you look through it sufficiently as you answer your query.
2. A \`llm_query\` function that allows you to query an LLM (that can handle around 500K chars) inside your REPL environment.
3. A \`llm_query_batched\` function that allows you to query multiple prompts concurrently: \`llm_query_batched(prompts: string[]): Promise<string[]>\`. This is much faster than sequential \`llm_query\` calls when you have multiple independent queries. Results are returned in the same order as the input prompts.
4. The ability to use \`console.log()\` statements to view the output of your REPL code and continue your reasoning.

You will only be able to see truncated outputs from the REPL environment, so you should use the query LLM function on variables you want to analyze. You will find this function especially useful when you have to analyze the semantics of the context. Use these variables as buffers to build up your final answer.
Make sure to explicitly look through the entire context in REPL before answering your query. An example strategy is to first look at the context and figure out a chunking strategy, then break up the context into smart chunks, and query an LLM per chunk with a particular question and save the answers to a buffer, then query an LLM with all the buffers to produce your final answer.

You can use the REPL environment to help you understand your context, especially if it is huge. Remember that your sub LLMs are powerful -- they can fit around 500K characters in their context window, so don't be afraid to put a lot of context into them. For example, a viable strategy is to feed 10 documents per sub-LLM query. Analyze your input data and see if it is sufficient to just fit it in a few sub-LLM calls!

When you want to execute TypeScript/JavaScript code in the REPL environment, wrap it in triple backticks with 'repl' language identifier. For example, say we want our recursive model to search for the magic number in the context (assuming the context is a string), and the context is very long, so we want to chunk it:
\`\`\`repl
const chunk = context.slice(0, 10000);
const answer = await llm_query(\`What is the magic number in the context? Here is the chunk: \${chunk}\`);
console.log(answer);
\`\`\`

As an example, suppose you're trying to answer a question about a book. You can iteratively chunk the context section by section, query an LLM on that chunk, and track relevant information in a buffer.
\`\`\`repl
const query = "In Harry Potter and the Sorcerer's Stone, did Gryffindor win the House Cup because they led?";
let buffer = "";
for (let i = 0; i < context.length; i++) {
  const section = context[i];
  if (i === context.length - 1) {
    buffer = await llm_query(\`You are on the last section of the book. So far you know that: \${buffer}. Gather from this last section to answer \${query}. Here is the section: \${section}\`);
    console.log(\`Based on reading iteratively through the book, the answer is: \${buffer}\`);
  } else {
    buffer = await llm_query(\`You are iteratively looking through a book, and are on section \${i} of \${context.length}. Gather information to help answer \${query}. Here is the section: \${section}\`);
    console.log(\`After section \${i} of \${context.length}, you have tracked: \${buffer}\`);
  }
}
\`\`\`

As another example, when the context isn't that long, a simple but viable strategy is, based on the context chunk lengths, to combine them and recursively query an LLM over chunks. For example, if the context is an array of strings, we ask the same query over each chunk using \`llm_query_batched\` for concurrent processing:
\`\`\`repl
const query = "A man became famous for his book 'The Great Gatsby'. How many jobs did he have?";
// Suppose our context is ~1M chars, and we want each sub-LLM query to be ~0.1M chars so we split it into 10 chunks
const chunkSize = Math.floor(context.length / 10);
const chunks: string[] = [];
for (let i = 0; i < 10; i++) {
  if (i < 9) {
    chunks.push(context.slice(i * chunkSize, (i + 1) * chunkSize).join("\\n"));
  } else {
    chunks.push(context.slice(i * chunkSize).join("\\n"));
  }
}

// Use batched query for concurrent processing - much faster than sequential calls!
const prompts = chunks.map(chunk =>
  \`Try to answer the following query: \${query}. Here are the documents:\\n\${chunk}. Only answer if you are confident in your answer based on the evidence.\`
);
const answers = await llm_query_batched(prompts);
for (let i = 0; i < answers.length; i++) {
  console.log(\`I got the answer from chunk \${i}: \${answers[i]}\`);
}
const finalAnswer = await llm_query(\`Aggregating all the answers per chunk, answer the original query about total number of jobs: \${query}\\n\\nAnswers:\\n\` + answers.join("\\n"));
\`\`\`

As a final example, after analyzing the context and realizing it's separated by Markdown headers, we can maintain state through buffers by chunking the context by headers, and iteratively querying an LLM over it:
\`\`\`repl
// After finding out the context is separated by Markdown headers, we can chunk, summarize, and answer
const sections = context["content"].split(/### (.+)/);
const buffers: string[] = [];
for (let i = 1; i < sections.length; i += 2) {
  const header = sections[i];
  const info = sections[i + 1];
  const summary = await llm_query(\`Summarize this \${header} section: \${info}\`);
  buffers.push(\`\${header}: \${summary}\`);
}
const finalAnswer = await llm_query(\`Based on these summaries, answer the original query: \${query}\\n\\nSummaries:\\n\` + buffers.join("\\n"));
\`\`\`
In the next step, we can return FINAL_VAR(finalAnswer).

IMPORTANT: When you are done with the iterative process, you MUST provide a final answer inside a FINAL function when you have completed your task, NOT in code. Do not use these tags unless you have completed your task. You have two options:
1. Use FINAL(your final answer here) to provide the answer directly
2. Use FINAL_VAR(variable_name) to return a variable you have created in the REPL environment as your final output

Think step by step carefully, plan, and execute this plan immediately in your response -- do not just say "I will do this" or "I will do that". Output to the REPL environment and recursive LLMs as much as possible. Remember to explicitly answer the original query in your final answer.`;

const USER_PROMPT =
  `Think step-by-step on what to do using the REPL environment (which contains the context) to answer the prompt.\n\nContinue using the REPL environment, which has the \`context\` variable, and querying sub-LLMs by writing to \`\`\`repl\`\`\` tags, and determine your answer. Your next action:`;

const USER_PROMPT_WITH_ROOT =
  `Think step-by-step on what to do using the REPL environment (which contains the context) to answer the original prompt: "{rootPrompt}".\n\nContinue using the REPL environment, which has the \`context\` variable, and querying sub-LLMs by writing to \`\`\`repl\`\`\` tags, and determine your answer. Your next action:`;

/**
 * Creates a {@link QueryMetadata} object from the given context.
 *
 * Analyzes the context to determine its type, individual chunk lengths,
 * and total character length.
 *
 * @param context - The context data (string, string array, or record)
 * @returns Metadata describing the context structure
 */
export function createQueryMetadata(
  context: string | string[] | Record<string, unknown>,
): QueryMetadata {
  if (typeof context === "string") {
    return {
      contextLengths: [context.length],
      contextTotalLength: context.length,
      contextType: "str",
    };
  }

  if (Array.isArray(context)) {
    if (context.length === 0) {
      return {
        contextLengths: [0],
        contextTotalLength: 0,
        contextType: "list",
      };
    }
    const lengths = context.map((chunk) => {
      if (typeof chunk === "string") return chunk.length;
      return JSON.stringify(chunk).length;
    });
    return {
      contextLengths: lengths,
      contextTotalLength: lengths.reduce((a, b) => a + b, 0),
      contextType: "list",
    };
  }

  // Record / dict
  const lengths = Object.values(context).map((value) => {
    if (typeof value === "string") return value.length;
    return JSON.stringify(value).length;
  });
  return {
    contextLengths: lengths,
    contextTotalLength: lengths.reduce((a, b) => a + b, 0),
    contextType: "dict",
  };
}

/**
 * Builds the initial system prompt messages for the RLM REPL environment.
 *
 * Returns a two-element message array: the system prompt and an assistant
 * message describing the context metadata (type, total length, chunk sizes).
 *
 * @param systemPrompt - The system prompt string to use
 * @param queryMetadata - Metadata about the context being provided
 * @returns Array of messages for the LLM conversation
 */
export function buildRlmSystemPrompt(
  systemPrompt: string,
  queryMetadata: QueryMetadata,
): Message[] {
  let { contextLengths } = queryMetadata;
  const { contextTotalLength, contextType } = queryMetadata;

  let lengthsStr: string;
  if (contextLengths.length > 100) {
    const others = contextLengths.length - 100;
    contextLengths = contextLengths.slice(0, 100);
    lengthsStr = `[${contextLengths.join(", ")}]... [${others} others]`;
  } else {
    lengthsStr = `[${contextLengths.join(", ")}]`;
  }

  const metadataPrompt =
    `Your context is a ${contextType} with ${contextTotalLength} total characters, and is broken up into chunks of char lengths: ${lengthsStr}.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: metadataPrompt },
  ];
}

/**
 * Builds a user prompt message for a given iteration of the RLM loop.
 *
 * At iteration 0, includes a safeguard telling the LLM to explore the
 * context first. At later iterations, references previous REPL interactions.
 * Optionally includes notes about multiple contexts and conversation histories.
 *
 * @param options - Options controlling the prompt content
 * @returns A user message for the LLM conversation
 */
export function buildUserPrompt(options?: PromptOptions): Message {
  const {
    rootPrompt,
    iteration = 0,
    contextCount = 1,
    historyCount = 0,
  } = options ?? {};

  let prompt: string;

  if (iteration === 0) {
    const safeguard =
      "You have not interacted with the REPL environment or seen your prompt / context yet. Your next action should be to look through and figure out how to answer the prompt, so don't just provide a final answer yet.\n\n";
    const base = rootPrompt
      ? USER_PROMPT_WITH_ROOT.replace("{rootPrompt}", rootPrompt)
      : USER_PROMPT;
    prompt = safeguard + base;
  } else {
    const prefix =
      "The history before is your previous interactions with the REPL environment. ";
    const base = rootPrompt
      ? USER_PROMPT_WITH_ROOT.replace("{rootPrompt}", rootPrompt)
      : USER_PROMPT;
    prompt = prefix + base;
  }

  if (contextCount > 1) {
    prompt +=
      `\n\nNote: You have ${contextCount} contexts available (context_0 through context_${
        contextCount - 1
      }).`;
  }

  if (historyCount > 0) {
    if (historyCount === 1) {
      prompt +=
        "\n\nNote: You have 1 prior conversation history available in the `history` variable.";
    } else {
      prompt +=
        `\n\nNote: You have ${historyCount} prior conversation histories available (history_0 through history_${
          historyCount - 1
        }).`;
    }
  }

  return { role: "user", content: prompt };
}
