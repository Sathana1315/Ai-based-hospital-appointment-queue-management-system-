import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy load routes for performance optimization
const ChatBot = lazy(() => import('./components/ChatBot'));
const Login = lazy(() => import('./pages/Login'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const ReceptionistDashboard = lazy(() => import('./pages/ReceptionistDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const FallbackLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#fff' }}>
    <Loader2 size={40} className="animate-spin" style={{ color: '#06b6d4', marginBottom: 12 }} />
    <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Loading component...</span>
  </div>
);

const AppContent = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#fff',
        fontFamily: 'sans-serif',
        gap: 12
      }}>
        <Loader2 size={40} className="animate-spin" style={{ color: '#06b6d4' }} />
        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Loading Q-Med Dashboard...</span>
      </div>
    );
  }

  if (!token || !user) return <Login />;

  const renderDashboard = () => {
    switch (user.role) {
      case 'doctor':        return <DoctorDashboard />;
      case 'receptionist':  return <ReceptionistDashboard />;
      case 'admin':         return <AdminDashboard />;
      case 'patient':
      case 'guest':
      default:              return <PatientDashboard />;
    }
  };

  return (
    <Layout>
      {renderDashboard()}
      {(user.role === 'patient' || user.role === 'guest') && <ChatBot />}
    </Layout>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <WebSocketProvider>
            <Suspense fallback={<FallbackLoader />}>
              <AppContent />
            </Suspense>
          </WebSocketProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
