import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';
import SkillTag from '../components/SkillTag.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import dashboardService from '../services/dashboardService.js';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, retry } = useAsync(() => dashboardService.get(), []);

  if (loading) {
    return (
      <>
        <PageMeta title="Dashboard" />
        <Loader label="Loading your dashboard…" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageMeta title="Dashboard" />
        <ErrorAlert error={error} onRetry={retry} />
      </>
    );
  }

  // dashboardService.get() returns the envelope { data: { stats, mySkills, ... } }.
  const payload = data?.data ?? {};
  const stats = payload?.stats ?? {};
  const mySkills = Array.isArray(payload?.mySkills) ? payload.mySkills : [];
  const myProjects = Array.isArray(payload?.myProjects) ? payload.myProjects : [];
  const recentProjects = Array.isArray(payload?.recentProjects) ? payload.recentProjects : [];

  const firstName = (user?.name ?? 'there').trim().split(/\s+/)[0] || 'there';

  return (
    <>
      <PageMeta title="Dashboard" />

      <div className="dash-head">
        <div>
          <h1>Hi, {firstName}.</h1>
          <p className="sub muted">Here&apos;s what&apos;s happening on SkillBridge.</p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          + New project
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard label="My projects" value={stats.myProjects} accent="indigo" />
        <StatCard label="Active teams" value={stats.activeTeams} accent="green" />
        <StatCard label="Requests received" value={stats.pendingIncoming} accent="amber" />
        <StatCard label="Requests sent" value={stats.pendingOutgoing} accent="violet" />
      </div>

      <section className="dash-section">
        <div className="section-head">
          <h2>My skills</h2>
          <Link to="/profile" className="btn btn-ghost btn-sm">
            Edit profile →
          </Link>
        </div>
        <div className="card chips-strip">
          {mySkills.length > 0 ? (
            <div className="chip-row">
              {mySkills.map((skill) => (
                <SkillTag key={skill} skill={skill} />
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No skills on your profile yet — add them so teammates can find you.
            </p>
          )}
        </div>
      </section>

      <section className="dash-section">
        <div className="section-head">
          <h2>My projects</h2>
          {myProjects.length > 0 ? (
            <Link to="/profile" className="btn btn-ghost btn-sm">
              View all →
            </Link>
          ) : null}
        </div>
        {myProjects.length === 0 ? (
          <EmptyState
            icon="🚀"
            title="No project ideas yet"
            hint="Share your first idea — someone on campus may be looking for teammates like you."
            actionLabel="New project"
            to="/projects/new"
          />
        ) : (
          <div className="cards-grid">
            {myProjects.slice(0, 3).map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </section>

      <section className="dash-section">
        <div className="section-head">
          <h2>Recent projects from students</h2>
          <Link to="/projects" className="btn btn-ghost btn-sm">
            Explore all →
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <EmptyState
            icon="🧭"
            title="Nothing new to discover"
            hint="When other students post open projects, the newest ones show up here."
            actionLabel="Explore projects"
            to="/projects"
          />
        ) : (
          <div className="cards-grid">
            {recentProjects.slice(0, 6).map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
