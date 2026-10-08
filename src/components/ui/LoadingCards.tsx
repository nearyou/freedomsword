export default function LoadingCards({ label = 'Loading elections' }: { label?: string }) {
  return (
    <div className="skeleton-grid" role="status" aria-label={label}>
      {[0, 1, 2, 3].map((key) => (
        <div className="panel skeleton-card" key={key} aria-hidden="true">
          <div className="skeleton skeleton-avatar" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
