import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import './App.css';
import WelcomeScreen from './components/WelcomeScreen';
import WelcomeScreen2 from './components/WelcomeScreen2';
import PhoneAuth from './components/PhoneAuth';
import ConsentScreen from './components/ConsentScreen';
// StepNavigation, StepForm, FormField - not used in new Part 1 flow, kept for Stage 2 (post)
import StepNavigation from './components/StepNavigation';
import StepForm from './components/StepForm';
import FormField from './components/FormField';
import Results from './components/Results';
import Part1Form from './components/Part1Form';
import Part1Results from './components/Part1Results';
import Part2Form from './components/Part2Form';
import Part2Results from './components/Part2Results';
import ModelDocs from './components/ModelDocs';
import { calculateEPsaPost } from './utils/epsaPostCalculator';
import { calculateEPsa } from './utils/epsaCalculator';
import { createOrUpdateUser, createSession, updateSession, deleteSession, clearUserSession, getSession, getUser } from './services/firestoreService';

const POST_STEPS = [
  { id: 1, label: 'PSA', title: 'PSA Level', description: 'Enter your PSA test result' },
  { id: 2, label: 'MRI', title: 'MRI Results (Optional)', description: 'Share your PIRADS score if available' },
  { id: 3, label: 'Risk', title: 'Risk Assessment', description: 'View your personalized risk assessment' }
];

