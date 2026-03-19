import React from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './GlobalBackButton.css';

const BackButton = ({ show, onBack, disabled = false }) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <button
      type="button"
      className="global-back-btn"
      onClick={onBack}
      disabled={disabled}
    >
      <ArrowLeftIcon size={16} />
      <span>{t('common.back')}</span>
    </button>
  );
};

export default BackButton;
