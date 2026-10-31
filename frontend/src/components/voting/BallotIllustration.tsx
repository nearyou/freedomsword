import Image from 'next/image';

/** Reference-style blue ballot box with a selected paper ballot. */
export default function BallotIllustration({ celebrate = false }: { celebrate?: boolean }) {
  return <div className={`ballot-art ${celebrate ? 'ballot-art-celebrate' : ''}`} aria-hidden="true">
    <Image className="selected-ballot" src="/illustrations/vote-ballot-box.webp" width={800} height={800} alt="" unoptimized />
    {celebrate && <div className="ballot-confetti">{Array.from({ length: 24 }, (_, index) =>
      <i key={index} style={{ left: `${index % 3 === 0 ? 22 + (index * 13) % 60 : index % 3 === 1 ? 5 + index % 12 : 84 + index % 10}%`,
        top: `${index % 3 === 0 ? 5 + index % 12 : 22 + (index * 17) % 58}%`,
        animationDelay: `${index * 45}ms`, background: ['#f1cc60', '#55b4df', '#69d4b1', '#ef7b80'][index % 4],
        transform: `rotate(${index * 31}deg)` }} />)}</div>}
  </div>;
}
