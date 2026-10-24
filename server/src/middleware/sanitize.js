/**
 * NoSQL operator-injection guard (guide §10): strips keys that start with `$`
 * or contain dots anywhere in body/query/params before validators run.
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const output = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const [key, value] of Object.entries(output)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete output[key];
      continue;
    }
    if (value && typeof value === 'object') {
      output[key] = sanitizeObject(value);
    }
  }
  return output;
}

export function sanitizeRequest(req, _res, next) {
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query) ?? {};
  req.params = sanitizeObject(req.params) ?? {};
  next();
}
