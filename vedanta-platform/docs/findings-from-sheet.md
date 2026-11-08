# What the live Google Sheet tells us (2 Sept 2026)

Source: `The Vedanta Calendar.xlsx` — sheets `2022–2030 Calendar` and `2024/2025/2026 Room Sheet`.

## How the business actually books
1. **Groups, not individuals.** Nearly every booking is an organiser bringing a group:
   Hoffman Institute (recurring, ~37 rooms, £1,039 pp), OmLife, Think Gita, Chinmaya
   Mission, Michelle Yoga day retreats, weddings (Grand Vedanta package £8,000), KCSOC
   (111 guests, all rooms), volunteer trips. Roughly 60–90 group bookings a year.
2. **Per-person package pricing** — Standard / Premium, twin vs single rate, with or
   without spa access, exclusive vs shared use of the venue. Prices agreed per group.
3. **A paperwork lifecycle per group:** booking form sent → complete; T&Cs PDF signed
   (2025/2026 version); feedback form after the stay.
4. **Half-day granularity.** Everything is AM/PM: check-in "Fri at 5pm", check-out
   "Sun at 2pm", early-arriving team members "night before — NO MEALS".
5. **Room Sheet = named person per room per half-day.** Facilitators, trainees, staff and
   guests all placed by hand. Cells also carry SPARE, OUT OF USE, X.
6. **The same calendar holds operations:** contractor visits (water hygiene, canopy
   clean, AC install), team meetings, Vaishnava/national holidays, viewings.
7. **Meals are implied by the group** (covers = expected guests) and by notes like
   "arriving 4pm — dinner".

## Inventory facts
- 2026 Room Sheet lists **42 rooms** in five sections: Ground Floor (G01–G03), Pink
  Corridor (101–112, no 103), First Floor (113–122), Green Corridor (201–208),
  Second Floor (209–218). Room 104 is a staff room.
- 2024 and 2025 sheets also listed **301–307** (7 more rooms). Sponsor said 45.
  **Question:** are 301–307 still in use? Is 104 sellable?
- Bed configuration per room (single/double/king + floor mattresses) drives capacity
  (2–4). Three "bridal suites" (119–121) have king beds.

## What this changes in the build
- Group booking is the **Phase 1** aggregate. An individual `reservation` is created
  under a group; walk-in individual stays are the exception.
- Availability is answered in rooms *and* beds *and* meal covers (max 130 per service).
- The room board must show AM/PM columns and named occupants, like the sheet — staff
  should recognise it instantly.
- Import: 381 group rows and 1,093 operational notes extracted in the first dry run;
  65 rows need a human look (mostly follow-on rows with a price/room count but no title).
