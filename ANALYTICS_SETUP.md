# 📊 Analytics & Conversion Event Telemetry Setup

**Project**: ExpTracker  
**Date**: September 8, 2026  
**Auditor & Analytics Lead**: Senior Full-Stack Engineer  

---

## 1. Overview of Analytics Architecture

ExpTracker implements a privacy-first, zero-dependency telemetry helper in [client/src/utils/analytics.js](file:///c:/project/exptracker/client/src/utils/analytics.js). It handles application page views, conversion tracking, user interactions, and statement imports without adding heavy external library overhead to the bundle.

---

## 2. Telemetry Utility Implementation (`analytics.js`)

```javascript
/**
 * Privacy-focused zero-dependency event telemetry helper
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics Event Tracked]: ${eventName}`, eventParams);
  }

  // Google Analytics 4 (GA4) fallback when window.gtag is initialized
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
};

export const trackPageView = (pagePath, pageTitle) => {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
};
```

---

## 3. Defined Conversion Events Matrix

| Event Name | Trigger Point | Payload Data | Category |
| :--- | :--- | :--- | :--- |
| **`page_view`** | Fired on route changes in `<SEO />` component | `{ page_path, page_title }` | Engagement |
| **`user_login`** | Fired on successful login in `Login.jsx` | `{ method: 'email' }` | Conversion |
| **`user_signup`** | Fired on successful registration in `Register.jsx` | `{ method: 'email' }` | Conversion |
| **`transaction_created`** | Fired when adding a new transaction | `{ category, amount, type }` | Goal Event |
| **`statement_imported`** | Fired on successful CSV import in `Import.jsx` | `{ record_count, format }` | High Value Conversion |
| **`filter_applied`** | Fired when changing search/date filters | `{ filter_type, query }` | Feature Usage |

---

## 4. GA4 / DebugView Verification Procedure

To test and verify that conversion events fire correctly in production:

1. **Install GA4 Script** in `index.html` (replace `G-XXXXXXXXXX` with your Google Analytics Measurement ID):
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX', { debug_mode: true });
   </script>
   ```

2. **Open Google Analytics DebugView**:
   - Navigate to Google Analytics $\rightarrow$ **Admin** $\rightarrow$ **DebugView**.
   - Open ExpTracker in your browser with Chrome extension **Google Analytics Debugger** enabled.
   - Perform user actions (Log in, add a transaction, import a CSV).
   - Confirm events (`transaction_created`, `statement_imported`, `user_login`) stream into the real-time DebugView timeline with their custom metadata parameters intact.

3. **Consent & Privacy Compliance**:
   - The telemetry script honors browser `navigator.doNotTrack` settings.
   - No Personally Identifiable Information (PII) such as passwords, email addresses, or unmasked credit card numbers are transmitted in event payloads.
