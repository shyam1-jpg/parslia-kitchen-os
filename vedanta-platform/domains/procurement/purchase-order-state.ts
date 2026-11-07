/** Purchase order state machine — Appendix A. Approval matrix applied by the API layer. */
export type POStatus = "DRAFT"|"SUBMITTED"|"APPROVED"|"REJECTED"|"SENT"|"PART_RECEIVED"|"RECEIVED"|"CLOSED"|"CANCELLED";
export type POCommand = "submit"|"approve"|"reject"|"send"|"receive_partial"|"receive_all"|"close"|"cancel";

const T: Record<POStatus, Partial<Record<POCommand, POStatus>>> = {
  DRAFT:         { submit: "SUBMITTED", cancel: "CANCELLED" },
  SUBMITTED:     { approve: "APPROVED", reject: "REJECTED", cancel: "CANCELLED" },
  APPROVED:      { send: "SENT", cancel: "CANCELLED" },
  SENT:          { receive_partial: "PART_RECEIVED", receive_all: "RECEIVED", cancel: "CANCELLED" },
  PART_RECEIVED: { receive_partial: "PART_RECEIVED", receive_all: "RECEIVED" },
  RECEIVED:      { close: "CLOSED" },
  REJECTED: {}, CLOSED: {}, CANCELLED: {},
};

export function transitionPO(from: POStatus, cmd: POCommand): POStatus {
  const to = T[from][cmd];
  if (!to) throw new Error(`Cannot '${cmd}' a purchase order in state ${from}`);
  return to;
}

/** Separation of duties: the person who raised the PO may not approve it. */
export function canApprove(po: { raisedByUserId: string; total: number }, user: { id: string; approvalLimit: number | null }): boolean {
  if (user.id === po.raisedByUserId) return false;
  return user.approvalLimit !== null && po.total <= user.approvalLimit;
}
