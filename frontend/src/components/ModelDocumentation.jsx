import React from 'react';
import { MODEL_ACCURACY } from '../utils/epsaEngine';

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
    desc: 'Part 1 + PSA (adjusted) + PI-RADS score; logistic regression targeting GG3+ high-grade cancer',
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

/* ── Stat chip ── */
const StatChip = ({ label, value, note, warn }) => (
  <div style={{
    background: warn ? '#fffbeb' : '#f8fafc',
    border: `1px solid ${warn ? '#fcd34d' : '#e2e8f0'}`,
    borderRadius: '8px',
    padding: '7px 11px',
    textAlign: 'center',
    minWidth: '72px',
    flex: '0 0 auto',
  }}>
    <div style={{ fontSize: '17px', fontWeight: 700, color: warn ? '#92400e' : '#1e3a5f', lineHeight: 1.2 }}>{value}</div>
    {note && <div style={{ fontSize: '10px', color: warn ? '#92400e' : '#6b7280', lineHeight: 1.3, marginTop: '1px' }}>{note}</div>}
    <div style={{ fontSize: '10.5px', color: warn ? '#b45309' : '#9ca3af', marginTop: '3px' }}>{label}</div>
  </div>
);

/* ── Inline caution banner ── */
const Caution = ({ children }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: '7px',
    background: '#fffbeb', border: '1px solid #fcd34d',
    borderRadius: '7px', padding: '8px 10px',
    fontSize: '11.5px', color: '#92400e', lineHeight: 1.55,
    marginTop: '8px',
  }}>
    <span style={{ flexShrink: 0, fontWeight: 700 }}>⚠</span>
    <span>{children}</span>
  </div>
);

/* ── Model card ── */
const ModelCard = ({
  modelNum, title, badge, badgeColor,
  inputs, outcome, stats, notes, cautions,
  dimmed, dimmedReason,
}) => (
  <div style={{
    border: `1.5px solid ${dimmed ? '#e5e7eb' : badgeColor}`,
    borderRadius: '10px',
    padding: '13px 15px',
    background: dimmed ? '#fafafa' : '#fff',
    opacity: dimmed ? 0.65 : 1,
    marginBottom: '10px',
  }}>
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '9px' }}>
      <span style={{
        background: dimmed ? '#9ca3af' : badgeColor,
        color: '#fff', borderRadius: '5px',
        padding: '2px 8px', fontSize: '10.5px', fontWeight: 700,
        letterSpacing: '0.04em', flexShrink: 0,
      }}>
        MODEL {modelNum}
      </span>
      <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e3a5f', flex: 1 }}>{title}</span>
      {badge && (
        <span style={{
          background: dimmed ? '#f3f4f6' : `${badgeColor}18`,
          color: dimmed ? '#9ca3af' : badgeColor,
          borderRadius: '4px', padding: '1px 7px',
          fontSize: '10px', fontWeight: 600, flexShrink: 0,
        }}>
          {badge}
        </span>
      )}
    </div>

    {/* Inputs / outcome */}
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      gap: '6px', marginBottom: '10px',
      fontSize: '11.5px', color: '#374151', lineHeight: 1.5,
    }}>
      <div><span style={{ fontWeight: 600, color: '#1e3a5f' }}>Inputs: </span>{inputs}</div>
      <div><span style={{ fontWeight: 600, color: '#1e3a5f' }}>Outcome: </span>{outcome}</div>
    </div>

    {/* Stats */}
    {stats && stats.length > 0 && (
      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '9px' }}>
        {stats.map(s => <StatChip key={s.label} {...s} />)}
      </div>
    )}

    {/* Inline cautions */}
    {cautions && cautions.map((c, i) => <Caution key={i}>{c}</Caution>)}

    {/* Notes */}
    {notes && (
      <p style={{
        margin: cautions?.length ? '8px 0 0' : 0,
        fontSize: '11px', color: '#6b7280',
        lineHeight: 1.65, fontStyle: 'italic',
        borderTop: '1px solid #f1f5f9', paddingTop: '8px',
      }}>
        {notes}
      </p>
    )}

    {/* Dimmed reason */}
    {dimmed && dimmedReason && (
      <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
        {dimmedReason}
      </p>
    )}
  </div>
);

