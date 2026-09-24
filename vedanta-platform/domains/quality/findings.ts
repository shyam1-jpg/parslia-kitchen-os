/** Data-quality classifications. Never invent missing rooms, dates or prices. */

export const QUALITY_STATUSES = ["VERIFIED", "NEEDS_REVIEW", "SOURCE_CONFLICT", "MISSING"] as const;
export type QualityStatus = (typeof QUALITY_STATUSES)[number];

export const QUALITY_CODES = [
  "ROOM_COUNT",
  "ROOMS_301_307",
  "UNLINKED_PLACEMENTS",
  "ASSUMED_DEPARTURES",
  "SKIPPED_IMPORT_ROWS",
  "PACKAGE_PRICES",
] as const;
export type QualityCode = (typeof QUALITY_CODES)[number];

export const SHEET_ONLY_ROOM_NUMBERS = ["301", "302", "303", "304", "305", "306", "307"] as const;
export const CONFIGURED_ROOM_TOTAL = 45;
/** Documented skip counts disagree. Do not pick a number. */
export const DOCUMENTED_SKIPPED_PROGRESS_MD = 65;
export const DOCUMENTED_SKIPPED_DRY_RUN = 6;

export type QualityFinding = {
  code: QualityCode;
  title: string;
  detail: string;
  computed_status: QualityStatus;
  house_status: QualityStatus | null;
  status: QualityStatus;
  note: string;
  decided_by: string | null;
  decided_at: string | null;
  evidence: Record<string, unknown>;
  lines: string[];
  links: { href: string; label: string }[];
};

export type QualityOverlay = { code: string; status: QualityStatus; note: string; decided_by: string | null; decided_at: string | null };

export function resolveStatus(computed: QualityStatus, overlay?: QualityOverlay | null): QualityStatus {
  return overlay?.status ?? computed;
}

export function buildQualityItems(input: {
  configured: number;
  actual: number;
  guest: number;
  staff: number;
  numbers: string[];
  assumedDepartures: number;
  unlinkedPlacements: number;
  skippedProgressMd: number;
  skippedDryRun: number;
  packageCount: number;
  overlays?: QualityOverlay[];
}): QualityFinding[] {
  const byCode = new Map((input.overlays ?? []).map(o => [o.code, o]));
  const missingSheet = SHEET_ONLY_ROOM_NUMBERS.filter(n => !input.numbers.includes(n));
  const rows: Array<{
    code: QualityCode;
    title: string;
    detail: string;
    computed: QualityStatus;
    evidence: Record<string, unknown>;
    links: { href: string; label: string }[];
  }> = [
    {
      code: "ROOM_COUNT",
      title: "Configured rooms versus imported inventory",
      detail: "Property config states 45 rooms. The live inventory has 42 (41 guest + 1 staff). Do not invent the missing three.",
      computed: classifyRoomCount({ configured: input.configured, actual: input.actual, guest: input.guest, staff: input.staff }),
      evidence: { configured: input.configured, actual: input.actual, guest: input.guest, staff: input.staff },
      links: [{ href: "/rooms/", label: "Room board" }],
    },
    {
      code: "ROOMS_301_307",
      title: "Rooms 301–307",
      detail: "These numbers appear on 2024/25 sheets and are not in the 2026 inventory. They stay missing until the house confirms they exist.",
      computed: classifyMissingRooms(input.numbers),
      evidence: { sheet_only: [...SHEET_ONLY_ROOM_NUMBERS], missing: missingSheet, present: SHEET_ONLY_ROOM_NUMBERS.filter(n => input.numbers.includes(n)) },
      links: [{ href: "/rooms/", label: "Room board" }],
    },
    {
      code: "UNLINKED_PLACEMENTS",
      title: "Unlinked room-sheet placements",
      detail: "Occupancy half-days with no booking_group. Staff link them from the room board. Source text is preserved.",
      computed: classifyCount(input.unlinkedPlacements),
      evidence: { unlinked: input.unlinkedPlacements },
      links: [{ href: "/rooms/", label: "Room board" }],
    },
    {
      code: "ASSUMED_DEPARTURES",
      title: "Imported bookings with assumed departures",
      detail: "The sheet did not say when these groups leave, so import assumed two nights. Use Imported bookings to set the real date. Do not invent dates here.",
      computed: classifyCount(input.assumedDepartures),
      evidence: { assumed_departures: input.assumedDepartures },
      links: [{ href: "/review/", label: "Imported bookings" }],
    },
    {
      code: "SKIPPED_IMPORT_ROWS",
      title: "Skipped import rows",
      detail: "PROGRESS.md records 65 skipped rows. The dry-run note records 6 attention rows. Both figures stay on the record until the original import log is re-run.",
      computed: classifyDocumentedCounts(input.skippedProgressMd, input.skippedDryRun),
      evidence: { progress_md: input.skippedProgressMd, dry_run_doc: input.skippedDryRun },
      links: [{ href: "/review/", label: "Imported bookings" }],
    },
    {
      code: "PACKAGE_PRICES",
      title: "Package / example prices",
      detail: "Seed packages carry example 2025/26 prices. Confirm the live price list. This screen will not invent a figure.",
      computed: input.packageCount > 0 ? "NEEDS_REVIEW" : "MISSING",
      evidence: { package_count: input.packageCount },
      links: [{ href: "/settings/", label: "Settings" }],
    },
  ];
  return rows.map(r => {
    const overlay = byCode.get(r.code) ?? null;
    return {
      code: r.code,
      title: r.title,
      detail: r.detail,
      computed_status: r.computed,
      house_status: overlay?.status ?? null,
      status: resolveStatus(r.computed, overlay),
      note: overlay?.note ?? "",
      decided_by: overlay?.decided_by ?? null,
      decided_at: overlay?.decided_at ?? null,
      evidence: r.evidence,
      lines: evidenceLines(r.code, r.evidence),
      links: r.links,
    };
  });
}

