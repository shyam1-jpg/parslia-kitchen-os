# Admin app — design notes

Subject: a lakeside retreat centre run by a 25-person team; the admin app is used at reception
and in the office for hours at a time. It must feel calm, dense where it needs to be (the board),
and instantly familiar to people who have run the place from a spreadsheet.

Palette: stone `#EEF1EF` background, paper `#FFFFFF` panels, ink `#1B2A28` (green-black),
lake `#2C6E8A` for interface actions and "confirmed", marigold `#D9A441` for anything awaiting a
person, moss `#5B7B5A` for done/in-house, brick `#A2382C` for cancel/danger.
Each group gets its own colour on the board; the interface never uses group colours for controls.

Type: Newsreader (serif) for headings and big numbers; IBM Plex Sans for everything else.

Principles
- The room board is the one bold element: rooms down, AM/PM across, exactly like the sheet.
- Paperwork is a checklist, not a status word. "Needs attention" is a first-class filter.
- Only command buttons change state ("Confirm", "Check group in"); they are disabled with a
  reason when paperwork is outstanding.
- No decoration. Borders and colour encode information (section rows, today column, out of use).
