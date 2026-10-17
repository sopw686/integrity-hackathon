# Campus room survey

Campus claims need a room of 5C students. We measure it ourselves with one Google Form. This file covers how to run it and how to turn the results into `room` numbers for the claim files.

## Setup

- **Tool:** one Google Form, owned by a team account. Results go to a linked Google Sheet.
- **When:** open it two weeks before launch. Keep it open about one week, which leaves a week to fill in the claim files and verify answers.
- **Where:** send it to the 5C student listservs (one message per college list, plus any club lists that will forward it). One reminder halfway through.
- **Target:** n ≥ 100 complete responses. Below 100, do not publish the campus claims; the room is too small to read.
- **Questions:** the candidate claims below (items 23–30 are the student-life round; prefer them if the Form must stay short), each as a multiple-choice question with exactly three options, in this order: **True**, **False**, **Not sure**. Make every question required so each response answers every item. Shuffle question order (Settings → Presentation → Shuffle question order).
- **Wording:** each Form question is the claim text exactly as it will appear in the game. If you change the text after the survey, the room numbers no longer apply. Never ask a different question that seems close: for `three-branches` the Form asks whether *most Americans* can name the three branches (the claim), not whether the student can.
- **No other questions.** No class year, no college, no demographics. We do not need them and they make responses easier to identify.

**Priority for the pilot:** every claim with `"kind": "illustrative"` in `content/claims/` (the election set: photo ID, same-day registration, 7-day mail ballots, voting twice, campus address, provisional ballots, mail ballots counted, parole, signature mismatch, a friend returning your ballot, LA vote centers, ballots mailed to everyone, youth turnout, margin of error). Survey these first; their real 5C splits replace the demo crowds. When filling a room from the survey, change `kind` to `"campus"`, `label` to `"5C students"`, and remove the demo note.

## Consent and anonymity line

Put this at the top of the Form description:

> This survey is anonymous and voluntary. We do not collect names or email addresses, and you can stop at any time. Your answers are combined with everyone else's and shown as percentages in Read the Room, a daily game made by 5C students.

In Form settings, turn **off** "Collect email addresses" and "Limit to 1 response" (the latter requires sign-in and records who answered).

## Candidate claims

Thirty items. Items 1–12 and 23–30 already exist as drafts in `content/claims/`. Items 13–22 are suggestions; anyone who adds one needs to confirm its answer against an authority first and create the draft file.

| # | id | Claim text | Expected answer | Status |
|---|----|-----------|-----------------|--------|
| 1 | `claremont-council-ballot` | Claremont city council elections are on the same ballot as the November midterm. | true (confirm with city clerk) | draft file |
| 2 | `ca-same-day-registration` | In California, you can still register and vote on Election Day itself. | true | verified, demo crowd |
| 3 | `la-any-vote-center` | In LA County, you can vote in person days before Election Day, at any vote center in the county. | true | verified, demo crowd |
| 4 | `ca-mail-ballot-7-days` | A California mail ballot postmarked on Election Day still counts if it arrives up to 7 days later. | true | verified, demo crowd |
| 5 | `mudd-acceptance-rate` | Harvey Mudd's acceptance rate is below 10%. | false (check latest Common Data Set) | draft file |
| 6 | `shuttle-weekends` | The 5C shuttle runs on weekends. | true (confirm schedule) | draft file |
| 7 | `mudd-writing-course` | Harvey Mudd requires every student to take a half-course in writing. | true (confirm credit value) | draft file |
| 8 | `most-5c-from-california` | Most 5C students are from California. | false (confirm class profiles) | draft file |
| 9 | `pomona-endowment-harvard` | Pomona's endowment is larger than Harvard's. | false | draft file |
| 10 | `vote-with-campus-address` | College students in California can register to vote using their campus address. | true | verified, demo crowd |
| 11 | `three-branches` | Most Americans can name all three branches of government. | true (confirm the latest Annenberg Constitution Day survey) | draft file |
| 12 | `tiktok-news-under30` | More than 4 in 10 U.S. adults under 30 regularly get news on TikTok. | true (confirm the Pew social media and news fact sheet) | draft file |
| 13 | `ca-preregister-16` | In California, 16- and 17-year-olds can pre-register to vote. | true (CA SOS) | suggestion |
| 14 | `ca-every-voter-mailed-ballot` | California mails a ballot to every active registered voter. | true (CA SOS) | suggestion |
| 15 | `ca-photo-id-to-vote` | You need a photo ID to vote in person in California. | false, with exceptions for some first-time voters (CA SOS) | suggestion |
| 16 | `ca-someone-returns-ballot` | In California, you can have someone else return your mail ballot for you. | true (CA SOS) | suggestion |
| 17 | `ca-track-mail-ballot` | California voters can sign up to track their mail ballot online. | true (CA SOS) | suggestion |
| 18 | `ca-registration-15-days` | The regular voter registration deadline in California is 15 days before Election Day. | true (CA SOS) | suggestion |
| 19 | `5c-cross-registration` | Students at one 5C college can take classes at the other four. | true (registrar pages) | suggestion |
| 20 | `pomona-older-than-mudd` | Pomona College was founded before Harvey Mudd College. | true (college history pages) | suggestion |
| 21 | `pitzer-founded-1960s` | Pitzer College was founded in the 1960s. | true (Pitzer history page) | suggestion |
| 22 | `scripps-womens-college` | Scripps is a women's college. | true (Scripps admission page) | suggestion |
| 23 | `undergrads-vaped-past-month` | Most U.S. undergraduates vaped in the past 30 days. | false (ACHA-NCHA) | draft file |
| 24 | `college-no-partners-past-year` | About a third of U.S. college students had no sexual partners in the past 12 months. | true (ACHA-NCHA) | draft file |
| 25 | `college-binge-drinking-month` | Most full-time U.S. college students binge drank in the past month. | false (NIAAA/NSDUH) | draft file |
| 26 | `college-therapy-past-year` | Most U.S. college students received therapy or counseling in the past year. | false (Healthy Minds) | draft file |
| 27 | `college-depression-falling` | Rates of depression among U.S. college students have fallen since 2022. | true (Healthy Minds) | draft file |
| 28 | `a-most-common-college-grade` | A is the most common grade given in U.S. four-year college courses. | true (Rojstaczer & Healy) | draft file |
| 29 | `half-undergrads-no-ba-parent` | More than half of U.S. undergraduates have no parent with a bachelor's degree. | true (NCES NPSAS:20) | draft file |
| 30 | `opt-in-nuclear-submarine` | In a 2022 online poll, 12% of adults under 30 said they were licensed to operate a nuclear submarine. | true (Pew) | draft file |

