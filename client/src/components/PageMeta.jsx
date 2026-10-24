import { useEffect } from 'react';

export default function PageMeta({ title }) {
  useEffect(() => {
    document.title = title ? `SkillBridge — ${title}` : 'SkillBridge';
  }, [title]);
  return null;
}
