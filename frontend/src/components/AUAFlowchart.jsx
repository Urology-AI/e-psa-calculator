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

/* ─── Decision logic ─────────────────────────────────────────────────────────
 * PSA thresholds per AUA/SUO 2026 & supporting evidence:
 *
 * 45–49  PSA < 2.5  → resume pathway at 50 (baseline screen only)
 *        PSA ≥ 2.5  → continue biannual screening
 *
 * 50–69  PSA < 3.5  → continue biannual (or every 4 yrs via SDM if < 1 at 60)
 *        PSA ≥ 3.5  → urology referral after confirmatory repeat PSA
 *
 * 70–74  PSA < 3.0  → discontinue or lengthen interval (SDM required).
 *                     Guideline text: cumulative PCa-specific mortality at 85 is
 *                     0.11% for PSA < 2 and 0.85% for PSA 2–3 — discontinuation
 *                     "could be considered in patients with PSA < 3.0 ng/mL"
 *        PSA ≥ 3.0  → continue screening / urology referral if ≥ 10 yr LE; SDM
 *
 * 75+    PSA < 3.0  → discontinue (guideline: "unlikely to be diagnosed with
 *                     aggressive prostate cancer or die from prostate cancer
 *                     during their remaining lifetime")
 *        PSA ≥ 3.0  → SDM — urology referral if LE ≥ 10 yrs
 * ─────────────────────────────────────────────────────────────────────────── */
const getAgeGroup = (age) => {
  if (age < 40) return 'under40';
  if (age < 45) return '40-44';
  if (age < 50) return '45-49';
  if (age <= 69) return '50-69';
  if (age <= 74) return '70-74';
  return 'over75';
};

const outcome4549  = (psa) => psa === null ? null : (psa < 2.5 ? 'resume' : 'biannual');
const outcome5069  = (psa) => psa === null ? null : (psa < 3.5 ? 'biannual' : 'urology');
const outcome70plus = (psa) => {
  if (psa === null) return null;
  if (psa >= 3.0) return 'urology';
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
  const isCol70   = ageGroup === '70-74' || ageGroup === 'over75';
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
    if (isCol70 && hasPsa)        return psaNum >= 3.0
      ? `PSA ${psaNum} ng/mL at age ${ageNum}: PSA ≥ 3.0 ng/mL — if life expectancy is ≥ 10 years, urology referral is recommended after a confirmatory PSA. SDM with your physician is required first.`
      : `PSA ${psaNum} ng/mL at age ${ageNum}: PSA < 3.0 ng/mL — per AUA/SUO 2026, prostate cancer-specific mortality risk is very low at this PSA level (0.11–0.85% by age 85). Discontinuing or substantially lengthening the screening interval is appropriate in most cases via SDM.`;
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

            {/* PSA < 3.0, LE ≥ 10y — per AUA/SUO 2026: PCa-specific mortality 0.11–0.85% by 85 */}
            <Threshold label="PSA < 3.0, LE ≥ 10 yrs" active={isCol70 && active70 === 'discontinue_or_lengthen'} />
            <Outcome
              icon={ICONS.discontinue_lengthen}
              label="Discontinue or Lengthen"
              detail="PSA < 3.0 — very low long-term risk; SDM to stop or extend interval"
              variant="sdm"
              active={isCol70 && active70 === 'discontinue_or_lengthen'}
              inactive={isCol70 && hasPsa && active70 !== 'discontinue_or_lengthen' && active70 !== null}
            />

            {/* PSA ≥ 3.0, LE ≥ 10y */}
            <Threshold label="PSA ≥ 3.0, LE ≥ 10 yrs" active={isCol70 && active70 === 'urology'} />
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

/* ─────────────────────────────────────────────────────────────────────────────
 * AUAGuidelineCriteria — Part 1 replacement for the flowchart
 *
 * The PSA flowchart is meaningless in Part 1 (no PSA value yet).
 * This component instead quotes the actual AUA/SUO 2026 screening statements
 * verbatim, with strength/evidence badges, personalised to age + risk profile.
 *
 * Source: Lin et al., J Urol 215:491–501, May 2026
 * ───────────────────────────────────────────────────────────────────────────── */

const STRENGTH = {
  strong:      { label: 'Strong Recommendation',      bg: '#f0fdf4', border: '#16a34a', color: '#166534' },
  conditional: { label: 'Conditional Recommendation', bg: '#eff6ff', border: '#2563eb', color: '#1e40af' },
  moderate:    { label: 'Moderate Recommendation',    bg: '#fff7ed', border: '#ea580c', color: '#9a3412' },
  expert:      { label: 'Expert Opinion',             bg: '#f9fafb', border: '#6b7280', color: '#374151' },
};

const StatementCard = ({ statement, strength, grade, applies, note }) => {
  const s = STRENGTH[strength] || STRENGTH.expert;
  return (
    <div style={{
      border: `1px solid ${applies ? s.border : '#e5e7eb'}`,
      borderLeft: `4px solid ${applies ? s.border : '#d1d5db'}`,
      borderRadius: '8px',
      padding: '12px 14px',
      background: applies ? s.bg : 'var(--surface, #fff)',
      marginBottom: '10px',
    }}>
      {applies && (
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: s.color, marginBottom: '6px' }}>
          ▶ Applies to your profile
        </div>
      )}
      <p style={{ margin: '0 0 8px', fontSize: '13px', lineHeight: 1.65, color: '#111827', fontStyle: 'italic' }}>
        "{statement}"
      </p>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
          color: s.color,
          background: '#fff',
          border: `1px solid ${applies ? s.border : '#d1d5db'}`,
          padding: '2px 8px', borderRadius: '999px',
        }}>
          {s.label}{grade ? ` · Grade ${grade}` : ''}
        </span>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>AUA/SUO 2026</span>
      </div>
      {note && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.6, color: '#374151', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
          {note}
        </p>
      )}
    </div>
  );
};

