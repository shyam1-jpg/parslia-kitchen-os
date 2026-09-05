/* Lightweight check: every SOP has a short video and a station */
const fs = require("fs");
const vm = require("vm");
const src = fs.readFileSync(__dirname + "/data/sops.js", "utf8");
const ctx = { window: {} };
vm.runInNewContext(src, ctx);
const D = ctx.window.KITELINE_SOP_DATA;
if (!D || !D.sops || D.sops.length !== 13) throw new Error("Expected 13 SOPs, got " + (D && D.sops && D.sops.length));
const cats = new Set(D.categories.map((c) => c.id));
D.sops.forEach((sop) => {
  if (!cats.has(sop.category)) throw new Error(sop.id + " bad category");
  if (!sop.video || !sop.video.scenes || sop.video.scenes.length < 4) throw new Error(sop.id + " missing short video");
  if (sop.video.durationSec < 40) throw new Error(sop.id + " video too short");
  const blob = JSON.stringify(sop).toLowerCase();
  if (blob.includes("home cook") && sop.id === "ck-00") return;
  if (blob.includes("onion") && blob.includes("no garlic")) throw new Error(sop.id + " looks like Vedanta veg pack");
});
const text = JSON.stringify(D).toLowerCase();
["haccp", "allergen", "brigade", "fifo", "natasha", "63", "commercial"].forEach((w) => {
  if (!text.includes(w)) throw new Error("Missing commercial keyword: " + w);
});
if (text.includes("2 hours to 21") || text.includes("4 hours to 8")) throw new Error("US-style cooling limits remain");
if (text.includes("14 allergens highlighted on the label")) throw new Error("Incomplete PPDS wording remains");
D.sops.forEach((sop) => {
  if (!sop.revision || !sop.effectiveDate || !sop.reviewDate) throw new Error(sop.id + " missing document control");
  if (!sop.sections.some((section) => section.h === "Safety controls & escalation")) throw new Error(sop.id + " missing escalation controls");
  if (!sop.assessment || sop.assessment.questions.length < 3 || sop.assessment.passPercent !== 100) throw new Error(sop.id + " missing competency assessment");
  if (!sop.evidenceRequired || sop.evidenceRequired.length < 4) throw new Error(sop.id + " missing evidence rules");
});
const requiredAssets = ["index.html", "offline.html", "standalone.html", "app.js", "styles.css", "sw.js", "manifest.webmanifest"];
requiredAssets.forEach((name) => { if (!fs.existsSync(__dirname + "/" + name)) throw new Error("Missing offline asset: " + name); });
const app = fs.readFileSync(__dirname + "/app.js", "utf8");
const sw = fs.readFileSync(__dirname + "/sw.js", "utf8");
if (!app.includes("SpeechSynthesisUtterance") || !app.includes("completedAt")) throw new Error("Narration or completion tracking missing");
if (!app.includes("competency.passed") || !app.includes("pendingSync") || !app.includes("Export offline evidence ledger")) throw new Error("Advanced competency or audit ledger missing");
if (!sw.includes("offline.html") || !sw.includes("standalone.html") || !sw.includes("response.ok")) throw new Error("Offline strategy incomplete");
if (!sw.includes("kiteline-kitchen-sop-v6")) throw new Error("Service worker cache not bumped after standalone opener");
if (app.includes("https://kiteline.uk/kitchen-sop/")) throw new Error("Pocket app still links to the live 404 URL");
if (!app.includes("Kitchen SOP did not open")) throw new Error("Pocket app missing boot-failure message");
if (!D.guidelineB || D.guidelineB.code !== "B" || !/recipe not found/i.test(D.guidelineB.title + D.guidelineB.summary)) {
  throw new Error("Guideline B (recipe not found) missing");
}
if (!text.includes("guideline b") || !text.includes("do not cook from memory")) throw new Error("Recipe-not-found stop rule missing");
if (!app.includes("guidelineBHtml") || !app.includes("Recipe not found")) throw new Error("Pocket app missing Guideline B empty state");
const standalone = fs.readFileSync(__dirname + "/standalone.html", "utf8");
if (!standalone.includes("KITELINE_SOP_DATA") || !standalone.includes("Guideline B") || standalone.length < 50000) {
  throw new Error("standalone.html is not a self-contained opener");
}
const publicDir = __dirname.replace(/kiteline-kitchen-sop$/, "kitchen-sop");
const rootDir = __dirname.replace(/kiteline-kitchen-sop$/, "");
["index.html", "app.js", "data/sops.js", "sw.js", "standalone.html"].forEach((name) => {
  const a = fs.readFileSync(__dirname + "/" + name, "utf8");
  const b = fs.readFileSync(publicDir + "/" + name, "utf8");
  if (a !== b) throw new Error("Public /kitchen-sop/ is out of date: " + name);
});
const opener = fs.readFileSync(rootDir + "open-kitchen-sop.html", "utf8");
if (opener !== standalone) throw new Error("open-kitchen-sop.html is out of date");
console.log("OK", D.sops.length, "version-controlled UK SOPs plus Guideline B recipe-not-found");
