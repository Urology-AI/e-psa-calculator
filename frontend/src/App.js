import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import './App.css';
import PhoneAuth from './components/PhoneAuth';
import ConsentScreen from './components/ConsentScreen';
import StepNavigation from './components/StepNavigation';
import StepForm from './components/StepForm';
import FormField from './components/FormField';
import PreResults from './components/PreResults';
import Results from './components/Results';
import { calculateEPsaPre } from './utils/epsaPreCalculator';
import { calculateEPsaPost } from './utils/epsaPostCalculator';
import { createOrUpdateUser, createSession, updateSession, deleteSession, clearUserSession, getSession, getUser } from './services/firestoreService';

const PRE_STEPS = [
  { id: 1, label: 'Basic Info', title: 'Non-Modifiable Risk Factors', description: 'Tell us about factors you cannot change' },
  { id: 2, label: 'History', title: 'Prior Screening History', description: 'Share your screening and medical history' },
  { id: 3, label: 'Priority', title: 'Screening Priority', description: 'View your screening priority recommendation' }
];

const POST_STEPS = [
  { id: 1, label: 'PSA', title: 'PSA Level', description: 'Enter your PSA test result' },
  { id: 2, label: 'MRI', title: 'MRI Results (Optional)', description: 'Share your PIRADS score if available' },
  { id: 3, label: 'Risk', title: 'Risk Assessment', description: 'View your personalized risk assessment' }
];

