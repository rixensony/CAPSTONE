import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SkillInput from '../components/SkillInput.jsx';
import projectService from '../services/projectService.js';
import useAsync from '../hooks/useAsync.js';

const ALLOWED_STATUS = ['open', 'in-progress', 'completed'];
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 2000;

function clampTeamSize(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 2;
  return Math.min(9, Math.round(n));
}

function fieldErrorsOf(error) {
  const map = {};
  for (const item of error?.errors ?? []) {
    if (item?.field) map[item.field] = item.msg ?? 'Invalid value';
  }
  return map;
}

export default function ProjectFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [values, setValues] = useState({
    title: '',
    description: '',
    requiredSkills: [],
    teamSize: 2,
    status: 'open',
  });
  const [hydrated, setHydrated] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [pending, setPending] = useState(false);

  const loadProject = useCallback(
    () => (isEdit ? projectService.getProject(id) : Promise.resolve(null)),
    [isEdit, id]
  );
  const { data, loading, error, retry } = useAsync(loadProject, [isEdit, id]);
  // getProject() returns the envelope { data: { project, team, myRequest, isOwner } }.
  const editPayload = data?.data ?? data ?? null;

  useEffect(() => {
    if (!isEdit || !editPayload || hydrated) return;
    const project = editPayload?.project ?? editPayload;
    if (!project) return;
    setValues({
      title: project.title ?? '',
      description: project.description ?? '',
      requiredSkills: Array.isArray(project.requiredSkills) ? project.requiredSkills : [],
      teamSize: clampTeamSize(project.teamSize ?? 2),
      status: ALLOWED_STATUS.includes(project.status) ? project.status : 'open',
    });
    setHydrated(true);
  }, [editPayload, isEdit, hydrated]);

  if (isEdit && loading) {
    return (
      <div className="container">
        <PageMeta title="Edit project" />
        <Loader label="Loading project…" />
      </div>
    );
  }

  if (isEdit && error) {
    return (
      <div className="container">
        <PageMeta title="Edit project" />
        <Link className="page-back" to="/projects">
          ← Back to projects
        </Link>
        <ErrorAlert error={error} onRetry={retry} />
      </div>
    );
  }

  const ownerBlocked =
    isEdit && editPayload && (editPayload.isOwner === false || (editPayload.project ?? editPayload)?.isOwner === false);

  if (ownerBlocked) {
    return (
      <div className="container">
        <PageMeta title="Edit project" />
        <Link className="page-back" to="/projects">
          ← Back to projects
        </Link>
        <EmptyState
          icon="🔒"
          title="Only the owner can edit this project"
          hint="You can browse its details, but changes are reserved for the project owner."
          actionLabel="View project"
          to={`/projects/${id}`}
        />
      </div>
    );
  }

  if (isEdit && !hydrated) {
    return (
      <div className="container">
        <PageMeta title="Edit project" />
        <Loader label="Loading project…" />
      </div>
    );
  }

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
    const title = values.title.trim();
    const description = values.description.trim();

    if (!title) errs.title = 'Title is required.';
    else if (title.length < 5 || title.length > TITLE_MAX) {
      errs.title = `Title must be 5–${TITLE_MAX} characters.`;
    }

    if (!description) errs.description = 'Description is required.';
    else if (description.length < 20) {
      errs.description = 'Description must be at least 20 characters.';
    }

    if (values.requiredSkills.length < 1) {
      errs.requiredSkills = 'Add at least one required skill.';
    } else if (values.requiredSkills.length > 10) {
      errs.requiredSkills = 'No more than 10 required skills.';
    }

    const teamSize = Number(values.teamSize);
    if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 9) {
      errs.teamSize = 'Teammates must be between 1 and 9.';
    }

    if (isEdit && !ALLOWED_STATUS.includes(values.status)) {
      errs.status = 'Choose a valid status.';
    }

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

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      requiredSkills: values.requiredSkills,
      teamSize: Number(values.teamSize),
    };
    if (isEdit) payload.status = values.status;

    setPending(true);
    try {
      const res = isEdit
        ? await projectService.updateProject(id, payload)
        : await projectService.createProject(payload);
      const saved = res?.project ?? res;
      navigate(`/projects/${saved?._id ?? id}`);
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setFormError(err?.message ?? 'Could not save the project.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="container">
      <PageMeta title={isEdit ? 'Edit project' : 'Share a project idea'} />

      <Link className="page-back" to={isEdit ? `/projects/${id}` : '/projects'}>
        ← Back
      </Link>

      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit project' : 'Share a project idea'}</h1>
          <p className="sub">
            {isEdit
              ? 'Update the details, skills or team size — teammates stay in their seats.'
              : 'Describe what you want to build and the skills your team needs.'}
          </p>
        </div>
      </div>

      <div className="card form-card">
        {formError ? (
          <div className="error-alert" role="alert" style={{ marginBottom: 16 }}>
            <p>{formError}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <div className="hint-row">
              <label htmlFor="proj-title">Title</label>
              <span className={`counter${values.title.length >= TITLE_MAX ? ' over' : ''}`}>
                {values.title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              id="proj-title"
              type="text"
              maxLength={TITLE_MAX}
              placeholder="e.g. Campus event finder app"
              value={values.title}
              onChange={setField('title')}
              aria-invalid={fieldErrors.title ? 'true' : undefined}
            />
            {fieldErrors.title ? <p className="field-error">{fieldErrors.title}</p> : null}
          </div>

          <div className="field">
            <div className="hint-row">
              <label htmlFor="proj-description">Description</label>
              <span className={`counter${values.description.length >= DESCRIPTION_MAX ? ' over' : ''}`}>
                {values.description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="proj-description"
              rows={6}
              maxLength={DESCRIPTION_MAX}
              placeholder="What are you building? What will teammates work on?"
              value={values.description}
              onChange={setField('description')}
              aria-invalid={fieldErrors.description ? 'true' : undefined}
            />
            {fieldErrors.description ? (
              <p className="field-error">{fieldErrors.description}</p>
            ) : null}
          </div>

          <div className="field">
            <span className="field-label">Required skills</span>
            <SkillInput
              value={values.requiredSkills}
              onChange={(next) => setValues((prev) => ({ ...prev, requiredSkills: next }))}
              inputLabel="Add a required skill"
              placeholder="Type a skill and press Enter"
            />
            {fieldErrors.requiredSkills ? (
              <p className="field-error">{fieldErrors.requiredSkills}</p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="proj-team-size">Teammates needed — besides you</label>
            <select
              id="proj-team-size"
              value={values.teamSize}
              onChange={setField('teamSize')}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'teammate' : 'teammates'} (you + {n})
                </option>
              ))}
            </select>
            {fieldErrors.teamSize ? <p className="field-error">{fieldErrors.teamSize}</p> : null}
          </div>

          {isEdit ? (
            <div className="field">
              <label htmlFor="proj-status">Status</label>
              <select id="proj-status" value={values.status} onChange={setField('status')}>
                {ALLOWED_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status === 'open' ? 'Open' : status === 'in-progress' ? 'In progress' : 'Completed'}
                  </option>
                ))}
              </select>
              {fieldErrors.status ? <p className="field-error">{fieldErrors.status}</p> : null}
            </div>
          ) : null}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? <span className="spinner" aria-hidden="true" /> : null}
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(isEdit ? `/projects/${id}` : '/projects')}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
