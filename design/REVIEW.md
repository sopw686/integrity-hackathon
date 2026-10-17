# Design review — what a person still has to decide

This file is the honest list. Everything below is marked `// HUMAN:` in code (grep `HUMAN:`),
and the generated default is a defensible starting point, not a decision.

## Where taste is required (the ten from the brief)

1. **Font pairing and sizes** — `src/tokens/typography.css:1`, `:11`, `:51`; `index.html:21`.
   Newsreader (display optical size 72 on the claim) + Archivo / Archivo Narrow. Try Source
   Serif 4 at claim size and pick by eye. The claim is 28–34px on phones, 40px on desktop.
2. **The palette** — `src/tokens/colors.css:1`. Paper `#F6F3EC`, ink `#141414`, rule `#D9D3C5`,
   vermilion `#D64A2B`. The brief's muted `#7A746A` measured 4.2:1 on paper, under the 4.5:1
   floor, so it is `#6B655B` (5.2:1). The brief's hatch `#C9C2B2` measured 1.6:1 on paper, under
   the 3:1 non-text floor, and it alone draws the "unsure" dots, so they are a 45° hatch in
   `#8F887A` (3.2:1; dark `#736D63`, 3.6:1). Any retune must stay at 3:1 or above. A dotted
   stroke is the alternative to try. Dark-mode rule/muted/hatch values were chosen by me.
3. **Every piece of copy** — `src/tokens/copy.ts` (whole file; badge names `:7`, tagline `:17`,
   onboarding `:37`, results phrases `:48`, share text `:67`). Target is dry; delete anything cute.
4. **Motion timings and easing** — `src/tokens/motion.ts:1`. Row cadence 70ms / 160ms, stamp
   1.18 → 1.0 in 220ms with a fading 1px ink bleed, guess line 240ms, two 300ms pulses, badge
   spring (500/30). Measured on a phone-width headless run: Next appears ≈2.3s after Lock,
   ≈0.5s under reduced motion. Tune on a real phone.
5. **Player-dot placement** — `src/lib/geometry.ts:103`. Currently the dot inside the grid
   (last true dot if you said true, first dot after the true block if you said false). The
   alternative is a 101st dot just outside the grid. Decide after ten reveals.
6. **The wordmark** — `src/tokens/copy.ts:16`. Set in Newsreader 500 at 22px. No logo was made.
7. **Claim wording** — every `content/claims/*.json`. Each claim must be reread against the
   poll's exact wording (kept in `room.questionWording` when it differs). Polarity errors are
   the most dangerous bug in this product; the validator cannot catch them.
8. **Day composition** — `scripts/compose-days.ts:15` finds a valid arrangement; rhythm and
   order are yours. Today's file `content/days/2026-10-15.json` was composed by hand. The
   no-repeat window (`scripts/validate-content.ts:29`) is my rule, not the brief's: a 7-day
   window needs at least 35 verified claims and 7 with a wrong-side majority; the pool has 34
   and 6, so 6 days is the most it allows, and the shipped days use 5 (see Content status).
   Add majority-wrong claims first.
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

## Hackathon pass: calibration, election content, evidence-first reveal (Oct 16)

This pass aimed at the hackathon brief: election misinformation for 5C students, and overconfidence as the mechanism.

- **Confidence is now scored**, which supersedes "Whether to score it" below. `surePoints` is a centred Brier score: 50% gives 0, 70% gives +3/−5, 90% gives +5/−11, and 100% gives +5/−15. The day **score** (0–100) is `10 × right + confidence points + read ÷ 4`. The 🎯 and 📡 dials stay. Decide:
  - `SURE_K` (the weight, 10)
  - the ÷4 read weight
  - whether the share text should carry the score
- **Results headline** is now a behavioral insight from `src/lib/insight.ts` (for example "Sure, but wrong", "Ahead of yourself", "Knew what you knew"). It replaces the old rank titles. It has up to two notes:
  - followed or bucked the room's larger side
  - over- or under-estimated how many people fall for false claims
  - election-rule misses

  Demo crowds never feed the notes.
- **The reveal is now ordered by weight:**
  1. The banner carries the truth ("It's false").
  2. "Why it's false", with the source.
  3. "What to notice": the claim's `lesson`.
  4. "The room": the badge, plus lines that frame popularity as context, never evidence.

  Poll details sit behind a disclosure, which replaces the long uppercase source line.
- **Election content.** 16 verified election claims, checked against sos.ca.gov and lavote.gov pages on Oct 16, 2026. Two have real national rooms: Reuters/Ipsos on noncitizen voting, and Pew on all-mail states. The California rule claims use **demo crowds** (`room.kind: "illustrative"`), because no poll has measured them. Decide:
  - the illustrative splits themselves
  - whether to keep scoring the read on a demo crowd
