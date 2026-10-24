import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatDate } from '../components/ProjectCard.jsx';
import adminService from '../services/adminService.js';
import projectService from '../services/projectService.js';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';

function idOf(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value?._id ?? '');
}

function latestIdOf(user) {
  return user?._id ?? user?.id ?? '';
}

function AdminUsersTab({ me, onStatsChange }) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [roleBusyId, setRoleBusyId] = useState(null);
  const [roleError, setRoleError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch((prev) => (prev === searchInput.trim() ? prev : searchInput.trim()));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, loading, error, retry } = useAsync(
    () => adminService.listUsers({ search, page, limit: 10 }),
    [search, page]
  );

  const myId = idOf(me);
  const users = Array.isArray(data?.data) ? data.data : [];

  const changeRole = async (user, role) => {
    setRoleBusyId(user?._id);
    setRoleError(null);
    try {
      await adminService.setRole(user._id, role);
      retry();
      onStatsChange?.();
    } catch (err) {
      setRoleError(err?.message ?? 'Could not change this role.');
    } finally {
      setRoleBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await adminService.deleteUser(deleteTarget._id);
      setDeleteTarget(null);
      retry();
      onStatsChange?.();
    } catch (err) {
      setDeleteError(err?.message ?? 'Could not delete this user.');
      setDeleteTarget(null);
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) return <Loader label="Loading users…" />;
  if (error) return <ErrorAlert error={error} onRetry={retry} />;

  return (
    <>
      {roleError ? (
        <p className="panel-error" style={{ marginBottom: 12 }}>
          {roleError}
        </p>
      ) : null}
      {deleteError ? (
        <p className="panel-error" style={{ marginBottom: 12 }}>
          {deleteError}
        </p>
      ) : null}

      <form
        className="filter-row"
        role="search"
        style={{ marginBottom: 16 }}
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(searchInput.trim());
          setPage(1);
        }}
      >
        <input
          className="input search-input"
          type="search"
          placeholder="Search by name or email…"
          aria-label="Search users by name or email"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button type="submit" className="btn btn-outline btn-sm">
          Search
        </button>
        {search ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setPage(1);
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      {users.length === 0 ? (
        <EmptyState
          icon="🧑‍💼"
          title="No users match your search."
          hint="Try a different name or email, or clear the search."
          actionLabel="Clear search"
          onAction={() => {
            setSearchInput('');
            setSearch('');
            setPage(1);
          }}
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Projects</th>
                  <th scope="col">Joined</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isMe = idOf(user) === myId;
                  const projectCount = user?.projectsCount ?? user?.projectCount;
                  const pendingRole = roleBusyId === user?._id;

                  return (
                    <tr key={idOf(user)}>
                      <td>
                        <span className="cell-user">
                          <Avatar name={user?.name} size="sm" />
                          <strong>
                            {user?.name ?? 'Unknown'}
                            {isMe ? ' (you)' : ''}
                          </strong>
                        </span>
                      </td>
                      <td className="muted">{user?.email ?? '—'}</td>
                      <td>
                        <select
                          className="select select-inline select-compact"
                          value={user?.role ?? 'student'}
                          disabled={isMe || pendingRole}
                          title={
                            isMe ? 'You cannot change your own role' : undefined
                          }
                          aria-label={`Role for ${user?.name ?? 'user'}`}
                          onChange={(event) => changeRole(user, event.target.value)}
                        >
                          <option value="student">student</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>{typeof projectCount === 'number' ? projectCount : '—'}</td>
                      <td className="muted">{formatDate(user?.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger-soft btn-sm"
                          disabled={isMe}
                          title={
                            isMe ? 'You cannot delete your own account' : 'Delete this user'
                          }
                          onClick={() => setDeleteTarget(user)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data?.page ?? page}
            pages={data?.pages ?? 0}
            onChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? 'this user'}?`}
        message="This removes their projects, teams and join requests. This cannot be undone."
        confirmLabel="Delete user"
        busy={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

function AdminProjectsTab({ onStatsChange }) {
  const { data, loading, error, retry } = useAsync(
    () => projectService.listProjects({ page: 1, limit: 50 }),
    []
  );
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const projects = Array.isArray(data?.data) ? data.data : [];

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await adminService.deleteProject(deleteTarget._id);
      setDeleteTarget(null);
      retry();
      onStatsChange?.();
    } catch (err) {
      setDeleteError(err?.message ?? 'Could not delete this project.');
      setDeleteTarget(null);
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) return <Loader label="Loading projects…" />;
  if (error) return <ErrorAlert error={error} onRetry={retry} />;

  if (projects.length === 0) {
    return (
      <EmptyState
        icon="🗂️"
        title="No projects on the platform yet."
        hint="Projects appear here as soon as students share them."
      />
    );
  }

  return (
    <>
      {deleteError ? (
        <p className="panel-error" style={{ marginBottom: 12 }}>
          {deleteError}
        </p>
      ) : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Owner</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={idOf(project)}>
                <td>
                  <Link to={`/projects/${idOf(project)}`}>{project?.title ?? 'Untitled'}</Link>
                </td>
                <td>{project?.owner?.name ?? 'Unknown'}</td>
                <td>
                  <StatusBadge status={project?.status} />
                </td>
                <td className="muted">{formatDate(project?.createdAt)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-danger-soft btn-sm"
                    onClick={() => setDeleteTarget(project)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete “${deleteTarget?.title ?? 'this project'}”?`}
        message="This also removes its team and join requests. This cannot be undone."
        confirmLabel="Delete project"
        busy={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const statsState = useAsync(() => adminService.stats(), []);
  const [tab, setTab] = useState('users');

  // GET /admin/stats returns the standard envelope { data: { stats fields } }.
  const raw = statsState.data?.data ?? statsState.data ?? {};
  const stats = raw?.stats ?? raw ?? {};
  const usersStats = stats?.users ?? {};
  const projectsStats = stats?.projects ?? {};
  const latestUsers = Array.isArray(stats?.latestUsers) ? stats.latestUsers : [];

  if (statsState.loading) {
    return (
      <>
        <PageMeta title="Admin panel" />
        <Loader label="Loading admin panel…" />
      </>
    );
  }

  if (statsState.error) {
    return (
      <>
        <PageMeta title="Admin panel" />
        <ErrorAlert error={statsState.error} onRetry={statsState.retry} />
      </>
    );
  }

  return (
    <>
      <PageMeta title="Admin panel" />

      <div className="page-head">
        <div>
          <h1>Admin panel</h1>
          <p className="sub">Platform-wide stats, users and projects.</p>
        </div>
        <span className="badge badge-open">Role: admin</span>
      </div>

      <div className="stat-grid cols-6">
        <StatCard label="Students" value={usersStats.students ?? usersStats.total} accent="indigo" />
        <StatCard label="Admins" value={usersStats.admins} accent="red" />
        <StatCard label="Projects" value={projectsStats.total} accent="violet" />
        <StatCard label="Open projects" value={projectsStats.open} accent="green" />
        <StatCard label="Teams" value={stats?.teams} accent="blue" />
        <StatCard label="Pending requests" value={stats?.pendingRequests} accent="amber" />
      </div>

      <section className="dash-section">
        <div className="card">
          <p className="detail-section-title">Latest signups</p>
          {latestUsers.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>
              No signups yet.
            </p>
          ) : (
            <ul className="team-list">
              {latestUsers.slice(0, 5).map((signup) => {
                const signupId = latestIdOf(signup);
                return (
                  <li className="member-row" key={signupId}>
                    <Avatar name={signup?.name} size="sm" />
                    {signupId ? (
                      <Link to={`/students/${signupId}`}>{signup?.name ?? 'Unknown'}</Link>
                    ) : (
                      <span>{signup?.name ?? 'Unknown'}</span>
                    )}
                    <span className="muted small">{formatDate(signup?.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="dash-section">
        <div className="tabs" role="tablist" aria-label="Admin sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'users'}
            className={`tab${tab === 'users' ? ' active' : ''}`}
            onClick={() => setTab('users')}
          >
            Users
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'projects'}
            className={`tab${tab === 'projects' ? ' active' : ''}`}
            onClick={() => setTab('projects')}
          >
            Projects
          </button>
        </div>

        {tab === 'users' ? (
          <AdminUsersTab me={user} onStatsChange={statsState.retry} />
        ) : (
          <AdminProjectsTab onStatsChange={statsState.retry} />
        )}
      </section>
    </>
  );
}
