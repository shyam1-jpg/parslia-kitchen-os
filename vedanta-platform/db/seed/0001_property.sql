-- Seed: Vedanta Oway Retreat property facts (from config/property.yaml)
-- 45 rooms, restaurant 150 seats / 130 covers, 25 staff, roles and permissions.

DO $$
DECLARE
  t uuid; p uuid;
BEGIN
  -- Fixed ids so data dumps and imports are portable between databases.
  INSERT INTO tenant (id, name, country, currency, timezone)
  VALUES ('dbe8f12b-5577-472e-bd6e-5d749962aade', 'Vedanta Oway Retreat', 'GB', 'GBP', 'Europe/London') RETURNING id INTO t;

  INSERT INTO property (id, tenant_id, code, name, settings)
  VALUES ('0e663f34-d4ce-4f40-899c-11f1866047fd', t, 'VOR', 'Vedanta Oway Retreat',
    '{"rooms_total":42,"guest_rooms":41,"staff_headcount":25,"legal_entity":"The Vedanta Way Ltd","website":"https://www.thevedanta.org/","kicker":"Retreat Center","tagline":"Luxury retreat centre","about":"A beautiful grade II-listed luxury retreat centre. Nestled amongst 75 acres of woodlands, meadows and lakes in Lincolnshire — a Grade II listed Elizabethan estate.","address":"Lincoln Rd, Branston, Lincolnshire, LN4 1PD"}') RETURNING id INTO p;

  -- Departments
  INSERT INTO department (tenant_id, property_id, code, name) VALUES
    (t,p,'FRONT','Front office'), (t,p,'HK','Housekeeping'), (t,p,'KITCHEN','Kitchen'),
    (t,p,'RESTAURANT','Restaurant'), (t,p,'MAINT','Maintenance'), (t,p,'GROUNDS','Grounds and gardens'),
    (t,p,'PROGRAMME','Programmes and events'), (t,p,'PURCHASING','Purchasing and stores'),
    (t,p,'FINANCE','Finance and HR'), (t,p,'MGMT','Management');

  -- Restaurant as a bookable space
  INSERT INTO space (tenant_id, property_id, code, name, kind, seats, max_covers)
  VALUES (t, p, 'MDR', 'Main Dining Room', 'RESTAURANT', 150, 130);

  -- Room types derived from bed configuration in the live Room Sheet
  INSERT INTO room_type (tenant_id, property_id, code, name, max_occupancy) VALUES (t,p,'SINGLE','Single room',1);
  INSERT INTO room_type (tenant_id, property_id, code, name, max_occupancy) VALUES (t,p,'TWIN','Twin room',2);
  INSERT INTO room_type (tenant_id, property_id, code, name, max_occupancy) VALUES (t,p,'TRIPLE','Triple room',3);
  INSERT INTO room_type (tenant_id, property_id, code, name, max_occupancy) VALUES (t,p,'DOUBLE','Double room',2);
  INSERT INTO room_type (tenant_id, property_id, code, name, max_occupancy) VALUES (t,p,'KING','King room (bridal suites)',2);
  -- 42 rooms exactly as listed on the 2026 Room Sheet (rooms 301-307 present in 2024/25 sheets are NOT included - confirm)
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'G01','Ground Floor',2,0,0,1,3,'{lake_view}','lake view',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'G02','Ground Floor',0,1,0,0,2,'{lake_view,hairdryer}','lake view, hairdryer in the room',false FROM room_type WHERE property_id=p AND code='DOUBLE';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'G03','Ground Floor',2,0,0,1,3,'{disabled_access}','disabled access',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'101','Pink Corridor',2,0,0,0,2,'{lake_view,shower}','shower, lake view',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'102','Pink Corridor',2,0,0,0,2,'{lake_view,hairdryer}','lake view (small room), hairdryer in the room',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'104','Pink Corridor',2,0,0,0,2,'{}','staff room (Nitesh)',true FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'105','Pink Corridor',2,0,0,1,3,'{pool_roof_view}','pool roof view',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'106','Pink Corridor',0,0,1,1,3,'{courtyard_view}','courtyard view',false FROM room_type WHERE property_id=p AND code='KING';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'107','Pink Corridor',3,0,0,0,3,'{courtyard_view}','courtyard view',false FROM room_type WHERE property_id=p AND code='TRIPLE';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'108','Pink Corridor',2,0,0,0,2,'{hairdryer,cool_room}','cool room, hairdryer in the room',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'109','Pink Corridor',2,0,0,1,3,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'110','Pink Corridor',2,0,0,1,3,'{shower}','shower',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'111','Pink Corridor',2,0,0,0,2,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'112','Pink Corridor',3,0,0,0,3,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TRIPLE';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'113','First Floor',0,1,0,1,3,'{cool_room}','cool room',false FROM room_type WHERE property_id=p AND code='DOUBLE';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'114','First Floor',0,1,0,1,3,'{desk}','desk',false FROM room_type WHERE property_id=p AND code='DOUBLE';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'115','First Floor',2,0,0,0,2,'{}','small room',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'116','First Floor',3,0,0,1,4,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TRIPLE';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'117','First Floor',2,0,0,1,3,'{kitchen_roof_view}','kitchen roof view',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'118','First Floor',2,0,0,1,3,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'119','First Floor',1,0,1,1,4,'{lake_view,hairdryer,desk,bridal_suite}','bridal suite, desk, lake view, hairdryer in the room',false FROM room_type WHERE property_id=p AND code='KING';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'120','First Floor',1,0,1,1,4,'{lake_view,desk,bridal_suite}','bridal suite, desk, lake view',false FROM room_type WHERE property_id=p AND code='KING';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'121','First Floor',1,0,1,1,4,'{lake_view,desk,bridal_suite}','bridal suite, desk, lake view',false FROM room_type WHERE property_id=p AND code='KING';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'122','First Floor',3,0,0,1,4,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TRIPLE';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'201','Green Corridor',2,0,0,0,2,'{lake_view}','lake view, small room',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'202','Green Corridor',2,0,0,0,2,'{lake_view,hairdryer}','lake view, small room, hairdryer in the room',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'203','Green Corridor',2,0,0,0,2,'{lake_view}','lake view',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'204','Green Corridor',2,0,0,1,3,'{lake_view}','lake view',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'205','Green Corridor',2,0,0,1,3,'{courtyard_view}','courtyard view',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'206','Green Corridor',2,0,0,1,3,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'207','Green Corridor',0,0,1,1,3,'{}',NULL,false FROM room_type WHERE property_id=p AND code='KING';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'208','Green Corridor',2,0,0,1,3,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'209','Second Floor',2,0,0,0,2,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'210','Second Floor',2,0,0,1,3,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'211','Second Floor',2,0,0,1,3,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'212','Second Floor',2,0,0,2,4,'{cool_room}','cool room',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'213','Second Floor',2,0,0,1,3,'{cool_room}','cool room',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'214','Second Floor',2,0,0,0,2,'{cool_room}','cool room',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'215','Second Floor',2,0,0,2,4,'{lake_view,desk}','lake view, desk',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'216','Second Floor',2,0,0,2,4,'{lake_view}','lake view',false FROM room_type WHERE property_id=p AND code='TWIN';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'217','Second Floor',0,0,1,1,3,'{lake_view}','lake view',false FROM room_type WHERE property_id=p AND code='KING';
  INSERT INTO room (tenant_id, property_id, room_type_id, number, section, beds_single, beds_double, beds_king, mattresses, max_capacity, features, notes, staff_only)
    SELECT t,p,id,'218','Second Floor',3,0,0,1,4,'{}',NULL,false FROM room_type WHERE property_id=p AND code='TRIPLE';

  -- Rate plans (placeholder prices; confirm in discovery)
  INSERT INTO rate_plan (tenant_id, property_id, code, name, currency, nightly_amount, board) VALUES
    (t,p,'STANDARD','Standard package','GBP',0,'FULL'),
    (t,p,'STANDARD_SPA','Standard package with spa access','GBP',0,'FULL'),
    (t,p,'PREMIUM','Premium package','GBP',0,'FULL'),
    (t,p,'DAY_RETREAT','Day retreat (per person)','GBP',0,'ROOM_ONLY');
  -- nightly_amount is 0 because pricing is agreed per group, per person; see booking_group.price_notes

  -- Permissions
  INSERT INTO permission (code, description) VALUES
    ('reservation.read','View reservations'),
    ('reservation.create','Create enquiries, options and bookings'),
    ('reservation.confirm','Confirm a reservation'),
    ('reservation.cancel','Cancel a reservation'),
    ('reservation.checkin','Check a guest in'),
    ('reservation.checkout','Check a guest out'),
    ('room.assign','Assign a physical room'),
    ('room.status.update','Change housekeeping room status'),
    ('room.oos.set','Place a room out of service/order and restore it'),
    ('guest.read','View guest profiles'),
    ('guest.write','Edit guest profiles'),
    ('diet.read','View dietary and allergen declarations'),
    ('diet.write','Record dietary and allergen declarations'),
    ('refund.create','Issue a refund within approval limit'),
    ('user.manage','Invite, suspend and assign roles to users'),
    ('audit.read','Read the audit log'),
    ('config.manage','Change property configuration');

  -- Roles (one per persona in spec §2)
  INSERT INTO role (tenant_id, code, name, approval_limit) VALUES
    (t,'SYSTEM_OWNER','System owner',NULL),
    (t,'GENERAL_MANAGER','General manager',5000.00),
    (t,'FRONT_OFFICE_MANAGER','Front office manager',500.00),
    (t,'RECEPTIONIST','Receptionist',NULL),
    (t,'HK_SUPERVISOR','Housekeeping supervisor',NULL),
    (t,'HK_ATTENDANT','Housekeeping attendant',NULL),
    (t,'HEAD_CHEF','Head chef',NULL),
    (t,'KITCHEN','Kitchen team',NULL),
    (t,'PURCHASING','Purchasing and stores',NULL),
    (t,'MAINTENANCE','Maintenance',NULL),
    (t,'GROUNDS','Grounds and gardens',NULL),
    (t,'PROGRAMME','Programme and events',NULL),
    (t,'FINANCE_HR','Finance and HR',NULL);

  INSERT INTO role_permission (role_id, permission_code)
  SELECT r.id, pm.code FROM role r CROSS JOIN permission pm
  WHERE r.tenant_id = t AND (
    r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER')
    OR (r.code='FRONT_OFFICE_MANAGER' AND pm.code NOT IN ('user.manage','config.manage'))
    OR (r.code='RECEPTIONIST' AND pm.code IN ('reservation.read','reservation.create','reservation.confirm','reservation.checkin','reservation.checkout','room.assign','guest.read','guest.write','diet.read','diet.write'))
    OR (r.code IN ('HK_SUPERVISOR') AND pm.code IN ('room.status.update','room.oos.set','reservation.read'))
    OR (r.code IN ('HK_ATTENDANT') AND pm.code IN ('room.status.update'))
    OR (r.code IN ('HEAD_CHEF','KITCHEN') AND pm.code IN ('diet.read','reservation.read'))
    OR (r.code='MAINTENANCE' AND pm.code IN ('room.oos.set','reservation.read'))
    OR (r.code='PROGRAMME' AND pm.code IN ('reservation.read','guest.read','diet.read'))
    OR (r.code='FINANCE_HR' AND pm.code IN ('reservation.read','audit.read','refund.create'))
  );
END $$;
