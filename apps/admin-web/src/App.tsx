import { FormEvent, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { login, logout, me } from './api/auth';
import { ApiError, User } from './api/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

function AppRoutes(): JSX.Element {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapAuth = async (): Promise<void> => {
      try {
        const user = await me();

        if (user.role !== 'admin') {
          logout();
          setCurrentUser(null);
          setAuthStatus('unauthenticated');
          setForbiddenMessage('Forbidden');
          return;
        }

        setCurrentUser(user);
        setAuthStatus('authenticated');
      } catch {
        setCurrentUser(null);
        setAuthStatus('unauthenticated');
      }
    };

    bootstrapAuth();
  }, []);

  const handleLoginSuccess = (user: User): void => {
    setCurrentUser(user);
    setAuthStatus('authenticated');
    setForbiddenMessage(null);
  };

  const handleLogout = (): void => {
    logout();
    setCurrentUser(null);
    setAuthStatus('unauthenticated');
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage
            authStatus={authStatus}
            onLoginSuccess={handleLoginSuccess}
            forbiddenMessage={forbiddenMessage}
          />
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute authStatus={authStatus}>
            <DashboardPage user={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LoginPage({
  authStatus,
  onLoginSuccess,
  forbiddenMessage,
}: {
  authStatus: AuthStatus;
  onLoginSuccess: (user: User) => void;
  forbiddenMessage: string | null;
}): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(forbiddenMessage);

  useEffect(() => {
    if (forbiddenMessage) {
      setErrorMessage(forbiddenMessage);
    }
  }, [forbiddenMessage]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      const nextPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(nextPath ?? '/', { replace: true });
    }
  }, [authStatus, location.state, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const user = await login({ email, password });

      if (user.role !== 'admin') {
        logout();
        setErrorMessage('Forbidden');
        return;
      }

      onLoginSuccess(user);
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unexpected error. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h1>Admin Login</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <label>
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ width: '100%' }}
          />
        </label>

        <label>
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ width: '100%' }}
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
      {errorMessage ? <p style={{ color: '#b00020' }}>{errorMessage}</p> : null}
    </main>
  );
}

function ProtectedRoute({
  authStatus,
  children,
}: {
  authStatus: AuthStatus;
  children: JSX.Element;
}): JSX.Element {
  const location = useLocation();

  if (authStatus === 'loading') {
    return <p style={{ fontFamily: 'sans-serif', padding: '2rem' }}>Loading…</p>;
  }

  if (authStatus === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function DashboardPage({ user, onLogout }: { user: User | null; onLogout: () => void }): JSX.Element {
  return (
    <main style={{ maxWidth: 720, margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h1>Admin Dashboard (placeholder)</h1>
      <p>Welcome {user?.name ?? 'admin'}.</p>
      <button type="button" onClick={onLogout}>
        Logout
      </button>
    </main>
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
