import React, { useState } from 'react';
import './InfoIcon.css';
import { useTranslation } from 'react-i18next';

const InfoIcon = ({ title, description, titleKey, descriptionKey, sources }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const resolvedTitle = titleKey ? t(titleKey) : title;
  const resolvedDescription = descriptionKey ? t(descriptionKey) : description;

  return (
    <>
      <button
        className="info-icon-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title={t('info.learnMore', { title: resolvedTitle })}
      >
        ⓘ
      </button>

      {isOpen && (
        <div className="info-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="info-modal-header">
              <h3>{resolvedTitle}</h3>
              <button className="info-modal-close" onClick={() => setIsOpen(false)}>
                ×
              </button>
            </div>
            <div className="info-modal-body">
              <p className="info-description">{resolvedDescription}</p>
              <div className="info-sources">
                <strong>{t('info.sources')}</strong>
                <ul>
                  {sources.map((source, idx) => (
                    <li key={idx}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoIcon;
