'use client';

import { useId, useRef } from 'react';
import { ArrowLeftRight, Minus, Plus } from 'lucide-react';
import { clampSupport, QUARTER_VOTE_UNITS, swipedSupport } from '@frontend/lib/support-adjustment';

export default function SupportSlider({ current, maximum, value, disabled, onChange }: {
  current: number; maximum: number; value: number; disabled: boolean; onChange: (value: number) => void;
}) {
  const id = useId();
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  return <div className="support-adjuster">
    <label htmlFor={id}>Support to keep with this candidate</label>
    <div className="support-adjuster-value" aria-live="polite">
      <strong>{(value / 100).toFixed(2)} <small>vote</small></strong><span>{value} / 100 units</span>
    </div>
    <div className="support-slider-row">
      <button type="button" className="button secondary" aria-label="Subtract 0.25 vote (25 units)"
        disabled={disabled || value === 0} onClick={() => onChange(clampSupport(value - QUARTER_VOTE_UNITS, maximum))}><Minus size={18} /></button>
      <input id={id} type="range" min={0} max={maximum} step={1} value={value} disabled={disabled || maximum === 0}
        aria-describedby={`${id}-help`} aria-valuetext={`${(value / 100).toFixed(2)} vote, ${value} units; ${maximum} units available at most`}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(next === maximum ? maximum : clampSupport(Math.round(next / 25) * 25, maximum));
        }}
        onKeyDown={(event) => {
          const delta = ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -25
            : ['ArrowRight', 'ArrowUp'].includes(event.key) ? 25 : null;
          if (delta !== null || ['Home', 'End'].includes(event.key)) {
            event.preventDefault();
            onChange(event.key === 'Home' ? 0 : event.key === 'End' ? maximum : clampSupport(value + (delta ?? 0), maximum));
          }
        }} />
      <button type="button" className="button secondary" aria-label="Add 0.25 vote (25 units)"
        disabled={disabled || value >= maximum} onClick={() => onChange(clampSupport(value + QUARTER_VOTE_UNITS, maximum))}><Plus size={18} /></button>
    </div>
    <div className="support-swipe" aria-hidden="true"
      onPointerDown={(event) => {
        if (!disabled && event.isPrimary && event.button === 0) {
          start.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerUp={(event) => {
        const origin = start.current; start.current = null;
        if (!disabled && origin?.pointerId === event.pointerId)
          onChange(swipedSupport(value, maximum, event.clientX - origin.x, event.clientY - origin.y));
      }}
      onPointerCancel={() => { start.current = null; }}>
      <span>← −0.25</span><ArrowLeftRight size={18} /><span>+0.25 →</span>
    </div>
    <p id={`${id}-help`} className="fine-print">Slide, swipe across the row above, or use − / + to adjust by 0.25 vote (25 units).
      Your saved support stays at {current} units until you confirm.</p>
    <details className="support-exact"><summary>Set an exact amount</summary>
      <label>Units to keep<input type="number" min={0} max={maximum} step={1} value={value} disabled={disabled}
        onChange={(event) => { if (event.target.value !== '') onChange(clampSupport(Number(event.target.value), maximum)); }} /></label>
    </details>
  </div>;
}
