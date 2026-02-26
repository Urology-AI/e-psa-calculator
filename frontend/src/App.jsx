import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import './App.css';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import WelcomeScreen2 from './components/WelcomeScreen2.jsx';
import StorageChoiceScreen from './components/StorageChoiceScreen.jsx';
import DataImportScreen from './components/DataImportScreen.jsx';
import UniversalAuth from './components/UniversalAuth.jsx';
import ConsentScreen from './components/ConsentScreen.jsx';
import { BookIcon } from 'lucide-react';
// StepNavigation, StepForm, FormField - not used in new Part 1 flow, kept for Stage 2 (post)
import Part1Form from './components/Part1Form.jsx';
import Part1Results from './components/Part1Results.jsx';
import Part2Form from './components/Part2Form.jsx';
import Part2Results from './components/Part2Results.jsx';
import ProfileManager from './components/ProfileManager.jsx';
import FirebaseTestPanel from './components/FirebaseTestPanel.jsx';
import BackButton from './components/BackButton.jsx';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { calculateDynamicEPsa, calculateDynamicEPsaPost, getCalculatorConfig, getModelVariant, getVariantConfig, refreshCalculatorConfig } from './utils/dynamicCalculator';
import { trackCalculatorUsage, trackOutcome, ANALYTICS_EVENTS } from './services/analyticsService';

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
  const [user, setUser] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [authStep, setAuthStep] = useState('welcome'); // 'welcome', 'storage', 'import', 'login', 'consent', 'app'
  const [consentData, setConsentData] = useState(null); // Used to track consent status (saved to localStorage and Firestore)
  const [storageMode, setStorageMode] = useState('cloud'); // Force cloud-only mode
  const [showModelDocs, setShowModelDocs] = useState(false);
  const [stage, setStage] = useState('pre'); // 'pre' or 'post'
  const [currentStep, setCurrentStep] = useState(1);
  const [appSessionId, setAppSessionId] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  
  // Detect email from URL params for unique links
  const [urlEmail, setUrlEmail] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setUrlEmail(email);
      setUserEmail(email);
      // Force cloud mode and skip storage choice for email links
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
  
  const shouldTrackAnalytics = storageMode === 'cloud';
  
  // ePSA-Pre form data (Part 1: 7-variable model inputs)
  const [preData, setPreData] = useState({
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
  });
  
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

  // Check auth state on mount
  useEffect(() => {
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
        if (userData && userData.isAnonymous && userData.sessionId) {
          setAppSessionId(userData.sessionId);
        }
        
        // If consent exists in Firestore, skip consent screen
        const consentExists = !!(userData && userData.consentToContact !== undefined);
        
        if (consentExists) {
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
          // No consent found - show consent screen
          setAuthStep('consent');
        }
      } else {
        // User logged out - go back to welcome screen
        setUser(null);
        setUserPhone(null);
        setUserEmail(null);
        setAppSessionId(null);
        setConsentData(null);
        setSessionId(null);
        setAuthStep('welcome');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = async (user, authInfo) => {
    setUser(user);
    // Support both phone and email auth
    if (typeof authInfo === 'string') {
      // Legacy phone auth
      setUserPhone(authInfo);
    } else if (authInfo && authInfo.phone) {
      setUserPhone(authInfo.phone);
    } else if (user.email) {
      setUserEmail(user.email);
    } else if (user.isAnonymous && user.sessionId) {
      // Anonymous auth - set session ID
      setAppSessionId(user.sessionId);
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
      // User already consented - skip consent screen
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
      setAuthStep('app');
    } else {
      // No consent found - show consent screen
      setAuthStep('consent');
    }
  };

  const handleConsentComplete = async (consent) => {
    setConsentData(consent);
    
    // Save consent to Firestore along with phone number
    if (user && userPhone) {
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
    setAppSessionId(null);
    setConsentData(null);
    setSessionId(null);
    setAuthStep('welcome');
    setShowProfile(false);
    
    // Clear form data
    setPreData({});
    setPostData({});
    setPreResult(null);
    setPostResult(null);
    setStage('pre');
    setCurrentStep(1);
    setPart1Step(0);
    
    console.log('Session unlinked, returned to welcome screen');
  };

  const createNewAnonymousSession = async () => {
    // Generate new session ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newSessionId = '';
    for (let i = 0; i < 8; i++) {
      newSessionId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if Firebase user exists
    let firebaseUser = null;
    try {
      firebaseUser = auth.currentUser;
    } catch (error) {
      console.log('Firebase auth check failed:', error);
    }
    
    // Create session in Firestore with complete structure
    try {
      const sessionData = {
        uid: newSessionId,
        sessionId: newSessionId,
        authMethod: 'anonymous',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isAnonymous: true,
        email: null,
        phone: null,
        hasFirebaseUser: !!firebaseUser
      };
      
      await setDoc(doc(db, 'users', newSessionId), sessionData);
    } catch (error) {
      console.error('Error creating session in Firestore:', error);
    }
    
    setAppSessionId(newSessionId);
    const mockUser = {
      uid: newSessionId,
      isAnonymous: true,
      sessionId: newSessionId
    };
    setUser(mockUser);
  };

  const promptUserForAuthChoice = async () => {
    const choice = confirm(
      'No user identification found in imported data.\n\n' +
      'Choose your authentication method:\n' +
      'Click OK for Email/Phone authentication\n' +
      'Click Cancel for Anonymous session'
    );
    
    if (choice) {
      // User wants email/phone auth - go to auth screen
      setAuthStep('login');
    } else {
      // User wants anonymous session
      await createNewAnonymousSession();
    }
  };

  const handleImportSuccess = async (importedData, importType) => {
    console.log('Import successful:', importType, importedData);
    
    if (importType === 'session') {
      // Handle session ID login - verify session exists and check for Firebase user
      const { sessionId, userData, existingSession } = importedData;
      
      try {
        // Verify session exists in Firestore
        const sessionDoc = await getDoc(doc(db, 'users', sessionId));
        if (!sessionDoc.exists()) {
          throw new Error('Session not found in database');
        }
        
        const sessionData = sessionDoc.data();
        
        // Check if Firebase user exists for this session
        let firebaseUser = null;
        try {
          // Try to get Firebase user by UID (session ID)
          firebaseUser = auth.currentUser;
          if (!firebaseUser || firebaseUser.uid !== sessionId) {
            // No Firebase user or different user - create new anonymous Firebase user
            console.log('Creating Firebase user for session:', sessionId);
            // Note: Firebase doesn't allow creating users with custom UIDs directly
            // We'll work with mock user object for session-based auth
          }
        } catch (authError) {
          console.log('Firebase auth check failed, using session-based auth:', authError);
        }
        
        const mockUser = {
          uid: sessionId,
          isAnonymous: true,
          sessionId: sessionId
        };
        
        setUser(mockUser);
        setAppSessionId(sessionId);
        
        // Update user state with contact info from session
        if (sessionData?.email) setUserEmail(sessionData.email);
        if (sessionData?.phone) setUserPhone(sessionData.phone);
        
        const consentExists = !!(sessionData && sessionData.consentToContact !== undefined);
        
        if (consentExists) {
          const consent = {
            consentToContact: sessionData.consentToContact || false,
            consentTimestamp: sessionData.consentTimestamp || new Date().toISOString()
          };
          setConsentData(consent);
          setAuthStep('app');
        } else {
          setAuthStep('consent');
        }
      } catch (error) {
        console.error('Session login error:', error);
        alert(`Failed to load session: ${error.message}`);
        return;
      }
      return;
    }
    
    // Handle file import (JSON or PDF)
    let dataToImport, targetStage = 'pre';
    
    // Handle new export format
    if (importedData.version && importedData.formData) {
      if (importedData.part === 'part1') {
        dataToImport = importedData.formData;
        targetStage = 'pre';
      } else if (importedData.part === 'complete') {
        dataToImport = importedData.part1Data;
        setPostData(importedData.part2Data || {});
        targetStage = 'post';
      }
    } else {
      dataToImport = importedData;
      targetStage = 'pre';
    }
    
    // Check for user info in imported data
    if (importedData.userInfo) {
      const { email, phone, sessionId: importedSessionId } = importedData.userInfo;
      
      if (importedSessionId) {
        // Check if this session ID exists in Firestore
        try {
          const existingDoc = await getDoc(doc(db, 'users', importedSessionId));
          if (existingDoc.exists()) {
            const existingData = existingDoc.data();
            const confirmMessage = `Found existing session: ${importedSessionId}\n` +
              `Created: ${new Date(existingData.createdAt).toLocaleDateString()}\n` +
              `Has ${existingData.email ? 'email' : 'no email'} and ${existingData.phone ? 'phone' : 'no phone'}\n\n` +
              `Do you want to:\n` +
              `1. Link to this existing session and import data\n` +
              `2. Create new session with imported data`;
            
            const userChoice = confirm(confirmMessage + '\n\nClick OK for existing session, Cancel for new session');
            
            if (userChoice) {
              // Link to existing session - check for Firebase user
              let firebaseUser = null;
              try {
                firebaseUser = auth.currentUser;
                if (!firebaseUser || firebaseUser.uid !== importedSessionId) {
                  console.log('No Firebase user found for session, using session-based auth');
                }
              } catch (authError) {
                console.log('Firebase auth check failed:', authError);
              }
              
              setAppSessionId(importedSessionId);
              const mockUser = {
                uid: importedSessionId,
                isAnonymous: true,
                sessionId: importedSessionId
              };
              setUser(mockUser);
              
              if (existingData?.email) setUserEmail(existingData.email);
              if (existingData?.phone) setUserPhone(existingData.phone);
              
              // Update session with imported data
              await updateDoc(doc(db, 'users', importedSessionId), {
                lastLoginAt: new Date().toISOString(),
                importedData: dataToImport,
                importDate: new Date().toISOString(),
                hasFirebaseUser: !!firebaseUser
              });
              
              // Set the imported data to state
              setPreData(prevData => ({
                ...prevData,
                ...dataToImport
              }));
              
              // Check consent and proceed
              const consentExists = !!(existingData && existingData.consentToContact !== undefined);
              if (consentExists) {
                const consent = {
                  consentToContact: existingData.consentToContact || false,
                  consentTimestamp: existingData.consentTimestamp || new Date().toISOString()
                };
                setConsentData(consent);
                setAuthStep('app');
              } else {
                setAuthStep('consent');
              }
              return;
            }
          }
        } catch (error) {
          console.log('Error checking existing session:', error);
        }
      }
      
      if (email || phone) {
        // Create new session and add contact info
        await createNewAnonymousSession();
        
        try {
          await updateDoc(doc(db, 'users', appSessionId), {
            email: email || null,
            phone: phone || null,
            lastLoginAt: new Date().toISOString(),
            importedData: dataToImport,
            importDate: new Date().toISOString()
          });
          
          if (email) setUserEmail(email);
          if (phone) setUserPhone(phone);
          
          console.log('Created new session with contact info:', { email, phone });
        } catch (error) {
          console.error('Error adding contact info to session:', error);
        }
      } else {
        // No user info - create new session
        await createNewAnonymousSession();
        
        try {
          await updateDoc(doc(db, 'users', appSessionId), {
            lastLoginAt: new Date().toISOString(),
            importedData: dataToImport,
            importDate: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error saving imported data:', error);
        }
      }
    } else {
      // No user info - create new session
      await createNewAnonymousSession();
      
      try {
        await updateDoc(doc(db, 'users', appSessionId), {
          lastLoginAt: new Date().toISOString(),
          importedData: dataToImport,
          importDate: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error saving imported data:', error);
      }
    }
    
    // Set the imported data to appropriate state
    setPreData(prevData => ({
      ...prevData,
      ...dataToImport
    }));
    
    // Calculate Part1 results immediately
    const part1Result = calculateDynamicEPsa(dataToImport, calculatorConfig);
    setPreResult(part1Result);
    
    // Calculate Part2 results if this is complete import and post data exists
    if (targetStage === 'post' && importedData.part2Data && Object.keys(importedData.part2Data).length > 0) {
      const part2Result = calculateDynamicEPsaPost(part1Result, importedData.part2Data, calculatorConfig);
      setPostResult(part2Result);
    }
    
    // Set storage mode based on import type or user preference
    if (importType === 'pdf') {
      setStorageMode('local'); // PDF import defaults to local storage
    } else {
      // For JSON, preserve the storage mode or default to local
      setStorageMode(importedData.storageMode || 'local');
    }
    
    // Navigate to appropriate results screen
    setAuthStep('app');
    setStage(targetStage);
    if (targetStage === 'pre') {
      setCurrentStep(3); // Go to Part1 results
      setPart1Step(4);
    } else {
      setCurrentStep(3); // Go to Part2 results
    }
  };

  const handleClearData = async () => {
    // Delete current session from Firebase and clear user's session reference
    if (storageMode === 'cloud' && user && sessionId) {
      try {
        // Delete the session via backend
        await deleteSession(sessionId);
      } catch (error) {
        console.error('Error deleting session from Firebase:', error);
        // Continue clearing local data even if Firebase delete fails
      }
    }
    
    // Clear all form data and results
    setStage('pre');
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
      localStorage.removeItem(`sessionId_${user.uid}`);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear all user-related state
      setUser(null);
      setUserPhone(null);
      setUserEmail(null);
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
      });
      setPostData({
        psa: '',
        knowPsa: false,
        knowPirads: false,
        pirads: '0'
      });
      setPreResult(null);
      setPostResult(null);
      // Reset form progress
      setStage('pre');
      setCurrentStep(1);
      setPart1Step(0);
      // Clear user-specific localStorage but keep general settings
      if (storageMode === 'cloud' && user) {
        localStorage.removeItem(`sessionId_${user.uid}`);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear state even if Firebase logout fails
      setUser(null);
      setUserPhone(null);
      setUserEmail(null);
      setAppSessionId(null);
      setConsentData(null);
      setSessionId(null);
      setAuthStep('welcome');
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
    } else if (part1Step === 6) {
      // Calculate Part 1 results using DYNAMIC calculator
      const result = calculateDynamicEPsa(preData, calculatorConfig);
      
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
      
      // Save to Firestore
      if (storageMode === 'cloud' && user) {
        try {
          if (sessionId) {
            // Update existing session
            await updateSession(sessionId, preData, result);
          } else {
            // Create new session
            const response = await createSession({
              step1: preData,
              result: result
            });
            const newSessionId = response.sessionId;
            setSessionId(newSessionId);
            localStorage.setItem(`sessionId_${user.uid}`, newSessionId);
          }
        } catch (error) {
          console.error('Error saving step 1:', error);
        }
      }
      
      setCurrentStep(3);
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
    
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      // Calculate Post results using DYNAMIC calculator
      const result = calculateDynamicEPsaPost(preResult, postData, calculatorConfig);
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
      
      // Save to Firestore
      if (storageMode === 'cloud' && user) {
        try {
          if (sessionId) {
            // Update existing session with Part 2 data
            await updateSession(sessionId, postData, result);
          } else {
            // Create new session if missing (shouldn't happen, but handle gracefully)
            console.warn('No sessionId found, creating new session for step 2');
            const response = await createSession({
              step1: preData || null,
              step2: postData,
              result: { score: result.score, risk: result.riskCat }
            });
            const newSessionId = response.sessionId;
            setSessionId(newSessionId);
            localStorage.setItem(`sessionId_${user.uid}`, newSessionId);
          }
        } catch (error) {
          console.error('Error saving step 2:', error);
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
        case 'storage':
          setAuthStep('welcome');
          break;
        case 'import':
          setAuthStep('storage');
          break;
        case 'login':
          setAuthStep('storage');
          break;
        case 'consent':
          setAuthStep('login');
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
    if (authStep === 'app' && stage === 'pre' && currentStep === 1 && part1Step === 0) return false;
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
                if (urlEmail) {
                  // Skip storage choice for email links, go directly to login
                  setAuthStep('login');
                } else {
                  setAuthStep('storage');
                }
              }} 
              formData={{}} 
              urlEmail={urlEmail}
            />
            <footer className="app-footer">
              <div className="footer-content">
                <p className="footer-text">
                  ePSA Prostate-Specific Awareness | A Non-Validated Educational Risk Tool
                </p>
                <button 
                  className="btn-model-docs" 
                  onClick={() => setShowModelDocs(true)}
                >
                  <BookIcon size={16} />
                  <span>Model Documentation</span>
                </button>
              </div>
            </footer>
          </>
        );
      case 'storage':
        return (
          <StorageChoiceScreen 
            onChoice={(mode) => {
              // Force cloud mode - ignore mode parameter
              setStorageMode('cloud');
              setAuthStep('login');
            }}
            onImport={() => setAuthStep('import')}
          />
        );
      case 'import':
        return (
          <DataImportScreen 
            onImportSuccess={handleImportSuccess}
            onBack={() => setAuthStep('storage')}
          />
        );
      case 'login':
        return <UniversalAuth onAuthSuccess={handleAuthSuccess} initialEmail={urlEmail} />;
      case 'consent':
        return (
          <ConsentScreen 
            phone={userPhone} 
            email={userEmail} 
            onConsentComplete={handleConsentComplete} 
          />
        );
      default:
        return null;
    }
  };

  // Main app (after login and consent)
  const renderPreStage = () => {
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
                formData={preData}
                storageMode={storageMode}
                sessionId={appSessionId}
                userEmail={userEmail}
                userPhone={userPhone}
                onEditAnswers={() => {
                  setPart1Step(0);
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={async () => {
                  if (window.confirm('Are you sure you want to clear all data and start over? This will delete your current session.')) {
                    await handleClearData();
                  }
                }}
              />
            ) : (
              <div className="loading-results">
                <p>Loading your results...</p>
                <p style={{ fontSize: '12px', color: '#666' }}>If this persists, try refreshing the page.</p>
              </div>
            )}
            <div className="stage-actions">
              <button
                onClick={() => {
                  // Allow continuing to Stage 2 (post) after Part 1 is complete
                  if (!preResult) {
                    console.warn('Cannot continue - no result');
                    return;
                  }
                  
                  setStage('post');
                  setCurrentStep(0);
                  // Ensure sessionId is set before moving to post stage
                  if (user && !sessionId) {
                    console.warn('No sessionId found when moving to post stage');
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-primary"
                disabled={!preResult}
              >
                Continue to Risk Assessment →
              </button>
            </div>
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
            totalSteps={2}
          />
        );

      case 3:
        return (
          <div className="post-results-step">
            {postResult && (
              <Part2Results
                result={postResult}
                preData={preData}
                preResult={preResult}
                postData={postData}
                storageMode={storageMode}
                sessionId={appSessionId}
                userEmail={userEmail}
                userPhone={userPhone}
                onEditAnswers={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={async () => {
                  if (window.confirm('Are you sure you want to clear all data and start over? This will delete your current session.')) {
                    await handleClearData();
                  }
                }}
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
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: '#2E7D32', margin: '0 0 4px', letterSpacing: '-1px' }}>ePSA</h1>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1C2833', margin: '0 0 6px' }}>Prostate‑Specific Awareness</h2>
            <p className="subtitle" style={{ fontSize: '14px', color: '#7F8C8D', fontStyle: 'italic', margin: 0 }}>A Non‑Validated Educational Risk Tool</p>
          </div>
          <div className="header-actions">
            <div className="stage-indicator">
              {authStep === 'app' && (
                stage === 'pre' ? (
                  <span className="stage-badge stage-pre">Stage 1: Screening Priority</span>
                ) : (
                  <span className="stage-badge stage-post">Stage 2: Risk Assessment</span>
                )
              )}
            </div>
            {user && (
              <div className="user-info">
                <div className="user-identifier">
                  {appSessionId && (
                    <span className="user-session" onClick={() => setShowProfile(!showProfile)}>
                      Session: {appSessionId}
                    </span>
                  )}
                </div>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {authStep !== 'app' ? renderAuthScreen() : (
          <>
            {showTestPanel && <FirebaseTestPanel />}
            
            {showProfile && (
              <ProfileManager 
                sessionId={appSessionId} 
                onProfileUpdate={(updatedData) => {
                  setUserEmail(updatedData.email);
                  setUserPhone(updatedData.phone);
                }}
                onSessionUnlink={handleSessionUnlink}
              />
            )}
            
            {/* Part1Form handles its own navigation */}
            {/* Part2Form handles its own navigation */}
            {renderAppContent()}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
