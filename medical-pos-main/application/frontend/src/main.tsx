
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './dashboards';
import Login from './login/login';
import { AuthProvider, useAuth } from './context/auth_context';
import './index.css';
import TitlebarButtons from './components/TitlebarButtons';

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-xl">Loading...</div>;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 titlebar flex items-center justify-end bg-white shadow-sm">
        <TitlebarButtons />
      </div>
      {user ? (
        <Dashboard userType={user.user_type === 'admin' ? 'admin' : 'user'} />
      ) : (
        <Login />
      )}
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
