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
console.log("OK", D.sops.length, "commercial kitchen SOPs with short videos");
