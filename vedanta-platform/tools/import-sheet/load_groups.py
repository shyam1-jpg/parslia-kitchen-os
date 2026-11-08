#!/usr/bin/env python3
"""
Second stage of the sheet import: turn groups.json (from import_calendar.py) into
booking_group rows. Writes SQL that is safe to re-run: every row is keyed on
external_ref = '<year>:<row>' so re-imports update rather than duplicate.

Usage: python3 load_groups.py <groups.json> <out.sql>
"""
import sys, json, re, datetime as dt

MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"]

def num(s):
    """'32 + 5' -> 37, 'approximately 65' -> 65, '15-20' -> 20, 'ALL' -> None (handled by caller)."""
    if s is None: return None
    s = str(s).lower()
    if "all" in s: return "ALL"
    parts = [int(float(x)) for x in re.findall(r"\d+(?:\.\d+)?", s)]
    if not parts: return None
    if "+" in s: return sum(parts)
    return max(parts)

def rooms_count(s):
    v = num(s)
    if v == "ALL": return 41
    if isinstance(v, int) and v > 41 and s and re.search(r"single|twin", str(s), re.I): return sum(int(x) for x in re.findall(r"(\d+)\s*(?:single|twin|double)", str(s), re.I))
    return v

def departure(g):
    """Find 'Check out: Sun 11th at 2pm' style text and turn it into a date after arrival."""
    if not g["date"]: return None, None
    arr = dt.date.fromisoformat(g["date"]); t = g.get("trip_text") or ""
    m = re.search(r"ch[ec]+k-?\s*out[^\d\n]*?(\d{1,2})(?:st|nd|rd|th)?(?:\s+(" + "|".join(MONTHS) + r"))?", t, re.I)
    if not m:
        if g.get("retreat_type") in ("day_retreat", "venue_hire"): return arr, "PM"
        return None, None
    day = int(m.group(1)); month = arr.month; year = arr.year
    if m.group(2): month = MONTHS.index(m.group(2).lower()) + 1
    elif day < arr.day: month += 1
    if month > 12: month = 1; year += 1
    try: dep = dt.date(year, month, day)
    except ValueError: return None, None
    if dep < arr: return None, None
    slot = "PM"
    tm = re.search(r"ch[ec]+k-?\s*out[^\n]*?(\d{1,2}(?::\d{2})?\s*(am|pm))", t, re.I)
    if tm and tm.group(2).lower() == "am": slot = "AM"
    return dep, slot

