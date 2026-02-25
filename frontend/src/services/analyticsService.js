/**
 * ePSA Analytics & Insights System
 * Tracks calculator usage, outcomes, and model performance
 * Provides data-driven insights for calculator optimization
 */

import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Analytics event types
export const ANALYTICS_EVENTS = {
  CALCULATOR_USED: 'calculator_used',
  PART1_COMPLETED: 'part1_completed',
  PART2_COMPLETED: 'part2_completed',
  RESULTS_VIEWED: 'results_viewed',
  EXPORT_USED: 'export_used',
  PRINT_USED: 'print_used',
  BIOPSY_REFERRED: 'biopsy_referred',
  FOLLOW_UP_SCHEDULED: 'follow_up_scheduled'
};

// Track calculator usage
export const trackCalculatorUsage = async (userId, eventType, data = {}) => {
  try {
    await addDoc(collection(db, 'analytics', 'calculator_usage', 'events'), {
      userId,
      eventType,
      timestamp: Timestamp.now(),
      data,
      sessionId: data.sessionId || generateSessionId()
    });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    // Store locally if Firebase fails
    storeLocalAnalytics(userId, eventType, data);
  }
};

// Track outcome data (when biopsy results come in)
export const trackOutcome = async (patientId, predictedRisk, actualOutcome, clinicalData) => {
  try {
    await addDoc(collection(db, 'analytics', 'outcomes', 'records'), {
      patientId,
      predictedRisk,
      actualOutcome, // 'cancer_detected', 'no_cancer', 'pending'
      clinicalData,
      timestamp: Timestamp.now(),
      modelVersion: clinicalData.modelVersion || '1.0.0'
    });
  } catch (error) {
    console.error('Error tracking outcome:', error);
  }
};

// Store analytics locally if Firebase unavailable
const storeLocalAnalytics = (userId, eventType, data) => {
  const events = JSON.parse(localStorage.getItem('epsa_analytics_queue') || '[]');
  events.push({
    userId,
    eventType,
    timestamp: new Date().toISOString(),
    data
  });
  localStorage.setItem('epsa_analytics_queue', JSON.stringify(events));
};

// Generate unique session ID
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Get insights dashboard data
export const getInsightsData = async (timeRange = '30d') => {
  try {
    // Query usage data
    const usageQuery = query(
      collection(db, 'analytics', 'calculator_usage', 'events'),
      where('timestamp', '>=', getTimeRangeStart(timeRange)),
      orderBy('timestamp', 'desc'),
      limit(10000)
    );
    
    const usageSnapshot = await getDocs(usageQuery);
    const usageData = usageSnapshot.docs.map(doc => doc.data());
    
    // Query outcome data
    const outcomeQuery = query(
      collection(db, 'analytics', 'outcomes', 'records'),
      where('timestamp', '>=', getTimeRangeStart(timeRange)),
      orderBy('timestamp', 'desc'),
      limit(10000)
    );
    
    const outcomeSnapshot = await getDocs(outcomeQuery);
    const outcomeData = outcomeSnapshot.docs.map(doc => doc.data());
    
    return calculateInsights(usageData, outcomeData);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return null;
  }
};

// Calculate time range start
const getTimeRangeStart = (range) => {
  const now = new Date();
  switch (range) {
    case '7d': return Timestamp.fromDate(new Date(now - 7 * 24 * 60 * 60 * 1000));
    case '30d': return Timestamp.fromDate(new Date(now - 30 * 24 * 60 * 60 * 1000));
    case '90d': return Timestamp.fromDate(new Date(now - 90 * 24 * 60 * 60 * 1000));
    case '1y': return Timestamp.fromDate(new Date(now - 365 * 24 * 60 * 60 * 1000));
    default: return Timestamp.fromDate(new Date(now - 30 * 24 * 60 * 60 * 1000));
  }
};

// Calculate comprehensive insights
const calculateInsights = (usageData, outcomeData) => {
  return {
    usage: calculateUsageMetrics(usageData),
    outcomes: calculateOutcomeMetrics(outcomeData),
    modelPerformance: calculateModelPerformance(outcomeData),
    trends: calculateTrends(usageData, outcomeData),
    recommendations: generateRecommendations(usageData, outcomeData)
  };
};

// Usage metrics
const calculateUsageMetrics = (usageData) => {
  const totalUses = usageData.length;
  const uniqueUsers = new Set(usageData.map(u => u.userId)).size;
  const part1Completions = usageData.filter(u => u.eventType === ANALYTICS_EVENTS.PART1_COMPLETED).length;
  const part2Completions = usageData.filter(u => u.eventType === ANALYTICS_EVENTS.PART2_COMPLETED).length;
  
  // Calculate conversion rates
  const part1ToPart2Rate = part1Completions > 0 ? (part2Completions / part1Completions * 100).toFixed(1) : 0;
  
  // Time distribution
  const hourlyDistribution = {};
  usageData.forEach(u => {
    const hour = new Date(u.timestamp.toDate()).getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
  });
  
  return {
    totalUses,
    uniqueUsers,
    part1Completions,
    part2Completions,
    part1ToPart2Rate: `${part1ToPart2Rate}%`,
    hourlyDistribution,
    avgSessionDuration: calculateAvgSessionDuration(usageData)
  };
};

