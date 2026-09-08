// Zero-dependency event telemetry and analytics tracking utility
export const trackEvent = (eventName, eventParams = {}) => {
  const payload = {
    event: eventName,
    params: eventParams,
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics Event]:', payload);
  }

  // Google Analytics GA4 gtag integration fallback
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
};

export const trackPageView = (path) => {
  trackEvent('page_view', { page_path: path || window.location.pathname });
};
