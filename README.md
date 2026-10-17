# Read the Room

**Can you tell what's true, and do you know when you're not sure?**

A two-minute daily game for students at the Claremont Colleges, built for the Open Academy
Information Integrity Hackathon. There are five claims a day. Through the 2026 midterms, three or four of them are about elections: California voter
registration, mail ballots, vote centers, voter ID, campus addresses, and the statistics that get
passed around in group chats.

For each claim, the player does three things:

1. **Judge the claim:** true or false.
2. **Rate your confidence:** 50% (coin flip), 70%, 90% or 100% (certain).
3. **Predict the room:** what share of people say this claim is true?

Then the reveal shows four things, in this order:
- **The truth.**
- **The evidence:** the authority that settles it, with a link.
- **What to notice:** the trick this claim uses and how to check one like it.
- **The room:** how people actually answered.

## The problem

College students meet election information in TikToks, group chats, reposts and dining-hall
advice. Mostly they decide what to trust by intuition. A wrong belief about an election rule costs
something real: a missed registration, a ballot mailed too late, a friend told they can't vote.

## The mechanism we target: overconfidence

The panel's observation was not "students believe misinformation." It was sharper. **Highly
educated students may be especially sure they can spot misinformation, and that confidence can run
ahead of their accuracy.** A student who is wrong and certain doesn't check, and they pass the claim
on.

There is a second, social mechanism. **People misjudge what their peers believe.** Perceived norms
shape what feels credible and safe to share. Students often assume "everyone knows" a rule, or that
"everyone is falling for" a rumor.

Read the Room makes players commit to all three judgments *before* any feedback. The learning
moment is the gap between them:

| You predicted | You find out |
| --- | --- |
| what's true | what the evidence says |
| how sure you are | how often you're right at that confidence |
| what others believe | what they actually believe |

Players should leave thinking *"the game measures whether I know when I might be wrong,"* not
*"I got 4 of 5."*

## How the game teaches it

- **Confidence is scored with a proper scoring rule (Brier).** 50% is worth 0 points either way.
  Right at 70% / 90% / 100% earns +3 / +5 / +5. Wrong at those levels costs −5 / −11 / −15.
  Certainty never earns more than "pretty sure," and it costs the most when wrong. Honest
  confidence is the best strategy (`tests/scoring.test.ts` checks this).
- **Every reveal names the call:** *sure and right*, *right but hedged*, *wrong but hedged*, or
  *a confident miss*.
- **Every reveal teaches a transferable check.** A one- or two-sentence `lesson` written for that
  claim's mechanism, for example:
  - "Old rule, new screenshot"
  - "Another state's rule"
  - "Your feed isn't the electorate"
  - "Number without its error"
- **The results screen leads with one behavioral insight from your actual play.** Examples:
  - "Sure, but wrong: you were 90%+ sure on 2 calls you got wrong"
  - "Accuracy 60%, confidence 80%, so you were more confident than your results justified"
  - "You expected false claims to fool more people than they did"
  - "Election rules got you 2 of 4 times"

  Then it shows accuracy next to felt confidence, the calibration gap, and the four call types.
- **One fact-check a day.** Before calling a claim, the player can spend the day's only fact-check
  to open the authority that settles it (the Secretary of State, the county registrar). It shows
  where to look, never the answer. This is lateral reading, the habit that separates professional
  fact-checkers from students (Wineburg & McGrew 2019; Breakstone et al. 2021; Brodsky et al. 2021).
  Because there's only one, spending it is a judgment about where you're least sure. Results say
  whether it was used well, or left unused on a confident miss.
- **Second Look.** Every call that was wrong at 90%+ comes back on `/second-look` 2 days later, then
  7 days after a right answer, until it's right twice; a miss starts the spacing over. Confident
  errors are the ones feedback fixes best (hypercorrection, Butterfield & Metcalfe 2001) but also the
  ones that return after a delay (Butler et al. 2011), and inoculation effects fade without retesting
  (Maertens et al. 2021, 2025). `/second-look?demo` plays two sample retests without touching storage.
- **Hard claims.** 19 claims are difficulty 3: surprising truths (ballot selfies are legal, counties
  open mail ballots 29 days early) and near-misses of real rules (17-year-olds can't vote in the
  primary; Prop 18 failed). Every day from Oct 17 has at least two, in easy-to-hard order, and the last
  claim is tagged "Last one, and it's a hard one."
- **Stats** track calibration across days. One row per confidence level shows how often you were
  right when you said 70%, 90% and so on.

### Scoring

The day score runs from 0 to 100. Truth is the core and the crowd read is secondary.

| Part | Points |
| --- | --- |
| Calls | 10 per right call (0–50) |
| Confidence | Brier points summed (−75 to +25) |
| Read | Crowd-prediction score ÷ 4 (0–25) |

