import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CRM_AUTH_ENDPOINT, CRM_AUTH_ENDPOINT_IS_DEFAULT, getCrmSession, setCrmToken } from '../config/crm';
import { crmHealthCheck, crmLogin } from '../config/crmApi';
import './CrmLogin.css';

const HEALTH_REFRESH_MS = 15000;

const normalizeFeedbackMessage = (value, fallback = '') => {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text || text === '[object Object]') return fallback;
    return text;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  if (value instanceof Error) {
    return normalizeFeedbackMessage(value.message, fallback);
  }

  if (typeof value === 'object') {
    const nestedCandidate = value.message ?? value.error ?? value.detail;
    if (nestedCandidate !== undefined) {
      const nestedText = normalizeFeedbackMessage(nestedCandidate, '');
      if (nestedText) {
        return nestedText;
      }
    }

    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== '{}' && serialized !== '[object Object]') {
        return serialized;
      }
    } catch {
      // Fall through to string coercion.
    }
  }

  const text = String(value).trim();
  if (!text || text === '[object Object]') return fallback;
  return text;
};

const statusCopy = {
  ready: {
    eyebrow: 'Ready for sign in',
    title: 'CRM services online',
    detail: 'Authentication and data services are available. You can sign in now.',
    tone: 'ready',
  },
  checking: {
    eyebrow: 'Checking connection',
    title: 'Verifying CRM availability',
    detail: 'We are confirming the auth service and database before you sign in.',
    tone: 'checking',
  },
  warning: {
    eyebrow: 'Infrastructure notice',
    title: 'CRM services are not ready yet',
    detail: 'The backend is reachable, but the database is still starting or unavailable.',
    tone: 'warning',
  },
  offline: {
    eyebrow: 'Service unreachable',
    title: 'CRM backend cannot be reached',
    detail: 'The browser cannot connect to the CRM API right now.',
    tone: 'offline',
  },
};

const getReturnPath = (location) => location.state?.from?.pathname || '/crm/dashboard';

const classifySubmitError = (error) => {
  const status = Number(error?.status || 0);
  const code = String(error?.code || '');
  const payload = error?.payload || {};

  if (status === 401 || code === 'CRM_INVALID_CREDENTIALS') {
    return {
      tone: 'error',
      title: 'Check the credentials',
      message: 'The email or password did not match the CRM account on file.',
    };
  }

  if (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    status >= 500 ||
    code === 'CRM_AUTH_BOOTING' ||
    code === 'CRM_AUTH_SERVICE_UNAVAILABLE' ||
    code === 'CRM_SERVICE_UNAVAILABLE'
  ) {
    const databaseMessage = normalizeFeedbackMessage(
      payload?.database?.message ||
        payload?.message ||
        'The CRM authentication service is temporarily unavailable. Start the backend and try again.',
      'The CRM authentication service is temporarily unavailable. Start the backend and try again.',
    );

    return {
      tone: 'warning',
      title: 'CRM service unavailable',
      message: databaseMessage,
    };
  }

  if (status === 0 || code === 'CRM_NETWORK_UNAVAILABLE') {
    return {
      tone: 'offline',
      title: 'CRM backend unreachable',
      message:
        'The browser could not reach the CRM service. Check that the API is running, then try again.',
    };
  }

  return {
    tone: 'offline',
    title: 'Unable to sign in',
    message: normalizeFeedbackMessage(
      error?.message || 'The CRM login could not be completed right now.',
      'The CRM login could not be completed right now.',
    ),
  };
};

const CrmLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [connectionState, setConnectionState] = useState({
    key: 'checking',
    checkedAt: '',
    message: statusCopy.checking.detail,
  });

  const session = getCrmSession();
  const returnPath = getReturnPath(location);
  const authEndpointLabel = CRM_AUTH_ENDPOINT;
  const authEndpointCopy = CRM_AUTH_ENDPOINT_IS_DEFAULT
    ? 'Using the local CRM auth route by default. Set VITE_CRM_AUTH_ENDPOINT only when a deployment needs a custom sign-in URL.'
    : 'Custom auth endpoint configured for production-grade sign-in.';

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const refreshHealth = async () => {
      if (!cancelled) {
        setConnectionState((current) => ({
          ...current,
          key: 'checking',
          message: statusCopy.checking.detail,
        }));
      }

      const result = await crmHealthCheck();
      if (cancelled) return;

      const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const payload = result.payload || {};

      if (result.ok) {
        setConnectionState({
          key: 'ready',
          checkedAt: now,
          message: payload?.message || statusCopy.ready.detail,
        });
        if (intervalId) {
          clearInterval(intervalId);
        }
        return;
      }

      if (result.status === 0) {
        setConnectionState({
          key: 'offline',
          checkedAt: now,
          message: statusCopy.offline.detail,
        });
        return;
      }

      const databaseMessage =
        payload?.database?.message ||
        payload?.message ||
        statusCopy.warning.detail;

      setConnectionState({
        key: 'warning',
        checkedAt: now,
        message: databaseMessage,
      });
    };

    void refreshHealth();
    intervalId = window.setInterval(refreshHealth, HEALTH_REFRESH_MS);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [returnPath]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);

    setIsLoading(true);

    try {
      const sessionResponse = await crmLogin({
        email,
        password,
        rememberMe,
      });

      if (sessionResponse?.token) {
        setCrmToken(sessionResponse.token, rememberMe);
      }

      navigate(returnPath, { replace: true });
    } catch (error) {
      setFeedback(classifySubmitError(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (session) {
    return <Navigate to={returnPath} replace />;
  }

  const status = statusCopy[connectionState.key] || statusCopy.checking;
  const currentFeedback = feedback || null;

  return (
    <section className="crm-login-page">
      <div className="crm-login-ambient crm-login-ambient-left" aria-hidden="true" />
      <div className="crm-login-ambient crm-login-ambient-right" aria-hidden="true" />

      <div className="container crm-login-container">
        <div className="crm-login-layout">
          <aside className="crm-login-story">
            <p className="crm-login-kicker">CRM Access</p>
            <h1>Access the Spa Saloon CRM with calm, secure precision.</h1>
            <p className="crm-login-intro">
              Sign in to manage bookings, leads, payments, and guest follow-up from a polished
              operations workspace designed for premium salon teams.
            </p>

            <ul className="crm-login-benefits" aria-label="CRM access benefits">
              <li>
                <span>01</span>
                <div>
                  <strong>Trusted session handling</strong>
                  <p>
                    Signed tokens persist when you choose to stay signed in and are cleared
                    immediately on logout.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Protected CRM navigation</strong>
                  <p>
                    Unauthorized visits are redirected before the workspace renders, keeping the
                    app predictable and secure.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Clear operational feedback</strong>
                  <p>
                    Credential errors and infrastructure issues are shown separately so the team
                    never has to guess what failed.
                  </p>
                </div>
              </li>
            </ul>

            <div className="crm-login-trust-row" aria-label="Trust signals">
              <span>Postgres-backed</span>
              <span>7-day session support</span>
              <span>Route-protected CRM</span>
            </div>
          </aside>

          <div className="crm-login-panel">
            <div className="crm-login-panel-header">
              <div>
                <p className="crm-login-panel-kicker">Secure sign in</p>
                <h2>Sign in to your workspace</h2>
              </div>

              <span className={`crm-login-state-pill crm-login-state-${status.tone}`}>
                {status.eyebrow}
              </span>
            </div>

            <p className="crm-login-panel-copy">
              Use your admin email to reach live CRM records, workflows, and operational reporting.
            </p>

            <form className="crm-login-form" onSubmit={handleSubmit}>
              <div className="crm-login-field">
                <label htmlFor="crm-email">Work email</label>
                <input
                  id="crm-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              <div className="crm-login-field">
                <label htmlFor="crm-password">Password</label>
                <input
                  id="crm-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="crm-login-row">
                <label className="crm-login-checkbox" htmlFor="crm-remember">
                  <input
                    id="crm-remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  Keep me signed in
                </label>

                <span className="crm-login-session-note">7-day secure token when enabled</span>
              </div>

              <button
                type="submit"
                className="crm-login-button"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in securely'}
              </button>
            </form>

            {currentFeedback ? (
              <div
                className={`crm-login-alert crm-login-alert-${currentFeedback.tone}`}
                role="alert"
                aria-live="polite"
              >
                <strong>{currentFeedback.title}</strong>
                <p>{currentFeedback.message}</p>
              </div>
            ) : null}

            <div className="crm-login-meta-grid">
              <article className="crm-login-meta-card">
                <span>Connection</span>
                <strong>{status.title}</strong>
                <p>
                  {status.detail} {connectionState.checkedAt ? `Last checked at ${connectionState.checkedAt}.` : ''}
                </p>
              </article>

              <article className="crm-login-meta-card">
                <span>Endpoint</span>
                <strong>{authEndpointLabel}</strong>
                <p>{authEndpointCopy}</p>
              </article>
            </div>

            <p className="crm-login-footer-note">
              This login distinguishes credential failure from infrastructure failure so QA and
              front desk teams can trust the message they see.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CrmLogin;
