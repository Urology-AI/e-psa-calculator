import React from 'react';
import '../ModelDocs.css';
import './LegalPage.css';

/**
 * Generic renderer for a legal document (privacy policy / terms), given
 * a plain-data spec so each platform's content stays in its own file.
 */
const LegalDocPage = ({ title, updated, sections, backHref, backLabel }) => {
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <a className="legal-back-link" href={backHref}>&larr; {backLabel}</a>

        <div className="legal-header">
          <h1>{title}</h1>
          <div className="legal-updated">Last updated: {updated}</div>
        </div>

        <div className="legal-body model-docs-content">
          {sections.map((section, i) => (
            <section className="docs-section" key={i}>
              {section.title && <h3>{section.title}</h3>}
              {section.note && (
                <div className={`info-box ${section.noteType || 'info'}`}>
                  {section.noteLabel && <strong>{section.noteLabel} </strong>}
                  {section.note}
                </div>
              )}
              {section.text && <p>{section.text}</p>}
              {section.list && (
                <ul className="limitations-list">
                  {section.list.map((item, j) => (
                    <li key={j}>
                      {item.label && <strong>{item.label} </strong>}
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegalDocPage;
