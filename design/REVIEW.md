# Design review — what a person still has to decide

This file is the honest list. Everything below is marked `// HUMAN:` in code (grep `HUMAN:`),
and the generated default is a defensible starting point, not a decision.

## Where taste is required (the ten from the brief)

1. **Font pairing and sizes** — `src/tokens/typography.css:1`, `:11`, `:51`; `index.html:21`.
   Newsreader (display optical size 72 on the claim) + Archivo / Archivo Narrow. Try Source
   Serif 4 at claim size and pick by eye. The claim is 28–34px on phones, 40px on desktop.
2. **The palette** — `src/tokens/colors.css:1`. Paper `#F6F3EC`, ink `#141414`, rule `#D9D3C5`,
   vermilion `#D64A2B`. The brief's muted `#7A746A` measured 4.2:1 on paper, under the 4.5:1
   floor, so it is `#6B655B` (5.2:1). The "unsure" dots are a 45° hatch in `#C9C2B2`; a dotted
   stroke is the alternative to try. Dark-mode rule/muted/hatch values were chosen by me.
3. **Every piece of copy** — `src/tokens/copy.ts` (whole file; badge names `:7`, tagline `:17`,
   onboarding `:37`, results phrases `:48`, share text `:66`). Target is dry; delete anything cute.
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
   order are yours. Today's file `content/days/2026-10-15.json` was composed by hand. The
   no-repeat window is my rule, not the brief's: a 7-day window needs at least 35 verified
   claims and 7 with a wrong-side majority; the pool is smaller, so the shipped days use the
   largest window that works (see Content status). Add majority-wrong claims first.
9. **The Split threshold and Read bands** — `src/lib/scoring.ts:3`, `:12`, `:39`. Note the
   literal-to-spec asymmetry: Split replaces In good company / Sheep inside 45–55, but Fox and
   Stray are untouched, so a Fox at 48 is barely a fox.
10. **Party breakdowns on the reveal** — not shown, by default. The sources have them. Nothing
    in the UI uses red/blue, left/right or party labels.

## The game-show layer (added after the first build, on request: "make it fun")

This deliberately breaks three of the brief's original hard rules — **no confetti**, **no shadows
beyond the stamp**, **one accent color** — to make the loop feel like a game. Decide whether that
trade is right; everything below is isolated enough to dial back.

- **Push-buttons.** Every `.btn` and the True/False tiles sit on a hard 4–6px ink edge and sink on
  press (`src/styles.css`, `src/components.css` "game-show layer"). Flat offset, no blur.
- **New tokens** — `src/tokens/colors.css`: `--pop` (yellow: combo, points, rank card), `--win`
  (green: correct banner, right pips, full dials). Green means "you got it right", never a side.
  Nothing uses red/blue.
- **Play.** 3·2·1 countdown before the day's first claim (tap to skip; never under reduced motion);
  claim sets in word by word; progress pips; running 🎯/📡 score with a 🔥 combo after two right;
  rows pop like a stadium wave; the stamp slams from 2.6× with a screen thud; a Correct / Nope
  banner; "+N" read points (Bullseye ≤3 off); badges flip in as coins; T / F and Enter shortcuts.
- **Badges** are hand-drawn SVG medallions (`src/components/BadgeArt.tsx`) instead of emoji in the
  UI. The share text still uses the emoji. Generated art was attempted through the Higgsfield MCP;
  the free plan blocks the better models and the sandbox could not download results.
- **Sound + haptics** — `src/lib/sfx.ts`. All synthesized with WebAudio (no files). On by default,
  switch in the header, remembered per browser. Haptics follow the same switch.
- **Confetti** — `src/lib/confetti.ts`, made of the room's own dots and newsprint strips. Fires on a
  correct call, a bullseye, a Fox, and on results (big at ≥4/5 or read ≥70). Never under reduced
  motion or the frozen-clock test hook.
- **Results** get a rank title (`COPY.ranks`), sweeping dials that count up, staggered rows with a
  right/wrong edge, and a fanfare only on arrival from the last reveal. **Home** gets a murmuring
  10×10 room, a breathing Play button, a 🔥 streak, and a countdown to the next puzzle.
- **Timing cost.** Full reveal is now ≈2.3s of animation (stamp 260ms instead of 220ms); measured
  Next-after-Lock in headless Chromium ≈2.9s, over the old 2.5s target. Reduced motion is unchanged
  (≈0.9s).
