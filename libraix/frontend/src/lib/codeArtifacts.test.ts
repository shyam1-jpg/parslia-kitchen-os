import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPreviewHtml,
  canRunJavaScript,
  extractCodeArtifacts,
  isSubstantialArtifact,
  normalizeLanguage,
  pickPrimaryArtifact,
} from "./codeArtifacts.ts";

describe("code artifacts", () => {
  it("extracts fenced files with language and filename hints", () => {
    const md = [
      "Here is a server:",
      "```python app.py",
      "from flask import Flask",
      "app = Flask(__name__)",
      "@app.get('/')",
      "def hi():",
      "    return 'ok'",
      "```",
      "",
      "And a tiny note: `print(1)`",
    ].join("\n");
    const arts = extractCodeArtifacts(md);
    assert.equal(arts.length, 1);
    assert.equal(arts[0].language, "python");
    assert.equal(arts[0].filename, "app.py");
    assert.match(arts[0].code, /Flask/);
  });

  it("reads filename comments and picks the largest substantial block", () => {
    const md = [
      "```js",
      "// widget.js",
      "export function add(a, b) { return a + b }",
      "function range(n) {",
      "  const out = []",
      "  for (let i = 0; i < n; i++) out.push(i)",
      "  return out",
      "}",
      "console.log(add(1, 2))",
      "console.log(range(12).join(','))",
      "```",
      "",
      "```html",
      "<!-- index.html -->",
      "<!DOCTYPE html><html><body><h1>Hi</h1></body></html>",
      "```",
    ].join("\n");
    const arts = extractCodeArtifacts(md);
    assert.equal(arts[0].filename, "widget.js");
    assert.equal(arts[1].filename, "index.html");
    const primary = pickPrimaryArtifact(arts);
    assert.equal(primary?.filename, "widget.js");
    assert.equal(isSubstantialArtifact(arts[0]), true);
  });

  it("normalises languages for run/preview", () => {
    assert.equal(normalizeLanguage("js"), "javascript");
    assert.equal(canRunJavaScript("javascript"), true);
    assert.equal(canRunJavaScript("python"), false);
    assert.equal(canPreviewHtml("html"), true);
  });
});