export function classifyRoomCount(input: { configured: number; actual: number; guest: number; staff: number }): QualityStatus {
  if (input.actual === input.configured) return "VERIFIED";
  if (input.actual > 0 && input.configured > 0 && input.actual !== input.configured) return "SOURCE_CONFLICT";
  return "MISSING";
}

export function classifyMissingRooms(inventoryNumbers: string[], sheetOnly: readonly string[] = SHEET_ONLY_ROOM_NUMBERS): QualityStatus {
  const have = new Set(inventoryNumbers);
  const missing = sheetOnly.filter(n => !have.has(n));
  if (missing.length === 0) return "VERIFIED";
  return "MISSING";
}

export function classifyCount(n: number): QualityStatus {
  if (n <= 0) return "VERIFIED";
  return "NEEDS_REVIEW";
}

export function classifyDocumentedCounts(a: number, b: number): QualityStatus {
  if (a === b && a === 0) return "VERIFIED";
  if (a === b) return "NEEDS_REVIEW";
  return "SOURCE_CONFLICT";
}

export function isQualityStatus(v: unknown): v is QualityStatus {
  return typeof v === "string" && (QUALITY_STATUSES as readonly string[]).includes(v);
}

export function parseQualityStatus(v: unknown): QualityStatus | null {
  const raw = String(v ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  return isQualityStatus(raw) ? raw : null;
}

export function qualityLabel(status: string): string {
  if (status === "VERIFIED") return "Verified";
  if (status === "NEEDS_REVIEW") return "Needs review";
  if (status === "SOURCE_CONFLICT") return "Source conflict";
  if (status === "MISSING") return "Missing";
  return status;
}

export function evidenceLines(code: QualityCode, evidence: Record<string, unknown>): string[] {
  if (code === "ROOM_COUNT") {
    return [
      `Configured: ${evidence.configured ?? "—"}`,
      `Imported: ${evidence.actual ?? "—"} (${evidence.guest ?? "—"} guest, ${evidence.staff ?? "—"} staff)`,
    ];
  }
  if (code === "ROOMS_301_307") {
    const missing = Array.isArray(evidence.missing) ? evidence.missing.map(String) : [];
    const present = Array.isArray(evidence.present) ? evidence.present.map(String) : [];
    return [
      `On 2024/25 sheets, not invented here: ${(Array.isArray(evidence.sheet_only) ? evidence.sheet_only : SHEET_ONLY_ROOM_NUMBERS).join(", ")}`,
      missing.length ? `Still missing from inventory: ${missing.join(", ")}` : "All sheet rooms are now in inventory",
      present.length ? `Now in inventory: ${present.join(", ")}` : "None of 301–307 are in the 2026 inventory",
    ];
  }
  if (code === "UNLINKED_PLACEMENTS") return [`Unlinked half-days: ${evidence.unlinked ?? 0}`];
  if (code === "ASSUMED_DEPARTURES") return [`Bookings still on Imported bookings: ${evidence.assumed_departures ?? 0}`];
  if (code === "SKIPPED_IMPORT_ROWS") {
    return [
      `PROGRESS.md recorded: ${evidence.progress_md ?? "—"} skipped rows`,
      `Dry-run note recorded: ${evidence.dry_run_doc ?? "—"} attention rows`,
      "Both figures stay until the original import log is re-run. This screen will not pick one.",
    ];
  }
  if (code === "PACKAGE_PRICES") return [`Packages on file: ${evidence.package_count ?? 0}. Prices stay example until the house confirms the list.`];
  return Object.entries(evidence).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
}
