import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractFactsFromUserMessage } from "./memoryExtract.js";

describe("extractFactsFromUserMessage", () => {
  it("captures durable identity and preference facts", () => {
    const facts = extractFactsFromUserMessage("My name is Ada Lovelace and I live in London. I prefer concise answers.");
    const contents = facts.map((f) => f.content);
    assert.ok(contents.some((c) => /Ada Lovelace/.test(c)));
    assert.ok(contents.some((c) => /London/.test(c)));
    assert.ok(contents.some((c) => /concise answers/.test(c)));
  });

  it("ignores tiny or huge messages", () => {
    assert.deepEqual(extractFactsFromUserMessage("hi"), []);
    assert.deepEqual(extractFactsFromUserMessage("x".repeat(2001)), []);
  });
});
