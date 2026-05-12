import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Fingerprint, KeyRound, Mail, Sparkles } from 'lucide-react';
import { getCrmSession, setCrmToken } from '../config/crm';
import { BRAND_TAGLINE, CRM_NAME, SALON_INITIALS, SALON_NAME } from '../config/brand';
import {
  crmHealthCheck,
  crmLogin,
  getCrmResolvedApiOrigin,
  getCrmResolvedAuthUrl,
} from '../config/crmApi';
import { resolveHazelImage } from '../config/serviceMedia';
import './CrmLogin.css';

const HEALTH_REFRESH_MS = 15000;
const loginVisualImage = resolveHazelImage('facial-skin-care', 'crm-login');

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

const authShortcuts = [
  {
    id: 'biometric',
    icon: Fingerprint,
    label: 'Face ID / Touch ID',
    description: 'Fast sign-in for managed devices and trusted hardware.',
  },
  {
    id: 'sso',
    icon: Sparkles,
    label: 'Enterprise SSO',
    description: 'Google Workspace or Microsoft 365 entry point for teams.',
  },
];

const visualHighlights = [
  {
    title: 'Live bookings',
    text: 'Track appointments, guest flow, and arrival timing from one calm workspace.',
  },
  {
    title: 'Automation-ready',
    text: 'Designed for routing, follow-up, and clean operational handoffs without friction.',
  },
  {
    title: 'Secure access',
    text: 'Session handling and route protection keep the experience predictable and private.',
  },
];

const getReturnPath = (location) => location.state?.from?.pathname || '/crm/dashboard';