/* ── Model 3 calibration table ── */
const Model3CalibrationTable = () => (
  <div style={{
    marginTop: '4px', marginBottom: '10px',
    padding: '12px 14px',
    background: '#fef9f9', borderRadius: '8px',
    border: '1px solid #fecaca',
  }}>
    <div style={{ fontWeight: 700, fontSize: '12px', color: '#991b1b', marginBottom: '8px' }}>
      Model 3 — Observed vs Predicted GG3+ by PI-RADS
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '360px' }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid #fca5a5' }}>
            {['PI-RADS', 'N', 'Observed GG3+', 'Predicted GG3+', 'Note'].map(h => (
              <th key={h} style={{
                textAlign: h === 'PI-RADS' ? 'left' : 'center',
                padding: '4px 8px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap',
              }}>{h}</th>
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
            <tr key={row.pirads} style={{ borderBottom: '1px solid #fee2e2' }}>
              <td style={{ padding: '5px 8px', fontWeight: 600 }}>PI-RADS {row.pirads}</td>
              <td style={{ padding: '5px 8px', textAlign: 'center', color: '#6b7280' }}>{row.n}</td>
              <td style={{ padding: '5px 8px', textAlign: 'center' }}>{row.obs}</td>
              <td style={{ padding: '5px 8px', textAlign: 'center' }}>{row.pred}</td>
              <td style={{ padding: '5px 8px', textAlign: 'center', fontSize: '10.5px', color: '#9ca3af', fontStyle: 'italic' }}>{row.note}</td>
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
    <p style={{ margin: '8px 0 0', fontSize: '10.5px', color: '#9ca3af', fontStyle: 'italic', lineHeight: 1.55 }}>
      Cohort: N=83 biopsied patients from the ePSA dataset (subset of N=117) with both PI-RADS
      and final pathology recorded. GG2+ base rate 85.5% — too selected for GG2+ discrimination.
      GG3+ base rate 24.1%. No prostate volume collected; PSAD not included in this model.
    </p>
  </div>
);

/* ── Main component ── */
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

  /* For the stage pipeline: which stage numbers are "active" */
  const activeStages = new Set(
    scope === 'part1' ? [1]
    : pathwayMode === 'post_psa'  ? [1, 2]
    : pathwayMode === 'post_mri'  ? [1, 3]
    : [1, 2, 3],  // fallback: both Part 2 pathways shown as available
  );

  return (
    <div>
      {/* ── Intro ── */}
      <p style={{ fontSize: '13px', color: '#374151', marginTop: 0, marginBottom: '12px', lineHeight: 1.65 }}>
        ePSA uses a sequential multi-model architecture. Each stage adds new inputs on top of the
        previous, progressively refining the risk estimate. Active models for your current
        result are highlighted; grayed stages were not reached or are handled by a separate tool.
      </p>

      {/* ── No external validation notice ── */}
      <Caution>
        <strong>No external validation yet.</strong> All three models were trained and validated
        on the same Mount Sinai biopsied cohort. Event rates (24–25%) reflect a
        referral/biopsy-enriched population, not a general screening population. Results should
        be interpreted with this context. External validation is planned.
      </Caution>

      {/* ── Stage pipeline ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '14px 0 18px' }}>
        {STAGES.map(stage => {
          const isActive = activeStages.has(stage.num);
          return (
            <div key={stage.num} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '8px 10px', borderRadius: '8px',
              background: isActive ? `${stage.color}0f` : '#f9fafb',
              border: `1px solid ${isActive ? `${stage.color}40` : '#e5e7eb'}`,
            }}>
              <div style={{
                width: '21px', height: '21px', borderRadius: '50%',
                background: isActive ? stage.color : '#d1d5db',
                color: '#fff', fontSize: '11px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '1px',
              }}>
                {stage.num}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '12.5px', color: isActive ? '#1e3a5f' : '#9ca3af', lineHeight: 1.3 }}>
                  {stage.label}
                  {isActive && (
                    <span style={{
                      marginLeft: '6px', fontSize: '10px', fontWeight: 700,
                      color: stage.color, background: `${stage.color}18`,
                      padding: '1px 6px', borderRadius: '4px',
                    }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: isActive ? '#6b7280' : '#c4cacf', marginTop: '2px', lineHeight: 1.4 }}>
                  {stage.desc}
                </div>
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 600, flexShrink: 0,
                color: isActive ? stage.color : '#d1d5db',
                background: isActive ? `${stage.color}14` : '#f3f4f6',
                padding: '2px 7px', borderRadius: '4px',
              }}>
                {stage.model}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Model 1 ── */}
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

      {/* ── Model 2 ── */}
      {isPart2 ? (
        <ModelCard
          modelNum={2}
          title="Combined PSA + ePSA Score"
          badge={isPsaPathway ? 'ACTIVE — PSA pathway' : 'NOT USED — MRI pathway ran instead'}
          badgeColor={isPsaPathway ? '#d97706' : '#9ca3af'}
          inputs="Part 1 raw score + PSA level (5-ARI ×2 correction for finasteride/dutasteride) + PSA density if prostate volume provided (Youden cutoff 0.177 ng/mL/mL)"
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

      {/* ── Model 3 ── */}
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

      {/* ── Model 4 — always dimmed, separate tool ── */}
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

      {/* ── Data provenance ── */}
      <div style={{
        marginTop: '10px', padding: '10px 12px',
        background: '#f0f7ff', borderRadius: '8px',
        border: '1px solid #bfdbfe',
        fontSize: '11.5px', color: '#1e40af', lineHeight: 1.65,
      }}>
        <strong>Data provenance:</strong> Models 1 &amp; 2 trained and validated on N=94
        biopsied referral patients (Mount Sinai / Icahn School of Medicine ePSA cohort; 23 csPCa
        events, GG≥2). Model 3 trained on N=83 complete cases from the same cohort (subset with
        PI-RADS + final pathology; 20 GG3+ events). <strong>All models are internally validated
        only — no external cohort has been used.</strong> AUCs are bootstrap 95% CIs unless noted.
        Model 4 is a separate logistic regression validated in the same cohort for post-biopsy
        decisions. Principal Investigator: Ashutosh K. Tewari, MD, Icahn School of Medicine at
        Mount Sinai.
      </div>
    </div>
  );
};

export default ModelDocumentation;
