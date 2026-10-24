import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import useAuth from '../hooks/useAuth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function fieldErrorsOf(error) {
  const map = {};
  for (const item of error?.errors ?? []) {
    if (item?.field) map[item.field] = item.msg ?? 'Invalid value';
  }
  return map;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';

  const [values, setValues] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [pending, setPending] = useState(false);

  const setField = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const errs = {};
    const email = values.email.trim();
    if (!email) errs.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) errs.email = 'Enter a valid email address.';
    if (!values.password) errs.password = 'Password is required.';
    return errs;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setPending(true);
    try {
      await login(values.email.trim(), values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setFormError(err?.message ?? 'Could not log you in. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageMeta title="Log in" />
      <div className="auth-wrap">
        <div className="card auth-card">
          <h1>Welcome back</h1>
          <p className="lede">Log in to explore projects and connect with teammates.</p>

          {formError ? (
            <div className="error-alert" role="alert">
              <p>{formError}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={setField('email')}
                aria-invalid={fieldErrors.email ? 'true' : undefined}
              />
              {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={setField('password')}
                aria-invalid={fieldErrors.password ? 'true' : undefined}
              />
              {fieldErrors.password ? (
                <p className="field-error">{fieldErrors.password}</p>
              ) : null}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={pending}>
                {pending ? <span className="spinner" aria-hidden="true" /> : null}
                {pending ? 'Logging in…' : 'Log in'}
              </button>
            </div>
          </form>

          <p className="auth-alt">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </>
  );
}
