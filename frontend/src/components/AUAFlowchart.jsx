import React from 'react';
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

/* ─── Decision logic ─── */
const getAgeGroup = (age) => {
  if (age < 40) return 'under40';
  if (age < 45) return '40-44';
  if (age < 50) return '45-49';
  if (age <= 69) return '50-69';
  if (age <= 75) return '70-75';
  return 'over75';
};

/* Returns active outcome key for 45-49 column */
const outcome4549 = (psa) => {
  if (psa === null) return null;
  return psa < 2.5 ? 'resume' : 'biannual';
};

/* Returns active outcome key for 50-69 column */
const outcome5069 = (psa) => {
  if (psa === null) return null;
  return psa < 3.5 ? 'biannual' : 'urology';
};

/* Returns active outcome key for 70+ column */
const outcome70plus = (psa) => {
  if (psa === null) return null;
  if (psa >= 6.5) return 'urology';  // if LE ≥ 10y
  return 'discontinue';              // PSA < 6.5 — discontinue or lengthen
};

/* ─── Sub-components ─── */

const AgeBox = ({ label, note, active, inactive }) => (
  <div className={`aua-fc__age-header${active ? ' aua-fc__age-header--active' : ''}${inactive ? ' aua-fc__age-header--inactive' : ''}`}>
    {label}
    {note && <div className="aua-fc__age-note">{note}</div>}
  </div>
);

const Threshold = ({ label, active }) => (
  <div className={`aua-fc__threshold${active ? ' aua-fc__threshold--active' : ''}`}>
    {label}
  </div>
);

const Outcome = ({ icon, label, detail, variant = '', active, inactive }) => (
  <div className={[
    'aua-fc__outcome',
    variant ? `aua-fc__outcome--${variant}` : '',
    active  ? 'aua-fc__outcome--active'  : '',
    inactive? 'aua-fc__outcome--inactive': '',
  ].filter(Boolean).join(' ')}>
    {icon && <span className="aua-fc__outcome-icon">{icon}</span>}
    <span className="aua-fc__outcome-label">{label}</span>
    {detail && <span className="aua-fc__outcome-detail">{detail}</span>}
  </div>
);