// Outcome metrics
const calculateOutcomeMetrics = (outcomeData) => {
  const totalOutcomes = outcomeData.length;
  const cancerDetected = outcomeData.filter(o => o.actualOutcome === 'cancer_detected').length;
  const noCancer = outcomeData.filter(o => o.actualOutcome === 'no_cancer').length;
  const pending = outcomeData.filter(o => o.actualOutcome === 'pending').length;
  
  return {
    totalOutcomes,
    cancerDetected,
    noCancer,
    pending,
    cancerRate: totalOutcomes > 0 ? (cancerDetected / totalOutcomes * 100).toFixed(1) : 0,
    avgPredictedRisk: outcomeData.length > 0 
      ? (outcomeData.reduce((sum, o) => sum + o.predictedRisk, 0) / outcomeData.length).toFixed(1)
      : 0
  };
};

// Model performance metrics
const calculateModelPerformance = (outcomeData) => {
  if (outcomeData.length === 0) return null;
  
  // Calculate confusion matrix
  const truePositives = outcomeData.filter(o => o.predictedRisk >= 20 && o.actualOutcome === 'cancer_detected').length;
  const falsePositives = outcomeData.filter(o => o.predictedRisk >= 20 && o.actualOutcome === 'no_cancer').length;
  const trueNegatives = outcomeData.filter(o => o.predictedRisk < 20 && o.actualOutcome === 'no_cancer').length;
  const falseNegatives = outcomeData.filter(o => o.predictedRisk < 20 && o.actualOutcome === 'cancer_detected').length;
  
  const total = truePositives + falsePositives + trueNegatives + falseNegatives;
  
  return {
    confusionMatrix: { truePositives, falsePositives, trueNegatives, falseNegatives },
    sensitivity: (truePositives + falseNegatives) > 0 
      ? (truePositives / (truePositives + falseNegatives) * 100).toFixed(1) 
      : 0,
    specificity: (trueNegatives + falsePositives) > 0 
      ? (trueNegatives / (trueNegatives + falsePositives) * 100).toFixed(1) 
      : 0,
    ppv: (truePositives + falsePositives) > 0 
      ? (truePositives / (truePositives + falsePositives) * 100).toFixed(1) 
      : 0,
    npv: (trueNegatives + falseNegatives) > 0 
      ? (trueNegatives / (trueNegatives + falseNegatives) * 100).toFixed(1) 
      : 0,
    accuracy: total > 0 
      ? ((truePositives + trueNegatives) / total * 100).toFixed(1) 
      : 0,
    calibrationSlope: calculateCalibration(outcomeData).slope,
    calibrationIntercept: calculateCalibration(outcomeData).intercept,
    brierScore: calculateBrierScore(outcomeData),
    auc: calculateAUC(outcomeData)
  };
};

// Calculate calibration (predicted vs observed)
const calculateCalibration = (outcomeData) => {
  if (outcomeData.length < 10) return { slope: 1, intercept: 0 };
  
  // Group by predicted risk deciles
  const deciles = {};
  outcomeData.forEach(o => {
    const decile = Math.floor(o.predictedRisk / 10);
    if (!deciles[decile]) deciles[decile] = { predicted: [], actual: [] };
    deciles[decile].predicted.push(o.predictedRisk);
    deciles[decile].actual.push(o.actualOutcome === 'cancer_detected' ? 1 : 0);
  });
  
  // Calculate observed vs predicted for each decile
  const points = Object.values(deciles).map(d => ({
    predicted: d.predicted.reduce((a, b) => a + b, 0) / d.predicted.length,
    observed: d.actual.reduce((a, b) => a + b, 0) / d.actual.length * 100
  }));
  
  // Simple linear regression for calibration slope and intercept
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.predicted, 0);
  const sumY = points.reduce((sum, p) => sum + p.observed, 0);
  const sumXY = points.reduce((sum, p) => sum + p.predicted * p.observed, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.predicted * p.predicted, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope: slope.toFixed(3), intercept: intercept.toFixed(3) };
};

// Calculate Brier score
const calculateBrierScore = (outcomeData) => {
  if (outcomeData.length === 0) return 0;
  
  const scores = outcomeData.map(o => {
    const predicted = o.predictedRisk / 100;
    const actual = o.actualOutcome === 'cancer_detected' ? 1 : 0;
    return Math.pow(predicted - actual, 2);
  });
  
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3);
};

