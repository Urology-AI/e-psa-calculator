/**
 * ePSA-Pre Calculator
 * Pre-PSA triage to determine screening priority
 * NO cancer percentages - only screening categories
 */

export const calculateEPsaPre = (formData) => {
  const {
    age,
    familyHistory,
    geneticRisk,
    race,
    priorPsa,
    priorBiopsy,
    finasteride
  } = formData;

  // If prior cancer diagnosed, return special message
  if (priorBiopsy === 'cancer') {
    return {
      category: 'prior-cancer',
      message: 'You should follow up with your treating physician.',
      priority: null,
      points: null
    };
  }

  // Age points
  const agePoints = 
    age === '40-49' ? 0 :
    age === '50-59' ? 1 :
    age === '60-69' ? 2 :
    age === '70+' ? 3 : 0;

  // Family history points
  const familyPoints =
    familyHistory === 'none' ? 0 :
    familyHistory === '1-relative' ? 2 :
    familyHistory === '2+relatives' ? 3 : 0;

  // Genetic mutation points
  const geneticPoints = geneticRisk === 'known-mutation' ? 4 : 0;

  // Race points (optional weighting)
  const racePoints =
    race === 'white-asian' ? 0 :
    race === 'hispanic' ? 1 :
    race === 'black' ? 1 : 0;

  // Prior PSA points
  const priorPsaPoints =
    priorPsa === 'never' ? 0 :
    priorPsa === 'normal' ? 0 :
    priorPsa === 'elevated' ? 3 :
    priorPsa === 'not-sure' ? 1 : 0;

  // Prior biopsy (negative reduces priority)
  const biopsyPoints = priorBiopsy === 'negative' ? -1 : 0;

  // Calculate total
  let totalPoints = agePoints + familyPoints + geneticPoints + racePoints + priorPsaPoints + biopsyPoints;

  // Ensure non-negative
  totalPoints = Math.max(0, totalPoints);

  // Determine screening category
  let category, priority, color;
  
  if (totalPoints <= 2) {
    category = 'Routine Screening';
    priority = 'routine';
    color = 'green';
  } else if (totalPoints <= 5) {
    category = 'Priority Screening Today';
    priority = 'priority';
    color = 'yellow';
  } else {
    category = 'High Priority + Strong Follow-Up Recommended';
    priority = 'high-priority';
    color = 'red';
  }

  return {
    category,
    priority,
    color,
    points: totalPoints,
    finasteride: finasteride === 'yes'
  };
};
