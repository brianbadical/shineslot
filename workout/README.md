# Workout

A simple phone workout app. Pick a starter plan, tap Start, fill in weight and reps, tick each set. A rest timer starts on every tick and beeps when it ends. History shows every finished workout; the coach line adds weight next time only when every rep was hit.

- No sign-in, no server, $0. Everything is saved on the phone (localStorage); Plan > "Save a backup file" keeps a copy.
- Works with no signal once opened (service worker), and installs to the home screen.
- Files: `index.html` (screen + styles), `app.js` (screens), `logic.js` (rules, tested by `node --test test/workout.test.mjs`).
- Icon is a plain placeholder until a ChatGPT-made one comes in.
