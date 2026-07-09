// Risk factor references for ePSA form fields.
// These are keyed so the Info modal can render translated descriptions + source links.
//
// Sources are intended to match the citations used in the original HTML prototype
// (e.g. values embedded in data-tooltip on ePSA-working.html).
const pubmedSearch = (term) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`;

const cancerGovProstatePreventionUrl = 'https://www.cancer.gov/types/prostate/patient/prostate-prevention-pdq';
const seerRiskUrl = 'https://training.seer.cancer.gov/prostate/intro/risk.html';

// Canonical references used by AUA/NCCN PSA screening guidelines.
// Surfaced on fields that AUA/NCCN actually use as screening criteria
// (age, race/ancestry, family history, germline mutations).
const auaScreeningGuideline = {
  name: 'AUA/SUO Early Detection of Prostate Cancer Guideline (Wei JT, et al. 2023)',
  url: 'https://www.auanet.org/guidelines-and-quality/guidelines/early-detection-of-prostate-cancer-guidelines',
};
const nccnScreeningGuideline = {
  name: 'NCCN Guidelines® — Prostate Cancer Early Detection',
  url: 'https://www.nccn.org/guidelines/guidelines-detail?category=2&id=1460',
};

export const fieldReferences = {
  age: {
    titleKey: 'part1.fields.age.title',
    descriptionKey: 'part1.fields.age.description',
    isGuideline: true,
    sources: [
      auaScreeningGuideline,
      nccnScreeningGuideline,
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
      { name: 'SEER Database', url: seerRiskUrl },
      { name: 'cancer.gov (NCI)', url: cancerGovProstatePreventionUrl },
      { name: 'Godtman RA, et al., Eur Urol. 2022', url: pubmedSearch('Godtman RA Eur Urol 2022') },
      { name: 'Nemesure B, et al., Res Rep Urol. 2022', url: pubmedSearch('Nemesure B Res Rep Urol 2022') },
    ],
  },
  race: {
    titleKey: 'part1.fields.race.title',
    descriptionKey: 'part1.fields.race.description',
    isGuideline: true,
    sources: [
      auaScreeningGuideline,
      nccnScreeningGuideline,
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'ZERO Cancer', url: 'https://zerocancer.org/risk-factors' },
      { name: 'Tewari A., et al., Urol Onc. 2005', url: pubmedSearch('Tewari A Urol Onc 2005') },
      { name: 'Loeb S., et al., Urology 2006', url: pubmedSearch('Loeb S Urology 2006') },
      { name: 'Brawley O., World J Urol. 2012', url: pubmedSearch('Brawley O World J Urol 2012') },
    ],
  },
  familyHistory: {
    titleKey: 'part1.fields.familyHistory.title',
    descriptionKey: 'part1.fields.familyHistory.description',
    isGuideline: true,
    sources: [
      auaScreeningGuideline,
      nccnScreeningGuideline,
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
      { name: 'ZERO Cancer', url: 'https://zerocancer.org/risk-factors' },
      { name: 'Hemminki H, et al., Eur Urol Open Sci 2024', url: pubmedSearch('Hemminki H Eur Urol Open Sci 2024') },
      { name: 'Madersbacher S, et al., BJU Int. 2010', url: pubmedSearch('Madersbacher S BJU Int 2010') },
    ],
  },
  inflammationHistory: {
    titleKey: 'part1.fields.inflammationHistory.title',
    descriptionKey: 'part1.fields.inflammationHistory.description',
    isGuideline: false,
    sources: [{ name: 'PMC Study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9955741/' }],
  },
  brcaStatus: {
    titleKey: 'part1.fields.brcaStatus.title',
    descriptionKey: 'part1.fields.brcaStatus.description',
    isGuideline: true,
    sources: [
      auaScreeningGuideline,
      nccnScreeningGuideline,
      { name: 'PMC Study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9955741/' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
      { name: 'Hemminki H, et al., Eur Urol Open Sci 2024', url: pubmedSearch('Hemminki H Eur Urol Open Sci 2024') },
      { name: 'Giri VN, et al., J Clin Oncol. 2018', url: pubmedSearch('Giri VN J Clin Oncol 2018') },
      { name: 'Nyberg T, et al., Br J Cancer. 2022 — BRCA1/2 meta-analysis', url: 'https://pubmed.ncbi.nlm.nih.gov/34963702/' },
      { name: 'Ewing CM, et al., N Engl J Med. 2012 — HOXB13 G84E', url: 'https://pubmed.ncbi.nlm.nih.gov/22236224/' },
      { name: 'Xu J, et al., Hum Genet. 2013 — HOXB13 susceptibility gene', url: 'https://pubmed.ncbi.nlm.nih.gov/23064873/' },
    ],
  },
  heightWeight: {
    titleKey: 'part1.fields.heightWeight.title',
    descriptionKey: 'part1.fields.heightWeight.description',
    isGuideline: false,
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'KCUC', url: 'https://www.kcuc.com/know-your-prostate-cancer-risk-factors/' },
      { name: 'Zhu D, et al., Clin Genitourin Cancer 2022', url: pubmedSearch('Zhu D Clin Genitourin Cancer 2022') },
    ],
  },
  exercise: {
    titleKey: 'part1.fields.exercise.title',
    descriptionKey: 'part1.fields.exercise.description',
    isGuideline: false,
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'ZERO Cancer', url: 'https://zerocancer.org/risk-factors' },
      { name: 'Rogers LQ, et al., BMC Public Health 2008', url: pubmedSearch('Rogers LQ BMC Public Health 2008') },
    ],
  },
  smoking: {
    titleKey: 'part1.fields.smoking.title',
    descriptionKey: 'part1.fields.smoking.description',
    isGuideline: false,
    sources: [
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'KCUC', url: 'https://www.kcuc.com/know-your-prostate-cancer-risk-factors/' },
      { name: 'Plaskon LA, et al., Cancer Epidemiol Biomarkers Prev. 2003', url: pubmedSearch('Plaskon LA Cancer Epidemiol Biomarkers Prev 2003') },
    ],
  },
  chemicalExposure: {
    titleKey: 'part1.fields.chemicalExposure.title',
    descriptionKey: 'part1.fields.chemicalExposure.description',
    isGuideline: false,
    sources: [
      { name: 'CDC WTC Health Program – Toxins & Health Impacts', url: 'https://www.cdc.gov/wtc/exhibition/toxins-and-health-impacts.html' },
      { name: 'CDC', url: 'https://www.cdc.gov/prostate-cancer/risk-factors/index.html' },
      { name: 'KCUC', url: 'https://www.kcuc.com/know-your-prostate-cancer-risk-factors/' },
    ],
  },
  diet: {
    titleKey: 'part1.fields.diet.title',
    descriptionKey: 'part1.fields.diet.description',
    isGuideline: false,
    sources: [
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
      { name: 'ZERO Cancer', url: 'https://zerocancer.org/risk-factors' },
      { name: 'Su ZT, et al., JAMA Oncol. 2024', url: pubmedSearch('Su ZT JAMA Oncol 2024') },
      { name: 'Andersson SO, et al., Int J Cancer. 1996', url: pubmedSearch('Andersson SO Int J Cancer 1996') },
    ],
  },
  ipss: {
    titleKey: 'part1.fields.ipss.title',
    descriptionKey: 'part1.fields.ipss.description',
    isGuideline: false,
    sources: [
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
      { name: 'van Leeuwen, PJ, et al., Can J Urol. 2011', url: pubmedSearch('van Leeuwen PJ Can J Urol 2011') },
    ],
  },
  shim: {
    titleKey: 'part1.fields.shim.title',
    descriptionKey: 'part1.fields.shim.description',
    isGuideline: false,
    sources: [
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/prostate-cancer/symptoms-causes/syc-20353087' },
    ],
  },
  comorbidities: {
    titleKey: 'part1.fields.comorbidities.title',
    descriptionKey: 'part1.fields.comorbidities.description',
    isGuideline: false,
    sources: [
      { name: 'Tiruye et al. (2024) – Impact of comorbidities on prostate cancer-specific mortality', url: 'https://pubmed.ncbi.nlm.nih.gov/38798040/' },
      { name: 'Blanc-Lapierre A, et al., BMC Public Health 2015', url: pubmedSearch('Blanc-Lapierre A BMC Public Health 2015') },
      { name: 'Zhu D, et al., Clin Genitourin Cancer 2022', url: pubmedSearch('Zhu D Clin Genitourin Cancer 2022') },
    ],
  },
  // Active Surveillance pathway — biopsy and AS decision support sources.
  activeSurveillance: {
    sources: [
      {
        name: 'Eastham JA, et al. AUA/ASTRO Guideline Part I — J Urol. 2022;208(1):10–18',
        url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Eastham+AUA+ASTRO+guideline+part+I+J+Urol+2022',
      },
      {
        name: 'Eastham JA, et al. AUA/ASTRO Guideline Part II (Active Surveillance) — J Urol. 2022;208(1):19–25',
        url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Eastham+AUA+ASTRO+guideline+part+II+J+Urol+2022',
      },
      {
        name: 'Schaeffer EM, et al. NCCN Guidelines® Insights: Prostate Cancer, Version 3.2024 — PMID 38626801',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38626801/',
      },
      {
        name: 'Cornford P, et al. EAU Guidelines on Prostate Cancer — 2024 Update. Eur Urol. 2024;86(2):148–163',
        url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Cornford+EAU+prostate+cancer+guidelines+2024',
      },
    ],
  },
  // Part 2 evidence sources used for PSAD/PSA/MRI tooltips/modals.
  part2: {
    psaLevel: {
      sources: [
        {
          name: 'Loeb S., et al., Urology 2006',
          url: pubmedSearch('Loeb S Urology 2006'),
        },
        {
          name: 'AUA/SUO Screening Guidelines 2023',
          url: pubmedSearch('AUA SUO screening guidelines 2023'),
        },
      ],
    },
    pirads: {
      titleKey: 'part2.piradsInfo.title',
      descriptionKey: 'part2.piradsInfo.description',
      sources: [
        {
          name: 'Park KJ., et al., J Urol. 2020',
          url: pubmedSearch('Park KJ J Urol 2020'),
        },
        {
          name: 'Oerther B., et al., Prostate Cancer 2021',
          url: pubmedSearch('Oerther B Prostate Cancer 2021'),
        },
      ],
    },
    psadKadeer: {
      sources: [
        {
          name: 'Frontiers in Oncology (Kadeer et al., 2025)',
          url: 'https://www.frontiersin.org/journals/oncology/articles/10.3389/fonc.2025.1602134/full',
        },
        {
          name: 'Pedraza et al. (2023) — Eur Urol Open Sci (source ref)',
          url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Pedraza+2023+%22European+Urology+Open+Science%22+72-81+48',
        },
      ],
    },
  },
};

// ─── Section C — Advanced Biomarkers (Part 1) ───────────────────────────────
// These are research/adjunct tests, not part of AUA/NCCN average-risk screening
// criteria. Citations point to the primary validation studies for each assay.
// Not independently re-verified against live abstracts — treat as a starting
// point for clinical review, not a substitute for it.
export const biomarkerReferences = {
  polygenicRiskScore: {
    title: 'Polygenic Risk Score (PRS)',
    description: 'PRS aggregates hundreds to thousands of common genetic variants (SNPs) into a single inherited-risk estimate, independent of PSA or family history. Validated primarily in the PRACTICAL consortium cohorts; clinical utility for individualized screening decisions is still an active area of research.',
    sources: [
      { name: 'Conti DV, et al., Nat Genet. 2021 (PRACTICAL consortium, trans-ancestry GWAS meta-analysis)', url: pubmedSearch('Conti DV Nat Genet 2021 prostate cancer polygenic risk trans-ancestry') },
      { name: 'Chen H, et al., Eur Urol. 2021 (genetic risk score validation)', url: pubmedSearch('Chen H Eur Urol 2021 genetic score prostate cancer risk') },
      { name: 'Pashayan N, et al., Nat Rev Clin Oncol. 2020 (polygenic risk in cancer screening)', url: pubmedSearch('Pashayan N Nat Rev Clin Oncol 2020 polygenic risk screening') },
    ],
  },
  mps2: {
    title: 'MyProstateScore 2.0 (MPS2)',
    description: '18-gene urine RNA panel (expanded from the original PCA3-based MyProstateScore) designed to reduce unnecessary biopsies by predicting clinically significant (Grade Group ≥2) cancer.',
    sources: [
      { name: 'Tosoian JJ, et al. — MyProstateScore 2.0 validation', url: pubmedSearch('Tosoian MyProstateScore 2.0 validation clinically significant prostate cancer') },
      { name: 'Tomlins SA, et al., Eur Urol. 2016 (original MyProstateScore / Mi-Prostate Score)', url: pubmedSearch('Tomlins SA Eur Urol 2016 MiPS urine biomarker') },
    ],
  },
  pca3: {
    title: 'PCA3',
    description: 'Urine-based non-coding RNA biomarker measured after digital rectal exam; used as an adjunct to PSA to help decide whether a repeat biopsy is warranted.',
    sources: [
      { name: 'Groskopf J, et al., Clin Chem. 2006 (PCA3 assay development)', url: pubmedSearch('Groskopf J Clin Chem 2006 PCA3 assay') },
      { name: 'Marks LS, et al., Urology. 2007 (PCA3 clinical validation before biopsy)', url: pubmedSearch('Marks LS Urology 2007 PCA3 clinical validation') },
    ],
  },
  selectMdx: {
    title: 'SelectMDx',
    description: 'Urinary mRNA biomarker panel (HOXC6, DLX1) combined with clinical risk factors to estimate risk of high-grade prostate cancer and reduce unnecessary MRI/biopsy referrals.',
    sources: [
      { name: 'Van Neste L, et al., Eur Urol. 2016 (SelectMDx development and validation)', url: pubmedSearch('Van Neste L Eur Urol 2016 SelectMDx urinary biomarker') },
    ],
  },
  stockholm3: {
    title: 'Stockholm3 (STHLM3)',
    description: 'Blood test combining protein biomarkers, genetic variants, and clinical data into a single risk score for clinically significant prostate cancer; developed to reduce biopsies driven by PSA alone.',
    sources: [
      { name: 'Grönberg H, et al., Lancet Oncol. 2015 (STHLM3 prospective validation)', url: pubmedSearch('Gronberg H Lancet Oncol 2015 STHLM3 prostate cancer screening') },
    ],
  },
  phi: {
    title: 'Prostate Health Index (PHI)',
    description: 'FDA-approved blood test combining total PSA, free PSA, and [-2]proPSA into a single index; improves specificity for clinically significant cancer over PSA alone in the 2-10 ng/mL "gray zone".',
    sources: [
      { name: 'Catalona WJ, et al., J Urol. 2011 ([-2]proPSA + PHI multicenter study)', url: pubmedSearch('Catalona WJ J Urol 2011 proPSA prostate health index') },
    ],
  },
  fourKScore: {
    title: '4Kscore',
    description: 'Blood test combining total PSA, free PSA, intact PSA, and human kallikrein 2 (hK2) with clinical factors to estimate the probability of high-grade (Gleason ≥7) prostate cancer on biopsy.',
    sources: [
      { name: 'Parekh DJ, et al., Eur Urol. 2015 (4Kscore multi-institutional prospective trial)', url: pubmedSearch('Parekh DJ Eur Urol 2015 4Kscore prospective trial') },
    ],
  },
  decipher: {
    title: 'Decipher Genomic Classifier',
    description: 'Tissue-based 22-gene expression assay run on biopsy or prostatectomy specimen; predicts risk of metastasis and prostate-cancer-specific mortality, used to guide adjuvant/salvage treatment decisions.',
    sources: [
      { name: 'Erho N, et al., PLoS One. 2013 (Decipher discovery and validation)', url: pubmedSearch('Erho N PLoS One 2013 Decipher genomic classifier') },
      { name: 'Klein EA, et al., Eur Urol. 2015 (Decipher validation, post-prostatectomy)', url: pubmedSearch('Klein EA Eur Urol 2015 Decipher genomic classifier validation') },
    ],
  },
  exodx: {
    title: 'ExoDx Prostate (EPI)',
    description: 'Non-invasive urine exosome RNA assay (PCA3, ERG, SPDEF) obtained without a preceding digital rectal exam; used prior to initial biopsy to help identify high-grade disease.',
    sources: [
      { name: 'McKiernan J, et al., JAMA Oncol. 2016 (ExoDx Prostate IntelliScore validation)', url: pubmedSearch('McKiernan J JAMA Oncol 2016 exosome gene expression prostate biopsy') },
    ],
  },
  oncodx: {
    title: 'Oncotype DX Genomic Prostate Score (GPS)',
    description: '17-gene RT-PCR assay run directly on biopsy tissue; estimates likelihood of adverse pathology to help distinguish candidates for active surveillance from those who need immediate treatment.',
    sources: [
      { name: 'Klein EA, et al., Eur Urol. 2014 (17-gene Genomic Prostate Score validation)', url: pubmedSearch('Klein EA Eur Urol 2014 17-gene assay genomic prostate score') },
    ],
  },
  prolaris: {
    title: 'Prolaris (Myriad Genetics)',
    description: '46-gene cell cycle progression (CCP) RT-PCR assay run on biopsy or prostatectomy tissue; predicts 10-year prostate-cancer-specific mortality and metastasis risk to guide active surveillance vs. treatment decisions.',
    sources: [
      { name: 'Cuzick J, et al., Br J Cancer. 2012 (CCP score validation, conservatively managed cohort)', url: pubmedSearch('Cuzick J Br J Cancer 2012 cell cycle progression prostate biopsy') },
      { name: 'Bishoff JT, et al., J Urol. 2014 (Prolaris CCP score, biopsy validation)', url: pubmedSearch('Bishoff JT J Urol 2014 Prolaris cell cycle progression biopsy') },
    ],
  },
  exactvu: {
    title: 'ExactVu Micro-Ultrasound / PRECISE Score',
    description: '29 MHz high-resolution transrectal micro-ultrasound (~3x standard TRUS resolution) with the PRECISE 1-5 scoring protocol for lesion suspicion, used for real-time targeted biopsy guidance.',
    sources: [
      { name: 'Ghai S, et al., J Urol. 2016 (Micro-Ultrasound Protocol for Prostate Risk Identification / PRECISE)', url: pubmedSearch('Ghai S J Urol 2016 micro-ultrasound PRECISE prostate risk identification') },
      { name: 'Lughezzani G, et al. — prospective micro-ultrasound-guided biopsy study', url: pubmedSearch('Lughezzani G micro-ultrasound guided prostate biopsy prospective') },
    ],
  },
};

export default fieldReferences;
