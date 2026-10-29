'use client';

import { useId, useRef } from 'react';
import { ArrowLeftRight, Minus, Plus } from 'lucide-react';
import { clampSupport, QUARTER_VOTE_UNITS, supportScale, swipedSupport } from '@frontend/lib/support-adjustment';

function quarterArc(index: number) {
  const point = (degrees: number) => {
    const angle = degrees * Math.PI / 180;
    return `${(100 + 80 * Math.cos(angle)).toFixed(3)} ${(100 + 80 * Math.sin(angle)).toFixed(3)}`;
  };
  return `M ${point(index * 90 - 87)} A 80 80 0 0 1 ${point(index * 90 - 3)}`;
}

export default function SupportSlider({ current, maximum, value, disabled, onChange }: {
  current: number; maximum: number; value: number; disabled: boolean; onChange: (value: number) => void;
}) {
  const id = useId();
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const delta = value - current;
  const change = delta > 0 ? 'add' : delta < 0 ? 'subtract' : 'unchanged';
  const sections = supportScale(current, value, maximum);
  return <div className="support-adjuster" data-change={change}>
    <label htmlFor={id}>Support to keep with this candidate</label>
    <div className="support-gauge">
      <svg viewBox="0 0 200 200" aria-hidden="true" className="support-gauge-ring">
        {sections.map((section, index) => <g key={index}>
          <path className="support-ring-track" d={quarterArc(index)} pathLength={25} />
          {section.retained > 0 && <path className="support-ring-retained" d={quarterArc(index)} pathLength={25}
            strokeDasharray={`${section.retained} 25`} />}
          {section.added > 0 && <path className="support-ring-added" d={quarterArc(index)} pathLength={25}
            strokeDasharray={`${section.added} 25`} strokeDashoffset={-section.retained} />}
          {section.removed > 0 && <path className="support-ring-removed" d={quarterArc(index)} pathLength={25}
            strokeDasharray={`${section.removed} 25`} strokeDashoffset={-section.retained} />}
          {section.unavailable > 0 && <path className="support-ring-unavailable" d={quarterArc(index)} pathLength={25}
            strokeDasharray={`${section.unavailable} 25`} strokeDashoffset={-(25 - section.unavailable)} />}
        </g>)}
      </svg>
      <output htmlFor={id} className="support-gauge-value" aria-live="polite">
        <strong>{value}<small> / 100</small></strong>
        <span>{delta ? 'units after change' : 'units supporting'}</span>
        <small>{(value / 100).toFixed(2)} vote</small>
      </output>
    </div>
    <div id={`${id}-change`} className="support-change" role="status">
      {delta > 0 ? <><Plus size={17} aria-hidden="true" /> Adding {delta} units</>
        : delta < 0 ? <><Minus size={17} aria-hidden="true" /> Recalling {-delta} units</>
          : <>Saved support · {current} units</>}
    </div>
    <div className="support-gauge-key" aria-hidden="true">
      <span><i className="support-key-retained" /> Kept support</span>
      {delta !== 0 && <span><i className={delta > 0 ? 'support-key-added' : 'support-key-removed'} />
        {delta > 0 ? 'To add' : 'To recall'}</span>}
    </div>
    <div className="support-slider-row">
      <button type="button" className="button secondary support-remove" aria-label="Subtract 0.25 vote (25 units)"
        disabled={disabled || value === 0} onClick={() => onChange(clampSupport(value - QUARTER_VOTE_UNITS, maximum))}><Minus size={18} /></button>
      <div className="support-quarter-rail">
        <div className="support-quarter-track" aria-hidden="true">
          {sections.map((section, index) => <span className="support-quarter" key={index}>
            <i className="support-key-retained" style={{ width: `${section.retained * 4}%` }} />
            <i className="support-key-added" style={{ width: `${section.added * 4}%` }} />
            <i className="support-key-removed" style={{ width: `${section.removed * 4}%` }} />
            <i className="support-quarter-empty" style={{ width: `${section.available * 4}%` }} />
            <i className="support-quarter-unavailable" style={{ width: `${section.unavailable * 4}%` }} />
          </span>)}
        </div>
      <input id={id} type="range" min={0} max={100} step={1} value={value} disabled={disabled || maximum === 0}
        aria-describedby={`${id}-help ${id}-change`} aria-valuetext={`${(value / 100).toFixed(2)} vote, ${value} units; ${maximum} units available at most`}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(next >= maximum ? maximum : clampSupport(Math.round(next / 25) * 25, maximum));
        }}
        onKeyDown={(event) => {
          const delta = ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -25
            : ['ArrowRight', 'ArrowUp'].includes(event.key) ? 25 : null;
          if (delta !== null || ['Home', 'End'].includes(event.key)) {
            event.preventDefault();
            onChange(event.key === 'Home' ? 0 : event.key === 'End' ? maximum : clampSupport(value + (delta ?? 0), maximum));
          }
        }} />
      </div>
      <button type="button" className="button secondary support-add" aria-label="Add 0.25 vote (25 units)"
        disabled={disabled || value >= maximum} onClick={() => onChange(clampSupport(value + QUARTER_VOTE_UNITS, maximum))}><Plus size={18} /></button>
    </div>
    <div className="support-scale-labels" aria-hidden="true"><span>0</span><span>0.25</span><span>0.50</span><span>0.75</span><span>1.00</span></div>
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
      <span>← Recall 0.25</span><ArrowLeftRight size={18} /><span>Add 0.25 →</span>
    </div>
    <p id={`${id}-help`} className="fine-print">Each section is 0.25 vote (25 units). Slide, swipe, or use − / +.
      Changes are saved only after you confirm.</p>
    <details className="support-exact"><summary>Set an exact amount</summary>
      <label>Units to keep<input type="number" min={0} max={maximum} step={1} value={value} disabled={disabled}
        onChange={(event) => { if (event.target.value !== '') onChange(clampSupport(Number(event.target.value), maximum)); }} /></label>
    </details>
  </div>;
}
