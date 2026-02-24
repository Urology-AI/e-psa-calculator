import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import './App.css';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import WelcomeScreen2 from './components/WelcomeScreen2.jsx';
import StorageChoiceScreen from './components/StorageChoiceScreen.jsx';
import DataImportScreen from './components/DataImportScreen.jsx';
import PhoneAuth from './components/PhoneAuth.jsx';
import ConsentScreen from './components/ConsentScreen.jsx';
import { BookIcon } from 'lucide-react';
import GlobalBackButton from './components/GlobalBackButton.jsx';
// StepNavigation, StepForm, FormField - not used in new Part 1 flow, kept for Stage 2 (post)
import StepNavigation from './components/StepNavigation.jsx';
import StepForm from './components/StepForm.jsx';
import FormField from './components/FormField.jsx';
import Results from './components/Results.jsx';
import Part1Form from './components/Part1Form.jsx';
import Part1Results from './components/Part1Results.jsx';
import Part2Form from './components/Part2Form.jsx';
import Part2Results from './components/Part2Results.jsx';
import ModelDocs from './components/ModelDocs.jsx';
import { calculateEPsaPost } from './utils/epsaPostCalculator';
import { calculateEPsa } from './utils/epsaCalculator';
import { upsertConsent, createSession, updateSession, deleteSession, getUser, getUserSessions } from './services/phiBackendService';
import { useSectionLocks } from './hooks/useSectionLocks';

const POST_STEPS = [
  { id: 1, label: 'PSA', title: 'PSA Level', description: 'Enter your PSA test result' },
  { id: 2, label: 'MRI', title: 'MRI Results (Optional)', description: 'Share your PIRADS score if available' },
  { id: 3, label: 'Risk', title: 'Risk Assessment', description: 'View your personalized risk assessment' }
];

