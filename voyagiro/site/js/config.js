// VOYAGIRO AFFILIATE CONFIG — replace every YOUR_* placeholder after approval.
// Single contact constant (NOTE: voyagiro@mail.grokbot.com is NOT claimed yet). build.py reads it from here.
const VOYAGIRO_CONTACT_EMAIL = "voyagiro@mail.grokbot.com";
window.VOYAGIRO_CONFIG = {
  CONTACT_EMAIL: VOYAGIRO_CONTACT_EMAIL,
  GA4_ID: "G-XXXXXXXXXX", // GA4 measurement ID (optional)
  TP_MARKER: "799010", // Travelpayouts partner ID (marker) — confirmed in account menu 1 Nov 2026
  TP_TRS: "594268", // Travelpayouts project ID (from the Drive install code t=594268)
  // Travelpayouts program IDs (p=) per partner. A partner's deep links are wrapped as
  // tp.media/r?marker=..&trs=..&p=..&u=.. ONLY when listed here. Add a partner only AFTER its
  // program is joined in Travelpayouts: unjoined programs return "marker is not subscribed to campaign".
  // Documented by Travelpayouts: booking: 2076 (not joined as of 1 Nov 2026, so left off).
  TP_PROGRAMS: {},
  // Leave empty until a real endpoint exists. A placeholder URL must not receive inquiries.
  INQUIRY_ENDPOINT: "",
  // Optional HTTPS collector for privacy-safe ops events. Empty means sessionStorage only.
  OPS_ENDPOINT: "",
  ids: {
    kayak:"YOUR_KAYAK_ID",          // Kayak Affiliate Network – $500 min payout, 30-day cookie (also Momondo/Cheapflights/HotelsCombined)
    skyscanner:"YOUR_SKYSCANNER_ID",// Needs approval: ~5,000+ monthly visitors (via Impact)
    booking:"YOUR_BOOKING_AID",     // Booking.com Affiliate Partner (aid=)
    expedia:"YOUR_EXPEDIA_ID",      // Expedia Group Affiliate (also Hotels.com, Vrbo, Orbitz, Travelocity)
    agoda:"YOUR_AGODA_CID",         // Agoda Partners (cid=)
    trip:"YOUR_TRIP_ALLIANCEID",    // Trip.com Affiliate (Allianceid/SID)
    kiwi:"YOUR_KIWI_ID",            // Kiwi.com via Travelpayouts/Impact
    priceline:"YOUR_PRICELINE_ID", hotwire:"YOUR_HOTWIRE_ID", orbitz:"YOUR_ORBITZ_ID",
    travelocity:"YOUR_TRAVELOCITY_ID", cheapoair:"YOUR_CHEAPOAIR_ID", makemytrip:"YOUR_MMT_ID",
    airbnb:"YOUR_AIRBNB_ID", // Airbnb closed its public affiliate programme; link-out only
    vrbo:"YOUR_VRBO_ID", hotelscom:"YOUR_HOTELSCOM_ID", momondo:"YOUR_MOMONDO_ID",
    cheapflights:"YOUR_CHEAPFLIGHTS_ID", hostelworld:"YOUR_HOSTELWORLD_ID", edreams:"YOUR_EDREAMS_ID",
    opodo:"YOUR_OPODO_ID", lastminute:"YOUR_LASTMINUTE_ID", yatra:"YOUR_YATRA_ID",
    traveloka:"YOUR_TRAVELOKA_ID", rakuten:"YOUR_RAKUTEN_ID", ctrip:"YOUR_CTRIP_ID",
    google:"" // Google Flights/Hotels: no affiliate programme, plain link-out
  }
};
// AI chat endpoint (deploy api/chat.js to Vercel/Netlify/Cloudflare). Empty = FAQ-only mode.
window.VOYAGIRO_CONFIG.CHAT_API = "";
