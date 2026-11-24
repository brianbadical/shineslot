# Japanese Card Converter

Phone web app at `shineslot/jp/` (beside Card Show Pricer). Type the set code and number from the
bottom left of a Japanese Pokémon card (like `SV2a` and `173`) and it shows:

- the Japanese card and the English card with the same picture, side by side
- the English price (TCGplayer market) and the Japanese price (Cardmarket, in euros, with a rough dollar figure)
- buttons for eBay sold (Japanese and English), TCGplayer and PriceCharting
- a History tab of past look-ups that opens with no signal

How the match works: TCGdex (free, no key) has Japanese and English cards with their Pokédex number and
artist. Same Pokémon + same artist + same era = same picture. Trainer cards can't be translated by name,
so the app shows the artist's English trainer cards and you tap the one with the same picture.
No English card found means it is probably a Japan-only print.

No sign-in, no paid service, nothing stored off the phone. Tests: `node --test test/jp.test.mjs`.
