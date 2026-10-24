import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDate, totalSeatsOf } from '../components/ProjectCard.jsx';
import teamService from '../services/teamService.js';
import requestService from '../services/requestService.js';
import useAsync from '../hooks/useAsync.js';

const TAB_TEAMS = 'teams';
const TAB_SENT = 'sent';
const TAB_RECEIVED = 'received';

function memberUsersOf(team) {
  const raw = Array.isArray(team?.members) ? team.members : [];
  return raw
    .map((member) => {
      const user = member?.user ?? member;
      if (!user) return null;
      return { _id: user._id ?? user.id ?? member, name: user.name ?? 'Member' };
    })
    .filter(Boolean);
}

function projectIdOf(project) {
  return project?._id ?? (typeof project === 'string' ? project : null);
}

function TeamsTab() {
  const { data, loading, error, retry } = useAsync(() => teamService.myTeams(), []);

  if (loading) return <Loader label="Loading your teams…" />;
  if (error) return <ErrorAlert error={error} onRetry={retry} />;

  // Server envelope: { data: { teams: [...] } }
  const teams = Array.isArray(data?.data?.teams)
    ? data.data.teams
    : Array.isArray(data?.teams)
      ? data.teams
      : [];

  if (teams.length === 0) {
    return (
      <EmptyState
        icon="🤝"
        title="You haven't built a team yet."
        hint="Join a project from Explore, or post your own idea to gather teammates."
        actionLabel="Explore projects"
        to="/projects"
      />
    );
  }

  return (
    <div className="cards-grid">
      {teams.map((team) => {
        const project = team?.project ?? {};
        const id = projectIdOf(project);
        const members = memberUsersOf(team);
        const ownerId = project?.owner?._id ?? project?.owner;
        const ownerName =
          project?.owner?.name ??
          members.find((member) => String(member._id) === String(ownerId))?.name ??
          'Unknown';
        const seatsTotal = totalSeatsOf(project);

        return (
          <article className="card interactive team-card" key={team?._id ?? id}>
            <div className="card-title-row">
              <h3 className="card-title">
                <Link to={`/projects/${id ?? ''}`}>{project?.title ?? 'Project'}</Link>
              </h3>
              <StatusBadge status={project?.status} />
            </div>

            <div className="chip-row">
              <span className="chip">
                Owner: {ownerName}
              </span>
              {seatsTotal !== null ? (
                <span className="chip chip-alt">
                  {members.length} of {seatsTotal} seats filled
                </span>
              ) : null}
            </div>

            <div className="avatar-stack">
              {members.slice(0, 5).map((member, index) => (
                <Avatar key={member._id ?? index} name={member.name} size="sm" />
              ))}
              {members.length > 5 ? (
                <span className="chip chip-alt">+{members.length - 5}</span>
              ) : null}
              <span className="muted small" style={{ marginLeft: 6 }}>
                {members.length} member{members.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="card-foot">
              <Link className="btn btn-outline btn-sm" to={`/projects/${id ?? ''}`}>
                Open project →
              </Link>
            </div>

            <Link
              className="card-link-stretch"
              to={`/projects/${id ?? ''}`}
              aria-label={`Open project: ${project?.title ?? ''}`}
            />
          </article>
        );
      })}
    </div>
  );
}

function SentRequestsTab() {
  const { data, loading, error, retry } = useAsync(() => requestService.myRequests(), []);
  const [cancelId, setCancelId] = useState(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [actionError, setActionError] = useState(null);

  const requests = Array.isArray(data?.data) ? data.data : [];

  const confirmCancel = async () => {
    if (!cancelId) return;
    setCancelPending(true);
    setActionError(null);
    try {
      await requestService.cancelRequest(cancelId);
      setCancelId(null);
      retry();
    } catch (err) {
      setActionError(err?.message ?? 'Could not cancel this request.');
      setCancelId(null);
    } finally {
      setCancelPending(false);
    }
  };

  if (loading) return <Loader label="Loading your requests…" />;
  if (error) return <ErrorAlert error={error} onRetry={retry} />;

  if (requests.length === 0) {
    return (
      <EmptyState
        icon="✉️"
        title="You haven't sent any join requests yet."
        hint="Find a project you like and ask the owner to join the team."
        actionLabel="Explore projects"
        to="/projects"
      />
    );
  }

  return (
    <>
      {actionError ? (
        <p className="panel-error" style={{ marginBottom: 12 }}>
          {actionError}
        </p>
      ) : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Sent</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
              const id = projectIdOf(request?.project);
              return (
                <tr key={request?._id}>
                  <td>
                    {id ? (
                      <Link to={`/projects/${id}`}>{request?.project?.title ?? 'Project'}</Link>
                    ) : (
                      'Project'
                    )}
                  </td>
                  <td>{formatDate(request?.createdAt)}</td>
                  <td>
                    <StatusBadge status={request?.status} />
                  </td>
                  <td>
                    {request?.status === 'pending' ? (
                      <button
                        type="button"
                        className="btn btn-danger-soft btn-sm"
                        onClick={() => setCancelId(request?._id)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(cancelId)}
        title="Cancel this join request?"
        message="The project owner will no longer see your request. You can send a new one later."
        confirmLabel="Cancel request"
        busy={cancelPending}
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
      />
    </>
  );
}

function ReceivedRequestsTab() {
  const { data, loading, error, retry } = useAsync(() => requestService.incomingRequests(), []);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const requests = Array.isArray(data?.data) ? data.data : [];

  const respond = async (request, status) => {
    setBusyId(request?._id);
    setActionError(null);
    try {
      await requestService.respondRequest(request._id, status);
      retry();
    } catch (err) {
      setActionError(err?.message ?? 'Could not update this request.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader label="Loading incoming requests…" />;
  if (error) return <ErrorAlert error={error} onRetry={retry} />;

  if (requests.length === 0) {
    return (
      <EmptyState
        icon="📥"
        title="No join requests for your projects yet."
        hint="Share more ideas and the requests will start coming in."
        actionLabel="New project"
        to="/projects/new"
      />
    );
  }

  return (
    <>
      {actionError ? (
        <p className="panel-error" style={{ marginBottom: 12 }}>
          {actionError}
        </p>
      ) : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Requester</th>
              <th scope="col">Project</th>
              <th scope="col">Message</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
              const requesterId = request?.requester?._id ?? request?.requester?.id;
              const projectId = projectIdOf(request?.project);
              const pending = request?.status === 'pending';
              return (
                <tr key={request?._id}>
                  <td>
                    <span className="cell-user">
                      <Avatar name={request?.requester?.name} size="sm" />
                      <strong>
                        {requesterId ? (
                          <Link to={`/students/${requesterId}`}>
                            {request?.requester?.name ?? 'Unknown'}
                          </Link>
                        ) : (
                          request?.requester?.name ?? 'Unknown'
                        )}
                      </strong>
                    </span>
                  </td>
                  <td>
                    {projectId ? (
                      <Link to={`/projects/${projectId}`}>
                        {request?.project?.title ?? 'Project'}
                      </Link>
                    ) : (
                      'Project'
                    )}
                  </td>
                  <td className="muted">{request?.message ? `“${request.message}”` : '—'}</td>
                  <td>
                    <StatusBadge status={request?.status} />
                  </td>
                  <td>
                    {pending ? (
                      <div className="action-row">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => respond(request, 'accepted')}
                          disabled={busyId !== null}
                        >
                          {busyId === request?._id ? (
                            <span className="spinner" aria-hidden="true" />
                          ) : null}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function MyTeamsPage() {
  const [tab, setTab] = useState(TAB_TEAMS);

  const tabs = [
    { id: TAB_TEAMS, label: 'Teams' },
    { id: TAB_SENT, label: 'Requests sent' },
    { id: TAB_RECEIVED, label: 'Requests received' },
  ];

  return (
    <>
      <PageMeta title="My teams" />

      <div className="page-head">
        <div>
          <h1>My teams</h1>
          <p className="sub">Your teams, the requests you sent and the requests you received.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="My teams sections">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={`tab${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === TAB_TEAMS && <TeamsTab />}
      {tab === TAB_SENT && <SentRequestsTab />}
      {tab === TAB_RECEIVED && <ReceivedRequestsTab />}
    </>
  );
}
