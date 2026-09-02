/**
 * Tiny sessionStorage-backed store so in-progress text input survives
 * page/step navigation instead of resetting to placeholder text.
 */
const PREFIX = "cst:draft:";

export function readDraft(key: string): string | null {
  try {
    return sessionStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: string) {
  try {
    if (value) sessionStorage.setItem(PREFIX + key, value);
    else sessionStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}

export function clearDraft(key: string) {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}
