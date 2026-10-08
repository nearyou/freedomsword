export default function ProgressBar({
  value,
  label,
  color = 'var(--primary)',
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={bounded}
    >
      <span style={{ width: `${bounded}%`, background: color }} />
    </div>
  );
}
