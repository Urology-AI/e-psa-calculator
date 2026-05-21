import React from 'react';
import {
  RotateCcw, CalendarDays, Stethoscope, Ban, Clock,
  Users, AlertTriangle, ArrowDownRight,
} from 'lucide-react';
import './AUAFlowchart.css';

/*
 * AUAScreeningFlowchart
 *
 * Recreates the AUA/SUO 2023 (amended 2026) PSA Screening Decision Flowchart.
 * Highlights the patient's current position based on age and PSA value.
 *
 * Props:
 *   age          — numeric patient age
 *   psaValue     — optional numeric PSA value (ng/mL); Part 2 only
 *   isHighRisk   — boolean: Black ancestry || family history || germline mutation
 *   part         — 'part1' | 'part2'; controls which decision nodes to highlight
 */

/* ─── Icon map ─── */
const ICONS = {
  resume:              <RotateCcw     size={13} strokeWidth={2.2} aria-hidden="true" />,
  biannual:            <CalendarDays  size={13} strokeWidth={2.2} aria-hidden="true" />,
  urology:             <Stethoscope   size={13} strokeWidth={2.2} aria-hidden="true" />,
  discontinue:         <Ban           size={13} strokeWidth={2.2} aria-hidden="true" />,
  discontinue_lengthen:<Clock         size={13} strokeWidth={2.2} aria-hidden="true" />,
  sdm:                 <Users         size={16} strokeWidth={2}   aria-hidden="true" />,
  high_risk:           <AlertTriangle size={12} strokeWidth={2.2} aria-hidden="true" />,
};

/* ─── Decision logic ─── */
const getAgeGroup = (age) => {
  if (age < 40) return 'under40';
  if (age < 45) return '40-44';
  if (age < 50) return '45-49';
  if (age <= 69) return '50-69';
  if (age <= 75) return '70-75';
  return 'over75';
};

const outcome4549  = (psa) => psa === null ? null : (psa < 2.5 ? 'resume' : 'biannual');
const outcome5069  = (psa) => psa === null ? null : (psa < 3.5 ? 'biannual' : 'urology');
const outcome70plus = (psa) => {
  if (psa === null) return null;
  if (psa >= 6.5) return 'urology';
  return 'discontinue_or_lengthen';
};

/* ─── Sub-components ─── */

const AgeBox = ({ label, note, active, inactive }) => (
  <div className={[
    'aua-fc__age-header',
    active   ? 'aua-fc__age-header--active'   : '',
    inactive ? 'aua-fc__age-header--inactive' : '',
  ].filter(Boolean).join(' ')}>
    {label}
    {note && <div className="aua-fc__age-note">{note}</div>}
  </div>
);

/* Threshold row — PSA cut-point between branches */
const Threshold = ({ label, active }) => (
  <div className={`aua-fc__threshold${active ? ' aua-fc__threshold--active' : ''}`}>
    {active && (
      <span className="aua-fc__threshold-arrow" aria-hidden="true">
        <ArrowDownRight size={10} strokeWidth={2.5} />
      </span>
    )}
    {label}
  </div>
);

/* Outcome node */
const Outcome = ({ icon, label, detail, variant = '', active, inactive }) => (
  <div className={[
    'aua-fc__outcome',
    variant ? `aua-fc__outcome--${variant}` : '',
    active   ? 'aua-fc__outcome--active'   : '',
    inactive ? 'aua-fc__outcome--inactive' : '',
  ].filter(Boolean).join(' ')}>
    {icon && (
      <span className="aua-fc__outcome-icon" aria-hidden="true">{icon}</span>
    )}
    <span className="aua-fc__outcome-label">{label}</span>
    {detail && <span className="aua-fc__outcome-detail">{detail}</span>}
    {active && <span className="aua-fc__outcome-path-badge">Your path</span>}
  </div>
);

