"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
const items: [string, string, string | null][] = [["/groups/", "Group bookings", "group.read"], ["/rooms/", "Room board", "group.read"], ["/kitchen/", "Kitchen covers", "covers.read"], ["/review/", "Imported bookings to check", "group.update"], ["/guests/", "Guests", "guest.read"], ["/housekeeping/", "Housekeeping", "group.read"], ["/maintenance/", "Maintenance", "maintenance.read"], ["/reports/", "Reports", "report.read"], ["/users/", "Staff access", "user.manage"], ["/settings/", "Settings", "package.manage"]];
const ROLE_NAMES: Record<string, string> = { SYSTEM_OWNER: "System owner", GENERAL_MANAGER: "General manager", FRONT_OFFICE_MANAGER: "Front office manager", RECEPTIONIST: "Reception", HK_SUPERVISOR: "Housekeeping", HK_ATTENDANT: "Housekeeping", HEAD_CHEF: "Head chef", KITCHEN: "Kitchen", PROGRAMME: "Programmes", MAINTENANCE: "Maintenance", FINANCE_HR: "Finance & HR", PURCHASING: "Purchasing", GROUNDS: "Grounds" };
export default function Nav() {
  const p = usePathname(); const { user, can, signOut } = useStore();
  return (
    <nav className="nav">
      <div className="brand">The Vedanta<small>Oway Retreat · admin</small></div>
      {user && items.map(([href, label, perm], i) => {
        const off = href === "#" || (perm && !can(perm));
        return <Link key={i} href={off ? "#" : href} className={p === href ? "active" : ""} aria-disabled={!!off} style={off ? { opacity: .4, pointerEvents: "none" } : undefined}>{label}</Link>;
      })}
      <div className="who">{user ? <>{user.name} · {ROLE_NAMES[user.role] ?? user.role}<br /><button className="linkbtn" onClick={signOut}>Sign out</button></> : "Not signed in"}</div>
    </nav>
  );
}
