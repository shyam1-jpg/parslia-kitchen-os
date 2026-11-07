import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { copyBlocks, decodeCopyField, stripPsqlMeta } from "./migrate.ts";

describe("stripPsqlMeta", () => {
  it("removes pg_dump 16 restrict lines and leaves SQL", () => {
    const sql = `\\restrict ABC123\nSET client_encoding = 'UTF8';\n\\unrestrict ABC123\n`;
    assert.equal(stripPsqlMeta(sql).replace(/\s+/g, " ").trim(), "SET client_encoding = 'UTF8';");
  });
});

describe("copyBlocks", () => {
  it("keeps empty tables empty and does not swallow the next COPY", () => {
    const sql = `COPY public.calendar_note (id) FROM stdin;\n\\.\n\nCOPY public.person (id, name) FROM stdin;\nabc\tPriya\n\\.\n`;
    const blocks = [...copyBlocks(sql)];
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].table, "public.calendar_note");
    assert.equal(blocks[0].body, "");
    assert.equal(blocks[1].table, "public.person");
    assert.equal(blocks[1].body, "abc\tPriya");
  });
});

describe("decodeCopyField", () => {
  it("treats \\N as null", () => {
    assert.equal(decodeCopyField("\\N"), null);
  });
  it("unescapes tabs, newlines and backslashes", () => {
    assert.equal(decodeCopyField("a\\tb"), "a\tb");
    assert.equal(decodeCopyField("line1\\nline2"), "line1\nline2");
    assert.equal(decodeCopyField("back\\\\slash"), "back\\slash");
  });
  it("keeps ordinary text including emails", () => {
    assert.equal(decodeCopyField("shyam_1@hotmail.co.uk"), "shyam_1@hotmail.co.uk");
  });
});
