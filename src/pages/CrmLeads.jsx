import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmList, crmUpdate } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import './CrmLeads.css';

const initialLeads = [
  {
    id: 'L-1042',
    name: 'Jane Doe',
    phone: '+1 (555) 0123',
    email: 'jane.doe@example.com',
    source: 'Website Form',
    serviceInterest: 'Deep Tissue Massage',
    preferredSlot: 'Mon, Apr 15, 2:00 PM',
    assignedStaff: 'Sarah',
    status: 'New',
    createdAt: '2026-04-09T10:30:00',
    followUp: 'Due in 20 min',
    followUpState: 'today',
    note: 'Interested in a couples package for late October. Prefers weekend afternoon slots.',
    communicationHistory: [
      'Auto-response sent at 10:31 AM',
      'No live call completed yet',
    ],
  },
  {
    id: 'L-1038',
    name: 'Michael Smith',
    phone: '+1 (555) 9876',
    email: 'michael.smith@example.com',
    source: 'Instagram Ad',
    serviceInterest: 'Aromatherapy Session',
    preferredSlot: 'Tue, Apr 16, 4:00 PM',
    assignedStaff: 'Elena',
    status: 'Contacted',
    createdAt: '2026-04-08T14:15:00',
    followUp: 'Awaiting response',
    followUpState: 'watch',
    note: 'Asked for pricing details and loyalty package options.',
    communicationHistory: [
      'Outbound call completed',
      'Package PDF shared by email',
    ],
  },
  {
    id: 'L-1032',
    name: 'Elena Lopez',
    phone: '+1 (555) 4433',
    email: 'elena.lopez@example.com',
    source: 'Google Search',
    serviceInterest: 'Hot Stone Therapy',
    preferredSlot: 'Wed, Apr 17, 11:00 AM',
    assignedStaff: 'Unassigned',
    status: 'Booked',
    createdAt: '2026-04-07T16:45:00',
    followUp: 'Booking confirmed',
    followUpState: 'good',
    note: 'Requested quiet room and essential oil options.',
    communicationHistory: [
      'Converted to appointment #BK-882',
      'Reminder SMS scheduled',
    ],
  },
  {
    id: 'L-1029',
    name: 'Chris Young',
    phone: '+1 (555) 7788',
    email: 'chris.young@example.com',
    source: 'Inquiry Chatbot',
    serviceInterest: 'Signature Facial',
    preferredSlot: 'Fri, Apr 19, 1:30 PM',
    assignedStaff: 'Marcus',
    status: 'Awaiting Response',
    createdAt: '2026-04-06T09:05:00',
    followUp: 'Overdue by 1 day',
    followUpState: 'overdue',
    note: 'Shared skin sensitivity details. Waiting for therapist recommendation.',
    communicationHistory: [
      'Chatbot qualification completed',
      'No response to first callback',
    ],
  },
  {
    id: 'L-1026',
    name: 'Priya Nair',
    phone: '+1 (555) 1212',
    email: 'priya.nair@example.com',
    source: 'Phone Inquiry',
    serviceInterest: 'Bridal Package',
    preferredSlot: 'Custom planning call',
    assignedStaff: 'Sarah',
    status: 'Converted',
    createdAt: '2026-04-05T12:20:00',
    followUp: 'Profile created',
    followUpState: 'good',
    note: 'Converted to customer profile and requested custom package proposal.',
    communicationHistory: [
      'Converted to customer profile #C-440',
      'Consultation call booked',
    ],
  },
  {
    id: 'L-1019',
    name: 'Daniel Ross',
    phone: '+1 (555) 2929',
    email: 'daniel.ross@example.com',
    source: 'Walk-in Inquiry',
    serviceInterest: 'Sports Recovery Massage',
    preferredSlot: 'Any weekday morning',
    assignedStaff: 'Elena',
    status: 'Lost',
    createdAt: '2026-04-04T15:40:00',
    followUp: 'Closed',
    followUpState: 'closed',
    note: 'Budget mismatch. Offered lower-intensity package for future re-engagement.',
    communicationHistory: [
      'Initial quote shared',
      'Marked as lost with reason: budget mismatch',
    ],
  },
];

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const statusOptions = ['All Statuses', 'New', 'Contacted', 'Awaiting Response', 'Interested', 'Booked', 'Converted', 'Lost'];
const sourceOptions = ['All Sources', 'Website Form', 'Inquiry Chatbot', 'Phone Inquiry', 'Walk-in Inquiry', 'Instagram Ad', 'Google Search'];
const serviceOptions = ['All Services', 'Deep Tissue Massage', 'Aromatherapy Session', 'Hot Stone Therapy', 'Signature Facial', 'Bridal Package', 'Sports Recovery Massage'];
const staffOptions = ['All Staff', 'Sarah', 'Elena', 'Marcus', 'Unassigned'];
const dateOptions = ['Last 30 Days', 'Today', 'Last 7 Days', 'Custom'];

