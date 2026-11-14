
## 2026-11-13 update
- "Load my card list" button (My cards when empty, and Add cards) loads Brian's 87-card show list from my-list.txt. Duplicates stay as separate copies so each can be sold on its own. Sealed product and One Piece cards skip the Pokemon price lookup; give them your own price.
- Sales tab: quick add for Binder cards (how many + total), Other sale (type anything + amount) and Expense (drink, cards bought at the show). Each day shows sales, expenses and net. Tap ✕ twice to remove an entry. Spreadsheet export includes all of it.
- Backup file now holds cards and these entries (old backups still load).

## 2026-11-14: PSA slabs
- `my-psa.json`: 311 slabs from PSA orders completed in the last year (Nov 2025 to Nov 2026), with PSA's Card Ladder estimate per cert.
- "Load my PSA slabs" (Add tab) links each cert to the matching slab already on the list (58 matched) and adds the rest as new cards tagged "PSA order MM/DD/YY". It never adds a cert twice.
- A slab's value is: your price if set, else the average of the sold prices, else the PSA estimate. If PSA has no estimate, the value is 999999.

## 2026-11-14 later: blended slab prices
- Each slab's price in `my-psa.json` now blends three sources for that exact card and grade:
  - PSA's Card Ladder estimate.
  - The PriceCharting grade price. It's skipped when the PriceCharting match is a different version, such as jumbo, staff, prize pack or another language.
  - The median of the last 5 PSA auction-price sales since May 2025. These are mostly eBay solds.
- The blend takes the median of 3 sources and the average of 2 that agree. When 2 sources are more than 2x apart, it takes the lower one and tags the card "Check price". The earlier name-only eBay look-up only counts when nothing else is there and it agrees; on slabs it is replaced by this price.
- Tapping "Load my PSA slabs" again refreshes the prices on slabs already loaded.
- Each slab shows PSA's own photo of that slab, taken from the order data. The photos are loaded from PSA's image server.