export const AUAGuidelineCriteria = ({ age, isHighRisk = false }) => {
  const ageNum = Number(age) || 0;
  const isUnder40 = ageNum < 40;
  const is4044    = ageNum >= 40 && ageNum < 45;
  const is4549    = ageNum >= 45 && ageNum < 50;
  const is5069    = ageNum >= 50 && ageNum <= 69;
  const is7074    = ageNum >= 70 && ageNum <= 74;
  const isOver75  = ageNum >= 75;

  const screeningApplies = (!isUnder40 && !is4044) || isHighRisk;
  const sdmApplies       = is7074 || isOver75;

  const profileBg   = screeningApplies ? '#f0fdf4' : (isOver75 || is7074) ? '#fff7ed' : '#f9fafb';
  const profileBorder = screeningApplies ? '#16a34a' : (isOver75 || is7074) ? '#ea580c' : '#9ca3af';

  const profileSummary = (() => {
    if (isUnder40 && !isHighRisk)
      return { label: `Age ${ageNum} · Average risk`, body: 'AUA/SUO 2026 does not recommend routine PSA screening before age 40 for average-risk patients. The 25-year risk of metastases or death from prostate cancer is extremely low (0.5% and 0.2%, respectively) in this age group.' };
    if ((isUnder40 || is4044) && isHighRisk)
      return { label: `Age ${ageNum} · High-risk profile`, body: 'High-risk patients — Black ancestry, first-degree family history of prostate cancer, or known germline mutation (BRCA1/2, ATM, Lynch syndrome) — may begin shared decision-making about PSA screening from age 40 per AUA/SUO 2026.' };
    if (is4549)
      return { label: `Age ${ageNum} · Baseline screening window`, body: 'AUA/SUO 2026 supports offering a baseline PSA at ages 45–49. A result < 2.5 ng/mL suggests re-entering the pathway at age 50; ≥ 2.5 ng/mL warrants continuing biannual screening.' };
    if (is5069)
      return { label: `Age ${ageNum} · Core screening window`, body: 'Ages 50–69 represent the period with the strongest evidence of benefit from PSA-based screening. AUA/SUO 2026 strongly recommends offering PSA screening every 2–4 years in this group (Grade A).' };
    if (is7074)
      return { label: `Age ${ageNum} · Shared decision-making required`, body: 'At age 70–74, AUA/SUO 2026 requires shared decision-making (SDM). The decision to continue or discontinue screening depends on life expectancy, prior PSA history, and patient preferences. Patients with life expectancy < 10 years should generally discontinue screening.' };
    if (isOver75)
      return { label: `Age ${ageNum} · Screening beyond typical range`, body: 'AUA/SUO 2026 notes that patients aged 75+ with PSA < 3 ng/mL are unlikely to be diagnosed with aggressive prostate cancer or die from it during their remaining lifetime. Discontinuing or substantially lengthening the screening interval is appropriate for most patients, subject to SDM.' };
    return null;
  })();

  const stmt1Note = (() => {
    if (isUnder40 && !isHighRisk) return 'This statement does not apply yet for average-risk patients before age 40.';
    if ((isUnder40 || is4044) && isHighRisk) return 'Your high-risk profile makes this statement applicable now — discuss PSA testing with your physician.';
    if (is4549) return 'A baseline PSA should be considered at your age. Your PSA result will determine your next step on the screening pathway.';
    if (is5069) return 'Regular PSA testing every 2–4 years is strongly recommended at your age.';
    if (sdmApplies) return 'Whether to continue PSA screening at your age requires a shared decision with your physician.';
    return null;
  })();

  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '10px' }}>
        AUA / SUO 2026 — PSA Screening Guideline Statements
      </div>

      {/* Age / risk profile summary */}
      {profileSummary && (
        <div style={{
          border: `1px solid ${profileBorder}`,
          borderLeft: `4px solid ${profileBorder}`,
          borderRadius: '8px',
          padding: '12px 14px',
          background: profileBg,
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>{profileSummary.label}</div>
          <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.65, color: '#374151' }}>{profileSummary.body}</p>
        </div>
      )}

      {/* Statement 1 — PSA as first screening test */}
      <StatementCard
        statement="When screening for prostate cancer, clinicians should use PSA as the first screening test."
        strength="strong"
        grade="A"
        applies={screeningApplies}
        note={stmt1Note}
      />

      {/* Statement 2 — Repeat PSA before secondary workup */}
      <StatementCard
        statement="For people with a newly elevated PSA, clinicians should repeat the PSA prior to a secondary biomarker, imaging, or biopsy."
        strength="expert"
        applies={screeningApplies}
        note={screeningApplies ? 'If your PSA result comes back elevated, the guideline recommends confirming with a repeat test before any further workup (biomarker, MRI, or biopsy).' : null}
      />

      {/* Statement 3 — SDM / personalised interval */}
      <StatementCard
        statement="Clinicians may personalize the re-screening interval, or decide to discontinue screening, based on patient preference, age, PSA, prostate cancer risk, life expectancy, and general health following shared decision-making (SDM)."
        strength="conditional"
        grade="B"
        applies={sdmApplies}
        note={sdmApplies
          ? 'Shared decision-making is especially important at your age. Your physician must weigh life expectancy, prior PSA history, and your preferences before committing to any screening decision.'
          : 'Applies to all patients — your physician may extend or shorten the recommended interval based on your individual profile and preferences.'}
      />

      {/* Statement 4 — DRE as adjunct */}
      <StatementCard
        statement="Clinicians may use DRE alongside PSA to establish risk of clinically significant prostate cancer."
        strength="conditional"
        grade="C"
        applies={false}
        note="DRE should not replace PSA as a first-line screening test in asymptomatic patients. It is a complementary tool — survey data suggest that requiring upfront DRE with PSA leads some patients to forgo screening entirely."
      />

      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px', lineHeight: 1.5 }}>
        Source: Lin et al., <em>J Urol</em> 215:491–501, May 2026 · AUA/SUO Early Detection of Prostate Cancer Guideline (2026)
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
 * AUAInitialBiopsyGuidelines — Part 2 supplement below the PSA flowchart
 *
 * Shows the AUA/SUO 2026 statements for initial biopsy, MRI, biomarkers,
 * repeat biopsy, and biopsy technique — all verbatim with strength/grade badges.
 * Personalised to the patient's situation (biopsy recommended, PI-RADS, etc.).
 *
 * Props:
 *   biopsyRecommended  — boolean
 *   epsaTierKey        — 'low'|'intermediate-low'|'intermediate-high'|'high'
 *   piradsVal          — null | 1–5 (null if MRI not done)
 *   pathwayMode        — 'post_psa' | 'post_mri'
 * ─────────────────────────────────────────────────────────────────────────── */
