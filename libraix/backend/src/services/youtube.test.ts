import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractYoutubeVideoId } from "./youtube.js";

describe("extractYoutubeVideoId", () => {
  it("parses watch, short, embed, and youtu.be URLs", () => {
    assert.equal(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=12s"), "dQw4w9WgXcQ");
  });

  it("rejects non-youtube or malformed ids", () => {
    assert.equal(extractYoutubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(extractYoutubeVideoId("not-a-url"), null);
    assert.equal(extractYoutubeVideoId("https://youtu.be/short"), null);
  });
});