function App() {
  const [user, setUser] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [authStep, setAuthStep] = useState('login'); // 'login', 'consent', 'app'
  const [consentData, setConsentData] = useState(null);
  const [stage, setStage] = useState('pre'); // 'pre' or 'post'
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  
  // ePSA-Pre form data
  const [preData, setPreData] = useState({
    age: '',
    familyHistory: '',
    geneticRisk: '',
    race: '',
    priorPsa: '',
    priorBiopsy: '',
    finasteride: ''
  });

  // ePSA-Post form data
  const [postData, setPostData] = useState({
    psa: '',
    knowPsa: false, // Track if user knows their PSA
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
        
        // Check if user has completed consent
        const hasConsented = localStorage.getItem(`consent_${currentUser.uid}`);
        const storedConsentData = localStorage.getItem(`consentData_${currentUser.uid}`);
        
        if (hasConsented && storedConsentData) {
          try {
            const consent = JSON.parse(storedConsentData);
            setConsentData(consent);
            
            // Restore session state from Firestore
            try {
              const userData = await getUser(currentUser.uid);
              
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
                        // Recalculate pre result
                        const preResult = calculateEPsaPre(session.step1);
                        setPreResult(preResult);
                      }
                      if (session.step2) {
                        setPostData(session.step2);
                        // Recalculate post result if we have pre result
                        if (session.step1) {
                          const preResult = calculateEPsaPre(session.step1);
                          const postResult = calculateEPsaPost(preResult, session.step2);
                          setPostResult(postResult);
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
                          const preResult = calculateEPsaPre(session.step1);
                          console.log('Restored preResult:', preResult);
                          console.log('Session step1 data:', session.step1);
                          console.log('preResult.category:', preResult?.category);
                          console.log('preResult.priority:', preResult?.priority);
                          console.log('preResult.message:', preResult?.message);
                          
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
                              // Verify preResult is still set
                              console.log('Verifying preResult after timeout...');
                            }, 150);
                          } else {
                            console.warn('Invalid preResult calculated, starting fresh');
                            setCurrentStep(1);
                          }
                        } catch (error) {
                          console.error('Error calculating preResult from session:', error);
                          setCurrentStep(1);
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
                          const preResult = calculateEPsaPre(session.step1);
                          setPreResult(preResult);
                        }
                        if (session.step2) {
                          setPostData(session.step2);
                          if (session.step1) {
                            const preResult = calculateEPsaPre(session.step1);
                            const postResult = calculateEPsaPost(preResult, session.step2);
                            setPostResult(postResult);
                          }
                        }
                      } else if (session.status === 'STEP1_COMPLETE') {
                        setStage('pre');
                        setCurrentStep(3);
                        if (session.step1) {
                          setPreData(session.step1);
                          const preResult = calculateEPsaPre(session.step1);
                          setPreResult(preResult);
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
                }
              }
            } catch (error) {
              console.warn('Could not restore session:', error);
              // Start fresh on error
              setStage('pre');
              setCurrentStep(1);
            }
            
            setAuthStep('app');
          } catch (error) {
            console.error('Error parsing consent data:', error);
            setAuthStep('consent');
          }
        } else {
          setAuthStep('consent');
        }
      } else {
        setUser(null);
        setUserPhone(null);
        setConsentData(null);
        setSessionId(null);
        setAuthStep('login');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = async (user, phone) => {
    setUser(user);
    setUserPhone(phone);
    setAuthStep('consent');
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
    setPreData({
      age: '',
      familyHistory: '',
      geneticRisk: '',
      race: '',
      priorPsa: '',
      priorBiopsy: '',
      finasteride: ''
    });
    setPostData({
      psa: '',
      knowPsa: false,
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
      setAuthStep('login');
      setConsentData(null);
      setStage('pre');
      setCurrentStep(1);
      setPreData({
        age: '',
        familyHistory: '',
        geneticRisk: '',
        race: '',
        priorPsa: '',
        priorBiopsy: '',
        finasteride: ''
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

  const handlePreChange = (field, value) => {
    setPreData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePostChange = (field, value) => {
    setPostData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreNext = async () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      // Calculate Pre results
      const result = calculateEPsaPre(preData);
      setPreResult(result);
      
      // Save to Firestore
      if (user) {
        try {
          if (sessionId) {
            // Update existing session
            await updateSession(sessionId, {
              status: 'STEP1_COMPLETE',
              step1: preData,
              finalCategory: result.category
            });
            console.log('Updated session:', sessionId);
          } else {
            // Create new session
            const newSessionId = await createSession(user.uid, {
              status: 'STEP1_COMPLETE',
              step1: preData,
              finalCategory: result.category
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

  const handlePrePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePostNext = async () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      // Calculate Post results
      const result = calculateEPsaPost(preResult, postData);
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

  const canProceedPre = () => {
    switch (currentStep) {
      case 1:
        return preData.age && preData.familyHistory && preData.geneticRisk && preData.race;
      case 2:
        return preData.priorPsa && preData.priorBiopsy && preData.finasteride;
      default:
        return true;
    }
  };

  const canProceedPost = () => {
    switch (currentStep) {
      case 1:
        // Can proceed if user doesn't know PSA OR if they entered a valid PSA value
        if (!postData.knowPsa) {
          return false; // Must know PSA to proceed
        }
        return postData.psa && parseFloat(postData.psa) > 0;
      case 2:
        return true; // PIRADS is optional
      default:
        return true;
    }
  };

  // Render authentication screens
  if (authStep === 'login') {
    return <PhoneAuth onAuthSuccess={handleAuthSuccess} />;
  }

  if (authStep === 'consent') {
    return <ConsentScreen phone={userPhone} onConsentComplete={handleConsentComplete} />;
  }

  // Main app (after login and consent)
  const renderPreStage = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepForm
            step={1}
            title={PRE_STEPS[0].title}
            description={PRE_STEPS[0].description}
            onNext={handlePreNext}
            onPrevious={handlePrePrevious}
            canProceed={canProceedPre()}
          >
            <FormField
              label="Age Group"
              tooltipText="SEER Database, cancer.gov&#10;Godtman RA, et al., Eur Urol. 2022&#10;Nemesure B, et al., Res Rep Urol. 2022"
              id="age"
            >
              <select
                id="age"
                value={preData.age}
                onChange={(e) => handlePreChange('age', e.target.value)}
              >
                <option value="">Select age group...</option>
                <option value="40-49">40-49</option>
                <option value="50-59">50-59</option>
                <option value="60-69">60-69</option>
                <option value="70+">70+</option>
              </select>
            </FormField>

            <FormField
              label="Family History of Prostate Cancer"
              tooltipText="Hemminki H, et al., Eur Urol Open Sci 2024&#10;Madersbacher S, et al., BJU Int. 2010"
              id="familyHistory"
            >
              <select
                id="familyHistory"
                value={preData.familyHistory}
                onChange={(e) => handlePreChange('familyHistory', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="none">None</option>
                <option value="1-relative">1 first-degree relative</option>
                <option value="2+relatives">2+ first-degree relatives</option>
              </select>
            </FormField>

            <FormField
              label="Known Genetic Mutation"
              tooltipText="Hemminki H, et al., Eur Urol Open Sci 2024&#10;Giri VN, et al., J Clin Oncol. 2018"
              id="geneticRisk"
            >
              <select
                id="geneticRisk"
                value={preData.geneticRisk}
                onChange={(e) => handlePreChange('geneticRisk', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="none">None / Unknown</option>
                <option value="known-mutation">Known high-risk mutation (BRCA2, HOXB13, Lynch, etc.)</option>
              </select>
            </FormField>

            <FormField
              label="Race (Optional, self-identified)"
              tooltipText="Tewari A., et al. Urol Onc 2005&#10;Loeb S, et al., Urology 2006&#10;Brawley O, World J Urol. 2012"
              id="race"
            >
              <select
                id="race"
                value={preData.race}
                onChange={(e) => handlePreChange('race', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="white-asian">White / Asian</option>
                <option value="hispanic">Hispanic</option>
                <option value="black">Black or African American</option>
              </select>
            </FormField>
          </StepForm>
        );

      case 2:
        return (
          <StepForm
            step={2}
            title={PRE_STEPS[1].title}
            description={PRE_STEPS[1].description}
            onNext={handlePreNext}
            onPrevious={handlePrePrevious}
            canProceed={canProceedPre()}
          >
            <FormField
              label="Prior PSA test?"
              tooltipText="Have you had a PSA test before?"
              id="priorPsa"
            >
              <select
                id="priorPsa"
                value={preData.priorPsa}
                onChange={(e) => handlePreChange('priorPsa', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="never">Never</option>
                <option value="normal">Yes – normal</option>
                <option value="elevated">Yes – previously elevated</option>
                <option value="not-sure">Not sure</option>
              </select>
            </FormField>

            <FormField
              label="Prior prostate biopsy?"
              tooltipText="Have you had a prostate biopsy?"
              id="priorBiopsy"
            >
              <select
                id="priorBiopsy"
                value={preData.priorBiopsy}
                onChange={(e) => handlePreChange('priorBiopsy', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="no">No</option>
                <option value="negative">Yes – negative</option>
                <option value="cancer">Yes – cancer diagnosed</option>
              </select>
            </FormField>

            <FormField
              label="Taking finasteride or dutasteride?"
              tooltipText="These medications can affect PSA levels"
              id="finasteride"
            >
              <select
                id="finasteride"
                value={preData.finasteride}
                onChange={(e) => handlePreChange('finasteride', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>
          </StepForm>
        );

      case 3:
        console.log('Rendering case 3, preResult:', preResult);
        return (
          <div className="pre-results-step">
            {preResult ? (
              <PreResults result={preResult} />
            ) : (
              <div className="loading-results">
                <p>Loading your results...</p>
                <p style={{ fontSize: '12px', color: '#666' }}>If this persists, try refreshing the page.</p>
              </div>
            )}
            <div className="stage-actions">
              <button
                onClick={() => {
                  // Don't allow continuing if prior cancer
                  const isPriorCancer = preResult && (
                    preResult.category === 'prior-cancer' || 
                    (preResult.priority === null && preResult.message)
                  );
                  
                  if (isPriorCancer) {
                    console.log('Cannot continue - prior cancer case');
                    return;
                  }
                  
                  if (!preResult || !preResult.priority) {
                    console.warn('Cannot continue - invalid result');
                    return;
                  }
                  
                  setStage('post');
                  setCurrentStep(1);
                  // Ensure sessionId is set before moving to post stage
                  if (user && !sessionId) {
                    console.warn('No sessionId found when moving to post stage');
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-primary"
                disabled={!preResult || !preResult.priority || preResult.category === 'prior-cancer' || (preResult.priority === null && preResult.message)}
              >
                Continue to Risk Assessment →
              </button>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    // Go back to step 1 but keep the data pre-filled
                    setCurrentStep(1);
                    // Don't clear preData - keep it filled so user can edit
                    // Don't clear preResult - will be recalculated when they submit
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="btn btn-secondary"
                >
                  Edit Answers
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all data and start over? This will delete your current session.')) {
                      await handleClearData();
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ backgroundColor: '#f5f5f5', color: '#666', borderColor: '#ccc' }}
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPostStage = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepForm
            step={1}
            title={POST_STEPS[0].title}
            description={POST_STEPS[0].description}
            onNext={handlePostNext}
            onPrevious={() => {
              setStage('pre');
              setCurrentStep(3);
            }}
            canProceed={canProceedPost()}
          >
            <FormField
              label="Do you know your PSA level?"
              tooltipText="PSA (Prostate-Specific Antigen) is a blood test"
              id="knowPsa"
            >
              <select
                id="knowPsa"
                value={postData.knowPsa ? 'yes' : 'no'}
                onChange={(e) => {
                  const knowsPsa = e.target.value === 'yes';
                  handlePostChange('knowPsa', knowsPsa);
                  if (!knowsPsa) {
                    handlePostChange('psa', '');
                  }
                }}
              >
                <option value="no">No, I don't know my PSA</option>
                <option value="yes">Yes, I know my PSA level</option>
              </select>
            </FormField>

            {postData.knowPsa && (
              <FormField
                label="Enter PSA Level (ng/mL)"
                id="psa"
              >
                <input
                  type="number"
                  id="psa"
                  step="0.1"
                  min="0"
                  value={postData.psa || ''}
                  onChange={(e) => handlePostChange('psa', e.target.value)}
                  placeholder="e.g., 2.5"
                  required
                />
                <small>Please enter your PSA level to continue</small>
              </FormField>
            )}
          </StepForm>
        );

      case 2:
        return (
          <StepForm
            step={2}
            title={POST_STEPS[1].title}
            description={POST_STEPS[1].description}
            onNext={handlePostNext}
            onPrevious={handlePostPrevious}
            canProceed={canProceedPost()}
            isLastStep={true}
          >
            <FormField
              label="Do you know your MRI PIRADS score?"
              tooltipText="Park KJ, et al., J Urol. 2020&#10;Oerther B, et al., Prostate Cancer 2021"
              id="knowPirads"
            >
              <select
                id="knowPirads"
                value={postData.knowPirads ? 'yes' : 'no'}
                onChange={(e) => handlePostChange('knowPirads', e.target.value === 'yes')}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>

            {postData.knowPirads && (
              <FormField
                label="PIRADS Score on MRI"
                id="pirads"
              >
                <select
                  id="pirads"
                  value={postData.pirads}
                  onChange={(e) => handlePostChange('pirads', e.target.value)}
                >
                  <option value="0">Select...</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </FormField>
            )}
          </StepForm>
        );

      case 3:
        return (
          <div className="post-results-step">
            {postResult && <Results result={postResult} />}
            <div className="stage-actions">
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    // Go back to Stage 1 but keep all data pre-filled so user can edit
                    setStage('pre');
                    setCurrentStep(1);
                    // Keep preData and postData filled - user can edit their answers
                    // Results will be recalculated when they submit again
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="btn btn-secondary"
                >
                  Edit Answers
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all data and start over? This will delete your current session.')) {
                      await handleClearData();
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ backgroundColor: '#f5f5f5', color: '#666', borderColor: '#ccc' }}
                >
                  Clear All Data
                </button>
              </div>
            </div>
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
          <div className="header-text">
            <h1>ePSA</h1>
            <h2>Prostate‑Specific Awareness</h2>
            <p className="subtitle">A Non‑Validated Educational Risk Tool</p>
          </div>
          <div className="header-actions">
            <div className="stage-indicator">
              {stage === 'pre' ? (
                <span className="stage-badge stage-pre">Stage 1: Screening Priority</span>
              ) : (
                <span className="stage-badge stage-post">Stage 2: Risk Assessment</span>
              )}
            </div>
            {user && (
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            )}
          </div>
        </header>

        {stage === 'pre' && currentStep < 3 && (
          <StepNavigation
            currentStep={currentStep}
            totalSteps={2}
            onStepClick={(step) => {
              if (step <= currentStep) {
                setCurrentStep(step);
              }
            }}
            stepLabels={PRE_STEPS.slice(0, 2).map(s => s.label)}
          />
        )}

        {stage === 'post' && currentStep < 3 && (
          <StepNavigation
            currentStep={currentStep}
            totalSteps={2}
            onStepClick={(step) => {
              if (step <= currentStep) {
                setCurrentStep(step);
              }
            }}
            stepLabels={POST_STEPS.slice(0, 2).map(s => s.label)}
          />
        )}

        {stage === 'pre' && renderPreStage()}
        {stage === 'post' && renderPostStage()}
      </div>
    </div>
  );
}

export default App;
