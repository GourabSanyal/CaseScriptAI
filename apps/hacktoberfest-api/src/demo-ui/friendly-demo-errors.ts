/**
 * Map sanitized API / pipeline codes to demo UI copy (H6U).
 * Never include transcript, note, or raw provider bodies.
 */
export const friendlyDemoError = (code: string | null | undefined): string => {
  const c = (code ?? 'failed').trim() || 'failed';

  if (c === 'rate_limited') {
    return 'Too many demos — wait and tap Retry.';
  }
  if (c === 'busy') {
    return 'Server is busy generating another note. Tap Retry in a moment.';
  }
  if (c === 'demo_unavailable' || c === 'sessions_unavailable') {
    return "Demo isn't ready yet. Wait for the server, then tap Retry.";
  }
  if (c === 'demo_key_required') {
    return 'This demo is locked. Ask the host for access.';
  }
  if (c === 'interrupted_restart') {
    return 'Server restarted mid-run. Tap Retry to start again.';
  }
  if (
    c === 'llm_unavailable' ||
    c === 'llm_http_503' ||
    c === 'llm_timeout'
  ) {
    return 'AI is busy or slow right now. Tap Retry — high demand is usually temporary.';
  }
  if (c === 'llm_rate_limited' || c === 'llm_http_429') {
    return 'AI rate limit hit. Wait a moment, then tap Retry.';
  }
  if (c === 'stt_timeout') {
    return 'Transcription timed out. Tap Retry.';
  }
  if (c === 'network' || c === 'wake_timeout') {
    return "Can't reach server. Check your connection or try again.";
  }
  if (c === 'poll_timeout') {
    return 'Timed out waiting for the note. Tap Retry.';
  }

  return `Failed (${c}). Tap Retry to try again.`;
};
