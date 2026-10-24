import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import SkillInput from '../components/SkillInput.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import authService from '../services/authService.js';
import userService from '../services/userService.js';
import dashboardService from '../services/dashboardService.js';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';

const BIO_MAX = 500;

function fieldErrorsOf(error) {
  const map = {};
  for (const item of error?.errors ?? []) {
    if (item?.field) map[item.field] = item.msg ?? 'Invalid value';
  }
  return map;
}

export default function ProfilePage() {
  const { setUser } = useAuth();
  const profileState = useAsync(() => authService.me(), []);
  const projectsState = useAsync(() => dashboardService.get(), []);

  const [values, setValues] = useState({ name: '', department: '', bio: '' });
  const [skills, setSkills] = useState([]);
  const [interests, setInterests] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saved, setSaved] = useState(false);

  // authService.me() returns the standard envelope { data: { user } }.
  const me = profileState.data?.data?.user ?? profileState.data?.user ?? null;

  useEffect(() => {
    if (!me || hydrated) return;
    setValues({ name: me.name ?? '', department: me.department ?? '', bio: me.bio ?? '' });
    setSkills(Array.isArray(me.skills) ? me.skills : []);
    setInterests(Array.isArray(me.interests) ? me.interests : []);
    setHydrated(true);
  }, [me, hydrated]);

  if (profileState.loading) {
    return (
      <>
        <PageMeta title="My profile" />
        <Loader label="Loading your profile…" />
      </>
    );
  }

  if (profileState.error) {
    return (
      <>
        <PageMeta title="My profile" />
        <ErrorAlert error={profileState.error} onRetry={profileState.retry} />
      </>
    );
  }

  if (!hydrated) {
    return (
      <>
        <PageMeta title="My profile" />
        <Loader label="Loading your profile…" />
      </>
    );
  }

  const setField = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
    setSaved(false);
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
    const department = values.department.trim();

    if (!name) errs.name = 'Name is required.';
    else if (name.length < 2 || name.length > 50) errs.name = 'Name must be 2–50 characters.';

    if (!department) errs.department = 'Department is required.';
    else if (department.length < 2 || department.length > 60) {
      errs.department = 'Department must be 2–60 characters.';
    }

    if (values.bio.trim().length > BIO_MAX) errs.bio = 'Bio must be 500 characters or less.';

    return errs;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError(null);
    setSaved(false);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    const payload = {
      name: values.name.trim(),
      department: values.department.trim(),
      bio: values.bio.trim(),
      skills,
      interests,
    };

      setPending(true);
      try {
        const res = await userService.updateMe(payload);
        const updated = res?.data?.user ?? res?.user ?? res;
        if (updated) {
          setUser(updated);
        setValues({
          name: updated.name ?? values.name,
          department: updated.department ?? values.department,
          bio: updated.bio ?? values.bio,
        });
        setSkills(Array.isArray(updated.skills) ? updated.skills : skills);
        setInterests(Array.isArray(updated.interests) ? updated.interests : interests);
      }
      setSaved(true);
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setFormError(err?.message ?? 'Could not save your profile.');
    } finally {
      setPending(false);
    }
  };

  // dashboardService.get() → { data: { myProjects, ... } }
  const dashboardPayload = projectsState.data?.data ?? projectsState.data ?? {};
  const myProjects = Array.isArray(dashboardPayload?.myProjects) ? dashboardPayload.myProjects : [];

  return (
    <>
      <PageMeta title="My profile" />

      <div className="page-head">
        <div>
          <h1>My profile</h1>
          <p className="sub">Keep your details and skills current so the right teammates find you.</p>
        </div>
      </div>

      <div className="card form-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <Avatar name={values.name || me?.name} size="lg" />
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>{values.name || me?.name}</p>
            <p className="muted small" style={{ margin: 0 }}>
              {me?.email}
            </p>
          </div>
        </div>

        {saved ? <div className="form-success">Profile updated</div> : null}
        {formError ? (
          <div className="error-alert" role="alert" style={{ marginBottom: 16 }}>
            <p>{formError}</p>
          </div>
        ) : null}

        <form onSubmit={handleSave} noValidate>
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              maxLength={50}
              value={values.name}
              onChange={setField('name')}
              aria-invalid={fieldErrors.name ? 'true' : undefined}
            />
            {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
          </div>

          <div className="field">
            <label htmlFor="profile-department">Department</label>
            <input
              id="profile-department"
              type="text"
              maxLength={60}
              value={values.department}
              onChange={setField('department')}
              aria-invalid={fieldErrors.department ? 'true' : undefined}
            />
            {fieldErrors.department ? (
              <p className="field-error">{fieldErrors.department}</p>
            ) : null}
          </div>

          <div className="field">
            <div className="hint-row">
              <label htmlFor="profile-bio">Bio</label>
              <span className={`counter${values.bio.length >= BIO_MAX ? ' over' : ''}`}>
                {values.bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              id="profile-bio"
              rows={4}
              maxLength={BIO_MAX}
              placeholder="A line or two about what you do and what you look for…"
              value={values.bio}
              onChange={setField('bio')}
              aria-invalid={fieldErrors.bio ? 'true' : undefined}
            />
            {fieldErrors.bio ? <p className="field-error">{fieldErrors.bio}</p> : null}
          </div>

          <div className="field">
            <span className="field-label">Skills</span>
            <SkillInput
              value={skills}
              onChange={(next) => {
                setSkills(next);
                setSaved(false);
              }}
              inputLabel="Add a skill"
            />
            {fieldErrors.skills ? <p className="field-error">{fieldErrors.skills}</p> : null}
          </div>

          <div className="field">
            <span className="field-label">Interests</span>
            <SkillInput
              value={interests}
              onChange={(next) => {
                setInterests(next);
                setSaved(false);
              }}
              inputLabel="Add an interest"
            />
            {fieldErrors.interests ? (
              <p className="field-error">{fieldErrors.interests}</p>
            ) : null}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? <span className="spinner" aria-hidden="true" /> : null}
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <section className="dash-section">
        <div className="section-head">
          <h2>My projects</h2>
          <Link to="/projects/new" className="btn btn-ghost btn-sm">
            + New project
          </Link>
        </div>
        {projectsState.loading ? (
          <Loader label="Loading your projects…" />
        ) : projectsState.error ? (
          <ErrorAlert error={projectsState.error} onRetry={projectsState.retry} />
        ) : myProjects.length === 0 ? (
          <EmptyState
            icon="🚀"
            title="No project ideas yet"
            hint="Share your first project idea and it will appear here."
            actionLabel="New project"
            to="/projects/new"
          />
        ) : (
          <div className="cards-grid">
            {myProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
