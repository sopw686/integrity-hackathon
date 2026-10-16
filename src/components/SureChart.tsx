import type { Calibration } from '../lib/scoring'
import { COPY } from '../tokens/copy'

/** Felt-sure vs right. One row per confidence level: the ink bar is how often you were right,
 *  the vermilion mark is how sure you said you were. A bar short of its mark is overconfidence. */
export function SureSummary({ cal, chart }: { cal: Calibration; chart?: boolean }) {
  const gap = Math.abs(cal.gap)
  return (
    <div className="sure-summary">
      <p className="label">{COPY.sureHead}</p>
      <p className="serif">{COPY.sureFeltVsRight(cal.meanConfidence, cal.pctRight)}</p>
      <span className={`sure-verdict ${cal.verdict}`}>{COPY.sureVerdict[cal.verdict](gap)}</span>
      <p className="small muted">{COPY.sureMisses(cal.confidentMisses)}</p>
      {chart && (
        <>
          <div className="sure-bars" role="table" aria-label={COPY.sureHead}>
            {cal.buckets.map((b) => (
              <div role="row" key={b.level} style={{ display: 'contents' }}>
                <span role="rowheader" className="label num">{COPY.sureStatsLine(b.level)}</span>
                <span role="cell" className="sure-track" aria-label={b.pctRight === null ? 'no calls yet' : `right ${b.pctRight}%`}>
                  {b.pctRight !== null && <span className="sure-fill" style={{ width: `${b.pctRight}%` }} />}
                  <span className="sure-mark" style={{ left: `${b.level}%` }} />
                </span>
                <span role="cell" className="small muted num sure-count">{b.n ? COPY.sureStatsRight(b.right, b.n) : '—'}</span>
              </div>
            ))}
          </div>
          <p className="small muted sure-key" aria-hidden="true">
            <span><i /> how often you were right</span>
            <span><i className="mark" /> how sure you said you were</span>
          </p>
        </>
      )}
    </div>
  )
}
