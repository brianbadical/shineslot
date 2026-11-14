
## 2026-11-13 update
- "Load my card list" button (My cards when empty, and Add cards) loads Brian's 87-card show list from my-list.txt. Duplicates stay as separate copies so each can be sold on its own. Sealed product and One Piece cards skip the Pokemon price lookup; give them your own price.
- Sales tab: quick add for Binder cards (how many + total), Other sale (type anything + amount) and Expense (drink, cards bought at the show). Each day shows sales, expenses and net. Tap ✕ twice to remove an entry. Spreadsheet export includes all of it.
- Backup file now holds cards and these entries (old backups still load).

## 2026-11-14: PSA slabs
- `my-psa.json`: 311 slabs from PSA orders completed in the last year (Nov 2025 to Nov 2026), with PSA's Card Ladder estimate per cert.
- "Load my PSA slabs" (Add tab) links each cert to the matching slab already on the list (58 matched) and adds the rest as new cards tagged "PSA order MM/DD/YY". It never adds a cert twice.
- A slab's value is: your price if set, else the average of the sold prices, else the PSA estimate. If PSA has no estimate, the value is 999999.
