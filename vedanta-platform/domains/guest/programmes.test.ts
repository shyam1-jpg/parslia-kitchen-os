import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanName, guestCopy, guestFacingProgrammeName, isPublicProgrammeName, nightsBetween, programmeKind, programmePublishState, publicProgrammeName } from "./programmes.ts";

describe("public programmes", () => {
  it("hides private booking holds and HOLDs", () => {
    assert.equal(isPublicProgrammeName("Paul booking"), false);
    assert.equal(isPublicProgrammeName("Rishika Shah booking"), false);
    assert.equal(isPublicProgrammeName("HOLD — kitchen"), false);
    assert.equal(isPublicProgrammeName("OPTION for Michelle Yoga"), false);
    assert.equal(isPublicProgrammeName("Hoffman - Graduate Programme"), true);
    assert.equal(isPublicProgrammeName("Michelle Yoga - DAY RETREAT"), true);
  });

  it("hides individual person names (GDPR)", () => {
    assert.equal(isPublicProgrammeName("Kirsty G"), false, "single surname initial");
    assert.equal(isPublicProgrammeName("Pete Blackaby"), false, "firstname surname");
    assert.equal(isPublicProgrammeName("Judy King"), false, "firstname surname");
    assert.equal(isPublicProgrammeName("Rishika Shah"), false, "firstname surname");
    assert.equal(isPublicProgrammeName("Henry Shukman"), false, "firstname surname");
    assert.equal(isPublicProgrammeName("Suzanne Guest"), false, "firstname surname");
    assert.equal(isPublicProgrammeName("Alexandra Beeley"), false, "firstname surname");
    assert.equal(isPublicProgrammeName("Tony Parson"), false, "firstname surname");
  });

  it("shows named public retreats and organisations", () => {
    assert.equal(isPublicProgrammeName("EYEBODY"), true, "single org word");
    assert.equal(isPublicProgrammeName("Kirtan Immersion with Jagannatha Das"), true, "has event word");
    assert.equal(isPublicProgrammeName("Think Gita"), true, "has Gita");
    assert.equal(isPublicProgrammeName("Dharma Initiative Hackathon"), true, "has event word");
    assert.equal(isPublicProgrammeName("Jhourney Inc"), true, "has Inc");
    assert.equal(isPublicProgrammeName("Michelle Yoga - DAY RETREAT"), true, "yoga + retreat");
    assert.equal(isPublicProgrammeName("Narcissistic Abuse Conference 2027 (Karrie)"), true, "has conference");
    assert.equal(isPublicProgrammeName("PS Mentorship"), true, "has mentorship");
    assert.equal(isPublicProgrammeName("Hoffman - Graduate Programme"), true, "has programme");
  });

  it("strips personal attribution from display name", () => {
    assert.equal(publicProgrammeName("Narcissistic Abuse Conference 2027 (Karrie)", "Residential retreat"), "Narcissistic Abuse Conference 2027");
    assert.equal(publicProgrammeName("SantoshaYoga (Andrea)", "Residential retreat"), "SantoshaYoga");
  });

  it("cleans sheet copy for guests", () => {
    assert.equal(cleanName("Alexandra Beeley\nSacha Michel"), "Alexandra Beeley Sacha Michel");
    assert.equal(guestCopy("EYEBODY\nCheck-in: Fri 18th at 4pm\nPAID\norganisers at 3pm"), "EYEBODY\nCheck-in: Fri 18th at 4pm");
  });

  it("labels kinds and nights", () => {
    assert.equal(programmeKind("day_retreat"), "Day retreat");
    assert.equal(programmeKind("residential"), "Residential retreat");
    assert.equal(nightsBetween("2026-10-23", "2026-10-25"), 2);
  });

  it("uses a staff public title when the house name is private", () => {
    assert.equal(guestFacingProgrammeName("Pete Blackaby", null, "Residential retreat"), null);
    assert.equal(guestFacingProgrammeName("Pete Blackaby", "Autumn Yoga Retreat", "Residential retreat"), "Autumn Yoga Retreat");
    assert.equal(guestFacingProgrammeName("Hoffman - Graduate Programme", null, "Residential retreat"), "Hoffman - Graduate Programme");
  });

  it("does not go live until held and given a public name", () => {
    const enquiry = programmePublishState({ name: "Pete Blackaby", publicTitle: "Autumn Yoga Retreat", status: "ENQUIRY", retreatType: "residential", openForGuests: true });
    assert.equal(enquiry.live, false);
    assert.ok(enquiry.blockers.some(b => /hold or confirm/i.test(b)));

    const privateName = programmePublishState({ name: "Pete Blackaby", publicTitle: "", status: "CONFIRMED", retreatType: "residential", openForGuests: true });
    assert.equal(privateName.live, false);
    assert.ok(privateName.blockers.some(b => /public title/i.test(b)));

    const live = programmePublishState({ name: "Hoffman - Graduate Programme", publicTitle: "", status: "CONFIRMED", retreatType: "residential", openForGuests: true });
    assert.equal(live.live, true);
    assert.equal(live.publicName, "Hoffman - Graduate Programme");

    const wedding = programmePublishState({ name: "House wedding", publicTitle: "Summer Wedding", status: "CONFIRMED", retreatType: "wedding", openForGuests: true });
    assert.equal(wedding.live, false);
  });
});
