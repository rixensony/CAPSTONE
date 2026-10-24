export default function ErrorAlert({ error, retryLabel = 'Retry', onRetry }) {
  const message =
    (typeof error === 'string' && error) ||
    error?.message ||
    'Something went wrong. Please try again.';

  return (
    <div className="error-alert" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
