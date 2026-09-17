import { fetchPageContent } from "../src/services/fetchPage.js";
import { extractYoutubeVideoId } from "../src/services/youtube.js";

async function main() {
  const id = extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  if (id !== "dQw4w9WgXcQ") throw new Error("youtube id parse failed");
  const page = await fetchPageContent("https://example.com");
  if (!/example/i.test(page.title + page.text)) throw new Error("example.com fetch failed: " + page.text.slice(0, 80));
  console.log("live-tools: page title=", page.title, "chars=", page.text.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