const getStatusTone = (status) => {
  switch (status) {
    case 'New':
      return 'new';
    case 'Contacted':
      return 'contacted';
    case 'Awaiting Response':
      return 'watch';
    case 'Interested':
      return 'interested';
    case 'Booked':
    case 'Converted':
      return 'good';
    case 'Lost':
      return 'lost';
    default:
      return 'neutral';
  }
};

const formatDateLabel = (isoDate) =>
  new Date(isoDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const normalizeLead = (lead, index = 0) => ({
  id: lead.id || lead._id || lead.leadId || `lead-${index + 1}`,
  name: lead.name || lead.fullName || lead.customerName || 'Untitled Lead',
  phone: lead.phone || lead.mobile || lead.contactNumber || '',
  email: lead.email || lead.contactEmail || '',
  source: lead.source || lead.inquirySource || 'Website Form',
  serviceInterest: lead.serviceInterest || lead.requestedService || lead.service || 'General Inquiry',
  preferredSlot: lead.preferredSlot || lead.preferredDateTime || lead.preferredTime || '-',
  assignedStaff: lead.assignedStaff || lead.assignedTo || lead.staff || 'Unassigned',
  status: lead.status || lead.leadStatus || 'New',
  createdAt: lead.createdAt || lead.created_at || new Date().toISOString(),
  followUp: lead.followUp || lead.followUpLabel || lead.followUpStatus || 'Pending',
  followUpState: lead.followUpState || lead.priority || (lead.status === 'Lost' ? 'closed' : 'good'),
  note: lead.note || lead.notes || lead.description || '',
  communicationHistory: Array.isArray(lead.communicationHistory)
    ? lead.communicationHistory
    : Array.isArray(lead.activityHistory)
      ? lead.activityHistory
      : lead.communicationHistory
        ? [String(lead.communicationHistory)]
        : [],
});

const CrmLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(initialLeads);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [staffFilter, setStaffFilter] = useState('All Staff');
  const [dateFilter, setDateFilter] = useState('Last 30 Days');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showConvertedOnly, setShowConvertedOnly] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeads[0]?.id || '');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadLeads = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('leads');
        if (!mounted) return;

        const normalized = data.length > 0 ? data.map(normalizeLead) : initialLeads;
        setLeads(normalized);
        setSelectedLeadId((current) => (normalized.some((lead) => lead.id === current) ? current : normalized[0]?.id || ''));
      } catch (error) {
        if (!mounted) return;
        setLeads(initialLeads);
        setLoadError(error.message || 'Unable to load leads from the CRM API.');
        setSelectedLeadId(initialLeads[0]?.id || '');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadLeads();

    return () => {
      mounted = false;
    };
  }, []);

  const duplicateMap = useMemo(() => {
    const tracker = new Map();
    leads.forEach((lead) => {
      const key = `${lead.phone}-${lead.email}`.toLowerCase();
      tracker.set(key, (tracker.get(key) || 0) + 1);
    });
    return tracker;
  }, [leads]);

  const summary = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const contactedStatuses = new Set(['Contacted', 'Awaiting Response', 'Interested']);
    const convertedStatuses = new Set(['Converted', 'Booked']);

    const newLeads = leads.filter((lead) => lead.status === 'New').length;
    const contactedLeads = leads.filter((lead) => contactedStatuses.has(lead.status)).length;
    const convertedLeads = leads.filter((lead) => convertedStatuses.has(lead.status)).length;
    const lostLeads = leads.filter((lead) => lead.status === 'Lost').length;
    const pendingFollowUps = leads.filter((lead) => lead.followUpState === 'overdue' || lead.followUpState === 'today').length;
    const todaysInquiries = leads.filter((lead) => lead.createdAt.startsWith(todayKey)).length;

    return [
      { label: 'New Leads', value: String(newLeads).padStart(2, '0'), subtext: '+3 today', tone: 'up' },
      { label: 'Contacted', value: String(contactedLeads).padStart(2, '0'), subtext: '5 awaiting reply', tone: 'neutral' },
      { label: 'Converted', value: String(convertedLeads).padStart(2, '0'), subtext: '+2 this week', tone: 'good' },
      { label: 'Lost', value: String(lostLeads).padStart(2, '0'), subtext: 'retained in history', tone: 'muted' },
      { label: 'Pending Follow-up', value: String(pendingFollowUps).padStart(2, '0'), subtext: '2 overdue', tone: 'alert' },
      { label: "Today's Inquiries", value: String(todaysInquiries).padStart(2, '0'), subtext: '+5 vs yesterday', tone: 'gold' },
    ];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const today = new Date();
    return leads.filter((lead) => {
      const haystack = `${lead.name} ${lead.phone} ${lead.email}`.toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Statuses' || lead.status === statusFilter;
      const matchesSource = sourceFilter === 'All Sources' || lead.source === sourceFilter;
      const matchesService = serviceFilter === 'All Services' || lead.serviceInterest === serviceFilter;
      const matchesStaff = staffFilter === 'All Staff' || lead.assignedStaff === staffFilter;
      const matchesPending = !showPendingOnly || lead.followUpState === 'overdue' || lead.followUpState === 'today';
      const matchesConverted = !showConvertedOnly || lead.status === 'Converted' || lead.status === 'Booked';
      const leadDate = new Date(lead.createdAt);
      const matchesDate =
        dateFilter === 'Last 30 Days'
          ? today.getTime() - leadDate.getTime() <= 30 * 24 * 60 * 60 * 1000
          : dateFilter === 'Today'
            ? leadDate.toDateString() === today.toDateString()
            : dateFilter === 'Last 7 Days'
              ? today.getTime() - leadDate.getTime() <= 7 * 24 * 60 * 60 * 1000
              : true;

      return matchesSearch && matchesStatus && matchesSource && matchesService && matchesStaff && matchesPending && matchesConverted && matchesDate;
    });
  }, [dateFilter, leads, searchTerm, statusFilter, sourceFilter, serviceFilter, staffFilter, showPendingOnly, showConvertedOnly]);

  const selectedLead = useMemo(() => {
    const selectedFromFiltered = filteredLeads.find((lead) => lead.id === selectedLeadId);
    return selectedFromFiltered || filteredLeads[0] || null;
  }, [filteredLeads, selectedLeadId]);

  const handleStatusUpdate = (leadId, nextStatus) => {
    setLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead)),
    );

    void crmUpdate('leads', leadId, { status: nextStatus }).catch((error) => {
      setLoadError(error.message || 'Lead status update failed.');
    });
  };

  const handleAssignUpdate = (leadId, nextStaff) => {
    setLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, assignedStaff: nextStaff } : lead)),
    );

    void crmUpdate('leads', leadId, { assignedStaff: nextStaff, assignedTo: nextStaff }).catch((error) => {
      setLoadError(error.message || 'Lead assignment update failed.');
    });
  };

  const handleQuickCreateLead = async () => {
    const name = window.prompt('Lead name');
    if (!name) return;

    const phone = window.prompt('Phone number', '') || '';
    const email = window.prompt('Email address', '') || '';
    const source = window.prompt('Lead source', 'Website Form') || 'Website Form';
    const serviceInterest = window.prompt('Service interest', 'Deep Tissue Massage') || 'Deep Tissue Massage';

    try {
      const created = await crmCreate('leads', {
        name,
        phone,
        email,
        source,
        serviceInterest,
        preferredSlot: 'TBD',
        assignedStaff: 'Unassigned',
        status: 'New',
        createdAt: new Date().toISOString(),
        followUp: 'Pending',
        followUpState: 'today',
        note: '',
        communicationHistory: ['Created from CRM quick add'],
      });

      const normalized = normalizeLead(created, leads.length);
      setLeads((current) => [normalized, ...current]);
      setSelectedLeadId(normalized.id);
    } catch (error) {
      setLoadError(error.message || 'Lead creation failed.');
    }
  };

  const handleExportLeads = () => {
    const rows = [
      ['Lead ID', 'Name', 'Phone', 'Email', 'Source', 'Service', 'Assigned Staff', 'Status', 'Created'],
      ...filteredLeads.map((lead) => [
        lead.id,
        lead.name,
        lead.phone,
        lead.email,
        lead.source,
        lead.serviceInterest,
        lead.assignedStaff,
        lead.status,
        formatDateLabel(lead.createdAt),
      ]),
    ];

    downloadCsv(`leads-inquiries-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleSendBookingLink = () => {
    if (!selectedLead) return;

    const link = `${window.location.origin}/booking?lead=${encodeURIComponent(selectedLead.id)}`;
    void navigator.clipboard?.writeText(link);

    setLeads((current) =>
      current.map((lead) =>
        lead.id === selectedLead.id
          ? {
              ...lead,
              followUp: 'Booking link sent',
              communicationHistory: [
                `Booking link prepared: ${link}`,
                ...lead.communicationHistory,
              ],
            }
          : lead,
      ),
    );

    void crmUpdate('leads', selectedLead.id, {
      followUp: 'Booking link sent',
      communicationHistory: [`Booking link prepared: ${link}`, ...selectedLead.communicationHistory],
    }).catch((error) => {
      setLoadError(error.message || 'Unable to store booking link status.');
    });
  };

  const handleConvertToBooking = async () => {
    if (!selectedLead) return;

    const start = window.prompt('Appointment start time', '09:00') || '09:00';
    const end = window.prompt('Appointment end time', '10:00') || '10:00';

    try {
      await crmCreate('appointments', {
        customer: selectedLead.name,
        phone: selectedLead.phone,
        service: selectedLead.serviceInterest,
        staff: selectedLead.assignedStaff === 'Unassigned' ? 'Unassigned' : selectedLead.assignedStaff,
        start,
        end,
        status: 'Pending',
        note: `Converted from lead ${selectedLead.id}`,
        paymentStatus: 'Pending',
        reminderScheduled: true,
      });

      handleStatusUpdate(selectedLead.id, 'Booked');
      setLeads((current) =>
        current.map((lead) =>
          lead.id === selectedLead.id
            ? {
                ...lead,
                followUp: 'Booking created',
                communicationHistory: ['Converted to appointment', ...lead.communicationHistory],
              }
            : lead,
        ),
      );
    } catch (error) {
      setLoadError(error.message || 'Lead conversion failed.');
    }
  };

  const handleConvertToCustomer = async () => {
    if (!selectedLead) return;

    try {
      await crmCreate('customers', {
        name: selectedLead.name,
        phone: selectedLead.phone,
        email: selectedLead.email,
        tag: selectedLead.status === 'Converted' ? 'VIP' : 'Regular',
        status: 'Active',
        createdAt: new Date().toISOString(),
        lastVisit: '',
        nextAppointment: selectedLead.preferredSlot,
        totalVisits: 0,
        totalSpend: 0,
        loyaltyPoints: 0,
        preferredStaff: selectedLead.assignedStaff,
        preferredTimes: selectedLead.preferredSlot,
        preferences: [selectedLead.serviceInterest],
        allergies: 'None reported',
        followUpState: 'normal',
        notes: `Converted from lead ${selectedLead.id}`,
        paymentHistory: [],
        receiptCount: 0,
      });

      handleStatusUpdate(selectedLead.id, 'Converted');
      setLeads((current) =>
        current.map((lead) =>
          lead.id === selectedLead.id
            ? {
                ...lead,
                followUp: 'Converted to customer',
                communicationHistory: ['Converted to customer profile', ...lead.communicationHistory],
              }
            : lead,
        ),
      );
    } catch (error) {
      setLoadError(error.message || 'Customer conversion failed.');
    }
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <CrmShell
      shellClassName="crm-leads-shell"
    >
      <main className="crm-leads-main">
        <header className="crm-leads-header">
          <div>
            <h1>Leads / Inquiries</h1>
            <p>Manage all incoming customer prospects and inquiries from every channel.</p>
          </div>

          <div className="crm-leads-header-actions">
            <input
              type="search"
              className="crm-leads-search"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className="crm-leads-ghost-btn" onClick={handleExportLeads}>
              Export
            </button>
            <button type="button" className="crm-leads-ghost-btn" onClick={() => setShowPendingOnly((value) => !value)}>
              Filter
            </button>
            <button type="button" className="crm-leads-primary-btn" onClick={handleQuickCreateLead}>
              New Inquiry
            </button>
            <button type="button" className="crm-leads-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-leads-kpi-grid">
          {summary.map((item) => (
            <article key={item.label} className={`crm-leads-kpi crm-kpi-${item.tone}`}>
              <p className="crm-leads-kpi-label">{item.label}</p>
              <p className="crm-leads-kpi-value">{item.value}</p>
              <p className="crm-leads-kpi-subtext">{item.subtext}</p>
            </article>
          ))}
        </section>

        <section className="crm-leads-filter-bar">
          <label htmlFor="lead-status-filter">Status</label>
          <select
            id="lead-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <label htmlFor="lead-source-filter">Source</label>
          <select
            id="lead-source-filter"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
          >
            {sourceOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <label htmlFor="lead-service-filter">Service</label>
          <select
            id="lead-service-filter"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
          >
            {serviceOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <label htmlFor="lead-staff-filter">Staff</label>
          <select
            id="lead-staff-filter"
            value={staffFilter}
            onChange={(event) => setStaffFilter(event.target.value)}
          >
            {staffOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <label htmlFor="lead-date-filter">Date</label>
          <select
            id="lead-date-filter"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            {dateOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <button
            type="button"
            className={`crm-leads-chip-btn${showPendingOnly ? ' crm-leads-chip-btn-active' : ''}`}
            onClick={() => setShowPendingOnly((value) => !value)}
          >
            Pending Follow-up
          </button>
          <button
            type="button"
            className={`crm-leads-chip-btn${showConvertedOnly ? ' crm-leads-chip-btn-active' : ''}`}
            onClick={() => setShowConvertedOnly((value) => !value)}
          >
            Converted Only
          </button>
        </section>

        <section className="crm-leads-content-grid">
          <article className="crm-leads-table-card">
            <header className="crm-leads-table-head">
              <p>Lead Name</p>
              <p>Service Interest</p>
              <p>Assigned Staff</p>
              <p>Status</p>
              <p>Created</p>
            </header>

            {isLoading ? (
              <div className="crm-leads-empty-state">
                <h2>Loading leads</h2>
                <p>Syncing the latest inquiries from your CRM backend.</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="crm-leads-empty-state">
                <h2>No leads match this filter</h2>
                <p>Try resetting status/source filters or add a new inquiry to start tracking demand.</p>
                  <button type="button" className="crm-leads-primary-btn" onClick={handleQuickCreateLead}>
                    Add New Inquiry
                  </button>
              </div>
            ) : (
              <div className="crm-leads-table-body">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  return (
                    <button
                      type="button"
                      key={lead.id}
                      className={`crm-lead-row${isSelected ? ' crm-lead-row-active' : ''}`}
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <div className="crm-lead-identity">
                        <div className="crm-lead-avatar">{lead.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <p className="crm-lead-name">{lead.name}</p>
                          <p className="crm-lead-subline">{lead.phone}</p>
                          <p className="crm-lead-subline">{lead.email}</p>
                        </div>
                      </div>

                      <div className="crm-lead-service">
                        <p>{lead.serviceInterest}</p>
                        <p className="crm-lead-subline">{lead.source}</p>
                        <p className="crm-lead-subline">{lead.preferredSlot}</p>
                      </div>

                      <div className="crm-lead-assign">
                        <select
                          value={lead.assignedStaff}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleAssignUpdate(lead.id, event.target.value)}
                        >
                          {staffOptions.filter((option) => option !== 'All Staff').map((staff) => (
                            <option key={staff} value={staff}>{staff}</option>
                          ))}
                        </select>
                      </div>

                      <div className="crm-lead-status">
                        <span className={`crm-status-pill crm-status-pill-${getStatusTone(lead.status)}`}>
                          {lead.status}
                        </span>
                        <select
                          value={lead.status}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleStatusUpdate(lead.id, event.target.value)}
                        >
                          {statusOptions.filter((option) => option !== 'All Statuses').map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      <div className="crm-lead-created">
                        <p>{formatDateLabel(lead.createdAt)}</p>
                        <p className={`crm-follow-up crm-follow-up-${lead.followUpState}`}>{lead.followUp}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="crm-lead-detail-card">
            {selectedLead ? (
              <>
                <div className="crm-lead-detail-header">
                  <div className="crm-lead-detail-avatar">
                    {selectedLead.name.slice(0, 2).toUpperCase()}
                  </div>
                  <h2>{selectedLead.name}</h2>
                  <p>{selectedLead.phone}</p>
                  <p>{selectedLead.email}</p>
                  <span className={`crm-status-pill crm-status-pill-${getStatusTone(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                </div>

                <div className="crm-lead-meta-grid">
                  <div>
                    <p className="crm-detail-label">Source</p>
                    <p className="crm-detail-value">{selectedLead.source}</p>
                  </div>
                  <div>
                    <p className="crm-detail-label">Interest</p>
                    <p className="crm-detail-value">{selectedLead.serviceInterest}</p>
                  </div>
                  <div>
                    <p className="crm-detail-label">Preferred Slot</p>
                    <p className="crm-detail-value">{selectedLead.preferredSlot}</p>
                  </div>
                  <div>
                    <p className="crm-detail-label">Assigned</p>
                    <p className="crm-detail-value">{selectedLead.assignedStaff}</p>
                  </div>
                </div>

                <div className="crm-lead-alert-strip">
                  {selectedLead.followUpState === 'overdue'
                    ? 'Overdue follow-up alert: immediate callback recommended.'
                    : 'Follow-up in control: keep momentum and convert quickly.'}
                </div>

                <div className="crm-lead-note-card">
                  <p className="crm-detail-label">Notes</p>
                  <p>{selectedLead.note}</p>
                </div>

                <div className="crm-lead-actions">
                  <button type="button" className="crm-leads-primary-btn" onClick={handleConvertToBooking}>
                    Convert to Booking
                  </button>
                  <button type="button" className="crm-leads-secondary-btn" onClick={handleConvertToCustomer}>
                    Convert to Customer
                  </button>
                  <button type="button" className="crm-leads-ghost-btn" onClick={handleSendBookingLink}>
                    Send Booking Link
                  </button>
                  <button type="button" className="crm-leads-ghost-btn" onClick={() => handleStatusUpdate(selectedLead.id, 'Lost')}>
                    Mark Lost
                  </button>
                </div>

                <div className="crm-lead-history">
                  <p className="crm-detail-label">Communication History</p>
                  <ul>
                    {selectedLead.communicationHistory.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>

                {duplicateMap.get(`${selectedLead.phone}-${selectedLead.email}`.toLowerCase()) > 1 ? (
                  <p className="crm-duplicate-warning">
                    Potential duplicate detected for this phone/email pair.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="crm-leads-empty-state">
                <h2>Select a lead</h2>
                <p>Click any row to open details and conversion actions.</p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmLeads;
