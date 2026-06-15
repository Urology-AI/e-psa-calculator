import React from 'react';
import { MODEL_ACCURACY } from '../utils/epsaEngine';
import './ModelDocumentation.css';
import { AlertTriangleIcon } from 'lucide-react';

/* ── Architecture stages ── */
const STAGES = [
  {
    num: 1,
    label: 'Baseline Risk (Part 1)',
    desc: 'Questionnaire only — age, BMI, race, family history, BRCA/HOXB13, IPSS, SHIM, lifestyle, comorbidities',
    model: 'Model 1',
    color: '#2563eb',
  },
  {
    num: 2,
    label: 'PSA Added (Part 2 — PSA pathway)',
    desc: 'Part 1 score + PSA level + PSA density if volume available; 5-ARI correction applied when indicated',
    model: 'Model 2',
    color: '#d97706',
  },
  {
    num: 3,
    label: 'MRI Added (Part 2 — MRI pathway)',
    desc: 'Part 1 + PSA (adjusted) + PI-RADS score; logistic regression targeting GG≥2 clinically significant prostate cancer (updated N=96, 2026-06-02)',
    model: 'Model 3',
    color: '#dc2626',
  },
  {
    num: 4,
    label: 'Post-Biopsy Active Surveillance',
    desc: 'Separate tool — GG1 AS eligibility scoring (as.millionstrongmen.com)',
    model: 'Model 4',
    color: '#7c3aed',
    external: true,
  },
];

const StatChip = ({ label, value, note, warn }) => (
  <div className={`md-stat-chip${warn ? ' md-stat-chip--warn' : ''}`}>
    <div className="md-stat-chip__value">{value}</div>
    {note && <div className="md-stat-chip__note">{note}</div>}
    <div className="md-stat-chip__label">{label}</div>
  </div>
);

