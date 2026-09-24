/**
 * Room housekeeping state machine — Appendix A.
 * VACANT_DIRTY → CLEANING → VACANT_CLEAN → INSPECTED → OCCUPIED → (checkout) VACANT_DIRTY
 * Any state → OUT_OF_SERVICE / OUT_OF_ORDER → authorised safety check → prior valid state.
 */
export type RoomStatus =
  | "VACANT_DIRTY" | "CLEANING" | "VACANT_CLEAN" | "INSPECTED" | "OCCUPIED"
  | "OUT_OF_SERVICE" | "OUT_OF_ORDER";

export type RoomCommand =
  | "start_cleaning" | "finish_cleaning" | "pass_inspection" | "fail_inspection"
  | "occupy" | "vacate" | "set_out_of_service" | "set_out_of_order" | "restore";

const OOS: RoomStatus[] = ["OUT_OF_SERVICE", "OUT_OF_ORDER"];

export interface RoomState { status: RoomStatus; statusBeforeOos: RoomStatus | null; }

export function transitionRoom(state: RoomState, command: RoomCommand, opts?: { safetyCheckPassed?: boolean }): RoomState {
  const { status } = state;
  const fail = () => { throw new Error(`Cannot '${command}' a room in state ${status}`); };

  if (command === "set_out_of_service" || command === "set_out_of_order") {
    if (OOS.includes(status)) fail();
    return { status: command === "set_out_of_service" ? "OUT_OF_SERVICE" : "OUT_OF_ORDER", statusBeforeOos: status };
  }
  if (command === "restore") {
    if (!OOS.includes(status)) fail();
    if (!opts?.safetyCheckPassed) throw new Error("Restoring a room requires an authorised safety check");
    // A room coming back always needs cleaning before it can be sold again.
    return { status: "VACANT_DIRTY", statusBeforeOos: null };
  }
  if (OOS.includes(status)) fail();

  const next: Partial<Record<RoomStatus, Partial<Record<RoomCommand, RoomStatus>>>> = {
    VACANT_DIRTY: { start_cleaning: "CLEANING" },
    CLEANING:     { finish_cleaning: "VACANT_CLEAN" },
    VACANT_CLEAN: { pass_inspection: "INSPECTED", fail_inspection: "VACANT_DIRTY", occupy: "OCCUPIED" },
    INSPECTED:    { occupy: "OCCUPIED", fail_inspection: "VACANT_DIRTY" },
    OCCUPIED:     { vacate: "VACANT_DIRTY" },
  };
  const to = next[status]?.[command];
  if (!to) fail();
  return { status: to!, statusBeforeOos: null };
}
