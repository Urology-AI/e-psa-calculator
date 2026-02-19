/**
 * ePSA Calculator - New Part 1
 * Based on the HTML calculator with 18 questions
 * Uses logistic regression model
 */

const RISK_COLORS = {
  LOW: "#27AE60",
  "LOW-MOD": "#F39C12",
  MOD: "#E67E22",
  "MOD-HIGH": "#E74C3C",
  HIGH: "#C0392B"
};

export const calculateEPsa = (formData) => {
  const {
    age,
    race,
    bmi,
    ipss, // Array of 7 values (0-5)
    shim, // Array of 5 values
    exercise,
    smoking,
    familyHistory, // 0, 1, or 2
  } = formData;

  // Validate required fields
  // Check if age is provided and valid
  if (!age || age === '') {
    console.warn('Missing age for calculation:', { age, bmi, race, ipss, shim, exercise, smoking, familyHistory });
    return null;
  }

  // Convert age to number
  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 30 || ageNum > 95) {
    console.warn('Invalid age:', age);
    return null;
  }

  // Check if BMI is calculated (must be > 0)
  if (!bmi || bmi === 0 || bmi === null || bmi === undefined || isNaN(parseFloat(bmi))) {
    console.warn('BMI not calculated or invalid:', { age, bmi, race, ipss, shim, exercise, smoking, familyHistory });
    return null;
  }

  // Check if race is selected
  if (race === null || race === undefined || race === '') {
    console.warn('Race not selected:', { age, bmi, race, ipss, shim, exercise, smoking, familyHistory });
    return null;
  }

  // Check if all IPSS questions are answered
  if (!Array.isArray(ipss) || ipss.some(v => v === null || v === undefined)) {
    console.warn('IPSS questions incomplete:', { age, bmi, race, ipss, shim, exercise, smoking, familyHistory });
    return null;
  }

  // Check if all SHIM questions are answered
  if (!Array.isArray(shim) || shim.some(v => v === null || v === undefined)) {
    console.warn('SHIM questions incomplete:', { age, bmi, race, ipss, shim, exercise, smoking, familyHistory });
    return null;
  }

  // Check if exercise, smoking are answered
  if (exercise === null || exercise === undefined) {
    console.warn('Exercise not answered:', { age, bmi, race, ipss, shim, exercise, smoking, familyHistory });
    return null;
  }

  if (smoking === null || smoking === undefined) {
    console.warn('Smoking not answered:', { age, bmi, race, ipss, shim, exercise, smoking, familyHistory });
    return null;
  }

  // Family history is required
  if (familyHistory === null || familyHistory === undefined) {
    console.warn('Family history not answered:', { age, bmi, race, ipss, shim, exercise, smoking, familyHistory });
    return null;
  }

  // Note: diabetes is not used in the calculation formula, but conditions/medications are optional

  // Convert race to black indicator
  const black = race === "black" ? 1 : 0;
  
  // Calculate IPSS total (sum of 7 questions, each 0-5)
  const ipssTotal = Array.isArray(ipss) ? ipss.reduce((a, b) => a + (b !== null && b !== undefined ? b : 0), 0) : 0;
  
  // Calculate SHIM total (sum of 5 questions)
  const shimTotal = Array.isArray(shim) ? shim.reduce((a, b) => a + (b !== null && b !== undefined ? b : 0), 0) : 0;
  
  // Family history: convert to binary (0 or 1)
  const fh = (familyHistory !== null && familyHistory !== undefined && familyHistory > 0) ? 1 : 0;
  
  // Ensure exercise, smoking are numbers (default to 0 if null)
  const exerciseVal = exercise !== null && exercise !== undefined ? exercise : 0;
  const smokingVal = smoking !== null && smoking !== undefined ? smoking : 0;
  
  // Logistic regression formula from HTML
  const logit = -1.14 
    + 0.017 * ageNum 
    - 0.009 * black 
    + 0.012 * bmi 
    - 0.0267 * ipssTotal 
    + 0.512 * exerciseVal 
    - 0.769 * smokingVal 
    - 0.993 * fh 
    - 0.0344 * shimTotal;
  
  const score = 1 / (1 + Math.exp(-logit));
  const scorePercent = Math.round(score * 100);

  // Determine risk level
  let risk, color, action;
  if (score < 0.21) {
    risk = "LOW";
    color = RISK_COLORS.LOW;
    action = "Reassure. Repeat ePSA in 12 months. No PSA needed at this time.";
  } else if (score < 0.31) {
    risk = "LOW-MOD";
    color = RISK_COLORS["LOW-MOD"];
    action = "Discuss risk factors. Consider PSA testing if patient prefers.";
  } else if (score < 0.41) {
    risk = "MOD";
    color = RISK_COLORS.MOD;
    action = "Recommend PSA testing. If elevated, proceed to MRI.";
  } else if (score < 0.52) {
    risk = "MOD-HIGH";
    color = RISK_COLORS["MOD-HIGH"];
    action = "Strongly recommend PSA + MRI. Expedited urological evaluation.";
  } else {
    risk = "HIGH";
    color = RISK_COLORS.HIGH;
    action = "Urgent PSA + MRI + biopsy pathway. Consider genetic counseling if FH+.";
  }

  return {
    score: scorePercent,
    risk,
    color,
    action,
    ipssTotal,
    shimTotal,
    bmi: bmi.toFixed(1),
    age
  };
};

export { RISK_COLORS };