const Caution = ({ children }) => (
  <div className="md-caution">
    <AlertTriangleIcon size={14} className="md-caution__icon" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

const ModelCard = ({
  modelNum, title, badge, badgeColor,
  inputs, outcome, stats, notes, cautions,
  dimmed, dimmedReason,
}) => {
  const accentStyle = dimmed ? undefined : {
    '--md-card-accent': badgeColor,
    '--md-card-accent-tint': `${badgeColor}18`,
  };
  return (
    <div className={`md-card${dimmed ? ' md-card--dimmed' : ''}`} style={accentStyle}>
      <div className="md-card__header">
        <span className="md-card__badge">MODEL {modelNum}</span>
        <span className="md-card__title">{title}</span>
        {badge && <span className="md-card__pill">{badge}</span>}
      </div>

      <div className="md-card__io">
        <div><span className="md-card__io-label">Inputs: </span>{inputs}</div>
        <div><span className="md-card__io-label">Outcome: </span>{outcome}</div>
      </div>

      {stats && stats.length > 0 && (
        <div className="md-card__stats">
          {stats.map(s => <StatChip key={s.label} {...s} />)}
        </div>
      )}

      {cautions && cautions.map((c, i) => <Caution key={i}>{c}</Caution>)}

      {notes && (
        <p className={`md-card__notes${cautions?.length ? ' md-card__notes--with-caution' : ''}`}>
          {notes}
        </p>
      )}

      {dimmed && dimmedReason && (
        <p className="md-card__dimmed-reason">{dimmedReason}</p>
      )}
    </div>
  );
};

/* ── Part 1 point table: factor / pts / data β / literature OR / source used ── */
const Part1PointsTable = () => (
  <div className="md-points-wrap">
    <div className="md-points-title">
      Part 1 — Point Values: Data Run vs. Literature
      <span className="md-points-subtitle">
        Data run: N=100, AUC=0.562, PSA&gt;4 prevalence 81% (referred cohort). Scale: 16 pts = 1 log-OR unit (age 70+ anchor).
      </span>
    </div>
    <div className="md-points-scroll">
      <table className="md-points-table">
        <thead>
          <tr>
            <th>Factor</th>
            <th>Points used</th>
            <th>Data β (N=100)</th>
            <th>Literature OR</th>
            <th>Source used</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {[
            { factor: 'Age 70+',          pts: '16', data: '+0.198', lit: '5–8×', src: 'Literature', note: 'Data non-monotonic (50s > 70s) — referral bias' },
            { factor: 'Age 60–69',        pts: '10', data: '+0.106', lit: '3–4×', src: 'Literature', note: 'Data coefficient < age 50–59 — selection bias' },
            { factor: 'Age 50–59',        pts: '6',  data: '+0.545', lit: '1.5×', src: 'Literature', note: 'Data highest bin — artifact of cohort selection' },
            { factor: 'BRCA+/germline',   pts: '16', data: 'N/A',    lit: '3.5–8.6× (BRCA2)', src: 'Literature', note: 'Too few positives to model' },
            { factor: 'Family history',   pts: '10', data: '−0.328', lit: '2.5×', src: 'Literature', note: 'Data NEGATIVE — sparse positives, sign flip artifact' },
            { factor: 'SHIM <12 (ED)',    pts: '8',  data: 'N/A',    lit: '1.5–1.8×', src: 'Literature', note: 'Not in training set' },
            { factor: 'IPSS ≥8 (LUTS)',   pts: '8',  data: '−0.562', lit: '1.6–2×', src: 'Literature', note: 'Data NEGATIVE — referred-for-LUTS artifact (reverse causation)' },
            { factor: 'Black ancestry',   pts: '8',  data: '+0.353', lit: '1.7–2× incidence', src: 'Literature', note: 'Direction correct; data understated (PSA-selected cohort)' },
            { factor: 'Smoking (current)',pts: '6',  data: 'N/A',    lit: '1.4×', src: 'Literature', note: 'Not in training set' },
            { factor: 'BMI ≥30',          pts: '4',  data: '+0.533', lit: '1.3×', src: 'Literature', note: 'Data: BMI 25–29 β=+0.982 > obese — dose-response violation, omitted' },
            { factor: 'Diet (western)',   pts: '4',  data: 'N/A',    lit: '1.3×', src: 'Literature', note: 'Not in training set' },
            { factor: 'Inflammation hx', pts: '4',  data: 'N/A',    lit: '1.6–2×', src: 'Literature', note: 'Not in training set' },
            { factor: 'Chemical expo.',   pts: '4',  data: 'N/A',    lit: '1.5–2×', src: 'Literature', note: 'Not in training set' },
            { factor: 'Exercise (none)',  pts: '4',  data: '+0.419', lit: '1.2–1.3×', src: 'Literature', note: 'Data direction confirmed; cohort bias prevents calibration' },
            { factor: 'Comorbid ×2',     pts: '20', data: 'N/A',    lit: '1.3–1.5×', src: 'Literature', note: 'Metabolic syndrome grading; not in training set' },
            { factor: 'Smoking (former)', pts: '2',  data: 'N/A',    lit: '1.1×', src: 'Literature', note: 'Clinical judgment (partial vs. current)' },
            { factor: 'Exercise (some)',  pts: '2',  data: '+0.021', lit: 'Weak signal', src: 'Clinical judgment', note: 'Data near-zero; mid-tier not calibratable at N=100' },
          ].map(row => (
            <tr key={row.factor}
              className={row.data.startsWith('−') ? 'md-points-table__row--warn' : row.src === 'Clinical judgment' ? 'md-points-table__row--dim' : ''}>
              <td className="md-points-table__factor">{row.factor}</td>
              <td className="md-points-table__pts">{row.pts}</td>
              <td className={`md-points-table__data ${row.data.startsWith('−') ? 'md-points-table__data--neg' : row.data === 'N/A' ? 'md-points-table__data--na' : 'md-points-table__data--pos'}`}>{row.data}</td>
              <td className="md-points-table__lit">{row.lit}</td>
              <td className="md-points-table__src">{row.src}</td>
              <td className="md-points-table__note">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="md-points-footer">
      <strong>Why data was not used to set points:</strong> The cohort is a urology referral population
      with 81% PSA&gt;4 prevalence — not a general screening population. Three critical sanity check
      failures: (1) age gradient non-monotonic, (2) IPSS negative due to reverse causation,
      (3) family history negative due to sparse positives. Changing points from this data would
      systematically underweight the most important guideline-driven risk factors.
      No point values were changed as a result of the data run. Data coefficients are retained
      as transparency context only.
    </div>
  </div>
);

/* ── Part 2 logistic regression weights table ── */
const Part2WeightsTable = () => (
  <div className="md-points-wrap" style={{ marginTop: '16px' }}>
    <div className="md-points-title">
      Part 2 — Trained Logistic Regression Weights
      <span className="md-points-subtitle">
        Outcome: Clinically Significant Cancer (GG≥2). Trained on ePSA Mount Sinai cohort.
      </span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
      {/* Base model */}
      <div className="md-weights-block">
        <div className="md-weights-block__title">Base model — PSA only</div>
        <div className="md-weights-block__meta">N=100 · AUC=0.378 · Knowledge of PSA=Yes</div>
        <table className="md-points-table">
          <thead><tr><th>Term</th><th>β</th><th>OR (e^β)</th></tr></thead>
          <tbody>
            <tr><td>Intercept</td><td>0.700</td><td>—</td></tr>
            <tr><td>log(PSA)</td><td className="md-points-table__data--pos">+0.175</td><td>1.19×</td></tr>
          </tbody>
        </table>
        <div className="md-weights-block__note">
          AUC 0.378 is below chance — expected in a biopsied cohort where PSA is already
          elevated for all patients. PSA alone cannot discriminate GG≥2 within this group.
        </div>
      </div>

      {/* MRI model */}
      <div className="md-weights-block">
        <div className="md-weights-block__title">MRI model — PSA + PI-RADS</div>
        <div className="md-weights-block__meta">N=96 · AUC=0.591 · Knowledge of PIRADS=Yes</div>
        <table className="md-points-table">
          <thead><tr><th>Term</th><th>β</th><th>OR (e^β)</th></tr></thead>
          <tbody>
            <tr><td>Intercept</td><td>0.357</td><td>—</td></tr>
            <tr><td>log(PSA)</td><td className="md-points-table__data--neg">−0.017</td><td>0.98×</td></tr>
            <tr><td>PI-RADS 3</td><td className="md-points-table__data--neg">−0.061</td><td>0.94×</td></tr>
            <tr><td>PI-RADS 4</td><td className="md-points-table__data--pos">+0.968</td><td>2.63×</td></tr>
            <tr><td>PI-RADS 5</td><td className="md-points-table__data--pos">+1.255</td><td>3.51×</td></tr>
          </tbody>
        </table>
        <div className="md-weights-block__note">
          PI-RADS 4 and 5 drive most of the discriminatory power. PSA β is near-zero within
          the MRI model — PI-RADS captures what PSA alone cannot in a biopsied cohort.
        </div>
      </div>
    </div>

    <div className="md-points-footer">
      <strong>Reference categories:</strong> PI-RADS 1–2 (low suspicion). Logistic regression
      via sklearn, L2 regularisation (C=1). Thresholds: low &lt;55%, moderate 55–65%,
      high ≥65% (rounded from Youden-optimal operating points).
      <strong> Note:</strong> base model AUC below 0.5 is a known artifact of PSA-selected cohorts —
      PSA has already been used to select for biopsy, removing its discriminatory signal.
    </div>
  </div>
);

const Model3CalibrationTable = () => (
  <div className="md-calib">
    <div className="md-calib__title">Model 3 — Observed vs Predicted GG3+ by PI-RADS</div>
    <div className="md-calib__scroll">
      <table className="md-calib__table">
        <thead>
          <tr>
            {['PI-RADS', 'N', 'Observed GG3+', 'Predicted GG3+', 'Note'].map((h, i) => (
              <th key={h} className={`md-calib__th${i === 0 ? ' md-calib__th--first' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { pirads: 2, n: 5,  obs: '0%',    pred: '8%',    note: 'Small N — model over-predicts' },
            { pirads: 3, n: 12, obs: '0%',    pred: '12%',   note: 'Small N — model over-predicts' },
            { pirads: 4, n: 47, obs: '29.8%', pred: '22.7%', note: '' },
            { pirads: 5, n: 19, obs: '31.6%', pred: '39.7%', note: '' },
          ].map(row => (
            <tr key={row.pirads}>
              <td className="md-calib__td md-calib__td--first">PI-RADS {row.pirads}</td>
              <td className="md-calib__td">{row.n}</td>
              <td className="md-calib__td">{row.obs}</td>
              <td className="md-calib__td">{row.pred}</td>
              <td className="md-calib__td md-calib__td--note">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Caution>
      PI-RADS 2 (N=5) and PI-RADS 3 (N=12) have very small samples with no observed GG3+ cases.
      The model systematically over-predicts at these scores. Treat PI-RADS 2–3 predictions
      with additional caution until the cohort is expanded.
    </Caution>
    <p className="md-calib__footer">
      Cohort: N=83 biopsied patients from the ePSA dataset (subset of N=117) with both PI-RADS
      and final pathology recorded. GG2+ base rate 85.5% — too selected for GG2+ discrimination.
      GG3+ base rate 24.1%. No prostate volume collected; PSAD not included in this model.
    </p>
  </div>
);

/* scope: 'part1' | 'part2'                                                    */
/* pathwayMode: 'post_psa' | 'post_mri' — only used when scope === 'part2'    */
const ModelDocumentation = ({ scope = 'part1', pathwayMode = null }) => {
  const m1 = MODEL_ACCURACY.model1;
  const m2 = MODEL_ACCURACY.model2;
  const m3 = MODEL_ACCURACY.model3;
  const m4 = MODEL_ACCURACY.model4;

  const isPart2 = scope === 'part2';
  const isPsaPathway = isPart2 && pathwayMode === 'post_psa';
  const isMriPathway = isPart2 && pathwayMode === 'post_mri';

  const activeStages = new Set(
    scope === 'part1' ? [1]
    : pathwayMode === 'post_psa'  ? [1, 2]
    : pathwayMode === 'post_mri'  ? [1, 3]
    : [1, 2, 3],
  );

  return (
    <div>
      <p className="md-intro">
        ePSA uses a sequential multi-model architecture. Each stage adds new inputs on top of the
        previous, progressively refining the risk estimate. Active models for your current
        result are highlighted; grayed stages were not reached or are handled by a separate tool.
      </p>

      <Caution>
        <strong>No external validation yet.</strong> All three models were trained and validated
        on the same Mount Sinai biopsied cohort. Event rates (24–25%) reflect a
        referral/biopsy-enriched population, not a general screening population. Results should
        be interpreted with this context. External validation is planned.
      </Caution>

      <div className="md-stages">
        {STAGES.map(stage => {
          const isActive = activeStages.has(stage.num);
          const stageStyle = isActive ? {
            '--md-stage-color': stage.color,
            '--md-stage-tint': `${stage.color}0f`,
            '--md-stage-border': `${stage.color}40`,
            '--md-stage-tag-bg': `${stage.color}18`,
            '--md-stage-model-bg': `${stage.color}14`,
          } : undefined;
          return (
            <div key={stage.num} className={`md-stage${isActive ? ' md-stage--active' : ''}`} style={stageStyle}>
              <div className="md-stage__num">{stage.num}</div>
              <div className="md-stage__body">
                <div className="md-stage__label">
                  {stage.label}
                  {isActive && <span className="md-stage__active-tag">ACTIVE</span>}
                </div>
                <div className="md-stage__desc">{stage.desc}</div>
              </div>
              <span className="md-stage__model">{stage.model}</span>
            </div>
          );
        })}
      </div>

      <ModelCard
        modelNum={1}
        title="Baseline Risk Score"
        badge={isPart2 ? 'CARRYOVER FROM PART 1' : 'ACTIVE'}
        badgeColor="#2563eb"
        inputs="Age, race, BMI, family history, BRCA/HOXB13, IPSS, SHIM, exercise, smoking, diet, comorbidities, inflammation history, 9/11/chemical exposure"
        outcome="csPCa screening priority tier (Low / Intermediate / Elevated)"
        stats={[
          { label: 'AUC', value: m1.auc.toFixed(3), note: `[${m1.auc_ci_lo}–${m1.auc_ci_hi}]` },
          { label: 'Sensitivity', value: `${Math.round(m1.sensitivity * 100)}%` },
          { label: 'Specificity', value: `${Math.round(m1.specificity * 100)}%`, warn: true, note: 'low' },
          { label: 'NPV', value: `${Math.round(m1.npv * 100)}%` },
          { label: 'PPV', value: `${Math.round(m1.ppv * 100)}%`, warn: true, note: 'low' },
          { label: 'N', value: m1.n },
          { label: 'Events', value: m1.events },
        ]}
        cautions={[
          `AUC 0.579 is only 0.079 above chance (0.5) — this model prioritises sensitivity (${Math.round(m1.sensitivity * 100)}%) at the cost of specificity (${Math.round(m1.specificity * 100)}%). It is designed to flag, not to rule in. High false-positive rate is expected by design.`,
        ]}
        notes={`Threshold: ${m1.threshold}. ${m1.note}`}
      />

      <Part1PointsTable />

      {isPart2 && <Part2WeightsTable />}

      {isPart2 ? (
        <ModelCard
          modelNum={2}
          title="Combined PSA + ePSA Score"
          badge={isPsaPathway ? 'ACTIVE — PSA pathway' : 'NOT USED — MRI pathway ran instead'}
          badgeColor={isPsaPathway ? '#d97706' : '#9ca3af'}
          inputs="Part 1 raw score + PSA level (5-ARI ×2 correction for finasteride/dutasteride) + PSA density if prostate volume provided (cohort-optimal Youden cutoff 0.177 ng/mL/mL; AUA-canonical clinical threshold is 0.15 ng/mL/mL)"
          outcome="csPCa (GG2+) combined risk tier — Low / Int-Low / Int-High / High"
          stats={[
            { label: 'AUC', value: m2.auc.toFixed(3), note: `[${m2.auc_ci_lo}–${m2.auc_ci_hi}]` },
            { label: 'Gain vs PSA alone', value: '+0.021', note: 'p=0.725 — NS', warn: true },
            { label: 'N', value: m2.n },
            { label: 'Events', value: m2.events },
          ]}
          cautions={isPsaPathway ? [
            'The AUC gain over PSA alone (+0.021) is not statistically significant at N=94 (p=0.725). Model 2 adds clinical context through risk tiering but does not yet demonstrate discriminatory improvement over PSA in this cohort.',
          ] : []}
          notes={m2.note}
          dimmed={!isPsaPathway}
          dimmedReason={isMriPathway ? 'MRI pathway was selected for this assessment — Model 3 ran instead.' : null}
        />
      ) : (
        <ModelCard
          modelNum={2}
          title="Combined PSA + ePSA Score"
          badge="PART 2 — PSA pathway"
          badgeColor="#d97706"
          inputs="Part 1 score + PSA level + optional PSA density"
          outcome="csPCa (GG2+) combined risk tier"
          stats={[
            { label: 'AUC', value: m2.auc.toFixed(3), note: `[${m2.auc_ci_lo}–${m2.auc_ci_hi}]` },
            { label: 'N', value: m2.n },
          ]}
          notes="Complete Part 2 with your PSA result to activate this model."
          dimmed
          dimmedReason="Requires Part 2 PSA data."
        />
      )}

      {isPart2 ? (
        <>
          <ModelCard
            modelNum={3}
            title="MRI + PSA → High-Grade Cancer Risk (GG3+)"
            badge={isMriPathway ? 'ACTIVE — MRI pathway' : 'NOT USED — PSA-only pathway ran'}
            badgeColor={isMriPathway ? '#dc2626' : '#9ca3af'}
            inputs="PI-RADS score (2–5) + PSA in ng/mL (5-ARI adjusted)"
            outcome={m3.outcome}
            stats={[
              { label: 'AUC', value: m3.auc.toFixed(3), note: `[${m3.auc_ci_lo}–${m3.auc_ci_hi}]` },
              { label: '5-fold CV AUC', value: m3.auc_cv.toFixed(3), note: `±${m3.auc_cv_sd} — wide`, warn: true },
              { label: 'N', value: m3.n },
              { label: 'Events (GG3+)', value: m3.events },
              { label: 'Base rate', value: `${Math.round((m3.events / m3.n) * 100)}%`, note: 'biopsied cohort' },
            ]}
            cautions={isMriPathway ? [
              `CV SD ±${m3.auc_cv_sd} on AUC ${m3.auc_cv} indicates notable fold-to-fold variability at N=${m3.n}. The model is directionally stable but interpret confidence intervals as wide.`,
            ] : []}
            notes={`logit(GG3+) = −4.7205 + 0.6478 × PI-RADS + 0.5141 × ln(PSA + 0.01). OR per PI-RADS unit: 1.91; OR per log-PSA unit: 1.67. ${m3.note}`}
            dimmed={!isMriPathway}
            dimmedReason={isPsaPathway ? 'PSA-only pathway was selected — PI-RADS was not entered.' : null}
          />
          {isMriPathway && <Model3CalibrationTable />}
        </>
      ) : (
        <ModelCard
          modelNum={3}
          title="MRI + PSA → High-Grade Cancer Risk (GG3+)"
          badge="PART 2 — MRI pathway"
          badgeColor="#dc2626"
          inputs="PI-RADS score (2–5) + PSA (5-ARI adjusted)"
          outcome={m3.outcome}
          stats={[
            { label: 'AUC', value: m3.auc.toFixed(3), note: `[${m3.auc_ci_lo}–${m3.auc_ci_hi}]` },
            { label: 'N', value: m3.n },
          ]}
          notes="Requires PI-RADS from an MRI. Complete Part 2 with MRI result to activate."
          dimmed
          dimmedReason="Requires Part 2 PI-RADS data."
        />
      )}

      <ModelCard
        modelNum={4}
        title="Active Surveillance Eligibility"
        badge="SEPARATE TOOL — as.millionstrongmen.com"
        badgeColor="#7c3aed"
        inputs="Biopsy result (GG1), PSA, age, clinical stage, IPSS, SHIM"
        outcome="GG1 AS eligibility — Low/Int AS rate 89% in validation cohort"
        stats={[
          { label: 'AUC (ePSA)', value: m4.auc_gg1.toFixed(3) },
          { label: 'AUC (PSA alone)', value: m4.auc_psa_gg1.toFixed(3) },
          { label: 'Low/Int AS rate', value: `${Math.round(m4.low_int_as_rate * 100)}%` },
        ]}
        notes={`${m4.note}. No confidence intervals available for Model 4 in the current dataset.`}
        dimmed
        dimmedReason="This is a separate post-biopsy tool and is not part of the ePSA screening calculator."
      />

      <div className="md-provenance">
        <strong>Data provenance:</strong> Models 1 &amp; 2 trained and validated on N=94
        biopsied referral patients (Mount Sinai / Icahn School of Medicine ePSA cohort; 23 csPCa
        events, GG≥3). Model 3 trained on N=83 complete cases from the same cohort (subset with
        PI-RADS + final pathology; 20 GG3+ events). <strong>All models are internally validated
        only — no external cohort has been used.</strong> AUCs are bootstrap 95% CIs unless noted.
        Model 4 is a separate logistic regression validated in the same cohort for post-biopsy
        decisions. Principal Investigator: Ashutosh K. Tewari, MD, Icahn School of Medicine at
        Mount Sinai. Cohort data collected under Mount Sinai GU Clinical IRB protocol
        STUDY-14-00050.
      </div>
    </div>
  );
};

export default ModelDocumentation;
