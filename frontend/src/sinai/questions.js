/**
 * Question definitions for the Sinai landing-page build.
 *
 * Every field here is required by @epsa/engine's validateInputs — this is the
 * minimum set that produces a score, not a trimmed-down subset. IPSS (7 items)
 * and SHIM (5 items) are validated as ordinal arrays of 0-5.
 */

export const IPSS_QUESTIONS = [
  'Over the past month, how often have you had a sensation of not emptying your bladder completely after you finished urinating?',
  'Over the past month, how often have you had to urinate again less than two hours after you finished urinating?',
  'Over the past month, how often have you found you stopped and started again several times when you urinated?',
  'Over the past month, how often have you found it difficult to postpone urination?',
  'Over the past month, how often have you had a weak urinary stream?',
  'Over the past month, how often have you had to push or strain to begin urination?',
  'Over the past month, how many times did you most typically get up to urinate from going to bed until the time you got up in the morning?',
];

export const IPSS_SCALE = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Less than 1 in 5 times' },
  { value: 2, label: 'Less than half the time' },
  { value: 3, label: 'About half the time' },
  { value: 4, label: 'More than half the time' },
  { value: 5, label: 'Almost always' },
];

// Q7 counts episodes rather than frequency, so it gets its own labels.
export const IPSS_NOCTURIA_SCALE = [
  { value: 0, label: 'None' },
  { value: 1, label: '1 time' },
  { value: 2, label: '2 times' },
  { value: 3, label: '3 times' },
  { value: 4, label: '4 times' },
  { value: 5, label: '5 or more' },
];

export const SHIM_QUESTIONS = [
  'Over the past 6 months, how do you rate your confidence that you could get and keep an erection?',
  'When you had erections with sexual stimulation, how often were your erections hard enough for penetration?',
  'During sexual intercourse, how often were you able to maintain your erection after you had penetrated your partner?',
  'During sexual intercourse, how difficult was it to maintain your erection to completion of intercourse?',
  'When you attempted sexual intercourse, how often was it satisfactory for you?',
];

export const SHIM_SCALE = [
  { value: 0, label: 'Did not attempt' },
  { value: 1, label: 'Very low / almost never' },
  { value: 2, label: 'Low / a few times' },
  { value: 3, label: 'Moderate / sometimes' },
  { value: 4, label: 'High / most times' },
  { value: 5, label: 'Very high / almost always' },
];

// Values must match part1.encodings.raceBlackValues in the engine config for
// the raceBlack term to fire.
export const RACE_OPTIONS = [
  { value: 'black', label: 'Black or African American' },
  { value: 'white', label: 'White' },
  { value: 'hispanic', label: 'Hispanic or Latino' },
  { value: 'asian', label: 'Asian' },
  { value: 'other', label: 'Other' },
];

export const EXERCISE_OPTIONS = [
  { value: 0, label: 'Regularly' },
  { value: 1, label: 'Sometimes' },
  { value: 2, label: 'Rarely or never' },
];

export const COMORBIDITIES = [
  { id: 'hypertension', label: 'High blood pressure' },
  { id: 'hyperlipidemia', label: 'High cholesterol' },
  { id: 'coronaryArteryDisease', label: 'Coronary artery disease' },
  { id: 'diabetes', label: 'Diabetes' },
];
