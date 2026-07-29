# Brakes — all food bought + real price changes

**Account:** 1832142 — The Vedanta Way Ltd  
**Period:** 2024-07-13 to 2026-07-11  
**Main file:** `Brakes_All_Food_Bought_And_Price_Changes.xlsx`

## Verdict

Yes — Brakes **food** unit prices have changed on real invoices.

| Metric | Value |
|--------|------:|
| Food purchase lines (invoice + credit) | 5,189 |
| Unique food products bought | 968 |
| Food products with a real price change | **453** |
| Total real price-change events | **971** |
| Food net spend | **£132,479.52** |

Non-food (gloves, napkins, labels, etc.) is excluded.

## Excel sheets

1. **Overview** — totals, category spend, top price movers with full price history  
2. **All Food Bought (Lines)** — every food line from every invoice/credit (what you bought)  
3. **All Food Products** — every food product with first/last/min/max prices and spend  
4. **Food Price Changes** — only products whose unit price really moved  
5. **Each Price Change Event** — each old → new price with the invoice date  
6. **Food Price History** — chronological price runs per product  
7. **By Month** — food spend + how many increases/decreases each month  

## Method

Real unit prices from Brakes portal invoice CSVs (and credit PDFs). A “price change” is counted when a later invoice charges a different unit price for the same Brakes product code.
