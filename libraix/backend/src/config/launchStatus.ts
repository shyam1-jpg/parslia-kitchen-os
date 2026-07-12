/** Honest public availability for marketing and launch QA. */
export type LaunchStatus = "live" | "beta" | "coming_soon" | "disabled";

export const TOOL_LAUNCH_STATUS: Record<string, LaunchStatus> = {
  chat: "live",
  "web-search": "coming_soon",
  "pdf-chat": "coming_soon",
  youtube: "coming_soon",
  "link-analyser": "coming_soon",
  "image-gen": "coming_soon",
  voice: "disabled",
  "prompt-library": "coming_soon",
  assistants: "beta",
};

export const MODEL_LAUNCH_STATUS: Record<string, LaunchStatus> = {
  "libraix-fast": "live",
  "libraix-smart": "beta",
  "libraix-advanced": "beta",
  "libraix-image": "coming_soon",
};

export function withLaunchStatus<T extends { id: string }>(
  items: T[],
  statusMap: Record<string, LaunchStatus>
): (T & { launchStatus: LaunchStatus })[] {
  return items.map((item) => ({
    ...item,
    launchStatus: statusMap[item.id] ?? "coming_soon",
  }));
}

export function countLive(items: { launchStatus: LaunchStatus }[]): number {
  return items.filter((i) => i.launchStatus === "live" || i.launchStatus === "beta").length;
}
