const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(html, /Build simple-v1\.6/);
assert.match(html, /data-template="vedanta"/);
assert.match(html, /tpl-vedanta/);
assert.match(html, /The Vedanta Way/);
assert.match(html, /Cream of Tomato & Basil Soup/);
assert.match(html, /vedanta-house\.png/);
assert.match(html, /family=EB\+Garamond/);
assert.ok(fs.existsSync(path.join(root, "assets", "vedanta-house.png")), "house mark missing");

const start = html.indexOf("/* MENU_LOGIC_START */");
const end = html.indexOf("/* MENU_LOGIC_END */");
assert.ok(start > 0 && end > start, "MENU_LOGIC markers missing");

const header = `
var COURSE_HEADERS=new Set(["soup","soups","salad","salads","side","sides","side dish","side dishes","main","mains","main course","main courses","dessert","desserts","starter","starters","appetizer","appetizers","breakfast","lunch","dinner","accompaniment","accompaniments","bread","breads","drink","drinks","beverage","beverages","pudding","puddings"]);
function toTitle(s){return s.toLowerCase().replace(/(^|[^A-Za-zÀ-ÿ])([a-zà-ÿ])/g,(m,pre,c)=>pre+c.toUpperCase())}
function isDietOnlyLine(){return false}
`;
const logic = header + html.slice(start, end);
const ctx = {COURSE_HEADERS: null};
vm.createContext(ctx);
vm.runInContext(logic + "; this.COURSE_HEADERS=COURSE_HEADERS;", ctx);

assert.strictEqual(ctx.isCourseHeading("SOUP"), true);
assert.strictEqual(ctx.isCourseHeading("S A L A D S"), true);
assert.strictEqual(ctx.isCourseHeading("MAIN COURSE"), true);
assert.strictEqual(ctx.isCourseHeading("Side Dish"), true);
assert.strictEqual(ctx.isCourseHeading("Cream of Tomato & Basil Soup"), false);
assert.strictEqual(ctx.spacedCaps("Allergen Information"), "A L L E R G E N   I N F O R M A T I O N");
assert.strictEqual(ctx.spacedCaps("Side Dish"), "S I D E   D I S H");
assert.strictEqual(ctx.collapseSpacedCaps("S O U P"), "SOUP");

const parseStart = html.indexOf("function parseBulk(text){");
const parseEnd = html.indexOf("function displayAllergen(");
assert.ok(parseStart > 0 && parseEnd > parseStart, "parseBulk block missing");
const parseSrc = html.slice(html.indexOf("function toTitle(s)"), html.indexOf("function buildChips(){"));
const parseCtx = {COURSE_HEADERS: ctx.COURSE_HEADERS};
vm.createContext(parseCtx);
vm.runInContext("var COURSE_HEADERS = this.COURSE_HEADERS;\n" + parseSrc, parseCtx);

const pasted = `DINNER MENU

The Vedanta Way

SOUP
Cream of Tomato & Basil Soup
A smooth tomato and fresh basil soup, finished with cream.
(Contains: Dairy)

S A L A D S
Tuscany Salad
A fresh Tuscan-style salad.
(Contains: Sulphur Dioxide)

MAIN COURSE
High-Protein Lasagne
Layers of pasta.
Contains: Gluten, Dairy

ALLERGEN INFORMATION
We carefully select our ingredients and prepare all dishes with attention to allergens.
`;

const parsed = JSON.parse(JSON.stringify(parseCtx.parseBulk(pasted)));
assert.strictEqual(parsed.title, "DINNER MENU");
const names = parsed.dishes.map(d => d.name);
assert.deepStrictEqual(names, [
  "Soup",
  "Cream of Tomato & Basil Soup",
  "Salads",
  "Tuscany Salad",
  "Main Course",
  "High-Protein Lasagne"
]);
assert.ok(parsed.dishes[0].course);
assert.deepStrictEqual(parsed.dishes[1].allergens, ["Dairy"]);
assert.deepStrictEqual(parsed.dishes[3].allergens, ["Sulphur Dioxide"]);
assert.ok(!parsed.dishes.some(d => /allergen/i.test(d.name)));
assert.strictEqual(parseCtx.containsLine(["Dairy"], "vedanta"), "(Contains: Dairy)");
assert.strictEqual(parseCtx.containsLine(["Sulphur Dioxide"], "vedanta"), "(Contains: Sulphur Dioxide/Sulphites)");
assert.strictEqual(parseCtx.containsLine(["Gluten","Dairy"], "classic"), "Contains: GLUTEN and DAIRY");

console.log("vedanta-template.test.js: all assertions passed");
