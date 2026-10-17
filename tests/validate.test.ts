import { describe, expect, it } from 'vitest'
import { PARTY_RE, addDays, suspiciousNames, validateContent, type ContentFile } from '../scripts/validate-content'

const FROM = '2026-10-15'
const SLOT_CATEGORIES = ['science', 'health', 'society', 'media', 'campus'] as const

/** Fixture data is mutable JSON; tests reach into it freely, so type it loosely. */
type FixtureFile = ContentFile & { data: Record<string, any> }
type Fixture = { claims: FixtureFile[]; days: FixtureFile[] }

/** Claim k sits in slot k % 5. Slot 0 is the "fox" claim: answer true, room mostly said false. */
function makeClaim(k: number) {
  const slot = k % 5
  const fox = slot === 0
  const id = `synthetic-claim-${k}`
  return {
    file: `content/claims/${id}.json`,
    data: {
      id,
      text: `Synthetic claim number ${k} is a plain statement.`,
      answer: fox ? 'true' : 'false',
      room: {
        kind: 'national',
        label: 'U.S. adults',
        pctTrue: fox ? 30 : 20,
        pctFalse: fox ? 60 : 70,
        pctUnsure: 10,
        source: 'YouGov',
        sourceUrl: 'https://example.com/poll',
        fieldDates: 'Jan 5–9, 2025',
        n: 1000,
        questionWording: 'Synthetic wording.',
      },
      truthSource: { label: 'Example', url: 'https://example.org/truth', oneLine: 'One line.' },
      lesson: { pattern: 'Synthetic pattern', tip: 'Check the source.' },
      category: SLOT_CATEGORIES[slot],
      difficulty: 2,
      status: 'verified',
    } as Record<string, any>,
  }
}

/** 35 claims, 14 days. Day i uses block i % 7, so every repeat is exactly 7 days apart. */
function passingFixture(): Fixture {
  const claims = Array.from({ length: 35 }, (_, k) => makeClaim(k))
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(FROM, i)
    const block = i % 7
    return {
      file: `content/days/${date}.json`,
      data: { date, claims: Array.from({ length: 5 }, (_, s) => `synthetic-claim-${block * 5 + s}`) } as Record<string, any>,
    }
  })
  return { claims, days }
}

const run = (f: Fixture) => validateContent(f.claims, f.days, { from: FROM, days: 14 })
const claim = (f: Fixture, k: number) => f.claims[k].data
const day = (f: Fixture, i: number) => f.days[i].data
const hasError = (f: Fixture, re: RegExp) => run(f).errors.some((e) => re.test(e))

describe('validateContent: passing set', () => {
  it('has no errors for 14 well-formed days', () => {
    const r = run(passingFixture())
    expect(r.errors).toEqual([])
    expect(r.warnings.filter((w) => /repeats within/.test(w))).toEqual([]) // 7 days apart is clear of both windows
  })

  it('warns (not errors) on a repeat 5–6 days apart', () => {
    const f = passingFixture()
    day(f, 12).claims[0] = 'synthetic-claim-0' // also on day 7: a 5-day gap, and no later repeat
    const r = run(f)
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => /repeats within 7 days/.test(w))).toBe(true)
  })

  it('skips template files and accepts lenient drafts', () => {
    const f = passingFixture()
    f.claims.push({ file: 'content/claims/_template-campus-a.json', data: { id: '' } })
    f.claims.push({
      file: 'content/claims/campus-draft.json',
      data: {
        id: 'campus-draft',
        text: '',
        answer: 'true',
        room: { kind: 'campus', label: '5C students', pctTrue: 0, pctFalse: 0, pctUnsure: 0, source: '', sourceUrl: '', fieldDates: '', n: 0 },
        truthSource: { label: '', url: '', oneLine: '' },
        category: 'campus',
        difficulty: 1,
        status: 'draft',
      },
    })
    expect(run(f).errors).toEqual([])
  })
})

