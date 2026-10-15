# Ossara — 2D Three.js World Sim

A top-down **2D orthographic** simulation of a continent and everything inside it: **nations**, **regions**, **states**, **cities**, **residents**, and **public art**. Built with **Vite**, **TypeScript**, and **Three.js**.

## What it simulates

- **Geography hierarchy** — nested borders from continent down to individual cities
- **People** — citizens, workers, merchants, and artists wander cities; artists gravitate toward art sites
- **Art** — murals, sculptures, galleries, and monuments boost local mood and the city **art index**
- **Stats** — population, happiness, economy, and art culture roll up from cities → states → regions → nations → continent
- **Time** — day counter, adjustable sim speed, pause/resume, regenerate world

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
| Sidebar | Toggle layers, pause, change speed, regenerate |

### Mobile

| Input | Action |
|--------|--------|
| One finger drag | Pan |
| Pinch | Zoom |
| **+ / −** buttons | Zoom |
| Tap | Select a region; opens the control sheet with stats |
| Bottom sheet | Swipe up **Controls** for layers, speed, and regenerate |

## Build

```bash
npm run build
npm run preview
```
