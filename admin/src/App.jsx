import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const EMPTY = {
  title: '',
  artist: '',
  album: '',
  language: 'telugu',
  categories: [],
  year: new Date().getFullYear(),
  audioUrl: '',
  coverUrl: '',
};

export default function App() {
  const [languages, setLanguages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [langFilter, setLangFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [query, setQuery] = useState('');
  const [latestOnly, setLatestOnly] = useState(false);

  // editor
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const list = latestOnly
        ? await api.latest(langFilter)
        : await api.songs({ language: langFilter, category: catFilter, q: query });
      setSongs(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([api.languages(), api.categories()])
      .then(([l, c]) => {
        setLanguages(l);
        setCategories(c);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langFilter, catFilter, latestOnly]);

  const stats = useMemo(() => {
    const byLang = {};
    songs.forEach((s) => (byLang[s.language] = (byLang[s.language] || 0) + 1));
    return byLang;
  }, [songs]);

  function startEdit(song) {
    setEditingId(song.id);
    setForm({
      title: song.title,
      artist: song.artist,
      album: song.album || '',
      language: song.language,
      categories: song.categories || [],
      year: song.year || '',
      audioUrl: song.audioUrl || '',
      coverUrl: song.coverUrl || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
  }

  function toggleCategory(slug) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(slug)
        ? f.categories.filter((c) => c !== slug)
        : [...f.categories, slug],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, year: Number(form.year) || undefined };
      if (editingId) await api.update(editingId, payload);
      else await api.create(payload);
      resetForm();
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function del(id) {
    if (!confirm('Delete this song?')) return;
    await api.remove(id);
    refresh();
  }

  async function reseed() {
    if (!confirm('Reset the catalogue to seed data?')) return;
    await api.reseed();
    refresh();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">●</span> Spotify Clone · Admin
        </div>
        <button className="ghost" onClick={reseed}>
          Reset to seed
        </button>
      </header>

      {error && <div className="error">⚠ {error}</div>}

      <div className="layout">
        {/* ---- Editor ---- */}
        <section className="card editor">
          <h2>{editingId ? 'Edit song' : 'Add new song'}</h2>
          <form onSubmit={submit}>
            <label>
              Title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Artist
              <input
                required
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
              />
            </label>
            <div className="row">
              <label>
                Language
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Year
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </label>
            </div>
            <label>
              Album
              <input
                value={form.album}
                onChange={(e) => setForm({ ...form, album: e.target.value })}
              />
            </label>
            <label>
              Audio URL (.mp3)
              <input
                value={form.audioUrl}
                placeholder="https://…/song.mp3"
                onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
              />
            </label>
            <label>
              Cover image URL
              <input
                value={form.coverUrl}
                placeholder="https://…/cover.jpg"
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              />
            </label>

            <div className="cats">
              <span className="cats-label">Categories</span>
              <div className="chips">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.slug}
                    className={`chip ${form.categories.includes(c.slug) ? 'on' : ''}`}
                    onClick={() => toggleCategory(c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="actions">
              <button className="primary" type="submit">
                {editingId ? 'Save changes' : 'Add song'}
              </button>
              {editingId && (
                <button type="button" className="ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ---- List ---- */}
        <section className="card list">
          <div className="list-head">
            <h2>Catalogue ({songs.length})</h2>
            <div className="filters">
              <label className="latest-toggle">
                <input
                  type="checkbox"
                  checked={latestOnly}
                  onChange={(e) => setLatestOnly(e.target.checked)}
                />
                Latest songs
              </label>
              <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
                <option value="">All languages</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                disabled={latestOnly}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && refresh()}
                disabled={latestOnly}
              />
            </div>
          </div>

          <div className="stat-row">
            {Object.entries(stats).map(([lang, n]) => (
              <span className="stat" key={lang}>
                {lang}: <b>{n}</b>
              </span>
            ))}
          </div>

          {loading ? (
            <p className="muted">Loading…</p>
          ) : songs.length === 0 ? (
            <p className="muted">No songs match these filters.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Title</th>
                  <th>Artist</th>
                  <th>Lang</th>
                  <th>Categories</th>
                  <th>Year</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {songs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.coverUrl ? (
                        <img className="thumb" src={s.coverUrl} alt="" />
                      ) : (
                        <div className="thumb placeholder" />
                      )}
                    </td>
                    <td className="strong">{s.title}</td>
                    <td>{s.artist}</td>
                    <td>
                      <span className="badge">{s.language}</span>
                    </td>
                    <td className="cats-cell">
                      {(s.categories || []).map((c) => (
                        <span key={c} className="tag">
                          {c}
                        </span>
                      ))}
                    </td>
                    <td>{s.year}</td>
                    <td className="rowactions">
                      <button className="link" onClick={() => startEdit(s)}>
                        Edit
                      </button>
                      <button className="link danger" onClick={() => del(s.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
