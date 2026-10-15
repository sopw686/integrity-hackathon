# Content round 3: claims that land on students

Goal: replace "any college student gets this right" items (flat earth, moon landing) with claims that
are about students' own lives — drinking, sex, money, phones, AI — and where the room is surprising.

Method: five parallel search passes (health, money, tech/AI, young-adult belief polls, campus life).
Reddit and forums were used only to judge which topics resonate; every room is a named survey.
Poll hosts are blocked from this environment, so figures were read from search results quoting the
pollster's page or topline. Each pass hit the shared search cap, so most items are draft with a
`VERIFY` note naming the exact gap. Opening the linked topline in a normal browser closes most gaps
in a few minutes each.

## Shipped as verified (3)

| id | room | truth side | why it lands |
|---|---|---|---|
| `alcohol-raises-cancer-risk` | Annenberg/SSRS, Sep 2024, n=1,744: 40 / 20 / 40 | 40% (true) | Party culture; most of the room didn't know. Note carries the post-advisory rise to 56%. |
| `wifi-encrypted-by-default` | Pew, Jun 2016, n=1,055: 11 / 45 / 44 | 45% (false) | Campus and café Wi-Fi. |
| `holocaust-six-million` | Pew, Feb 2019, n=10,971: 45 / 25 / 29 | 45% (true) | Fewer than half of adults picked the right number. |

All three have a wrong-side majority, the pool's bottleneck. They replace a repeated claim on
2026-10-17, 10-21 and 10-25.

## Draft, national room (close one gap each)

| id | headline number | gap |
|---|---|---|
| `private-browsing-hides-little` | Pew 2019: 24% knew what incognito hides; 49% not sure | wrong-option shares (KNOW8 in topline) |
| `plan-b-ends-pregnancy` | KFF Jan 2023: 73% of those who'd heard of it think Plan B can end a pregnancy | was "not sure" folded into 73? |
| `tax-bracket-all-income` | Tax Foundation/PPP 2024: 34 all / 48 some / 18 unsure | field dates, n (2,064 vs 2,700+), panel type |
| `nicotine-causes-cancer` | HINTS-FDA 2015: 49% think nicotine causes most smoking cancer | don't-know share |
| `hpv-causes-oral-cancer` | HINTS 2020: 30% know HPV causes oral cancer | no/unsure split, n, dates |
| `astrology-is-scientific` | GSS 2016, ages 18–24: 44% say at least "sort of scientific" | read age row directly; n |
| `chatgpt-word-patterns` | Pew May 2023: 32% know how chatbots produce answers | wrong/unsure shares |
| `holocaust-myth-under-30` | Pew Jan 2024: 3% of under-30s agree (opt-in poll said 20%) | disagree/neither split, under-30 n |

## Draft, campus room (needs the 5C survey)

These are the strongest fit for the game: national data shows students badly misread their peers.
The truth side is settled; the room is what 5C students think. Add them to the Form.

| id | truth |
|---|---|
| `undergrads-vaped-past-month` | 14% vaped in 30 days; students guessed the typical student did (85%) |
| `college-no-partners-past-year` | 33% had no partners in 12 months |
| `college-binge-drinking-month` | 33% of full-time students binge drank in the past month |
| `college-therapy-past-year` | 37% got therapy or counseling last year |
| `college-depression-falling` | depression fell 44% → 37% since 2022 |
| `a-most-common-college-grade` | about 43% of grades are A's |
| `half-undergrads-no-ba-parent` | 54% of undergrads have no parent with a BA |
| `opt-in-nuclear-submarine` | 12% of opt-in under-30s claimed a nuclear-sub license (Pew test) |

## Watch out: opt-in youth numbers

The most viral "Gen Z believes X" numbers come from opt-in online panels, and Pew showed those
are inflated by bogus respondents who skew young and say yes (Holocaust myth: 20% opt-in vs 3% on
Pew's probability panel; 12% of opt-in under-30s "licensed" to run a nuclear submarine). Do not
ship a youth crosstab from an opt-in panel (YouGov, Harris, most brand surveys) as the room.

## Rejected

- Credit myths (Capital One, NerdWallet/Harris, LendingTree, FICO): striking (e.g. 49% of Gen Z think
  credit bureaus are government-run) but opt-in, sponsored by interested parties, and no full split.
- Moderate drinking is healthy, marijuana smoke vs tobacco, vaping vs smoking: truth not settled.
- Touching fentanyl causes overdose: no general-public poll; good 5C survey candidate.
- Phone listening for ads, AI consciousness: no settling authority.
- 10% of brain, five-second rule, knuckle cracking, sugar and hyperactivity: no named poll with a split.

## Flag on existing content

`mmr-autism` cites the CDC autism page as its truth source. In November 2025 that page was changed
to call "vaccines do not cause autism" not evidence-based (the headline kept, with an asterisk).
The reveal link may now undercut the claim; consider citing the National Academies (as
`vaccines-autism` does) or the AAP instead.
