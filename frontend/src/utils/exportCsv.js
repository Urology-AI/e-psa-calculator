/**
 * CSV Export Utilities for ePSA
 * - Part 1: questionnaire answers + calculated risk
 * - Part 2: PSA/PI-RADS + educational summary
 * - Returns a downloadable CSV file in the browser
 */

export const downloadCsv = (filename, rows) => {
  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
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
};

export const buildPart1CsvRows = (formData, result, config) => {
  const timestamp = new Date().toISOString();
  const ipssTotal = Array.isArray(formData.ipss) ? formData.ipss.reduce((a, b) => a + (b ?? 0), 0) : 0;
  const shimTotal = Array.isArray(formData.shim) ? formData.shim.reduce((a, b) => a + (b ?? 0), 0) : 0;

  return [
    {
      Section: 'Metadata',
      Timestamp: timestamp,
      ModelVersion: config?.version || 'unknown',
      Form: 'ePSA Part 1',
      ExportedBy: 'User'
    },
    {
      Section: 'Inputs',
      Age: formData.age,
      Race: formData.race,
      HeightFt: formData.heightFt,
      HeightIn: formData.heightIn,
      HeightCm: formData.heightCm,
      Weight: formData.weight,
      WeightKg: formData.weightKg,
      BMI: formData.bmi,
      FamilyHistory: formData.familyHistory,
      BRCAStatus: formData.brcaStatus,
      Exercise: formData.exercise,
      Smoking: formData.smoking,
      ChemicalExposure: formData.chemicalExposure,
      DietPattern: formData.dietPattern,
      IPSS_Total: ipssTotal,
      SHIM_Total: shimTotal
    },
    {
      Section: 'Results',
      RiskScore: result?.score,
      RiskTier: result?.risk,
      ScoreRange: result?.scoreRange,
      DisplayRange: result?.confidenceRange,
      Action: result?.action,
      Color: result?.color,
      ModelVersion: result?.modelVersion
    }
  ];
};

export const buildPart2CsvRows = (postData, preResult, postResult, config) => {
  const timestamp = new Date().toISOString();

  return [
    {
      Section: 'Metadata',
      Timestamp: timestamp,
      ModelVersion: config?.version || 'unknown',
      Form: 'ePSA Part 2',
      ExportedBy: 'User'
    },
    {
      Section: 'Inputs',
      PSA: postData?.psa,
      KnowPSA: postData?.knowPsa,
      OnHormonalTherapy: postData?.onHormonalTherapy,
      HormonalTherapyType: postData?.hormonalTherapyType,
      KnowPIRADS: postData?.knowPirads,
      PI_RADS: postData?.pirads
    },
    {
      Section: 'Pre-Result (Part 1)',
      PreScore: preResult?.score,
      PreRiskTier: preResult?.risk,
      PreScoreRange: preResult?.scoreRange,
      PreDisplayRange: preResult?.confidenceRange
    },
    {
      Section: 'Post-Result (Educational Summary)',
      RiskPct: postResult?.riskPct,
      RiskCategory: postResult?.riskCat,
      RiskClass: postResult?.riskClass,
      TotalPoints: postResult?.totalPoints,
      PrePoints: postResult?.prePoints,
      BaselineCarryPoints: postResult?.baselineCarryPoints,
      PSAPoints: postResult?.psaPoints,
      PI_RADSPoints: postResult?.piradsPoints,
      PI_RADSOverridden: postResult?.piradsOverridden,
      ModelVersion: postResult?.modelVersion
    }
  ];
};
