import { describe, expect, it } from 'vitest'
import { addDays, suspiciousNames, validateContent, type ContentFile } from '../scripts/validate-content'

const FROM = '2026-10-15'
const SLOT_CATEGORIES = ['science', 'health', 'society', 'media', 'campus'] as const

type Fixture = { claims: ContentFile[]; days: ContentFile[] }

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

  it('a day date that is not a real calendar date', () => {
    const f = passingFixture()
    f.days.push({ file: 'content/days/2026-02-30.json', data: { date: '2026-02-30', claims: day(f, 0).claims } })
    expect(hasError(f, /2026-02-30\.json: date "2026-02-30" is not a real calendar date/)).toBe(true)
  })
})

describe('warnings', () => {
  it('flags capitalised pairs outside the allowlist', () => {
    expect(suspiciousNames('Jane Doe voted in Los Angeles.')).toEqual(['Jane Doe'])
    expect(suspiciousNames('In California, you can register on Election Day.')).toEqual([])
  })

  it('asks for a note on sources older than five years', () => {
    const f = passingFixture()
    claim(f, 9).room.fieldDates = 'Mar 2012'
    expect(run(f).warnings.some((w) => /synthetic-claim-9\.json: room\.note missing/.test(w))).toBe(true)
  })
})
