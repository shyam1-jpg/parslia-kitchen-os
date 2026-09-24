"use client";

export type OrgSeat = { code: string; name: string; hod: boolean; people: { name: string; email: string }[] };
export type OrgDept = { code: string; name: string; notes?: string; seats: OrgSeat[] };
export type Organogram = { departments: OrgDept[]; unlisted: { name: string; email: string; role: string }[] };

export default function OrganogramView({ org }: { org: Organogram }) {
  return (
    <div className="org-grid">
      {org.departments.map(d => (
        <section className="house-panel" key={d.code}>
          <div className="k">{d.name}</div>
          {d.notes && <p className="m" style={{ color: "var(--ink-2)", marginBottom: 8 }}>{d.notes}</p>}
          <ul className="house-list">
            {d.seats.map(s => (
              <li key={s.code}>
                <span>
                  {s.people.map(p => <div className="t" key={p.email}>{p.name}</div>)}
                  <div className="m">{s.name}</div>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {org.unlisted.length > 0 && (
        <section className="house-panel">
          <div className="k">Also on the books</div>
          <h2>Other seats</h2>
          <ul className="house-list">
            {org.unlisted.map(p => (
              <li key={p.email}><span><div className="t">{p.name}</div><div className="m">{p.role.replace(/_/g, " ").toLowerCase()}</div></span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
