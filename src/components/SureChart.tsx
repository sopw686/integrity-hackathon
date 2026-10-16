import type { Calibration, CallKind } from '../lib/scoring'
import { COPY } from '../tokens/copy'

const KINDS: CallKind[] = ['sure-right', 'hedged-right', 'hedged-miss', 'confident-miss']

/** Felt-sure vs right, in plain words, plus the four calibration outcomes.
 *  With `chart`, one row per confidence level: the ink bar is how often you were right,
 *  the vermilion mark is how sure you said you were. A bar short of its mark is overconfidence. */
export function SureSummary({ cal, chart }: { cal: Calibration; chart?: boolean }) {
  const gap = Math.abs(cal.gap)
  return (
    <div className="sure-summary">
      <p className="label">{COPY.sureHead}</p>
      <div className="sure-pair" role="group" aria-label={`${COPY.sureRight} ${cal.pctRight}%, ${COPY.sureFelt} ${cal.meanConfidence}%`}>
        <div>
          <span className="sure-big num">{cal.pctRight}%</span>
          <span className="label">{COPY.sureRight}</span>
        </div>
        <div>
          <span className="sure-big num felt">{cal.meanConfidence}%</span>
          <span className="label">{COPY.sureFelt}</span>
        </div>
      </div>
      <span className={`sure-verdict ${cal.verdict}`}>{COPY.sureVerdict[cal.verdict](gap)}</span>
      <p className="serif sure-explain">{COPY.sureExplain[cal.verdict]}</p>
      <ul className="sure-kinds" aria-label="Your calls">
        {KINDS.map((k) => (
          <li key={k} className={`sure-kind ${k}${cal.kinds[k] ? '' : ' none'}`}>
            <span className="num sure-kind-n">{cal.kinds[k]}</span>
            <span className="small">{COPY.callKindShort[k]}</span>
          </li>
        ))}
      </ul>
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
