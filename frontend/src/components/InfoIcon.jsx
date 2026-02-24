import React, { useState } from 'react';
import './InfoIcon.css';

const InfoIcon = ({ title, description, sources }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="info-icon-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title={`Learn more about ${title}`}
      >
        ⓘ
      </button>

      {isOpen && (
        <div className="info-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="info-modal-header">
              <h3>{title}</h3>
              <button className="info-modal-close" onClick={() => setIsOpen(false)}>
                ×
              </button>
            </div>
            <div className="info-modal-body">
              <p className="info-description">{description}</p>
              <div className="info-sources">
                <strong>Sources:</strong>
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
