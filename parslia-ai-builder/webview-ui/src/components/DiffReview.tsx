import { useMemo, useState } from "react";
import * as Diff from "diff";
import type { ProposedChanges } from "../types";

export function DiffReview({
  proposal,
  onApprove,
  onReject,
  disabled
}: {
  proposal: ProposedChanges;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  const [active, setActive] = useState(0);
  const change = proposal.changes[active];

  const hunks = useMemo(() => {
    if (!change) return [];
    if (change.op === "delete") {
      return Diff.diffLines(change.before || "", "");
    }
    if (change.op === "create") {
      return Diff.diffLines("", change.after || "");
    }
    return Diff.diffLines(change.before || "", change.after || "");
  }, [change]);

  if (!change) return null;

  return (
    <section className="diff-review">
      <header>
        <h2>Review changes</h2>
        <p>{proposal.summary}</p>
      </header>
      <div className="file-tabs">
        {proposal.changes.map((c, i) => (
          <button
            key={`${c.path}-${i}`}
            type="button"
            className={i === active ? "active" : ""}
            onClick={() => setActive(i)}
          >
            <em>{c.op}</em> {c.path}
          </button>
        ))}
      </div>
      {change.reason && <p className="reason">{change.reason}</p>}
      <pre className="diff-body">
        {hunks.map((part, idx) => (
          <span
            key={idx}
            className={part.added ? "add" : part.removed ? "del" : "ctx"}
          >
            {(part.value || "")
              .split("\n")
              .filter((line, i, arr) => !(i === arr.length - 1 && line === ""))
              .map((line, i) => (
                <span key={i} className="line">
                  {part.added ? "+" : part.removed ? "-" : " "}
                  {line}
                  {"\n"}
                </span>
              ))}
          </span>
        ))}
      </pre>
      <div className="diff-actions">
        <button type="button" onClick={onReject} disabled={disabled}>
          Reject
        </button>
        <button type="button" className="primary" onClick={onApprove} disabled={disabled}>
          Approve & apply ({proposal.changes.length})
        </button>
      </div>
    </section>
  );
}
