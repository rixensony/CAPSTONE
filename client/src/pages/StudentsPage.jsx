import { useEffect, useState } from 'react';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import UserCard from '../components/UserCard.jsx';
import Pagination from '../components/Pagination.jsx';
import userService from '../services/userService.js';
import useAsync from '../hooks/useAsync.js';
import { CURATED_SKILLS } from './ExploreProjectsPage.jsx';

const PAGE_LIMIT = 9;

export default function StudentsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch((prev) => (prev === searchInput.trim() ? prev : searchInput.trim()));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, skill]);

  const { data, loading, error, retry } = useAsync(
    () => userService.listUsers({ search, skill, page, limit: PAGE_LIMIT }),
    [search, skill, page]
  );

  const users = Array.isArray(data?.data) ? data.data : [];
  const totalPages = data?.pages ?? 0;
  const hasFilters = Boolean(search || skill);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSkill('');
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <>
      <PageMeta title="Find teammates" />

      <div className="page-head">
        <div>
          <h1>Find teammates</h1>
          <p className="sub">Search students by name or the skills they list.</p>
        </div>
      </div>

      <div className="filter-bar">
        <form className="filter-row" role="search" onSubmit={submitSearch}>
          <input
            className="input search-input"
            type="search"
            placeholder="Search by name…"
            aria-label="Search students by name"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            Search
          </button>
        </form>

        <div className="filter-row">
          <span className="label">Skill</span>
          <div className="chip-row">
            <button
              type="button"
              className={`chip chip-filter${skill === '' ? ' active' : ''}`}
              onClick={() => setSkill('')}
            >
              All
            </button>
            {CURATED_SKILLS.map((item) => (
              <button
                type="button"
                key={item}
                className={`chip chip-filter${skill === item ? ' active' : ''}`}
                onClick={() => setSkill((current) => (current === item ? '' : item))}
              >
                {item}
              </button>
            ))}
          </div>
          {hasFilters ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <Loader label="Loading students…" />
      ) : error ? (
        <ErrorAlert error={error} onRetry={retry} />
      ) : users.length === 0 ? (
        <EmptyState
          icon="🧑‍🎓"
          title="No students match your search yet."
          hint="Try a different name or skill, or clear the filters to browse everyone."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : (
        <>
          <div className="cards-grid">
            {users.map((user) => (
              <UserCard key={user._id} user={user} />
            ))}
          </div>
          <Pagination page={data?.page ?? page} pages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
