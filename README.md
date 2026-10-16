# Ossara — 2D Three.js World Sim

A top-down **2D orthographic** simulation of a continent and everything inside it: **nations**, **regions**, **states**, **cities**, **residents**, and **public art**. Built with **Vite**, **TypeScript**, and **Three.js**.

## What it simulates (v2)

- **Geography hierarchy** — nested borders from continent down to individual cities
- **Blocs (pacts)** — choose a patron bloc at start; member cities show pact-colored outlines
- **Economy** — Food, Goods, and Culture stocks with trade routes (merchants on the map)
- **Migration** — daily population drift; optional migration corridor overlay
- **Breakthroughs** — emergent inventions that spread along trade and bloc research stances
- **Civic feed** — scrollable event log with tap-to-focus on the map
- **Governance** — local policy vs mandate conflicts, bloc stance toggles, abstract pact tension
- **People & art** — residents wander cities; public art boosts local mood and art index
- **Time** — day/night tint, adjustable sim speed, pause/resume, regenerate world

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default **http://127.0.0.1:43123**).

## Live demo

- **GitHub Pages:** https://alexdepasquale2-jpg.github.io/ossara-world-sim/ (deploys on push to `main`)
- **Vercel (claim for permanent URL):** use the [Publish] flow in Cursor or run `npx vercel login` then `npx vercel --prod`

## Controls

### Desktop

| Input | Action |
|--------|--------|
| Drag | Pan the map |
| Scroll | Zoom |
| Click | Select continent / nation / region / state / city |
| Sidebar tabs | Overview, Feed, Bloc stances, Layers |

### Mobile

| Input | Action |
|--------|--------|
| One finger drag | Pan |
| Pinch | Zoom |
| **+ / −** buttons | Zoom |
| Tap | Select a region; opens the control sheet with stats |
| Bottom sheet | Swipe **Controls** for tabs (Overview · Feed · Bloc · Layers) |

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

## v2 manual QA

- [ ] Pick pact, run ~10 sim-days
- [ ] See trade route on map + economy line in Feed
- [ ] Toggle **Inventions** layer and confirm pulse on cities with breakthroughs
- [ ] Resolve one pending decision (Approve / Deny / Defer)
- [ ] Mobile: pinch zoom, open sheet, use decision card above peek bar
