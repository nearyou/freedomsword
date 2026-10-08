import type { CSSProperties } from 'react';
export default function Avatar({
  name,
  color,
  large = false,
}: {
  name: string;
  color: string;
  large?: boolean;
}) {
  return (
    <div
      className={`avatar ${large ? 'large' : ''}`}
      style={{ '--candidate-color': color } as CSSProperties}
      aria-hidden="true"
    >
      {name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')}
    </div>
  );
}
