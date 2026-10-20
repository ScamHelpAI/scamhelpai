/** Poll interval while async review runs (keep under API analyze-get rate limits). */
export const REVIEW_POLL_MS = 3000;

/** Max polls after the initial create (~3 min at 3s). */
export const REVIEW_POLL_MAX_ATTEMPTS = 40;
