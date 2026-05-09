import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { auth, db, functions, isFirebaseConfigured } from './config/firebase';
import { httpsCallable } from 'firebase/functions';
import './App.css';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import WelcomeScreen2 from './components/WelcomeScreen2.jsx';
import DataImportScreen from './components/DataImportScreen.jsx';
import UniversalAuth from './components/UniversalAuth.jsx';
import ConsentScreen from './components/ConsentScreen.jsx';
import { BookIcon, ShieldCheckIcon, UsersIcon, CloudIcon } from 'lucide-react';
import CreditsModal from './components/CreditsModal.jsx';
import ModelDocs from './components/ModelDocs.jsx';
import HipaaCompliancePopup from './components/HipaaCompliancePopup.jsx';
import { useTranslation } from 'react-i18next';
// StepNavigation, StepForm, FormField - not used in new Part 1 flow, kept for Stage 2 (post)
import Part1Form from './components/Part1Form.jsx';
import Part1Results from './components/Part1Results.jsx';
import Part2Form from './components/Part2Form.jsx';
import Part2Results from './components/Part2Results.jsx';
import PathwaySelector from './components/PathwaySelector.jsx';
import FirebaseTestPanel from './components/FirebaseTestPanel.jsx';
import BackButton from './components/BackButton.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import ThemeSwitcher from './components/ThemeSwitcher.jsx';
import TextScaleControl from './components/TextScaleControl.jsx';
import QuickEPsaEntry from './components/QuickEPsaEntry.jsx';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, serverTimestamp, Timestamp, deleteField } from 'firebase/firestore';
import { calculateDynamicEPsa, calculateDynamicEPsaPost, getCalculatorConfig, getModelVariant, getVariantConfig, refreshCalculatorConfig } from './utils/dynamicCalculator';
import { trackCalculatorUsage, trackOutcome, ANALYTICS_EVENTS } from './services/analyticsService';

const CONSENT_CACHE_KEY = 'epsa_consent_acknowledged_v1';

// Simple inline back button component for testing
const TestBackButton = ({ onBack, show }) => {
  if (!show) return null;
  return (
    <button onClick={onBack} style={{margin: '10px', padding: '8px 16px'}}>
      ← Back
    </button>
  );
};

const POST_STEPS = [
  { id: 1, label: 'PSA', title: 'PSA Level', description: 'Enter your PSA test result' },
  { id: 2, label: 'MRI', title: 'MRI Results (Optional)', description: 'Share your PIRADS score if available' },
  { id: 3, label: 'Risk', title: 'Risk Assessment', description: 'View your personalized risk assessment' }
];

