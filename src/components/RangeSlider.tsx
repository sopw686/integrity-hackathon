import { useId } from 'react'

/**
 * A real <input type=range> under the hood: native keyboard handling (arrows, Home/End,
 * PageUp/Down), touch dragging and screen-reader semantics for free. Restyled to the tokens.
 * Dots update on every input event with no transition, so it feels like shading.
 */
export function RangeSlider({
  value,
  onChange,
  label,
  disabled = false,
  onEnter,
}: {
  value: number
  onChange: (v: number) => void
  label: string
  disabled?: boolean
  /** Enter on the slider locks the guess */
  onEnter?: () => void
}) {
  const id = useId()
  return (
    <div className="range-row">
      <input
        id={id}
        className="range"
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={`${value} of 100 say true`}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        onInput={(e) => onChange(Number((e.currentTarget as HTMLInputElement).value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault()
            onEnter()
          }
        }}
        style={{ ['--p' as string]: `${value}%` }}
      />
      <output htmlFor={id} className="range-value num" aria-hidden="true">
        {value}
        <span className="range-pct">%</span>
      </output>
    </div>
  )
}