No degenerate strategy wins:
- Always saying 50% forfeits the confidence points.
- Always saying 100% pays 15 per miss.
- A perfect crowd read is worth half as much as five right calls.

## Social proof: the risk we designed around

If a player sees "72% believed this false claim," the false belief can start to look normal. The
reveal is built so popularity never reads as evidence:

1. **The truth is the loudest element.** The banner says *It's false* or *It's true* next to
   *Correct* / *Nope*, the stamp lands on the true side of the room, and the first block under the
   room is *Why it's false*, with the source.
2. **The room comes last, under its own heading.** It is framed as what people believed.
3. **When the room's larger side was wrong, the reveal says so plainly.** Examples:
   - "Most of the room believed it. It was still false."
   - "Popularity isn't evidence."
   - "Most of the room doubted it. It's true anyway."
4. **Crowd misperception is about people, not truth.** For example: "You expected 60% to say true.
   34% did. Fewer people fall for this than you assumed."

## Other unintended effects

| Risk | Mitigation |
| --- | --- |
| **Reactance.** Being told "you're wrong" invites pushback. | Players predict first and the evidence reveals the mismatch, so correction feels like discovery. The source is one tap away. |
| **Overconfidence from the game itself.** A player could finish a round feeling like an expert detector. | The headline insight and the confidence points are about calibration. A 5-for-5 player who was certain on a lucky guess still sees the gap. |
| **Memorizing answers instead of learning to check.** | Every lesson teaches a check that works on unseen claims. The pilot below measures performance on **held-out** claims. |
| **Fabricated crowds.** | See the next section. |

## What is real data and what isn't

- **National rooms are real polls.** Each one is a named survey (YouGov, KFF, Pew, Reuters/Ipsos,
  NSF and others) with field dates, n and a link, shown under *The room*.
- **No 5C survey has been run yet.** Most California election-rule claims have never been polled
  anywhere. Those claims use a **demo crowd**. It has a dashed *Demo crowd* tag, the line "an
  illustrative split, not survey data," and a note that the 5C pilot survey replaces it. The
  validator enforces this: an `illustrative` room must say "demo" in its label and source, must
  have `n: 0`, and must have no dates or URL.
- **Demo crowds are left out of every crowd insight on the results screen,** so the game never
  draws a lesson about real people from them.
- **Every truth claim links to the authority that settles it.** For election rules, that means the
  California Secretary of State and the LA County Registrar. Links were checked live on
  Oct 16, 2026 with `npm run validate -- --online`. A few journal and museum sites refuse
  automated requests (HTTP 403); those pages load in a browser.

## Campus pilot (proposed)

*We have not run this study.* It is the plan for testing whether Read the Room works.

**Participants.** About 120 students across the five Claremont Colleges, recruited through college
listservs and randomized into two arms.

**Baseline (day 0, ~10 min).** 12 unfamiliar election-information claims, never shown in the game.
For each claim, measure:
- the true/false judgment
- confidence (50–100)
- the estimated share of 5C peers who'd believe it
- "Would you share this with a friend?" (1–5)
- whether they click "check the source" when it's offered

**Intervention (2 weeks).**
- **Arm A** plays Read the Room daily, five claims a day.
- **Arm B** (active control) reads **fact-check cards with exactly the same claims, verdicts,
  sources and lessons**, but makes no predictions and gets no confidence or crowd feedback.

**Post-test (day 15, and again at day 45).** 12 new held-out claims, with the same measures.

**Primary outcomes.**
- **Calibration:** the gap between mean confidence and accuracy, and the Brier score.
- **High-confidence errors:** wrong answers given at 90% or more.

**Secondary outcomes.**
- **Truth discernment:** accuracy, or d′ between true and false claims.
- **Verification:** the share who check a source before answering when they're unsure.
- **Sharing:** willingness to share claims that turned out false or uncertain.
- **Norm perception:** error in estimating what peers believe, and agreement that "popular means
  probably true."

**Why the control matters.** A vs B isolates the game's contribution: committing to an answer,
a confidence and a peer prediction before seeing the evidence. B delivers identical facts.

**Pilot crowd data.** In the same window, a short anonymous 5C Google Form
(`content/campus-survey.md`) collects real student answers to the demo-crowd claims. Those replace
the illustrative splits, so in production "the room" really is "students like you."

## Scale

The core is community-agnostic: claims are JSON, rooms are any polled population, and day files
pick five. The current deployment is tailored to the Claremont Colleges and LA County election
rules. The same engine works for any campus, a local election office, a newsroom's reader panel,
a high-school civics class, or a civic organization. Each one needs its own claims and its own
room survey.

---

## Run it

