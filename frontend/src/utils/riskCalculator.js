/**
 * Risk Calculator Utility
 * Calculates prostate cancer risk based on various factors
 */

export const calculateRisk = (formData) => {
  const {
    age,
    familyHistory,
    race,
    geneticRisk,
    comorbidities,
    smoking,
    exercise,
    diet,
    heightFeet,
    heightInches,
    weight,
    knowPsa,
    psa,
    knowPirads,
    pirads,
    ipssScores
  } = formData;

  // Calculate BMI
  const height = heightFeet * 12 + heightInches;
  const bmi = height > 0 ? (weight / (height ** 2)) * 703 : 0;
  const bmiPoints = bmi >= 30 ? 10 : bmi >= 25 ? 5 : 0;

  // Calculate PSA points
  const psaValue = knowPsa ? parseFloat(psa) || 0 : 0;
  const psaPoints =
    psaValue > 10 ? 40 :
    psaValue > 4 ? 20 :
    psaValue > 2.5 ? 10 :
    psaValue >= 1 ? 5 : 0;

  // Calculate IPSS score
  const ipssScore = ipssScores.reduce((sum, score) => sum + (parseInt(score) || 0), 0);
  const ipssPoints = (ipssScore > 7 && ipssScore <= 19) ? -5 : 0;

  // Calculate base total points
  let totalPoints =
    (parseInt(age) || 0) +
    bmiPoints +
    (parseFloat(familyHistory) || 1) * 10 +
    (parseInt(race) || 0) +
    (parseInt(geneticRisk) || 0) +
    (parseInt(comorbidities) || 0) +
    (parseInt(smoking) || 0) +
    (parseInt(exercise) || 0) +
    (parseInt(diet) || 0) +
    psaPoints +
    ipssPoints;

  // Check for PIRADS override
  const piradsValue = knowPirads ? parseInt(pirads) : 0;
  let riskPct, riskCat, riskClass, nextSteps;
  let piradsOverridden = false;

  if (knowPirads && piradsValue === 4) {
    riskPct = '52% (43–61%)';
    riskCat = '🟠 Very High-Risk';
    riskClass = 'very-high-risk';
    nextSteps = [
      'Discuss PI-RADS 4 lesion on MRI with your urologist.',
      'Strongly advise MRI-targeted biopsy.'
    ];
    piradsOverridden = true;
  } else if (knowPirads && piradsValue === 5) {
    riskPct = '89% (76–97%)';
    riskCat = '🔴 Very High-Risk';
    riskClass = 'very-high-risk';
    nextSteps = [
      'PI-RADS 5 lesion: Urgent urology referral recommended.',
      'Strongly advise MRI-guided biopsy.',
      'Discuss genetic counseling if needed.'
    ];
    piradsOverridden = true;
  }

  // If PIRADS didn't override, calculate based on points
  if (!piradsOverridden) {
    // Add PIRADS points if not overriding (PIRADS 1, 2, 3)
    if (piradsValue === 1 || piradsValue === 2 || piradsValue === 3) {
      totalPoints += piradsValue === 2 ? 10 : piradsValue === 3 ? 20 : 0;
    }

    if (totalPoints <= 40) {
      riskPct = '0–10%';
      riskCat = '🟢 Low (0–40 pts)';
      riskClass = 'low-risk';
      nextSteps = [
        'Focus on healthy lifestyle—maintain a balanced diet, exercise regularly, and avoid smoking.',
        'PSA Screening: For most people under 40 or over 70, routine PSA testing may cause more harm than good. If you\'re between 55–69 or at higher risk (e.g., African American or strong family history), you can discuss benefits and risks with your doctor.',
        'Learn more about prostate cancer health by clicking here →',
        'Check back next year and re-calculate your risk!'
      ];
    } else if (totalPoints <= 80) {
      riskPct = '10–20%';
      riskCat = '🟡 Moderate (41–80 pts)';
      riskClass = 'moderate-risk';
      nextSteps = [
        'If you have not already gotten a PSA test, consider getting one, especially if you are in your 50s or early 60s. PSA testing can help detect prostate cancer early, but can also lead to overdiagnosis and false alarms. Discuss with your provider to learn more.',
        'If you have added risk factors (African American race, positive family history, or known genetic mutations), you may want to consider PSA testing starting at age 45.',
        'Find out where the Mount Sinai Mobile Unit is today for a free PSA test →',
        'Schedule a prostate health evaluation with your doctor.',
        'Focus on improving lifestyle factors like diet, exercise, and quitting smoking.',
        'Learn more about prostate cancer health by clicking here →'
      ];
    } else if (totalPoints <= 120) {
      riskPct = '20–40%';
      riskCat = '🟠 High (81–120 pts)';
      riskClass = 'high-risk';
      nextSteps = [
        'Discuss PSA screening and genetic testing options with your provider.',
        'If not already done, consider prostate MRI if PSA is elevated (>4 ng/dL).',
        'Find out where the Mount Sinai Mobile Unit is today for a free PSA test →',
        'Consult with a urologist for personalized guidance.',
        'Continue healthy habits (diet, exercise) and stay informed about active surveillance vs. definitive treatment options if PSA is elevated.',
        'Learn more about prostate cancer health by clicking here →'
      ];
    } else {
      riskPct = '40–70%';
      riskCat = '🔴 Very High (>120 pts)';
      riskClass = 'very-high-risk';
      nextSteps = [
        'You may wish to speak with a urologist promptly.',
        'Consider PSA, MRI, and possibly biopsy depending on clinical evaluation.',
        'Genetic testing and counseling are strongly recommended.',
        'Encourage family awareness and screening if applicable.',
        'Find out where the Mount Sinai Mobile Unit is today for a free PSA test →',
        'Learn more about prostate cancer health by clicking here →'
      ];
    }
  }

  return {
    riskPct,
    riskCat,
    riskClass,
    totalPoints,
    nextSteps,
    bmi: bmi.toFixed(1),
    bmiCategory: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  };
};

export const calculateBMI = (feet, inches, weight) => {
  const height = feet * 12 + inches;
  if (height > 0 && weight > 0) {
    const bmi = (weight / (height ** 2)) * 703;
    return {
      value: bmi.toFixed(1),
      category: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
    };
  }
  return { value: '—', category: '—' };
};
