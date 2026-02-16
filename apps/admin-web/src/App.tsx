import { type CSSProperties, type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import {
  analyticsToday,
  createAnnouncement,
  createPlan,
  listAnnouncements,
  deletePlan,
  bulkImportPlans,
  plans,
  type AdminAnalyticsToday,
  type AdminPlan,
  type AdminPlanTestament,
  type BulkImportPlansResult,
  type AdminUser,
  type AdminUserStatus,
  updatePlan,
  usersByStatus,
} from './api/admin';
import { login, logout, me } from './api/auth';
import { ApiError, User } from './api/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type PlanFormValues = {
  date: string;
  testament: AdminPlanTestament;
  book: string;
  chapter: string;
};

type BulkImportJsonEntry = {
  date: string;
  testament: AdminPlanTestament;
  book: string;
  chapter: number;
};

const BULK_IMPORT_FAILURE_PREVIEW_COUNT = 8;

const BULK_PLAN_TEMPLATE = JSON.stringify(
  {
    _comment: 'Bulk reading plan template. Set startDate and add one object per day in entries.',
    _commentEntryShape:
      'Each entry should look like: { "date": "YYYY-MM-DD", "testament": "old|new", "book": "Book Name", "chapter": 1 }',
    startDate: 'YYYY-MM-DD',
    entries: [],
  },
  null,
  2,
);

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
      <Route
        path="/plans"
        element={
          <ProtectedRoute authStatus={authStatus}>
            <PlansPage user={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute authStatus={authStatus}>
            <AnnouncementsPage user={currentUser} onLogout={handleLogout} />
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
      <PageHeader user={user} onLogout={onLogout} title="Admin Dashboard" />

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

function PlansPage({ user, onLogout }: { user: User | null; onLogout: () => void }): JSX.Element {
  const [fromDate, setFromDate] = useState(getTodayDateInputValue());
  const [toDate, setToDate] = useState(getTodayDateInputValue());
  const [plansList, setPlansList] = useState<AdminPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [createValues, setCreateValues] = useState<PlanFormValues>(defaultPlanFormValues());
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [editValues, setEditValues] = useState<PlanFormValues>(defaultPlanFormValues());
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportPlansResult | null>(null);
  const [failurePreview, setFailurePreview] = useState<Array<{ date: string; reason: string }>>([]);

  const loadPlans = async (): Promise<void> => {
    if (!fromDate || !toDate) {
      setPlansError('From and To dates are required.');
      return;
    }

    setLoadingPlans(true);
    setPlansError(null);

    try {
      const data = await plans(fromDate, toDate);
      setPlansList(data);
    } catch (error) {
      if (error instanceof ApiError) {
        setPlansError(error.message);
      } else {
        setPlansError('Failed to load plans.');
      }
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const parsed = parseAndValidatePlanValues(createValues);

    if (!parsed.ok) {
      setCreateError(parsed.error);
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      await createPlan(parsed.data);
      setCreateValues(defaultPlanFormValues());
      await loadPlans();
    } catch (error) {
      if (error instanceof ApiError) {
        setCreateError(error.message);
      } else {
        setCreateError('Failed to create plan.');
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  const beginEdit = (plan: AdminPlan): void => {
    setEditingPlan(plan);
    setEditValues({
      date: plan.date,
      testament: plan.testament,
      book: plan.book,
      chapter: String(plan.chapter),
    });
    setEditError(null);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!editingPlan) {
      return;
    }

    const parsed = parseAndValidatePlanValues(editValues);

    if (!parsed.ok) {
      setEditError(parsed.error);
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      await updatePlan(editingPlan.id, parsed.data);
      setEditingPlan(null);
      await loadPlans();
    } catch (error) {
      if (error instanceof ApiError) {
        setEditError(error.message);
      } else {
        setEditError('Failed to update plan.');
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (plan: AdminPlan): Promise<void> => {
    const confirmed = window.confirm(`Delete plan for ${plan.book} ${plan.chapter} on ${plan.date}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deletePlan(plan.id);
      await loadPlans();
    } catch (error) {
      if (error instanceof ApiError) {
        setPlansError(error.message);
      } else {
        setPlansError('Failed to delete plan.');
      }
    }
  };

  const handleTemplateLoad = (): void => {
    setImportText(BULK_PLAN_TEMPLATE);
    setImportError(null);
    setImportResult(null);
    setFailurePreview([]);
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      setImportText(fileText);
      setImportError(null);
      setImportResult(null);
      setFailurePreview([]);
    } catch {
      setImportError('Unable to read selected file. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  const handleBulkImportSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const parsed = parseAndValidateBulkImportText(importText);

    if (!parsed.ok) {
      setImportError(parsed.error);
      setImportResult(null);
      setFailurePreview([]);
      return;
    }

    setImportSubmitting(true);
    setImportError(null);

    try {
      const result = await bulkImportPlans(parsed.data.entries);
      setImportResult(result);
      setFailurePreview(buildFailurePreview(parsed.data.entries, result));
      await loadPlans();
    } catch (error) {
      setImportResult(null);
      setFailurePreview([]);
      if (error instanceof ApiError) {
        setImportError(error.message);
      } else {
        setImportError('Bulk import failed. Please try again.');
      }
    } finally {
      setImportSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 1000, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <PageHeader user={user} onLogout={onLogout} title="Reading Plans" />

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Filter plans</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            loadPlans();
          }}
          style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          <label>
            From
            <input required type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} style={{ width: '100%' }} />
          </label>
          <label>
            To
            <input required type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} style={{ width: '100%' }} />
          </label>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button type="submit" disabled={loadingPlans}>
              {loadingPlans ? 'Loading…' : 'Apply filter'}
            </button>
          </div>
        </form>

        {plansError ? <p style={{ color: '#b00020' }}>{plansError}</p> : null}

        <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: 8, marginTop: '0.75rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={tableHeaderStyle}>Date</th>
                <th style={tableHeaderStyle}>Testament</th>
                <th style={tableHeaderStyle}>Book</th>
                <th style={tableHeaderStyle}>Chapter</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plansList.length === 0 ? (
                <tr>
                  <td style={emptyCellStyle} colSpan={5}>
                    No plans found in this range.
                  </td>
                </tr>
              ) : (
                plansList.map((plan) => (
                  <tr key={plan.id}>
                    <td style={tableCellStyle}>{plan.date}</td>
                    <td style={tableCellStyle}>{plan.testament}</td>
                    <td style={tableCellStyle}>{plan.book}</td>
                    <td style={tableCellStyle}>{plan.chapter}</td>
                    <td style={tableCellStyle}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => beginEdit(plan)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(plan)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Bulk import plans</h2>
        <form onSubmit={handleBulkImportSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleTemplateLoad}>
              Load template
            </button>
            <label style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
              Upload JSON
              <input type="file" accept="application/json,.json" onChange={handleImportFileChange} />
            </label>
          </div>
          <label>
            Import JSON
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder='{"entries": [{"date":"2026-01-15","testament":"new","book":"Matthew","chapter":5}]}'
              rows={14}
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </label>
          <div>
            <button type="submit" disabled={importSubmitting}>
              {importSubmitting ? 'Importing…' : 'Import plans'}
            </button>
          </div>
        </form>

        {importError ? <p style={{ color: '#b00020' }}>{importError}</p> : null}

        {importResult ? (
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ marginBottom: '0.5rem' }}>
              Inserted: <strong>{importResult.insertedCount}</strong> · Updated: <strong>{importResult.updatedCount}</strong> · Failed:{' '}
              <strong>{importResult.failedCount}</strong>
            </p>
            {failurePreview.length > 0 ? (
              <>
                <p style={{ marginBottom: '0.5rem' }}>First {failurePreview.length} failures:</p>
                <ul style={{ marginTop: 0 }}>
                  {failurePreview.map((failure, index) => (
                    <li key={`${failure.date}-${index}`}>
                      <strong>{failure.date}</strong>: {failure.reason}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Create plan</h2>
        <PlanForm
          values={createValues}
          submitLabel={createSubmitting ? 'Creating…' : 'Create'}
          disabled={createSubmitting}
          onChange={setCreateValues}
          onSubmit={handleCreateSubmit}
        />
        {createError ? <p style={{ color: '#b00020' }}>{createError}</p> : null}
      </section>

      {editingPlan ? (
        <section style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Edit plan #{editingPlan.id}</h2>
          <PlanForm
            values={editValues}
            submitLabel={editSubmitting ? 'Saving…' : 'Save changes'}
            disabled={editSubmitting}
            onChange={setEditValues}
            onSubmit={handleEditSubmit}
          />
          <div style={{ marginTop: '0.75rem' }}>
            <button type="button" onClick={() => setEditingPlan(null)}>
              Cancel
            </button>
          </div>
          {editError ? <p style={{ color: '#b00020' }}>{editError}</p> : null}
        </section>
      ) : null}
    </main>
  );
}


function AnnouncementsPage({ user, onLogout }: { user: User | null; onLogout: () => void }): JSX.Element {
  const [items, setItems] = useState<Array<{ id: number; title: string; body: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAnnouncements = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const data = await listAnnouncements();
      setItems(data);
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message);
      } else {
        setError('Failed to load announcements.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      setSubmitError('Title is required.');
      return;
    }

    if (trimmedTitle.length > 140) {
      setSubmitError('Title must be 140 characters or fewer.');
      return;
    }

    if (!trimmedBody) {
      setSubmitError('Body is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createAnnouncement({ title: trimmedTitle, body: trimmedBody });
      setTitle('');
      setBody('');
      await loadAnnouncements();
    } catch (submitErr) {
      if (submitErr instanceof ApiError) {
        setSubmitError(submitErr.message);
      } else {
        setSubmitError('Failed to create announcement.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <PageHeader user={user} onLogout={onLogout} title="Announcements" />

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Create announcement</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <label>
            Title
            <input
              required
              maxLength={140}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Body
            <textarea
              required
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              style={{ width: '100%' }}
            />
          </label>
          <div>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create announcement'}
            </button>
          </div>
        </form>
        {submitError ? <p style={{ color: '#b00020' }}>{submitError}</p> : null}
      </section>

      <section style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Latest announcements</h2>
          <button type="button" onClick={() => void loadAnnouncements()} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? <p>Loading announcements…</p> : null}
        {error ? <p style={{ color: '#b00020' }}>{error}</p> : null}

        {!loading && !error ? (
          items.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {items.map((item) => (
                <article key={item.id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '0.75rem' }}>
                  <h3 style={{ margin: '0 0 0.35rem' }}>{item.title}</h3>
                  <small style={{ color: '#666' }}>{formatDate(item.created_at)}</small>
                  <p style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{item.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>No announcements yet.</p>
          )
        ) : null}
      </section>
    </main>
  );
}

function PlanForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  disabled,
}: {
  values: PlanFormValues;
  onChange: (next: PlanFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  submitLabel: string;
  disabled: boolean;
}): JSX.Element {
  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
    >
      <label>
        Date
        <input
          required
          type="date"
          value={values.date}
          onChange={(event) => onChange({ ...values, date: event.target.value })}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        Testament
        <select
          required
          value={values.testament}
          onChange={(event) => onChange({ ...values, testament: event.target.value as AdminPlanTestament })}
          style={{ width: '100%' }}
        >
          <option value="old">Old</option>
          <option value="new">New</option>
        </select>
      </label>
      <label>
        Book
        <input
          required
          type="text"
          value={values.book}
          onChange={(event) => onChange({ ...values, book: event.target.value })}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        Chapter
        <input
          required
          min={1}
          type="number"
          value={values.chapter}
          onChange={(event) => onChange({ ...values, chapter: event.target.value })}
          style={{ width: '100%' }}
        />
      </label>
      <div style={{ display: 'flex', alignItems: 'end' }}>
        <button type="submit" disabled={disabled}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function PageHeader({ user, onLogout, title }: { user: User | null; onLogout: () => void; title: string }): JSX.Element {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.35rem' }}>{title}</h1>
        <p style={{ marginTop: 0 }}>Welcome {user?.name ?? 'admin'}.</p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Link to="/">Dashboard</Link>
        <Link to="/plans">Plans</Link>
        <Link to="/announcements">Announcements</Link>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

function parseAndValidatePlanValues(
  values: PlanFormValues,
): { ok: true; data: { date: string; testament: AdminPlanTestament; book: string; chapter: number } } | { ok: false; error: string } {
  const trimmedBook = values.book.trim();
  const chapter = Number(values.chapter);

  if (!values.date) {
    return { ok: false, error: 'Date is required.' };
  }

  if (!trimmedBook) {
    return { ok: false, error: 'Book is required.' };
  }

  if (!['old', 'new'].includes(values.testament)) {
    return { ok: false, error: 'Testament must be either old or new.' };
  }

  if (!Number.isInteger(chapter) || chapter <= 0) {
    return { ok: false, error: 'Chapter must be a number greater than 0.' };
  }

  return {
    ok: true,
    data: {
      date: values.date,
      testament: values.testament,
      book: trimmedBook,
      chapter,
    },
  };
}

function parseAndValidateBulkImportText(
  rawText: string,
): { ok: true; data: { entries: BulkImportJsonEntry[] } } | { ok: false; error: string } {
  if (!rawText.trim()) {
    return { ok: false, error: 'Please paste JSON or upload a .json file.' };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawText);
  } catch {
    return { ok: false, error: 'Invalid JSON. Please check syntax and try again.' };
  }

  if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    return { ok: false, error: 'JSON root must be an object with an entries array.' };
  }

  const entries = (parsedValue as { entries?: unknown }).entries;

  if (!Array.isArray(entries)) {
    return { ok: false, error: 'entries must be an array.' };
  }

  const normalizedEntries: BulkImportJsonEntry[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { ok: false, error: `Entry #${index + 1} must be an object.` };
    }

    const rawDate = String((entry as { date?: unknown }).date ?? '');
    const rawTestament = String((entry as { testament?: unknown }).testament ?? '');
    const rawBook = String((entry as { book?: unknown }).book ?? '');
    const rawChapter = (entry as { chapter?: unknown }).chapter;

    const chapter = typeof rawChapter === 'number' ? rawChapter : Number(rawChapter);
    const validated = parseAndValidatePlanValues({
      date: rawDate,
      testament: rawTestament as AdminPlanTestament,
      book: rawBook,
      chapter: String(chapter),
    });

    if (!validated.ok) {
      return { ok: false, error: `Entry #${index + 1}: ${validated.error}` };
    }

    normalizedEntries.push(validated.data);
  }

  return { ok: true, data: { entries: normalizedEntries } };
}

function buildFailurePreview(
  entries: BulkImportJsonEntry[],
  result: BulkImportPlansResult,
): Array<{ date: string; reason: string }> {
  return result.failures.slice(0, BULK_IMPORT_FAILURE_PREVIEW_COUNT).map((failure) => {
    const sourceEntry = entries[failure.index];
    const reason = failure.issues.map((issue) => `${issue.field}: ${issue.issue}`).join('; ');

    return {
      date: sourceEntry?.date ?? `Entry #${failure.index + 1}`,
      reason: reason || 'Unknown validation issue.',
    };
  });
}

function defaultPlanFormValues(): PlanFormValues {
  return {
    date: getTodayDateInputValue(),
    testament: 'old',
    book: '',
    chapter: '1',
  };
}

function getTodayDateInputValue(): string {
  return new Date().toISOString().split('T')[0] ?? '';
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

const panelStyle: CSSProperties = {
  border: '1px solid #d8d8d8',
  borderRadius: 8,
  padding: '1rem',
  marginTop: '1rem',
  backgroundColor: '#fafafa',
};

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
