# Read the Room: five-minute pitch

About 815 words, five minutes at a brisk 165 words a minute. If a run-through goes long, drop the
"Students misjudge each other" paragraph (about 10 seconds) first. Timings are targets. The demo
sections are shot as screen recording with voiceover; the rest can be a face on camera or the title card.

The section order follows the organizers' questions: problem, evidence, solution, mechanism,
implementation, evaluation, scalability.

## Script

### Problem (0:00–0:35)

*[On camera, or the claim card from the shot list]*

Here's a claim from a group chat: "In California, you need a photo ID to vote in person." Plenty of smart
students would call that true, and they'd say it like they were sure. It's false.

We aren't chasing hoaxes. We're after ordinary election rules that students are confidently wrong about,
so they never check, and they repeat it to a roommate. You can see the
cost in California's numbers. In 2018, voters aged 18 to 24 had mail ballots rejected at about three times
the overall rate, mostly for arriving late or signature problems.

### Evidence (0:35–1:25)

A few findings shaped everything we built.

Overconfidence is normal. In a PNAS study of about 8,300 Americans, 73% overrated how well they could
spot false headlines. The overconfident ones were more willing to share false stories.

Corrections also fade. Belief in a debunked myth drifts back within about a week. The mistakes you
make while very sure get fixed best by feedback, because the surprise makes you pay attention, but
they're also the likeliest to come back.

Students misjudge each other, too. They guess wrong about what their peers believe, and that guess shapes
what feels safe to repeat.

And then there's the feed. Professional fact-checkers don't study the post. They
leave it and look up who's behind it, and in a Stanford study they beat Stanford undergrads at spotting
unreliable sources.

### Solution (1:25–2:35)

*[Screen recording starts]*

So we built Read the Room, a two-minute daily game for the 5Cs. Five claims a day, three or four of them
California election rules. For each one you say true or false. Then you say how sure you are: 50, 70, 90
or 100 percent. Then you guess how many people in a polled group believe it. You commit to all of that
before you see anything.

This one's tagged as a hard one. "A Californian who's 17 on primary day but turns 18 by November can vote
in the primary." It sounds right, and a lot of states allow it. I'm not sure, so I'll spend my one
fact-check for the day. It doesn't hand me the answer. It sends me to the California Secretary of State,
which is where a real fact-checker would go.

False. California voters turned that down in 2020, Prop 18, 56 to 44. The reveal leads with the truth and
the source. Then it names the trick, "proposed, not passed," and how to catch the next one. What the crowd believed comes last, and when most of the crowd got it wrong, the game says so plainly.

### Mechanism (2:35–3:20)

The confidence step uses a proper scoring rule. Being certain never earns more than
being pretty sure, and a certain miss costs fifteen points. The only winning strategy is being honest
about what you know.

The results screen opens with your own pattern, like "One confident miss: you were 90% sure about Voting
from jail. It was true."

Those confident misses don't disappear. Two days later they come back as a Second Look, and again a week
after you get one right. That's based on the hypercorrection research, and on 2025 work showing
memory boosters keep inoculation from wearing off. One-off games fade within a couple of months without
retesting. A daily game retests by design.

### Implementation (3:20–3:55)

*[Back on camera, or the home screen]*

The game runs today. It's a static website with no logins, 65 claims checked against named sources, and
a puzzle for every day through Election Day.

The 5C pilot is small. A faculty advisor and a second student re-check every claim, and we'd ask the LA
County Registrar to review the election ones. A three-minute anonymous survey on
the listservs swaps our labeled demo crowds for real 5C answers. Then the link goes out through student
governments, civic-engagement offices, RA floor chats, and a QR code on dining-hall tables that just asks
"How sure are you?"

### Evaluation (3:55–4:30)

To test it we'd randomize about 120 students. Half play the game daily for two weeks. The other half read
fact-check cards with the exact same claims, sources and lessons, so the only difference is the game
itself. Both groups take a test of election claims they've never seen, at the start, at two weeks and at
six weeks. Our main outcomes are calibration and the number of wrong answers given at 90% or higher. We'll
also track whether they open the source when they're unsure and whether they'd share a false claim.

### Scalability (4:30–5:00)

Nothing in the engine is specific to Claremont. A claim is one small file with its verdict, its source and
its poll. Another campus needs its own state's rules and its own three-minute survey, and honestly
California was the hardest state to write. The ongoing cost is keeping claims accurate, which a shared
library run by campus civic offices could carry.

If the pilot doesn't move calibration, we'll report that and redesign. If it does, the next step is
starter packs for other states before the 2028 primaries.

## Shot list

Record in a fresh browser profile or private window so the How to play dialog and empty stats look like a
first visit, at phone width (390 px) or a narrow desktop window. Turn sound on; the stamp and confetti read
well on video. Every URL below works on `npm run dev` (127.0.0.1:5173) or the deployed site.

