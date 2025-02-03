// overrides.js
// Store original functions
window.__originalSetInterval = window.setInterval;
window.__originalMutationObserver = window.MutationObserver;

// Track all active intervals and observers
window.__activeIntervals = new Map();
window.__activeObservers = new Map();

// Override setInterval
window.setInterval = (callback, delay, ...args) => {
  const scriptId = window.__currentScriptId;
  const intervalId = window.__originalSetInterval(callback, delay, ...args);

  if (scriptId) {
    if (!window.__activeIntervals.has(scriptId)) {
      window.__activeIntervals.set(scriptId, new Set());
    }
    window.__activeIntervals.get(scriptId).add(intervalId);
  }

  return intervalId;
};

// Override MutationObserver
window.MutationObserver = function (callback) {
  const scriptId = window.__currentScriptId;
  const observer = new window.__originalMutationObserver(callback);

  if (scriptId) {
    if (!window.__activeObservers.has(scriptId)) {
      window.__activeObservers.set(scriptId, new Set());
    }
    window.__activeObservers.get(scriptId).add(observer);
  }

  return observer;
};

// Cleanup function
window.cleanupScript = (scriptId) => {
  // Clear intervals
  const intervals = window.__activeIntervals.get(scriptId) || new Set();
  for (const intervalId of intervals) {
    clearInterval(intervalId);
  }
  window.__activeIntervals.delete(scriptId);

  // Disconnect observers
  const observers = window.__activeObservers.get(scriptId) || new Set();
  for (const observer of observers) {
    observer.disconnect();
  }
  window.__activeObservers.delete(scriptId);

  // Clear script-specific sendResult
  delete window[`sendResult_${scriptId}`];
  delete window.__currentScriptId;

  // If this is the last script running, restore original functions
  if (
    window.__activeIntervals.size === 0 &&
    window.__activeObservers.size === 0
  ) {
    // Restore original functions
    window.setInterval = window.__originalSetInterval;
    window.MutationObserver = window.__originalMutationObserver;

    // Clean up our global variables
    delete window.__originalSetInterval;
    delete window.__originalMutationObserver;
    delete window.__activeIntervals;
    delete window.__activeObservers;
  }
};
