import { API_URL } from './config';

async function req(path) {
  const res = await fetch(`${API_URL}${path}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json.data;
}

const qs = (params) => {
  const entries = Object.entries(params || {}).filter(([, v]) => v);
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export const api = {
  languages: () => req('/api/languages'),
  categories: () => req('/api/categories'),
  home: (language) => req(`/api/home${qs({ language })}`),
  latest: (language) => req(`/api/songs/latest${qs({ language })}`),
  songs: (params) => req(`/api/songs${qs(params)}`),
};
