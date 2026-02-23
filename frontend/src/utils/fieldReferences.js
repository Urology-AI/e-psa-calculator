// Risk factor references for ePSA form fields
// Sources:
// [1] CDC - https://www.cdc.gov/prostate-cancer/risk-factors/index.html
// [2] PMC Study - https://pmc.ncbi.nlm.nih.gov/articles/PMC9955741/
// [3] Mayo Clinic - https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087
// [4] KCUC - https://www.kcuc.com/know-your-prostate-cancer-risk-factors/
// [5] ZERO Cancer - https://zerocancer.org/risk-factors

export const fieldReferences = {
  age: {
    field: "Age",
    description: "Risk increases with age, particularly after 50. The average age of diagnosis is 66.",
    sources: [
      { name: "CDC", url: "https://www.cdc.gov/prostate-cancer/risk-factors/index.html" },
      { name: "Mayo Clinic", url: "https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087" }
    ]
  },
  race: {
    field: "Race/Ethnicity",
    description: "Black/African American men have higher risk and are more likely to develop prostate cancer at a younger age.",
    sources: [
      { name: "CDC", url: "https://www.cdc.gov/prostate-cancer/risk-factors/index.html" },
      { name: "ZERO Cancer", url: "https://zerocancer.org/risk-factors" }
    ]
  },
  familyHistory: {
    field: "Family History",
    description: "Having a father or brother with prostate cancer more than doubles a man's risk. The risk is even higher with multiple affected relatives.",
    sources: [
      { name: "CDC", url: "https://www.cdc.gov/prostate-cancer/risk-factors/index.html" },
      { name: "Mayo Clinic", url: "https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087" },
      { name: "ZERO Cancer", url: "https://zerocancer.org/risk-factors" }
    ]
  },
  brcaStatus: {
    field: "BRCA Mutations",
    description: "BRCA1 and BRCA2 gene mutations increase prostate cancer risk. Men with BRCA2 mutations have a 20-25% lifetime risk.",
    sources: [
      { name: "PMC Study", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9955741/" },
      { name: "Mayo Clinic", url: "https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087" }
    ]
  },
  heightWeight: {
    field: "Height & Weight (BMI)",
    description: "Obesity is associated with increased risk of aggressive prostate cancer. Taller height may be a slight risk factor.",
    sources: [
      { name: "CDC", url: "https://www.cdc.gov/prostate-cancer/risk-factors/index.html" },
      { name: "KCUC", url: "https://www.kcuc.com/know-your-prostate-cancer-risk-factors/" }
    ]
  },
  exercise: {
    field: "Exercise Level",
    description: "Regular physical activity is associated with reduced risk of aggressive prostate cancer.",
    sources: [
      { name: "CDC", url: "https://www.cdc.gov/prostate-cancer/risk-factors/index.html" },
      { name: "ZERO Cancer", url: "https://zerocancer.org/risk-factors" }
    ]
  },
  smoking: {
    field: "Smoking Status",
    description: "Smoking is linked to increased risk of aggressive prostate cancer and higher mortality rates.",
    sources: [
      { name: "CDC", url: "https://www.cdc.gov/prostate-cancer/risk-factors/index.html" },
      { name: "KCUC", url: "https://www.kcuc.com/know-your-prostate-cancer-risk-factors/" }
    ]
  },
  chemicalExposure: {
    field: "Chemical Exposure",
    description: "Exposure to Agent Orange, pesticides, and certain industrial chemicals may increase prostate cancer risk.",
    sources: [
      { name: "CDC", url: "https://www.cdc.gov/prostate-cancer/risk-factors/index.html" },
      { name: "KCUC", url: "https://www.kcuc.com/know-your-prostate-cancer-risk-factors/" }
    ]
  },
  diet: {
    field: "Diet Pattern",
    description: "Diets high in red meat and high-fat dairy may increase risk. Plant-based diets may be protective.",
    sources: [
      { name: "Mayo Clinic", url: "https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087" },
      { name: "ZERO Cancer", url: "https://zerocancer.org/risk-factors" }
    ]
  },
  geographicOrigin: {
    field: "Geographic Origin",
    description: "Prostate cancer rates vary by geography. Rates are highest in North America, Europe, and Australia.",
    sources: [
      { name: "PMC Study", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9955741/" }
    ]
  },
  ipss: {
    field: "IPSS (Urinary Symptoms)",
    description: "International Prostate Symptom Score measures lower urinary tract symptoms often associated with prostate enlargement.",
    sources: [
      { name: "Mayo Clinic", url: "https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087" }
    ]
  },
  shim: {
    field: "SHIM (Sexual Health)",
    description: "Sexual Health Inventory for Men (SHIM) assesses erectile dysfunction, which can be an indicator of prostate health issues.",
    sources: [
      { name: "Mayo Clinic", url: "https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087" }
    ]
  }
};

export default fieldReferences;
