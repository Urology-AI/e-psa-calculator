import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { auth, db, functions, isFirebaseConfigured } from './config/firebase';
import { httpsCallable } from 'firebase/functions';
import './App.css';
import './components/shared/ResultsViewMode.css';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import WelcomeScreen2 from './components/WelcomeScreen2.jsx';
import DataImportScreen from './components/DataImportScreen.jsx';
import UniversalAuth from './components/UniversalAuth.jsx';
import ConsentScreen from './components/ConsentScreen.jsx';
import PSAOverviewScreen from './components/PSAOverviewScreen.jsx';
import { BookIcon, ShieldCheckIcon, UsersIcon, CloudIcon, HardDriveIcon, UploadIcon, FileTextIcon, ChevronDownIcon, ExternalLinkIcon, CheckIcon, ZapIcon, InfoIcon } from 'lucide-react';
import CreditsModal from './components/CreditsModal.jsx';
import AboutEpsaModal from './components/AboutEpsaModal.jsx';
import { DoctorModeProvider } from './context/DoctorModeContext.jsx';
import DoctorModeToggle from './components/DoctorModeToggle.jsx';
import SaveToCloudConsentModal from './components/SaveToCloudConsentModal.jsx';
import LegalHub from './components/legal/LegalHub.jsx';
import LegalDocPage from './components/legal/LegalDocPage.jsx';
import { webPrivacy, webTerms } from './components/legal/content/web.js';
import { iosPrivacy, iosTerms } from './components/legal/content/ios.js';
import { androidPrivacy, androidTerms } from './components/legal/content/android.js';

const LEGAL_DOCS = {
  '/legal/web/privacy': webPrivacy,
  '/legal/web/terms': webTerms,
  '/legal/ios/privacy': iosPrivacy,
  '/legal/ios/terms': iosTerms,
  '/legal/android/privacy': androidPrivacy,
  '/legal/android/terms': androidTerms,
};

// Simple path-based rendering for /legal/** — this app has no client router,
// and legal pages need to work as plain URLs independent of the auth flow.
function LegalRoute({ pathname }) {
  const doc = LEGAL_DOCS[pathname];
  if (doc) {
    return (
      <LegalDocPage
        title={doc.title}
        updated={doc.updated}
        sections={doc.sections}
        backHref="/legal"
        backLabel="Back to Legal"
      />
    );
  }
  return <LegalHub />;
}
// Lazy-loaded modals/overlays — only shown on demand
const ModelDocs = React.lazy(() => import('./components/ModelDocs.jsx'));
import { useTranslation } from 'react-i18next';
// StepNavigation, StepForm, FormField - not used in new Part 1 flow, kept for Stage 2 (post)
import Part1Form from './components/Part1Form.jsx';
import Part1Results from './components/Part1Results.jsx';
// Lazy-loaded — only shown after Part 1 is complete
const Part2Form = React.lazy(() => import('./components/Part2Form.jsx'));
const Part2BiomarkersForm = React.lazy(() => import('./components/Part2BiomarkersForm.jsx'));
const Part2Results = React.lazy(() => import('./components/Part2Results.jsx'));
const Part3Form = React.lazy(() => import('./components/Part3Form.jsx'));
const Part3Results = React.lazy(() => import('./components/Part3Results.jsx'));
import QuickEntry from './components/QuickEntry.jsx';
import ResultsLoading, { LOADING_SEEN_KEY_P1, LOADING_SEEN_KEY_P2, PART2_LOADING_STEPS } from './components/ResultsLoading.jsx';
import PathwaySelector from './components/PathwaySelector.jsx';
import FirebaseTestPanel from './components/FirebaseTestPanel.jsx';
import BackButton from './components/BackButton.jsx';
import JourneyProgress from './components/JourneyProgress.jsx';
import HeaderSettingsMenu from './components/HeaderSettingsMenu.jsx';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, serverTimestamp, Timestamp, deleteField } from 'firebase/firestore';
import { getCalculatorConfig } from './utils/dynamicCalculator';
import { computeSessionResults } from './services/psaEngineService';
import { getFeatureFlags, refreshFeatureFlags } from './utils/featureFlags';
import { isTursoConfigured, pullSessionByRef } from './services/tursoService';
import { trackCalculatorUsage, trackOutcome, ANALYTICS_EVENTS } from './services/analyticsService';
import { fetchBiopsyPrediction } from './utils/biopsyApi';

const CONSENT_CACHE_KEY = 'epsa_consent_acknowledged_v1';
// Increment this string whenever the consent text changes to force re-consent for returning users.
// Format: YYYY-MM-DD of the consent text revision.
const CONSENT_VERSION = '2026-06-01';
const CONSENT_VERSION_KEY = 'epsa_consent_version';

// Safe localStorage wrappers — fail silently in private/incognito mode or when quota is full.
const safeLS = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

const POST_STEPS = [
  { id: 1, label: 'PSA', title: 'PSA Level', description: 'Enter your PSA test result' },
  { id: 2, label: 'Biomarkers', title: 'Advanced Biomarkers (Optional)', description: 'Enter any advanced biomarker test results' },
  { id: 3, label: 'MRI', title: 'MRI Results (Optional)', description: 'Share your PIRADS score if available' },
  { id: 4, label: 'Risk', title: 'Risk Assessment', description: 'View your personalized risk assessment' }
];

