export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function filledSeatsOf(project) {
  // seats filled = owner (always joins when the idea is created) + teammates
  const counts = [project?.membersCount, project?.memberCount, project?.filledSeats];
  for (const count of counts) {
    if (typeof count === 'number') return count + 1;
  }
  const members = project?.members ?? project?.team?.members;
  if (Array.isArray(members)) return members.length + 1;
  return null;
}

export function totalSeatsOf(project) {
  const raw = project?.teamSize;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  const size = Number(raw);
  if (!Number.isFinite(size) || String(raw).trim() === '') return null;
  return size + 1;
}

export function seatsTextOf(project) {
  const total = totalSeatsOf(project);
  if (total === null) return '';
  const filled = filledSeatsOf(project);
  if (filled === null) return `${total} seat${total === 1 ? '' : 's'}`;
  return `${filled} of ${total} seats filled`;
}

export default function ProjectCard({ project }) {
  const skills = Array.isArray(project?.requiredSkills) ? project.requiredSkills : [];
  const shown = skills.slice(0, 4);
  const extra = skills.length - shown.length;
  const seats = seatsTextOf(project);
  const href = `/projects/${project?._id ?? ''}`;

  return (
    <article className="card interactive project-card">
      <div className="card-title-row">
        <h3 className="card-title">
          <Link to={href}>{project?.title ?? 'Untitled project'}</Link>
        </h3>
        <StatusBadge status={project?.status} />
      </div>

      <p className="card-desc">{project?.description ?? ''}</p>

      <div className="chip-row">
        {shown.map((skill) => (
          <SkillTag key={skill} skill={skill} />
        ))}
        {extra > 0 ? <span className="chip chip-alt">+{extra}</span> : null}
      </div>

      <div className="card-foot">
        <span>
          by <strong>{project?.owner?.name ?? 'Unknown'}</strong>
        </span>
        {seats ? <span>{seats}</span> : null}
      </div>

      <Link
        className="card-link-stretch"
        to={href}
        aria-label={`View project: ${project?.title ?? 'untitled'}`}
      />
    </article>
  );
}