function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userName, setUserName] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [authStep, setAuthStep] = useState('welcome'); // 'welcome', 'import', 'login', 'consent', 'app'
  const [consentData, setConsentData] = useState(null); // Used to track consent status (saved to localStorage and Firestore)
  const [storageMode, setStorageMode] = useState('cloud'); // 'cloud' | 'local'
  const [showModelDocs, setShowModelDocs] = useState(false);
  const [showHipaaPopup, setShowHipaaPopup] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [stage, setStage] = useState('pre'); // 'pre' or 'post'
  const [pathwayMode, setPathwayMode] = useState(null); // null | 'pre_psa' | 'post_psa' | 'post_mri'
  const [currentStep, setCurrentStep] = useState(1);
  const [appSessionId, setAppSessionId] = useState(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const [saveToCloudPending, setSaveToCloudPending] = useState(false);
  const [saveToCloudError, setSaveToCloudError] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle'); // idle | saving | saved | error

  const [quickOpen, setQuickOpen] = useState(false);

  const hasCachedConsent = () => {
    try {
      return localStorage.getItem(CONSENT_CACHE_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const cacheConsent = () => {
    try {
      localStorage.setItem(CONSENT_CACHE_KEY, 'true');
    } catch {
      // Ignore storage errors (private mode/quota).
    }
  };
  
  // Detect email from URL params (legacy; we no longer collect email)
  const [urlEmail, setUrlEmail] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setUrlEmail(email);
      setStorageMode('cloud');
    }
  }, []);
  
  // Calculator configuration and A/B testing
  const [calculatorConfig, setCalculatorConfig] = useState(() => getCalculatorConfig());
  const [modelVariant, setModelVariant] = useState('control');

  useEffect(() => {
    (async () => {
      const refreshed = await refreshCalculatorConfig();
      if (refreshed) {
        setCalculatorConfig(refreshed);
      }
    })();
  }, []);
  
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
                localStorage.setItem(`sessionId_${currentUser.uid}`, sessionId);
                
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
                        // Recalculate pre result using new calculator
                        try {
                          const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
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
                            const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
                            const postResult = calculateDynamicEPsaPost(preResult, session.step2, calculatorConfig);
                            setPostResult(postResult);
                          } catch (error) {
                            console.error('Error calculating postResult:', error);
                          }
                        }
                      }
                      // Set step to 3 AFTER results are calculated
                      setCurrentStep(3);
                    } else if (session.status === 'STEP1_COMPLETE') {
                      // Stage 1 completed - show stage 1 results, ready for stage 2
                      setStage('pre');
                      if (session.step1) {
                        // Calculate result FIRST before setting preData
                        try {
                          const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
                          
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
                const storedSessionId = localStorage.getItem(`sessionId_${currentUser.uid}`);
                if (storedSessionId) {
                  setSessionId(storedSessionId);
                  // Try to load session data
                  try {
                    const session = await getSession(storedSessionId);
                    if (session) {
                      // Restore state based on session status (same logic as above)
                      if (session.status === 'STEP2_COMPLETE') {
                        setStage('post');
                        setCurrentStep(3);
                        if (session.step1) {
                          setPreData(session.step1);
                          try {
                            const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
                            setPreResult(preResult);
                          } catch (error) {
                            console.error('Error calculating preResult:', error);
                          }
                        }
                        if (session.step2) {
                          setPostData(session.step2);
                          if (session.step1) {
                            try {
                              const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
                              const postResult = calculateDynamicEPsaPost(preResult, session.step2, calculatorConfig);
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
                            const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
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
                localStorage.setItem(`sessionId_${currentUser.uid}`, restoredSessionId);
                try {
                  const session = await getSession(restoredSessionId);
                  if (session) {
                    if (session.status === 'STEP2_COMPLETE') {
                      setStage('post');
                      if (session.step1) {
                        setPreData(session.step1);
                        try {
                          const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
                          setPreResult(preResult);
                          if (session.step2) {
                            setPostData(session.step2);
                            const postResult = calculateDynamicEPsaPost(preResult, session.step2, calculatorConfig);
                            setPostResult(postResult);
                          }
                        } catch (calcErr) {
                          console.error('Error recalculating results:', calcErr);
                        }
                      }
                      setCurrentStep(3);
                    } else if (session.status === 'STEP1_COMPLETE') {
                      setStage('pre');
                      if (session.step1) {
                        try {
                          const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
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
                const storedSessionId = localStorage.getItem(`sessionId_${currentUser.uid}`);
                if (storedSessionId) {
                  setSessionId(storedSessionId);
                  try {
                    const session = await getSession(storedSessionId);
                    if (session) {
                      if (session.status === 'STEP2_COMPLETE') {
                        setStage('post');
                        setCurrentStep(3);
                        if (session.step1) {
                          setPreData(session.step1);
                          try {
                            const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
                            setPreResult(preResult);
                            if (session.step2) {
                              setPostData(session.step2);
                              const postResult = calculateDynamicEPsaPost(preResult, session.step2, calculatorConfig);
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
                            const preResult = calculateDynamicEPsa(session.step1, calculatorConfig);
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
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
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
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
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
        localStorage.setItem(`sessionId_${user.uid}`, sessionRef.id);
      } else {
        await updateDoc(doc(db, 'sessions', sessionId), {
          step1Partial: partialData,
          part1Step: step,
          updatedAt: serverTimestamp(),
        });
      }
      setCloudSyncStatus('saved');
    } catch (err) {
      console.error('Error saving partial progress:', err);
      setCloudSyncStatus('error');
    }
  };

  const updateSessionStep2 = async (sessionDocId, step2Data, riskCat, score) => {
    if (!db) return;
    setCloudSyncStatus('saving');
    await updateDoc(doc(db, 'sessions', sessionDocId), {
      status: 'STEP2_COMPLETE',
      step2: step2Data,
      finalCategory: riskCat,
      finalScore: score,
      updatedAt: serverTimestamp(),
    });
    setCloudSyncStatus('saved');
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
    console.log('[AuthFlow] handleAuthSuccess invoked', {
      uid: user?.uid,
      isAnonymous: user?.isAnonymous,
      authInfo
    });
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
      console.log('[AuthFlow] consent exists -> authStep=app', { uid: user?.uid });
    } else {
      if (hasCachedConsent()) {
        setConsentData({
          consentToContact: true,
          consentBasis: 'implied_cached',
          consentTimestamp: new Date().toISOString()
        });
        setAuthStep('app');
        console.log('[AuthFlow] consent cached -> authStep=app', { uid: user?.uid });
      } else {
        // No consent found - show consent screen
        setAuthStep('consent');
        console.log('[AuthFlow] consent missing -> authStep=consent', { uid: user?.uid });
      }
    }
  };

  const handleConsentComplete = async (consent) => {
    setConsentData(consent);
    cacheConsent();
    // Consent continue should always enter the Part 1 form flow.
    setStage('pre');
    setPathwayMode(null);
    setCurrentStep(1);
    setPart1Step(0);
    
    // Save consent to Firestore for any authenticated mode (phone, email, or anonymous)
    if (user) {
      try {
        await upsertConsent(consent);
        setAuthStep('app');
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
        setAuthStep('app');
      }
    } else {
      setAuthStep('app');
    }
  };

  const handleSessionUnlink = async () => {
    // Clear all session data and return to welcome
    setUser(null);
    setUserPhone(null);
    setUserEmail(null);
    setUserName(null);
      setAppSessionId(null);
    setConsentData(null);
    setSessionId(null);
    setAuthStep('welcome');
    setShowProfile(false);
    
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
      setSaveToCloudError('Cloud save is not available or no data to save.');
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
        localStorage.setItem(`sessionId_${firebaseUser.uid}`, newSessionId);
      }
      if (postData && postResult && newSessionId) {
        await updateSessionStep2(newSessionId, postData, postResult.riskCat || postResult.riskClass || 'unknown', postResult.totalPoints ?? 0);
      }
      setStorageMode('cloud');
    } catch (err) {
      console.error('Save to cloud error:', err);
      setSaveToCloudError(err?.message || 'Failed to save to cloud.');
    } finally {
      setSaveToCloudPending(false);
    }
  };

  const handleImportSuccess = async (importedData, importType) => {
    console.log('Import successful:', importType, importedData);
    setImportedData(importedData);
    
    if (importType === 'session') {
      // Session ID restore requires Firebase
      if (!auth || !functions) {
        alert('Session ID restore is only available with cloud storage. Use Import for a JSON file instead.');
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
          localStorage.setItem(`sessionId_${firebaseUser.uid}`, restored.currentSessionId);

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
              const recalcPre = calculateDynamicEPsa(step1, calculatorConfig);
              if (recalcPre) setPreResult(recalcPre);
              if (sessionData.step2) {
                setPostData(sessionData.step2);
                if (recalcPre) {
                  const recalcPost = calculateDynamicEPsaPost(recalcPre, sessionData.step2, calculatorConfig);
                  if (recalcPost) setPostResult(recalcPost);
                }
                setStage('post');
              } else {
                setStage('pre');
              }
              setCurrentStep(3);
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
        alert(`Failed to load session: ${error?.details || error?.message || 'Unknown error'}`);
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
    
    // Calculate Part1 results; if validation fails (missing required fields), go to form so user can fill gaps
    const part1Result = calculateDynamicEPsa(normalizedImport, calculatorConfig);
    setPreResult(part1Result || null);
    
    // Calculate Part2 results if this is complete import and post data exists
    if (targetStage === 'post' && importedData.part2Data && Object.keys(importedData.part2Data).length > 0 && part1Result) {
      const part2Result = calculateDynamicEPsaPost(part1Result, importedData.part2Data, calculatorConfig);
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
    
    // Import implies consent to use the platform and continue.
    setConsentData({
      consentToContact: true,
      consentBasis: 'implied_by_import',
      consentTimestamp: new Date().toISOString()
    });
    cacheConsent();
    // Navigate: if calculation succeeded go to results; otherwise go to form to fill missing data
    setAuthStep('app');
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
    setAsResult(null);

    // Clear session ID from state but keep user logged in
    setSessionId(null);
    
    // Clear session ID from localStorage
    if (user) {
      localStorage.removeItem(`sessionId_${user.uid}`);
    }
    
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
      // Clear user-specific localStorage but keep general settings
      if (storageMode === 'cloud' && user) {
        localStorage.removeItem(`sessionId_${user.uid}`);
      }
  };


  const handlePostChange = (field, value) => {
    setPostData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePart1Next = async () => {
    if (part1Step < 6) {
      setPart1Step(part1Step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Autosave partial progress to cloud at each step
      saveProgressStep(preData, part1Step + 1).catch(console.error);
    } else if (part1Step === 6) {
      // Calculate Part 1 results using DYNAMIC calculator
      // Pass pathwayMode into formData so the engine can return it
      const result = calculateDynamicEPsa({ ...preData, pathwayMode: pathwayMode || 'pre_psa' }, calculatorConfig);

      if (!result) {
        console.error('Calculation failed - missing required fields');
        console.error('preData state:', preData);
        alert('Please complete all required fields before calculating your score. Make sure you have entered all required fields in About You, Family & Genetic Risk, Body Metrics, Lifestyle, and Symptoms.');
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
            localStorage.setItem(`sessionId_${user.uid}`, newSessionId);
          } else {
            // Upgrade the existing IN_PROGRESS partial session to STEP1_COMPLETE
            setCloudSyncStatus('saving');
            await updateDoc(doc(db, 'sessions', sessionId), {
              status: 'STEP1_COMPLETE',
              step1: preData,
              step1Partial: deleteField(),
              part1Step: deleteField(),
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
      alert('Please complete Part 1 (Screening Priority) before proceeding to Risk Assessment.');
      setStage('pre');
      setCurrentStep(3);
      return;
    }
    
    // post_mri has 2 Part2 steps (PSA then MRI); post_psa has 1 (PSA only)
    const part2TotalSteps = pathwayMode === 'post_mri' ? 2 : 1;

    if (currentStep < part2TotalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === part2TotalSteps) {
      // Calculate Post results using DYNAMIC calculator
      // Pass pathwayMode through postData so the engine returns it in the result.
      // For restored sessions (pathwayMode state is null), infer from whether MRI
      // data was entered — avoids incorrectly defaulting old PSA-only sessions to post_mri.
      const inferredPathway = pathwayMode || (postData.knowPirads ? 'post_mri' : 'post_psa');
      const result = calculateDynamicEPsaPost(preResult, { ...postData, pathwayMode: inferredPathway }, calculatorConfig);
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
          await updateSessionStep2(sessionId, postData, result.riskCat || result.riskClass || 'unknown', result.totalPoints ?? 0);
        } catch (error) {
          console.error('Error saving step 2 to Firestore:', error);
        }
      }
      
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    }
  };

  const handlePostPrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  const handleContinueToPostBiopsy = () => {
    const params = new URLSearchParams({
      source: 'epsa',
      epsaTier: preResult?.epsaTierKey ?? '',
      epsaScore: preResult?.score ?? '',
    });
    window.open(`https://as.millionstrongmen.com?${params}`, '_blank');
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
        } else if (currentStep === 1) {
          // From Part2Form, go back to Part1Results
          setCurrentStep(3);
          setStage('pre');
        } else if (currentStep === 3) {
          // From Part2Results, go back to Part2Form
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

    // When the current screen already provides its own back button,
    // hide the global one to avoid duplicated controls.
    if (authStep === 'app') {
      const onPart1Form = stage === 'pre' && (currentStep === 1 || currentStep === 2);
      if (onPart1Form && part1Step > 0) return false;

      const onPart2Form = stage === 'post' && (currentStep === 1 || currentStep === 2);
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
              onQuickEntry={() => setQuickOpen(true)}
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
              onImport={() => setAuthStep('import')} 
              formData={{}}
              urlEmail={urlEmail}
            />
            <footer className="app-footer">
              <div className="footer-content">
                <p className="footer-text">{t('app.footer.text')}</p>
                <button 
                  className="btn-model-docs" 
                  onClick={() => setShowModelDocs(true)}
                >
                  <BookIcon size={16} />
                  <span>{t('app.footer.modelDocs')}</span>
                </button>
                <button
                  className="btn-model-docs btn-hipaa"
                  onClick={() => setShowHipaaPopup(true)}
                >
                  <ShieldCheckIcon size={16} />
                  <span>{t('app.footer.hipaa')}</span>
                </button>
                <button
                  className="btn-model-docs"
                  onClick={() => setShowCredits(true)}
                >
                  <UsersIcon size={16} />
                  <span>Credits</span>
                </button>
              </div>
            </footer>
          </>
        );
      case 'import':
        return (
          <DataImportScreen 
            onImportSuccess={handleImportSuccess}
            onBack={() => setAuthStep('welcome')}
          />
        );
      case 'login':
        return <UniversalAuth onAuthSuccess={handleAuthSuccess} initialEmail={urlEmail} />;
      case 'consent':
        return (
          <ConsentScreen
            phone={null}
            email={null}
            onConsentComplete={handleConsentComplete}
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
            if (mode === 'post_biopsy') {
              window.open('https://as.millionstrongmen.com?source=epsa', '_blank');
              return;
            }
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
                onSaveToCloud={handleSaveLocalToCloud}
                cloudAvailable={isFirebaseConfigured()}
                saveToCloudPending={saveToCloudPending}
                saveToCloudError={saveToCloudError}
                researchConsent={consentData?.researchConsent ?? false}
                onEditAnswers={() => {
                  setPart1Step(0);
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={async () => {
                  if (window.confirm(t('app.confirm.clearAllDataStartOver'))) {
                    await handleClearData();
                  }
                }}
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
      case 2:
        // Use new Part2Form component with consistent styling
        return (
          <Part2Form
            formData={postData}
            setFormData={setPostData}
            preResult={preResult}
            onNext={handlePostNext}
            onBack={currentStep === 1 ? () => {
              setStage('pre');
              setCurrentStep(3);
            } : () => setCurrentStep(currentStep - 1)}
            currentStep={currentStep}
            totalSteps={pathwayMode === 'post_mri' ? 2 : 1}
            pathwayMode={pathwayMode}
          />
        );

      case 3:
        return (
          <div className="post-results-step">
            {postResult && (
              <Part2Results
                result={postResult}
                preData={{ ...preData, pathwayMode: pathwayMode || postResult?.pathwayMode || 'post_mri' }}
                preResult={preResult}
                postData={{ ...postData, pathwayMode: pathwayMode || postResult?.pathwayMode || 'post_mri' }}
                storageMode={storageMode}
                sessionId={appSessionId}
                userEmail={userEmail}
                userPhone={userPhone}
                onSaveToCloud={handleSaveLocalToCloud}
                cloudAvailable={isFirebaseConfigured()}
                saveToCloudPending={saveToCloudPending}
                saveToCloudError={saveToCloudError}
                researchConsent={consentData?.researchConsent ?? false}
                onEditAnswers={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={async () => {
                  if (window.confirm(t('app.confirm.clearAllDataStartOver'))) {
                    await handleClearData();
                  }
                }}
                onShowModelDocs={() => setShowModelDocs(true)}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      <div className="container">
        <BackButton onBack={handleGlobalBack} show={shouldShowBackButton()} />
        <header className={`app-header ${shouldShowBackButton() ? 'with-back-button' : ''}`}>
          <div className="header-logo-container">
            <img 
              src="/logo.png"
              alt="ePSA Logo" 
              className="logo"
              onError={(e) => {
                console.error('Logo.png failed to load:', e.target.src);
                // Fallback: try logo.jpg if logo.png doesn't exist
                const currentSrc = e.target.src;
                if (currentSrc.includes('logo.png')) {
                  e.target.src = '/logo.jpg';
                } else {
                  console.warn('Both logo files failed to load');
                  e.target.style.display = 'none';
                }
              }} 
            />
          </div>
          <div className="header-text">
            <h1>ePSA</h1>
            <h2>{t('app.header.title')}</h2>
            <p className="subtitle">{t('app.header.subtitle')}</p>
          </div>
          <div className="header-actions">
            <TextScaleControl />
            <ThemeSwitcher />
            <LanguageSwitcher />
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
                <span className={`stage-step-badge ${stage === 'pre' ? 'stage-step-badge--pre' : 'stage-step-badge--post'}`}>
                  {stage === 'pre'
                    ? currentStep === 3
                      ? 'Part 1 · Results'
                      : `Part 1 · Step ${Math.min(part1Step + 1, 7)} of 7`
                    : currentStep === 3
                      ? 'Part 2 · Results'
                      : currentStep === 0
                        ? 'Part 2 · Overview'
                        : `Part 2 · Step ${currentStep} of 2`}
                </span>
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
                {(() => {
                  // On PathwaySelector screen — no badge yet
                  if (pathwayMode === null && !preResult) return null;

                  // Pathway-aware labels
                  const PATHWAY_BADGES = {
                    pre_psa:  { label: 'Pre-PSA Screening',  cls: 'stage-pre'  },
                    post_psa: { label: 'PSA Assessment',      cls: 'stage-post' },
                    post_mri: { label: 'Full MRI Assessment', cls: 'stage-mri'  },
                  };
                  const effectiveMode = pathwayMode
                    || (stage === 'post' ? (postResult?.pathwayMode || 'post_psa') : (preResult?.pathwayMode || 'pre_psa'));
                  const badge = PATHWAY_BADGES[effectiveMode]
                    || (stage === 'pre'
                      ? { label: t('app.stage.stagePre'),  cls: 'stage-pre'  }
                      : { label: t('app.stage.stagePost'), cls: 'stage-post' });

                  // Only show "Change pathway" before results are locked in
                  const canChangePathway = pathwayMode !== null && !preResult;

                  return (
                    <>
                      <span className={`stage-badge ${badge.cls}`}>{badge.label}</span>
                      {canChangePathway && (
                        <button
                          type="button"
                          className="change-pathway-btn"
                          onClick={() => {
                            setPathwayMode(null);
                            setCurrentStep(1);
                            setPart1Step(0);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          title="Go back to pathway selection"
                        >
                          ← Change
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </header>

        {quickOpen ? (
          <QuickEPsaEntry
            calculatorConfig={calculatorConfig}
            onClose={() => setQuickOpen(false)}
          />
        ) : authStep !== 'app' ? (
          renderAuthScreen()
        ) : (
          <>
            {showTestPanel && <FirebaseTestPanel />}
            {stage === 'pre' ? renderPreStage() : renderPostStage()}
          </>
        )}
      </div>

      {showModelDocs && (
        <ModelDocs
          config={calculatorConfig}
          onClose={() => setShowModelDocs(false)}
        />
      )}
      {showHipaaPopup && (
        <HipaaCompliancePopup onClose={() => setShowHipaaPopup(false)} />
      )}
      {showCredits && (
        <CreditsModal onClose={() => setShowCredits(false)} />
      )}
    </div>
  );
}

export default App;
