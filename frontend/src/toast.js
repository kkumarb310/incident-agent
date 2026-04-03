/** Lightweight event-based toast. Call showToast() from anywhere. */
export function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
}