function App() {
  const [user, setUser] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [authStep, setAuthStep] = useState('welcome'); // 'welcome', 'login', 'consent', 'app'
  const [consentData, setConsentData] = useState(null); // Used to track consent status (saved to localStorage and Firestore)
  const [showModelDocs, setShowModelDocs] = useState(false);
  const [stage, setStage] = useState('pre'); // 'pre' or 'post'
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  
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
        
        // Check if user has completed consent (check both localStorage and Firestore)
        const hasConsented = localStorage.getItem(`consent_${currentUser.uid}`);
        const storedConsentData = localStorage.getItem(`consentData_${currentUser.uid}`);
        
        // Also check Firestore for consent
        let userData = null;
        try {
          userData = await getUser(currentUser.uid);
        } catch (error) {
          console.warn('Could not fetch user data:', error);
        }
        
        // If consent exists in localStorage OR Firestore, skip consent screen
        const consentExists = (hasConsented && storedConsentData) || (userData && userData.consentToContact !== undefined);
        
        if (consentExists) {
          try {
            let consent;
            if (storedConsentData) {
              consent = JSON.parse(storedConsentData);
            } else if (userData) {
              // Reconstruct consent from Firestore data
              consent = {
                consentToContact: userData.consentToContact || false,
                consentTimestamp: userData.consentTimestamp || new Date().toISOString()
              };
              // Save to localStorage for future use
              localStorage.setItem(`consent_${currentUser.uid}`, consent.consentToContact ? 'true' : 'false');
              localStorage.setItem(`consentData_${currentUser.uid}`, JSON.stringify(consent));
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
                console.log('Restored session ID:', sessionId);
                
                // Load session data and restore stage/form state
                try {
                  const session = await getSession(sessionId);
                  if (session) {
                    console.log('Loaded session:', session);
                    
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
                          console.log('Restored preResult:', preResult);
                          console.log('Session step1 data:', session.step1);
                          
                          // Set result FIRST, then data, then step
                          if (preResult) {
                            // Set result immediately
                            setPreResult(preResult);
                            console.log('Set preResult state:', preResult);
                            
                            // Then set form data
                            setPreData(session.step1);
                            
                            // Then set step after a brief delay to ensure state is set
                            setTimeout(() => {
                              setCurrentStep(3);
                              console.log('Set currentStep to 3, preResult should be:', preResult);
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
    
    // Check if user already has consent (don't ask again)
    const hasConsented = localStorage.getItem(`consent_${user.uid}`);
    const storedConsentData = localStorage.getItem(`consentData_${user.uid}`);
    
    // Also check Firestore
    let userData = null;
    try {
      userData = await getUser(user.uid);
    } catch (error) {
      console.warn('Could not fetch user data:', error);
    }
    
    const consentExists = (hasConsented && storedConsentData) || (userData && userData.consentToContact !== undefined);
    
    if (consentExists) {
      // User already consented - skip consent screen
      let consent;
      if (storedConsentData) {
        consent = JSON.parse(storedConsentData);
      } else if (userData) {
        consent = {
          consentToContact: userData.consentToContact || false,
          consentTimestamp: userData.consentTimestamp || new Date().toISOString()
        };
        localStorage.setItem(`consent_${user.uid}`, consent.consentToContact ? 'true' : 'false');
        localStorage.setItem(`consentData_${user.uid}`, JSON.stringify(consent));
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
        console.log('Saving consent:', consent);
        console.log('User UID:', user.uid);
        console.log('User authenticated:', !!user);
        console.log('Phone number:', userPhone);
        
        await createOrUpdateUser(user.uid, userPhone, consent);
        localStorage.setItem(`consent_${user.uid}`, consent.consentToContact ? 'true' : 'false');
        localStorage.setItem(`consentData_${user.uid}`, JSON.stringify(consent));
        console.log('Consent saved successfully');
        setAuthStep('app');
      } catch (error) {
        console.error('Error saving consent:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Check if it's a permission error
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
          console.warn('Permission denied - Firestore rules may not be deployed. Saving to localStorage only.');
        }
        
        // Still proceed to app even if save fails (data saved in localStorage)
        setAuthStep('app');
      }
    } else {
      console.warn('User or phone number missing, cannot save consent');
      console.warn('User:', user);
      console.warn('UserPhone:', userPhone);
      // Still proceed to app
      setAuthStep('app');
    }
  };

  const handleClearData = async () => {
    // Delete current session from Firebase and clear user's session reference
    if (user && sessionId) {
      try {
        // Delete the session document from Firestore
        await deleteSession(sessionId);
        console.log('Deleted session from Firestore:', sessionId);
        
        // Clear currentSessionId from user document
        await clearUserSession(user.uid);
        console.log('Cleared session reference from user document');
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
    
    console.log('All data cleared. New session will be created when user starts filling the form.');
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
        localStorage.removeItem(`consent_${user.uid}`);
        localStorage.removeItem(`consentData_${user.uid}`);
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
      console.log('Calculating with preData:', preData);
      const result = calculateEPsa(preData);
      console.log('Calculation result:', result);
      
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
            await updateSession(sessionId, {
              status: 'STEP1_COMPLETE',
              step1: preData,
              finalScore: result.score,
              finalRisk: result.risk
            });
            console.log('Updated session:', sessionId);
          } else {
            // Create new session
            const newSessionId = await createSession(user.uid, {
              status: 'STEP1_COMPLETE',
              step1: preData,
              finalScore: result.score,
              finalRisk: result.risk
            });
            setSessionId(newSessionId);
            localStorage.setItem(`sessionId_${user.uid}`, newSessionId);
            console.log('Created new session:', newSessionId);
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
      // Calculate Post results using Part 1 data
      console.log('Calculating Part 2 with Part 1 result:', preResult);
      console.log('Part 2 form data:', postData);
      const result = calculateEPsaPost(preResult, postData);
      console.log('Part 2 calculation result:', result);
      setPostResult(result);
      
      // Save to Firestore
      if (user) {
        try {
          if (sessionId) {
            // Update existing session
            await updateSession(sessionId, {
              status: 'STEP2_COMPLETE',
              step2: postData,
              finalCategory: result.riskCat
            });
            console.log('Updated session with step 2:', sessionId);
          } else {
            // Create new session if missing (shouldn't happen, but handle gracefully)
            console.warn('No sessionId found, creating new session for step 2');
            const newSessionId = await createSession(user.uid, {
              status: 'STEP2_COMPLETE',
              step1: preData || null,
              step2: postData,
              finalCategory: result.riskCat
            });
            setSessionId(newSessionId);
            localStorage.setItem(`sessionId_${user.uid}`, newSessionId);
            console.log('Created new session for step 2:', newSessionId);
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

  // Render authentication screens
  const renderAuthScreen = () => {
    switch (authStep) {
      case 'welcome':
        return (
          <>
            <WelcomeScreen onBegin={() => setAuthStep('login')} />
            <footer className="app-footer">
              <div className="footer-content">
                <p className="footer-text">
                  ePSA Prostate-Specific Awareness | A Non-Validated Educational Risk Tool
                </p>
                <button 
                  className="btn-model-docs" 
                  onClick={() => setShowModelDocs(true)}
                >
                  📖 Model Documentation
                </button>
              </div>
            </footer>
          </>
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
        console.log('Rendering case 3, preResult:', preResult);
        return (
          <div className="pre-results-step">
            {preResult ? (
              <Part1Results
                result={preResult}
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
                onPrint={() => window.print()}
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
                onEditAnswers={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={async () => {
                  if (window.confirm('Are you sure you want to clear all data and start over? This will delete your current session.')) {
                    await handleClearData();
                  }
                }}
                onPrint={() => window.print()}
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
        <header className="app-header">
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
              onLoad={() => {
                console.log('Logo loaded successfully from:', (process.env.PUBLIC_URL || '') + '/logo.png');
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
