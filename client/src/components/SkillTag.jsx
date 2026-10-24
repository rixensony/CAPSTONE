export default function SkillTag({ skill, onRemove, removeLabel }) {
  if (!onRemove) {
    return <span className="chip">{skill}</span>;
  }

  return (
    <span className="chip">
      {skill}
      <button
        type="button"
        className="chip-minus"
        onClick={onRemove}
        aria-label={removeLabel ?? `Remove ${skill}`}
      >
        ×
      </button>
    </span>
  );
}
