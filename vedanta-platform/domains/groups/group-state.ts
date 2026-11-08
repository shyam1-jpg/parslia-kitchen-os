/** Group booking state machine. Mirrors the paperwork lifecycle seen in the live sheet. */
export type GroupStatus = "ENQUIRY" | "PROVISIONAL" | "CONFIRMED" | "IN_HOUSE" | "COMPLETED" | "CANCELLED";
export type GroupCommand = "hold" | "confirm" | "check_in" | "check_out" | "cancel";

const T: Record<GroupStatus, Partial<Record<GroupCommand, GroupStatus>>> = {
  ENQUIRY:     { hold: "PROVISIONAL", confirm: "CONFIRMED", cancel: "CANCELLED" },
  PROVISIONAL: { confirm: "CONFIRMED", cancel: "CANCELLED" },
  CONFIRMED:   { check_in: "IN_HOUSE", cancel: "CANCELLED" },
  IN_HOUSE:    { check_out: "COMPLETED" },
  COMPLETED: {}, CANCELLED: {},
};
export const REQUIRED_PERMISSION: Record<GroupCommand, string> = {
  hold: "reservation.create", confirm: "reservation.confirm", check_in: "reservation.checkin", check_out: "reservation.checkout", cancel: "reservation.cancel",
};
export function transitionGroup(from: GroupStatus, cmd: GroupCommand): GroupStatus {
  const to = T[from][cmd];
  if (!to) throw new Error(`Cannot '${cmd}' a group booking in state ${from}`);
  return to;
}
/** Confirming requires the booking form back and signed T&Cs. */
export function confirmBlockers(g: { booking_form_status: string | null; terms_signed: boolean }): string[] {
  const b: string[] = [];
  if (g.booking_form_status !== "COMPLETE") b.push("Booking form not complete");
  if (!g.terms_signed) b.push("Terms and conditions not signed");
  return b;
}
