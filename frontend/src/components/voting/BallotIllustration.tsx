/** Code-native artwork: a selected ballot, rather than a success check badge. */
export default function BallotIllustration({ celebrate = false }: { celebrate?: boolean }) {
  return <div className={`ballot-art ${celebrate ? 'ballot-art-celebrate' : ''}`} aria-hidden="true">
    {celebrate && <div className="ballot-confetti">{Array.from({ length: 24 }, (_, index) =>
      <i key={index} style={{ left: `${8 + (index * 37) % 86}%`, top: `${8 + (index * 23) % 66}%`,
        animationDelay: `${index * 45}ms`, background: ['#f1cc60', '#55b4df', '#69d4b1', '#ef7b80'][index % 4],
        transform: `rotate(${index * 31}deg)` }} />)}</div>}
    <svg viewBox="0 0 280 250" fill="none">
      <ellipse cx="140" cy="225" rx="91" ry="12" fill="#06121c" opacity=".22" />
      <path d="M53 215C23 177 30 135 46 104M227 215c30-38 23-80 7-111" stroke="#bd9f58" strokeWidth="3" />
      {[0, 1, 2, 3, 4].map((n) => <g key={n} fill="#bd9f58" opacity=".8">
        <ellipse cx={40 + n * 2} cy={128 + n * 17} rx="5" ry="12" transform={`rotate(-38 ${40 + n * 2} ${128 + n * 17})`} />
        <ellipse cx={240 - n * 2} cy={128 + n * 17} rx="5" ry="12" transform={`rotate(38 ${240 - n * 2} ${128 + n * 17})`} />
      </g>)}
      <path d="m63 133 77-30 77 30v72l-77 30-77-30z" fill="#153e57" stroke="#79acc1" strokeWidth="2" />
      <path d="m140 160 77-27v72l-77 30z" fill="#0b293c" />
      <path d="m59 127 81-31 81 31v15l-81 31-81-31z" fill="#267496" stroke="#87c2d5" strokeWidth="2" />
      <path d="m105 128 49-18 23 9-49 19z" fill="#061b29" />
      <g className="selected-ballot">
        <path d="m102 42 63-12 18 87-63 16z" fill="#fbf1d8" stroke="#bfa86e" strokeWidth="2" />
        {[0, 1, 2].map((n) => <g key={n} stroke="#173c51" strokeWidth="2.5" strokeLinecap="round">
          <path d={`m${114 + n * 4} ${62 + n * 19} 3 4 7-11`} />
          <path d={`m${132 + n * 4} ${58 + n * 19} 24-5`} stroke="#9a8b6a" />
        </g>)}
      </g>
      <path d="M134 181v32m0-18c-10-1-14-8-14-17v17c0 10 7 17 14 18 7-1 14-8 14-18v-17c0 9-4 16-14 17zm0-14-5 9 5 9 5-9z" stroke="#e5c46e" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  </div>;
}