The demo day is **Oct 31** (`/play?day=2026-10-31`). Its claims, in order: Voting twice (false), Vaccine
sudden deaths (false), Register on Election Day (true), **Voting at 17** (false, hard), **Voting from jail**
(true, hard, the last claim). Before Oct 31 the header shows "archive — doesn't count"; on the day itself it
doesn't.

| Time | Screen | What to do | Notes |
| --- | --- | --- | --- |
| 0:00 | Title card, or the photo-ID claim | Optional: show `/c/ca-photo-id` | Read-only reveal page, good still for the opening line |
| 1:25 | `/play?day=2026-10-31`, claim 1 | Let the countdown run, then show the three steps on claim 1 (pick False, 70%, slide the guess, Lock) | Cut claims 2–3 in the edit. Answer them right so the hard ones are the focus |
| 1:55 | Claim 4, Voting at 17 | Hold on the **Hard one** chip. Click **Check it first** (or press C) | The card shows "California Secretary of State · elections.cdn.sos.ca.gov". Optionally open the link in a new tab for two seconds |
| 2:10 | Claim 4, sure step and reveal | Pick False, 90%, lock. Let the full reveal play: stamp, banner, "Why it's false", "What to notice · Proposed, not passed", then the room | The room is a tagged demo crowd (45% said true). Point at the **Demo crowd** tag if there's time |
| 2:35 | Claim 5, Voting from jail | Tag reads "Last one, and it's a hard one". Pick **False at 90%** on purpose | This gives the results screen a confident miss to show |
| 2:50 | `/results` | Hold on the headline ("One confident miss…"), then the fact-check line ("You spent your fact-check on 'Voting at 17'…") and the felt-sure vs right bars | On a live (non-archive) day there's also a line saying the miss comes back in 2 days |
| 3:05 | `/second-look?demo` | Answer the first retest wrong (False, 100%) to show "wrong again, coming back in two days", then the second right | Demo mode never touches saved data. Header reads "Second look · demo" |
| 3:20 | `/` home | Show the tagline and Play button, then `/stats` briefly | Covers implementation while talking |
| 4:30 | GitHub repo or `content/claims/` folder | Scroll one claim JSON file | Backs up "a claim is one small file" |

## Likely judge questions

**Doesn't showing that most people believed a myth make it seem more normal?**
That's a real risk. Cialdini's Petrified Forest work found that signs saying many visitors steal wood
increased theft. So the truth and source always come first, the crowd comes last under its own heading, and
when most of the crowd was wrong the reveal says "Popularity isn't evidence." Repeating a myth inside a
correction hasn't been shown to backfire (Ecker, Lewandowsky & Chadwick, 2020).

**Won't players just learn to say "false" to everything?**
That's the failure Guay et al. (2023) warn about, and it's why we score discernment and calibration rather
than skepticism. About 40% of the claims are true, and half of our 12 new hard claims are surprising truths,
like ballot selfies being legal. A player who says false to everything loses points on every one of them.

**Your crowd numbers for election rules are made up, aren't they?**
For the California rules nobody has polled, yes, and the game says so on every one: a dashed "Demo crowd"
tag and "an illustrative split, not survey data." The build fails if a demo crowd isn't labeled that way, and
demo crowds are left out of every insight on the results screen. The 5C survey in week one replaces them.
The national claims use named polls with dates and sample sizes.

**Why a game and not a workshop or a poster campaign?**
Games do move people. Harmony Square, built with CISA, made players rate manipulative election posts as less
reliable (d around 0.5). But game effects fade faster than text or video ones (Maertens et al., 2025), and
without retesting the Bad News effect was gone by about two months (Maertens et al., 2021). A daily game with
Second Look keeps retesting, which a one-time workshop can't do.

**Doesn't the fact-check button just give away the answer?**
It gives away where to look, which is the skill. Reading the source to find the rule is lateral reading.
In Breakstone et al. (2021), college students who were taught it went from 3% to 77% reading laterally, and
Brodsky et al. (2021) found similar gains in a civics course. You only get one a day, so you also have to
decide which claim you're least sure about.

**Is there evidence that calibration training carries over to real life?**
Partly. Lichtenstein and Fischhoff (1980) found feedback improved calibration, though modestly, and the
Lyons et al. (2021) link between overconfidence and sharing false news is correlational. We don't want to
oversell it. That's why the pilot tests on held-out claims against an active control that gets the same
facts.

**Is 120 students enough?**
For a definitive answer, no. Inoculation effects on discernment average around d = 0.2 in the meta-analysis
by Lu et al. (2023), and detecting that between groups would take several hundred people. The pilot is for
feasibility and a first effect-size estimate on our primary outcomes. If it looks promising, the next round
pools several campuses.

**How do you keep the content accurate and nonpartisan?**
Every election claim cites the Secretary of State or the county registrar, and a second person rereads each
claim against its source before it ships. Our authoring rules exclude live political disputes, horse-race
numbers and value judgments, and a day can include at most one election claim that names a party or
candidate. We'd ask the county registrar's office to review the election claims before the pilot.
