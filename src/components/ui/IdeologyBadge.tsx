import type { CSSProperties } from 'react';
export default function IdeologyBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="ideology" style={{ '--candidate-color': color } as CSSProperties}>
      {label}
    </span>
  );
}