```
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # runs the content validator first (prebuild), then vite build → dist/
npm run preview      # serve dist/ on :4173
npm run validate     # content rules (see content/AUTHORING.md)
npm run validate -- --online    # also fetches every source and truth URL
npm run compose-days -- --from YYYY-MM-DD --to YYYY-MM-DD [--window 5] [--election 3] [--hard 2] [--ramp] [--skip ids] [--force [--allow-past]]   # fill day files from the verified pool
npm run test         # unit tests: geometry, scoring + calibration + insight, storage, game state, share outcome, validator
npm run screenshots  # Playwright: every screen at 390×844 and 1280×800 → design/screens/
npm run check:flows  # Playwright: keyboard-only loop, storage disabled, reduced motion, axe scans; exits 1 on any failure
```

Flags for an npm script go after `--` (`npm run validate -- --online`); without it npm keeps them
for itself and the script never sees them. `screenshots` and `check:flows` drive a running app:
start `npm run dev` in another terminal first (or point them at another server with
`BASE=http://127.0.0.1:4173` after `npm run preview`), and install a Chromium once with
`npx playwright install chromium` (or set `CHROMIUM_PATH`).

Node 22 (22.12 or later), 24, or 26+ (`engines` in `package.json`); `.nvmrc` and `.node-version` pin
22.22.0 for nvm, fnm and Cloudflare Pages. Deploy as a static site: Cloudflare Pages (`wrangler.toml`;
deep links rely on Pages' default single-page-app mode, so keep `dist/` free of a top-level
`404.html`) or Vercel (`vercel.json`). Build command `npm run build`, output `dist`.

There is no backend, no accounts and no model at runtime.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Home: the question, the three steps, Play, streak, How to play (4 panels, including the confidence points). |
| `/play` | Judge → how sure → predict the room → reveal (truth, evidence, what to notice, the room), five times. `/play?day=YYYY-MM-DD` plays a past day from the archive (doesn't count); a future date falls back to today. |
| `/results` | Insight headline, score breakdown, felt-sure vs right, the four call types, dials, five rows, Share. |
| `/stats` | Lifetime accuracy, calibration by confidence level, streak, calendar. |
| `/archive` | Past puzzles, playable, labeled "archive — doesn't count". |
| `/c/:id` | Read-only reveal for one claim (deep link). |
| `/second-look` | Spaced retests of confident misses. `?demo` plays two sample retests. |

## Content

- `content/claims/*.json` holds one claim per file. Only `status: "verified"` ships: the build turns
  drafts into `null` (`vite.config.ts`), and files starting with `_` are templates that never ship.
- Each claim carries:
  - `truthSource`: the authority, a link, and one line
  - `lesson`: `{ pattern, tip }`
  - optionally `seenIn`: a scenario frame such as "a group chat on election night." This describes
    where a student might meet the claim. It is not a claim that the post exists.
- `content/days/YYYY-MM-DD.json` lists five claim ids per day (America/Los_Angeles).
  - 2026-10-15 is the hand-picked demo round: photo ID, same-day registration, noncitizen voting,
    alcohol and cancer, and the 7-day mail-ballot rule.
  - From 2026-10-16 through Election Day (Nov 3), every day has 3–4 election claims.
- `content/AUTHORING.md` explains how to add a claim. It is written for a non-engineer.
- `content/campus-survey.md` explains how to run the 5C room survey.
- `scripts/validate-content.ts` fails the build on any content-rule violation.

**Content status:** 65 verified claims (30 election, 19 hard), 27 drafts. Drafts carry a `VERIFY` or
`HUMAN:` note saying what still needs checking. `design/REVIEW.md` lists open decisions.
Day files use a 5-day no-repeat window (the validator errors under 5 days and warns under 7).

## Design

The CSS is hand-written on a small token system in `src/tokens/`:
- **Type:** Newsreader for claims; Archivo and Archivo Narrow for labels.
- **Colors:** paper and ink, with vermilion reserved for *you*. There is a small game-show layer of
  push-buttons, confetti made of dots, synthesized sound, and yellow and green for combos and
  correct calls. There are no partisan colors.
- **Modes:** dark mode follows `prefers-color-scheme`. Reduced motion collapses the reveal to a
  single crossfade.
- **Color is never the only signal.** TRUE and FALSE always carry a word, and the true and false
  tiles differ by filled vs. hollow icon.

`src/lib/geometry.ts` is the single source of truth for drawing the room. Places where a person
should make the final call are marked `// HUMAN:` in code.

## Known limitations

- Crowd numbers for most California election-rule claims are illustrative until the 5C survey runs.
- Scores, streaks and stats live in `localStorage` on one device. There is no cross-device sync,
  and no aggregate "players so far" room yet. A `roomOverlay` hook exists in the day schema for it.
- The no-repeat window is 5 days, because election claims recur often through Election Day. The
  validator warns about repeats under 7 days.
- The first-load JS is about 161 KB gzipped, which is over the original 150 KB budget, mainly from
  bundled content.
