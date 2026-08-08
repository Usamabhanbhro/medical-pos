import Dashboard from './dashboards';
import Login from './login/login';
import { useAuth } from './context/use_auth';
import TitlebarButtons from './components/TitlebarButtons';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-xl">Loading...</div>;
  }
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 titlebar flex items-center justify-end bg-white shadow-sm">
        <TitlebarButtons />
      </div>
      {user ? <Dashboard userType={user.user_type === 'admin' ? 'admin' : 'user'} /> : <Login />}
    </>
  );
}
