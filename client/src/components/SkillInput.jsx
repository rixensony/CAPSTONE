import { useState } from 'react';
import SkillTag from './SkillTag.jsx';

const MAX_SKILL_LENGTH = 16;

export default function SkillInput({
  value = [],
  onChange,
  placeholder = 'Type a skill and press Enter',
  disabled = false,
  maxItems = 10,
  id,
  inputLabel = 'Add item',
}) {
  const [draft, setDraft] = useState('');

  const canAdd = !disabled && value.length < maxItems;
  const tooLong = draft.trim().length > MAX_SKILL_LENGTH;
  const duplicate = value.some(
    (item) => item.toLowerCase() === draft.trim().toLowerCase()
  );

  const addSkill = () => {
    const next = draft.trim();
    if (!next || tooLong || duplicate || !canAdd) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  };

  const removeSkill = (skill) => {
    onChange(value.filter((item) => item !== skill));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="skill-input">
      <input
        id={id}
        className="input"
        type="text"
        value={draft}
        placeholder={canAdd ? placeholder : `Max ${maxItems} items`}
        disabled={!canAdd}
        aria-label={inputLabel}
        aria-invalid={tooLong || duplicate ? 'true' : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {value.length >= maxItems ? null : (
        <p className={`counter${tooLong ? ' over' : ''}`}>
          {tooLong
            ? `Max ${MAX_SKILL_LENGTH} characters per item`
            : duplicate
              ? 'Already added'
              : `Press Enter to add · ${value.length}/${maxItems}`}
        </p>
      )}
      {value.length > 0 ? (
        <div className="chip-row">
          {value.map((skill) => (
            <SkillTag
              key={skill}
              skill={skill}
              onRemove={canAdd || !disabled ? () => removeSkill(skill) : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
