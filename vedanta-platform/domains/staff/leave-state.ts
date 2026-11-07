import { HOD_ROLES as ORGANOGRAM_HOD } from "./organogram.ts";

export const HOD_ROLES = ORGANOGRAM_HOD;
export const GM_ROLES = new Set(["GENERAL_MANAGER", "SYSTEM_OWNER"]);

export type LeaveStatus = "SUBMITTED" | "HOD_APPROVED" | "APPROVED" | "REJECTED" | "CANCELLED";
export type LeaveKind = "HOLIDAY" | "DAY_OFF" | "SICK" | "UNPAID";

export function leaveNeedsHodFirst(role: string): boolean {
  return !HOD_ROLES.has(role) && !GM_ROLES.has(role);
}

export function nextLeaveStatus(from: LeaveStatus, cmd: "approve" | "reject" | "cancel", actorRole: string, requesterRole: string): LeaveStatus | null {
  if (cmd === "cancel" && (from === "SUBMITTED" || from === "HOD_APPROVED" || from === "APPROVED")) return "CANCELLED";
  if (cmd === "reject" && (from === "SUBMITTED" || from === "HOD_APPROVED")) return "REJECTED";
  if (cmd !== "approve") return null;
  if (from === "SUBMITTED" && leaveNeedsHodFirst(requesterRole) && HOD_ROLES.has(actorRole)) return "HOD_APPROVED";
  if (from === "SUBMITTED" && !leaveNeedsHodFirst(requesterRole) && GM_ROLES.has(actorRole)) return "APPROVED";
  if (from === "HOD_APPROVED" && GM_ROLES.has(actorRole)) return "APPROVED";
  if (from === "SUBMITTED" && GM_ROLES.has(actorRole)) return "APPROVED"; // GM may sign both steps
  return null;
}