describe('validateContent: failing cases', () => {
  it('room shares that do not sum to 100', () => {
    const f = passingFixture()
    claim(f, 3).room.pctUnsure = 15
    expect(hasError(f, /synthetic-claim-3\.json: .*must be 100 ± 1/)).toBe(true)
  })

  it('a draft claim scheduled on a day', () => {
    const f = passingFixture()
    claim(f, 2).status = 'draft'
    expect(hasError(f, /2026-10-15\.json: claim "synthetic-claim-2" is a draft/)).toBe(true)
  })

  it('two party/candidate election claims on one day', () => {
    const f = passingFixture()
    for (const k of [1, 2]) {
      claim(f, k).category = 'election'
      claim(f, k).text = `Most Republican voters believe statement ${k}.`
    }
    expect(hasError(f, /2026-10-15\.json: more than one election claim mentions a party/)).toBe(true)
  })

  it('no claim with answer true', () => {
    const f = passingFixture()
    claim(f, 0).answer = 'false' // truth-side share becomes pctFalse 60
    claim(f, 1).room.pctTrue = 70
    claim(f, 1).room.pctFalse = 20 // keep one majority-wrong claim so only the true-answer rule fires
    const errs = run(f).errors.filter((e) => e.startsWith('content/days/2026-10-15.json'))
    expect(errs.some((e) => /no claim with answer "true"/.test(e))).toBe(true)
    expect(errs.some((e) => /majority was wrong/.test(e))).toBe(false)
  })

  it('no claim where the majority was wrong', () => {
    const f = passingFixture()
    claim(f, 0).room.pctTrue = 60
    claim(f, 0).room.pctFalse = 30
    expect(hasError(f, /2026-10-15\.json: no claim where the room majority was wrong/)).toBe(true)
  })

  it('all five claims in the same category', () => {
    const f = passingFixture()
    for (let k = 0; k < 5; k++) claim(f, k).category = 'science'
    expect(hasError(f, /2026-10-15\.json: all five claims share the category "science"/)).toBe(true)
  })

  it('a claim repeated within 5 days', () => {
    const f = passingFixture()
    day(f, 3).claims[1] = 'synthetic-claim-1' // also on day 0, same slot category
    expect(hasError(f, /2026-10-18\.json: claim "synthetic-claim-1" repeats within 5 days/)).toBe(true)
  })

  it('a missing day in the coverage window', () => {
    const f = passingFixture()
    f.days.splice(5, 1)
    expect(hasError(f, /2026-10-20\.json: missing/)).toBe(true)
  })

  it('a bad id', () => {
    const f = passingFixture()
    f.claims.push({ ...makeClaim(99), file: 'content/claims/Bad_Id.json' })
    claim(f, 35).id = 'Bad_Id'
    expect(hasError(f, /Bad_Id\.json: id "Bad_Id" is not kebab-case/)).toBe(true)
  })

  it('an id that does not match its file name', () => {
    const f = passingFixture()
    claim(f, 4).id = 'something-else'
    expect(hasError(f, /synthetic-claim-4\.json: id "something-else" does not match the file name/)).toBe(true)
  })

  it('a bad URL', () => {
    const f = passingFixture()
    claim(f, 6).room.sourceUrl = 'http://example.com/poll'
    claim(f, 7).truthSource.url = 'not a url'
    const r = run(f)
    expect(r.errors.some((e) => /synthetic-claim-6\.json: room\.sourceUrl is not a valid https/.test(e))).toBe(true)
    expect(r.errors.some((e) => /synthetic-claim-7\.json: truthSource\.url is not a valid https/.test(e))).toBe(true)
  })

  it('an unknown top-level key', () => {
    const f = passingFixture()
    claim(f, 8)._note = 'x'
    expect(hasError(f, /synthetic-claim-8\.json: _note is not a known field/)).toBe(true)
  })

  it('a verified claim with no lesson', () => {
    const f = passingFixture()
    delete claim(f, 10).lesson
    expect(hasError(f, /synthetic-claim-10\.json: lesson is missing/)).toBe(true)
  })

  it('a demo-crowd room that looks like a survey', () => {
    const f = passingFixture()
    Object.assign(claim(f, 11).room, { kind: 'illustrative', label: 'students (demo crowd)', source: 'Demo crowd (illustrative)', n: 400 })
    const r = run(f)
    expect(r.errors.some((e) => /synthetic-claim-11\.json: room\.n must be 0/.test(e))).toBe(true)
    expect(r.errors.some((e) => /synthetic-claim-11\.json: room\.fieldDates and room\.sourceUrl must be empty/.test(e))).toBe(true)
    expect(r.errors.some((e) => /synthetic-claim-11\.json: room\.note is required/.test(e))).toBe(true)
  })

  it('accepts an honestly labeled demo-crowd room', () => {
    const f = passingFixture()
    Object.assign(claim(f, 12).room, {
      kind: 'illustrative', label: 'students (demo crowd)', source: 'Demo crowd (illustrative)', n: 0, fieldDates: '', sourceUrl: '', note: 'No poll yet.',
    })
    expect(run(f).errors).toEqual([])
  })

  it('a day date that is not a real calendar date', () => {
    const f = passingFixture()
    f.days.push({ file: 'content/days/2026-02-30.json', data: { date: '2026-02-30', claims: day(f, 0).claims } })
    expect(hasError(f, /2026-02-30\.json: date "2026-02-30" is not a real calendar date/)).toBe(true)
  })

  it('a verified claim that still carries a reviewer marker', () => {
    const f = passingFixture()
    claim(f, 10).room.note = 'HUMAN: campus set — fill from the 5C survey.'
    claim(f, 11).truthSource.oneLine = 'VERIFY before shipping: which wave?'
    claim(f, 12).room.note = 'Respondents could verify by phone.' // ordinary prose is fine
    claim(f, 13).room.note = 'HUMAN:check n' // no space after the colon
    claim(f, 14).room.fieldDates = 'Jan 10–16, 2023 (VERIFY: or Oct 5–12)' // shown on every reveal
    claim(f, 15).room.note = 'VERIFYING this took two passes.' // a longer word is not the marker
    const errs = run(f).errors
    expect(errs.some((e) => /synthetic-claim-10\.json: room\.note still contains a reviewer marker/.test(e))).toBe(true)
    expect(errs.some((e) => /synthetic-claim-11\.json: truthSource\.oneLine still contains a reviewer marker/.test(e))).toBe(true)
    expect(errs.some((e) => e.startsWith('content/claims/synthetic-claim-12.json'))).toBe(false)
    expect(errs.some((e) => /synthetic-claim-13\.json: room\.note still contains a reviewer marker/.test(e))).toBe(true)
    expect(errs.some((e) => /synthetic-claim-14\.json: room\.fieldDates still contains a reviewer marker/.test(e))).toBe(true)
    expect(errs.some((e) => e.startsWith('content/claims/synthetic-claim-15.json'))).toBe(false)
  })

  it('a verified template claim, and any "_" day file', () => {
    const f = passingFixture()
    f.claims.push({ file: 'content/claims/_template-campus-a copy.json', data: { ...makeClaim(40).data, status: 'verified' } })
    f.days.push({ file: 'content/days/_try.json', data: { date: '2026-10-20', claims: day(f, 0).claims } })
    const errs = run(f).errors
    expect(errs.some((e) => /_template-campus-a copy\.json: a template file .* is never validated or shipped/.test(e))).toBe(true)
    expect(errs.some((e) => /_try\.json: day files starting with "_"/.test(e))).toBe(true)
  })

  it('two election claims naming candidates added to the list', () => {
    const f = passingFixture()
    for (const k of [1, 2]) claim(f, k).category = 'election'
    claim(f, 1).text = 'Romney carried Utah in 2012.'
    claim(f, 2).text = 'Trump lost the 2020 election.'
    expect(hasError(f, /2026-10-15\.json: more than one election claim mentions a party/)).toBe(true)
    expect(PARTY_RE.test('Reagan won 49 states.')).toBe(true)
  })
})

