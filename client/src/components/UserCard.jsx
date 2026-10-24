import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import SkillTag from './SkillTag.jsx';

export default function UserCard({ user }) {
  const skills = Array.isArray(user?.skills) ? user.skills : [];
  const shown = skills.slice(0, 4);
  const extra = skills.length - shown.length;
  const projectsCount = user?.projectsCount ?? user?.projectCount;

  return (
    <article className="card interactive user-card">
      <div className="who">
        <Avatar name={user?.name} size="md" />
        <div>
          <h3>{user?.name ?? 'Unknown'}</h3>
          {user?.department ? <p className="muted">{user.department}</p> : null}
        </div>
      </div>

      <div className="chip-row">
        {shown.map((skill) => (
          <SkillTag key={skill} skill={skill} />
        ))}
        {extra > 0 ? <span className="chip chip-alt">+{extra}</span> : null}
      </div>

      <div className="card-foot">
        {projectsCount !== undefined && projectsCount !== null ? (
          <span>
            {projectsCount} project{projectsCount === 1 ? '' : 's'}
          </span>
        ) : (
          <span />
        )}
        <Link className="btn btn-outline btn-sm" to={`/students/${user?._id ?? ''}`}>
          View profile
        </Link>
      </div>
    </article>
  );
}
