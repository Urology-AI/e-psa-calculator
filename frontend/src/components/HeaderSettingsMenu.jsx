import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TextScaleControl from './TextScaleControl.jsx';
import ThemeSwitcher from './ThemeSwitcher.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

// Compact overflow menu that houses the display-preference controls
// (text size, theme, language) so the primary header can stay quiet.
// Click-to-toggle popover, closes on outside click / Escape — same
// interaction shape as the GuidelineSupportBadge tooltip elsewhere
// in the app, kept local here since that file is out of scope.
const HeaderSettingsMenu = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="header-settings-menu" ref={containerRef}>
      <button
        type="button"
        className="header-settings-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('app.settings.menuLabel', 'Display settings')}
        title={t('app.settings.menuLabel', 'Display settings')}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {open && (
        <div className="header-settings-popover" role="menu" aria-label={t('app.settings.menuLabel', 'Display settings')}>
          <div className="header-settings-row" role="menuitem">
            <span className="header-settings-row-label">{t('app.textScale.groupLabel', 'Text size')}</span>
            <TextScaleControl />
          </div>
          <div className="header-settings-row" role="menuitem">
            <span className="header-settings-row-label">{t('app.settings.theme', 'Theme')}</span>
            <ThemeSwitcher />
          </div>
          <div className="header-settings-row header-settings-row--lang" role="menuitem">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderSettingsMenu;
