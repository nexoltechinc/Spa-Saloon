import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Clock3,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmDelete, crmList, crmUpdate } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  normalizeNumber,
  normalizeText,
  toDateKey,
  toIsoFromLocalInput,
  toLocalInput,
} from './crmWorkspaceUtils';
import './CrmWorkspace.css';
import './CrmLeads.css';

const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Booked', 'Lost', 'Disqualified'];
const STATUS_FILTERS = ['All Statuses', ...STATUS_OPTIONS];
const PRIORITY_OPTIONS = ['High', 'Normal', 'Low'];
const PRIORITY_FILTERS = ['All Priorities', ...PRIORITY_OPTIONS];
const SOURCE_OPTIONS = ['CRM', 'Website Form', 'Walk-In', 'Phone', 'Instagram', 'Google', 'Referral', 'Partner'];
const SOURCE_FILTERS = ['All Sources', ...SOURCE_OPTIONS];
const FOLLOW_UP_FILTERS = ['All Leads', 'Needs Follow-Up', 'Due Today', 'Overdue', 'Booked', 'Open Pipeline'];
const LEAD_GRID_COLUMNS = 'minmax(248px, 1.34fr) minmax(124px, 0.92fr) minmax(108px, 0.78fr) minmax(96px, 0.72fr) minmax(132px, 0.94fr) minmax(154px, 1fr) minmax(98px, 0.74fr) minmax(120px, 0.84fr) minmax(84px, 0.64fr)';

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'booked' || normalized === 'qualified') return 'good';
  if (normalized === 'proposal' || normalized === 'contacted') return 'warning';
  if (normalized === 'lost' || normalized === 'disqualified') return 'alert';
  if (normalized === 'new') return 'info';
  return 'neutral';
};

const getPriorityTone = (priority) => {
  const normalized = String(priority || '').toLowerCase();
  if (normalized === 'high') return 'alert';
  if (normalized === 'normal') return 'warning';
  if (normalized === 'low') return 'good';
  return 'neutral';
};

const getFollowUpTone = (lead) => {
  if (!lead?.nextFollowUpAt) return 'neutral';
  if (lead.isOverdue) return 'alert';
  if (lead.isDueToday) return 'warning';
  return 'good';
};

const getLeadActivity = (lead) => {
  if (!lead) return { label: 'No activity yet', detail: 'Create or select a lead to inspect follow-up timing.', tone: 'neutral' };
  if (lead.status === 'Booked') return { label: 'Converted to booking', detail: 'This lead has already been converted into a confirmed visit.', tone: 'good' };
  if (lead.isOverdue) return { label: 'Follow-up overdue', detail: 'The next follow-up date has passed and the lead still needs attention.', tone: 'alert' };
  if (lead.isDueToday) return { label: 'Follow-up due today', detail: 'Reach out today to keep the lead warm and prevent drop-off.', tone: 'warning' };
  if (lead.lastContactAt) return { label: 'Recently contacted', detail: `Last contact logged ${formatDateTime(lead.lastContactAt)}.`, tone: 'good' };
  return { label: 'Open pipeline', detail: 'Lead is in the queue and has not been closed or booked yet.', tone: 'warning' };
};