- **Days.**
  - 2026-10-15 is the hand-picked demo round.
  - 2026-10-16 is hand-picked too.
  - 10-17 through 11-03 were composed with `--election 3 --window 5`.
  - These were skipped as too easy for the demo: flat Earth, Sun orbit, microchips, hot core, and two of the evolution wordings.
- **`seenIn`** is a scenario line above the claim ("Seen in a group chat on election night"). It frames the claim as something a student would actually meet. It is not a sourcing claim. Decide whether it reads as too staged.
- **Watch:**
  - A proposed voter-ID amendment (Prop 39) is on the Nov 3, 2026 ballot. If it passes, revisit `ca-photo-id` before any later election.
  - Postmark timing: the SOS advises mailing early. `ca-mail-ballot-7-days` says so.

## The confidence step (added after the panel)

After True/False the player picks how sure they are: 50 / 70 / 90 / 100. It is not scored. The
reveal shows the chip ("90% sure") and, on a wrong call made at 90%+, the line "You were 90% sure."
Results add "You felt X% sure. You were right Y% of the time." with an Overconfident / Underconfident /
About right verdict and a count of confident misses; Stats add one row per level (ink bar = how often
right, vermilion mark = how sure you said you were). Old days without confidence are skipped.

Decide:
- **The four levels and their words** — `src/lib/scoring.ts` (`CONFIDENCE_LEVELS`), `src/tokens/copy.ts`
  (`sureLevels`). A slider would give finer data but adds a second slider to every claim.
- **The ±10 point tolerance** for "About right" — `src/lib/scoring.ts` (`CALIBRATION_TOLERANCE`). Five
  calls a day is a tiny sample, so the daily verdict is noisy; the Stats chart is the honest view.
- **Whether to score it.** Unscored, a player can tap 100% every time and learn nothing. A proper
  scoring rule (Brier points) would reward honest confidence but changes the score, rank and share text.
- **Share text** does not carry confidence yet.
- Screens `03b-play-sure` are new in `scripts/screenshots.ts`; rerun `npm run screenshots` to refresh.

## Other HUMAN markers

- `src/styles.css:90` — the Lock button's "armed" state is a 4px vermilion bar on its left
  edge (paper text on a vermilion fill would be 3.9:1, under the text floor).
- `src/lib/share.ts:271`, `:298`, `:389`, `:498` — card tuning: 1.25× player dot, dial radius,
  mini-grid size, and whether the shared *text* should carry the site URL (today the URL
  travels in the Web Share `url` field and the copied text is exactly the two lines).
- `src/components/HowToDialog.tsx:8` — the How to play demo claim ("Goldfish have a
  three-second memory.") is illustrative. It must stay false (panel 3 stamps FALSE) and must
  never be the text of a pool claim, or the first-visit dialog gives away that claim's answer.
  Nothing checks this automatically.
- `content/claims/one-group-rules-world.json` — both researchers flagged "a single group
  secretly rules the world" as unfalsifiable rather than settled; it is draft until you decide.
- The twelve campus drafts carry `HUMAN:` in `room.note`; `content/campus-survey.md` explains.

## What still looks generic (honest)

- **Home.** Wordmark, dateline, tagline, one dry line, a button, a chip, and a strip of
  yesterday's five rooms as small stills (the signature mark on the first screen, and a door
  into the archive). Only rooms the player has already locked show their split, so someone who
  skipped yesterday sees five empty grids that link to play it; once yesterday is done the strip
  links to its results. The strip is my addition, not the brief's; cut it if it reads as clutter.
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

### Open on verified claims (found in the Oct 2026 audit)

- **The ten NSF/GSS 2012 claims use NSF's percent correct as the room.** antibiotics-viruses,
  center-earth-hot, continents-moving, electrons-smaller-atoms, fathers-gene-sex, humans-evolved,
  lasers-sound-waves, radioactivity-man-made, sun-around-earth, universe-huge-explosion. NSF
  publishes only the share answering correctly, so `pctUnsure` is 0 and don't-know answers sit
  on the wrong side (each note says so). This breaks the AUTHORING rule that the three shares
  come from the topline. Badges and the majority-wrong day rule are unaffected (the truth-side
  share is the percent correct), but on the four false-answer items the Read score is measured
  against a `pctTrue` that includes the don't-knows. Example: lasers-sound-waves shows "say
  true 53"; a GSS 2012 row reprinted by Pew reads about 24 true / 45 false / 31 don't know, but a
  blind research pair could not tie that row to the item with certainty, so nothing was changed.
  Fix: take the weighted true / false / don't-know frequencies for HOTCORE, CONDRIFT, EARTHSUN,
  RADIOACT, BOYORGRL, ELECTRON, VIRUSES, LASERS, BIGBANG and EVOLVED from the GSS Data Explorer
  (year 2012), with each item's own n.
