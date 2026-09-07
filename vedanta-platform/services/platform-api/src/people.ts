/** When a name is corrected, carry it onto the board, guest book and private stays. */
import type { Q } from "./db.ts";

export async function moveNameAcrossHouse(
  c: Q,
  opts: { propertyId: string; oldName: string; newName: string; email?: string | null },
): Promise<{ occupancy: number; guest_accounts: number; enquiries: number; bookings: number }> {
  const oldName = opts.oldName.trim();
  const newName = opts.newName.trim();
  if (!oldName || !newName || oldName === newName) {
    return { occupancy: 0, guest_accounts: 0, enquiries: 0, bookings: 0 };
  }
  const occ = await c.query(
    `update room_occupancy o set occupant_label=$2
     from room r where r.id=o.room_id and r.property_id=$3 and o.occupant_label=$1`,
    [oldName, newName, opts.propertyId],
  );
  let guest_accounts = 0, enquiries = 0, bookings = 0;
  if (opts.email) {
    const email = opts.email.trim().toLowerCase();
    guest_accounts = (await c.query(
      `update guest_account set display_name=$2 where property_id=$1 and lower(email)=$3`,
      [opts.propertyId, newName, email],
    )).rowCount ?? 0;
    enquiries = (await c.query(
      `update guest_enquiry set name=$2 where property_id=$1 and lower(email)=$3`,
      [opts.propertyId, newName, email],
    )).rowCount ?? 0;
    bookings = (await c.query(
      `update booking_group set name=$2, organisation=case when organisation=$3 then $2 else organisation end
       where property_id=$1 and lower(contact_email)=$4 and source='GUEST_BOOK'`,
      [opts.propertyId, newName, oldName, email],
    )).rowCount ?? 0;
  }
  return {
    occupancy: occ.rowCount ?? 0,
    guest_accounts,
    enquiries,
    bookings,
  };
}
