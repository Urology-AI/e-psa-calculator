import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { supportedLanguages } from './supportedLanguages';

import en from './locales/en/translation.json';
import es from './locales/es/translation.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

const normalizeLocale = (lng) => String(lng || '').trim();

const pickSupportedLanguage = (candidate) => {
  const lng = normalizeLocale(candidate);
  if (!lng) return 'en';

  const lower = lng.toLowerCase();

  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('es')) return 'es';

  return 'en';
};

const getInitialLanguage = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang) return pickSupportedLanguage(urlLang);
  } catch (_) {
    // Ignore (non-browser env)
  }

  try {
    const stored = window.localStorage.getItem('epsaLang');
    if (stored) return pickSupportedLanguage(stored);
  } catch (_) {
    // Ignore
  }

  try {
    const nav = window.navigator;
    const candidates = nav?.languages?.length ? nav.languages : [nav.language];
    for (const c of candidates) {
      if (c) return pickSupportedLanguage(c);
    }
  } catch (_) {
    // Ignore
  }

  return 'en';
};

const initialLng = getInitialLanguage();
const supportedCodes = supportedLanguages.map((l) => l.code);
const finalInitialLng = supportedCodes.includes(initialLng) ? initialLng : 'en';
const getLanguageDirection = (lng) => {
  const meta = supportedLanguages.find((l) => l.code === lng);
  return meta?.dir === 'rtl' ? 'rtl' : 'ltr';
};
const applyDocumentLanguage = (lng) => {
  if (typeof document === 'undefined') return;
  const safeLng = supportedCodes.includes(lng) ? lng : 'en';
  document.documentElement.lang = safeLng;
  document.documentElement.dir = getLanguageDirection(safeLng);
};

// Initialize once (avoid duplicate init on HMR)
if (!i18next.isInitialized) {
  i18next
    .use(initReactI18next)
    .init({
      resources,
      lng: finalInitialLng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
}

applyDocumentLanguage(finalInitialLng);
i18next.on('languageChanged', (lng) => {
  const next = supportedCodes.includes(lng) ? lng : 'en';
  applyDocumentLanguage(next);
  try {
    window.localStorage.setItem('epsaLang', next);
  } catch (_) {
    // Ignore storage failures
  }
});

export { i18next };

