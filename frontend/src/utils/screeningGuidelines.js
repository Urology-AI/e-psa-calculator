/*
 * screeningGuidelines.js
 *
 * Country / region-specific prostate cancer EARLY DETECTION (pre-screening)
 * guidance, for the educational overview shown before the ePSA assessment.
 *
 * Scope note: this describes *whether and when to have a PSA conversation* —
 * the pre-screen decision. It deliberately does not cover post-diagnosis
 * treatment guidance, which is out of scope for this screen.
 *
 * Every entry carries the issuing body, the year of the guidance it reflects,
 * and at least one primary source link. Content is educational only.
 *
 * Last reviewed: August 2026.
 */

/* Posture badges — how the health system positions PSA testing.
 * Ordered loosely from most to least proactive. */
export const POSTURE = {
  ORGANISED: {
    id: 'organised',
    label: 'Organised programme',
    blurb: 'Men are actively invited to be tested through a public programme.',
  },
  RECOMMENDED: {
    id: 'recommended',
    label: 'Routinely offered',
    blurb: 'Clinicians are advised to raise PSA testing proactively with eligible men.',
  },
  SHARED: {
    id: 'shared',
    label: 'Shared decision-making',
    blurb: 'Testing is offered after a discussion of benefits and harms — not automatic.',
  },
  TARGETED: {
    id: 'targeted',
    label: 'High-risk only',
    blurb: 'Screening is recommended only for defined high-risk groups.',
  },
  OPPORTUNISTIC: {
    id: 'opportunistic',
    label: 'Opportunistic testing',
    blurb: 'No national programme; testing happens case-by-case when raised.',
  },
};

/*
 * Region records.
 *
 * Fields:
 *   id            — stable key
 *   name          — display name
 *   scope         — 'country' | 'region'
 *   body          — issuing guideline body
 *   year          — year/version of the guidance reflected here
 *   posture       — POSTURE.* record
 *   startAge      — average-risk age to begin the PSA conversation (display string)
 *   highRiskAge   — earlier start for higher-risk men (display string)
 *   interval      — re-test cadence (display string)
 *   stopAge       — when routine testing typically stops (display string)
 *   summary       — 1–3 sentence plain-language description
 *   highRisk[]    — locally-defined higher-risk groups
 *   notes[]       — extra context worth surfacing (programme status, caveats)
 *   sources[]     — { text, url }
 */
