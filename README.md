# ShineSlot (working name)

Live: https://brianbadical.github.io/shineslot/ (owner side) · source of truth: `apps/shineslot` in Badical-HQ.

A small phone app for one-person car businesses. Customers send a quote request (car, what they need, photos, when they're free). The owner sends back a price and a time, the customer taps to book, and the job shows up on an easy week calendar.

One shared core with a "trade" setting:
- **Detailing**: mobile, so the customer gives the car's address (Directions button on the job).
- **Mechanic**: customers bring the car to the garage, so no address is asked; the shop address shows once booked.

## Two modes
- **Demo** (`config.js` empty): everything is saved in the browser of the device it runs on (`store.js` LocalStore).
- **Online** (`config.js` filled in): data lives in Supabase (`cloud.js` CloudStore). Owners sign in with email and password, set up their business once, and share `#book-<link-name>`. Customers never sign in; they get a private `#q-<token>` page for their quote.

## Online setup (Supabase free plan)
1. Create a project, then paste `supabase/schema.sql` into SQL Editor and run it. It creates two tables with row-level security (owners see only their own data) and four functions customers use (`get_business`, `submit_request`, `get_quote`, `accept_quote`).
2. Copy the Project URL and the publishable (anon) key into `config.js`. Never the secret / service_role key.
3. Authentication > URL Configuration: set Site URL to where the app is hosted, so the sign-up confirm email links back to it.

## Run it
Any static web server, for example `python3 -m http.server` in this folder, then open `http://localhost:8000/`.
- `#request` (demo) or `#book-<link-name>` (online): the customer form the owner shares
- `#inbox`, `#today` (calendar), `#share`, `#settings`: the owner side
- Settings > Demo tools > "Add sample requests" fills it with made-up data.

## Tests
`node --test test/logic.test.mjs` (rules: validation, request flow, prices, dates, trades, week calendar, store).

No build step, no dependencies, $0.
