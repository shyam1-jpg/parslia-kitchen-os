/**
 * Reservation state machine — Appendix A of the Master Specification.
 * Pure logic: no database, no framework. The API layer calls `transition`
 * inside a transaction, bumps `version`, and writes an audit_event.
 */
export type ReservationStatus =
  | "ENQUIRY" | "OPTION" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";

export type ReservationCommand =
  | "hold" | "confirm" | "check_in" | "check_out" | "cancel" | "mark_no_show" | "expire_option";

const TRANSITIONS: Record<ReservationStatus, Partial<Record<ReservationCommand, ReservationStatus>>> = {
  ENQUIRY:     { hold: "OPTION", confirm: "CONFIRMED", cancel: "CANCELLED" },
  OPTION:      { confirm: "CONFIRMED", cancel: "CANCELLED", expire_option: "CANCELLED" },
  CONFIRMED:   { check_in: "CHECKED_IN", cancel: "CANCELLED", mark_no_show: "NO_SHOW" },
  CHECKED_IN:  { check_out: "CHECKED_OUT" },
  CHECKED_OUT: {},
  CANCELLED:   {},
  NO_SHOW:     {},
};

/** Commands that release room-type inventory exactly once (§24). */
export const RELEASES_INVENTORY: ReadonlySet<ReservationCommand> =
  new Set(["cancel", "expire_option", "mark_no_show"]);

export const REQUIRED_PERMISSION: Record<ReservationCommand, string> = {
  hold: "reservation.create",
  confirm: "reservation.confirm",
  check_in: "reservation.checkin",
  check_out: "reservation.checkout",
  cancel: "reservation.cancel",
  mark_no_show: "reservation.cancel",
  expire_option: "reservation.cancel",
};

export class InvalidTransition extends Error {
  readonly from: ReservationStatus;
  readonly command: ReservationCommand;
  constructor(from: ReservationStatus, command: ReservationCommand) {
    super(`Cannot '${command}' a reservation in state ${from}`);
    this.from = from;
    this.command = command;
  }
}

export function transition(from: ReservationStatus, command: ReservationCommand): ReservationStatus {
  const to = TRANSITIONS[from][command];
  if (!to) throw new InvalidTransition(from, command);
  return to;
}

export function allowedCommands(from: ReservationStatus): ReservationCommand[] {
  return Object.keys(TRANSITIONS[from]) as ReservationCommand[];
}