export const REGION_GUIDANCE = [
  {
    id: 'us',
    name: 'United States',
    scope: 'country',
    emoji: '🇺🇸',
    body: 'AUA / SUO, NCCN, USPSTF',
    year: '2026',
    posture: POSTURE.SHARED,
    startAge: '45–50',
    highRiskAge: '40–45',
    interval: 'Every 2–4 years',
    stopAge: 'Individualised (life expectancy > 10 yrs)',
    summary:
      'The AUA/SUO guideline (2023, amended 2026) says clinicians may offer a baseline PSA between 45 and 50 for average-risk men, and should offer it from 40–45 for higher-risk men. Regular re-testing every 2–4 years is recommended for ages 50–69, personalised by PSA level, risk and life expectancy.',
    highRisk: [
      'Black / African ancestry',
      'Germline mutations (BRCA1/2, Lynch, ATM, CHEK2)',
      'Strong family history of prostate cancer',
    ],
    notes: [
      'NCCN v1.2024 starts at 45 for most men (40 if higher risk), re-testing every 1–2 years to age 75.',
      'The USPSTF position (2018) remains a "C" grade — individual shared decision-making for ages 55–69, and against routine screening at 70+. An evidence update is in progress.',
    ],
    sources: [
      { text: 'AUA/SUO Early Detection of Prostate Cancer Guideline (2026 amendment)', url: 'https://www.auanet.org/guidelines-and-quality/guidelines/early-detection-of-prostate-cancer-guideline' },
      { text: 'NCCN Prostate Cancer Early Detection v1.2024', url: 'https://www.nccn.org/guidelines/guidelines-detail?category=2&id=1460' },
      { text: 'USPSTF Prostate Cancer: Screening', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/prostate-cancer-screening' },
    ],
  },
  {
    id: 'ca',
    name: 'Canada',
    scope: 'country',
    emoji: '🇨🇦',
    body: 'Canadian Urological Association (CUA) / CTFPHC',
    year: '2022 (CUA) · 2014 (CTFPHC)',
    posture: POSTURE.SHARED,
    startAge: '50',
    highRiskAge: '45',
    interval: 'Individualised (typically 2–4 years)',
    stopAge: 'Individualised (life expectancy > 10 yrs)',
    summary:
      'Canada has two guidelines that disagree. The Canadian Urological Association recommends offering PSA testing from age 50 for most men, and from 45 for men at increased risk. The Canadian Task Force on Preventive Health Care recommends against routine PSA screening, citing harms that outweigh a small mortality benefit.',
    highRisk: [
      'Black / African or Caribbean ancestry',
      'First-degree relative with prostate cancer',
      'Known BRCA2 variant',
    ],
    notes: [
      'The CTFPHC position dates from 2014 and predates the routine use of MRI before biopsy, which substantially reduces the over-diagnosis harm it weighs against screening.',
      'Because the two bodies differ, a documented shared-decision conversation with your own clinician matters more here than in most countries.',
    ],
    sources: [
      { text: 'CUA recommendations on prostate cancer screening and early diagnosis', url: 'https://www.cua.org/system/files/Guideline-Files/7851_v6_1.pdf' },
      { text: 'CTFPHC Prostate Cancer — Clinician Summary', url: 'https://canadiantaskforce.ca/prostate-cancer-clinician-summary/' },
    ],
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    scope: 'country',
    emoji: '🇬🇧',
    body: 'UK National Screening Committee (UK NSC)',
    year: '2026',
    posture: POSTURE.TARGETED,
    startAge: 'No population screening',
    highRiskAge: '~40–45 (BRCA2 carriers)',
    interval: 'Per specialist genetics pathway',
    stopAge: 'n/a',
    summary:
      'In May 2026 the UK NSC confirmed that population-wide PSA screening should not be introduced — it judged that screening everyone would cause more harm than good. It instead recommended targeted screening for men with a known BRCA2 gene change and a family history of linked cancers. The government accepted this for England in June 2026.',
    highRisk: [
      'Known BRCA2 variant with family history of linked cancers',
      'Black men — risk is higher, but the UK NSC judged the evidence for screening them still uncertain',
    ],
    notes: [
      'Population screening is not offered, but men over 50 in England can still request a PSA test from their GP under the informed-choice programme.',
      'The UK NSC has committed to a "live" model — updating this recommendation as new evidence arrives rather than on a fixed multi-year cycle.',
    ],
    sources: [
      { text: 'UK NSC recommends targeted prostate cancer screening (Cancer Research UK, May 2026)', url: 'https://news.cancerresearchuk.org/2026/05/28/uk-nsc-recommends-prostate-cancer-screening-for-men-with-a-brca2-gene-change-and-family-history-of-cancer/' },
      { text: 'UK National Screening Committee blog — March 2026 meeting minutes', url: 'https://nationalscreening.blog.gov.uk/2026/05/28/minutes-published-of-uk-nsc-march-2026-meeting/' },
    ],
  },
  {
    id: 'eu',
    name: 'European Union',
    scope: 'region',
    emoji: '🇪🇺',
    body: 'EAU / EU Council / PRAISE-U',
    year: '2026',
    posture: POSTURE.SHARED,
    startAge: '50',
    highRiskAge: '45 (40–45 if BRCA2)',
    interval: 'Risk-adapted (2–4 years; longer if PSA < 1)',
    stopAge: 'Individualised (life expectancy > 10–15 yrs)',
    summary:
      'The EAU guideline recommends a risk-adapted strategy: offer a baseline PSA from age 50, or from 45 for higher-risk men, with the re-test interval set by the baseline value. MRI before biopsy is standard, which is what makes this approach lower-harm than older PSA-only screening.',
    highRisk: [
      'Family history of prostate cancer',
      'BRCA2 carriers (from age 40–45)',
      'African ancestry',
    ],
    notes: [
      'The 2022 EU Council recommendation on cancer screening asked member states to explore organised, MRI-backed PSA screening — a significant shift from prostate cancer previously being excluded entirely.',
      'PRAISE-U is piloting risk-stratified organised screening in Ireland, Poland, Lithuania and two regions of Spain. A full evaluation goes to the European Commission at the end of 2026, and will shape national programmes.',
    ],
    sources: [
      { text: 'EAU Guidelines on Prostate Cancer — 2026 update, Part I: Screening & Diagnosis', url: 'https://uroweb.org/guidelines/prostate-cancer' },
      { text: 'PRAISE-U project protocol, European Urology Open Science', url: 'https://www.eu-openscience.europeanurology.com/article/S2666-1683(24)00922-4/fulltext' },
      { text: 'PRAISE-U — Europa Uomo overview', url: 'https://www.europa-uomo.org/who-we-are/praise-u/' },
    ],
  },
  {
    id: 'de',
    name: 'Germany',
    scope: 'country',
    emoji: '🇩🇪',
    body: 'German S3 Guideline / Leitlinienprogramm Onkologie',
    year: '2025',
    posture: POSTURE.SHARED,
    startAge: '45',
    highRiskAge: '40',
    interval: 'Risk-adapted by baseline PSA',
    stopAge: 'Individualised (life expectancy > 10 yrs)',
    summary:
      'The 2025 German S3 guideline recommends risk-adapted early detection using PSA combined with MRI, replacing the older digital-rectal-exam-first model. Statutory early-detection checks are offered from age 45, and men who ask must be informed about PSA testing.',
    highRisk: [
      'Family history of prostate cancer',
      'BRCA2 carriers',
      'African ancestry',
    ],
    notes: [
      'Germany is actively debating a move from opportunistic DRE-based checks to an organised, age-banded PSA screening programme.',
      'PSA testing itself is generally not reimbursed by statutory insurance for asymptomatic men — it is often paid out of pocket (an "IGeL" service). Worth asking about before you test.',
    ],
    sources: [
      { text: 'German S3 Guideline Prostate Cancer (Leitlinienprogramm Onkologie)', url: 'https://www.leitlinienprogramm-onkologie.de/leitlinien/prostatakarzinom' },
      { text: 'The Proposed Introduction of a Prostate Cancer Screening Program in Germany (Dtsch Arztebl Int, 2026)', url: 'https://di.aerzteblatt.de/int/archive/article/250159' },
    ],
  },
  {
    id: 'nordics',
    name: 'Sweden & the Nordics',
    scope: 'region',
    emoji: '🇸🇪',
    body: 'Regional Cancer Centres (Sweden) — Organised Prostate Testing (OPT)',
    year: '2025',
    posture: POSTURE.ORGANISED,
    startAge: '50 (invited)',
    highRiskAge: '45–50',
    interval: 'Set by baseline PSA (2–6 years)',
    stopAge: '~70–74',
    summary:
      'Sweden runs Organised Prostate Testing (OPT) — men in eligible age bands are actively invited by letter for a PSA test, with MRI before any biopsy. By the end of 2024 the programme covered 16 of 21 regions and had invited nearly 256,000 men, and it continued expanding through 2025.',
    highRisk: [
      'Family history of prostate cancer',
      'BRCA2 carriers',
    ],
    notes: [
      'This is one of the few genuinely organised, invitation-based prostate programmes in the world — if you are in an eligible band you may simply receive an invitation.',
      'Average participation has been around 43%, so a non-response is common and does not remove you from future invitations.',
    ],
    sources: [
      { text: 'Regionala cancercentrum — Organiserad prostatacancertestning (OPT)', url: 'https://cancercentrum.se/samverkan/cancerdiagnoser/prostata/organiserad-prostatacancertestning/' },
      { text: 'EAU Guidelines on Prostate Cancer — screening chapter', url: 'https://uroweb.org/guidelines/prostate-cancer' },
    ],
  },
  {
    id: 'anz',
    name: 'Australia & New Zealand',
    scope: 'region',
    emoji: '🇦🇺',
    body: 'PCFA / Cancer Council Australia — NHMRC-approved',
    year: '2025 guideline, NHMRC-approved 2026',
    posture: POSTURE.RECOMMENDED,
    startAge: '50 (baseline offered from 40)',
    highRiskAge: '40',
    interval: 'Every 2 years, ages 50–69',
    stopAge: '~69 (older by individual decision)',
    summary:
      'Australia\'s 2025 early-detection guideline is the most proactive of any major country. GPs are advised to initiate the conversation and offer two-yearly PSA testing to all men aged 50–69 — and, in a world-first, to offer a baseline PSA at age 40 to men who are interested. Routine digital rectal exams in primary care are no longer recommended; MRI before biopsy is.',
    highRisk: [
      'Aboriginal and Torres Strait Islander men — testing every 2 years from age 40',
      'Family history of prostate cancer',
      'BRCA2 carriers',
    ],
    notes: [
      'These guidelines supersede the 2016 PSA testing guidelines and were approved by the NHMRC in May 2026.',
      'New Zealand has no organised programme; practice there generally follows a shared-decision model closer to the earlier Australian guidance.',
    ],
    sources: [
      { text: 'PCFA — Clinical guidelines for the early detection of prostate cancer', url: 'https://www.prostate.org.au/resources/clinical-guidelines-for-the-early-detection-of-prostate-cancer/' },
      { text: 'PCFA — Australia set to lead the world in prostate cancer detection', url: 'https://www.pcfa.org.au/news-media/news/australia-set-to-lead-the-world-in-prostate-cancer-detection/' },
    ],
  },
  {
    id: 'south_asia',
    name: 'India & South Asia',
    scope: 'region',
    emoji: '🇮🇳',
    body: 'Urological Society of India (USI)',
    year: '2022',
    posture: POSTURE.OPPORTUNISTIC,
    startAge: 'No population screening; discuss from ~50',
    highRiskAge: '~45 with family history',
    interval: 'Not defined by programme',
    stopAge: 'Individualised',
    summary:
      'There is no national prostate cancer screening programme in India, and mass screening is not recommended — recorded incidence is much lower than in Western countries. In practice, testing is opportunistic: a PSA is ordered when a man or his physician raises it, or when urinary symptoms appear. USI guidance uses a PSA cutoff of 4 ng/mL to trigger further evaluation, with PSA derivatives considered in the 4–10 ng/mL range.',
    highRisk: [
      'Family history of prostate cancer',
      'Urinary symptoms — the most common route to diagnosis here',
    ],
    notes: [
      'A large share of cases in the region present at an advanced stage, so new or worsening urinary symptoms deserve prompt attention rather than watchful waiting.',
      'Age-specific PSA reference ranges validated for South Asian men are still an open research need — Western thresholds are applied by default.',
    ],
    sources: [
      { text: 'Urological Society of India guidelines for prostate cancer (executive summary)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9787438/' },
      { text: 'Prostate Cancer Consensus Conference for Developing Countries (JCO Global Oncology)', url: 'https://ascopubs.org/doi/10.1200/GO.20.00527' },
    ],
  },
  {
    id: 'ssa',
    name: 'Sub-Saharan Africa',
    scope: 'region',
    emoji: '🌍',
    body: 'Regional consensus (PCCCDC) & national urological societies',
    year: '2021 consensus',
    posture: POSTURE.OPPORTUNISTIC,
    startAge: '40–45 (earlier than Western guidance)',
    highRiskAge: '40',
    interval: 'Not defined by programme',
    stopAge: 'Individualised',
    summary:
      'Prostate cancer is the most common cancer in men in Nigeria and much of the region, and men of African ancestry are at elevated risk from age 40. There is no organised national programme in most countries; screening happens through community campaigns and opportunistic PSA plus DRE, typically offered from age 40. The dominant problem is late presentation, not over-diagnosis.',
    highRisk: [
      'African ancestry is itself a major risk factor — from age 40',
      'Family history of prostate cancer',
    ],
    notes: [
      'Community screening in Lagos found roughly 74% of detected cancers were already advanced, with most Gleason ≥ 7 — the argument for testing earlier here is much stronger than in low-incidence settings.',
      'The developing-countries consensus (PCCCDC) supports earlier and more proactive early detection where access to treatment exists.',
    ],
    sources: [
      { text: 'Need for and relevance of prostate cancer screening in Nigeria (ecancer)', url: 'https://ecancer.org/en/journal/article/457-need-for-and-relevance-of-prostate-cancer-screening-in-nigeria' },
      { text: 'Community-based PSA + DRE screening in Nigeria — prevalence and stage', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3830465/' },
      { text: 'Prostate Cancer Consensus Conference for Developing Countries (JCO Global Oncology)', url: 'https://ascopubs.org/doi/10.1200/GO.20.00527' },
    ],
  },
  {
    id: 'mena',
    name: 'Middle East & North Africa',
    scope: 'region',
    emoji: '🌍',
    body: 'Regional expert consensus; national health authorities',
    year: '2024',
    posture: POSTURE.SHARED,
    startAge: '~50 (regional consensus supports discussing before 50)',
    highRiskAge: '40–45',
    interval: 'Not defined by programme',
    stopAge: '~70',
    summary:
      'There is no organised regional screening programme. Regional consensus encourages PSA testing through shared decision-making from before age 50 up to about 70. Incidence has risen steadily across the Gulf over the past two decades, and a higher share of cancers are found at an advanced stage than in Western countries — largely because routine testing is not yet established.',
    highRisk: [
      'Family history of prostate cancer',
      'BRCA2 carriers',
    ],
    notes: [
      'Awareness is the main barrier: in one Saudi survey only 29% of men knew what a PSA test was, and under 6% had ever had one.',
      'Private and employer health screening packages in the Gulf commonly include PSA — check whether yours already does.',
    ],
    sources: [
      { text: 'With increasing trends of prostate cancer in Saudi Arabia and the Arab World: Should we start screening programs?', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5740100/' },
      { text: 'Community understanding and attitudes toward PSA testing — Saudi Arabia', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12732536/' },
    ],
  },
  {
    id: 'russia_cis',
    name: 'Russia, CIS & Eastern Europe',
    scope: 'region',
    emoji: '🇷🇺',
    body: 'National health ministries; regional pilot programmes',
    year: '2024',
    posture: POSTURE.OPPORTUNISTIC,
    startAge: '~50',
    highRiskAge: '45',
    interval: 'Varies by national programme',
    stopAge: '~65–70',
    summary:
      'Russia has no formally established national prostate screening programme — PSA testing has been available since the 1990s and is done opportunistically, including through routine health check-ups. Several neighbouring countries have gone further: Lithuania runs a long-standing population-based programme, Kazakhstan has run population screening, and Belarus and Croatia have piloted PSA screening in defined age bands.',
    highRisk: [
      'Family history of prostate cancer',
      'Urinary symptoms',
    ],
    notes: [
      'Lithuania\'s programme (ages 50–69, or 45+ with family history) is among the longest-running in Europe and is one of the PRAISE-U pilot sites.',
      'The Czech Republic launched a nationwide screening pilot whose first results were reported in 2026.',
    ],
    sources: [
      { text: 'Prostate cancer incidence and mortality in the Baltic states, Belarus, the Russian Federation and Ukraine', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6797259/' },
      { text: 'Ten years of population-based early prostate cancer detection in Lithuania', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7760278/' },
    ],
  },
  {
    id: 'latam',
    name: 'Latin America',
    scope: 'region',
    emoji: '🇧🇷',
    body: 'Sociedade Brasileira de Urologia (SBU) & national societies',
    year: '2024',
    posture: POSTURE.SHARED,
    startAge: '50',
    highRiskAge: '45',
    interval: 'Annual (SBU)',
    stopAge: 'Individualised (life expectancy > 10 yrs)',
    summary:
      'The Brazilian Society of Urology recommends men seek an individualised assessment at age 50 — 45 if at higher risk — and then have annual PSA testing. This is more frequent than most Western guidelines. Public health authorities in the region are generally more cautious than the urological societies, so what is offered depends heavily on whether care is public or private.',
    highRisk: [
      'African ancestry',
      'Family history of prostate cancer',
      'Obesity (flagged in SBU guidance)',
    ],
    notes: [
      'Brazil\'s "Novembro Azul" campaign drives large volumes of opportunistic testing each November.',
      'The Ministry of Health has historically not endorsed population screening, which is why SBU guidance and public policy differ.',
    ],
    sources: [
      { text: 'Sociedade Brasileira de Urologia — prostate cancer early detection', url: 'https://portaldaurologia.org.br/' },
      { text: 'Prostate Cancer Consensus Conference for Developing Countries (JCO Global Oncology)', url: 'https://ascopubs.org/doi/10.1200/GO.20.00527' },
    ],
  },
  {
    id: 'east_asia',
    name: 'East Asia',
    scope: 'region',
    emoji: '🌏',
    body: 'Japanese Urological Association (JUA); Chinese Urological Association (CUA)',
    year: '2024',
    posture: POSTURE.OPPORTUNISTIC,
    startAge: '50',
    highRiskAge: '45 with family history',
    interval: 'Annual (China, CUA) / municipal cycle (Japan)',
    stopAge: '~74–80',
    summary:
      'The Japanese Urological Association recommends PSA screening from age 50, delivered through municipal Community Health Basic Screening — coverage varies a lot by municipality. In China, CUA guidance recommends annual PSA for men over 50, or over 45 with a family history, with risk-adapted screening for ages 50–74 in higher-incidence urban areas.',
    highRisk: [
      'Family history of prostate cancer',
      'Lower urinary tract symptoms (an explicit trigger in CUA guidance)',
    ],
    notes: [
      'Japan\'s municipal programmes use age-banded PSA cutoffs rather than a flat 4 ng/mL: 3.0 for 50–64, 3.5 for 65–69, 4.0 for 70+.',
      'Japanese urologists and public health bodies have publicly disagreed on population PSA screening, so availability depends on where you live.',
    ],
    sources: [
      { text: 'JUA guidelines on PSA-based screening for prostate cancer', url: 'https://onlinelibrary.wiley.com/doi/10.1111/j.1442-2042.2010.02613.x' },
      { text: 'PSA-based population screening: current status in Japan and future perspective in Asia', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4430954/' },
      { text: 'Chinese expert consensus on prostate cancer management', url: 'https://onlinelibrary.wiley.com/doi/10.1002/uro2.76' },
    ],
  },
  {
    id: 'intl',
    name: 'International (general guidance)',
    scope: 'region',
    emoji: '🌐',
    body: 'AUA/SUO, NCCN and EAU — points of agreement',
    year: '2026',
    posture: POSTURE.SHARED,
    startAge: '45–50',
    highRiskAge: '40–45',
    interval: 'Every 2–4 years',
    stopAge: 'Individualised (life expectancy > 10 yrs)',
    summary:
      'We do not yet have a dedicated entry for your country. Where the major guidelines agree: have the first PSA conversation somewhere between 45 and 50, earlier (40–45) if you have African ancestry, a family history, or a known BRCA2 variant; re-test every 2–4 years while the benefit outweighs the harms; and use MRI before deciding on a biopsy.',
    highRisk: [
      'African ancestry',
      'Family history of prostate cancer',
      'Germline mutations (BRCA1/2, Lynch, ATM, CHEK2)',
    ],
    notes: [
      'Local availability, cost and reimbursement vary widely — your own clinician is the authority on what is offered where you are.',
    ],
    sources: [
      { text: 'AUA/SUO Early Detection of Prostate Cancer Guideline (2026 amendment)', url: 'https://www.auanet.org/guidelines-and-quality/guidelines/early-detection-of-prostate-cancer-guideline' },
      { text: 'EAU Guidelines on Prostate Cancer', url: 'https://uroweb.org/guidelines/prostate-cancer' },
      { text: 'NCCN Prostate Cancer Early Detection v1.2024', url: 'https://www.nccn.org/guidelines/guidelines-detail?category=2&id=1460' },
    ],
  },
];

export const DEFAULT_REGION_ID = 'intl';

/* ISO 3166-1 alpha-2 → region id.
 * Countries not listed fall back to DEFAULT_REGION_ID. */
export const COUNTRY_TO_REGION = {
  // North America
  US: 'us', PR: 'us', GU: 'us', VI: 'us',
  CA: 'ca',

  // United Kingdom & Ireland (Ireland follows EU/PRAISE-U)
  GB: 'uk', IM: 'uk', JE: 'uk', GG: 'uk',
  IE: 'eu',

  // Germany & German-speaking
  DE: 'de', AT: 'de', CH: 'de',

  // Nordics
  SE: 'nordics', NO: 'nordics', DK: 'nordics', FI: 'nordics', IS: 'nordics',

  // Rest of EU / EEA
  FR: 'eu', ES: 'eu', IT: 'eu', PT: 'eu', NL: 'eu', BE: 'eu', LU: 'eu',
  GR: 'eu', CY: 'eu', MT: 'eu', SI: 'eu', HR: 'eu', PL: 'eu', CZ: 'eu',
  SK: 'eu', HU: 'eu', RO: 'eu', BG: 'eu', EE: 'eu', LV: 'eu', LT: 'eu',
  AD: 'eu', MC: 'eu', SM: 'eu', LI: 'eu',

  // Russia, CIS & non-EU Eastern Europe
  RU: 'russia_cis', BY: 'russia_cis', UA: 'russia_cis', MD: 'russia_cis',
  KZ: 'russia_cis', UZ: 'russia_cis', KG: 'russia_cis', TJ: 'russia_cis',
  TM: 'russia_cis', AM: 'russia_cis', AZ: 'russia_cis', GE: 'russia_cis',
  RS: 'russia_cis', BA: 'russia_cis', ME: 'russia_cis', MK: 'russia_cis',
  AL: 'russia_cis', XK: 'russia_cis',

  // Australia & New Zealand / Oceania
  AU: 'anz', NZ: 'anz', FJ: 'anz', PG: 'anz', WS: 'anz', TO: 'anz',
  VU: 'anz', SB: 'anz', NC: 'anz', PF: 'anz',

  // South Asia
  IN: 'south_asia', PK: 'south_asia', BD: 'south_asia', LK: 'south_asia',
  NP: 'south_asia', BT: 'south_asia', MV: 'south_asia', AF: 'south_asia',

  // East & Southeast Asia
  JP: 'east_asia', CN: 'east_asia', KR: 'east_asia', TW: 'east_asia',
  HK: 'east_asia', MO: 'east_asia', MN: 'east_asia', SG: 'east_asia',
  MY: 'east_asia', TH: 'east_asia', VN: 'east_asia', PH: 'east_asia',
  ID: 'east_asia', KH: 'east_asia', LA: 'east_asia', MM: 'east_asia', BN: 'east_asia',

  // Middle East & North Africa
  SA: 'mena', AE: 'mena', QA: 'mena', KW: 'mena', BH: 'mena', OM: 'mena',
  YE: 'mena', JO: 'mena', LB: 'mena', SY: 'mena', IQ: 'mena', IR: 'mena',
  IL: 'mena', PS: 'mena', TR: 'mena',
  EG: 'mena', LY: 'mena', TN: 'mena', DZ: 'mena', MA: 'mena', SD: 'mena', MR: 'mena',

  // Sub-Saharan Africa
  NG: 'ssa', GH: 'ssa', KE: 'ssa', ZA: 'ssa', TZ: 'ssa', UG: 'ssa',
  ET: 'ssa', RW: 'ssa', SN: 'ssa', CI: 'ssa', CM: 'ssa', ZW: 'ssa',
  ZM: 'ssa', BW: 'ssa', NA: 'ssa', MZ: 'ssa', AO: 'ssa', CD: 'ssa',
  CG: 'ssa', ML: 'ssa', BF: 'ssa', NE: 'ssa', TD: 'ssa', BJ: 'ssa',
  TG: 'ssa', GN: 'ssa', SL: 'ssa', LR: 'ssa', GM: 'ssa', MW: 'ssa',
  BI: 'ssa', SS: 'ssa', SO: 'ssa', ER: 'ssa', GA: 'ssa', MG: 'ssa',
  MU: 'ssa', LS: 'ssa', SZ: 'ssa',

  // Latin America & Caribbean
  BR: 'latam', MX: 'latam', AR: 'latam', CL: 'latam', CO: 'latam',
  PE: 'latam', VE: 'latam', EC: 'latam', BO: 'latam', PY: 'latam',
  UY: 'latam', CR: 'latam', PA: 'latam', GT: 'latam', HN: 'latam',
  SV: 'latam', NI: 'latam', DO: 'latam', CU: 'latam', JM: 'latam',
  TT: 'latam', BS: 'latam', BB: 'latam', HT: 'latam', GY: 'latam', SR: 'latam',
};

/** Look up a region record by its id. Falls back to the international entry. */
export function getRegionById(regionId) {
  return (
    REGION_GUIDANCE.find((r) => r.id === regionId) ||
    REGION_GUIDANCE.find((r) => r.id === DEFAULT_REGION_ID)
  );
}

/**
 * Map an ISO 3166-1 alpha-2 country code to its guidance region.
 * Returns the international fallback for unknown or missing codes.
 */
export function getRegionForCountry(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') return getRegionById(DEFAULT_REGION_ID);
  const region = COUNTRY_TO_REGION[countryCode.trim().toUpperCase()];
  return getRegionById(region || DEFAULT_REGION_ID);
}

/** Region list for the manual picker — international fallback sorted last. */
export function listRegions() {
  return [...REGION_GUIDANCE].sort((a, b) => {
    if (a.id === DEFAULT_REGION_ID) return 1;
    if (b.id === DEFAULT_REGION_ID) return -1;
    return a.name.localeCompare(b.name);
  });
}
