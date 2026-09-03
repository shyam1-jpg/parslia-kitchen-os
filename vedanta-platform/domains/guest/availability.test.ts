import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bedsLine, featureLabel, groupPublicTypes, nightsBetween, shapePublicRoom, typeName } from "./availability.ts";

describe("public availability", () => {
  it("never invents a guest name on a room type", () => {
    const rooms = [
      shapePublicRoom({ number: "110", section: "Pink Corridor", type: "TWIN", max_capacity: 3, beds_single: 2, mattresses: 1, features: ["shower"], available: true }),
      shapePublicRoom({ number: "G03", section: "Ground Floor", type: "TWIN", max_capacity: 3, beds_single: 2, mattresses: 1, features: ["disabled_access"], available: false }),
    ];
    const types = groupPublicTypes(rooms);
    const twin = types.find(t => !t.accessible);
    const access = types.find(t => t.accessible);
    assert.equal(types.length, 2);
    assert.equal(twin?.available, 1);
    assert.equal(access?.available, 0);
    assert.ok(!JSON.stringify(types).toLowerCase().includes("john"));
  });

  it("labels beds and features in house English", () => {
    assert.equal(bedsLine({ beds_single: 2, beds_king: 0, mattresses: 1 }), "2 single · 1 extra mattress");
    assert.equal(featureLabel("disabled_access"), "Accessible");
    assert.equal(typeName("KING"), "King room");
    assert.equal(nightsBetween("2026-09-03", "2026-09-06"), 3);
  });
});
