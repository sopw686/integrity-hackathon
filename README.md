# Read the Room

A two-minute daily game. Five claims a day. For each one you do two things:

1. **Verdict.** Tap **True** or **False**.
2. **Read the room.** Drag a slider: *what share of the room says this is true?*

The room is not other players. It is a real polled public: a named national survey
(YouGov, KFF, NSF, Yale/GMU) or, for campus claims, a survey of 5C students the team runs
itself. Every claim ships with its source, field dates and sample size, shown on the reveal.

The reveal is the game. A 10 × 10 grid of dots, the room, recolors row by row into the real
split. The truth is stamped on its side. Your guess is a thin vermilion line. One dot pulses:
that is you, standing where your verdict put you.

Two scores: 🎯 **Accuracy** (verdicts right, out of 5) and 📡 **Read** (how well you predicted
the room, 0–100). A streak. A share card made of five tiny rooms with your dot marked.

## Run it

```
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # runs the content validator first (prebuild), then vite build → dist/
npm run preview      # serve dist/ on :4173
npm run validate     # content rules (see content/AUTHORING.md)
npm run validate -- --online    # also fetches every source and truth URL
npm run compose-days -- --from YYYY-MM-DD --to YYYY-MM-DD [--window 5] [--force]   # fill day files from the verified pool
npm run test         # unit tests: geometry, scoring, storage, validator
npm run screenshots  # Playwright: every screen at 390×844 and 1280×800 + reveal frames → design/screens/
npm run check:flows  # Playwright: keyboard-only loop, storage disabled, reduced motion, axe scans; exits 1 on any failure
```

Flags for an npm script go after `--` (`npm run validate -- --online`); without it npm keeps them
for itself and the script never sees them. `screenshots` and `check:flows` drive a running app:
start `npm run dev` in another terminal first (or point them at another server with
`BASE=http://127.0.0.1:4173` after `npm run preview`), and install a Chromium once with
`npx playwright install chromium` (or set `CHROMIUM_PATH`).

Node 22 (22.12 or later), 24, or 26+ (`engines` in `package.json`); `.node-version` pins 22.22.0
for nvm, fnm and Cloudflare Pages. Deploy as a static site: Cloudflare Pages (`wrangler.toml`;
deep links rely on Pages' default single-page-app mode, so keep `dist/` free of a top-level
`404.html`) or Vercel (`vercel.json`). Build command `npm run build`, output `dist`.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Home: today's number and date, Play, streak, How to play. After playing: the two dials and Share. |
| `/play` | Verdict → read the room → reveal, five times. `/play?day=YYYY-MM-DD` plays an archive day (doesn't count). |
| `/results` | Dials, five rows with mini rooms and badges, Share, "Send a friend the one that got you". |
| `/stats` | Lifetime accuracy, mean read, Fox and Sheep counts, streak, calendar of played days. |
| `/archive` | Past puzzles, playable, labeled "archive — doesn't count". |
| `/c/:id` | Read-only reveal for a single claim (deep link). |

## Content

Content is static JSON bundled at build time. No backend, no runtime model.

- `content/claims/*.json`: one claim per file. Only `status: "verified"` ships: the build turns
  drafts into `null` (`vite.config.ts`), and files starting with `_` are templates that never ship.
- `content/days/YYYY-MM-DD.json`: five claim ids per day (America/Los_Angeles).
- `content/AUTHORING.md`: how to add a claim, for a non-engineer.
- `content/campus-survey.md`: how to run the 5C room survey.
- `scripts/validate-content.ts`: fails the build on any content-rule violation.

### Content status (honest)

Verified means the figures were read against the source or its toplines. Draft means a human
still has to confirm something before it can ship. Numbers are never invented; a claim whose
numbers could not be confirmed stays draft with a `VERIFY` note on exactly what to check.
Today: 34 verified, 15 draft; day files cover 2026-10-04 through 2026-10-29 with a
5-day no-repeat window (temporary; the validator errors under 5 days and warns under 7). This pool
allows up to a 6-day window; 7 needs at least 35 verified claims, 7 of them with a wrong-side
majority. `design/REVIEW.md` lists what is still open and why.

## Design

Hand-written CSS on a small token system (`src/tokens/`). Newsreader for claims, Archivo and
Archivo Narrow for labels and numerals. Paper, ink, hairline rules, one accent (vermilion)
reserved for *you*. No gradients, no shadows beyond the stamp's ink bleed, no partisan colors.
Dark mode follows `prefers-color-scheme`; reduced motion collapses the reveal to one crossfade.

`src/lib/geometry.ts` is the single source of truth for the room: the SVG `<Room />`, the
share-card canvas and the results minis all draw from it.

Places where a person should make the final taste call are marked `// HUMAN:` in code and
listed in `design/REVIEW.md`.
