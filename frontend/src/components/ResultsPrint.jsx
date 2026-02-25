import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './ResultsPrint.css';

const ResultsPrint = ({ result, formData, onBack }) => {
  const resultsRef = useRef(null);

  const handlePrint = async () => {
    if (!resultsRef.current) return;

    try {
      // Show loading state
      const printButton = document.querySelector('.btn-print-results');
      const originalText = printButton.textContent;
      printButton.textContent = 'Generating PDF...';
      printButton.disabled = true;

      // Convert results to canvas
      const canvas = await html2canvas(resultsRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: resultsRef.current.scrollWidth,
        height: resultsRef.current.scrollHeight,
        windowWidth: resultsRef.current.scrollWidth,
        windowHeight: resultsRef.current.scrollHeight,
        allowTaint: false,
        removeContainer: false,
      });

      // Create PDF in portrait with margins
      const pdfWidth = 8.5; // inches (portrait letter width)
      const pdfHeight = 11; // inches (portrait letter height)
      const margin = 0.2; // 0.2 inch margin on all sides
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);
      
      // Calculate scaling to fit content within margins
      const scaleX = contentWidth / canvas.width;
      const scaleY = contentHeight / canvas.height;
      const scale = Math.min(scaleX, scaleY);
      
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      
      const pdf = new jsPDF('portrait', 'in', 'letter');
      
      // Add image to PDF with margins
      const x = margin;
      const y = margin;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgWidth, imgHeight);
      
      // Save the PDF
      pdf.save('epsa-results.pdf');

      // Restore button
      printButton.textContent = originalText;
      printButton.disabled = false;

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
      const printButton = document.querySelector('.btn-print-results');
      printButton.textContent = 'Print Results';
      printButton.disabled = false;
    }
  };

  if (!result || !formData) {
    return (
      <div className="results-print-container">
        <p>No results available.</p>
      </div>
    );
  }

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'LOWER': return '#27AE60';
      case 'MODERATE': return '#F39C12';
      case 'HIGHER': return '#E74C3C';
      case 'low-risk': return '#27AE60';
      case 'moderate-risk': return '#F39C12';
      case 'high-risk': return '#D35400';
      case 'very-high-risk': return '#E74C3C';
      default: return '#7F8C8D';
    }
  };

  // Check if this is Part1 or Part2 results
  const isPart2 = result.riskPct !== undefined; // Part2 has riskPct, Part1 has score
  
  // Extract Part2 data if available
  let riskPct = 'N/A', riskCat = 'N/A', riskClass = 'N/A', totalPoints = 0, nextSteps = [];
  if (isPart2) {
    ({ riskPct, riskCat, riskClass, totalPoints, nextSteps } = result);
  }
  
  // Part1 data structure
  const part1Data = isPart2 ? {
    score: formData.score || 0,
    scoreRange: formData.scoreRange || 'N/A',
    confidenceRange: formData.confidenceRange || 'N/A',
    risk: formData.risk || 'N/A',
    color: getRiskColor(formData.risk),
    action: formData.action || 'N/A',
    ipssTotal: formData.ipssTotal || 0,
    shimTotal: formData.shimTotal || 0,
    bmi: formData.bmi || 0,
    age: formData.age || 0
  } : {
    score: result.score || 0,
    scoreRange: result.scoreRange || 'N/A',
    confidenceRange: result.confidenceRange || 'N/A',
    risk: result.risk || 'N/A',
    color: getRiskColor(result.risk || 'N/A'),
    action: result.action || 'N/A',
    ipssTotal: formData.ipssTotal || 0,
    shimTotal: formData.shimTotal || 0,
    bmi: formData.bmi || 0,
    age: formData.age || 0
  };

  const formatAnswer = (value, type) => {
    if (value === null || value === undefined) return 'Not answered';
    
    switch (type) {
      case 'boolean':
        return value === 1 ? 'Yes' : value === 0 ? 'No' : 'Unknown';
      case 'exercise':
        return value === 0 ? 'Regular (3+ days/week)' : value === 1 ? 'Some (1-2 days/week)' : 'None';
      case 'smoking':
        return value === 2 ? 'Current' : value === 1 ? 'Former' : 'Never';
      case 'chemical':
        return value === 'yes' ? 'Yes' : 'No';
      default:
        return value;
    }
  };

  return (
    <div className="results-print-container">
      <div className="print-actions">
        <button className="btn-back" onClick={onBack}>
          ← Back to Results
        </button>
        <button className="btn-print-results" onClick={handlePrint}>
          📄 Print Results PDF
        </button>
      </div>

      <div ref={resultsRef} className="results-print-content">
        {/* Header */}
        <div className="print-header">
          <div className="print-logo">ePSA</div>
          <div className="print-title">Prostate-Specific Awareness — Results</div>
          <div className="print-subtitle">Educational Risk Assessment Results</div>
          <div className="print-date">
            Generated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Main Results */}
        <div className="print-results-section">
          <h2>Your ePSA Results</h2>
          
          {/* Part1 Results */}
          <div className="result-score-card">
            <div className="score-display">
              <div className="score-label">ePSA SCORE</div>
              <div className="score-value" style={{ color: part1Data.color }}>
                {part1Data.score}%
              </div>
              <div className="risk-badge" style={{ background: part1Data.color }}>
                {part1Data.risk} RISK
              </div>
            </div>
          </div>

          <div className="result-details">
            <div className="detail-row">
              <span className="detail-label">Risk Category:</span>
              <span className="detail-value">{part1Data.risk}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Score Range:</span>
              <span className="detail-value">{part1Data.scoreRange}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Confidence Range (±10%):</span>
              <span className="detail-value">{part1Data.confidenceRange}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Age:</span>
              <span className="detail-value">{part1Data.age} years</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">BMI:</span>
              <span className="detail-value">{part1Data.bmi}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">IPSS Score:</span>
              <span className="detail-value">{part1Data.ipssTotal}/35</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">SHIM Score:</span>
              <span className="detail-value">{part1Data.shimTotal}/25</span>
            </div>
          </div>

          <div className="recommendation-box">
            <h3>Recommended Next Step</h3>
            <p className="recommendation-text">{part1Data.action}</p>
          </div>

          {/* Part2 Results - if available */}
          {isPart2 && (
            <div className="part2-results-section">
              <h3>Part 2: Clinical Risk Assessment</h3>
              <div className="result-score-card">
                <div className="score-display">
                  <div className="score-label">CLINICAL RISK</div>
                  <div className="score-value" style={{ color: getRiskColor(riskClass) }}>
                    {riskPct}
                  </div>
                  <div className="risk-badge" style={{ background: getRiskColor(riskClass) }}>
                    {String(riskCat || riskClass).replace(/[🟢🟡🟠🔴]/g, '').trim()}
                  </div>
                </div>
              </div>
              <div className="result-details">
                <div className="detail-row">
                  <span className="detail-label">Risk Category:</span>
                  <span className="detail-value">{riskCat}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Points:</span>
                  <span className="detail-value">{totalPoints}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Next Steps:</span>
                  <span className="detail-value">{Array.isArray(nextSteps) && nextSteps.length ? nextSteps.join(' | ') : 'Discuss with physician'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Answers */}
        <div className="print-answers-section">
          <h2>Your Assessment Answers</h2>
          
          <div className="answers-grid">
            <div className="answer-category">
              <h3>About You</h3>
              <div className="answer-item">
                <span className="answer-question">1. Age:</span>
                <span className="answer-value">{formData.age || 'Not answered'}</span>
              </div>
              <div className="answer-item">
                <span className="answer-question">2. Race/Ethnicity:</span>
                <span className="answer-value">{formData.race || 'Not answered'}</span>
              </div>
            </div>

            <div className="answer-category">
              <h3>Family & Genetic Risk</h3>
              <div className="answer-item">
                <span className="answer-question">3. Family History of Prostate Cancer:</span>
                <span className="answer-value">{formatAnswer(formData.familyHistory, 'boolean')}</span>
              </div>
              <div className="answer-item">
                <span className="answer-question">4. Previous History of Inflammation:</span>
                <span className="answer-value">{formatAnswer(formData.inflammationHistory, 'boolean')}</span>
              </div>
              <div className="answer-item">
                <span className="answer-question">5. Known BRCA1/BRCA2 Mutation:</span>
                <span className="answer-value">{formData.brcaStatus || 'Not answered'}</span>
              </div>
            </div>

            <div className="answer-category">
              <h3>Body Metrics</h3>
              <div className="answer-item">
                <span className="answer-question">6. Height:</span>
                <span className="answer-value">
                  {formData.heightUnit === 'imperial' 
                    ? `${formData.heightFt || '_'} ft ${formData.heightIn || '_'} in`
                    : `${formData.heightCm || '_'} cm`
                  }
                </span>
              </div>
              <div className="answer-item">
                <span className="answer-question">7. Weight:</span>
                <span className="answer-value">
                  {formData.weightUnit === 'lbs' 
                    ? `${formData.weight || '_'} lbs`
                    : `${formData.weightKg || '_'} kg`
                  }
                </span>
              </div>
            </div>

            <div className="answer-category">
              <h3>Lifestyle</h3>
              <div className="answer-item">
                <span className="answer-question">8. Exercise Level:</span>
                <span className="answer-value">{formatAnswer(formData.exercise, 'exercise')}</span>
              </div>
              <div className="answer-item">
                <span className="answer-question">9. Smoking Status:</span>
                <span className="answer-value">{formatAnswer(formData.smoking, 'smoking')}</span>
              </div>
              <div className="answer-item">
                <span className="answer-question">10. Chemical Exposure:</span>
                <span className="answer-value">{formatAnswer(formData.chemicalExposure, 'chemical')}</span>
              </div>
              <div className="answer-item">
                <span className="answer-question">11. Diet Pattern:</span>
                <span className="answer-value">{formData.dietPattern || 'Not answered'}</span>
              </div>
              <div className="answer-item">
                <span className="answer-question">12. Geographic Origin:</span>
                <span className="answer-value">{formData.geographicOrigin || 'Not answered'}</span>
              </div>
            </div>

            <div className="answer-category">
              <h3>Symptom Scores</h3>
              <div className="answer-item">
                <span className="answer-question">IPSS (Urinary Symptoms):</span>
                <span className="answer-value">{part1Data.ipssTotal}/35</span>
              </div>
              <div className="answer-item">
                <span className="answer-question">SHIM (Sexual Health):</span>
                <span className="answer-value">{part1Data.shimTotal}/25</span>
              </div>
            </div>

            {isPart2 && (
              <div className="answer-category">
                <h3>Part 2 Clinical Data</h3>
                <div className="answer-item">
                  <span className="answer-question">PSA (ng/mL):</span>
                  <span className="answer-value">{formData.psa || 'Not answered'}</span>
                </div>
                <div className="answer-item">
                  <span className="answer-question">Know PI-RADS:</span>
                  <span className="answer-value">{formData.knowPirads ? 'Yes' : 'No'}</span>
                </div>
                <div className="answer-item">
                  <span className="answer-question">PI-RADS Score:</span>
                  <span className="answer-value">{formData.knowPirads ? formData.pirads : 'N/A'}</span>
                </div>
                <div className="answer-item">
                  <span className="answer-question">On hormonal therapy:</span>
                  <span className="answer-value">{formData.onHormonalTherapy ? 'Yes' : 'No'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="print-footer">
          <div className="footer-disclaimer">
            <p><strong>Important Disclaimer:</strong> The ePSA (Prostate-Specific Awareness) tool is an educational 
            resource designed to raise awareness about prostate cancer risk factors. It is not a diagnostic tool 
            and should not be used as a substitute for professional medical advice, diagnosis, or treatment.</p>
            <p>Please consult with a qualified healthcare provider for any medical concerns or before making 
            any decisions related to your health.</p>
          </div>
          <div className="footer-info">
            <p>Million Strong Men — ePSA Tool</p>
            <p>Generated on {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPrint;
