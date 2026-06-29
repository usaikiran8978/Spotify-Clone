const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function req(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json.data;
}

export const api = {
  languages: () => req('/api/languages'),
  categories: () => req('/api/categories'),
  branding: () => req('/api/branding'),
  updateBranding: (patch) =>
    req('/api/admin/branding', { method: 'PUT', body: JSON.stringify(patch) }),
  songs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v),
    ).toString();
    return req(`/api/songs${qs ? `?${qs}` : ''}`);
  },
  latest: (language) =>
    req(`/api/songs/latest${language ? `?language=${language}` : ''}`),
  create: (song) =>
    req('/api/songs', { method: 'POST', body: JSON.stringify(song) }),
  update: (id, patch) =>
    req(`/api/songs/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  remove: (id) => req(`/api/songs/${id}`, { method: 'DELETE' }),
  removeMany: (ids) =>
    req('/api/admin/delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  clearAll: () => req('/api/admin/clear', { method: 'POST' }),
  reseed: () => req('/api/admin/reseed', { method: 'POST' }),
  importReal: ({ source, perTerm } = {}) => {
    const qs = new URLSearchParams();
    if (source) qs.set('source', source);
    if (perTerm) qs.set('perTerm', perTerm);
    const suffix = qs.toString() ? `?${qs}` : '';
    return req(`/api/admin/import${suffix}`, { method: 'POST' });
  },
};