- **Bug fixed on the way:** arriving at /play from Home never focused the claim (the browser's focus
  fixup dropped it); focus now lands in a layout effect with a next-frame retry.

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

- **Home.** Wordmark, dateline, tagline, one dry line, a button, a chip, and a strip of
  yesterday's five rooms as small stills (the signature mark on the first screen, and a door
  into the archive). The strip is my addition, not the brief's; cut it if it reads as clutter.
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

Two research passes ran: blind pairs of search agents per source, reconciled by a judge, because
the environment blocks every poll host. "Verified" means both agents quoted the figure from the
pollster's own page, toplines or a reputable outlet quoting them, and agreed.

Verified (37; 13 with a true answer; 9 with a wrong-side majority):
alcohol-raises-cancer-risk, antibiotics-viruses, armed-school-guards, birth-control-infertility, center-earth-hot, continents-moving, covid-vaccine-infertility, covid-vaccine-sudden-deaths, earth-is-flat, electrons-smaller-atoms, fathers-gene-sex, gun-at-home-safer, holocaust-six-million, gun-homicides-gang, humans-developed-millions-years, humans-dinosaurs-coexisted, humans-evolved, humans-have-evolved, ivermectin-covid, lasers-sound-waves, mass-shootings-faked, mmr-autism, moon-landing-staged, obama-birthplace, radioactivity-man-made, scientists-agree-warming, sex-ed-teens, sun-around-earth, universe-huge-explosion, us-govt-behind-911, vaccine-deaths-exceed-covid, vaccine-microchip, vaccines-autism, voting-machines-2020, warming-happening, warming-human-caused, wifi-encrypted-by-default.

Draft (31), each with its best-known numbers and a `VERIFY` note saying exactly what to check:
ca-mail-ballot-7-days, ca-same-day-registration, claremont-council-ballot, flu-shot-cannot-give-flu, la-any-vote-center, most-5c-from-california, mudd-acceptance-rate, mudd-writing-course, one-group-rules-world, pomona-endowment-harvard, shuttle-weekends, three-branches, tiktok-news-under30, vaccines-approved-are-safe, vote-with-campus-address.
Round 3 (student relevance; see `content/research-round-3.md`): a-most-common-college-grade, astrology-is-scientific, chatgpt-word-patterns, college-binge-drinking-month, college-depression-falling, college-no-partners-past-year, college-therapy-past-year, half-undergrads-no-ba-parent, holocaust-myth-under-30, hpv-causes-oral-cancer, nicotine-causes-cancer, opt-in-nuclear-submarine, plan-b-ends-pregnancy, private-browsing-hides-little, tax-bracket-all-income, undergrads-vaped-past-month.
Reasons: the flu-shot item's wave is disputed (Jan vs Oct 2023 ASAPH); "vaccines approved in the
U.S. are safe" lacks an exact n; "a single secret group" failed the settled-truth test; the twelve
campus items wait for the 5C survey.

Day files run from 2026-10-04 (archive) through 2026-10-29 (today plus 14). The composer could
only satisfy a 5-day no-repeat window with this pool, because only 6 verified claims have a
wrong-side majority and every day needs one. The validator therefore errors below 5 days and warns
below 7; raise both once the pool grows. The fastest way to a 7-day window is ten more
majority-wrong claims (the KFF 2024 misinformation waves and YouGov's 2026 conspiracy update are
the obvious sources). Two newer NSF figures exist (2018: Earth's core 86%, continents 79%) but the
2018 module n was not confirmed, so the 2012 wave ships.

## Checks that pass

- Lighthouse accessibility 100 and best practices 100 on `/` and `/play` (Chromium 141, headless).
- Hard-rule grep: no backdrop blur, no Inter/Roboto/Poppins/Montserrat/Space Grotesk, no
  purple/indigo/teal, no 🚀, no "misinformation", "media literacy" or "bias" in the UI. Confetti,
  hard offset shadows and one hard-stop slider fill are now in, by the game-show layer above.
- First load ≈146 KB gzipped (JS + CSS, fonts excluded), under the 150 KB budget with little room left.
- Unit tests: geometry, scoring, storage/streaks, validator (38 tests).
- `npm run check:flows`: keyboard-only loop to results, storage-disabled play-through, reduced-motion
  reveal done in ≈0.85s, full reveal done in ≈2.4s, zero axe-core violations on verdict, read,
  reveal and results.