- **humans-evolved and universe-huge-explosion are half-sample figures.** In 2012 a random half
  heard the bare wording (48% / 39% true) and the other half a prefaced one (72% / 60%); the notes
  now say so, but `n` is still the whole module's 2,256 until the half-ballot base is pulled
  from the GSS.
- **Links a person must open** (this sandbox reaches no source host): the truth sources changed
  in the audit (National Academies catalog 13164 for mmr-autism, catalog 27746 for
  covid-vaccine-infertility, the IDSA COVID-19 guideline for ivermectin-covid, DOI
  10.1002/pam.22498 for armed-school-guards), and every remaining HHS page: sex-ed-teens (CDC),
  covid-vaccine-sudden-deaths (CDC), vaccine-deaths-exceed-covid, vaccine-microchip and
  antibiotics-viruses. HHS rewrote or retired several vaccine pages in 2025–26; check that each
  still says what its `oneLine` says, or move it to a consensus review as mmr-autism and
  covid-vaccine-infertility were.
- **armed-school-guards is on a live policy fight.** Arming school staff is contested between the
  parties, which AUTHORING section 4 excludes. The truth line is now accurate; whether the claim is
  eligible at all is your call.

Day files run from 2026-10-04 (archive) through 2026-10-29. The build requires 14 days of
coverage from today (Pacific), so **from 2026-10-17 `npm run build` fails until more day files
are composed** (`npm run compose-days -- --from 2026-10-30 --to YYYY-MM-DD`). They were composed with a
5-day no-repeat window; the validator errors below 5 days and warns below 7. Five is not the most
this pool allows. Six majority-wrong claims are enough for one a day at a 6-day spacing: with the
composer fixed (it used to check only backwards from a claim's latest use, so a kept later day
blocked its claims on every earlier day), `compose-days --window 6` fills 2026-10-04..10-29 from
an empty folder with 0 validator errors, and also fills 10-16..10-29 around the days that have
already run. Seven is out of reach: any 7 straight days need 35 distinct claims and 7
majority-wrong ones, and the pool has 34 and 6. Raising the error threshold to 6 is your call; the
archive days 2026-10-09..10-14 already ran with 5-day gaps and must not change (progress is stored
by date and claim position), so the validator would have to stop checking days before `--from`.
A 7-day window needs at least one more verified claim and one more majority-wrong claim; more
headroom makes composing easier (the KFF 2024 misinformation waves and YouGov's 2026 conspiracy
update are the obvious sources). Two newer NSF figures exist (2018: Earth's core 86%, continents
79%) but the 2018 module n was not confirmed, so the 2012 wave ships.

## Checks that pass

- Lighthouse accessibility 100 and best practices 100 on `/` and `/play` (Chromium 141, headless).
- Hard-rule grep: no backdrop blur, no Inter/Roboto/Poppins/Montserrat/Space Grotesk, no
  purple/indigo/teal, no 🚀, no "misinformation", "media literacy" or "bias" in the app's own copy
  or in claim text, short titles, notes, question wording or truth lines (the validator warns on
  those fields). Pollster titles in `room.source` are cited verbatim and exempt: the reveal shows
  "KFF Health Misinformation Tracking Poll Pilot" as the source of 10 verified claims. Confetti,
  hard offset shadows and one hard-stop slider fill are now in, by the game-show layer above.
- First load ≈169 KB gzipped (JS + CSS, fonts excluded), over the 150 KB budget since the
  hackathon pass (code-splitting Second Look and the sound/confetti layer is the obvious fix).
  Draft claims are dropped at build time (`vite.config.ts`), so their numbers and VERIFY notes
  are not in it.
- Unit tests: geometry, scoring, storage/streaks, game state (resume and repair), share outcome,
  validator, calibration, Second Look (85 tests).
- `npm run check:flows` (exits 1 on any failed check): keyboard-only loop to results with focus
  checked at every step, storage-disabled play-through with the "Saving is off" notice, no page
  errors, zero axe-core violations on verdict, read, reveal and results. Lock to Next, timed in the
  page: ≈0.51s under reduced motion (designed 0.5s) and ≈2.32s in full (designed 2.29s), each
  allowed the design plus 0.4s.
