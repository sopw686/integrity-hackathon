import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { COPY } from '../tokens/copy'
import { Room } from './Room'
import { Stamp } from './Stamp'
import { CALL_POINTS, CONFIDENCE_LEVELS, surePoints } from '../lib/scoring'

const DEMO = { pctTrue: 29, pctFalse: 55, pctUnsure: 16 }

/** Four panels, skippable. Each panel is a miniature of the real screen it explains. */
export function HowToDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [step, setStep] = useState(0)
  const last = step === COPY.howTo.length - 1
  const close = () => {
    onOpenChange(false)
    setStep(0)
  }
  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog" aria-describedby={undefined}>
          <div className="dialog-top">
            <Dialog.Title className="label dialog-title">{COPY.howToPlay}</Dialog.Title>
            <span className="label num">{step + 1} of {COPY.howTo.length}</span>
          </div>
          <div className="howto-panel" key={step}>
            <div className="howto-figure" aria-hidden="true">
              {step === 0 && (
                <div className="howto-card">
                  <p className="claim-text howto-claim">You need a photo ID to vote in person in California.</p>
                  <div className="row">
                    <span className="btn secondary howto-btn">{COPY.true}</span>
                    <span className="btn howto-btn">{COPY.false}</span>
                  </div>
                  <div className="howto-sure">
                    {CONFIDENCE_LEVELS.map((c) => (
                      <span key={c} className={`howto-sure-tile num${c === 70 ? ' on' : ''}`}>{c}%</span>
                    ))}
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="howto-grid">
                  <Room split={DEMO} label="people (example)" mode="slider" guess={62} dot={12} gap={5} />
                  <div className="howto-slider">
                    <span className="howto-track"><span className="howto-fill" style={{ width: '62%' }} /></span>
                    <span className="label num">62%</span>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="howto-grid">
                  <div className="room-head">
                    <span className="side left"><span className="label">{COPY.sayTrue}</span><span className="label num side-num">{DEMO.pctTrue}</span></span>
                    <span className="side right"><span className="label num side-num">{DEMO.pctFalse}</span><Stamp side="false" animate={false} /></span>
                  </div>
                  <Room split={DEMO} label="people (example)" mode="reveal" t={Infinity} guess={62} verdict="true" dot={12} gap={5} />
                  <span className="label howto-you">{COPY.thatDotIsYou}</span>
                </div>
              )}
              {step === 3 && (
                <table className="howto-points">
                  <thead>
                    <tr><th className="label">Sure</th><th className="label">If right</th><th className="label">If wrong</th></tr>
                  </thead>
                  <tbody>
                    {CONFIDENCE_LEVELS.map((c) => (
                      <tr key={c}>
                        <td className="num">{c}%</td>
                        <td className="num">{COPY.surePts(CALL_POINTS + surePoints(c, true))}</td>
                        <td className="num">{COPY.surePts(surePoints(c, false))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="howto-line serif">{COPY.howTo[step].line}</p>
          </div>
          <div className="row dialog-actions">
            <Dialog.Close asChild>
              <button type="button" className="btn secondary">
                {last ? 'Done' : 'Skip'}
              </button>
            </Dialog.Close>
            {!last && (
              <button type="button" className="btn" onClick={() => setStep((s) => s + 1)}>
                {COPY.next}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
