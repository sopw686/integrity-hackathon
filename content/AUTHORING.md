# Adding a claim

How a claim gets from a poll into the game. Each claim is one JSON file in `content/claims/`; each day is one JSON file in `content/days/` that lists five claim ids. `npm run validate` checks both, and the build will not run if it fails.

## 1. Find a poll

A claim needs a room: a real measurement of what a group of people believed. Two kinds count.

- **A named national survey.** YouGov, Pew, Gallup, AP-NORC, KFF, Ipsos, Monmouth, Annenberg, and similar. You need the published field dates, the sample size (n), and the share who said true / false / not sure. Link the pollster's own page or topline PDF, not a news article about it.
- **The team's 5C survey.** For campus claims. See `content/campus-survey.md`.

If you cannot find the field dates and n, the poll does not count.

## 2. Copy the poll's exact wording

Paste the question and the response options from the topline into your notes before you write anything. The claim text should be the poll's statement in plain declarative form ("The 1969 moon landing was faked."), ending in a period, 220 characters or fewer. If the claim text differs at all from what respondents saw, put the poll's own wording in `room.questionWording`.

## 3. The polarity rule

Never flip polarity between the poll and the claim.

If the poll measured belief in a false statement, the claim *is* that false statement. `answer` is `"false"`, and `pctTrue` is the share who believed it.

Example: YouGov asked whether the moon landing was faked and 18% said yes. The claim is "The 1969 moon landing was faked." with `answer: "false"` and `pctTrue: 18`. Do not rewrite it as "The moon landing was real." with `pctTrue: 82`. The poll did not measure that, and "not faked" plus "not sure" is not the same as "real."

The validator cannot check this. A second person rereads every claim against the poll wording before it goes to `verified`.

## 4. What is not eligible

- Live political disputes: anything a current campaign or party is arguing about.
- Horse-race numbers: who is ahead, who will win, approval ratings.
- Value judgments: "X is good policy", "X is the best way to ...".
- Contested history: anything where credible historians disagree.
- Private individuals. Public figures and places only.
- Anything where the truth source is an opinion, a press release from an interested party, or a single news story.

The truth source should be the authority that settles the question: a statute, an agency, a court record, a peer-reviewed consensus statement, an official catalog.

## 5. Fill the JSON

Create `content/claims/<id>.json`. The file name (without `.json`) must equal `id`. Ids are lowercase words joined by single hyphens: `moon-landing-faked`.

The shape (from `src/lib/types.ts`):

```jsonc
{
  "id": "moon-landing-faked",                  // kebab-case, same as the file name
  "text": "The 1969 moon landing was faked.",  // the claim as the room was asked; ends with a period; ≤ 220 chars
  "shortTitle": "Moon landing",                // optional, 2–4 words, for results rows
  "answer": "false",                           // "true" or "false" as a string
  "room": {
    "kind": "national",                        // "national" or "campus"
    "label": "U.S. adults",                    // who was asked: "U.S. adults" or "5C students"
    "pctTrue": 18,                             // share who said the claim is true (definitely + probably)
    "pctFalse": 65,                            // from the topline: probably false + definitely false
    "pctUnsure": 17,                           // from the topline; the three must sum to 100 (±1)
    "source": "YouGov",
    "sourceUrl": "https://today.yougov.com/…", // the pollster's page for this survey; https only
    "fieldDates": "Nov 9–13, 2023",
    "n": 1000,
    "questionWording": "…",                    // the poll's own wording, if it differs from text
    "note": "…"                                // optional caveat shown on reveal; required in practice for surveys older than 5 years
  },
  "truthSource": {
    "label": "NASA",                           // the authority that settles it
    "url": "https://www.nasa.gov/…",           // the specific page; https only
    "oneLine": "…"                             // one sentence shown on reveal
  },
  "category": "science",                       // election | campus | health | science | society | media
  "difficulty": 1,                             // 1 easy, 2 medium, 3 hard
  "status": "draft"                            // "draft" until checked, then "verified"
}
```

Worked example, moon landing: YouGov, fielded Nov 9–13, 2023, n = 1,000 U.S. adult citizens. The topline row reads 7% definitely true, 11% probably true, 14% probably false, 51% definitely false, 17% not sure, so `pctTrue: 18`, `pctFalse: 65`, `pctUnsure: 17`. Always take the shares from the topline. Do not estimate them. If the topline splits "definitely" and "probably", add them together. If the three shares sum to 99 or 101 because of rounding, leave them as published.

The real file must be plain JSON: no comments, no extra keys. Unknown keys are an error.

## 6. Set the status

- `"draft"`: still being filled or checked. Drafts may have zeros and empty strings. The game ignores them.
- `"verified"`: every field is filled from the source, a second person has reread the claim against the poll wording, and both links open. Only verified claims can go on a day.

## 7. Run the validator

```
npm run validate                               # coverage from today (Pacific time)
npx tsx scripts/validate-content.ts --from 2026-10-15
npx tsx scripts/validate-content.ts --online   # also opens every source and truth link
npx tsx scripts/validate-content.ts --days 21  # require 21 days of coverage instead of 14
```

`✗` lines are errors and block the build. `△` lines are warnings: read each one and decide. The validator warns when:

- a survey is more than 5 years old and has no `room.note`;
- verified claims have no `questionWording` (a reminder to reread polarity by hand);
- the claim text has two capitalised words in a row that are not on the allowlist. Confirm it is not naming a private person.

## 8. Put it on a day

Day files are `content/days/YYYY-MM-DD.json` (Pacific date):

```json
{ "date": "2026-10-15", "claims": ["id-one", "id-two", "id-three", "id-four", "id-five"] }
```

The order in the array is the play order.

## 9. Day rules

Each day must have:

- exactly five distinct ids, all `verified`;
- at least one claim whose answer is `"true"`;
- at least one claim where the room majority was wrong (the share on the truth side is 50 or less: `pctTrue` when the answer is true, `pctFalse` when it is false);
- at least two categories;
- at most one `election` claim that mentions a party or candidate (Democrat, Republican, GOP, Trump, Biden, Harris, Obama, and so on, or the word "party").

Across days:

- the same claim cannot appear twice within 7 days (error), and should not within 14 days (warning);
- the next 14 days from today must all have a valid day file.

## Checklist

1. Poll is a named survey or the team's 5C survey, with field dates and n.
2. Poll's exact wording copied into notes.
3. Claim text matches the poll's polarity; not flipped.
4. Claim is eligible: no live disputes, horse-race, policy opinions, contested history or private people.
5. `pctTrue`, `pctFalse`, `pctUnsure` copied from the topline and sum to 100 ±1.
6. Truth source is the settling authority, with a working https link and one plain sentence.
7. File name equals `id`; `category` and `difficulty` set.
8. Second person reread the claim against the poll, then `status` set to `"verified"`.
9. `npm run validate` shows no `✗` for the file; warnings read and handled.
10. Added to a day that still meets the day rules, with no repeat inside 7 days.