function App() {
  const [user, setUser] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [authStep, setAuthStep] = useState('welcome'); // 'welcome', 'storage', 'import', 'login', 'consent', 'app'
  const [consentData, setConsentData] = useState(null); // Used to track consent status (saved to localStorage and Firestore)
  const [storageMode, setStorageMode] = useState(null); // 'cloud' or 'local' - data sovereignty choice
  const [showModelDocs, setShowModelDocs] = useState(false);
  const [stage, setStage] = useState('pre'); // 'pre' or 'post'
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  
  // Section locks for clinical data integrity
  const { isLocked, lockSection } = useSectionLocks(storageMode);
  
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
    geographicOrigin: '',
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
        setUserPhone(phone);
        
        // Check if user has completed consent in Firestore
        let userData = null;
        try {
          userData = await getUser(currentUser.uid);
        } catch (error) {
          console.warn('Could not fetch user data:', error);
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
                          const preResult = calculateEPsa(session.step1);
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
                            const preResult = calculateEPsa(session.step1);
                            const postResult = calculateEPsaPost(preResult, session.step2);
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
                          const preResult = calculateEPsa(session.step1);
                          
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
                            const preResult = calculateEPsa(session.step1);
                            setPreResult(preResult);
                          } catch (error) {
                            console.error('Error calculating preResult:', error);
                          }
                        }
                        if (session.step2) {
                          setPostData(session.step2);
                          if (session.step1) {
                            try {
                              const preResult = calculateEPsa(session.step1);
                              const postResult = calculateEPsaPost(preResult, session.step2);
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
                            const preResult = calculateEPsa(session.step1);
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
        setConsentData(null);
        setSessionId(null);
        setAuthStep('welcome');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = async (user, phone) => {
    setUser(user);
    setUserPhone(phone);
    
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

  const handleImportSuccess = (importedData, importType) => {
    console.log('Import successful:', importType, importedData);
    
    let dataToImport, targetStage = 'pre';
    
    // Handle new export format
    if (importedData.version && importedData.formData) {
      // New export format
      if (importedData.part === 'part1') {
        dataToImport = importedData.formData;
        targetStage = 'pre';
      } else if (importedData.part === 'complete') {
        // Complete data - need to set both pre and post data
        dataToImport = importedData.part1Data;
        setPostData(importedData.part2Data || {});
        targetStage = 'post';
      }
    } else {
      // Legacy format - handle as before
      dataToImport = importedData;
      targetStage = 'pre';
    }
    
    // Set the imported data to appropriate state
    setPreData(prevData => ({
      ...prevData,
      ...dataToImport
    }));
    
    // Calculate Part1 results immediately
    const part1Result = calculateEPsa(dataToImport);
    setPreResult(part1Result);
    
    // Calculate Part2 results if this is complete import and post data exists
    if (targetStage === 'post' && importedData.part2Data && Object.keys(importedData.part2Data).length > 0) {
      const part2Result = calculatePart2Risk(importedData.part2Data, part1Result);
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
    // Check if any sections are locked
    if (isLocked('part1') || isLocked('part2')) {
      alert('Cannot clear data: Some sections have been completed and locked for data integrity. Please contact your healthcare provider if you need to make changes.');
      return;
    }
    
    // Delete current session from Firebase and clear user's session reference
    if (user && sessionId) {
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
      geographicOrigin: '',
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
      setUser(null);
      setUserPhone(null);
      setAuthStep('welcome');
      setConsentData(null);
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
        geographicOrigin: '',
      });
      setPostData({
        psa: '',
        knowPsa: false,
        knowPirads: false,
        pirads: '0'
      });
      setPreResult(null);
      setPostResult(null);
      setSessionId(null);
      // Clear user-specific localStorage but keep general settings
      if (user) {
        localStorage.removeItem(`sessionId_${user.uid}`);
      }
    } catch (error) {
      console.error('Error signing out:', error);
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
      // Calculate Part 1 results using new calculator
      const result = calculateEPsa(preData);
      
      if (!result) {
        console.error('Calculation failed - missing required fields');
        console.error('preData state:', preData);
        alert('Please complete all required fields before calculating your score. Make sure you have entered all required fields in About You, Family & Genetic Risk, Body Metrics, Lifestyle, and Symptoms.');
        return;
      }
      
      setPreResult(result);
      
      // Save to Firestore
      if (user) {
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
      
      // Lock Part 1 after completion to prevent further edits
      try {
        await lockSection('part1', 'Part 1 completed - clinical data locked');
      } catch (error) {
        console.error('Error locking Part 1:', error);
        // Don't show error to user, just log it
      }
    }
  };
  
  const handlePart1Back = () => {
    // Check if Part 1 is locked
    if (isLocked('part1')) {
      alert('This section has been completed and locked for data integrity. Please contact your healthcare provider if you need to make changes.');
      return;
    }
    
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
      // Calculate Post results using Part 1 data
      const result = calculateEPsaPost(preResult, postData);
      setPostResult(result);
      
      // Save to Firestore
      if (user) {
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
      
      // Lock Part 2 after completion to prevent further edits
      try {
        await lockSection('part2', 'Part 2 completed - clinical data locked');
      } catch (error) {
        console.error('Error locking Part 2:', error);
        // Don't show error to user, just log it
      }
    }
  };

  const handlePostPrevious = () => {
    // Check if Part 2 is locked
    if (isLocked('part2')) {
      alert('This section has been completed and locked for data integrity. Please contact your healthcare provider if you need to make changes.');
      return;
    }
    
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
        if (currentStep === 1) {
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
        case 'phone':
          setAuthStep('import');
          break;
        case 'consent':
          setAuthStep('phone');
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
            <WelcomeScreen onBegin={() => setAuthStep('storage')} formData={{}} />
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
              setStorageMode(mode);
              if (mode === 'cloud') {
                setAuthStep('login');
              } else {
                // Local storage mode - skip auth and go directly to form
                setAuthStep('app');
                setStage('pre');
                setCurrentStep(1);
              }
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
        return <PhoneAuth onAuthSuccess={handleAuthSuccess} />;
      case 'consent':
        return <ConsentScreen phone={userPhone} onConsentComplete={handleConsentComplete} />;
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
                preResult={preResult}
                postData={postData}
                storageMode={storageMode}
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
        <GlobalBackButton 
          onBack={handleGlobalBack} 
          show={shouldShowBackButton()} 
        />
        <header className={`app-header ${shouldShowBackButton() ? 'with-back-button' : ''}`}>
          <div className="header-logo-container">
            <img 
              src={(process.env.PUBLIC_URL || '') + '/logo.png'}
              alt="ePSA Logo" 
              className="logo"
              onError={(e) => {
                console.error('Logo.png failed to load:', e.target.src);
                // Fallback: try logo.jpg if logo.png doesn't exist
                const currentSrc = e.target.src;
                if (currentSrc.includes('logo.png')) {
                  e.target.src = (process.env.PUBLIC_URL || '') + '/logo.jpg';
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
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Part1Form handles its own navigation */}

        {/* Part2Form handles its own navigation */}

        {authStep !== 'app' ? renderAuthScreen() : (
          <>
            {stage === 'pre' && renderPreStage()}
            {stage === 'post' && renderPostStage()}
          </>
        )}
      </div>
      
      {showModelDocs && <ModelDocs onClose={() => setShowModelDocs(false)} />}
    </div>
  );
}

export default App;
