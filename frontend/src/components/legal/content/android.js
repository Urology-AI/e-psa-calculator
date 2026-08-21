export const androidPrivacy = {
  title: 'ePSA Android App — Privacy Policy',
  updated: 'August 21, 2026',
  sections: [
    {
      text: 'ePSA is an educational app about prostate cancer screening from the Tewari Lab, Icahn School of Medicine at Mount Sinai. It is not a diagnostic tool and does not replace medical advice from a qualified clinician. This policy covers the ePSA Android app (com.epsa) specifically — the web app and iOS app are separate products with their own privacy policies (see below).',
    },
    {
      title: 'Information We Collect',
      list: [
        { label: 'Screening responses (Screening tab):', text: 'Age, race/ethnicity, family history (including BRCA and hereditary cancer status), height/weight, urinary symptom answers (IPSS), sexual health answers (SHIM, optional), lifestyle factors, comorbidity information, and — if you choose to enter them — PSA value, MRI/PI-RADS result, and prostate volume. These are sent to our backend (a Google Cloud Function, via Firebase) to compute your personalized result. We do not store these responses on our servers — the calculation is stateless.' },
        { label: 'Chat questions (Ask tab):', text: "Chat runs on-device using Gemini Nano (Google AICore), where available on your phone — your question and the AI's response never leave your device. There is no cloud AI fallback in this app. If on-device intelligence isn't available on your phone, your question is answered from a small offline knowledge base stored on your device only, with no network request made." },
        { label: 'Anonymous identifier:', text: 'On first launch, the app creates an anonymous Firebase account (a random ID, no name/email/phone) so it can call our backend without requiring sign-up.' },
        { label: 'Locally stored, never transmitted:', text: 'Your selected journey stage (e.g. "just screened", "awaiting PSA") and language preference are stored only on your device (Android SharedPreferences) and never sent anywhere.' },
      ],
    },
    {
      title: "What We Don't Collect",
      text: 'We do not collect your name, email address, phone number, government ID, precise location, contacts, photos, or advertising identifiers. We do not show ads.',
    },
    {
      title: 'Data Sharing',
      text: "We do not sell your data. Screening responses pass through Google Cloud infrastructure (Firebase Functions) solely to generate your result. Chat questions never leave your device. We do not share data with any other third party.",
    },
    {
      title: 'Data Retention & Deletion',
      text: "Because screening responses aren't stored server-side, there's no per-response data for us to delete. To reset your local anonymous identifier and preferences, uninstall the app or clear its storage in Android Settings. For any deletion or privacy request, contact us below.",
    },
    {
      title: "Children's Privacy",
      text: 'This app is not directed at children and is not intended for anyone under 18.',
    },
    {
      title: 'Security',
      text: "All network calls use HTTPS/TLS encryption (Firebase Functions). On-device and offline chat responses involve no network call at all.",
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
        { label: 'ePSA iOS App —', text: 'see /legal/ios/privacy' },
      ],
    },
    {
      note: "This Privacy Policy is a working draft prepared for review by Mount Sinai's Office of General Counsel. It describes the app's current data handling in good faith but has not yet been reviewed or approved. Do not rely on this document as a final legal notice. The institutional Mount Sinai Privacy Policy at mountsinai.org/privacy continues to apply in parallel.",
      noteLabel: 'Draft for Mount Sinai counsel review:',
      noteType: 'info',
    },
  ],
};

export const androidTerms = {
  title: 'ePSA Android App — Terms of Service',
  updated: 'August 21, 2026',
  sections: [
    {
      text: 'These terms govern your use of the ePSA Android app (com.epsa), published by the Tewari Lab, Icahn School of Medicine at Mount Sinai.',
    },
    {
      title: 'Not Medical Advice',
      text: 'ePSA is an educational tool that estimates prostate cancer screening relevance based on information you provide. It is not a diagnostic tool, does not provide medical advice, and is not a substitute for consultation with a qualified healthcare provider. Always talk to your doctor about your individual risk, screening schedule, and treatment decisions.',
    },
    {
      title: 'Who This App Is For',
      text: 'This app is intended for adults (18+) seeking general educational information about prostate cancer screening. It is not intended for use by children.',
    },
    {
      title: 'Accuracy of Results',
      text: 'Screening results are estimates generated from published guidelines (AUA/SUO) and the information you enter. They can be affected by incomplete or inaccurate input and do not account for every individual clinical factor. Do not use ePSA results to delay or avoid seeing a doctor.',
    },
    {
      title: 'AI Chat ("Ask" tab)',
      text: "Responses in the Ask tab are generated on-device (Gemini Nano via Google AICore, where available) or from an offline knowledge base — never by a cloud AI service — and may be incomplete, out of date, or incorrect. Do not rely on AI chat responses as medical advice.",
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
      text: "The app relies on Google Firebase (Cloud Functions, Authentication) and, where available on your device, Google AICore's on-device Gemini Nano model to function. Your use of the app is also subject to Google's applicable terms for those services.",
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
        { label: 'ePSA iOS App —', text: 'see /legal/ios/terms' },
      ],
    },
  ],
};
