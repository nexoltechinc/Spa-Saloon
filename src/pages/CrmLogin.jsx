import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CRM_AUTH_ENDPOINT, getCrmToken, setCrmToken } from '../config/crm';
import './CrmLogin.css';

const CrmLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!CRM_AUTH_ENDPOINT) {
      setCrmToken('crm-demo-session', rememberMe);
      navigate('/crm/dashboard');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(CRM_AUTH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials or CRM endpoint rejected the request.');
      }

      const data = await response.json();

      if (data?.token) {
        setCrmToken(data.token, rememberMe);
      }

      setSuccess('Login successful. CRM connection is active.');
      navigate('/crm/dashboard');
    } catch (submitError) {
      setError(submitError.message || 'Login failed. Please verify your CRM integration.');
    } finally {
      setIsLoading(false);
    }
  };

  if (getCrmToken()) {
    return <Navigate to="/crm/dashboard" replace />;
  }

  return (
    <section className="crm-login-page">
      <div className="container crm-login-container">
        <div className="crm-login-panel">
          <p className="crm-login-kicker">CRM Access</p>
          <h1>Login to my CRM</h1>
          <p className="crm-login-intro">
            Sign in to sync website leads, bookings, and contact submissions with your CRM.
          </p>

          <form className="crm-login-form" onSubmit={handleSubmit}>
            <label htmlFor="crm-email">Work Email</label>
            <input
              id="crm-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              required
            />

            <label htmlFor="crm-password">Password</label>
            <input
              id="crm-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />

            <label className="crm-login-checkbox" htmlFor="crm-remember">
              <input
                id="crm-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Keep me signed in
            </label>

            <button type="submit" className="crm-login-button" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {error ? <p className="crm-login-feedback crm-login-error">{error}</p> : null}
          {success ? <p className="crm-login-feedback crm-login-success">{success}</p> : null}

          <p className="crm-login-note">
            Integration endpoint:
            <code>
              {CRM_AUTH_ENDPOINT || 'Not configured: demo mode will open CRM dashboard directly'}
            </code>
          </p>
        </div>
      </div>
    </section>
  );
};

export default CrmLogin;