const classifySubmitError = (error, resolvedAuthUrl) => {
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
      message: 'The browser could not reach the CRM service. Check that the API is running, then try again.',
    };
  }

  if (status === 404 || status === 405) {
    return {
      tone: 'warning',
      title: 'CRM auth route unavailable',
      message:
        `The CRM login request reached ${resolvedAuthUrl || 'the configured CRM auth route'} and the server did not serve the login endpoint. Verify the API base URL or proxy configuration.`,
    };
  }

  return {
    tone: 'offline',
    title: 'Unable to sign in',
    message: normalizeFeedbackMessage(error?.message || 'The CRM login could not be completed right now.', 'The CRM login could not be completed right now.'),
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
  const resolvedApiOrigin = getCrmResolvedApiOrigin();
  const resolvedAuthUrl = getCrmResolvedAuthUrl();
  const status = statusCopy[connectionState.key] || statusCopy.checking;
  const currentFeedback = feedback || null;
  const authEndpointCopy = `Requests are sent to ${resolvedAuthUrl}. The CRM login stays on the canonical API route so it cannot drift from the backend.`;

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

      if (result.status === 404 || result.status === 405) {
        setConnectionState({
          key: 'warning',
          checkedAt: now,
          message: `The CRM health request reached ${resolvedApiOrigin} and the route was not found. Check the CRM API base URL or proxy configuration.`,
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
  }, [resolvedApiOrigin]);

  const showShortcutFeedback = (title, message) => {
    setFeedback({
      tone: 'warning',
      title,
      message,
    });
  };

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
      setFeedback(classifySubmitError(error, resolvedAuthUrl));
    } finally {
      setIsLoading(false);
    }
  };

  if (session) {
    return <Navigate to={returnPath} replace />;
  }

  return (
    <section className="crm-login-page">
      <div className="crm-login-ambient crm-login-ambient-left" aria-hidden="true" />
      <div className="crm-login-ambient crm-login-ambient-right" aria-hidden="true" />

      <div className="container crm-login-container">
        <div className="crm-login-shell">
          <aside className="crm-login-visual">
            <div className="crm-login-brand-mark" aria-label={CRM_NAME}>
              <div className="crm-login-brand-emblem" aria-hidden="true">
                <span>{SALON_INITIALS}</span>
              </div>
              <div className="crm-login-brand-copy">
                <strong>{SALON_NAME}</strong>
                <span>{BRAND_TAGLINE}</span>
              </div>
            </div>

            <div className="crm-login-visual-frame">
              <img src={loginVisualImage} alt="Facial treatment photograph from Hazel Beauty Saloon" className="crm-login-visual-image" />
              <div className="crm-login-visual-overlay" aria-hidden="true" />
              <article className="crm-login-visual-quote">
                <span>Daily inspiration</span>
                <strong>Abundance through ease.</strong>
                <p>Every operational touchpoint should feel as calm and deliberate as the salon itself.</p>
              </article>
            </div>

            <div className="crm-login-visual-points">
              {visualHighlights.map((item) => (
                <article key={item.title}>
                  <span>{item.title}</span>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </aside>

          <article className="crm-login-panel">
            <div className="crm-login-panel-header">
              <div>
                <p className="crm-login-panel-kicker">Secure sign in</p>
                <h2>Sign in to your workspace</h2>
              </div>

              <span className={`crm-login-state-pill crm-login-state-${status.tone}`}>{status.eyebrow}</span>
            </div>

            <p className="crm-login-panel-copy">
              Use your admin email to reach live Hazel Beauty Saloon CRM records, workflows, and operational reporting.
            </p>

            <div className="crm-login-shortcuts" aria-label="Authentication shortcuts">
              {authShortcuts.map((shortcut) => {
                const Icon = shortcut.icon;

                return (
                  <button
                    key={shortcut.id}
                    type="button"
                    className="crm-login-shortcut-button"
                    onClick={() =>
                      showShortcutFeedback(
                        shortcut.label,
                        `${shortcut.label} is ready as a design-first entry point. The password form below remains the active sign-in path.`,
                      )
                    }
                  >
                    <Icon size={16} />
                    <span>
                      <strong>{shortcut.label}</strong>
                      <small>{shortcut.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="crm-login-shortcut-note">
              Password sign-in remains available below, while biometric and SSO hooks are staged at the UI layer.
            </p>

            <form className="crm-login-form" onSubmit={handleSubmit}>
              <div className="crm-login-field">
                <label htmlFor="crm-email">Work email</label>
                <div className="crm-login-input-shell">
                  <Mail size={16} />
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
              </div>

              <div className="crm-login-field">
                <label htmlFor="crm-password">Password</label>
                <div className="crm-login-input-shell">
                  <KeyRound size={16} />
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

              <button type="submit" className="crm-login-button" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in securely'}
                {!isLoading ? <ArrowRight size={16} /> : null}
              </button>
            </form>

            {currentFeedback ? (
              <div className={`crm-login-alert crm-login-alert-${currentFeedback.tone}`} role="alert" aria-live="polite">
                <strong>{currentFeedback.title}</strong>
                <p>{currentFeedback.message}</p>
              </div>
            ) : null}

            <div className="crm-login-meta-grid">
              <article className="crm-login-meta-card crm-login-meta-card-dark">
                <span>Resolved API base</span>
                <strong>{resolvedApiOrigin}</strong>
                <p>{authEndpointCopy}</p>
              </article>

              <article className="crm-login-meta-card crm-login-meta-card-dark">
                <span>Connection</span>
                <strong>{status.title}</strong>
                <p>
                  {status.detail} {connectionState.checkedAt ? `Last checked at ${connectionState.checkedAt}.` : ''}
                </p>
              </article>
            </div>

            <article className="crm-login-meta-card crm-login-meta-card-dark crm-login-meta-card-wide">
              <span>Operational note</span>
              <strong>{connectionState.message}</strong>
              <p>{CRM_NAME} distinguishes credential failure from infrastructure failure so the team can trust the message they see.</p>
            </article>

            <p className="crm-login-footer-note">
              This login keeps the interface elegant while still surfacing the exact system state behind the workspace.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};

export default CrmLogin;
