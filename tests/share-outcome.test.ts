import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shareOutcomeText, shareResults, type ShareInput } from '../src/lib/share'
import { COPY } from '../src/tokens/copy'

const input: ShareInput = {
  puzzleNumber: 12,
  accuracy: 3,
  read: 72,
  badges: ['fox', 'sheep', 'split', 'stray', 'good-company'],
  rows: Array.from({ length: 5 }, () => ({ split: { pctTrue: 43, pctFalse: 57, pctUnsure: 1 }, guess: 40, verdict: 'false' as const })),
}

// A 2D context that accepts every call and property: enough for drawCard to run under node.
function mockCtx(): unknown {
  const props: Record<string | symbol, unknown> = { measureText: () => ({ width: 10 }) }
  return new Proxy(props, {
    get: (t, k) => (k in t ? t[k] : () => undefined),
    set: (t, k, v) => {
      t[k] = v
      return true
    },
  })
}

let downloads: string[] = []

function stubDocument() {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => mockCtx(),
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['png'], { type: 'image/png' })),
  }
  const anchor = () => {
    const a = { download: '', style: {}, click: () => void downloads.push(a.download), remove: () => undefined }
    return a
  }
  vi.stubGlobal('document', {
    createElement: (tag: string) => (tag === 'canvas' ? canvas : anchor()),
    body: { appendChild: () => undefined },
  })
}

function stubNavigator(nav: Partial<Navigator>) {
  vi.stubGlobal('navigator', nav)
}

describe('shareResults outcome', () => {
  beforeEach(() => {
    downloads = []
    stubDocument()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:card')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("says 'downloaded', not 'copied', when the clipboard rejects but the card saves", async () => {
    stubNavigator({ clipboard: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) } as unknown as Clipboard })
    const outcome = await shareResults(input)
    expect(outcome).toBe('downloaded')
    expect(downloads).toEqual(['read-the-room-12.png'])
    expect(shareOutcomeText(outcome)).toBe(COPY.saved)
  })

  it("says 'copied' only when the text reached the clipboard", async () => {
    const writes: string[] = []
    stubNavigator({ clipboard: { writeText: async (t: string) => void writes.push(t) } as unknown as Clipboard })
    const outcome = await shareResults(input)
    expect(outcome).toBe('copied')
    expect(writes[0]).toMatch(/^Read the Room #12/)
    expect(shareOutcomeText(outcome)).toBe(COPY.copied)
  })

  it("says 'failed' without claiming a copy when nothing worked", async () => {
    stubNavigator({})
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('unavailable')
    })
    const outcome = await shareResults(input)
    expect(outcome).toBe('failed')
    expect(shareOutcomeText(outcome)).toBe(COPY.shareFailed)
    expect(COPY.shareFailed).not.toMatch(/copied/i)
  })

  it('maps cancelled and no outcome to an empty status', () => {
    expect(shareOutcomeText('cancelled')).toBe('')
    expect(shareOutcomeText(null)).toBe('')
    expect(shareOutcomeText('shared')).toBe(COPY.shared)
  })

  it('runs one share at a time: a second tap gets the first flow', async () => {
    let finish: () => void = () => undefined
    const share = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    stubNavigator({ share, clipboard: { writeText: vi.fn() } as unknown as Clipboard })
    const a = shareResults(input)
    const b = shareResults(input)
    expect(b).toBe(a)
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    finish()
    expect(await a).toBe('shared')
    expect(await b).toBe('shared')
    expect(share).toHaveBeenCalledTimes(1)
    expect(downloads).toEqual([])
  })
})
