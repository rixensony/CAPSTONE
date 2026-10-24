import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import SkillInput from '../components/SkillInput.jsx';
import useAuth from '../hooks/useAuth.js';
import { fieldErrorsOf } from './LoginPage.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    bio: '',
  });
  const [skills, setSkills] = useState([]);
  const [interests, setInterests] = useState([]);
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
    const name = values.name.trim();
    const email = values.email.trim();
    const department = values.department.trim();

    if (!name) errs.name = 'Name is required.';
    else if (name.length < 2 || name.length > 50) {
      errs.name = 'Name must be 2–50 characters.';
    }

    if (!email) errs.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) errs.email = 'Enter a valid email address.';

    if (!values.password) errs.password = 'Password is required.';
    else if (
      values.password.length < 8 ||
      !/[a-zA-Z]/.test(values.password) ||
      !/\d/.test(values.password)
    ) {
      errs.password = 'Password must be at least 8 characters with a letter and a number.';
    }

    if (!department) errs.department = 'Department is required.';
    else if (department.length < 2 || department.length > 60) {
      errs.department = 'Department must be 2–60 characters.';
    }

    if (values.bio.length > 500) errs.bio = 'Bio must be 500 characters or less.';

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
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        department: values.department.trim(),
        skills,
        interests,
        bio: values.bio.trim(),
      });
      navigate(from, { replace: true });
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setFormError(err?.message ?? 'Could not create your account. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageMeta title="Create an account" />
      <div className="auth-wrap">
        <div className="card auth-card">
          <h1>Create an account</h1>
          <p className="lede">
            Join SkillBridge to post project ideas and find teammates by skill.
          </p>

          {formError ? (
            <div className="error-alert" role="alert">
              <p>{formError}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                maxLength={50}
                value={values.name}
                onChange={setField('name')}
                aria-invalid={fieldErrors.name ? 'true' : undefined}
              />
              {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={setField('email')}
                aria-invalid={fieldErrors.email ? 'true' : undefined}
              />
              {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={setField('password')}
                aria-invalid={fieldErrors.password ? 'true' : undefined}
              />
              {fieldErrors.password ? (
                <p className="field-error">{fieldErrors.password}</p>
              ) : (
                <p className="counter">At least 8 characters, with a letter and a number.</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="reg-department">Department</label>
              <input
                id="reg-department"
                type="text"
                maxLength={60}
                placeholder="e.g. Computer Science"
                value={values.department}
                onChange={setField('department')}
                aria-invalid={fieldErrors.department ? 'true' : undefined}
              />
              {fieldErrors.department ? (
                <p className="field-error">{fieldErrors.department}</p>
              ) : null}
            </div>

            <div className="field">
              <span className="field-label">Skills (optional)</span>
              <SkillInput
                value={skills}
                onChange={setSkills}
                inputLabel="Add a skill"
                placeholder="Type a skill and press Enter"
              />
            </div>

            <div className="field">
              <span className="field-label">Interests (optional)</span>
              <SkillInput
                value={interests}
                onChange={setInterests}
                inputLabel="Add an interest"
                placeholder="Type an interest and press Enter"
              />
            </div>

            <div className="field">
              <div className="hint-row">
                <label htmlFor="reg-bio">Bio (optional)</label>
                <span className={`counter${values.bio.length > 500 ? ' over' : ''}`}>
                  {values.bio.length}/500
                </span>
              </div>
              <textarea
                id="reg-bio"
                rows={3}
                maxLength={500}
                placeholder="A line or two about you…"
                value={values.bio}
                onChange={setField('bio')}
                aria-invalid={fieldErrors.bio ? 'true' : undefined}
              />
              {fieldErrors.bio ? <p className="field-error">{fieldErrors.bio}</p> : null}
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={pending}
              >
                {pending ? <span className="spinner" aria-hidden="true" /> : null}
                {pending ? 'Creating account…' : 'Create account'}
              </button>
            </div>
          </form>

          <p className="auth-alt">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
