import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', padding: 20, textAlign: 'center'
        }}>
          <AlertTriangle size={64} style={{ color: 'var(--color-danger)', marginBottom: 20 }} />
          <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', marginBottom: 10 }}>Something went wrong</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 30, maxWidth: 400 }}>
            We encountered an unexpected error. Our engineering team has been notified.
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '12px 24px' }}>
              <RefreshCw size={18} style={{ marginRight: 8 }} /> Try Again
            </button>
            <button onClick={() => window.location.href = '/'} className="btn-secondary" style={{ padding: '12px 24px' }}>
              <Home size={18} style={{ marginRight: 8 }} /> Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
