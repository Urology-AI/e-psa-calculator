import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n/supportedLanguages';

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const resolvedLang = i18n.resolvedLanguage || i18n.language || 'en';

  const handleLanguageChange = (e) => {
    const nextLang = e.target.value;
    i18n.changeLanguage(nextLang);
    try {
      window.localStorage.setItem('epsaLang', nextLang);
    } catch (_) {
      // Ignore storage failures
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 12, color: '#6B7280' }}>{t('common.language')}</label>
      <select
        value={resolvedLang}
        onChange={handleLanguageChange}
        aria-label={t('common.language')}
        style={{
          fontSize: 12,
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid #E5E7EB',
          background: '#fff',
          color: '#111827',
        }}
      >
        {supportedLanguages.map((lng) => (
          <option key={lng.code} value={lng.code}>
            {lng.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
