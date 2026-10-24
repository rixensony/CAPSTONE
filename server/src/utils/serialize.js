/**
 * The single place that shapes a User document for API responses.
 * Never includes the password hash (guide §10: never return hashes).
 */
export function toSafeUser(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : doc;
  return {
    _id: raw._id,
    id: raw._id?.toString?.(),
    name: raw.name,
    email: raw.email,
    department: raw.department,
    role: raw.role,
    skills: raw.skills || [],
    interests: raw.interests || [],
    bio: raw.bio || '',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** Public user shape for listings/profiles (email is private — omitted). */
export function toSummaryUser(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : doc;
  return {
    _id: raw._id,
    id: raw._id?.toString?.(),
    name: raw.name,
    department: raw.department,
    role: raw.role,
    skills: raw.skills || [],
    interests: raw.interests || [],
    bio: raw.bio || '',
    createdAt: raw.createdAt,
  };
}

/** Minimal owner shape embedded in projects. */
export function toOwnerRef(doc) {
  if (!doc) return null;
  return { _id: doc._id, name: doc.name };
}
