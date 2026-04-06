import React, { useState } from 'react';
import './ActiveSurveillanceResults.css';
import { downloadCsv, buildASCsvRows } from '../utils/exportCsv';
import { ArrowLeftIcon, RefreshCwIcon, PrinterIcon, DownloadIcon, InfoIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

const PointsBadge = ({ points }) => {
  if (points < 0) return <span className="as-points-badge as-points-badge--neg">{points}</span>;
  if (points > 0) return <span className="as-points-badge as-points-badge--pos">+{points}</span>;
  return <span className="as-points-badge as-points-badge--zero">0</span>;
};

const AS_REFERENCES = [
  {
    id: 1,
    text: 'Eastham JA, Auffenberg GB, Barocas DA, et al. Clinically localized prostate cancer: AUA/ASTRO guideline, part I: introduction, risk assessment, staging, and risk-based management.',
    journal: 'J Urol. 2022;208(1):10–18.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Eastham+AUA+ASTRO+guideline+part+I+J+Urol+2022',
  },
  {
    id: 2,
    text: 'Eastham JA, Auffenberg GB, Barocas DA, et al. Clinically localized prostate cancer: AUA/ASTRO guideline, part II: principles of active surveillance, principles of surgery, and follow-up.',
    journal: 'J Urol. 2022;208(1):19–25.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Eastham+AUA+ASTRO+guideline+part+II+J+Urol+2022',
  },
  {
    id: 3,
    text: 'Eastham JA, Auffenberg GB, Barocas DA, et al. Clinically localized prostate cancer: AUA/ASTRO guideline, part III: principles of radiation and future directions.',
    journal: 'J Urol. 2022;208(1):26–33.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Eastham+AUA+ASTRO+guideline+part+III+J+Urol+2022',
  },
  {
    id: 4,
    text: 'Schaeffer EM, Srinivas S, Adra N, et al. NCCN Guidelines® Insights: Prostate Cancer, Version 3.2024.',
    journal: 'J Natl Compr Canc Netw. 2024;22(3):140–150. doi: 10.6004/jnccn.2024.0019. PMID: 38626801.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38626801/',
  },
  {
    id: 5,
    text: 'Cornford P, et al. EAU-EANM-ESTRO-ESUR-ISUP-SIOG Guidelines on Prostate Cancer—2024 Update. Part I: Screening, Diagnosis, and Local Treatment with Curative Intent.',
    journal: 'European Urology. 2024;86(2):148–163.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Cornford+EAU+prostate+cancer+guidelines+2024',
  },
];

const GuideSection = ({ title, children }) => (
  <div className="as-guide-subsection">
    <h4 className="as-guide-subheading">{title}</h4>
    {children}
  </div>
);

const ActiveSurveillanceResults = ({ result, onStartOver, onEditAnswers }) => {
  const [guideOpen, setGuideOpen] = useState(false);
  if (!result) return null;

  const {
    asTierKey,
    asTierLabel,
    asColor,
    asRecommendation,
    asGuidelineSource,
    asScore,
    asFactors = [],
    nccnRiskGroup,
    biopsyGGG,
    coresPositive,
    coresTotal,
    corePct,
    maxCorePct,
    psaValue,
    psadValue,
    psadFlag,
    piradsValue,
    asEmpiricalNote,
    disclaimer,
  } = result;

  const bannerBg = asTierKey === 'as_recommended' ? '#16a34a'
    : asTierKey === 'shared_decision' ? '#d97706'
    : '#dc2626';

  const handleExportCsv = () => {
    const rows = buildASCsvRows(null, null, null, result, {});
    const filename = `ePSA_AS_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };

  return (
    <div className="as-results" role="main">

      {/* ── A. Recommendation banner ── */}
      <div className="as-banner" style={{ background: bannerBg }} role="alert">
        <div className="as-banner-label">{asTierLabel}</div>
        <p className="as-banner-body">{asRecommendation}</p>
        <p className="as-banner-source">Source: {asGuidelineSource}</p>
      </div>

      {/* ── B. NCCN badge ── */}
      <div className="as-nccn-badge" role="note">
        <span className="as-nccn-label">NCCN Classification:</span>
        <span className="as-nccn-value">{nccnRiskGroup}</span>
      </div>

      {/* ── C. Score factors table ── */}
      <div className="as-factors-section">
        <h3 className="as-factors-heading">What went into this assessment</h3>
        <div className="as-factors-table-wrap">
          <table className="as-factors-table" aria-label="Active surveillance scoring factors">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Value</th>
                <th>Points</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {asFactors.map((f, i) => (
                <tr key={i}>
                  <td className="as-factors-label">{f.label}</td>
                  <td className="as-factors-value">{f.value}</td>
                  <td className="as-factors-points"><PointsBadge points={f.points} /></td>
                  <td className="as-factors-note">{f.note}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="as-factors-total-label">Total AS Score</td>
                <td><PointsBadge points={asScore} /></td>
                <td className="as-factors-note as-factors-note--muted">Negative = more evidence for AS; Positive = more evidence for treatment</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── D. Biopsy summary ── */}
      <div className="as-summary-row" role="group" aria-label="Biopsy summary">
        <div className="as-summary-item">
          <span className="as-summary-val">GG{biopsyGGG}</span>
          <span className="as-summary-key">Grade Group</span>
        </div>
        <div className="as-summary-item">
          <span className="as-summary-val">{coresPositive}/{coresTotal} ({corePct}%)</span>
          <span className="as-summary-key">Positive Cores</span>
        </div>
        {maxCorePct != null && (
          <div className="as-summary-item">
            <span className="as-summary-val">{maxCorePct}%</span>
            <span className="as-summary-key">Max Core Involvement</span>
          </div>
        )}
        {psaValue != null && (
          <div className="as-summary-item">
            <span className="as-summary-val">{psaValue} ng/mL</span>
            <span className="as-summary-key">PSA</span>
          </div>
        )}
        {psadValue != null && (
          <div className="as-summary-item">
            <span className="as-summary-val">
              {Number(psadValue).toFixed(3)} ng/mL/cm³
              {psadFlag && <span className="as-psad-flag">Elevated PSAD (&gt;0.177)</span>}
            </span>
            <span className="as-summary-key">PSA Density</span>
          </div>
        )}
        {piradsValue != null && (
          <div className="as-summary-item">
            <span className="as-summary-val">PI-RADS {piradsValue}</span>
            <span className="as-summary-key">MRI Score</span>
          </div>
        )}
      </div>

      {/* ── E. Empirical context ── */}
      {asEmpiricalNote && (
        <div className="as-empirical-box" role="note">
          <InfoIcon size={14} className="as-empirical-icon" />
          <p className="as-empirical-text">{asEmpiricalNote}</p>
        </div>
      )}

      {/* ── F. Disclaimer ── */}
      {disclaimer && (
        <p className="as-disclaimer">{disclaimer}</p>
      )}

      {/* ── G. AI Surveillance Tool CTA ── */}
      <div className="as-cta-banner">
        <span className="as-cta-badge">AI Surveillance Tool</span>
        <p className="as-cta-text">
          For a complete multi-modal assessment — genomic biomarkers (Decipher, Oncotype DX, Prolaris),
          PSMA PET/CT staging, and personalised monitoring protocols — use the standalone AI Surveillance Tool.
        </p>
      </div>

      {/* ── H. Patient Guide ── */}
      <div className="as-guide-container">
        <button
          className="as-guide-toggle"
          type="button"
          aria-expanded={guideOpen}
          onClick={() => setGuideOpen((v) => !v)}
        >
          <span className="as-guide-toggle-label">Patient Guide: Active Surveillance &amp; Shared Decision-Making</span>
          {guideOpen ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
        </button>

        {guideOpen && (
          <div className="as-guide-body">
            <p className="as-guide-source-note">
              Based on NCCN, AUA/ASTRO, and EAU Guidelines. For educational purposes only — does not replace individualized medical advice.
            </p>

            <GuideSection title="What These Options Mean">
              <p className="as-guide-p">
                <strong>Active Surveillance (AS):</strong> A structured monitoring program for men with very-low or low-risk prostate cancer. The goal is to watch the cancer closely with tests and repeat biopsies, and only begin treatment if the disease shows signs of growth or change.
              </p>
              <p className="as-guide-p">
                <strong>Observation (Watchful Waiting):</strong> A less intensive approach, usually chosen by men with limited life expectancy or major health problems. The focus is on comfort and quality of life. Treatment is given only if symptoms develop.
              </p>
              <p className="as-guide-note">
                Neither AS nor observation is a guarantee. Tests can miss cancer or underestimate aggressiveness. These approaches balance benefits and risks but cannot eliminate risk entirely.
              </p>
            </GuideSection>

            <GuideSection title="Shared Decision-Making">
              <p className="as-guide-p">Choosing a treatment for prostate cancer is not just about the cancer itself. Shared decision-making means you and your doctor decide together, based on the cancer, your health, and what matters most to you. Key topics to discuss:</p>
              <ol className="as-guide-ol">
                <li><strong>How serious your cancer is</strong> — your risk level and what it means for care.</li>
                <li><strong>Your overall health and life expectancy</strong> — age and other health conditions help guide whether treatment or monitoring makes more sense.</li>
                <li><strong>Chances of cure and recurrence</strong> — risk calculators can help estimate how likely treatment is to cure the cancer or whether it might return.</li>
                <li><strong>Possible side effects</strong> — every treatment can affect urinary control, sexual function, and bowel health. These can be temporary or long-lasting.</li>
                <li><strong>Your starting point</strong> — current urinary, sexual, and bowel function (assessed via tools like SHIM, IPSS) is one of the best predictors of recovery.</li>
                <li><strong>Your preferences and goals</strong> — what matters most to you (preserving sexual function, avoiding incontinence, limiting side effects) should guide the choice.</li>
              </ol>
            </GuideSection>

            <GuideSection title="Who May Be a Candidate for Active Surveillance">
              <p className="as-guide-p">AS is generally considered when:</p>
              <ul className="as-guide-ul">
                <li>Prostate cancer is very-low or low risk (Grade Group 1, PSA &lt;10, only a few biopsy cores positive).</li>
                <li>Life expectancy is 10+ years.</li>
                <li>The patient is comfortable with frequent monitoring and possible later treatment.</li>
                <li>Sometimes considered in favorable intermediate-risk cases if PSA density is low, tumor volume is low, only a small amount of Gleason pattern 4 is present, or genomic tests suggest low risk.</li>
              </ul>
              <p className="as-guide-note">
                Men with family history or known inherited mutations (e.g., BRCA2, HOXB13) may be less suitable for surveillance and often need closer follow-up.
              </p>
            </GuideSection>

            <GuideSection title="Special Pathologic Findings">
              <p className="as-guide-p">Certain biopsy findings may raise concern for higher-risk disease and typically prompt definitive treatment rather than surveillance:</p>
              <ul className="as-guide-ul">
                <li><strong>Cribriform carcinoma</strong> — associated with higher rates of progression, metastasis, and mortality.</li>
                <li><strong>Intraductal carcinoma of the prostate (IDC-P)</strong> — an adverse histologic finding; typically prompts definitive treatment.</li>
                <li><strong>High-grade prostatic intraepithelial neoplasia (HGPIN)</strong> — not prostate cancer itself, but a marker of increased risk; requires repeat biopsy rather than surveillance.</li>
                <li><strong>Atypical small acinar proliferation (ASAP/ASIN)</strong> — an indeterminate finding with a high likelihood of underlying carcinoma; repeat biopsy recommended within 3–6 months.</li>
                <li><strong>Other aggressive histologies</strong> (ductal adenocarcinoma, sarcomatoid carcinoma, small cell/neuroendocrine carcinoma) — not candidates for surveillance.</li>
              </ul>
              <p className="as-guide-note">Management is individualized. In select cases a patient and doctor may still choose surveillance, but this requires careful monitoring and shared decision-making.</p>
            </GuideSection>

            <GuideSection title="Confirming Candidacy">
              <p className="as-guide-p">Because biopsies can underestimate cancer, confirmatory testing is strongly recommended before committing to AS:</p>
              <ul className="as-guide-ul">
                <li>Repeat biopsy within 12–24 months of diagnosis.</li>
                <li>MRI with PSA density to identify hidden higher-grade disease.</li>
                <li>Genomic testing (Decipher, Oncotype DX, Prolaris, ConfirmMDx) may add information.</li>
              </ul>
              <p className="as-guide-note">Even with these tests, aggressive cancer can sometimes remain undetected.</p>
            </GuideSection>

            <GuideSection title="What Active Surveillance Involves">
              <p className="as-guide-p">Typical monitoring schedule (may be individualized):</p>
              <ul className="as-guide-ul">
                <li><strong>PSA test:</strong> About every 6 months.</li>
                <li><strong>Digital rectal exam (DRE):</strong> About once per year.</li>
                <li><strong>Prostate biopsy:</strong> Every 2–5 years, but not more than once per year unless concerns arise.</li>
                <li><strong>MRI:</strong> Sometimes repeated (not more than once per year) to guide biopsies, but cannot replace them.</li>
              </ul>
              <p className="as-guide-note">Surveillance continues until life expectancy is less than 10 years, at which point observation may be more appropriate.</p>
            </GuideSection>

            <GuideSection title="When Surveillance May Change to Treatment">
              <p className="as-guide-p">Curative treatment may be discussed if:</p>
              <ul className="as-guide-ul">
                <li>Biopsy shows higher grade disease (Grade Group ≥2).</li>
                <li>Cancer volume increases significantly.</li>
                <li>PSA density rises in a concerning way.</li>
                <li>MRI shows new or suspicious lesions.</li>
                <li>The patient experiences significant anxiety or prefers treatment despite stable disease.</li>
              </ul>
              <p className="as-guide-note">Sometimes cancer progresses despite stable tests, and sometimes PSA rises without progression. Decisions are individualized.</p>
            </GuideSection>

            <GuideSection title="Advantages and Limitations">
              <p className="as-guide-p"><strong>Advantages:</strong></p>
              <ul className="as-guide-ul">
                <li>50–68% of men avoid treatment for at least 10 years.</li>
                <li>Preserves quality of life by delaying urinary, sexual, and bowel side effects.</li>
                <li>Curative treatment is still available if disease changes.</li>
              </ul>
              <p className="as-guide-p"><strong>Limitations:</strong></p>
              <ul className="as-guide-ul">
                <li>32–50% of men eventually need treatment within 10 years.</li>
                <li>Small risk (&lt;0.5%) of progression to advanced cancer during surveillance.</li>
                <li>Some men experience anxiety about "living with cancer."</li>
              </ul>
            </GuideSection>

            <GuideSection title="References">
              <ol className="as-guide-refs">
                {AS_REFERENCES.map((ref) => (
                  <li key={ref.id} className="as-guide-ref-item">
                    {ref.text}{' '}
                    <em>{ref.journal}</em>{' '}
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="as-guide-ref-link">PubMed</a>
                  </li>
                ))}
              </ol>
            </GuideSection>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="as-actions">
        <div className="as-actions-row">
          {onEditAnswers && (
            <button className="as-btn as-btn--outline" type="button" onClick={onEditAnswers}>
              <ArrowLeftIcon size={16} /><span>Edit Biopsy Answers</span>
            </button>
          )}
          {onStartOver && (
            <button className="as-btn as-btn--danger" type="button" onClick={onStartOver}>
              <RefreshCwIcon size={16} /><span>Start Over</span>
            </button>
          )}
        </div>
        <div className="as-actions-row">
          <button className="as-btn as-btn--solid" type="button" onClick={() => window.print()}>
            <PrinterIcon size={16} /><span>Print Results</span>
          </button>
          <button className="as-btn as-btn--outline" type="button" onClick={handleExportCsv}>
            <DownloadIcon size={16} /><span>Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveSurveillanceResults;
