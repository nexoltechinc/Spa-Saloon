import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Clock3,
  CheckCircle2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmDelete, crmList, crmUpdate } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import { collectOptionValues, formatDate, formatDateTime, normalizeNumber, normalizeText } from './crmWorkspaceUtils';
import './CrmWorkspace.css';

const STATUS_OPTIONS = ['Open', 'Planning', 'Renovation', 'Closed'];
const STATUS_FILTERS = ['All Statuses', ...STATUS_OPTIONS];
const ACTIVE_FILTERS = ['All Branches', 'Active Only', 'Inactive Only'];

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'open') return 'good';
  if (normalized === 'planning') return 'warning';
  if (normalized === 'renovation') return 'info';
  if (normalized === 'closed') return 'alert';
  return 'neutral';
};

const getActiveTone = (active) => (active ? 'good' : 'alert');

const normalizeBranch = (branch = {}, index = 0) => {
  const status = branch.status || branch.branchStatus || 'Planning';
  const active =
    typeof branch.active === 'boolean'
      ? branch.active
      : String(status).toLowerCase() === 'open' || String(branch.branchState || '').toLowerCase() === 'active';

  return {
    id: branch.id || branch._id || branch.branchId || `branch-${index + 1}`,
    name: branch.name || branch.branchName || 'Untitled Branch',
    managerName: branch.managerName || branch.manager || 'Unassigned',
    city: branch.city || '',
    state: branch.state || '',
    phone: branch.phone || '',
    email: branch.email || '',
    hours: branch.hours || '',
    status,
    active,
    rooms: Math.max(0, Math.round(normalizeNumber(branch.rooms, 0))),
    teamSize: Math.max(0, Math.round(normalizeNumber(branch.teamSize ?? branch.team_size, 0))),
    notes: branch.notes || '',
    createdAt: branch.createdAt || branch.created_at || new Date().toISOString(),
    updatedAt: branch.updatedAt || branch.updated_at || branch.createdAt || new Date().toISOString(),
    metadata: branch.metadata || {},
  };
};

const emptyDraft = (branch = {}) => {
  const normalized = normalizeBranch(branch);
  return {
    id: normalized.id === 'branch-1' ? '' : normalized.id,
    name: normalized.name === 'Untitled Branch' ? '' : normalized.name,
    managerName: normalized.managerName === 'Unassigned' ? '' : normalized.managerName,
    city: normalized.city,
    state: normalized.state,
    phone: normalized.phone,
    email: normalized.email,
    hours: normalized.hours,
    status: normalized.status,
    active: normalized.active,
    rooms: String(normalized.rooms || ''),
    teamSize: String(normalized.teamSize || ''),
    notes: normalized.notes,
  };
};

const buildPayload = (draft) => ({
  id: normalizeText(draft.id),
  name: normalizeText(draft.name, 'Untitled Branch'),
  branchName: normalizeText(draft.name, 'Untitled Branch'),
  managerName: normalizeText(draft.managerName, 'Unassigned'),
  city: normalizeText(draft.city),
  state: normalizeText(draft.state),
  phone: normalizeText(draft.phone),
  email: normalizeText(draft.email),
  hours: normalizeText(draft.hours),
  status: normalizeText(draft.status, 'Planning'),
  active: Boolean(draft.active),
  rooms: Math.max(0, Math.round(normalizeNumber(draft.rooms, 0))),
  teamSize: Math.max(0, Math.round(normalizeNumber(draft.teamSize, 0))),
  notes: normalizeText(draft.notes),
});

