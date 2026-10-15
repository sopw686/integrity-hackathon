import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { COPY } from '../tokens/copy'
import { Room } from './Room'
import { Stamp } from './Stamp'

const DEMO = { pctTrue: 29, pctFalse: 55, pctUnsure: 16 }

/** Three panels, skippable. Each panel is a miniature of the real screen it explains. */
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
                  <p className="claim-text howto-claim">The Sun goes around the Earth.</p>
                  <div className="row">
                    <span className="btn secondary howto-btn">{COPY.true}</span>
                    <span className="btn howto-btn">{COPY.false}</span>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="howto-grid">
                  <Room split={DEMO} label="U.S. adults" mode="slider" guess={62} dot={12} gap={5} />
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
                  <Room split={DEMO} label="U.S. adults" mode="reveal" t={Infinity} guess={62} verdict="true" dot={12} gap={5} />
                  <span className="label howto-you">{COPY.thatDotIsYou}</span>
                </div>
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
