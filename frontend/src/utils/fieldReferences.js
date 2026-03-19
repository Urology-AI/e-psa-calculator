// Risk factor references for ePSA form fields.
// These are keyed so the Info modal text can be translated via i18n.
//
// Sources (kept as static metadata):
// [1] CDC - https://www.cdc.gov/prostate-cancer/risk-factors/index.html
// [2] PMC Study - https://pmc.ncbi.nlm.nih.gov/articles/PMC9955741/
// [3] Mayo Clinic - https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087
// [4] KCUC - https://www.kcuc.com/know-your-prostate-cancer-risk-factors/
// [5] ZERO Cancer - https://zerocancer.org/risk-factors

export const fieldReferences = {
  age: {
    titleKey: 'part1.fields.age.title',
    descriptionKey: 'part1.fields.age.description',
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
    ],
  },
  race: {
    titleKey: 'part1.fields.race.title',
    descriptionKey: 'part1.fields.race.description',
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'ZERO Cancer', url: 'https://zerocancer.org/risk-factors' },
    ],
  },
  familyHistory: {
    titleKey: 'part1.fields.familyHistory.title',
    descriptionKey: 'part1.fields.familyHistory.description',
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
      { name: 'ZERO Cancer', url: 'https://zerocancer.org/risk-factors' },
    ],
  },
  inflammationHistory: {
    titleKey: 'part1.fields.inflammationHistory.title',
    descriptionKey: 'part1.fields.inflammationHistory.description',
    sources: [{ name: 'PMC Study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9955741/' }],
  },
  brcaStatus: {
    titleKey: 'part1.fields.brcaStatus.title',
    descriptionKey: 'part1.fields.brcaStatus.description',
    sources: [
      { name: 'PMC Study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9955741/' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
    ],
  },
  heightWeight: {
    titleKey: 'part1.fields.heightWeight.title',
    descriptionKey: 'part1.fields.heightWeight.description',
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'KCUC', url: 'https://www.kcuc.com/know-your-prostate-cancer-risk-factors/' },
    ],
  },
  exercise: {
    titleKey: 'part1.fields.exercise.title',
    descriptionKey: 'part1.fields.exercise.description',
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'ZERO Cancer', url: 'https://zerocancer.org/risk-factors' },
    ],
  },
  smoking: {
    titleKey: 'part1.fields.smoking.title',
    descriptionKey: 'part1.fields.smoking.description',
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'KCUC', url: 'https://www.kcuc.com/know-your-prostate-cancer-risk-factors/' },
    ],
  },
  chemicalExposure: {
    titleKey: 'part1.fields.chemicalExposure.title',
    descriptionKey: 'part1.fields.chemicalExposure.description',
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'KCUC', url: 'https://www.kcuc.com/know-your-prostate-cancer-risk-factors/' },
    ],
  },
  diet: {
    titleKey: 'part1.fields.diet.title',
    descriptionKey: 'part1.fields.diet.description',
    sources: [
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
      { name: 'ZERO Cancer', url: 'https://zerocancer.org/risk-factors' },
    ],
  },
  ipss: {
    titleKey: 'part1.fields.ipss.title',
    descriptionKey: 'part1.fields.ipss.description',
    sources: [
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
    ],
  },
  shim: {
    titleKey: 'part1.fields.shim.title',
    descriptionKey: 'part1.fields.shim.description',
    sources: [
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
    ],
  },
  comorbidities: {
    titleKey: 'part1.fields.comorbidities.title',
    descriptionKey: 'part1.fields.comorbidities.description',
    sources: [
      { name: 'Tiruye et al. (2024) – Impact of comorbidities on prostate cancer-specific mortality', url: 'https://pubmed.ncbi.nlm.nih.gov/38798040/' },
    ],
  },
};

export default fieldReferences;
