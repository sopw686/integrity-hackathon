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
npm run validate     # content rules (see content/AUTHORING.md); --online also checks every URL
npm run compose-days # fill day files from the verified pool: --from --to [--window 7] [--force]
npm run test         # unit tests: geometry, scoring, validator
npm run screenshots  # Playwright: every screen at 390×844 and 1280×800 + reveal frames → design/screens/
npm run check:flows  # Playwright: keyboard-only loop, storage disabled, reduced motion, axe scans
```

Deploy as a static site: Cloudflare Pages (`wrangler.toml`, `public/_redirects`) or Vercel
(`vercel.json`). Build command `npm run build`, output `dist`.

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

- `content/claims/*.json`: one claim per file. Only `status: "verified"` ships.
- `content/days/YYYY-MM-DD.json`: five claim ids per day (America/Los_Angeles).
- `content/AUTHORING.md`: how to add a claim, for a non-engineer.
- `content/campus-survey.md`: how to run the 5C room survey.
- `scripts/validate-content.ts`: fails the build on any content-rule violation.

### Content status (honest)

Verified means the figures were read against the source or its toplines. Draft means a human
still has to confirm something before it can ship. Numbers are never invented; a claim whose
numbers could not be confirmed stays draft with a `VERIFY` note on exactly what to check.
Today: 37 verified, 31 draft; day files cover 2026-10-04 through 2026-10-29 with a
5-day no-repeat window. `design/REVIEW.md` lists what is still open and why; `content/research-round-3.md` has the
student-relevance round and its open gaps.

## Design

Hand-written CSS on a small token system (`src/tokens/`). Newsreader for claims, Archivo and
Archivo Narrow for labels and numerals. Paper, ink, hairline rules, vermilion reserved for *you*,
plus a small game-show layer (push-buttons, confetti made of dots, synthesized sound and haptics,
yellow/green for combos and correct calls; see `design/REVIEW.md`). No partisan colors.
Dark mode follows `prefers-color-scheme`; reduced motion collapses the reveal to one crossfade.

`src/lib/geometry.ts` is the single source of truth for the room: the SVG `<Room />`, the
share-card canvas and the results minis all draw from it.

Places where a person should make the final taste call are marked `// HUMAN:` in code and
listed in `design/REVIEW.md`.
