# Japanese Card Converter

## Scan a case (main tab)
Take a photo of a shop's case, drag a box around one card and its price tag, type the ¥ price and the
Pokémon (in English), and tap the matching Japanese card. The app compares the tag price (yen ÷ your
yen-per-dollar rate) to the Japanese card's Cardmarket price, or to the English card's TCGplayer price
(unlimited, not 1st edition) when there is no Japanese price, and says Good deal (80% or less), Fair or
Pricey. "This case" lists every card checked, best deals first. Old cards often have no picture in the
data, so their tile shows the Japanese name (match it to the name on the card).
Free text reading (Tesseract) was tried on a sample photo and was too unreliable on glare and small tags, so
you type the price and Pokémon. A paid photo-reading service could fill them in later, only with Brian's yes.

## Look up

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

## Auto scan (Claude)

On the Scan a case tab, after you pick a photo, **Find every card and price it** sends the photo to Claude.
Claude reads every card and ¥ tag, then looks up the Japanese card's US price on PriceCharting, eBay sold and Collectr,
and the app lists the cards with "Look closer" at the top (tag is 80% of the Japanese price or less).

It uses your own Claude API key (make one at platform.claude.com and add credit). The key is saved only on the phone.
Each scan shows what it cost. The drag-a-box tool still works without a key.
