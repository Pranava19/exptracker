import { useEffect } from 'react';

const BASE_URL = 'https://exptracker.vercel.app';

const setMetaTag = (attr, attrValue, content) => {
  let element = document.querySelector(`meta[${attr}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const setCanonicalLink = (url) => {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
};

const SEO = ({ title, description, path = '', ogType = 'website', jsonLd = null }) => {
  useEffect(() => {
    const canonicalUrl = `${BASE_URL}${path}`;
    const fullTitle = title ? `${title} | ExpTracker` : 'ExpTracker | Personal Finance & Expense Tracker';
    const metaDesc = description || 'ExpTracker helps you track income, analyze monthly expenses, import bank statements, and manage your personal finances securely.';

    document.title = fullTitle;

    setMetaTag('name', 'description', metaDesc);
    setCanonicalLink(canonicalUrl);

    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', metaDesc);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'ExpTracker');
    setMetaTag('property', 'og:image', `${BASE_URL}/logo512.png`);

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', metaDesc);
    setMetaTag('name', 'twitter:image', `${BASE_URL}/logo512.png`);

    let scriptTag = document.querySelector('#jsonld-route-schema');
    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'jsonld-route-schema';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLd);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [title, description, path, ogType, jsonLd]);

  return null;
};

export default SEO;
