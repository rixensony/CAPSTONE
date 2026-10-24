import { Link, useParams } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import SkillTag from '../components/SkillTag.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import userService from '../services/userService.js';
import useAsync from '../hooks/useAsync.js';

export default function StudentProfilePage() {
  const { id } = useParams();
  const { data, loading, error, retry } = useAsync(() => userService.getUser(id), [id]);

  if (loading) {
    return (
      <>
        <PageMeta title="Student profile" />
        <Loader label="Loading profile…" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageMeta title="Student profile" />
        <Link className="page-back" to="/students">
          ← Back to find teammates
        </Link>
        <ErrorAlert error={error} onRetry={retry} />
      </>
    );
  }

  // getUser() returns the envelope { data: { user, projects } }.
  const payload = data?.data ?? {};
  const user = payload.user ?? data?.user ?? null;
  const projects = Array.isArray(payload.projects) ? payload.projects : Array.isArray(data?.projects) ? data.projects : [];
  const skills = Array.isArray(user?.skills) ? user.skills : [];
  const interests = Array.isArray(user?.interests) ? user.interests : [];
  const displayName = user?.name ?? 'This student';

  return (
    <>
      <PageMeta title={displayName} />

      <Link className="page-back" to="/students">
        ← Back to find teammates
      </Link>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="who" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Avatar name={user?.name} size="lg" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{user?.name ?? 'Unknown'}</h1>
            {user?.department ? (
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {user.department}
              </p>
            ) : null}
          </div>
        </div>

        {user?.bio ? (
          <>
            <hr className="divider" />
            <p className="detail-section-title">About</p>
            <p className="detail-desc" style={{ margin: 0 }}>
              {user.bio}
            </p>
          </>
        ) : null}

        <hr className="divider" />

        <p className="detail-section-title">Skills</p>
        {skills.length > 0 ? (
          <div className="chip-row" style={{ marginBottom: 18 }}>
            {skills.map((skill) => (
              <SkillTag key={skill} skill={skill} />
            ))}
          </div>
        ) : (
          <p className="muted small" style={{ marginBottom: 18 }}>
            No skills listed yet.
          </p>
        )}

        <p className="detail-section-title">Interests</p>
        {interests.length > 0 ? (
          <div className="chip-row muted-chips">
            {interests.map((interest) => (
              <SkillTag key={interest} skill={interest} />
            ))}
          </div>
        ) : (
          <p className="muted small" style={{ marginBottom: 0 }}>
            No interests listed yet.
          </p>
        )}
      </div>

      <section>
        <div className="section-head">
          <h2>Their projects</h2>
          {projects.length > 0 ? (
            <span className="muted small">
              {projects.length} project{projects.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {projects.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title={`${displayName} hasn't posted any project ideas yet.`}
            hint="Check back later — or browse other students' ideas in Explore projects."
            actionLabel="Explore projects"
            to="/projects"
          />
        ) : (
          <div className="cards-grid">
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
