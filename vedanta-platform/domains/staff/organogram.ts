/** The house organogram: departments, positions, and who signs holiday. */

export type HouseDepartment = {
  code: string;
  name: string;
  sort: number;
  notes?: string;
};

export type HousePosition = {
  code: string;
  name: string;
  department: string;
  /** Head of department: their holiday goes to the general manager only. */
  hod: boolean;
  sort: number;
};

export type SeatHolder = { name: string; email: string; role: string; department: string | null };

export const HOUSE_DEPARTMENTS: HouseDepartment[] = [
  { code: "MGMT", name: "Management", sort: 10 },
  { code: "FRONT", name: "Front of house", sort: 20, notes: "Tea and coffee is run from reception. The night porter locks the house and hands over to morning." },
  { code: "SALES", name: "Sales", sort: 25 },
  { code: "HK", name: "Housekeeping", sort: 30 },
  { code: "RESTAURANT", name: "Restaurant", sort: 40 },
  { code: "KITCHEN", name: "Kitchen", sort: 50 },
  { code: "GROUNDS", name: "Estate and grounds", sort: 60, notes: "Farming, gardens, tractor and the grounds." },
  { code: "MAINT", name: "Maintenance", sort: 70 },
  { code: "PROGRAMME", name: "Programmes and events", sort: 80 },
  { code: "PURCHASING", name: "Purchasing and stores", sort: 90 },
  { code: "FINANCE", name: "Finance and HR", sort: 100 },
];

export const HOUSE_POSITIONS: HousePosition[] = [
  { code: "SYSTEM_OWNER", name: "System", department: "MGMT", hod: false, sort: 10 },
  { code: "GENERAL_MANAGER", name: "General manager", department: "MGMT", hod: false, sort: 20 },
  { code: "OPERATIONS_MANAGER", name: "Operations manager", department: "MGMT", hod: true, sort: 30 },
  { code: "ROTA_MANAGER", name: "Rota manager", department: "MGMT", hod: false, sort: 40 },
  { code: "FRONT_OFFICE_MANAGER", name: "Front office manager", department: "FRONT", hod: true, sort: 10 },
  { code: "RETREAT_MANAGER", name: "Retreat manager", department: "FRONT", hod: true, sort: 20 },
  { code: "RECEPTIONIST", name: "Receptionist", department: "FRONT", hod: false, sort: 30 },
  { code: "NIGHT_PORTER", name: "Night porter", department: "FRONT", hod: false, sort: 40 },
  { code: "SALES_MANAGER", name: "Sales manager", department: "SALES", hod: true, sort: 10 },
  { code: "SALES_ASSISTANT", name: "Sales assistant", department: "SALES", hod: false, sort: 20 },
  { code: "HK_SUPERVISOR", name: "Housekeeping supervisor", department: "HK", hod: true, sort: 10 },
  { code: "HK_ATTENDANT", name: "Housekeeping", department: "HK", hod: false, sort: 20 },
  { code: "RESTAURANT_MANAGER", name: "Restaurant manager", department: "RESTAURANT", hod: true, sort: 10 },
  { code: "RESTAURANT_SUPERVISOR", name: "Restaurant supervisor", department: "RESTAURANT", hod: false, sort: 20 },
  { code: "RESTAURANT_STAFF", name: "Waiter / waitress", department: "RESTAURANT", hod: false, sort: 30 },
  { code: "HEAD_CHEF", name: "Head chef", department: "KITCHEN", hod: true, sort: 10 },
  { code: "KITCHEN_MANAGER", name: "Kitchen manager", department: "KITCHEN", hod: true, sort: 20 },
  { code: "SOUS_CHEF", name: "Sous chef", department: "KITCHEN", hod: false, sort: 30 },
  { code: "SENIOR_CHEF_DE_PARTIE", name: "Senior chef de partie", department: "KITCHEN", hod: false, sort: 40 },
  { code: "CHEF_DE_PARTIE", name: "Chef de partie", department: "KITCHEN", hod: false, sort: 50 },
  { code: "KITCHEN_APPRENTICE", name: "Apprentice", department: "KITCHEN", hod: false, sort: 60 },
  { code: "KITCHEN_ASSISTANT", name: "Kitchen assistant", department: "KITCHEN", hod: false, sort: 70 },
  { code: "KITCHEN_PORTER", name: "Kitchen porter", department: "KITCHEN", hod: false, sort: 80 },
  { code: "KITCHEN", name: "Kitchen team", department: "KITCHEN", hod: false, sort: 90 },
  { code: "ESTATE_MANAGER", name: "Estate manager", department: "GROUNDS", hod: true, sort: 10 },
  { code: "ESTATE_ASSISTANT", name: "Estate manager assistant", department: "GROUNDS", hod: false, sort: 20 },
  { code: "ESTATE_MGMT_ASSISTANT", name: "Estate management assistant", department: "GROUNDS", hod: false, sort: 30 },
  { code: "GROUNDS_MANAGER", name: "Grounds manager", department: "GROUNDS", hod: true, sort: 40 },
  { code: "GROUNDS_ASSISTANT", name: "Assistant ground staff", department: "GROUNDS", hod: false, sort: 50 },
  { code: "GROUNDS", name: "Ground staff", department: "GROUNDS", hod: false, sort: 60 },
  { code: "MAINTENANCE", name: "Maintenance", department: "MAINT", hod: true, sort: 10 },
  { code: "PROGRAMME", name: "Programmes", department: "PROGRAMME", hod: false, sort: 10 },
  { code: "PURCHASING", name: "Purchasing and stores", department: "PURCHASING", hod: false, sort: 10 },
  { code: "FINANCE_HR", name: "Finance and HR", department: "FINANCE", hod: false, sort: 10 },
];

export const ROLE_NAMES: Record<string, string> = Object.fromEntries(HOUSE_POSITIONS.map(p => [p.code, p.name]));

export const HOD_ROLES = new Set(HOUSE_POSITIONS.filter(p => p.hod).map(p => p.code));

export function buildOrganogram(people: SeatHolder[]) {
  const byRole = new Map<string, SeatHolder[]>();
  for (const p of people) {
    const list = byRole.get(p.role) ?? [];
    list.push(p);
    byRole.set(p.role, list);
  }
  const placed = new Set<string>();
  const departments = HOUSE_DEPARTMENTS
    .map(dept => {
      const seats = HOUSE_POSITIONS.filter(p => p.department === dept.code).map(pos => {
        const holders = (byRole.get(pos.code) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
        for (const h of holders) placed.add(h.email);
        return { code: pos.code, name: pos.name, hod: pos.hod, people: holders };
      });
      const filledSeats = seats.filter(s => s.people.length > 0);
      const filled = filledSeats.length > 0;
      return { code: dept.code, name: dept.name, notes: dept.notes, seats: filledSeats, filled };
    })
    .filter(d => d.filled);
  const unlisted = people.filter(p => !placed.has(p.email)).sort((a, b) => a.name.localeCompare(b.name));
  return { departments, unlisted };
}