function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userName, setUserName] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [authStep, setAuthStep] = useState('welcome'); // 'welcome', 'import', 'login', 'consent', 'psa_overview', 'app'

  const [psaOverviewFrom, setPsaOverviewFrom] = useState('consent'); // tracks where overview was opened from
  const [consentData, setConsentData] = useState(null); // Used to track consent status (saved to localStorage and Firestore)
  const [storageMode, setStorageMode] = useState('cloud'); // 'cloud' | 'local'
  const [showModelDocs, setShowModelDocs] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showAboutEpsa, setShowAboutEpsa] = useState(false);
  const [showSaveToCloudConsent, setShowSaveToCloudConsent] = useState(false);
  const [stage, setStage] = useState('pre'); // 'pre' or 'post'
  const [pathwayMode, setPathwayMode] = useState(null); // null | 'pre_psa' | 'post_psa' | 'post_mri'
  const [currentStep, setCurrentStep] = useState(1);
  const [appSessionId, setAppSessionId] = useState(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const [importError, setImportError] = useState(null);
  // Holds import data + type while the user is shown the consent screen
  const pendingImportRef = useRef(null);
  const [saveToCloudPending, setSaveToCloudPending] = useState(false);
  const [saveToCloudError, setSaveToCloudError] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle'); // idle | saving | saved | error

  const [showPathwayDropdown, setShowPathwayDropdown] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);

  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/legal')) {
    return <LegalRoute pathname={window.location.pathname} />;
  }

  const hasCachedConsent = () => {
    try {
      const cached = localStorage.getItem(CONSENT_CACHE_KEY) === 'true';
      const cachedVersion = localStorage.getItem(CONSENT_VERSION_KEY);
      // Invalidate cache if consent text has been updated since last consent
      return cached && cachedVersion === CONSENT_VERSION;
    } catch {
      return false;
    }
  };

  const cacheConsent = () => {
    try {
      localStorage.setItem(CONSENT_CACHE_KEY, 'true');
      localStorage.setItem(CONSENT_VERSION_KEY, CONSENT_VERSION);
    } catch {
      // Ignore storage errors (private mode/quota).
    }
  };
  
  // urlEmail URL param removed — PHI must not appear in URLs
  
  // Calculator configuration — always the default; used for client-side
  // validateInputs() and the Model Documentation page's display config.
  const calculatorConfig = getCalculatorConfig();

  // Scoring always goes through computeSessionResults (the shared Cloud
  // Function), regardless of storageMode. storageMode governs whether a
  // *session gets persisted* to Firestore — the actual consent boundary — not
  // whether computing a score is allowed to touch the network.
  // calculatePsaRecommendation is stateless: takes form data, returns a
  // result, stores nothing. The anonymous auth it requires is a Cloud
  // Functions calling-convention detail, not a data-storage event.

  // Remote feature flags (published by the admin dashboard) — e.g. whether the
  // Biomarkers step is enabled in the post-PSA journey. Off by default.
  const [featureFlags, setFeatureFlags] = useState(() => getFeatureFlags());

  useEffect(() => {
    (async () => {
      const refreshed = await refreshFeatureFlags();
      if (refreshed) {
        setFeatureFlags(refreshed);
      }
    })();
  }, []);
  const biomarkersEnabled = featureFlags.biomarkersEnabled;
  
  // Disable client-side analytics writes in patient app; keep admin analytics only.
  const shouldTrackAnalytics = false;
  
  // ePSA-Pre form data (Part 1: 7-variable model inputs)
  const defaultPreData = {
    age: '',
    race: null,
    heightFt: '',
    heightIn: '',
    weight: '',
    bmi: 0,
    familyHistory: null,
    brcaStatus: null,
    heightUnit: 'imperial',
    heightCm: '',
    weightUnit: 'lbs',
    weightKg: '',
    ipss: Array(7).fill(null),
    shim: Array(5).fill(null),
    exercise: null,
    smoking: null,
    chemicalExposure: null,
    dietPattern: '',
    comorbidityScore: null,
    hypertension: null,
    hyperlipidemia: null,
    coronaryArteryDisease: null,
    diabetes: null,
  };
  const [preData, setPreData] = useState({ ...defaultPreData });
  
  const [part1Step, setPart1Step] = useState(0); // 0-4 for the 5 steps in Part 1

  // ePSA-Post form data
  const [postData, setPostData] = useState({
    psa: '',
    knowPsa: false, // Track if user knows their PSA
    onHormonalTherapy: false,
    hormonalTherapyType: '',
    knowPirads: false,
    pirads: '0'
  });

  const [preResult, setPreResult] = useState(null);
  const [postResult, setPostResult] = useState(null);
  // True while Part 3 is waiting on the biopsy-prediction API call, so a loading
  // screen can be shown instead of a blank step between the MRI form and results.
  const [isCalculatingPart3, setIsCalculatingPart3] = useState(false);
  // Shows a lightweight PSA-only interim result between Part 2 (PSA form) and
  // Part 3 (MRI form) so Part 2 isn't just a pass-through to a combined screen.
  const [showPart2Interim, setShowPart2Interim] = useState(false);
  // Brief "Calculating your risk…" transition between Part 1 submission and Part 1 Results.
  // Lets the gauge needle animate in and prevents an instant jump that feels jarring.

  // ── Inactivity session timeout (15 min) ──────────────────────────────────
  // Required for HIPAA compliance on shared/clinic devices. Resets on any user
  // interaction. Only active when a user is authenticated.
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  const inactivityTimerRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    const resetTimer = () => {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_TIMEOUT_MS);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // Start the timer immediately on login
    return () => {
      clearTimeout(inactivityTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Check auth state on mount (only when Firebase is configured)
  useEffect(() => {
    if (!auth) return () => {};
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const phone = currentUser.phoneNumber;
        const email = currentUser.email;
        setUserPhone(phone);
        setUserEmail(email);
        
        // Check if user has completed consent in Firestore
        let userData = null;
        try {
          userData = await getUser(currentUser.uid);
        } catch (error) {
          console.warn('Could not fetch user data:', error);
        }
        
        // Handle anonymous users
        if (userData?.displayName) {
          setUserName(userData.displayName);
        }

        if (userData && userData.isAnonymous && userData.sessionId) {
          setAppSessionId(userData.sessionId);
        }
        
        // If consent exists in Firestore, skip consent screen
        const consentExists = !!(userData && userData.consentToContact !== undefined);
        
        if (consentExists) {
          cacheConsent();
          try {
            let consent;
            if (userData) {
              // Reconstruct consent from Firestore data
              consent = {
                consentToContact: userData.consentToContact || false,
                consentTimestamp: userData.consentTimestamp || new Date().toISOString()
              };
            }
            
            if (consent) {
              setConsentData(consent);
            }
            
            // Restore session state from Firestore (userData already fetched above)
            try {
              if (!userData) {
                userData = await getUser(currentUser.uid);
              }
              
              if (userData && userData.currentSessionId) {
                const sessionId = userData.currentSessionId;
                setSessionId(sessionId);
                safeLS.set(`sessionId_${currentUser.uid}`, sessionId);
                
                // Load session data and restore stage/form state
                try {
                  const session = await getSession(sessionId);
                  if (session) {
                    
                    // Restore stage based on session status
                    if (session.status === 'STEP2_COMPLETE') {
                      // Both stages completed - show stage 2 results
                      setStage('post');
                      if (session.step1) {
                        setPreData(session.step1);
                        // Recalculate pre result via the shared Cloud Function
                        try {
                          const { preResult } = await computeSessionResults(session.step1);
                          setPreResult(preResult);
                        } catch (error) {
                          console.error('Error calculating preResult:', error);
                        }
                      }
                      if (session.step2) {
                        setPostData(session.step2);
                        // Recalculate post result if we have pre result
                        if (session.step1) {
                          try {
                            const { postResult } = await computeSessionResults(session.step1, session.step2);
                            setPostResult(postResult);
                          } catch (error) {
                            console.error('Error calculating postResult:', error);
                          }
                        }
                      }
                      // Set step to 3 AFTER results are calculated
                      setCurrentStep(4);
                    } else if (session.status === 'STEP1_COMPLETE') {
                      // Stage 1 completed - show stage 1 results, ready for stage 2
                      setStage('pre');
                      if (session.step1) {
                        // Calculate result FIRST before setting preData
                        try {
                          const { preResult } = await computeSessionResults(session.step1);

                          // Set result FIRST, then data, then step
                          if (preResult) {
                            // Set result immediately
                            setPreResult(preResult);
                            
                            // Then set form data
                            setPreData(session.step1);
                            
                            // Then set step after a brief delay to ensure state is set
                            setTimeout(() => {
                              setCurrentStep(3);
                            }, 150);
                          } else {
                            console.warn('Invalid preResult calculated, starting fresh');
                            setCurrentStep(1);
                            setPart1Step(0);
                          }
                        } catch (error) {
                          console.error('Error calculating preResult from session:', error);
                          setCurrentStep(1);
                          setPart1Step(0);
                        }
                      } else {
                        // No step1 data - start fresh
                        console.warn('Session has STEP1_COMPLETE but no step1 data');
                        setCurrentStep(1);
                      }
                    } else if (session.status === 'IN_PROGRESS') {
                      setStage('pre');
                      if (session.step1Partial) {
                        const defaultShape = {
                          age: '', race: null, heightFt: '', heightIn: '', weight: '', bmi: 0,
                          familyHistory: null, brcaStatus: null, heightUnit: 'imperial', heightCm: '',
                          weightUnit: 'lbs', weightKg: '', ipss: Array(7).fill(null), shim: Array(5).fill(null),
                          exercise: null, smoking: null, chemicalExposure: null, dietPattern: '',
                          comorbidityScore: null, hypertension: null, hyperlipidemia: null, coronaryArteryDisease: null, diabetes: null,
                        };
                        setPreData(prev => ({ ...defaultShape, ...prev, ...session.step1Partial }));
                        setPart1Step(session.part1Step || 0);
                      }
                      setCurrentStep(1);
                    } else {
                      // Incomplete session - start fresh
                      setStage('pre');
                      setCurrentStep(1);
                    }
                  }
                } catch (sessionError) {
                  console.warn('Could not load session data:', sessionError);
                  // Start fresh if session can't be loaded
                  setStage('pre');
                  setCurrentStep(1);
                }
              } else {
                // No session found - try localStorage as fallback
                const storedSessionId = safeLS.get(`sessionId_${currentUser.uid}`);
                if (storedSessionId) {
                  setSessionId(storedSessionId);
                  // Try to load session data
                  try {
                    const session = await getSession(storedSessionId);
                    if (session) {
                      // Restore state based on session status (same logic as above)
                      if (session.status === 'STEP2_COMPLETE') {
                        setStage('post');
                        setCurrentStep(4);
                        if (session.step1) {
                          setPreData(session.step1);
                          try {
                            const { preResult } = await computeSessionResults(session.step1);
                            setPreResult(preResult);
                          } catch (error) {
                            console.error('Error calculating preResult:', error);
                          }
                        }
                        if (session.step2) {
                          setPostData(session.step2);
                          if (session.step1) {
                            try {
                              const { postResult } = await computeSessionResults(session.step1, session.step2);
                              setPostResult(postResult);
                            } catch (error) {
                              console.error('Error calculating postResult:', error);
                            }
                          }
                        }
                      } else if (session.status === 'STEP1_COMPLETE') {
                        setStage('pre');
                        setCurrentStep(3);
                        if (session.step1) {
                          setPreData(session.step1);
                          try {
                            const { preResult } = await computeSessionResults(session.step1);
                            setPreResult(preResult);
                          } catch (error) {
                            console.error('Error calculating preResult:', error);
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.warn('Could not load session from localStorage ID:', e);
                  }
                } else {
                  // No session at all - start fresh
                  setStage('pre');
                  setCurrentStep(1);
                  setPart1Step(0);
                }
              }
            } catch (error) {
              console.warn('Could not restore session:', error);
              // Start fresh on error
              setStage('pre');
              setCurrentStep(1);
              setPart1Step(0);
            }
            
            setAuthStep('app');
          } catch (error) {
            console.error('Error parsing consent data:', error);
            setAuthStep('consent');
          }
        } else {
          // Anonymous users still go through consent before entering the app.
          if (currentUser.isAnonymous) {
            // Restore session for returning anonymous users
            try {
              if (userData && userData.currentSessionId) {
                const restoredSessionId = userData.currentSessionId;
                setSessionId(restoredSessionId);
                safeLS.set(`sessionId_${currentUser.uid}`, restoredSessionId);
                try {
                  const session = await getSession(restoredSessionId);
                  if (session) {
                    if (session.status === 'STEP2_COMPLETE') {
                      setStage('post');
                      if (session.step1) {
                        setPreData(session.step1);
                        try {
                          const { preResult, postResult } = await computeSessionResults(session.step1, session.step2);
                          setPreResult(preResult);
                          if (session.step2) {
                            setPostData(session.step2);
                            setPostResult(postResult);
                          }
                        } catch (calcErr) {
                          console.error('Error recalculating results:', calcErr);
                        }
                      }
                      setCurrentStep(4);
                    } else if (session.status === 'STEP1_COMPLETE') {
                      setStage('pre');
                      if (session.step1) {
                        try {
                          const { preResult } = await computeSessionResults(session.step1);
                          if (preResult) {
                            setPreResult(preResult);
                            setPreData(session.step1);
                            setTimeout(() => setCurrentStep(3), 150);
                          }
                        } catch (calcErr) {
                          console.error('Error recalculating preResult:', calcErr);
                        }
                      }
                    }
                  }
                } catch (sessionErr) {
                  console.warn('Could not load anonymous session:', sessionErr);
                }
              } else {
                // Try localStorage as fallback
                const storedSessionId = safeLS.get(`sessionId_${currentUser.uid}`);
                if (storedSessionId) {
                  setSessionId(storedSessionId);
                  try {
                    const session = await getSession(storedSessionId);
                    if (session) {
                      if (session.status === 'STEP2_COMPLETE') {
                        setStage('post');
                        setCurrentStep(4);
                        if (session.step1) {
                          setPreData(session.step1);
                          try {
                            const { preResult, postResult } = await computeSessionResults(session.step1, session.step2);
                            setPreResult(preResult);
                            if (session.step2) {
                              setPostData(session.step2);
                              setPostResult(postResult);
                            }
                          } catch (calcErr) { console.error('Calc error:', calcErr); }
                        }
                      } else if (session.status === 'STEP1_COMPLETE') {
                        setStage('pre');
                        setCurrentStep(3);
                        if (session.step1) {
                          setPreData(session.step1);
                          try {
                            const { preResult } = await computeSessionResults(session.step1);
                            setPreResult(preResult);
                          } catch (calcErr) { console.error('Calc error:', calcErr); }
                        }
                      }
                    }
                  } catch (e) {
                    console.warn('Could not load session from localStorage ID:', e);
                  }
                }
              }
            } catch (restoreErr) {
              console.warn('Could not restore anonymous session:', restoreErr);
            }
            setStorageMode('cloud');
            if (hasCachedConsent()) {
              setConsentData({
                consentToContact: true,
                consentBasis: 'implied_cached',
                consentTimestamp: new Date().toISOString()
              });
              setAuthStep('app');
            } else {
              setAuthStep('consent');
            }
          } else {
            if (hasCachedConsent()) {
              setConsentData({
                consentToContact: true,
                consentBasis: 'implied_cached',
                consentTimestamp: new Date().toISOString()
              });
              setAuthStep('app');
            } else {
              setAuthStep('consent');
            }
          }
        }
      } else {
        // User logged out - go back to welcome screen
        setUser(null);
        setUserPhone(null);
        setUserEmail(null);
        setUserName(null);
        setAppSessionId(null);
        setConsentData(null);
        setSessionId(null);
        setAuthStep('welcome');
      }
    });

    return () => unsubscribe();
  }, []);


  const upsertConsent = async (consent) => {
    const firebaseUser = auth?.currentUser;
    const canWriteCloud =
      storageMode === 'cloud' &&
      !!firebaseUser &&
      !!user?.uid &&
      firebaseUser.uid === user.uid;

    if (!canWriteCloud) {
      return { success: true, skipped: true };
    }
    if (!db) return { success: true };

    const consentToContact = consent?.consentToContact === true;
    const researchConsent  = consent?.researchConsent  === true;
    setCloudSyncStatus('saving');
    await setDoc(doc(db, 'users', user.uid), {
      consentToContact,
      consentTimestamp: consent?.consentTimestamp || new Date().toISOString(),
      researchConsent,
      researchTimestamp: consent?.researchTimestamp || new Date().toISOString(),
      updatedAt: serverTimestamp(),
      lastLoginAt: new Date().toISOString(),
      sessionType: 'anonymous',
    }, { merge: true });
    setCloudSyncStatus('saved');

    return { success: true };
  };

  const getUser = async (uid) => {
    if (!uid || !db) return null;
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return null;
    return { id: userSnap.id, ...userSnap.data() };
  };

  const getSession = async (id) => {
    if (!id || !db) return null;
    try {
      const snap = await getDoc(doc(db, 'sessions', id));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      console.warn('Could not load session:', error);
      return null;
    }
  };

  const saveSession = async (uid, step1Data) => {
    if (!db) return null;
    setCloudSyncStatus('saving');
    const sessionRef = doc(collection(db, 'sessions'));
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
    await setDoc(sessionRef, {
      userId: uid,
      status: 'STEP1_COMPLETE',
      step1: step1Data,
      expiresAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', uid), {
      currentSessionId: sessionRef.id,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setCloudSyncStatus('saved');
    return sessionRef.id;
  };

  const saveProgressStep = async (partialData, step) => {
    if (storageMode !== 'cloud' || !user || user.uid === 'local' || !db) return;
    setCloudSyncStatus('saving');
    try {
      if (!sessionId) {
        const sessionRef = doc(collection(db, 'sessions'));
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
        await setDoc(sessionRef, {
          userId: user.uid,
          status: 'IN_PROGRESS',
          step1Partial: partialData,
          part1Step: step,
          expiresAt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'users', user.uid), {
          currentSessionId: sessionRef.id,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        setSessionId(sessionRef.id);
        safeLS.set(`sessionId_${user.uid}`, sessionRef.id);
      } else {
        await updateDoc(doc(db, 'sessions', sessionId), {
          step1Partial: partialData,
          part1Step: step,
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
          updatedAt: serverTimestamp(),
        });
      }
      setCloudSyncStatus('saved');
    } catch (err) {
      console.error('Error saving partial progress:', err);
      setCloudSyncStatus('error');
    }
  };

  const updateSessionStep2 = async (sessionDocId, step2Data, riskCat, score, engineVersion, modelVersion) => {
    if (!db) return;
    setCloudSyncStatus('saving');
    try {
      await updateDoc(doc(db, 'sessions', sessionDocId), {
        status: 'STEP2_COMPLETE',
        step2: step2Data,
        finalCategory: riskCat,
        finalScore: score,
        engineVersion: engineVersion || '1.0.0',
        ...(modelVersion ? { modelVersion } : {}),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        updatedAt: serverTimestamp(),
      });
      setCloudSyncStatus('saved');
    } catch (err) {
      setCloudSyncStatus('error');
      throw err;
    }
  };

  const removeSession = async (uid, sessionDocId) => {
    if (!db) return;
    setCloudSyncStatus('saving');
    await deleteDoc(doc(db, 'sessions', sessionDocId));
    await updateDoc(doc(db, 'users', uid), {
      currentSessionId: deleteField(),
      updatedAt: serverTimestamp(),
    });
    setCloudSyncStatus('saved');
  };

  const handleAuthSuccess = async (user, authInfo) => {
    if (import.meta.env.DEV) console.log('[AuthFlow] handleAuthSuccess invoked', { uid: user?.uid, isAnonymous: user?.isAnonymous, authInfo });
    setUser(user);
    if (typeof authInfo === 'string') {
      setUserPhone(authInfo);
    } else {
      if (authInfo?.sessionId) setAppSessionId(authInfo.sessionId);
    }
    
    // Check if user already has consent in Firestore
    let userData = null;
    try {
      userData = await getUser(user.uid);
    } catch (error) {
      console.warn('Could not fetch user data:', error);
    }
    
    const consentExists = !!(userData && userData.consentToContact !== undefined);

    if (consentExists) {
      // Consent already recorded for this user/session.
      let consent;
      if (userData) {
        consent = {
          consentToContact: userData.consentToContact || false,
          consentTimestamp: userData.consentTimestamp || new Date().toISOString()
        };
      }
      if (consent) {
        setConsentData(consent);
      }
      cacheConsent();
      setAuthStep('app');
      if (import.meta.env.DEV) console.log('[AuthFlow] consent exists -> authStep=app', { uid: user?.uid });
    } else {
      if (hasCachedConsent()) {
        setConsentData({
          consentToContact: true,
          consentBasis: 'implied_cached',
          consentTimestamp: new Date().toISOString()
        });
        setAuthStep('app');
        if (import.meta.env.DEV) console.log('[AuthFlow] consent cached -> authStep=app', { uid: user?.uid });
      } else {
        // No consent found - show consent screen
        setAuthStep('consent');
        if (import.meta.env.DEV) console.log('[AuthFlow] consent missing -> authStep=consent', { uid: user?.uid });
      }
    }
  };

  const handleConsentComplete = async (consent) => {
    setConsentData(consent);
    cacheConsent();

    // If consent was triggered by a pending import (bus flow or file import), resume that flow
    if (pendingImportRef.current) {
      const pending = pendingImportRef.current;
      pendingImportRef.current = null;

      if (pending.source === 'file_import') {
        setStage(pending.targetStage);
        if (pending.hasPart1Result) {
          if (pending.targetStage === 'pre') { setCurrentStep(3); setPart1Step(4); }
          else { setCurrentStep(4); }
        } else {
          setCurrentStep(1); setPart1Step(0);
        }
        setAuthStep('app');
        return;
      }
    }

    // Normal consent flow — enter Part 1 form
    setStage('pre');
    setPathwayMode(null);
    setCurrentStep(1);
    setPart1Step(0);
    
    // Save consent to Firestore for any authenticated mode (phone, email, or anonymous)
    if (user) {
      try {
        await upsertConsent(consent);
        setPsaOverviewFrom('consent');
        setAuthStep('psa_overview');
      } catch (error) {
        console.error('Error saving consent:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        // Check if it's a permission error
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
          console.warn('Permission denied - Firestore rules may not be deployed.');
          setCloudSyncStatus('error');
        }

        // Still proceed to app even if Firestore fails
        setPsaOverviewFrom('consent');
        setAuthStep('psa_overview');
      }
    } else {
      setPsaOverviewFrom('consent');
      setAuthStep('psa_overview');
    }
  };

  const handleSessionUnlink = async () => {
    // Sign out of Firebase so the onAuthStateChanged listener doesn't restore state
    try {
      if (auth) await signOut(auth);
    } catch (error) {
      console.error('Error signing out during session unlink:', error);
    }
    // Clear consent cache so user must re-consent on next visit
    safeLS.remove(CONSENT_CACHE_KEY);
    // Clear all session data and return to welcome
    setUser(null);
    setUserPhone(null);
    setUserEmail(null);
    setUserName(null);
      setAppSessionId(null);
    setConsentData(null);
    setSessionId(null);
    setAuthStep('welcome');
    
    // Clear form data
    setPreData({
      age: '',
      race: null,
      heightFt: '',
      heightIn: '',
      weight: '',
      bmi: 0,
      familyHistory: null,
      brcaStatus: null,
      heightUnit: 'imperial',
      heightCm: '',
      weightUnit: 'lbs',
      weightKg: '',
      ipss: Array(7).fill(null),
      shim: Array(5).fill(null),
      exercise: null,
      smoking: null,
      chemicalExposure: null,
      dietPattern: '',
      comorbidityScore: null,
      hypertension: null,
      hyperlipidemia: null,
      coronaryArteryDisease: null,
      diabetes: null,
    });
    setPostData({
      psa: '',
      knowPsa: false,
      onHormonalTherapy: false,
      hormonalTherapyType: '',
      knowPirads: false,
      pirads: '0'
    });
    setPreResult(null);
    setPostResult(null);
    setCloudSyncStatus('idle');
    setStage('pre');
    setPathwayMode(null);
    setCurrentStep(1);
    setPart1Step(0);

    console.log('Session unlinked, returned to welcome screen');
  };

  const createNewAnonymousSession = async () => {
    if (!auth || !db) throw new Error('Cloud storage is not available. Use Local Storage instead.');
    // Generate new human-readable session ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newSessionId = '';
    for (let i = 0; i < 8; i++) {
      newSessionId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const authResult = await signInAnonymously(auth);
      const firebaseUser = authResult.user;
      await firebaseUser.getIdToken();

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        sessionId: newSessionId,
        authMethod: 'anonymous',
        isAnonymous: true,
        email: null,
        phone: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
      setCloudSyncStatus('saved');

      setAppSessionId(newSessionId);
      setUser(firebaseUser);
      return newSessionId;
    } catch (err) {
      console.error('anonymous sign-in failed', err);
      setCloudSyncStatus('error');
      if (err.code === 'auth/admin-restricted-operation') {
        throw new Error('Anonymous sign-in is restricted; enable the provider in Firebase console.');
      }
      throw err;
    }
  };

  const promptUserForAuthChoice = async () => {
    if (auth) {
      await createNewAnonymousSession();
    } else {
      setStorageMode('local');
      setUser({ uid: 'local', isAnonymous: true });
      setAppSessionId('Local');
      setAuthStep('consent');
    }
  };

  const handleSaveLocalToCloud = async () => {
    if (!isFirebaseConfigured() || !auth || !functions || !preData || !preResult) {
      setSaveToCloudError("Cloud save is not available right now. Your results are still saved on this device — you can keep working and try again later.");
      return;
    }
    setSaveToCloudPending(true);
    setSaveToCloudError(null);
    try {
      let firebaseUser = auth.currentUser;
      if (!firebaseUser || firebaseUser.uid === 'local') {
        await createNewAnonymousSession();
        firebaseUser = auth.currentUser;
      }
      if (!firebaseUser) {
        throw new Error('Could not create session.');
      }
      const newSessionId = await saveSession(firebaseUser.uid, preData);
      if (newSessionId) {
        setSessionId(newSessionId);
        safeLS.set(`sessionId_${firebaseUser.uid}`, newSessionId);
      }
      if (postData && postResult && newSessionId) {
        await updateSessionStep2(newSessionId, postData, postResult.riskCat || postResult.riskClass || 'unknown', postResult.totalPoints ?? 0, postResult.engineVersion, postResult.modelVersion);
      }
      setStorageMode('cloud');
    } catch (err) {
      console.error('Save to cloud error:', err);
      // Translate Firebase errors into a calm, user-friendly message.
      // The internal err.message is kept in the console for debugging.
      const networkLike = /network|offline|unavailable|timeout|fetch/i.test(err?.message || '');
      const friendly = networkLike
        ? "We couldn't reach the cloud — looks like a network issue. Your results are still saved on this device. Try again in a moment."
        : "We couldn't save to the cloud. Your results are still saved on this device — you can keep working and try again later.";
      setSaveToCloudError(friendly);
    } finally {
      setSaveToCloudPending(false);
    }
  };

  const handleImportSuccess = async (importedData, importType) => {
    console.log('Import successful:', importType, importedData);
    setImportedData(importedData);

    if (importType === 'clinical') {
      // Clinical screening ref (EP-YYYYMMDD-XXXX): pull the session from Turso,
      // then re-enter as a JSON import so it stays local until "Move to cloud".
      try {
        if (!isTursoConfigured()) {
          throw new Error('Cloud sync is not configured on this deployment. Use Import for a JSON file instead.');
        }
        const sessionRef = (importedData?.sessionRef || '').toUpperCase().trim();
        const record = await pullSessionByRef(sessionRef);
        const formData = record?.formData ?? record?.step1;
        if (!formData) {
          throw new Error('No screening session found for that reference. Check the code on your results card.');
        }
        const asJson = record.step2
          ? { version: record.version ?? 'epsa-session-v1', part: 'complete', part1Data: formData, part2Data: record.step2 }
          : { version: record.version ?? 'epsa-session-v1', part: 'part1', formData };
        return handleImportSuccess(asJson, 'json');
      } catch (error) {
        console.error('Clinical session import error:', error);
        setImportError(error?.message || 'Failed to load the screening session.');
        return;
      }
    }

    if (importType === 'session') {
      // Session ID restore requires Firebase
      if (!auth || !functions) {
        setImportError('Session ID restore is only available with cloud storage. Use Import for a JSON file instead.');
        return;
      }
      // Handle session ID login through backend-assisted restoration.
      const requestedSessionId = (importedData?.sessionId || '').toUpperCase().trim();
      
      try {
        if (!/^[A-Z0-9]{8}$/.test(requestedSessionId)) {
          throw new Error('Please enter a valid 8-character Session ID.');
        }

        // Ensure there is an authenticated Firebase user before callable.
        let firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          const authResult = await signInAnonymously(auth);
          firebaseUser = authResult.user;
        }

        if (!functions) {
          throw new Error('Firebase Functions is not initialized.');
        }

        const restoreAnonymousSessionFn = httpsCallable(functions, 'loginAnonymousBySessionId');
        const restoreResult = await restoreAnonymousSessionFn({ sessionId: requestedSessionId });
        const restored = restoreResult?.data || {};

        setUser(firebaseUser);
        setAppSessionId(requestedSessionId);

        if (restored.currentSessionId) {
          setSessionId(restored.currentSessionId);
          safeLS.set(`sessionId_${firebaseUser.uid}`, restored.currentSessionId);

          // Load session JSON from Firebase so user continues where they left off
          try {
            const sessionData = await getSession(restored.currentSessionId);
            if (sessionData?.step1) {
              const defaultShape = {
                age: '', race: null, heightFt: '', heightIn: '', weight: '', bmi: 0,
                familyHistory: null, brcaStatus: null, heightUnit: 'imperial', heightCm: '',
                weightUnit: 'lbs', weightKg: '', ipss: Array(7).fill(null), shim: Array(5).fill(null),
                exercise: null, smoking: null, chemicalExposure: null, dietPattern: '',
                comorbidityScore: null, hypertension: null, hyperlipidemia: null, coronaryArteryDisease: null, diabetes: null,
              };
              const step1 = { ...defaultShape, ...sessionData.step1 };
              if (!Array.isArray(step1.ipss) || step1.ipss.length !== 7) {
                const src = Array.isArray(step1.ipss) ? step1.ipss : [];
                step1.ipss = [...Array(7)].map((_, i) => (src[i] != null && src[i] !== '') ? src[i] : null);
              }
              if (!Array.isArray(step1.shim) || step1.shim.length !== 5) {
                const src = Array.isArray(step1.shim) ? step1.shim : [];
                step1.shim = [...Array(5)].map((_, i) => (src[i] != null && src[i] !== '') ? src[i] : null);
              }
              setPreData(step1);
              const { preResult: recalcPre, postResult: recalcPost } = await computeSessionResults(step1, sessionData.step2);
              if (recalcPre) setPreResult(recalcPre);
              if (sessionData.step2) {
                setPostData(sessionData.step2);
                if (recalcPre && recalcPost) setPostResult(recalcPost);
                setStage('post');
                setCurrentStep(4);
              } else {
                setStage('pre');
                setCurrentStep(3);
              }
              setStorageMode('cloud');
            }
          } catch (loadErr) {
            console.warn('Could not load session data:', loadErr);
          }
        }

        const consentExists = restored.consentToContact !== undefined && restored.consentToContact !== null;
        const impliedConsent = {
          consentToContact: true,
          consentBasis: 'implied_by_import',
          consentTimestamp: new Date().toISOString()
        };
        if (consentExists) {
          const consent = {
            consentToContact: restored.consentToContact || false,
            consentTimestamp: restored.consentTimestamp || new Date().toISOString()
          };
          setConsentData(consent);
        } else {
          setConsentData(impliedConsent);
        }
        cacheConsent();
        setAuthStep('app');
      } catch (error) {
        console.error('Session login error:', {
          code: error?.code,
          message: error?.message,
          details: error?.details,
          stack: error?.stack
        });
        setImportError(`Failed to load session: ${error?.details || error?.message || 'Unknown error'}`);
        return;
      }
      return;
    }
    
    // Handle file import (JSON or PDF)
    // HIPAA: We do not link file imports to any existing cloud session (no lookup by sessionId in the file).
    // Imported data is loaded locally only; user may later choose "Move to cloud" to create a new session.
    let dataToImport, targetStage = 'pre';
    
    // Handle new export format (part1: formData; complete: part1Data + part2Data)
    if (importedData.version && (importedData.formData || importedData.part1Data)) {
      if (importedData.part === 'part1' && importedData.formData) {
        dataToImport = importedData.formData;
        targetStage = 'pre';
      } else if (importedData.part === 'complete' && importedData.part1Data) {
        dataToImport = importedData.part1Data;
        setPostData(importedData.part2Data || {});
        targetStage = 'post';
      } else if (importedData.formData) {
        dataToImport = importedData.formData;
        targetStage = 'pre';
      } else {
        dataToImport = importedData.part1Data || importedData;
        if (importedData.part2Data) setPostData(importedData.part2Data || {});
        if (importedData.part === 'complete') targetStage = 'post';
      }
    } else {
      dataToImport = importedData;
      targetStage = 'pre';
    }
    
    // When Firebase is not available, use local storage and mock user for file import
    if (!auth) {
      setUser({ uid: 'local', isAnonymous: true });
      setStorageMode('local');
      setAppSessionId('Local');
    }

    // JSON file import: keep data local so user can review then "Move to cloud" if they want.
    // Do not create a cloud session here; that happens when they click "Move to cloud" on results.

    // Normalize imported data to form shape (merge with defaults so missing fields are empty; ensure ipss/shim are arrays)
    const defaultShape = {
      age: '', race: null, heightFt: '', heightIn: '', weight: '', bmi: 0,
      familyHistory: null, brcaStatus: null, heightUnit: 'imperial', heightCm: '',
      weightUnit: 'lbs', weightKg: '', ipss: Array(7).fill(null), shim: Array(5).fill(null),
      exercise: null, smoking: null, chemicalExposure: null, dietPattern: '',
      comorbidityScore: null, hypertension: null, hyperlipidemia: null, coronaryArteryDisease: null, diabetes: null,
    };
    const normalizedImport = { ...defaultShape, ...dataToImport };
    if (!Array.isArray(normalizedImport.ipss) || normalizedImport.ipss.length !== 7) {
      const src = Array.isArray(normalizedImport.ipss) ? normalizedImport.ipss : [];
      normalizedImport.ipss = [...Array(7)].map((_, i) => (src[i] != null && src[i] !== '') ? src[i] : null);
    }
    if (!Array.isArray(normalizedImport.shim) || normalizedImport.shim.length !== 5) {
      const src = Array.isArray(normalizedImport.shim) ? normalizedImport.shim : [];
      normalizedImport.shim = [...Array(5)].map((_, i) => (src[i] != null && src[i] !== '') ? src[i] : null);
    }
    
    // Set the imported data to appropriate state
    setPreData(prevData => ({
      ...prevData,
      ...normalizedImport
    }));
    
    // Calculate Part1 results; if validation fails (missing/invalid fields), go to form so user can fill gaps.
    // Always via the shared Cloud Function — computing a score doesn't store
    // anything, so this doesn't need to wait for/depend on the storage-mode
    // decision below (which governs whether a *session gets persisted*).
    const hasPart2Import = targetStage === 'post' && importedData.part2Data && Object.keys(importedData.part2Data).length > 0;
    let part1Result = null;
    let part2Result = null;
    try {
      ({ preResult: part1Result, postResult: part2Result } = await computeSessionResults(
        normalizedImport,
        hasPart2Import ? importedData.part2Data : undefined
      ));
    } catch (error) {
      console.error('Import calculation error:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
      });
      const issues = error?.details?.issues;
      const issuesSummary = Array.isArray(issues) && issues.length > 0
        ? issues.map(issue => `${issue.path}: ${issue.message}`).join('; ')
        : null;
      setImportError(issuesSummary || error?.message || 'Imported data failed validation. Please review and complete the form.');
      setCurrentStep(1);
      setPart1Step(0);
      setStage('pre');
      return;
    }
    setPreResult(part1Result || null);

    // Calculate Part2 results if this is complete import and post data exists
    if (hasPart2Import && part1Result) {
      setPostResult(part2Result);
    }
    
    // Set storage mode based on import type or user preference
    if (importType === 'pdf') {
      setStorageMode('local'); // PDF import defaults to local storage
    } else {
      // For JSON, default to local so user can then "Move to cloud" from results
      setStorageMode(importedData.storageMode || 'local');
    }

    // File import: ensure we're in local mode so "Move to cloud" is available on results
    if (importType !== 'session') {
      setUser({ uid: 'local', isAnonymous: true });
      setAppSessionId('Local');
    }
    
    // HIPAA: route to consent screen before entering app with imported PHI.
    // pendingImportRef holds the processed state so handleConsentComplete can apply it.
    pendingImportRef.current = {
      source: 'file_import',
      targetStage,
      hasPart1Result: !!part1Result,
    };
    setAuthStep('consent');
    return; // don't navigate to app yet
    setStage(targetStage);
    if (part1Result) {
      if (targetStage === 'pre') {
        setCurrentStep(3); // Part1 results
        setPart1Step(4);
      } else {
        setCurrentStep(3); // Part2 results
      }
    } else {
      // Missing or invalid data: open Part 1 form so user can complete
      setCurrentStep(1);
      setPart1Step(0);
      setStage('pre');
    }
  };

  const handleClearData = async () => {
    // Delete current session via backend and clear user's session reference
    if (storageMode === 'cloud' && user && sessionId) {
      try {
        await removeSession(user.uid, sessionId);
      } catch (error) {
        console.error('Error deleting session:', error);
        // Continue clearing local data even if delete fails
      }
    }
    
    // Clear all form data and results
    setStage('pre');
    setPathwayMode(null);
    setCurrentStep(1);
    setPart1Step(0);
    setPreData({
      age: '',
      race: null,
      heightFt: '',
      heightIn: '',
      weight: '',
      bmi: 0,
      familyHistory: null,
      brcaStatus: null,
      heightUnit: 'imperial',
      heightCm: '',
      weightUnit: 'lbs',
      weightKg: '',
      ipss: Array(7).fill(null),
      shim: Array(5).fill(null),
      exercise: null,
      smoking: null,
      chemicalExposure: null,
      dietPattern: '',
      comorbidityScore: null,
      hypertension: null,
      hyperlipidemia: null,
      coronaryArteryDisease: null,
      diabetes: null,
    });
    setPostData({
      psa: '',
      knowPsa: false,
      onHormonalTherapy: false,
      hormonalTherapyType: '',
      knowPirads: false,
      pirads: '0'
    });
    setPreResult(null);
    setPostResult(null);

    // Clear session ID from state but keep user logged in
    setSessionId(null);
    
    // Clear session ID from localStorage
    if (user) {
      safeLS.remove(`sessionId_${user.uid}`);
    }

    // Reset loading animations so they play again on next run
    safeLS.remove(LOADING_SEEN_KEY_P1);
    safeLS.remove(LOADING_SEEN_KEY_P2);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
    // Clear all user-related state
    setUser(null);
      setUserPhone(null);
      setUserEmail(null);
      setUserName(null);
      setAppSessionId(null);
      setConsentData(null);
      setSessionId(null);
      setAuthStep('welcome');
      // Clear any imported data
      setImportedData(null);
      setPreData({
        age: null,
        race: null,
        heightFt: null,
        heightIn: null,
        weight: null,
        bmi: 0,
        familyHistory: null,
        brcaStatus: null,
        heightUnit: 'imperial',
        heightCm: '',
        weightUnit: 'lbs',
        weightKg: '',
        ipss: Array(7).fill(null),
        shim: Array(5).fill(null),
        exercise: null,
        smoking: null,
        chemicalExposure: null,
        dietPattern: '',
        comorbidityScore: null,
        hypertension: null,
        hyperlipidemia: null,
        coronaryArteryDisease: null,
        diabetes: null,
      });
      setPostData({
        psa: '',
        knowPsa: false,
        knowPirads: false,
        pirads: '0'
      });
      setPreResult(null);
      setPostResult(null);
      setCloudSyncStatus('idle');
      // Reset form progress
      setStage('pre');
      setPathwayMode(null);
      setCurrentStep(1);
      setPart1Step(0);
      // Clear user-specific localStorage always (not just cloud mode)
      if (user) {
        safeLS.remove(`sessionId_${user.uid}`);
      }
      safeLS.remove(CONSENT_CACHE_KEY);
      safeLS.remove(CONSENT_VERSION_KEY);
  };


  const handlePostChange = (field, value) => {
    setPostData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePart1Next = async () => {
    {
      // Calculate Part 1 results via the shared Cloud Function
      // SHIM is hardcoded to zeros — removed from the form per design change
      const { preResult: result } = await computeSessionResults({ ...preData, shim: [0, 0, 0, 0, 0], pathwayMode: pathwayMode || 'pre_psa' });

      if (!result) {
        console.error('Calculation failed - missing required fields');
        if (import.meta.env.DEV) console.error('preData state:', preData);
        // Part1Form's own handleSubmit already sets formErrors and scrolls to the first error — no alert needed
        return;
      }

      setPreResult(result);

      // Track only in cloud mode
      if (shouldTrackAnalytics) {
        trackCalculatorUsage(user?.uid || 'anonymous', ANALYTICS_EVENTS.PART1_COMPLETED, {
          sessionId,
          predictedRisk: result.score,
          riskCategory: result.risk,
          ipssTotal: result.ipssTotal,
          shimTotal: result.shimTotal,
          age: result.age,
          bmi: result.bmi,
          modelVersion: result.modelVersion || calculatorConfig?.version || 'unknown'
        });
      }
      
      // Save Part 1 session to Firestore (cloud mode only)
      if (storageMode === 'cloud' && user && user.uid !== 'local' && db) {
        try {
          if (!sessionId) {
            // No partial session yet — create a fresh STEP1_COMPLETE session
            const newSessionId = await saveSession(user.uid, preData);
            setSessionId(newSessionId);
            safeLS.set(`sessionId_${user.uid}`, newSessionId);
          } else {
            // Upgrade the existing IN_PROGRESS partial session to STEP1_COMPLETE
            setCloudSyncStatus('saving');
            await updateDoc(doc(db, 'sessions', sessionId), {
              status: 'STEP1_COMPLETE',
              step1: preData,
              step1Partial: deleteField(),
              part1Step: deleteField(),
              expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
              updatedAt: serverTimestamp(),
            });
            setCloudSyncStatus('saved');
          }
        } catch (error) {
          console.error('Error saving step 1 to Firestore:', error);
          setCloudSyncStatus('error');
        }
      }

      // For post_psa and post_mri pathways, go directly to Part2Form (PSA input)
      // User already committed to having these results when they selected the pathway
      if (pathwayMode === 'post_psa' || pathwayMode === 'post_mri') {
        setStage('post');
        setCurrentStep(1);
      } else {
        setCurrentStep(3);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    }
  };
  
  const handlePart1Back = () => {
    if (part1Step > 0) {
      setPart1Step(part1Step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  

  const handlePostNext = async () => {
    // Ensure Part 1 is complete before calculating Part 2
    if (!preResult) {
      // Redirect back to Part 1 results — no alert needed as the stage change is self-explanatory
      setStage('pre');
      setCurrentStep(3);
      return;
    }
    
    // 3 form steps: 1 PSA, 2 Biomarkers, 3 MRI (optional)
    const part2TotalSteps = 3;

    if (currentStep === 1) {
      if (pathwayMode === 'post_psa' && !biomarkersEnabled) {
        // PSA-only pathway: skip biomarkers AND skip MRI entirely — compute
        // the PSA-only result directly and show the Part 2 results screen.
        // (Sends preData, not the already-computed preResult — the Cloud Function
        // takes raw Part 1 form data and recomputes Part 1 + Part 2 together.)
        const { postResult: interimResult } = await computeSessionResults(preData, { ...postData, pathwayMode: 'post_psa' });
        setPostResult(interimResult);
        setShowPart2Interim(true);
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!biomarkersEnabled) {
        // Biomarkers step temporarily disabled — go straight to MRI.
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      // PSA entered — advance to the biomarkers step (no calculation yet).
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      // Biomarkers entered — compute the Part 2 result (ePSA score from
      // PSA + baseline, no MRI yet) and show it before moving to Part 3 (MRI).
      const { postResult: interimResult } = await computeSessionResults(preData, { ...postData, pathwayMode: 'post_psa' });
      setPostResult(interimResult);
      setShowPart2Interim(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === part2TotalSteps) {
      // Calculate Post results using DYNAMIC calculator.
      // If the user entered MRI data on a post_psa pathway, upgrade to post_mri
      // so the engine applies the MRI model correctly.
      const hasMriData = postData.knowPirads && postData.pirads && String(postData.pirads) !== '0';
      const effectivePathway = hasMriData
        ? 'post_mri'
        : (pathwayMode || (postData.knowPirads ? 'post_mri' : 'post_psa'));
      if (hasMriData && pathwayMode !== 'post_mri') setPathwayMode('post_mri');
      const inferredPathway = effectivePathway;
      if (!preResult) {
        console.error('Cannot compute Part 2 results with null preResult — aborting');
        setStage('pre');
        setCurrentStep(3);
        return;
      }
      const { postResult: result } = await computeSessionResults(preData, { ...postData, pathwayMode: inferredPathway });

      // Part 3 (MRI/PI-RADS present): the validated biopsy-prediction service is the
      // sole source of the biopsy risk estimate (log(PSA) + PSAD + PI-RADS,
      // N=120 Mount Sinai registry, OOF AUC 0.703). No local fallback model —
      // on failure we show an "unavailable" notice instead (see Part3Results.jsx).
      if (hasMriData) {
        const psaNum = parseFloat(postData.psa);
        const piradsNum = parseInt(postData.pirads, 10);
        const volumeNum = parseFloat(postData.prostateVolume);
        if (Number.isFinite(psaNum) && Number.isFinite(piradsNum)) {
          setIsCalculatingPart3(true);
          try {
            const apiPrediction = await fetchBiopsyPrediction({
              psa: psaNum,
              pirads: piradsNum,
              prostateVolume: Number.isFinite(volumeNum) && volumeNum > 0 ? volumeNum : null,
            });
            result.apiPrediction = apiPrediction;
          } catch (err) {
            console.error('Biopsy prediction service unavailable:', err);
            result.apiPrediction = null;
            result.apiPredictionFailed = true;
          } finally {
            setIsCalculatingPart3(false);
          }
        }
      }

      setPostResult(result);

      // Track only in cloud mode
      if (shouldTrackAnalytics) {
        trackCalculatorUsage(user?.uid || 'anonymous', ANALYTICS_EVENTS.PART2_COMPLETED, {
          sessionId,
          predictedRisk: result.riskPct,
          riskCategory: result.riskClass,
          totalPoints: result.totalPoints,
          psaPoints: result.psaPoints,
          piradsScore: postData.pirads,
          modelVersion: result.modelVersion || calculatorConfig?.version || 'unknown'
        });
      }
      
      // Save Part 2 session to Firestore (cloud mode only)
      if (storageMode === 'cloud' && user && sessionId) {
        try {
          await updateSessionStep2(sessionId, postData, result.riskCat || result.riskClass || 'unknown', result.totalPoints ?? 0, result.engineVersion, result.modelVersion);
        } catch (error) {
          console.error('Error saving step 2 to Firestore:', error);
        }
      }

      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    }
  };

  const handlePostPrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  const buildASToolURL = (base = 'https://as.millionstrongmen.com') => {
    // HIPAA: Never include PHI in URLs (appears in browser history, referrer headers,
    // and server access logs). Only pass non-identifying tier/pathway context.
    const hasPost = postResult !== null;
    const payload = {
      source: 'epsa',
      part: hasPost ? 'complete' : 'part1',
      tier: hasPost
        ? (postResult?.epsaTierKey || null)
        : (preResult?.epsaTierKey || null),
      pathway: pathwayMode || 'pre_psa',
    };
    return `${base}?epsa=${encodeURIComponent(JSON.stringify(payload))}`;
  };

  const handleContinueToPostBiopsy = () => {
    window.open(buildASToolURL(), '_blank');
  };

  const canProceedPost = () => {
    // Part2Form handles its own validation
    return true;
  };

  // Global back navigation handler
  const handleGlobalBack = () => {
    if (authStep === 'app') {
      // In main app, handle back based on current step and stage
      if (stage === 'pre') {
        if (currentStep === 1) {
          // From Part1Form, go back to welcome
          setAuthStep('welcome');
          setPart1Step(0);
          setCurrentStep(1);
        } else if (currentStep === 3) {
          // From Part1Results, go back to Part1Form (edit answers)
          setPart1Step(0); // Go to first step of Part1Form
          setCurrentStep(1);
        }
      } else if (stage === 'post') {
        if (currentStep === 0) {
          // From Stage 2 welcome, go back to Part 1 results
          setCurrentStep(3);
          setStage('pre');
        } else if (currentStep === 4) {
          // From Part3Results / Part2Results, go back to Part2Form
          setCurrentStep(1);
        }
      }
    } else {
      // In auth flow, handle back based on auth step
      switch (authStep) {
        case 'import':
          setAuthStep('welcome');
          break;
        case 'login':
          setAuthStep('welcome');
          break;
        case 'consent':
          setAuthStep('welcome');
          break;
        case 'psa_overview':
          setAuthStep('consent');
          break;
        case 'welcome':
        default:
          // Can't go back from welcome
          break;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine if back button should be shown
  const shouldShowBackButton = () => {
    if (authStep === 'welcome') return false;
    if (authStep === 'import') return false;
    if (authStep === 'psa_overview') return false; // overview provides its own back/skip controls

    // When the current screen already provides its own back button,
    // hide the global one to avoid duplicated controls.
    if (authStep === 'app') {
      const onPart1Form = stage === 'pre' && (currentStep === 1 || currentStep === 2);
      if (onPart1Form && part1Step > 0) return false;

      const onPart2Form = stage === 'post' && (currentStep === 1 || currentStep === 2 || currentStep === 3);
      if (onPart2Form) return false;
    }

    return true;
  };

  // Render authentication screens
  const renderAuthScreen = () => {
    switch (authStep) {
      case 'welcome':
        return (
          <>
            <WelcomeScreen
              onBegin={() => {
                if (isFirebaseConfigured()) {
                  setStorageMode('cloud');
                  setAuthStep('login');
                } else {
                  setStorageMode('local');
                  setUser({ uid: 'local', isAnonymous: true });
                  setAppSessionId('Local');
                  if (hasCachedConsent()) {
                    setConsentData({
                      consentToContact: true,
                      consentBasis: 'implied_cached',
                      consentTimestamp: new Date().toISOString()
                    });
                    setAuthStep('app');
                  } else {
                    setAuthStep('consent');
                  }
                }
              }}
              cloudAvailable={isFirebaseConfigured()}
              onBeginLocal={() => {
                setStorageMode('local');
                setUser({ uid: 'local', isAnonymous: true });
                setAppSessionId('Local');
                if (hasCachedConsent()) {
                  setConsentData({
                    consentToContact: true,
                    consentBasis: 'implied_cached',
                    consentTimestamp: new Date().toISOString()
                  });
                  setAuthStep('app');
                } else {
                  setAuthStep('consent');
                }
              }}
              onBeginCloud={() => {
                setStorageMode('cloud');
                setAuthStep('login');
              }}
              onViewOverview={() => { setPsaOverviewFrom('welcome'); setAuthStep('psa_overview'); }}
            />
            <div className="welcome-secondary-actions">
              <button
                type="button"
                className="ws-btn-pill"
                onClick={() => setAuthStep('import')}
              >
                <UploadIcon size={14} />
                <span>Import Previous Session</span>
              </button>
              <div className="welcome-clinical-tools">
                <span className="welcome-clinical-tools__label">For clinicians &amp; researchers</span>
                <button
                  type="button"
                  className="ws-btn-pill ws-btn-pill--quiet"
                  onClick={() => setShowQuickEntry(true)}
                  title="Shows all pathway stages on one page with full clinical detail — enter values directly instead of the step-by-step patient flow."
                >
                  <ZapIcon size={14} />
                  <span>Clinician View</span>
                </button>
              </div>
            </div>
          </>
        );
      case 'import':
        return (
          <>
            {importError && (
              <div role="alert" style={{ margin: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '14px' }}>
                {importError}
                <button onClick={() => setImportError(null)} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 600 }}>Dismiss</button>
              </div>
            )}
            <DataImportScreen
              onImportSuccess={(data, type) => { setImportError(null); handleImportSuccess(data, type); }}
              onBack={() => { setImportError(null); setAuthStep('welcome'); }}
            />
          </>
        );
      case 'login':
        return <UniversalAuth onAuthSuccess={handleAuthSuccess} />;
      case 'consent':
        return (
          <ConsentScreen
            phone={null}
            email={null}
            onConsentComplete={handleConsentComplete}
          />
        );
      case 'psa_overview':
        return (
          <PSAOverviewScreen
            onContinue={() => setAuthStep(psaOverviewFrom === 'welcome' ? 'welcome' : 'app')}
            onBack={() => setAuthStep(psaOverviewFrom === 'welcome' ? 'welcome' : 'consent')}
            continueLabel={psaOverviewFrom === 'welcome' ? 'Back to home' : undefined}
          />
        );
      default:
        return null;
    }
  };

  // Main app (after login and consent)
  const renderPreStage = () => {
    // Show pathway selector only for fresh sessions (no calculated result yet).
    // Session restores and file imports bypass this — they set preResult directly.
    if (pathwayMode === null && !preResult) {
      return (
        <PathwaySelector
          onSelect={(mode) => {
            setPathwayMode(mode);
            setCurrentStep(1);
            setPart1Step(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      );
    }

    switch (currentStep) {
      case 1:
      case 2:
        // Use new Part1Form component for steps 1-2 (which internally handles 4 sub-steps)
        return (
          <Part1Form
            formData={preData}
            setFormData={setPreData}
            onNext={handlePart1Next}
            onBack={handlePart1Back}
            currentStep={part1Step}
            totalSteps={7}
          />
        );

      case 3:
        return (
          <div className="pre-results-step">
            {preResult ? (
              <Part1Results
                result={preResult}
                formData={{ ...preData, pathwayMode: pathwayMode || preResult?.pathwayMode || 'pre_psa' }}
                storageMode={storageMode}
                sessionId={appSessionId}
                userEmail={userEmail}
                userPhone={userPhone}
                researchConsent={consentData?.researchConsent ?? false}
                onEditAnswers={() => {
                  setPart1Step(0);
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={handleClearData}
                onContinueToPostPSA={() => {
                  setPathwayMode('post_psa');
                  setStage('post');
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onContinueToMRI={() => {
                  setPathwayMode('post_mri');
                  setStage('post');
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onContinueToPostBiopsy={handleContinueToPostBiopsy}
                onShowModelDocs={() => setShowModelDocs(true)}
              />
            ) : (
              <div className="loading-results">
                <p>{t('app.loadingResults.title')}</p>
                <p style={{ fontSize: '0.75rem', color: '#666' }}>{t('app.loadingResults.note')}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderPostStage = () => {
    switch (currentStep) {
      case 0:
        // Welcome screen for Stage 2
        return (
          <WelcomeScreen2
            preResult={preResult}
            config={calculatorConfig}
            onBegin={() => setCurrentStep(1)}
          />
        );
      
      case 1:
        // Part 2 — PSA only
        return (
          <Part2Form
            formData={postData}
            setFormData={setPostData}
            preResult={preResult}
            onNext={handlePostNext}
            onBack={() => {
              setStage('pre');
              setCurrentStep(3);
            }}
            pathwayMode={pathwayMode}
          />
        );

      case 2:
        // Part 3 — Advanced Biomarkers, then the Parts 2 & 3 results interim
        if (showPart2Interim) {
          return (
            <Part2Results
              result={postResult}
              postData={postData}
              preResult={preResult}
              onContinueToMRI={() => {
                setShowPart2Interim(false);
                setCurrentStep(3);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBack={() => setShowPart2Interim(false)}
            />
          );
        }
        return (
          <Part2BiomarkersForm
            formData={postData}
            setFormData={setPostData}
            preResult={preResult}
            onNext={handlePostNext}
            onBack={() => setCurrentStep(1)}
          />
        );

      case 3:
        // Part 3 — MRI / PI-RADS, feeds the biopsy prediction model
        return (
          <Part3Form
            formData={postData}
            setFormData={setPostData}
            preResult={preResult}
            onNext={handlePostNext}
            onBack={() => setCurrentStep(biomarkersEnabled ? currentStep - 1 : 1)}
            pathwayMode={pathwayMode}
          />
        );

      case 4:
        return (
          <div className="post-results-step">
            {!postResult && isCalculatingPart3 && (
              <ResultsLoading
                label="ePSA · MRI"
                message="Analyzing your PSA and MRI data…"
                steps={PART2_LOADING_STEPS}
                storageKey={LOADING_SEEN_KEY_P2}
              />
            )}
            {postResult && (postResult.pathwayMode === 'post_mri' ? (
              <Part3Results
                result={postResult}
                preData={{ ...preData, pathwayMode: pathwayMode || postResult?.pathwayMode || 'post_mri' }}
                preResult={preResult}
                postData={{ ...postData, pathwayMode: pathwayMode || postResult?.pathwayMode || 'post_mri' }}
                biomarkersEnabled={biomarkersEnabled}
                storageMode={storageMode}
                sessionId={appSessionId}
                userEmail={userEmail}
                userPhone={userPhone}
                researchConsent={consentData?.researchConsent ?? false}
                onEditAnswers={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={handleClearData}
                onShowModelDocs={() => setShowModelDocs(true)}
              />
            ) : (
              // Stopped after Part 2 (PSA + biomarkers, no MRI) — final screen stays
              // PSA-focused; combined-risk/biopsy detail is deferred to Part 3 once MRI is added.
              <Part2Results
                result={postResult}
                postData={postData}
                preResult={preResult}
                onBack={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onContinueToMRI={() => {
                  setPathwayMode('post_mri');
                  setCurrentStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={handleClearData}
              />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--ink-500)' }}>Loading…</div>}>
    <div className="App">
      <div className="container">
        <BackButton onBack={handleGlobalBack} show={shouldShowBackButton()} />
        <header className={`app-header ${shouldShowBackButton() ? 'with-back-button' : ''}`}>
          <div className="header-brand">
            <div className="header-brand-text">
              <span className="header-product-name">ePSA<span className="header-product-name-tm">™</span></span>
              <span className="header-tagline">Electronic Prostate Screening Assessment</span>
              <span className="header-attribution">Educational Decision Support · Developed by Tewari Lab, Icahn School of Medicine at Mount Sinai</span>
            </div>
          </div>
          <div className="header-actions">
            {(showQuickEntry || authStep === 'app') && <DoctorModeToggle />}
            <HeaderSettingsMenu />
            {authStep === 'app' && user?.uid && appSessionId && appSessionId !== 'Local' && (
              <button
                type="button"
                className="logout-btn"
                onClick={handleLogout}
                title="Logout from current session"
              >
                Logout
              </button>
            )}
            {authStep === 'app' && (
              <div className="stage-indicator">
                {appSessionId && appSessionId !== 'Local' && (
                  <span className="session-key-badge" title="Your session key — use this to resume your assessment">
                    Session: {appSessionId}
                  </span>
                )}
                {storageMode === 'cloud' && (
                  <span
                    className={`cloud-icon-badge cloud-icon-badge--${cloudSyncStatus}`}
                    aria-live="polite"
                    title={
                      cloudSyncStatus === 'saving' ? 'Saving to cloud…'
                      : cloudSyncStatus === 'saved' ? 'Saved to cloud'
                      : cloudSyncStatus === 'error' ? 'Cloud sync error'
                      : 'Cloud storage'
                    }
                  >
                    <CloudIcon size={14} />
                    {cloudSyncStatus !== 'idle' && <span className="cloud-icon-dot" aria-hidden="true" />}
                  </span>
                )}
                {storageMode === 'local' && isFirebaseConfigured() && preResult && (
                  <button
                    type="button"
                    className="cloud-icon-badge header-save-cloud-btn"
                    onClick={() => setShowSaveToCloudConsent(true)}
                    disabled={saveToCloudPending}
                    title={saveToCloudError || 'Saved on this device only — click to save a copy to the cloud'}
                  >
                    <HardDriveIcon size={14} />
                    <span className="header-save-cloud-label">
                      {saveToCloudPending ? 'Saving…' : 'Save to Cloud'}
                    </span>
                  </button>
                )}
                {storageMode === 'local' && (!isFirebaseConfigured() || !preResult) && (
                  <span className="cloud-icon-badge" title="Saved on this device only">
                    <HardDriveIcon size={14} />
                  </span>
                )}
                {(() => {
                  // On PathwaySelector screen — no badge yet
                  if (pathwayMode === null && !preResult) return null;

                  const PATHWAY_OPTIONS = [
                    { mode: 'pre_psa',     label: 'Pre-PSA Screening',    shortLabel: 'Pre-PSA',   desc: "Haven't had a PSA test yet",       cls: 'pathway-opt--pre'    },
                    { mode: 'post_psa',    label: 'PSA Assessment',        shortLabel: 'PSA',       desc: 'I have a PSA result',               cls: 'pathway-opt--psa'    },
                    { mode: 'post_mri',    label: 'PSA + MRI Assessment',  shortLabel: 'PSA + MRI', desc: 'I have a PSA and an MRI (PI-RADS)', cls: 'pathway-opt--mri'    },
                  ];

                  const BADGE_CLS = {
                    pre_psa: 'stage-pre', post_psa: 'stage-post', post_mri: 'stage-mri',
                  };

                  const effectiveMode = pathwayMode
                    || (stage === 'post' ? (postResult?.pathwayMode || 'post_psa') : (preResult?.pathwayMode || 'pre_psa'));
                  const activeOption = PATHWAY_OPTIONS.find(o => o.mode === effectiveMode);
                  const activeCls = BADGE_CLS[effectiveMode] || 'stage-pre';

                  const switchToPathway = (mode) => {
                    setShowPathwayDropdown(false);
                    setPathwayMode(mode);
                    if ((mode === 'post_psa' || mode === 'post_mri') && preResult) {
                      setStage('post');
                      setCurrentStep(1);
                    } else {
                      setStage('pre');
                      setCurrentStep(preResult ? 3 : 1);
                      if (!preResult) setPart1Step(0);
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  };

                  return (
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className={`stage-badge stage-badge--btn ${activeCls}`}
                        onClick={() => setShowPathwayDropdown(v => !v)}
                        title="Change assessment pathway"
                        aria-expanded={showPathwayDropdown}
                        aria-haspopup="listbox"
                      >
                        <span className="pathway-badge-label--full">{activeOption?.label || effectiveMode}</span>
                        <span className="pathway-badge-label--short" aria-hidden="true">{activeOption?.shortLabel || activeOption?.label || effectiveMode}</span>
                        <ChevronDownIcon size={11} aria-hidden="true" style={{ marginLeft: '3px', opacity: 0.8 }} />
                      </button>
                      {showPathwayDropdown && (
                        <>
                          <div
                            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                            onClick={() => setShowPathwayDropdown(false)}
                          />
                          <div className="pathway-dropdown" role="listbox" aria-label="Select assessment pathway">
                            {PATHWAY_OPTIONS.map(opt => (
                              <button
                                key={opt.mode}
                                type="button"
                                role="option"
                                aria-selected={effectiveMode === opt.mode}
                                className={`pathway-dropdown-item ${opt.cls} ${effectiveMode === opt.mode ? 'pathway-dropdown-item--active' : ''}`}
                                onClick={() => switchToPathway(opt.mode)}
                              >
                                <span className="pathway-dropdown-item__label">
                                  {opt.label}
                                  {opt.external && <ExternalLinkIcon size={10} aria-hidden="true" style={{ marginLeft: '4px', opacity: 0.7 }} />}
                                </span>
                                <span className="pathway-dropdown-item__desc">{opt.desc}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </header>

        {authStep === 'app' && saveToCloudError && (
          <div role="alert" aria-live="polite" className="header-save-cloud-error">
            <strong>Cloud save unavailable.</strong> {saveToCloudError}
            <button type="button" aria-label="Dismiss" onClick={() => setSaveToCloudError(null)}>×</button>
          </div>
        )}

        {showQuickEntry ? (
          <QuickEntry
            calculatorConfig={calculatorConfig}
            onClose={() => setShowQuickEntry(false)}
          />
        ) : authStep !== 'app' ? (
          renderAuthScreen()
        ) : (
          <>
            <JourneyProgress
              stage={stage}
              currentStep={currentStep}
              pathwayMode={pathwayMode}
              preResult={preResult}
              postResult={postResult}
              biomarkersEnabled={biomarkersEnabled}
              showPart2Interim={showPart2Interim}
            />
            {import.meta.env.DEV && showTestPanel && <FirebaseTestPanel />}
            {/* Stage navigation — shown once a pathway is active */}
            {(pathwayMode !== null || preResult) && (
              <nav className="stage-nav" aria-label="Assessment stages">
                {(() => {
                  const isPostMri = postResult?.pathwayMode === 'post_mri';
                  // MRI only belongs on this nav for the combined PSA + MRI
                  // pathway — a PSA-only pathway should never show it.
                  const showMri = pathwayMode === 'post_mri' || isPostMri;
                  // Has the user reached (or passed) the biomarkers / MRI forms this session?
                  const biomarkersReached = stage === 'post' && currentStep >= 2;
                  const mriReached = stage === 'post' && currentStep >= 3;
                  const mriNum = biomarkersEnabled ? '4' : '3';

                  const part1Sub = stage === 'pre'
                    ? (currentStep === 3 ? 'Results' : `Step ${Math.min(part1Step + 1, 7)} of 7`)
                    : 'Complete';
                  const psaSub = !preResult
                    ? 'Complete Pre-PSA step first'
                    : (stage === 'post' && currentStep === 1)
                      ? 'Step 1 of 1'
                      : 'Complete';
                  const biomarkersSub = !preResult
                    ? 'Complete Pre-PSA step first'
                    : !biomarkersReached
                      ? 'Complete PSA first'
                      : (stage === 'post' && currentStep === 2)
                        ? 'Step 1 of 1'
                        : 'Complete';
                  const mriSub = !preResult
                    ? 'Complete Pre-PSA step first'
                    : !postResult && !mriReached
                      ? (biomarkersEnabled ? 'Complete Biomarkers first' : 'Complete PSA first')
                      : (stage === 'post' && currentStep === 3)
                        ? 'Step 1 of 1'
                        : isPostMri
                          ? 'Results'
                          : 'Optional';

                  const part1Status = stage === 'pre' ? 'current' : 'done';
                  const psaStatus = !preResult
                    ? 'locked'
                    : (stage === 'post' && currentStep === 1)
                      ? 'current'
                      : 'done';
                  const biomarkersStatus = !preResult
                    ? 'locked'
                    : (stage === 'post' && currentStep === 2)
                      ? 'current'
                      : biomarkersReached
                        ? 'done'
                        : 'available';
                  const mriStatus = !preResult
                    ? 'locked'
                    : (stage === 'post' && currentStep === 3)
                      ? 'current'
                      : isPostMri
                        ? 'done'
                        : (postResult || mriReached ? 'available' : 'locked');

                  const goToPart1 = () => {
                    setStage('pre');
                    setCurrentStep(preResult ? 3 : 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  };
                  const goToPsa = () => {
                    if (!preResult) return;
                    setStage('post');
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  };
                  const goToBiomarkers = () => {
                    if (!preResult || !biomarkersReached) return;
                    setStage('post');
                    setCurrentStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  };
                  const goToMri = () => {
                    if (!preResult || (!postResult && !mriReached)) return;
                    setStage('post');
                    setCurrentStep(isPostMri ? 4 : 3);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  };

                  return (
                    <>
                      <button
                        type="button"
                        className={`stage-nav-item stage-nav-item--${part1Status}`}
                        onClick={goToPart1}
                        aria-current={part1Status === 'current' ? 'step' : undefined}
                      >
                        <span className="stage-nav-num" aria-hidden="true">
                          {part1Status === 'done' ? <CheckIcon size={13} aria-hidden="true" /> : '1'}
                        </span>
                        <span className="stage-nav-body">
                          <span className="stage-nav-label">Pre-PSA</span>
                          <span className="stage-nav-sub">{part1Sub}</span>
                        </span>
                      </button>
                      <span className="stage-nav-sep" aria-hidden="true" />
                      <button
                        type="button"
                        className={`stage-nav-item stage-nav-item--${psaStatus}`}
                        onClick={goToPsa}
                        disabled={!preResult}
                        aria-current={psaStatus === 'current' ? 'step' : undefined}
                      >
                        <span className="stage-nav-num" aria-hidden="true">
                          {psaStatus === 'done' ? <CheckIcon size={13} aria-hidden="true" /> : '2'}
                        </span>
                        <span className="stage-nav-body">
                          <span className="stage-nav-label">PSA</span>
                          <span className="stage-nav-sub">{psaSub}</span>
                        </span>
                      </button>
                      {biomarkersEnabled && (
                        <>
                          <span className="stage-nav-sep" aria-hidden="true" />
                          <button
                            type="button"
                            className={`stage-nav-item stage-nav-item--${biomarkersStatus}`}
                            onClick={goToBiomarkers}
                            disabled={biomarkersStatus === 'locked'}
                            aria-current={biomarkersStatus === 'current' ? 'step' : undefined}
                          >
                            <span className="stage-nav-num" aria-hidden="true">
                              {biomarkersStatus === 'done' ? <CheckIcon size={13} aria-hidden="true" /> : '3'}
                            </span>
                            <span className="stage-nav-body">
                              <span className="stage-nav-label">Biomarkers</span>
                              <span className="stage-nav-sub">{biomarkersSub}</span>
                            </span>
                          </button>
                        </>
                      )}
                      {showMri && (
                        <>
                          <span className="stage-nav-sep" aria-hidden="true" />
                          <button
                            type="button"
                            className={`stage-nav-item stage-nav-item--${mriStatus}`}
                            onClick={goToMri}
                            disabled={mriStatus === 'locked'}
                            aria-current={mriStatus === 'current' ? 'step' : undefined}
                          >
                            <span className="stage-nav-num" aria-hidden="true">
                              {mriStatus === 'done' ? <CheckIcon size={13} aria-hidden="true" /> : mriNum}
                            </span>
                            <span className="stage-nav-body">
                              <span className="stage-nav-label">MRI</span>
                              <span className="stage-nav-sub">{mriSub}</span>
                            </span>
                          </button>
                        </>
                      )}
                    </>
                  );
                })()}
              </nav>
            )}
            <div key={`${stage}-${currentStep}`} className="screen-slide-enter">
              {stage === 'pre' ? renderPreStage() : renderPostStage()}
            </div>
          </>
        )}
      </div>

      {showModelDocs && (
        <ModelDocs
          config={calculatorConfig}
          onClose={() => setShowModelDocs(false)}
        />
      )}
      {showCredits && (
        <CreditsModal onClose={() => setShowCredits(false)} />
      )}
      {showAboutEpsa && (
        <AboutEpsaModal onClose={() => setShowAboutEpsa(false)} />
      )}
      {showSaveToCloudConsent && (
        <SaveToCloudConsentModal
          onCancel={() => setShowSaveToCloudConsent(false)}
          onConfirm={() => {
            setShowSaveToCloudConsent(false);
            handleSaveLocalToCloud();
          }}
        />
      )}
      <footer className="app-footer">
        <div className="footer-links">
          <button className="btn-footer-link" onClick={() => setShowAboutEpsa(true)}>
            <InfoIcon size={13} aria-hidden="true" />
            <span>About ePSA</span>
          </button>
          <button className="btn-footer-link" onClick={() => setShowModelDocs(true)}>
            <BookIcon size={13} aria-hidden="true" />
            <span>{t('app.footer.modelDocs')}</span>
          </button>
          <a className="btn-footer-link" href="/legal/web/privacy">
            <ShieldCheckIcon size={13} aria-hidden="true" />
            <span>{t('app.footer.privacyPolicy')}</span>
          </a>
          <a className="btn-footer-link" href="/legal/web/terms">
            <FileTextIcon size={13} aria-hidden="true" />
            <span>{t('app.footer.termsOfService')}</span>
          </a>
          <a className="btn-footer-link" href="/legal">
            <ShieldCheckIcon size={13} aria-hidden="true" />
            <span>Legal</span>
          </a>
          <button className="btn-footer-link" onClick={() => setShowCredits(true)}>
            <UsersIcon size={13} aria-hidden="true" />
            <span>Credits</span>
          </button>
        </div>
        <div className="footer-meta">
          <span>ePSA v1.0.0</span>
          <span className="footer-sep" aria-hidden="true">·</span>
          <span>AUA/SUO 2026 · NCCN v1.2024 · EAU 2024</span>
          <span className="footer-sep" aria-hidden="true">·</span>
          <span>Tewari Lab · Icahn School of Medicine at Mount Sinai</span>
          <span className="footer-sep" aria-hidden="true">·</span>
          <span>Educational use only — not a medical device</span>
        </div>
      </footer>
    </div>
    </React.Suspense>
  );
}

const AppWithProviders = () => (
  <DoctorModeProvider>
    <App />
  </DoctorModeProvider>
);

export default AppWithProviders;
