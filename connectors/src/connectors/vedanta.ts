/**
 * Public defaults for Vedanta OS. No API key and no retreat-specific data.
 * The read path is a real authenticated route on vedanta-api; the JSON shape
 * was not published, so subscribers can change the path and field mapping.
 */
export const VEDANTA_SYSTEM_ID = "vedanta-os";

export const vedantaUnverified = [
  "Legacy mock preset only: available Vedanta source documents raw X-Api-Key and /integrations/kitchen/feed with vedanta.kitchen-feed/1. This preset does not parse that nested feed. See docs/hercules-convex-integration.md; production deployment remains unverified.",
  "GET /v1/covers on https://vedanta-api.onrender.com is a registered route and requires authentication. An invalid bearer token and an invalid X-Api-Key both returned the same unauthenticated error, so the header may need changing.",
  "The JSON shape is not published. The default mapping assumes items[].id, date, expected_guests, dietary_notes, service, and name.",
  "Keys are created in Vedanta OS at Settings → Connected systems, with scope kitchen.read, and are shown once.",
] as const;

export const vedantaSettings: Record<string, unknown> = {
  baseUrl: "https://vedanta-api.onrender.com",
  endpointPath: "/v1/covers",
  dateQueryParam: "date",
  timeoutMs: 8000,
  retry: { maxAttempts: 3, baseDelayMs: 200 },
  auth: { mode: "api_key", headerName: "Authorization", scheme: "bearer" },
  fieldMapping: {
    items: "items",
    externalId: "id",
    date: "date",
    covers: "expected_guests",
    dietary: "dietary_notes",
    service: "service",
    label: "name",
    dietaryLabel: "label",
    dietaryCount: "count",
  },
};

export const vedantaSetupHelp =
  "In Vedanta OS, open Settings → Connected systems. Create a key with scope kitchen.read. The key is shown once; paste it here and it is stored only for this company. The default read path is /v1/covers. That route exists and requires authentication, but its JSON shape was not published — change the path and field mapping if a test read does not line up. If the status says the credential was rejected, switch the header to a raw X-Api-Key.";

