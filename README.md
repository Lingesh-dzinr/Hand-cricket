# Hand Cricket

The playground game against the computer, with 3D toon hands in a sunny classroom.

## Play

Press **Play**, choose bat or bowl, then pick 0–6 (tap or keys) before the overlay closes. Same number: out. Otherwise the batter scores their number. One innings each; the chase ends when the target is passed.

## Run locally

Needs Node 18+ (no `npm install`):

```bash
node server.js
```

Open http://localhost:5173. It's a static site, so any static host (Vercel, Netlify, GitHub Pages) serves it as-is.

## Layout

- `index.html` – page, styles and game logic
- `js/hand.js` – the 3D hand (Three.js, loaded from jsDelivr)
- `js/ambience.js` – classroom sound
- `assets/` – background image and sound
- `dev/` – the hand prototype (`proto-3d.html`), mockups, reference art and tools; not needed to play

Classroom sound: "Kids chatter, primary school, Birmingham UK" from the Freesound community.