/* ─── Main component ─── */
const AUAScreeningFlowchart = ({ age, psaValue = null, isHighRisk = false, part = 'part1' }) => {
  const ageNum  = Number(age) || 0;
  const psaNum  = (psaValue !== null && psaValue !== '' && psaValue !== undefined)
    ? parseFloat(psaValue)
    : null;
  const hasPsa   = psaNum !== null && !isNaN(psaNum);
  const ageGroup = getAgeGroup(ageNum);

  const isCol4549 = ageGroup === '45-49' || (ageGroup === '40-44' && isHighRisk);
  const isCol5069 = ageGroup === '50-69';
  const isCol70   = ageGroup === '70-75' || ageGroup === 'over75';
  const isUnder40 = ageGroup === 'under40' || (ageGroup === '40-44' && !isHighRisk);

  const hasActiveCol = isCol4549 || isCol5069 || isCol70;

  const active4549 = isCol4549 ? outcome4549(hasPsa ? psaNum : null)   : null;
  const active5069 = isCol5069 ? outcome5069(hasPsa ? psaNum : null)   : null;
  const active70   = isCol70   ? outcome70plus(hasPsa ? psaNum : null) : null;

  /* Patient position text */
  const positionText = (() => {
    if (isUnder40 && !isHighRisk) return `Age ${ageNum}: AUA/NCCN do not recommend routine PSA screening before age 40 for average-risk patients.`;
    if (isUnder40 && isHighRisk)  return `Age ${ageNum}: High-risk profile present. AUA/NCCN allow shared decision-making around PSA screening from age 40.`;
    if (isCol4549 && !hasPsa)     return `Age ${ageNum}: Baseline PSA determines the next step. PSA < 2.5 ng/mL → re-enter pathway at age 50; PSA ≥ 2.5 ng/mL → continue biannual screening.`;
    if (isCol4549 && hasPsa)      return psaNum < 2.5
      ? `PSA ${psaNum} ng/mL at age ${ageNum}: Below the 2.5 ng/mL threshold — no immediate follow-up needed. Re-enter pathway at age 50.`
      : `PSA ${psaNum} ng/mL at age ${ageNum}: At or above 2.5 ng/mL — continue biannual PSA screening.`;
    if (isCol5069 && !hasPsa)     return `Age ${ageNum}: Regular PSA screening every 2–4 years is recommended (AUA Grade A). Your PSA result will determine whether to continue routine screening or refer to urology.`;
    if (isCol5069 && hasPsa)      return psaNum < 3.5
      ? `PSA ${psaNum} ng/mL at age ${ageNum}: Below threshold — continue biannual screening. SDM may extend to every 4 years.`
      : `PSA ${psaNum} ng/mL at age ${ageNum}: At or above 3.5 ng/mL — urology referral is recommended after a confirmatory repeat PSA.`;
    if (isCol70 && !hasPsa)       return `Age ${ageNum}: Per AUA/SUO 2026, all screening decisions at 70+ require Shared Decision-Making (SDM). Your physician must first assess life expectancy. If < 10 years, discontinuing screening is recommended regardless of PSA.`;
    if (isCol70 && hasPsa)        return psaNum >= 6.5
      ? `PSA ${psaNum} ng/mL at age ${ageNum}: PSA ≥ 6.5 ng/mL — if life expectancy is ≥ 10 years, urology referral is recommended after a confirmatory PSA. Life expectancy must be assessed by your physician first (SDM required).`
      : `PSA ${psaNum} ng/mL at age ${ageNum}: PSA < 6.5 ng/mL — if life expectancy is ≥ 10 years, screening may be discontinued or the interval lengthened (SDM with physician). If life expectancy is < 10 years, discontinuing is recommended.`;
    return null;
  })();

  return (
    <div className="aua-fc" role="figure" aria-label="AUA/SUO PSA Screening Decision Flowchart">

      <div className="aua-fc__title">AUA / SUO 2023 (amended 2026) — PSA Screening Algorithm</div>

      {/* SDM top node */}
      <div className="aua-fc__sdm">
        <span className="aua-fc__sdm-icon">{ICONS.sdm}</span>
        <div>
          <div className="aua-fc__sdm-main">Patient + Clinician: Shared Decision-Making (SDM)</div>
          <div className="aua-fc__sdm-sub">Entry point for all age groups — patient values and preferences guide the final decision</div>
        </div>
      </div>

      {/* Connector row */}
      <div className="aua-fc__connector-row" aria-hidden="true">
        {/* Highlighted connector lines for active column */}
        <div className={`aua-fc__connector-line${isCol4549 ? ' aua-fc__connector-line--active' : ''}`} />
        <div className={`aua-fc__connector-line${isCol5069 ? ' aua-fc__connector-line--active' : ''}`} />
        <div className={`aua-fc__connector-line${isCol70   ? ' aua-fc__connector-line--active' : ''}`} />
      </div>

      {/* Age columns */}
      <div className={`aua-fc__columns${hasActiveCol ? ' aua-fc__columns--has-active' : ''}`}>

        {/* Column 1: 45–49 */}
        <div className={`aua-fc__col${isCol4549 ? ' aua-fc__col--active' : ''}`}>
          <AgeBox
            label={isHighRisk && ageGroup === '40-44' ? 'Age 40–44' : 'Age 45–49'}
            note={isHighRisk ? 'High-risk: may start at 40' : 'Baseline PSA offer'}
            active={isCol4549}
            inactive={!isCol4549 && hasActiveCol}
          />
          <div className="aua-fc__branches">
            <Threshold label="PSA < 2.5 ng/mL" active={isCol4549 && active4549 === 'resume'} />
            <Outcome
              icon={ICONS.resume}
              label="Resume at Age 50"
              detail="No immediate follow-up — re-enter at age 50"
              variant="resume"
              active={isCol4549 && active4549 === 'resume'}
              inactive={isCol4549 && hasPsa && active4549 !== 'resume'}
            />
            <Threshold label="PSA ≥ 2.5 ng/mL" active={isCol4549 && active4549 === 'biannual'} />
            <Outcome
              icon={ICONS.biannual}
              label="Continue Biannual"
              detail="PSA every 2 years"
              variant="biannual"
              active={isCol4549 && active4549 === 'biannual'}
              inactive={isCol4549 && hasPsa && active4549 !== 'biannual'}
            />
          </div>
        </div>

        {/* Column 2: 50–69 */}
        <div className={`aua-fc__col${isCol5069 ? ' aua-fc__col--active' : ''}`}>
          <AgeBox
            label="Age 50–69"
            note="Strong recommendation · Grade A"
            active={isCol5069}
            inactive={!isCol5069 && hasActiveCol}
          />
          <div className="aua-fc__branches">
            <Threshold label="PSA < 3.5 ng/mL" active={isCol5069 && active5069 === 'biannual'} />
            <Outcome
              icon={ICONS.biannual}
              label="Continue Biannual"
              detail="SDM: may extend to every 4 years"
              variant="biannual"
              active={isCol5069 && active5069 === 'biannual'}
              inactive={isCol5069 && hasPsa && active5069 !== 'biannual'}
            />
            <Threshold label="PSA ≥ 3.5 ng/mL" active={isCol5069 && active5069 === 'urology'} />
            <Outcome
              icon={ICONS.urology}
              label="Urology Referral"
              detail="Confirmatory repeat PSA first, then next-step discussion"
              variant="urology"
              active={isCol5069 && active5069 === 'urology'}
              inactive={isCol5069 && hasPsa && active5069 !== 'urology'}
            />
          </div>
        </div>

        {/* Column 3: 70+ */}
        <div className={`aua-fc__col${isCol70 ? ' aua-fc__col--active' : ''}`}>
          <AgeBox
            label="Age 70+"
            note="SDM required · Life expectancy"
            active={isCol70}
            inactive={!isCol70 && hasActiveCol}
          />
          <div className="aua-fc__branches">
            {/* LE < 10y branch — always visible for 70+ patients; physician must assess LE first */}
            <Threshold label="Life expectancy < 10 yrs" active={false} />
            <Outcome
              icon={ICONS.discontinue}
              label="Discontinue Screening"
              detail="Benefit unlikely to outweigh risks"
              variant="discontinue"
              active={false}
              inactive={!isCol70}
            />

            {/* PSA < 6.5, LE ≥ 10y */}
            <Threshold label="PSA < 6.5, LE ≥ 10 yrs" active={isCol70 && active70 === 'discontinue_or_lengthen'} />
            <Outcome
              icon={ICONS.discontinue_lengthen}
              label="Discontinue or Lengthen"
              detail="Extend interval or stop — SDM with physician"
              variant="sdm"
              active={isCol70 && active70 === 'discontinue_or_lengthen'}
              inactive={isCol70 && hasPsa && active70 !== 'discontinue_or_lengthen' && active70 !== null}
            />

            {/* PSA ≥ 6.5, LE ≥ 10y */}
            <Threshold label="PSA ≥ 6.5, LE ≥ 10 yrs" active={isCol70 && active70 === 'urology'} />
            <Outcome
              icon={ICONS.urology}
              label="Urology Referral"
              detail="Confirmatory PSA, then biopsy discussion"
              variant="urology"
              active={isCol70 && active70 === 'urology'}
              inactive={isCol70 && hasPsa && active70 !== 'urology' && active70 !== null}
            />

            {isCol70 && !hasPsa && (
              <div className="aua-fc__sdm-callout">
                Life expectancy assessment is required first — physician must assess before any PSA-based decision
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient position callout */}
      {positionText && (
        <div className="aua-fc__position-callout" role="note">
          <strong>Your position on this flowchart:</strong> {positionText}
        </div>
      )}

      {/* Post-referral note */}
      {hasPsa && (active5069 === 'urology' || active70 === 'urology') && (
        <div className="aua-fc__position-callout aua-fc__position-callout--referral" role="note">
          <strong>After urology referral:</strong> AUA/NCCN recommend a <strong>confirmatory repeat PSA</strong> before any further workup. If still elevated, your urologist will discuss next steps — including whether an mpMRI before biopsy is appropriate.
        </div>
      )}

      {/* High-risk footnote */}
      <div className="aua-fc__footnote">
        <span className="aua-fc__footnote-icon">{ICONS.high_risk}</span>
        <span>
          <strong>High-Risk Patients</strong> — Black ancestry, germline mutation (BRCA1/2, ATM, Lynch), or first-degree family history of prostate cancer may begin biannual screening discussions at <strong>age 40</strong> per AUA/NCCN. All other patients should start no earlier than 45–50.
        </span>
      </div>

      <div className="aua-fc__source">
        Source: AUA/SUO Early Detection of Prostate Cancer Guideline 2023, amended 2026 · NCCN v3.2024
      </div>
    </div>
  );
};

export default AUAScreeningFlowchart;
