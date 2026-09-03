"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

const sections: { label: string; items: [string, string, string | null][] }[] = [
  { label: "The house", items: [["/house/", "Today", "group.read"], ["/groups/", "Bookings", "group.read"], ["/rooms/", "Room board", "group.read"]] },
  { label: "In service", items: [["/housekeeping/", "Housekeeping", "group.read"], ["/maintenance/", "Maintenance", "maintenance.read"], ["/kitchen/", "Kitchen", "covers.read"]] },
  { label: "People", items: [["/guests/", "Guests", "guest.read"], ["/staff-corner/", "Staff corner", "cover.read"], ["/users/", "Staff", "user.manage"]] },
  { label: "The estate", items: [["/review/", "Imported bookings", "group.update"], ["/reports/", "Reports", "report.read"], ["/settings/", "Settings", "package.manage"]] },
];
const ROLE_NAMES: Record<string, string> = {
  SYSTEM_OWNER: "System", GENERAL_MANAGER: "General manager", OPERATIONS_MANAGER: "Operations manager", ROTA_MANAGER: "Rota manager",
  FRONT_OFFICE_MANAGER: "Front office manager", RETREAT_MANAGER: "Retreat manager", RECEPTIONIST: "Reception",
  SALES_MANAGER: "Sales manager", SALES_ASSISTANT: "Sales assistant",
  HK_SUPERVISOR: "Housekeeping supervisor", HK_ATTENDANT: "Housekeeping",
  RESTAURANT_MANAGER: "Restaurant manager", RESTAURANT_SUPERVISOR: "Restaurant supervisor", RESTAURANT_STAFF: "Waiter / waitress",
  HEAD_CHEF: "Head chef", KITCHEN_MANAGER: "Kitchen manager", SOUS_CHEF: "Sous chef", SENIOR_CHEF_DE_PARTIE: "Senior chef de partie",
  CHEF_DE_PARTIE: "Chef de partie", KITCHEN_APPRENTICE: "Apprentice", KITCHEN_ASSISTANT: "Kitchen assistant", KITCHEN_PORTER: "Kitchen porter", KITCHEN: "Kitchen",
  ESTATE_MANAGER: "Estate manager", ESTATE_ASSISTANT: "Estate manager assistant", ESTATE_MGMT_ASSISTANT: "Estate management assistant",
  GROUNDS_MANAGER: "Grounds manager", GROUNDS_ASSISTANT: "Assistant ground staff", GROUNDS: "Ground staff",
  PROGRAMME: "Programmes", MAINTENANCE: "Maintenance", FINANCE_HR: "Finance & HR", PURCHASING: "Purchasing",
};

export default function Nav() {
  const p = usePathname(); const { user, can, signOut } = useStore();
  return (
    <nav className="nav">
      <div className="brand">The Vedanta Way<small>Retreat Center</small></div>
      {user && sections.map(sec => (
        <div key={sec.label}>
          <div className="nav-sec">{sec.label}</div>
          {sec.items.map(([href, label, perm], i) => {
            const off = perm && !can(perm);
            return <Link key={i} href={off ? "#" : href} className={p === href ? "active" : ""} aria-disabled={!!off} style={off ? { opacity: .35, pointerEvents: "none" } : undefined}>{label}</Link>;
          })}
        </div>
      ))}
      <div className="who">{user ? <>{user.name}<br />{user.role_name ?? ROLE_NAMES[user.role] ?? user.role}<br /><button className="linkbtn" onClick={signOut}>Sign out</button><span className="legacy">Held for generations</span></> : "Not signed in"}</div>
    </nav>
  );
}
