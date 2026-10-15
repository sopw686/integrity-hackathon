# Design review — what a person still has to decide

This file is the honest list. Everything below is marked `// HUMAN:` in code (grep `HUMAN:`),
and the generated default is a defensible starting point, not a decision.

## Where taste is required (the ten from the brief)

1. **Font pairing and sizes** — `src/tokens/typography.css:1`, `:11`, `:51`; `index.html:14`.
   Newsreader (display optical size 72 on the claim) + Archivo / Archivo Narrow. Try Source
   Serif 4 at claim size and pick by eye. The claim is 28–34px on phones, 40px on desktop.
2. **The palette** — `src/tokens/colors.css:1`. Paper `#F6F3EC`, ink `#141414`, rule `#D9D3C5`,
   vermilion `#D64A2B`. The brief's muted `#7A746A` measured 4.2:1 on paper, under the 4.5:1
   floor, so it is `#6B655B` (5.2:1). The "unsure" dots are a 45° hatch in `#C9C2B2`; a dotted
   stroke is the alternative to try. Dark-mode rule/muted/hatch values were chosen by me.
3. **Every piece of copy** — `src/tokens/copy.ts` (whole file; badge names `:7`, tagline `:17`,
   onboarding `:37`, results phrases `:48`, share text `:64`). Target is dry; delete anything cute.
4. **Motion timings and easing** — `src/tokens/motion.ts:1`. Row cadence 70ms / 160ms, stamp
   1.18 → 1.0 in 220ms with a fading 1px ink bleed, guess line 240ms, two 300ms pulses, badge
   spring (500/30). Measured on a phone-width headless run: Next appears ≈2.3s after Lock,
   ≈0.5s under reduced motion. Tune on a real phone.
5. **Player-dot placement** — `src/lib/geometry.ts:93`. Currently the dot inside the grid
   (last true dot if you said true, first dot after the true block if you said false). The
   alternative is a 101st dot just outside the grid. Decide after ten reveals.
6. **The wordmark** — `src/tokens/copy.ts:16`. Set in Newsreader 500 at 22px. No logo was made.
7. **Claim wording** — every `content/claims/*.json`. Each claim must be reread against the
   poll's exact wording (kept in `room.questionWording` when it differs). Polarity errors are
   the most dangerous bug in this product; the validator cannot catch them.
8. **Day composition** — `scripts/compose-days.ts:10` finds a valid arrangement; rhythm and
   order are yours. Today's file `content/days/2026-10-15.json` was composed by hand.
9. **The Split threshold and Read bands** — `src/lib/scoring.ts:3`, `:12`, `:39`. Note the
   literal-to-spec asymmetry: Split replaces In good company / Sheep inside 45–55, but Fox and
   Stray are untouched, so a Fox at 48 is barely a fox.
10. **Party breakdowns on the reveal** — not shown, by default. The sources have them. Nothing
    in the UI uses red/blue, left/right or party labels.

## Other HUMAN markers

- `src/styles.css:90` — the Lock button's "armed" state is a 4px vermilion bar on its left
  edge (paper text on a vermilion fill would be 3.9:1, under the text floor).
- `src/lib/share.ts:266`, `:293`, `:384`, `:473` — card tuning: 1.25× player dot, dial radius,
  mini-grid size, and whether the shared *text* should carry the site URL (today the URL
  travels in the Web Share `url` field and the copied text is exactly the two lines).
- `content/claims/one-group-rules-world.json` — both researchers flagged "a single group
  secretly rules the world" as unfalsifiable rather than settled; it is draft until you decide.
- The twelve campus drafts carry `HUMAN:` in `room.note`; `content/campus-survey.md` explains.

## What still looks generic (honest)

- **Home is sparse.** Wordmark, dateline, tagline, one line, a button, a chip. It is restrained
  on purpose but a real graphics desk would probably give it one more object (yesterday's room
  as a tiny still, or a one-line "how it works"). I did not add one because the brief says one
  line of tagline.
- **The emoji.** ✅ 🦊 🐑 ⚪ ⚖️ 🎯 📡 render in full color and are the loudest things on the
  results screen. The brief requires them. Monochrome glyphs (text presentation, `U+FE0E`) or
  small inline SVG marks would sit better with the rest.
- **Buttons are plain rectangles with uppercase condensed labels.** That is the brief, and it
  reads as newspaper UI, but it is also the look a lot of generated "editorial" pages have.
- **The stats page** is a definition list and a dot calendar. Correct, not memorable.
- **Dateline strings with middle dots** ("No. 12 · Thursday, Oct 15") are a known tell; the
  brief specifies them.
- **The how-to figure box** is a 1px-ruled rectangle around each miniature; it is the one
  "card" on the product and could go.

## Content status (what is verified, what is not)

Verified (19, all with figures quoted from the source's toplines or its own release in the
research pass): the seven YouGov Nov 2023 items (moon landing, 9/11, microchips, voting
machines, Obama's birthplace, mass shootings faked, vaccines/autism), ten KFF May–June 2023
items (MMR/autism, ivermectin, sudden deaths, infertility, vaccine deaths vs. virus, birth
control, sex ed, gang homicides, armed guards, guns at home), and two NSF 2012 items whose
figures the brief fixed (Sun around Earth, human evolution).

Draft, with best-known numbers filled and a `VERIFY` note (the environment blocked every poll
host and the session's search allowance ran out before these could be re-read): eight further
NSF 2012 science items, the two Yale/GMU Spring 2026 climate items (need field dates and n), the
YouGov flat-earth and dinosaurs items, "a single secret group" (eligibility), and the twelve
campus items (need the 5C survey).

Consequence: only one verified claim has a *true* answer, so the day rule "at least one true
claim per day" cannot be met for 14 days yet. `npm run validate` reports the missing days as
errors on purpose. Verifying the NSF and Yale items (one table and one report) unblocks
`scripts/compose-days.ts` for the full archive-plus-14-days window.

## Checks that pass

- Lighthouse accessibility 100 and best practices 100 on `/play` (Chromium 141, headless).
- Hard-rule grep clean: no gradients, no backdrop blur, no shadows except the stamp bleed,
  no Inter/Roboto/Poppins/Montserrat/Space Grotesk, no purple/indigo/teal, no 🚀, no confetti,
  no "misinformation", "media literacy" or "bias" in the UI.
- First load 130 KB gzipped (JS + CSS, fonts excluded), under the 150 KB budget.
- Unit tests: geometry, scoring, validator (33 tests).
