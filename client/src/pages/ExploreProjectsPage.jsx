import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import Loader from '../components/Loader.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import Pagination from '../components/Pagination.jsx';
import projectService from '../services/projectService.js';
import useAsync from '../hooks/useAsync.js';

export const CURATED_SKILLS = [
  'React',
  'Node.js',
  'MongoDB',
  'Python',
  'Java',
  'UI/UX Design',
  'Flutter',
  'Data Science',
  'Machine Learning',
  'HTML/CSS',
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'full', label: 'Full' },
  { value: 'completed', label: 'Completed' },
];

const PAGE_LIMIT = 9;

export default function ExploreProjectsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', skill: '', status: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        const next = searchInput.trim();
        if (prev.search === next) return prev;
        return { ...prev, search: next };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.skill, filters.status]);

  const { data, loading, error, retry } = useAsync(
    () =>
      projectService.listProjects({
        search: filters.search,
        skill: filters.skill,
        status: filters.status,
        page,
        limit: PAGE_LIMIT,
      }),
    [filters.search, filters.skill, filters.status, page]
  );

  const items = Array.isArray(data?.data) ? data.data : [];
  const totalPages = data?.pages ?? 0;
  const hasFilters = Boolean(filters.search || filters.skill || filters.status);

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ search: '', skill: '', status: '' });
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput.trim() }));
    setPage(1);
  };

  return (
    <>
      <PageMeta title="Explore projects" />

      <div className="page-head">
        <div>
          <h1>Explore projects</h1>
          <p className="sub">
            Find an idea you like and ask to join the team — or post your own.
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          + New idea
        </Link>
      </div>

      <div className="filter-bar">
        <form className="filter-row" role="search" onSubmit={submitSearch}>
          <input
            className="input search-input"
            type="search"
            placeholder="Search by title…"
            aria-label="Search projects by title"
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
              className={`chip chip-filter${filters.skill === '' ? ' active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, skill: '' }))}
            >
              All
            </button>
            {CURATED_SKILLS.map((skill) => (
              <button
                type="button"
                key={skill}
                className={`chip chip-filter${filters.skill === skill ? ' active' : ''}`}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, skill: prev.skill === skill ? '' : skill }))
                }
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="label" id="explore-status-label">
            Status
          </span>
          <select
            className="select select-inline"
            aria-labelledby="explore-status-label"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {hasFilters ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <Loader label="Loading projects…" />
      ) : error ? (
        <ErrorAlert error={error} onRetry={retry} />
      ) : items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon="🔍"
            title="No projects match your filters"
            hint="Try a different keyword, skill or status — or clear the filters to see everything."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            icon="🚀"
            title="No projects yet"
            hint="Be the first to share a project idea and find your teammates."
            actionLabel="New project"
            to="/projects/new"
          />
        )
      ) : (
        <>
          <div className="cards-grid">
            {items.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
          <Pagination page={data?.page ?? page} pages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
