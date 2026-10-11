import type { CSSProperties } from 'react';
import Image from 'next/image';

export function candidatePortrait(name: string) {
  const portraits: Record<string, string> = {
    'Maya Chen': '/candidates/maya-chen.png',
    'Alex Rivera': '/candidates/alex-rivera.webp',
    'Jordan Blake': '/candidates/jordan-blake.webp',
    'Samira Okafor': '/candidates/samira-okafor.webp',
  };
  return portraits[name] ?? null;
}

export default function Avatar({
  name,
  color,
  large = false,
}: {
  name: string;
  color: string;
  large?: boolean;
}) {
  const portrait = candidatePortrait(name);
  return (
    <div
      className={`avatar ${large ? 'large' : ''} ${portrait ? 'has-portrait' : ''}`}
      style={{ '--candidate-color': color } as CSSProperties}
      aria-hidden="true"
    >
      {portrait ? (
        <Image src={portrait} alt="" width={large ? 152 : 96} height={large ? 152 : 96} />
      ) : (
        name
          .split(' ')
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
      )}
    </div>
  );
}