// Calculate AUC (simplified using trapezoidal rule)
const calculateAUC = (outcomeData) => {
  if (outcomeData.length < 10) return 0.5;
  
  // Sort by predicted risk
  const sorted = [...outcomeData].sort((a, b) => b.predictedRisk - a.predictedRisk);
  
  const positives = sorted.filter(o => o.actualOutcome === 'cancer_detected').length;
  const negatives = sorted.filter(o => o.actualOutcome === 'no_cancer').length;
  
  if (positives === 0 || negatives === 0) return 0.5;
  
  let auc = 0;
  let tp = 0;
  let fp = 0;
  
  sorted.forEach(o => {
    if (o.actualOutcome === 'cancer_detected') {
      tp++;
    } else {
      fp++;
      auc += tp;
    }
  });
  
  return (auc / (positives * negatives)).toFixed(3);
};

// Calculate trends over time
const calculateTrends = (usageData, outcomeData) => {
  // Group by week
  const weeklyData = {};
  
  usageData.forEach(u => {
    const week = getWeekKey(new Date(u.timestamp.toDate()));
    if (!weeklyData[week]) weeklyData[week] = { usage: 0, outcomes: [] };
    weeklyData[week].usage++;
  });
  
  outcomeData.forEach(o => {
    const week = getWeekKey(new Date(o.timestamp.toDate()));
    if (!weeklyData[week]) weeklyData[week] = { usage: 0, outcomes: [] };
    weeklyData[week].outcomes.push(o);
  });
  
  return Object.entries(weeklyData).map(([week, data]) => ({
    week,
    usage: data.usage,
    cancerRate: data.outcomes.length > 0 
      ? (data.outcomes.filter(o => o.actualOutcome === 'cancer_detected').length / data.outcomes.length * 100).toFixed(1)
      : null,
    avgPredictedRisk: data.outcomes.length > 0
      ? (data.outcomes.reduce((sum, o) => sum + o.predictedRisk, 0) / data.outcomes.length).toFixed(1)
      : null
  })).sort((a, b) => a.week.localeCompare(b.week));
};

const getWeekKey = (date) => {
  const year = date.getFullYear();
  const week = Math.floor((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

// Generate recommendations based on data
const generateRecommendations = (usageData, outcomeData) => {
  const recommendations = [];
  
  // Check model calibration
  const performance = calculateModelPerformance(outcomeData);
  if (performance && parseFloat(performance.calibrationSlope) < 0.8 || parseFloat(performance.calibrationSlope) > 1.2) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      message: `Model miscalibration detected (slope: ${performance.calibrationSlope}). Consider recalibrating weights.`,
      action: 'Review calculator configuration'
    });
  }
  
  // Check conversion rate
  const usage = calculateUsageMetrics(usageData);
  if (parseFloat(usage.part1ToPart2Rate) < 30) {
    recommendations.push({
      type: 'info',
      priority: 'medium',
      message: `Low Part 1 to Part 2 conversion (${usage.part1ToPart2Rate}). Users may be dropping off.`,
      action: 'Review user flow and friction points'
    });
  }
  
  // Check sensitivity
  if (performance && parseFloat(performance.sensitivity) < 70) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      message: `Low sensitivity (${performance.sensitivity}%). Model may be missing high-risk patients.`,
      action: 'Lower risk thresholds or adjust weights'
    });
  }
  
  // Check data volume
  if (outcomeData.length < 50) {
    recommendations.push({
      type: 'info',
      priority: 'low',
      message: `Limited outcome data (${outcomeData.length} records). Need more biopsy follow-up data for validation.`,
      action: 'Encourage clinicians to report outcomes'
    });
  }
  
  return recommendations;
};

// Calculate average session duration
const calculateAvgSessionDuration = (usageData) => {
  // Group by session
  const sessions = {};
  usageData.forEach(u => {
    const sid = u.data?.sessionId || 'unknown';
    if (!sessions[sid]) sessions[sid] = [];
    sessions[sid].push(new Date(u.timestamp.toDate()));
  });
  
  // Calculate duration for each session
  let totalDuration = 0;
  let sessionCount = 0;
  
  Object.values(sessions).forEach(times => {
    if (times.length >= 2) {
      const duration = Math.max(...times) - Math.min(...times);
      totalDuration += duration;
      sessionCount++;
    }
  });
  
  return sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000 / 60) : 0; // minutes
};

// Export analytics data for external analysis
export const exportAnalyticsData = async (format = 'csv') => {
  try {
    const insights = await getInsightsData('1y');
    
    if (format === 'csv') {
      return convertToCSV(insights);
    } else if (format === 'json') {
      return JSON.stringify(insights, null, 2);
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    return null;
  }
};

const convertToCSV = (data) => {
  // Simplified CSV conversion
  const rows = [
    ['Metric', 'Value'],
    ['Total Uses', data.usage?.totalUses || 0],
    ['Cancer Rate', data.outcomes?.cancerRate || 0],
    ['Sensitivity', data.modelPerformance?.sensitivity || 0],
    ['Specificity', data.modelPerformance?.specificity || 0],
    ['AUC', data.modelPerformance?.auc || 0],
    ['Calibration Slope', data.modelPerformance?.calibrationSlope || 0]
  ];
  
  return rows.map(row => row.join(',')).join('\n');
};

export default {
  trackCalculatorUsage,
  trackOutcome,
  getInsightsData,
  exportAnalyticsData,
  ANALYTICS_EVENTS
};