const CrmBranches = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [mode, setMode] = useState('create');
  const [draft, setDraft] = useState(() => emptyDraft());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [activeFilter, setActiveFilter] = useState('All Branches');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadBranches = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('branches');
        if (!mounted) return;
        const normalized = Array.isArray(data) ? data.map(normalizeBranch) : [];
        setBranches(normalized);
        const firstId = normalized[0]?.id || '';
        setSelectedBranchId((current) => (normalized.some((branch) => branch.id === current) ? current : firstId));
        setMode(normalized.length ? 'edit' : 'create');
        setDraft(normalized.length ? emptyDraft(normalized[0]) : emptyDraft());
      } catch (error) {
        if (!mounted) return;
        setBranches([]);
        setSelectedBranchId('');
        setMode('create');
        setDraft(emptyDraft());
        setLoadError(error.message || 'Unable to load branches from the CRM API.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadBranches();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredBranches = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return branches
      .filter((branch) => {
        const haystack = [branch.name, branch.managerName, branch.city, branch.state, branch.phone, branch.email, branch.hours, branch.status, branch.notes]
          .join(' ')
          .toLowerCase();

        const matchesSearch = !search || haystack.includes(search);
        const matchesStatus = statusFilter === 'All Statuses' || branch.status === statusFilter;
        const matchesCity = cityFilter === 'All Cities' || branch.city === cityFilter;
        const matchesActive =
          activeFilter === 'All Branches' ||
          (activeFilter === 'Active Only' && branch.active) ||
          (activeFilter === 'Inactive Only' && !branch.active);

        return matchesSearch && matchesStatus && matchesCity && matchesActive;
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [activeFilter, branches, cityFilter, searchTerm, statusFilter]);

  const cityOptions = useMemo(() => ['All Cities', ...collectOptionValues(branches, ['city'])], [branches]);

  useEffect(() => {
    if (!filteredBranches.length) {
      setSelectedBranchId('');
      if (mode === 'edit') {
        setMode('create');
        setDraft(emptyDraft());
      }
      return;
    }

    if (mode === 'create' && !selectedBranchId) {
      return;
    }

    if (!filteredBranches.some((branch) => branch.id === selectedBranchId)) {
      setSelectedBranchId(filteredBranches[0].id);
      setMode('edit');
      setDraft(emptyDraft(filteredBranches[0]));
    }
  }, [filteredBranches, mode, selectedBranchId]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) || null,
    [branches, selectedBranchId],
  );

  const summaryCards = useMemo(() => {
    const total = branches.length;
    const activeCount = branches.filter((branch) => branch.active).length;
    const openCount = branches.filter((branch) => branch.status === 'Open').length;
    const rooms = branches.reduce((sum, branch) => sum + normalizeNumber(branch.rooms, 0), 0);
    const teamSize = branches.reduce((sum, branch) => sum + normalizeNumber(branch.teamSize, 0), 0);

    return [
      { label: 'Total Branches', value: total, subtext: 'Persistent locations in Postgres' },
      { label: 'Active Locations', value: activeCount, subtext: 'Operational branches serving guests' },
      { label: 'Open Branches', value: openCount, subtext: 'Visible to the booking engine' },
      { label: 'Rooms', value: rooms, subtext: 'Treatment rooms across the network' },
      { label: 'Team Members', value: teamSize, subtext: 'Sum of staffing capacity' },
    ];
  }, [branches]);

  const openCreate = () => {
    setSelectedBranchId('');
    setMode('create');
    setDraft(emptyDraft());
    setFormError('');
  };

  const openEdit = (branch) => {
    setSelectedBranchId(branch.id);
    setMode('edit');
    setDraft(emptyDraft(branch));
    setFormError('');
  };

  const saveBranch = async (nextDraft, nextMode = mode, nextId = selectedBranchId) => {
    const payload = buildPayload(nextDraft);
    const saved = nextMode === 'create'
      ? await crmCreate('branches', payload)
      : await crmUpdate('branches', nextId || payload.id, payload);
    const normalized = normalizeBranch(saved);

    setBranches((current) => {
      if (nextMode === 'create') {
        return [normalized, ...current];
      }
      return current.map((branch) => (branch.id === normalized.id ? normalized : branch));
    });
    setSelectedBranchId(normalized.id);
    setMode('edit');
    setDraft(emptyDraft(normalized));
    return normalized;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!normalizeText(draft.name)) {
      setFormError('Branch name is required.');
      return;
    }

    setSaving(true);
    try {
      await saveBranch(draft);
    } catch (error) {
      setFormError(error.message || 'Unable to save branch.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;
    if (!window.confirm(`Delete ${selectedBranch.name}?`)) return;

    setSaving(true);
    setFormError('');
    try {
      await crmDelete('branches', selectedBranch.id);
      setBranches((current) => current.filter((branch) => branch.id !== selectedBranch.id));
      const next = branches.find((branch) => branch.id !== selectedBranch.id);
      if (next) {
        openEdit(next);
      } else {
        openCreate();
      }
    } catch (error) {
      setFormError(error.message || 'Unable to delete branch.');
    } finally {
      setSaving(false);
    }
  };

  const toggleBranchActive = async (branch) => {
    const nextActive = !branch.active;
    const nextStatus = nextActive ? (branch.status === 'Closed' ? 'Open' : branch.status || 'Open') : 'Closed';
    const sourceDraft = selectedBranchId === branch.id ? draft : emptyDraft(branch);
    const nextDraft = {
      ...sourceDraft,
      active: nextActive,
      status: nextStatus,
    };

    if (mode === 'edit' && selectedBranchId === branch.id) {
      setDraft(nextDraft);
    }

    setSaving(true);
    setFormError('');
    try {
      const saved = await saveBranch(nextDraft, 'edit', branch.id);
      if (selectedBranchId !== saved.id) {
        setSelectedBranchId(saved.id);
      }
    } catch (error) {
      setFormError(error.message || 'Unable to update branch status.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All Statuses');
    setActiveFilter('All Branches');
    setCityFilter('All Cities');
  };

  const handleOpenSettings = () => {
    navigate('/crm/settings');
  };

  return (
    <CrmShell shellClassName="crm-workspace-shell">
      <main className="crm-workspace-main">
        <header className="crm-workspace-header">
          <div className="crm-workspace-header-copy">
            <p className="crm-workspace-kicker">Location Operations</p>
            <h1>Branches</h1>
            <p>
              Maintain the active spa locations, staffing, and business metadata that power the rest of the CRM.
            </p>
          </div>

          <div className="crm-workspace-header-stack">
            <div className="crm-workspace-actions">
              <input
                type="search"
                placeholder="Search branches by name, manager, city, or notes..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button type="button" className="crm-workspace-primary-btn" onClick={openCreate}>
                <Plus size={14} />
                New Branch
              </button>
              <button type="button" className="crm-workspace-ghost-btn" onClick={handleOpenSettings}>
                <Settings2 size={14} />
                Settings
              </button>
              <button type="button" className="crm-workspace-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="crm-workspace-summary">
          {summaryCards.map((card) => (
            <article key={card.label} className="crm-workspace-card">
              <p>{card.label}</p>
              <h2>{card.value}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        <section className="crm-workspace-filters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {STATUS_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
            {cityOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
            {ACTIVE_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button type="button" className="crm-workspace-chip" onClick={handleResetFilters}>
            <RefreshCcw size={14} />
            Reset Filters
          </button>
        </section>

        {loadError ? <p className="crm-workspace-inline-error">{loadError}</p> : null}

        <section className="crm-workspace-grid">
          <article className="crm-workspace-table-card">
            <header
              className="crm-workspace-table-head"
              style={{ gridTemplateColumns: 'minmax(220px, 1.4fr) 1fr 1fr 0.9fr 0.85fr' }}
            >
              <span>Branch</span>
              <span>Manager</span>
              <span>Location</span>
              <span>Operations</span>
              <span>Status</span>
            </header>

            {isLoading ? (
              <div className="crm-workspace-empty">
                <h3>Loading branches</h3>
                <p>Fetching branch records from the CRM backend.</p>
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="crm-workspace-empty">
                <h3>No branches found</h3>
                <p>Try widening the filters or create the first branch location.</p>
                <div className="crm-workspace-empty-actions">
                  <button type="button" className="crm-workspace-primary-btn" onClick={openCreate}>
                    <Plus size={14} />
                    New Branch
                  </button>
                  <button type="button" className="crm-workspace-secondary-btn" onClick={handleResetFilters}>
                    Show All
                  </button>
                </div>
              </div>
            ) : (
              <div className="crm-workspace-table-body">
                {filteredBranches.map((branch) => {
                  const isSelected = branch.id === selectedBranchId;

                  return (
                    <div
                      key={branch.id}
                      className={`crm-workspace-row${isSelected ? ' crm-workspace-row-active' : ''}`}
                      onClick={() => openEdit(branch)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openEdit(branch);
                        }
                      }}
                      style={{ gridTemplateColumns: 'minmax(220px, 1.4fr) 1fr 1fr 0.9fr 0.85fr' }}
                    >
                      <div className="crm-workspace-row-primary">
                        <p className="crm-workspace-row-title">{branch.name}</p>
                        <p className="crm-workspace-row-subtitle">
                          {branch.phone || 'No phone'} <span>•</span> {branch.email || 'No email'}
                        </p>
                      </div>
                      <div className="crm-workspace-row-meta">
                        <strong>{branch.managerName}</strong>
                        <span>{branch.updatedAt ? `Updated ${formatDate(branch.updatedAt)}` : 'No update timestamp'}</span>
                      </div>
                      <div className="crm-workspace-row-meta">
                        <strong>{branch.city || 'No city'}</strong>
                        <span>{branch.state || 'No state'} · {branch.hours || 'Hours not set'}</span>
                      </div>
                      <div className="crm-workspace-row-actions">
                        <button
                          type="button"
                          className="crm-workspace-chip"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(branch);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`crm-workspace-chip${branch.active ? ' crm-workspace-chip-active' : ''}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleBranchActive(branch);
                          }}
                        >
                          {branch.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                      <div className="crm-workspace-badge-row">
                        <span className={`crm-workspace-badge crm-workspace-badge-${getStatusTone(branch.status)}`}>{branch.status}</span>
                        <span className={`crm-workspace-badge crm-workspace-badge-${getActiveTone(branch.active)}`}>{branch.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="crm-workspace-detail-card">
            <div className="crm-workspace-detail-head">
              <p className="crm-workspace-detail-kicker">{mode === 'create' ? 'New Branch' : 'Branch Detail'}</p>
              <h3>{mode === 'create' ? 'Create branch record' : selectedBranch?.name || 'Select a branch'}</h3>
              <p>
                {mode === 'create'
                  ? 'Store the branch details in Postgres so the entire CRM can reference them consistently.'
                  : selectedBranch
                    ? `Last updated ${formatDateTime(selectedBranch.updatedAt)}`
                    : 'Pick a row to review and edit the branch profile.'}
              </p>
            </div>

            {selectedBranch ? (
              <div className="crm-workspace-detail-summary">
                <article>
                  <p>Status</p>
                  <strong>{selectedBranch.status}</strong>
                </article>
                <article>
                  <p>Active</p>
                  <strong>{selectedBranch.active ? 'Yes' : 'No'}</strong>
                </article>
                <article>
                  <p>Team</p>
                  <strong>{selectedBranch.teamSize}</strong>
                </article>
                <article>
                  <p>Rooms</p>
                  <strong>{selectedBranch.rooms}</strong>
                </article>
              </div>
            ) : null}

            <form className="crm-workspace-form" onSubmit={handleSubmit}>
              {formError ? <p className="crm-workspace-inline-error">{formError}</p> : null}

              <div className="crm-workspace-form-grid">
                <label className="crm-workspace-field crm-workspace-field-full">
                  <span>Branch Name</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Downtown Sanctuary"
                    required
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Manager</span>
                  <input
                    type="text"
                    value={draft.managerName}
                    onChange={(event) => setDraft((current) => ({ ...current, managerName: event.target.value }))}
                    placeholder="Isabella Rose"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="(323) 555-0101"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="branch@spa.com"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>City</span>
                  <input
                    type="text"
                    value={draft.city}
                    onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                    placeholder="Los Angeles"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>State</span>
                  <input
                    type="text"
                    value={draft.state}
                    onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))}
                    placeholder="CA"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Hours</span>
                  <input
                    type="text"
                    value={draft.hours}
                    onChange={(event) => setDraft((current) => ({ ...current, hours: event.target.value }))}
                    placeholder="9:00 AM - 8:00 PM"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Status</span>
                  <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="crm-workspace-field">
                  <span>Rooms</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.rooms}
                    onChange={(event) => setDraft((current) => ({ ...current, rooms: event.target.value }))}
                    placeholder="8"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Team Size</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.teamSize}
                    onChange={(event) => setDraft((current) => ({ ...current, teamSize: event.target.value }))}
                    placeholder="12"
                  />
                </label>
                <label className="crm-workspace-field crm-workspace-field-full">
                  <span>Notes</span>
                  <textarea
                    rows="4"
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Location notes, renovation plans, or branch-specific details"
                  />
                </label>
              </div>

              <div className="crm-workspace-badge-row">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`crm-workspace-chip${draft.status === option ? ' crm-workspace-chip-active' : ''}`}
                    onClick={() => setDraft((current) => ({ ...current, status: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="crm-workspace-badge-row">
                <button
                  type="button"
                  className={`crm-workspace-chip${draft.active ? ' crm-workspace-chip-active' : ''}`}
                  aria-pressed={draft.active}
                  onClick={() => setDraft((current) => ({ ...current, active: !current.active }))}
                >
                  {draft.active ? 'Deactivate Branch' : 'Activate Branch'}
                </button>
              </div>

              <div className="crm-workspace-detail-summary">
                <article>
                  <p>Manager</p>
                  <strong>{normalizeText(draft.managerName, 'Unassigned')}</strong>
                </article>
                <article>
                  <p>Location</p>
                  <strong>{[draft.city, draft.state].filter(Boolean).join(', ') || 'Not set'}</strong>
                </article>
                <article>
                  <p>Hours</p>
                  <strong>{draft.hours || 'Not set'}</strong>
                </article>
                <article>
                  <p>Capacity</p>
                  <strong>{`${normalizeNumber(draft.teamSize, 0)} team · ${normalizeNumber(draft.rooms, 0)} rooms`}</strong>
                </article>
              </div>

              <div className="crm-workspace-form-actions">
                <button type="submit" className="crm-workspace-primary-btn" disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Saving...' : mode === 'create' ? 'Create Branch' : 'Save Changes'}
                </button>
                {mode === 'edit' ? (
                  <button type="button" className="crm-workspace-secondary-btn" onClick={handleDelete} disabled={saving}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                ) : null}
                <button type="button" className="crm-workspace-ghost-btn" onClick={openCreate} disabled={saving}>
                  <RefreshCcw size={14} />
                  Reset Form
                </button>
              </div>
            </form>

            {selectedBranch ? (
              <section className="crm-workspace-section">
                <div className="crm-workspace-section-head">
                  <div>
                    <h4>Branch Snapshot</h4>
                    <p>{selectedBranch.name}</p>
                  </div>
                  <button type="button" className="crm-workspace-chip-link" onClick={() => setDraft(emptyDraft(selectedBranch))}>
                    Reload Record
                  </button>
                </div>

                <div className="crm-workspace-badge-row">
                  <span className={`crm-workspace-badge crm-workspace-badge-${getStatusTone(selectedBranch.status)}`}>
                    <CheckCircle2 size={12} />
                    {selectedBranch.status}
                  </span>
                  <span className={`crm-workspace-badge crm-workspace-badge-${getActiveTone(selectedBranch.active)}`}>
                    <Building2 size={12} />
                    {selectedBranch.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <Users size={12} />
                    {selectedBranch.teamSize} team members
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <Clock3 size={12} />
                    {selectedBranch.hours || 'Hours not set'}
                  </span>
                </div>

                <div className="crm-workspace-badge-row">
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <MapPin size={12} />
                    {[selectedBranch.city, selectedBranch.state].filter(Boolean).join(', ') || 'No location set'}
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <Sparkles size={12} />
                    {selectedBranch.phone || 'No phone'}
                  </span>
                </div>

                {selectedBranch.notes ? <p className="crm-workspace-inline-note">{selectedBranch.notes}</p> : null}
              </section>
            ) : (
              <div className="crm-workspace-empty" style={{ minHeight: '180px' }}>
                <h3>No branch selected</h3>
                <p>Select a branch row or create a new location to begin editing.</p>
                <div className="crm-workspace-empty-actions">
                  <button type="button" className="crm-workspace-primary-btn" onClick={openCreate}>
                    <Plus size={14} />
                    New Branch
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmBranches;