Draft files keep the category they already have (`three-branches` is `"society"`, `tiktok-news-under30` is `"media"`). For new suggestions, use `"category": "election"` for the California voting items and `"campus"` for the rest. Before sending the Form, check every item against the ineligible list in `AUTHORING.md`.

## From Form results to `room` numbers

For each claim, count the responses in its column of the results sheet:

| Field | Value |
|-------|-------|
| `pctTrue` | share who chose True, as a percentage |
| `pctFalse` | share who chose False |
| `pctUnsure` | share who chose Not sure |
| `n` | exact number of responses to that question |
| `label` | `"5C students"` |
| `kind` | `"campus"` |
| `source` | `"5C student survey (team)"` |
| `sourceUrl` | link to the public summary sheet (see below), never the form-linked results spreadsheet |
| `fieldDates` | the Form's open–close dates, e.g. `"Sep 28–Oct 4, 2026"` |
| `questionWording` | leave out if the Form question is identical to `text` |

**Rounding.** Round the three shares to whole numbers so they sum to exactly 100. Use the largest remainder: round all three down, then add 1 to the share(s) with the largest decimal part until the total is 100. Example: 47.6 / 38.3 / 14.1 rounds down to 47 / 38 / 14 = 99; the largest remainder is .6, so the result is 48 / 38 / 14.

Then remove the `HUMAN:` text from `room.note` (delete `note` entirely unless there is a real caveat), confirm `answer` against `truthSource`, have a second person reread it, set `status` to `"verified"`, and run `npm run validate` (it stops the build if a verified claim still carries `HUMAN:` or `VERIFY` text).

Keep the form-linked results spreadsheet (the `Responses` and `Summary` tabs) shared with the team only. Its `Timestamp` column and row order can identify a respondent (anyone who knows when a friend filled in the Form can find their row), and the consent line promises percentages only.

For the public `sourceUrl`, make a separate spreadsheet that holds only the `Summary` rows, pasted as values (claim, n, counts and percentages), and share that one view-only with anyone with the link. Do not just hide the `Responses` tab: Google Sheets shares whole files, and a viewer can copy the file and see every tab.

## Results sheet template

Tab 1, `Responses`: Google Forms creates this. Columns: `Timestamp`, then one column per question (the claim text). Do not edit it. This tab stays private.

Tab 2, `Summary`: one row per claim.

| claim_id | text | n | count_true | count_false | count_not_sure | pct_true_raw | pct_false_raw | pct_unsure_raw | pctTrue | pctFalse | pctUnsure | sum_check | answer | truth_source_url | checked_by |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

Formulas, assuming the claim's response column is `Responses!C:C`:

- `count_true`: `=COUNTIF(Responses!C:C, "True")`
- `count_false`: `=COUNTIF(Responses!C:C, "False")`
- `count_not_sure`: `=COUNTIF(Responses!C:C, "Not sure")`
- `n`: `=count_true + count_false + count_not_sure`
- `pct_*_raw`: `=100 * count / n`
- `pctTrue`, `pctFalse`, `pctUnsure`: rounded by hand with the largest-remainder rule above
- `sum_check`: `=pctTrue + pctFalse + pctUnsure` (must be 100)
