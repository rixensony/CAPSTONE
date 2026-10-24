import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import Avatar from '../components/Avatar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SkillTag from '../components/SkillTag.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDate, totalSeatsOf } from '../components/ProjectCard.jsx';
import projectService from '../services/projectService.js';
import requestService from '../services/requestService.js';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';

const MAX_MESSAGE = 300;

function memberUsersOf(team) {
  const rawMembers = Array.isArray(team?.members) ? team.members : [];
  return rawMembers
    .map((member) => {
      const user = member?.user ?? member;
      if (!user) return null;
      return { _id: user._id ?? user.id ?? member, name: user.name ?? 'Member' };
    })
    .filter(Boolean);
}

function OwnerRequestsPanel({ projectId, onProjectChanged }) {
  const { data, loading, error, retry } = useAsync(() => requestService.incomingRequests(), []);
  const [busyId, setBusyId] = useState(null);
  const [respondError, setRespondError] = useState(null);

  const requests = (Array.isArray(data?.data) ? data.data : []).filter(
    (request) => String(request?.project?._id ?? request?.project ?? '') === String(projectId)
  );
  const pendingCount = requests.filter((request) => request?.status === 'pending').length;

  const respond = async (request, status) => {
    setBusyId(request?._id);
    setRespondError(null);
    try {
      await requestService.respondRequest(request._id, status);
      retry();
      onProjectChanged?.();
    } catch (err) {
      setRespondError(err?.message ?? 'Could not update this request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div className="section-head">
        <h3 style={{ margin: 0 }}>Join requests</h3>
        <span className="muted small">
          {pendingCount} pending · {requests.length} total
        </span>
      </div>
      {respondError ? (
        <p className="panel-error" style={{ marginBottom: 12 }}>
          {respondError}
        </p>
      ) : null}
      {loading ? (
        <div className="loader compact">
          <span className="spinner center" aria-hidden="true" />
          <span className="small muted">Loading requests…</span>
        </div>
      ) : error ? (
        <ErrorAlert error={error} onRetry={retry} />
      ) : requests.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>
          No join requests yet. When students ask to join your team, they appear here.
        </p>
      ) : (
        <div>
          {requests.map((request) => {
            const requester = request?.requester ?? {};
            const requesterId = requester?._id ?? requester?.id;
            return (
              <div className="req-row" key={request?._id}>
                <Avatar name={requester?.name} size="md" />
                <div className="req-main">
                  <span className="req-name">
                    {requesterId ? (
                      <Link to={`/students/${requesterId}`}>{requester?.name ?? 'Unknown'}</Link>
                    ) : (
                      requester?.name ?? 'Unknown'
                    )}
                  </span>
                  {request?.message ? <p className="req-message">“{request.message}”</p> : null}
                </div>
                <StatusBadge status={request?.status} />
                {request?.status === 'pending' ? (
                  <div className="action-row">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => respond(request, 'accepted')}
                      disabled={busyId !== null}
                    >
                      {busyId === request?._id ? <span className="spinner" aria-hidden="true" /> : null}
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => respond(request, 'rejected')}
                      disabled={busyId !== null}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error, retry } = useAsync(() => projectService.getProject(id), [id]);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinPending, setJoinPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (loading) {
    return (
      <>
        <PageMeta title="Project" />
        <Loader label="Loading project…" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageMeta title="Project" />
        <Link className="page-back" to="/projects">
          ← Back to projects
        </Link>
        <ErrorAlert error={error} onRetry={retry} />
      </>
    );
  }

  // GET /projects/:id replies with the envelope { data: { project, team, myRequest, isOwner } };
  // unwrap once so every read below sees the payload itself.
  const payload = data?.data ?? data ?? {};
  const project =
    payload?.project ?? (payload && payload._id ? payload : null);
  const team = payload?.team ?? project?.team ?? null;
  const myRequest = payload?.myRequest ?? null;
  const members = memberUsersOf(team);
  const ownerId = project?.owner?._id ?? project?.owner?.id ?? project?.owner;
  const myId = String(user?._id ?? user?.id ?? '');
  const isOwner =
    payload?.isOwner !== undefined
      ? Boolean(payload.isOwner)
      : Boolean(ownerId && String(ownerId) === myId);
  const isMember = members.some((member) => String(member._id) === myId);
  const myStatus = myRequest?.status ?? null;
  const seatsTotal = totalSeatsOf(project);
  const skills = Array.isArray(project?.requiredSkills) ? project.requiredSkills : [];
  // The owner occupies the team's first seat even though the server stores
  // only joined teammates in team.members — render them as one row.
  const teamRows =
    ownerId && project?.owner?.name
      ? [
          { _id: String(project.owner._id ?? project.owner), name: project.owner.name, isOwnerRow: true },
          ...members.filter((member) => String(member._id) !== String(ownerId)),
        ]
      : members;
  const seats =
    seatsTotal === null
      ? `${members.length + 1} member${members.length === 0 ? '' : 's'}`
      : `${members.length + 1} of ${seatsTotal} seats filled`;

  const sendJoinRequest = async () => {
    setJoinPending(true);
    setActionError(null);
    try {
      await requestService.sendRequest({ projectId: id, message: joinMessage.trim() || undefined });
      setJoinOpen(false);
      setJoinMessage('');
      retry();
    } catch (err) {
      setActionError(err?.message ?? 'Could not send your request.');
    } finally {
      setJoinPending(false);
    }
  };

  const cancelMyRequest = async () => {
    setCancelPending(true);
    setActionError(null);
    try {
      await requestService.cancelRequest(myRequest?._id);
      retry();
    } catch (err) {
      setActionError(err?.message ?? 'Could not cancel your request.');
    } finally {
      setCancelPending(false);
    }
  };

  const deleteThisProject = async () => {
    setDeletePending(true);
    setActionError(null);
    try {
      await projectService.deleteProject(id);
      navigate('/projects', { replace: true });
    } catch (err) {
      setDeletePending(false);
      setDeleteOpen(false);
      setActionError(err?.message ?? 'Could not delete the project.');
    }
  };

  const cta = () => {
    if (isOwner) {
      return (
        <div>
          <div className="cta-row-inline" style={{ marginBottom: 18 }}>
            <Link to={`/projects/${id}/edit`} className="btn btn-primary">
              Edit
            </Link>
            <button
              type="button"
              className="btn btn-danger-soft"
              onClick={() => setDeleteOpen(true)}
              disabled={deletePending}
            >
              Delete
            </button>
          </div>
          <OwnerRequestsPanel projectId={id} onProjectChanged={retry} />
        </div>
      );
    }

    if (isMember || myStatus === 'accepted') {
      return <p style={{ margin: 0, fontWeight: 600 }}>You are part of this team.</p>;
    }

    if (myStatus === 'pending') {
      return (
        <div>
          <p style={{ marginBottom: 12 }}>
            Your request is pending — the project owner will review it soon.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={cancelMyRequest}
            disabled={cancelPending}
          >
            {cancelPending ? <span className="spinner" aria-hidden="true" /> : null}
            {cancelPending ? 'Cancelling…' : 'Cancel my request'}
          </button>
        </div>
      );
    }

    if (project?.status === 'open' && !joinOpen) {
      return (
        <button type="button" className="btn btn-primary" onClick={() => setJoinOpen(true)}>
          Request to join
        </button>
      );
    }

    if (project?.status === 'open' && joinOpen) {
      return (
        <div>
          <div className="field" style={{ marginBottom: 12 }}>
            <div className="hint-row">
              <label htmlFor="join-message">Message (optional)</label>
              <span className={`counter${joinMessage.length >= MAX_MESSAGE ? ' over' : ''}`}>
                {joinMessage.length}/{MAX_MESSAGE}
              </span>
            </div>
            <textarea
              id="join-message"
              rows={3}
              maxLength={MAX_MESSAGE}
              placeholder="Tell the owner why you'd be a great fit…"
              value={joinMessage}
              onChange={(event) => setJoinMessage(event.target.value)}
            />
          </div>
          {actionError ? (
            <p className="panel-error" style={{ marginBottom: 12 }}>
              {actionError}
            </p>
          ) : null}
          <div className="cta-row-inline">
            <button
              type="button"
              className="btn btn-primary"
              onClick={sendJoinRequest}
              disabled={joinPending}
            >
              {joinPending ? <span className="spinner" aria-hidden="true" /> : null}
              {joinPending ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setJoinOpen(false)}
              disabled={joinPending}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <p className="muted" style={{ margin: 0 }}>
        This project is {project?.status === 'full' ? 'full' : 'no longer open'} — joining is not
        available right now.
      </p>
    );
  };

  return (
    <>
      <PageMeta title={project?.title ?? 'Project'} />

      <Link className="page-back" to="/projects">
        ← Back to projects
      </Link>

      <article className="card">
        <div className="detail-head">
          <div>
            <h1>{project?.title ?? 'Untitled project'}</h1>
            <p className="detail-meta">
              Posted by {project?.owner?.name ?? 'Unknown'} · {formatDate(project?.createdAt)}
            </p>
          </div>
          <StatusBadge status={project?.status} />
        </div>

        <hr className="divider" />

        <p className="detail-section-title">Description</p>
        <p className="detail-desc">{project?.description ?? ''}</p>

        <p className="detail-section-title" style={{ marginTop: 22 }}>
          Required skills
        </p>
        {skills.length > 0 ? (
          <div className="chip-row">
            {skills.map((skill) => (
              <SkillTag key={skill} skill={skill} />
            ))}
          </div>
        ) : (
          <p className="muted small">No specific skills listed.</p>
        )}

        <hr className="divider" />

        <p className="detail-section-title">Team — {seats}</p>
        <ul className="team-list">
          {teamRows.map((member) => (
            <li className="member-row" key={member._id}>
              <Avatar name={member.name} size="sm" />
              {member._id ? (
                <Link to={`/students/${member._id}`}>{member.name}</Link>
              ) : (
                <span>{member.name}</span>
              )}
              {member.isOwnerRow || String(member._id) === String(ownerId) ? (
                <span className="badge badge-owner">Owner</span>
              ) : null}
            </li>
          ))}
        </ul>

        {!isOwner ? (
          <hr className="divider" />
        ) : null}
        <div className="cta-card">{cta()}</div>
      </article>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this project?"
        message="This removes the project, its team and all join requests. This cannot be undone."
        confirmLabel="Delete project"
        busy={deletePending}
        onConfirm={deleteThisProject}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
