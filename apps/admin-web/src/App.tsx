import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { analyticsToday, type AdminAnalyticsToday, type AdminUser, type AdminUserStatus, usersByStatus } from './api/admin';
import { login, logout, me } from './api/auth';
import { ApiError, User } from './api/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

const USER_STATUS_TABS: Array<{ value: AdminUserStatus; label: string }> = [
  { value: 'active', label: 'Active Today' },
  { value: 'missing_today', label: 'Missing Today' },
  { value: 'inactive_7d', label: 'Inactive 7d' },
  { value: 'inactive_14d', label: 'Inactive 14d' },
];

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
  const [analytics, setAnalytics] = useState<AdminAnalyticsToday | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<AdminUserStatus>('active');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async (): Promise<void> => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      try {
        const data = await analyticsToday();
        setAnalytics(data);
      } catch (error) {
        if (error instanceof ApiError) {
          setAnalyticsError(error.message);
        } else {
          setAnalyticsError('Failed to load analytics.');
        }
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  useEffect(() => {
    const loadUsers = async (): Promise<void> => {
      setUsersLoading(true);
      setUsersError(null);

      try {
        const data = await usersByStatus(selectedStatus);
        setUsers(data);
      } catch (error) {
        if (error instanceof ApiError) {
          setUsersError(error.message);
        } else {
          setUsersError('Failed to load users.');
        }
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [selectedStatus]);

  const summary = useMemo(() => {
    const completed = analytics?.completedToday ?? 0;
    const total = analytics?.totalPopulation ?? 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      total,
      completionRate,
      activeToday: analytics?.activeToday ?? 0,
      missingToday: analytics?.missingToday ?? 0,
      inactive7d: analytics?.inactive7d ?? 0,
      inactive14d: analytics?.inactive14d ?? 0,
    };
  }, [analytics]);

  const summaryCards = [
    { label: 'Active Today', value: summary.activeToday },
    { label: 'Missing Today', value: summary.missingToday },
    { label: 'Inactive 7d', value: summary.inactive7d },
    { label: 'Inactive 14d', value: summary.inactive14d },
  ];

  return (
    <main style={{ maxWidth: 1000, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.35rem' }}>Admin Dashboard</h1>
          <p style={{ marginTop: 0 }}>Welcome {user?.name ?? 'admin'}.</p>
        </div>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <section
        style={{
          border: '1px solid #d8d8d8',
          borderRadius: 8,
          padding: '1rem',
          marginTop: '1rem',
          backgroundColor: '#fafafa',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Today completion rate</h2>

        {analyticsLoading ? <p>Loading analytics…</p> : null}
        {analyticsError ? <p style={{ color: '#b00020' }}>{analyticsError}</p> : null}

        {!analyticsLoading && !analyticsError ? (
          <>
            <p style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>
              <strong>{summary.completionRate}%</strong> ({summary.completed} / {summary.total})
            </p>
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              }}
            >
              {summaryCards.map((card) => (
                <article
                  key={card.label}
                  style={{ border: '1px solid #e0e0e0', borderRadius: 6, padding: '0.75rem', backgroundColor: '#fff' }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#444' }}>{card.label}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{card.value}</div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>User lists</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          {USER_STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedStatus(tab.value)}
              disabled={usersLoading && selectedStatus === tab.value}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 999,
                border: '1px solid #d0d0d0',
                backgroundColor: selectedStatus === tab.value ? '#111' : '#fff',
                color: selectedStatus === tab.value ? '#fff' : '#111',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {usersLoading ? <p>Loading users…</p> : null}
        {usersError ? <p style={{ color: '#b00020' }}>{usersError}</p> : null}

        {!usersLoading && !usersError ? (
          <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={tableHeaderStyle}>Name</th>
                  <th style={tableHeaderStyle}>Email</th>
                  <th style={tableHeaderStyle}>Role</th>
                  <th style={tableHeaderStyle}>Last Completed</th>
                  <th style={tableHeaderStyle}>Current Streak</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td style={emptyCellStyle} colSpan={5}>
                      No users found for this status.
                    </td>
                  </tr>
                ) : (
                  users.map((listedUser) => (
                    <tr key={listedUser.id}>
                      <td style={tableCellStyle}>{listedUser.name}</td>
                      <td style={tableCellStyle}>{listedUser.email}</td>
                      <td style={tableCellStyle}>{listedUser.role}</td>
                      <td style={tableCellStyle}>{formatDate(listedUser.lastCompletedAt)}</td>
                      <td style={tableCellStyle}>{listedUser.currentStreak ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

const tableHeaderStyle: CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem',
  borderBottom: '1px solid #e0e0e0',
  fontSize: '0.9rem',
};

const tableCellStyle: CSSProperties = {
  padding: '0.75rem',
  borderBottom: '1px solid #efefef',
  fontSize: '0.9rem',
};

const emptyCellStyle: CSSProperties = {
  ...tableCellStyle,
  textAlign: 'center',
};

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