const normalizeLead = (lead = {}, index = 0) => {
  const budget = normalizeNumber(lead.budget ?? lead.estimatedValue ?? lead.pipelineValue, 0);
  const status = normalizeText(lead.status ?? lead.leadStatus, 'New');
  const nextFollowUpAt = lead.nextFollowUpAt || lead.next_follow_up_at || '';
  const lastContactAt = lead.lastContactAt || lead.last_contact_at || '';
  const isDueToday = Boolean(nextFollowUpAt) && toDateKey(nextFollowUpAt) === toDateKey(new Date());
  const isOverdue = Boolean(nextFollowUpAt) && new Date(nextFollowUpAt).getTime() < Date.now() && !['Booked', 'Lost', 'Disqualified'].includes(status);

  return {
    id: lead.id || lead._id || lead.leadId || `lead-${index + 1}`,
    fullName: normalizeText(lead.fullName ?? lead.name, 'Untitled Lead'),
    email: normalizeText(lead.email),
    phone: normalizeText(lead.phone ?? lead.contactNumber),
    source: normalizeText(lead.source ?? lead.inquirySource, 'Website Form'),
    status,
    priority: normalizeText(lead.priority ?? lead.followUpState, 'Normal'),
    ownerName: normalizeText(lead.ownerName ?? lead.owner ?? lead.assignedTo, 'Unassigned'),
    branchName: normalizeText(lead.branchName ?? lead.branch),
    serviceInterest: normalizeText(lead.serviceInterest ?? lead.service ?? lead.requestedService),
    budget,
    lastContactAt,
    nextFollowUpAt,
    notes: normalizeText(lead.notes),
    createdAt: lead.createdAt || lead.created_at || new Date().toISOString(),
    updatedAt: lead.updatedAt || lead.updated_at || lead.createdAt || new Date().toISOString(),
    metadata: lead.metadata || {},
    isDueToday,
    isOverdue,
  };
};

const emptyDraft = (lead = {}) => {
  const normalized = normalizeLead(lead);
  return {
    id: normalized.id === 'lead-1' ? '' : normalized.id,
    fullName: normalized.fullName === 'Untitled Lead' ? '' : normalized.fullName,
    email: normalized.email,
    phone: normalized.phone,
    source: normalized.source,
    status: normalized.status,
    priority: normalized.priority,
    ownerName: normalized.ownerName === 'Unassigned' ? '' : normalized.ownerName,
    branchName: normalized.branchName,
    serviceInterest: normalized.serviceInterest,
    budget: normalized.budget ? String(normalized.budget) : '',
    lastContactAt: normalized.lastContactAt ? toLocalInput(normalized.lastContactAt) : '',
    nextFollowUpAt: normalized.nextFollowUpAt ? toLocalInput(normalized.nextFollowUpAt) : '',
    notes: normalized.notes,
  };
};

const buildPayload = (draft) => {
  const budget = Math.max(0, normalizeNumber(draft.budget, 0));
  return {
    id: normalizeText(draft.id),
    fullName: normalizeText(draft.fullName, 'Untitled Lead'),
    name: normalizeText(draft.fullName, 'Untitled Lead'),
    email: normalizeText(draft.email),
    phone: normalizeText(draft.phone),
    source: normalizeText(draft.source, 'Website Form'),
    status: normalizeText(draft.status, 'New'),
    leadStatus: normalizeText(draft.status, 'New'),
    priority: normalizeText(draft.priority, 'Normal'),
    ownerName: normalizeText(draft.ownerName, 'Unassigned'),
    owner: normalizeText(draft.ownerName, 'Unassigned'),
    assignedTo: normalizeText(draft.ownerName, 'Unassigned'),
    branchName: normalizeText(draft.branchName),
    branch: normalizeText(draft.branchName),
    serviceInterest: normalizeText(draft.serviceInterest),
    service: normalizeText(draft.serviceInterest),
    budget,
    estimatedValue: budget,
    lastContactAt: toIsoFromLocalInput(draft.lastContactAt),
    nextFollowUpAt: toIsoFromLocalInput(draft.nextFollowUpAt),
    notes: normalizeText(draft.notes),
  };
};

const isOpenPipeline = (lead) => !['Booked', 'Lost', 'Disqualified'].includes(lead.status);

const CrmLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [mode, setMode] = useState('create');
  const [draft, setDraft] = useState(() => emptyDraft());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [followUpFilter, setFollowUpFilter] = useState('All Leads');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadLeads = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [leadsResult, branchesResult, servicesResult] = await Promise.allSettled([
          crmList('leads'),
          crmList('branches'),
          crmList('services'),
        ]);

        if (!mounted) return;

        const normalizedLeads = leadsResult.status === 'fulfilled' && Array.isArray(leadsResult.value)
          ? leadsResult.value.map(normalizeLead)
          : [];

        const branchNames = new Set();
        if (branchesResult.status === 'fulfilled' && Array.isArray(branchesResult.value)) {
          branchesResult.value.forEach((branch) => {
            const name = normalizeText(branch?.name || branch?.branchName || branch?.locationName || branch?.title);
            if (name) branchNames.add(name);
          });
        }

        const serviceNames = new Set();
        if (servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value)) {
          servicesResult.value.forEach((service) => {
            const name = normalizeText(service?.name || service?.serviceName || service?.title);
            if (name) serviceNames.add(name);
          });
        }

        setLeads(normalizedLeads);
        setBranchOptions(Array.from(branchNames));
        setServiceOptions(Array.from(serviceNames));
        setSelectedLeadId((current) => (normalizedLeads.some((lead) => lead.id === current) ? current : normalizedLeads[0]?.id || ''));
        setMode(normalizedLeads.length > 0 ? 'edit' : 'create');
        setDraft(normalizedLeads.length > 0 ? emptyDraft(normalizedLeads[0]) : emptyDraft());

        if (leadsResult.status === 'rejected') {
          throw leadsResult.reason;
        }
      } catch (error) {
        if (!mounted) return;
        setLeads([]);
        setBranchOptions([]);
        setServiceOptions([]);
        setSelectedLeadId('');
        setMode('create');
        setDraft(emptyDraft());
        setLoadError(error.message || 'Unable to load leads from the CRM API.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadLeads();

    return () => {
      mounted = false;
    };
  }, []);

  const branchSelectOptions = useMemo(() => {
    const values = new Set(['All Branches']);
    branchOptions.forEach((branch) => {
      if (branch) values.add(branch);
    });
    leads.forEach((lead) => {
      if (lead.branchName) values.add(lead.branchName);
    });
    return Array.from(values);
  }, [branchOptions, leads]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  const filteredLeads = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return leads
      .filter((lead) => {
        const haystack = [
          lead.fullName,
          lead.email,
          lead.phone,
          lead.source,
          lead.status,
          lead.priority,
          lead.ownerName,
          lead.branchName,
          lead.serviceInterest,
          lead.notes,
        ]
          .join(' ')
          .toLowerCase();

        const matchesSearch = !search || haystack.includes(search);
        const matchesStatus = statusFilter === 'All Statuses' || lead.status === statusFilter;
        const matchesPriority = priorityFilter === 'All Priorities' || lead.priority === priorityFilter;
        const matchesSource = sourceFilter === 'All Sources' || lead.source === sourceFilter;
        const matchesBranch = branchFilter === 'All Branches' || lead.branchName === branchFilter;
        const matchesFollowUp =
          followUpFilter === 'All Leads'
          || (followUpFilter === 'Needs Follow-Up' && isOpenPipeline(lead) && Boolean(lead.nextFollowUpAt))
          || (followUpFilter === 'Due Today' && lead.isDueToday)
          || (followUpFilter === 'Overdue' && lead.isOverdue)
          || (followUpFilter === 'Booked' && lead.status === 'Booked')
          || (followUpFilter === 'Open Pipeline' && isOpenPipeline(lead));

        return matchesSearch && matchesStatus && matchesPriority && matchesSource && matchesBranch && matchesFollowUp;
      })
      .sort((left, right) => {
        const leftDate = new Date(left.nextFollowUpAt || left.updatedAt || left.createdAt).getTime();
        const rightDate = new Date(right.nextFollowUpAt || right.updatedAt || right.createdAt).getTime();
        return rightDate - leftDate;
      });
  }, [branchFilter, followUpFilter, leads, priorityFilter, searchTerm, sourceFilter, statusFilter]);

  useEffect(() => {
    if (!filteredLeads.length) {
      setSelectedLeadId('');
      if (mode === 'edit') {
        setMode('create');
        setDraft(emptyDraft());
      }
      return;
    }

    if (mode === 'create' && !selectedLeadId) {
      return;
    }

    if (!filteredLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0].id);
      setMode('edit');
      setDraft(emptyDraft(filteredLeads[0]));
    }
  }, [filteredLeads, mode, selectedLeadId]);

  const summaryCards = useMemo(() => {
    const total = leads.length;
    const openLeads = leads.filter(isOpenPipeline).length;
    const bookedLeads = leads.filter((lead) => lead.status === 'Booked').length;
    const dueToday = leads.filter((lead) => lead.isDueToday).length;
    const overdue = leads.filter((lead) => lead.isOverdue).length;
    const pipelineValue = leads.filter(isOpenPipeline).reduce((sum, lead) => sum + normalizeNumber(lead.budget, 0), 0);
    const conversionRate = total ? Math.round((bookedLeads / total) * 100) : 0;

    return [
      { label: 'Total Leads', value: total, subtext: 'Persisted in Postgres' },
      { label: 'Open Pipeline', value: openLeads, subtext: 'Still warm and actionable' },
      { label: 'Booked Leads', value: bookedLeads, subtext: `${conversionRate}% conversion from this list` },
      { label: 'Follow-up Due Today', value: dueToday, subtext: 'Requires same-day attention' },
      { label: 'Overdue Follow-ups', value: overdue, subtext: 'Past due and waiting', alert: true },
      { label: 'Pipeline Value', value: formatMoney(pipelineValue), subtext: 'Open opportunity value' },
    ];
  }, [leads]);

  const openCreate = () => {
    setSelectedLeadId('');
    setMode('create');
    setDraft(emptyDraft());
    setFormError('');
  };

  const openEdit = (lead) => {
    setSelectedLeadId(lead.id);
    setMode('edit');
    setDraft(emptyDraft(lead));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!normalizeText(draft.fullName)) {
      setFormError('Lead name is required.');
      return;
    }

    if (!normalizeText(draft.source)) {
      setFormError('Lead source is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(draft);
      const saved = mode === 'create'
        ? await crmCreate('leads', payload)
        : await crmUpdate('leads', selectedLeadId || payload.id, payload);
      const normalized = normalizeLead(saved);

      setLeads((current) => {
        if (mode === 'create') {
          return [normalized, ...current];
        }
        return current.map((lead) => (lead.id === normalized.id ? normalized : lead));
      });

      setSelectedLeadId(normalized.id);
      setMode('edit');
      setDraft(emptyDraft(normalized));
    } catch (error) {
      setFormError(error.message || 'Unable to save lead.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    const confirmed = window.confirm(`Delete lead ${selectedLead.fullName}? This cannot be undone.`);
    if (!confirmed) return;

    setSaving(true);
    try {
      await crmDelete('leads', selectedLead.id);
      setLeads((current) => current.filter((lead) => lead.id !== selectedLead.id));
      setSelectedLeadId('');
      setMode('create');
      setDraft(emptyDraft());
    } catch (error) {
      setFormError(error.message || 'Unable to delete lead.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All Statuses');
    setPriorityFilter('All Priorities');
    setSourceFilter('All Sources');
    setBranchFilter('All Branches');
    setFollowUpFilter('All Leads');
  };

  const handleExport = () => {
    const rows = [
      ['Lead ID', 'Lead', 'Email', 'Phone', 'Source', 'Status', 'Priority', 'Owner', 'Branch', 'Service Interest', 'Budget', 'Last Contact', 'Next Follow-Up', 'Notes'],
      ...filteredLeads.map((lead) => [
        lead.id,
        lead.fullName,
        lead.email,
        lead.phone,
        lead.source,
        lead.status,
        lead.priority,
        lead.ownerName,
        lead.branchName || 'Unassigned',
        lead.serviceInterest || 'Unassigned',
        lead.budget,
        lead.lastContactAt ? formatDateTime(lead.lastContactAt) : 'Not logged',
        lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : 'Not scheduled',
        lead.notes,
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  const selectedLeadActivity = getLeadActivity(selectedLead);
  const dirtyModeLabel = mode === 'create' ? 'New Lead Entry' : 'Lead Detail';

  return (
    <CrmShell shellClassName="crm-workspace-shell crm-leads-shell">
      <main className="crm-workspace-main">
        <header className="crm-workspace-header">
          <div className="crm-workspace-header-copy">
            <p className="crm-workspace-kicker">Lead Pipeline</p>
            <h1>Leads</h1>
            <p>
              Track inquiries, follow-ups, and conversion opportunities in one structured workspace so the front desk can move faster without losing context.
            </p>
          </div>

          <div className="crm-workspace-header-stack">
            <div className="crm-workspace-actions">
              <input
                type="search"
                placeholder="Search leads by name, source, owner, or service interest..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button type="button" className="crm-workspace-secondary-btn" onClick={handleExport}>
                Export
              </button>
              <button type="button" className="crm-workspace-ghost-btn" onClick={handleResetFilters}>
                Clear Filters
              </button>
              <button type="button" className="crm-workspace-primary-btn" onClick={openCreate}>
                <Plus size={14} />
                New Lead
              </button>
              <button type="button" className="crm-workspace-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        {loadError ? <p className="crm-workspace-inline-error">{loadError}</p> : null}

        <section className="crm-workspace-summary">
          {summaryCards.map((card) => (
            <article key={card.label} className={`crm-workspace-card${card.alert ? ' crm-workspace-card-alert' : ''}`}>
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
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            {PRIORITY_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            {SOURCE_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            {branchSelectOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)}>
            {FOLLOW_UP_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </section>

        <section className="crm-workspace-grid">
          <article className="crm-workspace-table-card">
            <header className="crm-workspace-table-head" style={{ gridTemplateColumns: LEAD_GRID_COLUMNS }}>
              <span>Lead</span>
              <span>Source</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Owner</span>
              <span>Interest</span>
              <span>Budget</span>
              <span>Follow-Up</span>
              <span>Action</span>
            </header>

            {isLoading ? (
              <div className="crm-workspace-empty">
                <h3>Loading leads</h3>
                <p>Fetching live inquiry records from Postgres and preparing the pipeline workspace.</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="crm-workspace-empty">
                <h3>No leads found</h3>
                <p>Try broadening filters or create the first lead record in the pipeline.</p>
                <div className="crm-workspace-empty-actions">
                  <button type="button" className="crm-workspace-primary-btn" onClick={openCreate}>
                    <Plus size={14} />
                    New Lead
                  </button>
                  <button type="button" className="crm-workspace-secondary-btn" onClick={handleResetFilters}>
                    Show All
                  </button>
                </div>
              </div>
            ) : (
              <div className="crm-workspace-group-list">
                {filteredLeads.map((lead) => {
                  const isSelected = lead.id === selectedLeadId;
                  const activity = getLeadActivity(lead);

                  return (
                    <button
                      key={lead.id}
                      type="button"
                      className={`crm-workspace-row${isSelected ? ' crm-workspace-row-active' : ''}`}
                      onClick={() => openEdit(lead)}
                      style={{ gridTemplateColumns: LEAD_GRID_COLUMNS }}
                    >
                      <div className="crm-workspace-row-primary">
                        <p className="crm-workspace-row-title">{lead.fullName}</p>
                        <p className="crm-workspace-row-subtitle">
                          <span>{lead.email || 'No email'}</span>
                          <span>{lead.phone || 'No phone'}</span>
                        </p>
                      </div>
                      <div className="crm-workspace-row-meta">
                        <strong>{lead.source}</strong>
                        <span>{lead.branchName || 'No branch'}</span>
                      </div>
                      <div className="crm-workspace-badge-row">
                        <span className={`crm-workspace-badge crm-workspace-badge-${getStatusTone(lead.status)}`}>{lead.status}</span>
                      </div>
                      <div className="crm-workspace-badge-row">
                        <span className={`crm-workspace-badge crm-workspace-badge-${getPriorityTone(lead.priority)}`}>{lead.priority}</span>
                      </div>
                      <div className="crm-workspace-row-meta">
                        <strong>{lead.ownerName || 'Unassigned'}</strong>
                        <span>{lead.branchName || 'No branch'}</span>
                      </div>
                      <div className="crm-workspace-row-meta">
                        <strong>{lead.serviceInterest || 'Open interest'}</strong>
                        <span>{activity.label}</span>
                      </div>
                      <div className="crm-workspace-row-meta">
                        <strong>{formatMoney(lead.budget)}</strong>
                        <span>{lead.status === 'Booked' ? 'Converted value' : 'Pipeline value'}</span>
                      </div>
                      <div className="crm-workspace-badge-row">
                        <span className={`crm-workspace-badge crm-workspace-badge-${getFollowUpTone(lead)}`}>
                          {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : 'Not set'}
                        </span>
                      </div>
                      <div className="crm-workspace-badge-row">
                        <span className="crm-workspace-chip-link">Open</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="crm-workspace-detail-card">
            <div className="crm-workspace-detail-head">
              <div>
                <p className="crm-workspace-detail-kicker">{dirtyModeLabel}</p>
                <h3>{mode === 'create' ? 'Create lead record' : selectedLead?.fullName || 'Select a lead'}</h3>
                <p>
                  {mode === 'create'
                    ? 'Capture inquiries, qualify them, and keep the sales follow-up stack aligned.'
                    : selectedLead
                      ? `Last updated ${formatDateTime(selectedLead.updatedAt)}`
                      : 'Pick a lead from the table to inspect and edit the record.'}
                </p>
              </div>
              {selectedLead ? <p className="crm-workspace-detail-kicker">{selectedLead.id}</p> : null}
            </div>

            {selectedLead ? (
              <div className="crm-workspace-detail-summary">
                <article>
                  <p>Status</p>
                  <strong>{selectedLead.status}</strong>
                </article>
                <article>
                  <p>Priority</p>
                  <strong>{selectedLead.priority}</strong>
                </article>
                <article>
                  <p>Budget</p>
                  <strong>{formatMoney(selectedLead.budget)}</strong>
                </article>
                <article>
                  <p>Follow-Up</p>
                  <strong>{selectedLead.nextFollowUpAt ? formatDateTime(selectedLead.nextFollowUpAt) : 'Not scheduled'}</strong>
                </article>
              </div>
            ) : null}

            {selectedLead ? (
              <section className="crm-workspace-section">
                <div className="crm-workspace-section-head">
                  <div>
                    <h4>Lead Activity</h4>
                    <p>{selectedLead.fullName}</p>
                  </div>
                  <button type="button" className="crm-workspace-chip-link" onClick={() => setDraft(emptyDraft(selectedLead))}>
                    Reload Record
                  </button>
                </div>

                <div className="crm-workspace-badge-row">
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <UserRound size={12} />
                    {selectedLead.fullName}
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <Building2 size={12} />
                    {selectedLead.branchName || 'No branch'}
                  </span>
                  <span className={`crm-workspace-badge crm-workspace-badge-${getStatusTone(selectedLead.status)}`}>
                    <Sparkles size={12} />
                    {selectedLead.status}
                  </span>
                  <span className={`crm-workspace-badge crm-workspace-badge-${getPriorityTone(selectedLead.priority)}`}>
                    <Clock3 size={12} />
                    {selectedLead.priority}
                  </span>
                </div>

                <div className={`crm-workspace-inline-note crm-workspace-inline-note-${selectedLeadActivity.tone}`}>
                  {selectedLeadActivity.label}: {selectedLeadActivity.detail}
                </div>
              </section>
            ) : (
              <div className="crm-workspace-empty" style={{ minHeight: '160px' }}>
                <h3>No lead selected</h3>
                <p>Select a lead from the pipeline or create a new record to get started.</p>
                <div className="crm-workspace-empty-actions">
                  <button type="button" className="crm-workspace-primary-btn" onClick={openCreate}>
                    <Plus size={14} />
                    New Lead
                  </button>
                </div>
              </div>
            )}

            <form className="crm-workspace-form" onSubmit={handleSubmit}>
              {formError ? <p className="crm-workspace-inline-error">{formError}</p> : null}

              <div className="crm-workspace-form-grid">
                <label className="crm-workspace-field crm-workspace-field-full">
                  <span>Lead Name</span>
                  <input
                    type="text"
                    value={draft.fullName}
                    onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Guest or lead name"
                    required
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="lead@email.com"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="+1 555 000 0000"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Source</span>
                  <select value={draft.source} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}>
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="crm-workspace-field">
                  <span>Status</span>
                  <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="crm-workspace-field">
                  <span>Priority</span>
                  <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="crm-workspace-field">
                  <span>Owner</span>
                  <input
                    type="text"
                    value={draft.ownerName}
                    onChange={(event) => setDraft((current) => ({ ...current, ownerName: event.target.value }))}
                    placeholder="Front desk or sales owner"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Branch</span>
                  <input
                    type="text"
                    list="crm-leads-branch-options"
                    value={draft.branchName}
                    onChange={(event) => setDraft((current) => ({ ...current, branchName: event.target.value }))}
                    placeholder="Melrose Sanctuary"
                  />
                </label>
                <datalist id="crm-leads-branch-options">
                  {branchSelectOptions.filter((option) => option !== 'All Branches').map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <label className="crm-workspace-field crm-workspace-field-full">
                  <span>Service Interest</span>
                  <input
                    type="text"
                    list="crm-leads-service-options"
                    value={draft.serviceInterest}
                    onChange={(event) => setDraft((current) => ({ ...current, serviceInterest: event.target.value }))}
                    placeholder="Signature Facial"
                  />
                </label>
                <datalist id="crm-leads-service-options">
                  {serviceOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <label className="crm-workspace-field">
                  <span>Estimated Budget</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.budget}
                    onChange={(event) => setDraft((current) => ({ ...current, budget: event.target.value }))}
                    placeholder="150"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Last Contact</span>
                  <input
                    type="datetime-local"
                    value={draft.lastContactAt}
                    onChange={(event) => setDraft((current) => ({ ...current, lastContactAt: event.target.value }))}
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Next Follow-Up</span>
                  <input
                    type="datetime-local"
                    value={draft.nextFollowUpAt}
                    onChange={(event) => setDraft((current) => ({ ...current, nextFollowUpAt: event.target.value }))}
                  />
                </label>
                <label className="crm-workspace-field crm-workspace-field-full">
                  <span>Notes</span>
                  <textarea
                    rows="4"
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Lead context, preferences, or campaign notes"
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
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`crm-workspace-chip${draft.priority === option ? ' crm-workspace-chip-active' : ''}`}
                    onClick={() => setDraft((current) => ({ ...current, priority: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="crm-workspace-detail-summary">
                <article>
                  <p>Pipeline Value</p>
                  <strong>{formatMoney(normalizeNumber(draft.budget, 0))}</strong>
                </article>
                <article>
                  <p>Last Contact</p>
                  <strong>{draft.lastContactAt ? formatDateTime(draft.lastContactAt) : 'Not logged'}</strong>
                </article>
                <article>
                  <p>Next Follow-Up</p>
                  <strong>{draft.nextFollowUpAt ? formatDateTime(draft.nextFollowUpAt) : 'Not scheduled'}</strong>
                </article>
                <article>
                  <p>Lead Health</p>
                  <strong>{getLeadActivity(selectedLead || normalizeLead(buildPayload(draft))).label}</strong>
                </article>
              </div>

              <div className="crm-workspace-form-actions">
                <button type="submit" className="crm-workspace-primary-btn" disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Saving...' : mode === 'create' ? 'Create Lead' : 'Save Changes'}
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
          </aside>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmLeads;

