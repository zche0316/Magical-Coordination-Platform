
window.addEventListener('error', event => {
    const payload = {
      origin:  'client-error',
      message: event.message,
      source:  event.filename,
      lineno:  event.lineno,
      colno:   event.colno,
      stack:   event.error?.stack || null,
      time:    new Date().toISOString()
    };
    navigator.sendBeacon('/api/crash', JSON.stringify(payload));
  });
  

  window.addEventListener('unhandledrejection', event => {
    const payload = {
      origin:  'client-unhandledRejection',
      message: event.reason?.message || String(event.reason),
      stack:   event.reason?.stack || null,
      time:    new Date().toISOString()
    };
    navigator.sendBeacon('/api/crash', JSON.stringify(payload));
  });
  