def q(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def main(src, out):
    groups = json.load(open(src))
    rows, skipped = [], []
    last = {}   # normalised name -> departure date of the row we kept; a repeat inside that window is a continuation row
    for g in groups:
        if not g["date"] or not (g.get("title") or g.get("contact_name")): skipped.append((g["external_ref"], "no date/title/contact")); continue
        dep, dep_slot = departure(g)
        arr = dt.date.fromisoformat(g["date"])
        note_bits = []
        if dep is None:
            dep = arr + dt.timedelta(days=2); dep_slot = "PM"; note_bits.append("DEPARTURE NOT FOUND IN SHEET — assumed 2 nights, please check")
        guests = num(g.get("expected_guests")); guests = None if guests == "ALL" or (isinstance(guests, int) and guests > 400) else guests
        rooms = rooms_count(g.get("expected_rooms")); rooms = None if isinstance(rooms, int) and rooms > 60 else rooms
        if g.get("deposit") or g.get("billing"): note_bits.append("Billing: " + " / ".join(str(x) for x in [g.get("deposit"), g.get("billing")] if x))
        kind = g.get("retreat_type") or "residential"
        if g.get("trip_text"): note_bits.append(g["trip_text"])
        status = g["status"]
        if dep < dt.date(2026, 9, 2) and status != "CANCELLED": status = "COMPLETED"
        name = g.get("title") or f"{g.get('contact_name')} booking"
        keyn = re.sub(r"[^a-z]", "", (g.get("title") or g.get("contact_name") or "").lower())[:20]
        if keyn and keyn in last and last[keyn] >= arr:
            skipped.append((g["external_ref"], f"continuation of {name[:30]}")); continue
        last[keyn] = dep
        rows.append(dict(external_ref=g["external_ref"], name=name[:120], organisation=(g.get("title") or g.get("contact_name") or "").split(" - ")[0][:80],
            contact_email=g.get("contact_email"), contact_phone=g.get("contact_phone"), arrival=arr.isoformat(), arrival_slot=g.get("slot") or "PM", arrival_time=g.get("arrival_time"),
            departure=dep.isoformat(), departure_slot=dep_slot, departure_time=g.get("departure_time"), retreat_type=kind, use_basis=g.get("use_basis"),
            expected_guests=guests, expected_rooms=rooms, price_notes=g.get("price_notes"), spa_access=bool(g.get("spa_access")), status=status,
            booking_form_status=g.get("booking_form_status") or "NOT_SENT", terms_signed=bool(g.get("terms_document")), terms_document=g.get("terms_document"),
            notes="\n".join(note_bits) or None))
    def t(v):
        if not v: return "NULL"
        m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)", str(v).strip().lower())
        if not m: return "NULL"
        h = int(m.group(1)); mi = m.group(2) or "00"
        if m.group(3) == "pm" and h < 12: h += 12
        if m.group(3) == "am" and h == 12: h = 0
        return f"'{h:02d}:{mi}'"
    with open(out, "w") as f:
        f.write("-- Generated by tools/import-sheet/load_groups.py — safe to re-run\nDO $$\nDECLARE t uuid; p uuid;\nBEGIN\n  SELECT id INTO t FROM tenant LIMIT 1; SELECT id INTO p FROM property WHERE tenant_id=t LIMIT 1;\n")
        for i, r in enumerate(rows):
            colour = ["#2C6E8A","#5B7B5A","#B8632B","#7A4E8A","#8A5A2C","#A2382C","#3C7A7A"][i % 7]
            f.write(f"""  INSERT INTO booking_group (tenant_id,property_id,source,external_ref,name,organisation,contact_email,contact_phone,arrival_date,arrival_slot,arrival_time,departure_date,departure_slot,departure_time,retreat_type,use_basis,expected_guests,expected_rooms,price_notes,spa_access,status,booking_form_status,terms_signed,terms_document,notes,colour)
  VALUES (t,p,'IMPORT:SHEET',{q(r['external_ref'])},{q(r['name'])},{q(r['organisation'])},{q(r['contact_email'])},{q(r['contact_phone'])},{q(r['arrival'])},{q(r['arrival_slot'])},{t(r['arrival_time'])},{q(r['departure'])},{q(r['departure_slot'])},{t(r['departure_time'])},{q(r['retreat_type'])},{q(r['use_basis'])},{q(r['expected_guests'])},{q(r['expected_rooms'])},{q(r['price_notes'])},{q(r['spa_access'])},{q(r['status'])},{q(r['booking_form_status'])},{q(r['terms_signed'])},{q(r['terms_document'])},{q(r['notes'])},{q(colour)})
  ON CONFLICT (property_id,source,external_ref) WHERE external_ref IS NOT NULL DO UPDATE SET name=EXCLUDED.name, organisation=EXCLUDED.organisation, contact_email=EXCLUDED.contact_email, contact_phone=EXCLUDED.contact_phone,
    arrival_date=EXCLUDED.arrival_date, arrival_slot=EXCLUDED.arrival_slot, arrival_time=EXCLUDED.arrival_time, departure_date=EXCLUDED.departure_date, departure_slot=EXCLUDED.departure_slot, departure_time=EXCLUDED.departure_time,
    retreat_type=EXCLUDED.retreat_type, use_basis=EXCLUDED.use_basis, expected_guests=EXCLUDED.expected_guests, expected_rooms=EXCLUDED.expected_rooms, price_notes=EXCLUDED.price_notes, spa_access=EXCLUDED.spa_access,
    booking_form_status=EXCLUDED.booking_form_status, terms_signed=EXCLUDED.terms_signed, terms_document=EXCLUDED.terms_document, notes=EXCLUDED.notes, version=booking_group.version+1
  WHERE booking_group.source='IMPORT:SHEET';
""")
        f.write("END $$;\n")
    print(f"rows={len(rows)} skipped={len(skipped)} assumed_departure={sum(1 for r in rows if r['notes'] and r['notes'].startswith('DEPARTURE'))}")
    for s in skipped[:10]: print("  skip", s)

if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
