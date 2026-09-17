import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlPreviewDocument, runJavaScript } from "./codeSandbox.ts";

describe("Libraix JS sandbox", () => {
  it("runs javascript and captures logs plus a return value", () => {
    const result = runJavaScript(`console.log("Hello from", "Libraix");\nreturn 2 + 2;`);
    assert.equal(result.ok, true);
    assert.match(result.output, /Hello from Libraix/);
    assert.match(result.output, /→ 4/);
  });

  it("surfaces syntax errors without throwing", () => {
    const result = runJavaScript("this is not js {");
    assert.equal(result.ok, false);
    assert.ok(result.output.length > 0);
  });

  it("wraps html fragments for iframe preview", () => {
    const doc = htmlPreviewDocument("<h1>Libraix</h1>", "html");
    assert.match(doc, /<!DOCTYPE html>/);
    assert.match(doc, /<h1>Libraix<\/h1>/);
  });
});
