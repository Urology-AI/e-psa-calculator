import React from 'react';
import ErrorReportPanel from './ErrorReportPanel';
import { recordError } from '../utils/errorReport';

/**
 * Top-level boundary. Same recovery actions as the shared one, plus the error
 * is saved to the local error report and shown on the crash screen so a
 * crash between Part 1 and Part 2 always leaves something to send back.
 */
class AppErrorBoundary extends React.Component {
  state = { hasError: false, showReport: true };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    recordError('react.render', error, { componentStack: String(info?.componentStack || '').slice(0, 800) });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const btn = { padding: '0.625rem 1.25rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem' };
    return (
      <div role="alert" style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: '#4b5563', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          ePSA hit an unexpected error. Your answers may not have been kept. The details are saved
          below so you can send them to the team.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => window.location.reload()} style={{ ...btn, background: '#1a5c86', color: '#fff', border: 'none' }}>Reload page</button>
          <button type="button" onClick={() => this.setState({ hasError: false })} style={{ ...btn, background: 'transparent', color: '#374151', border: '1px solid #d1d5db' }}>Try to continue</button>
        </div>
        {this.state.showReport && <ErrorReportPanel />}
      </div>
    );
  }
}

export default AppErrorBoundary;