describe('warnings', () => {
  it('flags capitalised pairs outside the allowlist', () => {
    expect(suspiciousNames('Jane Doe voted in Los Angeles.')).toEqual(['Jane Doe'])
    expect(suspiciousNames('In California, you can register on Election Day.')).toEqual([])
  })

  it('flags accented and apostrophe names, but not abbreviations', () => {
    expect(suspiciousNames('José Martínez and Jane O’Brien voted.')).toEqual(['José Martínez', 'Jane O’Brien'])
    expect(suspiciousNames('Ángel Ruiz voted.')).toEqual(['Ángel Ruiz']) // decomposed input
    expect(suspiciousNames('The U.S. government was behind it.')).toEqual([])
  })

  it('asks for a note on sources older than five years', () => {
    const f = passingFixture()
    claim(f, 9).room.fieldDates = 'Mar 2012'
    expect(run(f).warnings.some((w) => /synthetic-claim-9\.json: room\.note missing/.test(w))).toBe(true)
  })

  it('counts source age in calendar years before the --from year', () => {
    const f = passingFixture()
    claim(f, 9).room.fieldDates = 'Dec 2020' // more than 5 calendar years before 2026
    claim(f, 13).room.fieldDates = 'Jan 2021' // nearly six years old, but only 5 calendar years before 2026
    const w = run(f).warnings
    expect(w.some((m) => /synthetic-claim-9\.json: room\.note missing/.test(m))).toBe(true)
    expect(w.some((m) => /synthetic-claim-13\.json: room\.note missing/.test(m))).toBe(false)
  })

  it('a shortTitle outside 2–4 words', () => {
    const f = passingFixture()
    claim(f, 14).shortTitle = 'Humans over millions of years'
    claim(f, 15).shortTitle = 'Moon'
    claim(f, 16).shortTitle = 'Moon landing'
    const w = run(f).warnings
    expect(w.some((m) => /synthetic-claim-14\.json: shortTitle .* is 5 word/.test(m))).toBe(true)
    expect(w.some((m) => /synthetic-claim-15\.json: shortTitle .* is 1 word/.test(m))).toBe(true)
    expect(w.some((m) => m.startsWith('content/claims/synthetic-claim-16.json'))).toBe(false)
  })

  it('words the UI avoids, outside cited pollster titles', () => {
    const f = passingFixture()
    claim(f, 17).truthSource.oneLine = 'A classic piece of misinformation.'
    claim(f, 18).room.source = 'KFF Health Misinformation Tracking Poll Pilot' // cited verbatim: no marker error, no warning
    const r = run(f)
    expect(r.errors).toEqual([])
    expect(r.warnings.some((m) => /synthetic-claim-17\.json: truthSource\.oneLine says "misinformation"/.test(m))).toBe(true)
    expect(r.warnings.some((m) => m.startsWith('content/claims/synthetic-claim-18.json'))).toBe(false)
  })
})
