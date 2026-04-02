/**
 * CSV Export Utilities for ePSA
 * - Part 1: one row with columns matching JSON formData + result (same structure as JSON export for round-trip)
 * - Part 2: one row with columns matching JSON part2Data + results
 * - downloadCsv expects an array of row objects; keys become CSV header
 */

export const downloadCsv = (filename, rows) => {
  if (!rows || rows.length === 0) return;
  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map(row => Object.values(row).map(v => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Part 1: single row with keys matching JSON formData + result for round-trip consistency */
export const buildPart1CsvRows = (formData, result, config) => {
  const fd = formData || {};
  const ipssStr = Array.isArray(fd.ipss) ? fd.ipss.join(',') : '';
  const shimStr = Array.isArray(fd.shim) ? fd.shim.join(',') : '';

  const pathwayLabelMap = {
    pre_psa: 'Pre-PSA Assessment',
    post_psa: 'Post-PSA Assessment',
    post_mri: 'Post-MRI Assessment',
    post_biopsy: 'Post-Biopsy / AS Assessment',
  };
  const pathwayLabel = pathwayLabelMap[fd.pathwayMode] || pathwayLabelMap[result?.pathwayMode] || 'Pre-PSA Assessment';

  const row = {
    pathwayMode: pathwayLabel,
    version: '1.0',
    exportDate: new Date().toISOString(),
    part: 'part1',
    age: fd.age ?? '',
    race: fd.race ?? '',
    heightFt: fd.heightFt ?? '',
    heightIn: fd.heightIn ?? '',
    heightCm: fd.heightCm ?? '',
    weight: fd.weight ?? '',
    weightKg: fd.weightKg ?? '',
    weightUnit: fd.weightUnit ?? 'lbs',
    heightUnit: fd.heightUnit ?? 'imperial',
    bmi: fd.bmi ?? '',
    familyHistory: fd.familyHistory ?? '',
    brcaStatus: fd.brcaStatus ?? '',
    exercise: fd.exercise ?? '',
    smoking: fd.smoking ?? '',
    chemicalExposure: fd.chemicalExposure ?? '',
    dietPattern: fd.dietPattern ?? '',
    hypertension: fd.hypertension ?? '',
    hyperlipidemia: fd.hyperlipidemia ?? '',
    coronaryArteryDisease: fd.coronaryArteryDisease ?? '',
    diabetes: fd.diabetes ?? '',
    comorbidityScore: fd.comorbidityScore ?? '',
    ipss: ipssStr,
    shim: shimStr,
    score: result?.score ?? '',
    risk: result?.risk ?? '',
    scoreRange: result?.scoreRange ?? '',
    confidenceRange: result?.confidenceRange ?? '',
    recommendPSA: result?.recommendPSA ?? '',
    modelVersion: result?.modelVersion ?? config?.version ?? '',
  };
  return [row];
};

export const buildPart2CsvRows = (postData, preResult, postResult, config) => {
  const pd = postData || {};
  const pathwayLabelMap = {
    pre_psa: 'Pre-PSA Assessment',
    post_psa: 'Post-PSA Assessment',
    post_mri: 'Post-MRI Assessment',
    post_biopsy: 'Post-Biopsy / AS Assessment',
  };
  const pathwayLabel = pathwayLabelMap[postResult?.pathwayMode] || pathwayLabelMap[pd.pathwayMode] || 'Post-MRI Assessment';

  const row = {
    pathwayMode: pathwayLabel,
    version: '1.0',
    exportDate: new Date().toISOString(),
    part: 'part2',
    psa: pd.psa ?? '',
    knowPsa: pd.knowPsa ?? '',
    onHormonalTherapy: pd.onHormonalTherapy ?? '',
    hormonalTherapyType: pd.hormonalTherapyType ?? '',
    knowPirads: pd.knowPirads ?? '',
    pirads: pd.pirads ?? '',
    preScore: preResult?.score ?? '',
    preRisk: preResult?.risk ?? '',
    preScoreRange: preResult?.scoreRange ?? '',
    preConfidenceRange: preResult?.confidenceRange ?? '',
    riskPct: postResult?.riskPct ?? '',
    riskCat: postResult?.riskCat ?? '',
    riskClass: postResult?.riskClass ?? '',
    riskPctRange: postResult?.riskPctRange ?? '',
    totalPoints: postResult?.totalPoints ?? '',
    prostateVolume: pd.prostateVolume ?? '',
    psadValue: postResult?.psadValue ?? '',
    psadPoints: postResult?.psadPoints ?? '',
    psadFlag: postResult?.psadFlag ?? '',
    modelVersion: postResult?.modelVersion ?? config?.version ?? '',
  };
  return [row];
};

export const buildASCsvRows = (preData, preResult, asData, asResult, config) => {
  const row = {
    pathwayMode: 'Post-Biopsy / AS Assessment',
    version: '1.0',
    exportDate: new Date().toISOString(),
    part: 'post_biopsy',
    preScore: preResult?.score ?? '',
    preRisk: preResult?.risk ?? '',
    preEpsaTierKey: preResult?.epsaTierKey ?? '',
    biopsyGGG: asResult?.biopsyGGG ?? asData?.biopsyGGG ?? '',
    coresPositive: asResult?.coresPositive ?? asData?.coresPositive ?? '',
    coresTotal: asResult?.coresTotal ?? asData?.coresTotal ?? '',
    corePct: asResult?.corePct ?? '',
    maxCorePct: asResult?.maxCorePct ?? asData?.maxCorePct ?? '',
    psaValue: asResult?.psaValue ?? asData?.psaValue ?? '',
    psadValue: asResult?.psadValue != null ? asResult.psadValue.toFixed(3) : '',
    psadFlag: asResult?.psadFlag ?? '',
    piradsValue: asResult?.piradsValue ?? asData?.pirads ?? '',
    nccnRiskGroup: asResult?.nccnRiskGroup ?? '',
    asTierKey: asResult?.asTierKey ?? '',
    asTierLabel: asResult?.asTierLabel ?? '',
    asScore: asResult?.asScore ?? '',
    modelVersion: asResult?.modelVersion ?? config?.version ?? '',
  };
  return [row];
};