/* ─── Main component ─── */
const AUAScreeningFlowchart = ({ age, psaValue = null, isHighRisk = false, part = 'part1' }) => {
  const ageNum = Number(age) || 0;
  const psaNum = (psaValue !== null && psaValue !== '' && psaValue !== undefined)
    ? parseFloat(psaValue)
    : null;
  const hasPsa  = psaNum !== null && !isNaN(psaNum);
  const ageGroup = getAgeGroup(ageNum);

  const isCol4549  = ageGroup === '45-49' || (ageGroup === '40-44' && isHighRisk);
  const isCol5069  = ageGroup === '50-69';
  const isCol70    = ageGroup === '70-75' || ageGroup === 'over75';
  const isUnder40  = ageGroup === 'under40' || (ageGroup === '40-44' && !isHighRisk);

  /* Active outcomes */
  const active4549  = isCol4549  ? outcome4549(hasPsa ? psaNum : null)  : null;
  const active5069  = isCol5069  ? outcome5069(hasPsa ? psaNum : null)  : null;
  const active70    = isCol70    ? outcome70plus(hasPsa ? psaNum : null) : null;

  /* Patient-specific position callout text */
  const positionText = (() => {
    if (isUnder40 && !isHighRisk) {
      return 'Your age is below 40. AUA/NCCN do not recommend routine PSA screening at this age for average-risk men.';
    }
    if (isUnder40 && isHighRisk) {
      return 'Your age is under 40, but you have a high-risk factor. AUA/NCCN allow screening discussion from age 40.';
    }
    if (isCol4549 && !hasPsa) {
      return `Age ${ageNum}: Your baseline PSA will determine the next step. PSA < 2.5 ng/mL → resume at 50; PSA ≥ 2.5 → continue biannual screening.`;
    }
    if (isCol4549 && hasPsa) {
      return psaNum < 2.5
        ? `PSA ${psaNum} ng/mL at age ${ageNum}: Below the 2.5 ng/mL threshold — resume screening at age 50.`
        : `PSA ${psaNum} ng/mL at age ${ageNum}: At or above 2.5 ng/mL — continue biannual PSA screening.`;
    }
    if (isCol5069 && !hasPsa) {
      return `Age ${ageNum}: Regular PSA screening every 2–4 years is recommended. Your result will determine whether to continue routine screening or refer to urology.`;
    }
    if (isCol5069 && hasPsa) {
      return psaNum < 3.5
        ? `PSA ${psaNum} ng/mL at age ${ageNum}: Below threshold — continue biannual screening. Discuss extending to every 4 years with your doctor.`
        : `PSA ${psaNum} ng/mL at age ${ageNum}: At or above 3.5 ng/mL — a urology referral is recommended after a confirmatory repeat PSA.`;
    }
    if (isCol70 && !hasPsa) {
      return `Age ${ageNum}: PSA screening decisions at age 70+ require Shared Decision-Making (SDM) — your doctor will assess life expectancy and overall health. If life expectancy is ≥ 10 years, the PSA level determines whether to continue, lengthen, or discontinue screening.`;
    }
    if (isCol70 && hasPsa) {
      if (psaNum >= 6.5) {
        return `PSA ${psaNum} ng/mL at age ${ageNum}: PSA ≥ 6.5 ng/mL — if life expectancy is ≥ 10 years, a urology referral is recommended. Your doctor must assess life expectancy first via SDM.`;
      }
      return `PSA ${psaNum} ng/mL at age ${ageNum}: PSA < 6.5 ng/mL — depending on life expectancy, screening may be discontinued or the interval lengthened. Discuss with your doctor.`;
    }
    return null;
  })();

  return (
    <div className="aua-fc" role="figure" aria-label="AUA PSA Screening Decision Flowchart">

      <div className="aua-fc__title">AUA / SUO 2023 (amended 2026) — PSA Screening Algorithm</div>

      {/* ── SDM top node ── */}
      <div className="aua-fc__sdm">
        Patient + clinician engage in Shared Decision-Making (SDM) regarding PSA screening
        <div className="aua-fc__sdm-sub">
          Entry point for all age groups — the patient's values and preferences guide the final decision
        </div>
      </div>

      {/* ── Connector row ── */}
      <div className="aua-fc__connector-row" aria-hidden="true" />

      {/* ── Age columns ── */}
      <div className="aua-fc__columns">

        {/* ── Column 1: 45–49 ── */}
        <div className={`aua-fc__col${isCol4549 ? ' aua-fc__col--active' : ''}`}>
          <AgeBox
            label={isHighRisk && ageGroup === '40-44' ? 'Age 40–44' : 'Age 45–49'}
            note={isHighRisk ? '★ High-risk: start here at 40' : '* Baseline PSA offer'}
            active={isCol4549}
            inactive={!isCol4549 && (isCol5069 || isCol70)}
          />

          <div className="aua-fc__branches">
            <Threshold
              label={`PSA < 2.5 ng/mL`}
              active={isCol4549 && active4549 === 'resume'}
            />
            <Outcome
              icon="↺"
              label="Resume at Age 50"
              detail="No immediate follow-up needed — re-enter at age 50"
              variant="resume"
              active={isCol4549 && active4549 === 'resume'}
              inactive={isCol4549 && hasPsa && active4549 !== 'resume'}
            />

            <Threshold
              label="PSA ≥ 2.5 ng/mL"
              active={isCol4549 && active4549 === 'biannual'}
            />
            <Outcome
              icon="📅"
              label="Continue Biannual"
              detail="PSA every 2 years"
              variant="biannual"
              active={isCol4549 && active4549 === 'biannual'}
              inactive={isCol4549 && hasPsa && active4549 !== 'biannual'}
            />
          </div>
        </div>

        {/* ── Column 2: 50–69 ── */}
        <div className={`aua-fc__col${isCol5069 ? ' aua-fc__col--active' : ''}`}>
          <AgeBox
            label="Age 50–69"
            note="Strong recommendation (Grade A)"
            active={isCol5069}
            inactive={!isCol5069 && (isCol4549 || isCol70)}
          />

          <div className="aua-fc__branches">
            <Threshold
              label="PSA < 3.5 ng/mL"
              active={isCol5069 && active5069 === 'biannual'}
            />
            <Outcome
              icon="📅"
              label="Continue Biannual"
              detail="SDM: may extend to every 4 years"
              variant="biannual"
              active={isCol5069 && active5069 === 'biannual'}
              inactive={isCol5069 && hasPsa && active5069 !== 'biannual'}
            />

            <Threshold
              label="PSA ≥ 3.5 ng/mL"
              active={isCol5069 && active5069 === 'urology'}
            />
            <Outcome
              icon="🏥"
              label="Urology Referral"
              detail="Confirmatory repeat PSA first, then next-step discussion"
              variant="urology"
              active={isCol5069 && active5069 === 'urology'}
              inactive={isCol5069 && hasPsa && active5069 !== 'urology'}
            />
          </div>
        </div>

        {/* ── Column 3: 70+ ── */}
        <div className={`aua-fc__col${isCol70 ? ' aua-fc__col--active' : ''}`}>
          <AgeBox
            label="Age 70+"
            note="SDM: life expectancy required"
            active={isCol70}
            inactive={!isCol70 && (isCol4549 || isCol5069)}
          />

          <div className="aua-fc__branches">
            {/* Life expectancy < 10 years → Discontinue */}
            <Threshold label="Life expectancy < 10 yrs" active={false} />
            <Outcome
              icon="⛔"
              label="Discontinue Screening"
              detail="Benefit unlikely to outweigh risks"
              variant="discontinue"
              active={false}
            />

            {/* PSA < 6.5 + LE ≥ 10y */}
            <Threshold
              label="PSA < 6.5, LE ≥ 10 yrs"
              active={isCol70 && active70 === 'discontinue'}
            />
            <Outcome
              icon="⏸"
              label="Discontinue or Lengthen"
              detail="Extend interval or stop — SDM with physician"
              variant="sdm"
              active={isCol70 && active70 === 'discontinue'}
              inactive={isCol70 && hasPsa && active70 !== 'discontinue' && active70 !== null}
            />

            {/* PSA ≥ 6.5 + LE ≥ 10y */}
            <Threshold
              label="PSA ≥ 6.5, LE ≥ 10 yrs"
              active={isCol70 && active70 === 'urology'}
            />
            <Outcome
              icon="🏥"
              label="Urology Referral"
              detail="Confirmatory PSA, then biopsy discussion"
              variant="urology"
              active={isCol70 && active70 === 'urology'}
              inactive={isCol70 && hasPsa && active70 !== 'urology' && active70 !== null}
            />

            {/* SDM note when no PSA available */}
            {isCol70 && !hasPsa && (
              <div className="aua-fc__sdm-callout">
                Life expectancy assessment required — your physician must perform SDM to select the right path above
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Patient position callout ── */}
      {positionText && (
        <div className="aua-fc__position-callout" role="note">
          <strong>Your position on this flowchart:</strong> {positionText}
        </div>
      )}

      {/* ── High-risk footnote ── */}
      <div className="aua-fc__footnote">
        <strong>★ High-Risk Patients</strong> — Black ancestry, germline mutation (BRCA1/2, ATM, Lynch), or a first-degree family history of prostate cancer may begin biannual screening discussions at <strong>age 40</strong> per AUA/NCCN. All other patients should start no earlier than 45–50.
      </div>

      {/* ── After elevated PSA box ── */}
      {(hasPsa && (active5069 === 'urology' || active70 === 'urology')) && (
        <div className="aua-fc__position-callout" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#991b1b', marginTop: '0.5rem' }} role="note">
          <strong>After urology referral:</strong> AUA/NCCN recommend a <strong>confirmatory repeat PSA</strong> before any further workup. If still elevated, your urologist will discuss next steps — including whether an mpMRI before biopsy is appropriate. The SHARE approach (Seek, Help, Assess, Reach, Evaluate) guides this conversation.
        </div>
      )}

      <div className="aua-fc__source">
        Source: AUA/SUO Early Detection of Prostate Cancer Guideline 2023, amended 2026 · NCCN v3.2024
      </div>
    </div>
  );
};

export default AUAScreeningFlowchart;