export const AUAInitialBiopsyGuidelines = ({
  biopsyRecommended = false,
  epsaTierKey = null,
  piradsVal = null,
  pathwayMode = 'post_psa',
}) => {
  const biopsyContext = biopsyRecommended
    || epsaTierKey === 'intermediate-high'
    || epsaTierKey === 'high';
  const mriDone        = pathwayMode === 'post_mri' || piradsVal != null;
  const piradsNegative = piradsVal != null && piradsVal <= 2;
  const piradsEquivocal = piradsVal === 3;
  const piradsPositive  = piradsVal != null && piradsVal >= 4;

  return (
    <div style={{ marginTop: '18px', borderTop: '1px dashed #e5e7eb', paddingTop: '16px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '10px' }}>
        AUA / SUO 2026 — Initial Biopsy &amp; Workup Guideline Statements
      </div>

      {/* Statement: MRI before biopsy — Conditional · Grade A */}
      <StatementCard
        statement="Clinicians may use magnetic resonance imaging (MRI) prior to initial biopsy to increase the detection of Grade Group (GG)2+ prostate cancer."
        strength="conditional"
        grade="A"
        applies={biopsyContext}
        note={
          mriDone
            ? `Your MRI result (PI-RADS ${piradsVal ?? '—'}) is already factored into this assessment.${
                piradsPositive ? ' PI-RADS ≥ 4 indicates a suspicious lesion — targeted plus systematic biopsy is typically recommended.' :
                piradsEquivocal ? ' PI-RADS 3 is equivocal — PSA density and clinical risk guide whether to proceed with biopsy.' :
                ' PI-RADS 1–2 indicates low suspicion on MRI, though clinical risk may still support biopsy.'
              }`
            : biopsyContext
            ? 'If you have not yet had an MRI, AUA/SUO 2026 conditionally recommends obtaining one before biopsy (Grade A). MRI increases detection of clinically significant cancer and reduces over-detection of insignificant disease.'
            : 'MRI before biopsy is recommended when biopsy is being considered. Discuss with your urologist.'
        }
      />

      {/* Statement: Systematic biopsy with negative/equivocal MRI — Moderate · Grade C */}
      {mriDone && (piradsNegative || piradsEquivocal) && (
        <StatementCard
          statement="For patients with both absence of suspicious findings on MRI and elevated risk for GG2+ prostate cancer, clinicians should proceed with a systematic biopsy."
          strength="moderate"
          grade="C"
          applies={biopsyContext && (piradsNegative || piradsEquivocal)}
          note={
            piradsNegative && biopsyContext
              ? 'Your MRI shows low suspicion (PI-RADS 1–2), but your elevated clinical risk means systematic biopsy may still be warranted per AUA/SUO 2026. PSA density (serum PSA ÷ prostate volume) is the strongest predictor in this setting — discuss with your urologist.'
              : piradsEquivocal && biopsyContext
              ? 'PI-RADS 3 is equivocal. PSA density < 0.10 ng/mL/cc can help avoid biopsy in up to 43% of patients while maintaining 93% NPV per AUA/SUO 2026. Ask your urologist about PSA density before proceeding.'
              : 'With low MRI suspicion and lower clinical risk, biopsy may not be immediately necessary. Continue monitoring with serial PSA.'
          }
        />
      )}

      {/* Statement: Adjunctive biomarkers — Conditional · Grade C */}
      <StatementCard
        statement="Clinicians may use adjunctive urine or serum markers when further risk stratification would influence the decision regarding whether to proceed with biopsy."
        strength="conditional"
        grade="C"
        applies={biopsyContext}
        note={
          biopsyContext
            ? 'Validated biomarkers — 4Kscore, PHI, IsoPSA, SelectMDx, ExoDx Prostate Intelliscore, MPS2 — can refine biopsy decisions. A sub-threshold result avoids biopsy in ~one-third of patients, with a 5–10% risk of delayed detection of GG2+ cancer. These tests should be ordered when the result would substantively change management.'
            : 'Biomarkers add precision to biopsy decisions at any risk level. Most are validated for biopsy-naïve patients; some (MPS2, 4Kscore) are also validated after a negative biopsy.'
        }
      />

      {/* Statement: Repeat biopsy biomarkers — Conditional · Grade C
          Always shown as informational in Part 2 (prior biopsy may be relevant) */}
      <StatementCard
        statement="After a negative biopsy, clinicians may use blood-, urine-, or tissue-based biomarkers selectively for further risk stratification if results are likely to influence the decision regarding repeat biopsy or otherwise substantively change the patient's management."
        strength="conditional"
        grade="C"
        applies={false}
        note="If you have had a prior negative biopsy and PSA remains elevated, biomarkers such as MPS2 (95% NPV at threshold 40, avoids 67% of biopsies) and 4Kscore are validated for guiding repeat biopsy decisions per AUA/SUO 2026."
      />

      {/* Statement: Biopsy technique — Conditional · Grade B */}
      {biopsyRecommended && (
        <StatementCard
          statement="Clinicians may use either a transrectal or transperineal biopsy route when performing a biopsy."
          strength="conditional"
          grade="B"
          applies={biopsyRecommended}
          note="Both routes have similar detection rates for GG2+ cancer. Transperineal biopsy may reduce infection risk and is gaining traction due to antibiotic resistance concerns. Transrectal biopsy may be preferred based on patient comfort, prostate anatomy, or local expertise. Discuss with your urologist."
        />
      )}

      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '10px', lineHeight: 1.5 }}>
        Source: Lin et al., <em>J Urol</em> 215:491–501, May 2026 · AUA/SUO Early Detection of Prostate Cancer Guideline (2026)
      </p>
    </div>
  );
};
