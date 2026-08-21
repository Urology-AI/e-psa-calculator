export const iosPrivacy = {
  title: 'ePSA iOS App — Privacy Policy',
  updated: 'August 21, 2026',
  sections: [
    {
      text: 'ePSA is an educational app about prostate cancer screening and care, from the Tewari Lab, Icahn School of Medicine at Mount Sinai / Mount Sinai Urology. It is not a diagnostic tool and does not replace medical advice from a qualified clinician. This policy covers the ePSA iOS app (bundle ID ios.epsa) specifically — the web app and Android app are separate products with their own privacy policies (see below).',
    },
    {
      title: 'Information We Collect',
      list: [
        { label: 'Screening/health profile (calculator):', text: 'Age, race/ethnicity, family history (including BRCA and hereditary cancer status), Ashkenazi Jewish status, height/weight/BMI, urinary symptom answers (IPSS), sexual health answers (SHIM, optional), lifestyle factors, comorbidity information, diet, and — if you choose to enter them — PSA value, MRI/PI-RADS result, and prostate volume. This is sent to the same calculatePsaRecommendation Google Cloud Function (via Firebase) that the ePSA web app uses, and now returns a shared-decision-making conversation guide and a guideline-recognized-factors score alongside your full ePSA score. We do not store these responses on our servers. A plain-text summary of your result and conversation guide is cached only on your device and never transmitted, though it is appended to the on-device context used by the "Ask" chat feature below.' },
        { label: 'Chat questions ("Ask" tab):', text: "Chat runs entirely on-device using Apple's Foundation Models (on supported iOS versions). Your questions and the AI's responses never leave your device — there is no cloud AI fallback in this app. If on-device intelligence isn't available, the app reports that chat is unavailable rather than sending your question anywhere." },
        { label: 'Anonymous identifier:', text: 'On each app launch, the app creates or reuses an anonymous Firebase account (a random ID, no name/email/phone) so it can call the calculator backend without requiring sign-up.' },
        { label: 'Locally stored, never transmitted:', text: 'Your journey stage, language and appearance preferences, notification setting, saved questions, usage counters, and your full chat history are stored only on your device (UserDefaults and on-device SwiftData storage) and never sent to us or anyone else.' },
        { label: 'Configuration download:', text: 'On launch, the app downloads a public configuration file (calculator thresholds/copy) from epsa-30d0b.web.app/calculatorConfig.json. No user data is sent with this request.' },
      ],
    },
    {
      title: "What We Don't Collect",
      text: 'We do not collect your name, email address, phone number, government ID, precise location, contacts, photos, or advertising identifiers. We do not show ads. We do not use any third-party analytics or crash-reporting SDK.',
    },
    {
      title: 'Data Sharing',
      text: 'We do not sell your data. Your screening/health profile is sent only to our own backend (Google Cloud Functions via Firebase) to compute your result. Chat never leaves your device. We do not share data with any other third party.',
    },
    {
      title: 'Data Retention & Deletion',
      text: "Because screening responses aren't stored server-side, there's no per-response data for us to delete. To erase your on-device chat history, saved questions, and preferences, delete the app or clear its data in iOS Settings. For any deletion or privacy request, contact us below.",
    },
    {
      title: "Children's Privacy",
      text: 'This app is not directed at children and is not intended for anyone under 18.',
    },
    {
      title: 'Security',
      text: 'All network calls use HTTPS/TLS encryption (Firebase Functions and the configuration download).',
    },
    {
      title: 'Changes to This Policy',
      text: 'We may update this policy; the "last updated" date above reflects the most recent revision. Material changes will be reflected in the app\'s release notes.',
    },
    {
      title: 'Contact',
      text: 'Tewari Lab, Icahn School of Medicine at Mount Sinai. Email: aditya.dixit@mssm.edu.',
    },
    {
      title: 'Related ePSA Apps',
      list: [
        { label: 'ePSA Web App —', text: 'see /legal/web/privacy' },
        { label: 'ePSA Android App —', text: 'see /legal/android/privacy' },
      ],
    },
    {
      note: "This Privacy Policy is a working draft prepared for review by Mount Sinai's Office of General Counsel. It describes the app's current data handling in good faith but has not yet been reviewed or approved. Do not rely on this document as a final legal notice. The institutional Mount Sinai Privacy Policy at mountsinai.org/privacy continues to apply in parallel.",
      noteLabel: 'Draft for Mount Sinai counsel review:',
      noteType: 'info',
    },
  ],
};

export const iosTerms = {
  title: 'ePSA iOS App — Terms of Service',
  updated: 'July 23, 2026',
  sections: [
    {
      text: 'These terms govern your use of the ePSA iOS app (bundle ID ios.epsa), published by the Tewari Lab, Icahn School of Medicine at Mount Sinai.',
    },
    {
      title: 'Not Medical Advice',
      text: 'ePSA is an educational tool that estimates prostate cancer screening relevance and provides care-journey guidance based on information you provide. It is not a diagnostic tool, does not provide medical advice, and is not a substitute for consultation with a qualified healthcare provider. Always talk to your doctor about your individual risk, screening schedule, and treatment decisions.',
    },
    {
      title: 'Who This App Is For',
      text: 'This app is intended for adults (18+) seeking general educational information about prostate cancer screening and care. It is not intended for use by children.',
    },
    {
      title: 'Accuracy of Results',
      text: 'Screening results are estimates generated from published guidelines (AUA/SUO) and Mount Sinai program data, combined with the information you enter. They can be affected by incomplete or inaccurate input and do not account for every individual clinical factor. Do not use ePSA results to delay or avoid seeing a doctor.',
    },
    {
      title: 'AI Chat ("Ask" tab)',
      text: "Responses in the Ask tab are generated entirely on-device by Apple's Foundation Models and may be incomplete, out of date, or incorrect. Do not rely on AI chat responses as medical advice. Chat responses and history are stored only on your device.",
    },
    {
      title: 'No Warranty',
      text: 'The app is provided "as is" without warranties of any kind, express or implied, including fitness for a particular purpose or non-infringement. The Tewari Lab and Icahn School of Medicine at Mount Sinai do not guarantee the app will be uninterrupted, error-free, or available at all times.',
    },
    {
      title: 'Limitation of Liability',
      text: 'To the fullest extent permitted by law, the Tewari Lab and Icahn School of Medicine at Mount Sinai are not liable for any indirect, incidental, or consequential damages arising from your use of, or inability to use, the app.',
    },
    {
      title: 'Third-Party Services',
      text: "The app relies on Google Firebase (Cloud Functions, Anonymous Auth) and Apple's on-device Foundation Models to function. Your use of the app is also subject to Google's and Apple's applicable terms for those services. Links within the app take you to external sites governed by their own terms.",
    },
    {
      title: 'Changes to These Terms',
      text: 'We may update these terms from time to time; the "last updated" date above reflects the most recent revision. Continued use of the app after changes constitutes acceptance of the updated terms.',
    },
    {
      title: 'Contact',
      text: 'Tewari Lab, Icahn School of Medicine at Mount Sinai. Email: aditya.dixit@mssm.edu.',
    },
    {
      title: 'Related ePSA Apps',
      list: [
        { label: 'ePSA Web App —', text: 'see /legal/web/terms' },
        { label: 'ePSA Android App —', text: 'see /legal/android/terms' },
      ],
    },
  ],
};
