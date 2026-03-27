import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://luyenthi.jp';
const SITE_NAME = 'Luyenthi.jp';

interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
}

/**
 * Hook quản lý SEO metadata động cho từng trang
 * - Title, description, canonical URL
 * - Open Graph, Twitter Card
 * - JSON-LD structured data
 */
export function useSEO(config: SEOConfig) {
  const location = useLocation();
  const canonicalUrl = config.canonical || `${SITE_URL}${location.pathname}`;

  useEffect(() => {
    // Title
    document.title = config.title.length > 60 
      ? config.title.substring(0, 57) + '...'
      : config.title;

    // Helper to set/create meta
    const setMeta = (attr: string, value: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${value}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    // Description
    const desc = config.description.length > 160
      ? config.description.substring(0, 157) + '...'
      : config.description;
    setMeta('name', 'description', desc);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // Open Graph
    setMeta('property', 'og:title', config.title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:type', config.ogType || 'website');
    setMeta('property', 'og:site_name', SITE_NAME);
    if (config.ogImage) {
      setMeta('property', 'og:image', config.ogImage);
    }

    // Twitter Card
    setMeta('name', 'twitter:title', config.title);
    setMeta('name', 'twitter:description', desc);
    if (config.ogImage) {
      setMeta('name', 'twitter:image', config.ogImage);
    }

    // Robots
    if (config.noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      setMeta('name', 'robots', 'index, follow');
    }

    // JSON-LD
    // Remove old JSON-LD
    document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());

    if (config.jsonLd) {
      const schemas = Array.isArray(config.jsonLd) ? config.jsonLd : [config.jsonLd];
      for (const schema of schemas) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-jsonld', 'true');
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      }
    }

    // Cleanup
    return () => {
      document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
    };
  }, [config.title, config.description, canonicalUrl, config.ogImage, config.ogType, config.noindex, config.jsonLd]);
}

// JSON-LD Schema builders

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Luyenthi.jp',
    alternateName: 'Luyện Thi JLPT',
    url: SITE_URL,
    description: 'Nền tảng luyện thi trực tuyến miễn phí dành cho người Việt tại Nhật Bản',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/subjects?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildPracticeTestSchema(opts: {
  name: string;
  description: string;
  url: string;
  educationalLevel?: string;
  about?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    educationalLevel: opts.educationalLevel,
    about: {
      '@type': 'Thing',
      name: opts.about || opts.name,
    },
    provider: {
      '@type': 'Organization',
      name: 'Luyện Đề Thi',
      url: SITE_URL,
    },
    isAccessibleForFree: true,
    inLanguage: ['vi', 'ja'],
  };
}

export function buildFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export { SITE_URL, SITE_NAME };
