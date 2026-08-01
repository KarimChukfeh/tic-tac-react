export default function V3ActionAnnouncer({ state }) {
  const message = state?.message || '';
  const isError = state?.type === 'error';

  return (
    <div
      className="sr-only"
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-v3-action-announcer={state?.type || 'idle'}
    >
      {message}
    </div>
  );
}
