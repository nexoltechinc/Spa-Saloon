import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmDelete, crmList, crmUpdate } from '../config/crmApi';
import { SERVICE_SEED } from '../config/serviceCatalog';
import CrmShell from '../components/CrmShell';
import {
  daysBetween,
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
import './CrmAppointments.css';

const STATUS_OPTIONS = ['Confirmed', 'Awaiting Arrival', 'Arrived', 'In Progress', 'Completed', 'Cancelled', 'No Show', 'Payment Pending'];
const STATUS_FILTERS = ['All Statuses', ...STATUS_OPTIONS];
const PAYMENT_STATUS_OPTIONS = ['Paid', 'Partial', 'Unpaid', 'Refunded'];
const PAYMENT_FILTERS = ['All Payments', ...PAYMENT_STATUS_OPTIONS];
const TIME_SCOPE_OPTIONS = ['All Appointments', 'Today', 'Upcoming', 'Past'];
const SOURCE_OPTIONS = ['All Sources', 'CRM', 'Website', 'Walk-In', 'Phone', 'Instagram', 'Google', 'Referral'];
const APPOINTMENTS_CACHE_KEY = 'crm-appointments-snapshot-v1';

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('completed') || normalized.includes('confirmed') || normalized.includes('arrived')) return 'good';
  if (normalized.includes('progress') || normalized.includes('awaiting')) return 'warning';
  if (normalized.includes('cancel') || normalized.includes('no show')) return 'alert';
  if (normalized.includes('payment pending')) return 'warning';
  return 'info';
};

const getPaymentTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 'good';
  if (normalized === 'partial') return 'warning';
  if (normalized === 'refunded') return 'alert';
  return 'neutral';
};

const getTimeTone = (value) => {
  if (!value) return 'neutral';
  const days = daysBetween(new Date(), value);
  if (days === null) return 'neutral';
  if (days > 0) return 'info';
  if (days === 0) return 'good';
  return 'warning';
};

const getDayLabel = (value) => {
  const key = toDateKey(value);
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const yesterday = toDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (!key) return 'Unscheduled';
  if (key === today) return 'Today';
  if (key === tomorrow) return 'Tomorrow';
  if (key === yesterday) return 'Yesterday';
  return formatDate(value);
};

const normalizeAppointment = (appointment = {}, index = 0) => {
  const amountDue = normalizeNumber(appointment.amountDue ?? appointment.totalDue ?? appointment.total, 0);
  const amountPaid = normalizeNumber(appointment.amountPaid ?? appointment.paidAmount, 0);
  const balanceRemaining =
    appointment.balanceRemaining !== undefined && appointment.balanceRemaining !== null && appointment.balanceRemaining !== ''
      ? Math.max(0, normalizeNumber(appointment.balanceRemaining, 0))
      : Math.max(amountDue - amountPaid, 0);

  return {
    id: appointment.id || appointment._id || appointment.appointmentId || `appointment-${index + 1}`,
    customerId: appointment.customerId || appointment.clientId || '',
    customerName: appointment.customerName || appointment.customer || 'Guest',
    customerEmail: appointment.customerEmail || appointment.email || '',
    phone: appointment.phone || appointment.contactNumber || '',
    serviceId: appointment.serviceId || appointment.treatmentId || '',
    serviceName: appointment.serviceName || appointment.service || 'Service',
    staffId: appointment.staffId || '',
    staffName: appointment.staffName || appointment.staff || appointment.assignedStaff || 'Unassigned',
    branchName: appointment.branchName || appointment.branch || '',
    appointmentAt: appointment.appointmentAt || appointment.dateTime || appointment.startAt || new Date().toISOString(),
    durationMinutes: Math.max(0, Math.round(normalizeNumber(appointment.durationMinutes ?? appointment.duration, 60))),
    status: appointment.status || appointment.appointmentStatus || 'Confirmed',
    paymentStatus: appointment.paymentStatus || (balanceRemaining > 0 ? (amountPaid > 0 ? 'Partial' : 'Unpaid') : 'Paid'),
    amountDue,
    amountPaid,
    balanceRemaining,
    source: appointment.source || 'CRM',
    notes: appointment.notes || '',
    checkInAt: appointment.checkInAt || appointment.check_in_at || '',
    completedAt: appointment.completedAt || appointment.completed_at || '',
    cancelledAt: appointment.cancelledAt || appointment.cancelled_at || '',
    createdAt: appointment.createdAt || appointment.created_at || new Date().toISOString(),
    updatedAt: appointment.updatedAt || appointment.updated_at || appointment.createdAt || new Date().toISOString(),
    metadata: appointment.metadata || {},
  };
};

const emptyDraft = (appointment = {}) => {
  const normalized = normalizeAppointment(appointment);
  return {
    id: normalized.id === 'appointment-1' ? '' : normalized.id,
    customerId: normalized.customerId,
    customerName: normalized.customerName === 'Guest' ? '' : normalized.customerName,
    customerEmail: normalized.customerEmail,
    phone: normalized.phone,
    serviceId: normalized.serviceId,
    serviceName: normalized.serviceName === 'Service' ? '' : normalized.serviceName,
    staffId: normalized.staffId,
    staffName: normalized.staffName === 'Unassigned' ? '' : normalized.staffName,
    branchName: normalized.branchName,
    appointmentAt: normalized.appointmentAt ? toLocalInput(normalized.appointmentAt) : '',
    durationMinutes: normalized.durationMinutes ? String(normalized.durationMinutes) : '60',
    status: normalized.status,
    paymentStatus: normalized.paymentStatus,
    amountDue: String(normalized.amountDue || ''),
    amountPaid: String(normalized.amountPaid || ''),
    source: normalized.source,
    notes: normalized.notes,
    checkInAt: normalized.checkInAt ? toLocalInput(normalized.checkInAt) : '',
    completedAt: normalized.completedAt ? toLocalInput(normalized.completedAt) : '',
    cancelledAt: normalized.cancelledAt ? toLocalInput(normalized.cancelledAt) : '',
  };
};

const buildPayload = (draft) => {
  const amountDue = normalizeNumber(draft.amountDue, 0);
  const amountPaid = normalizeNumber(draft.amountPaid, 0);
  const balanceRemaining = Math.max(amountDue - amountPaid, 0);

  return {
    id: normalizeText(draft.id),
    customerId: normalizeText(draft.customerId),
    customerName: normalizeText(draft.customerName, 'Guest'),
    customerEmail: normalizeText(draft.customerEmail),
    phone: normalizeText(draft.phone),
    serviceId: normalizeText(draft.serviceId),
    serviceName: normalizeText(draft.serviceName, 'Service'),
    staffId: normalizeText(draft.staffId),
    staffName: normalizeText(draft.staffName, 'Unassigned'),
    branchName: normalizeText(draft.branchName),
    appointmentAt: toIsoFromLocalInput(draft.appointmentAt),
    durationMinutes: Math.max(0, Math.round(normalizeNumber(draft.durationMinutes, 60))),
    status: normalizeText(draft.status, 'Confirmed'),
    paymentStatus: normalizeText(draft.paymentStatus, balanceRemaining > 0 ? (amountPaid > 0 ? 'Partial' : 'Unpaid') : 'Paid'),
    amountDue,
    amountPaid,
    balanceRemaining,
    source: normalizeText(draft.source, 'CRM'),
    notes: normalizeText(draft.notes),
    checkInAt: toIsoFromLocalInput(draft.checkInAt),
    completedAt: toIsoFromLocalInput(draft.completedAt),
    cancelledAt: toIsoFromLocalInput(draft.cancelledAt),
  };
};

const normalizeServiceOption = (service = {}, index = 0) => ({
  id: String(service.id || service.serviceId || `service-${index + 1}`),
  name: String(service.name || service.serviceName || service.title || 'Service'),
  price: Math.max(0, Math.round(normalizeNumber(service.price ?? service.amount ?? 0, 0))),
  durationMinutes: Math.max(0, Math.round(normalizeNumber(service.durationMinutes ?? service.duration ?? 60, 60))),
  durationLabel: String(service.durationLabel || ''),
  category: String(service.category || service.serviceCategory || ''),
  status: String(service.status || (service.active === false ? 'Inactive' : 'Active')),
  active: service.active !== false && String(service.status || 'Active') !== 'Inactive',
});

const isPastDue = (appointment) =>
  daysBetween(appointment.appointmentAt, new Date()) > 0 &&
  !['Completed', 'Cancelled', 'No Show'].includes(appointment.status);

const writeAppointmentsSnapshot = (snapshot) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(APPOINTMENTS_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best effort only.
  }
};

const CrmAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [mode, setMode] = useState('create');
  const [draft, setDraft] = useState(() => emptyDraft());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [paymentFilter, setPaymentFilter] = useState('All Payments');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [staffFilter, setStaffFilter] = useState('All Staff');
  const [timeScope, setTimeScope] = useState('All Appointments');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAppointments = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [appointmentsResult, branchesResult, staffResult, servicesResult] = await Promise.allSettled([
          crmList('appointments'),
          crmList('branches'),
          crmList('staff'),
          crmList('services'),
        ]);
        if (!mounted) return;
        const normalized = appointmentsResult.status === 'fulfilled' && Array.isArray(appointmentsResult.value)
          ? appointmentsResult.value.map(normalizeAppointment)
          : [];
        const normalizedServices = servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value) && servicesResult.value.length
          ? servicesResult.value.map(normalizeServiceOption)
          : SERVICE_SEED.map(normalizeServiceOption);
        const branchNames = new Set();
        const staffNames = new Set();
        const syncIssues = [];

        if (appointmentsResult.status === 'rejected') {
          syncIssues.push(`appointments: ${appointmentsResult.reason?.message || 'unavailable'}`);
        }

        if (branchesResult.status === 'fulfilled' && Array.isArray(branchesResult.value)) {
          branchesResult.value.forEach((branch) => {
            const name = normalizeText(branch?.name || branch?.branchName || branch?.locationName || branch?.title);
            if (name) branchNames.add(name);
          });
        } else if (branchesResult.status === 'rejected') {
          syncIssues.push(`branches: ${branchesResult.reason?.message || 'unavailable'}`);
        }

        if (staffResult.status === 'fulfilled' && Array.isArray(staffResult.value)) {
          staffResult.value.forEach((staff) => {
            const name = normalizeText(staff?.name || staff?.fullName || staff?.staffName || staff?.title);
            if (name) staffNames.add(name);
          });
        } else if (staffResult.status === 'rejected') {
          syncIssues.push(`staff: ${staffResult.reason?.message || 'unavailable'}`);
        }

        if (servicesResult.status === 'rejected') {
          syncIssues.push(`services: ${servicesResult.reason?.message || 'unavailable'}`);
        }

        setAppointments(normalized);
        setAvailableBranches(Array.from(branchNames));
        setAvailableStaff(Array.from(staffNames));
        setAvailableServices(normalizedServices);
        const firstId = normalized[0]?.id || '';
        setSelectedAppointmentId((current) => (normalized.some((item) => item.id === current) ? current : firstId));
        setMode(normalized.length ? 'edit' : 'create');
        setDraft(normalized.length ? emptyDraft(normalized[0]) : emptyDraft());
        setLoadError(syncIssues.length > 0 ? `CRM sync is partial. ${syncIssues.join(' | ')}` : '');

        writeAppointmentsSnapshot({
          appointments: normalized,
          branches: Array.from(branchNames),
          staff: Array.from(staffNames),
        });
      } catch (error) {
        if (!mounted) return;
        setAppointments([]);
        setAvailableBranches([]);
        setAvailableStaff([]);
        setAvailableServices(SERVICE_SEED.map(normalizeServiceOption));
        setSelectedAppointmentId('');
        setMode('create');
        setDraft(emptyDraft());
        setLoadError(error.message || 'Unable to load appointments from the CRM API.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadAppointments();

    return () => {
      mounted = false;
    };
  }, []);

  const branchOptions = useMemo(() => {
    const values = new Set(['All Branches']);
    availableBranches.forEach((branch) => {
      if (branch) values.add(branch);
    });
    appointments.forEach((appointment) => {
      if (appointment.branchName) values.add(appointment.branchName);
    });
    return Array.from(values);
  }, [appointments, availableBranches]);

  const staffOptions = useMemo(() => {
    const values = new Set(['All Staff']);
    availableStaff.forEach((staff) => {
      if (staff) values.add(staff);
    });
    appointments.forEach((appointment) => {
      if (appointment.staffName) values.add(appointment.staffName);
    });
    return Array.from(values);
  }, [appointments, availableStaff]);

  const serviceOptions = useMemo(
    () => availableServices.filter((service) => service.active !== false).sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name)),
    [availableServices],
  );

  const filteredAppointments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const todayKey = toDateKey(new Date());
    const now = new Date();

    return appointments
      .filter((appointment) => {
        const haystack = [
          appointment.customerName,
          appointment.customerEmail,
          appointment.phone,
          appointment.serviceName,
          appointment.staffName,
          appointment.branchName,
          appointment.status,
          appointment.paymentStatus,
          appointment.source,
          appointment.notes,
        ]
          .join(' ')
          .toLowerCase();

        const matchesSearch = !search || haystack.includes(search);
        const matchesStatus = statusFilter === 'All Statuses' || appointment.status === statusFilter;
        const matchesPayment = paymentFilter === 'All Payments' || appointment.paymentStatus === paymentFilter;
        const matchesBranch = branchFilter === 'All Branches' || appointment.branchName === branchFilter;
        const matchesStaff = staffFilter === 'All Staff' || appointment.staffName === staffFilter;
        const appointmentDay = toDateKey(appointment.appointmentAt);
        const matchesFrom = !dateFrom || (appointmentDay && appointmentDay >= dateFrom);
        const matchesTo = !dateTo || (appointmentDay && appointmentDay <= dateTo);

        let matchesScope = true;
        if (timeScope === 'Today') {
          matchesScope = appointmentDay === todayKey;
        } else if (timeScope === 'Upcoming') {
          matchesScope = new Date(appointment.appointmentAt).getTime() >= now.getTime() && !['Completed', 'Cancelled', 'No Show'].includes(appointment.status);
        } else if (timeScope === 'Past') {
          matchesScope = new Date(appointment.appointmentAt).getTime() < now.getTime();
        }

        return matchesSearch && matchesStatus && matchesPayment && matchesBranch && matchesStaff && matchesFrom && matchesTo && matchesScope;
      })
      .sort((left, right) => new Date(left.appointmentAt).getTime() - new Date(right.appointmentAt).getTime());
  }, [appointments, branchFilter, dateFrom, dateTo, paymentFilter, searchTerm, staffFilter, statusFilter, timeScope]);

  const groupedAppointments = useMemo(() => {
    const groups = new Map();

    filteredAppointments.forEach((appointment) => {
      const key = toDateKey(appointment.appointmentAt) || 'unscheduled';
      if (!groups.has(key)) {
        groups.set(key, { key, label: getDayLabel(appointment.appointmentAt), items: [] });
      }
      groups.get(key).items.push(appointment);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((left, right) => new Date(left.appointmentAt).getTime() - new Date(right.appointmentAt).getTime()),
      }))
      .sort((left, right) => {
        if (left.key === 'unscheduled') return 1;
        if (right.key === 'unscheduled') return -1;
        return left.key.localeCompare(right.key);
      });
  }, [filteredAppointments]);

  useEffect(() => {
    if (!filteredAppointments.length) {
      setSelectedAppointmentId('');
      if (mode === 'edit') {
        setMode('create');
        setDraft(emptyDraft());
      }
      return;
    }

    if (mode === 'create' && !selectedAppointmentId) {
      return;
    }

    if (!filteredAppointments.some((appointment) => appointment.id === selectedAppointmentId)) {
      setSelectedAppointmentId(filteredAppointments[0].id);
      setMode('edit');
      setDraft(emptyDraft(filteredAppointments[0]));
    }
  }, [filteredAppointments, mode, selectedAppointmentId]);

  const selectedAppointment = useMemo(
    () => appointments.find((appointment) => appointment.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId],
  );

  const resolvedDraftService = useMemo(
    () => serviceOptions.find(
      (service) =>
        service.id === draft.serviceId ||
        service.name.toLowerCase() === String(draft.serviceName || '').toLowerCase(),
    ) || null,
    [draft.serviceId, draft.serviceName, serviceOptions],
  );

  const draftServiceSelectValue = resolvedDraftService
    ? resolvedDraftService.id
    : draft.serviceName
      ? `legacy:${draft.serviceName}`
      : '';

  const summaryCards = useMemo(() => {
    const total = appointments.length;
    const todayKey = toDateKey(new Date());
    const today = appointments.filter((appointment) => toDateKey(appointment.appointmentAt) === todayKey).length;
    const upcoming = appointments.filter(
      (appointment) => new Date(appointment.appointmentAt).getTime() >= Date.now() && !['Completed', 'Cancelled', 'No Show'].includes(appointment.status),
    ).length;
    const completed = appointments.filter((appointment) => appointment.status === 'Completed').length;
    const balanceDue = appointments.reduce((sum, appointment) => sum + normalizeNumber(appointment.balanceRemaining, 0), 0);
    const scheduledHours = appointments.reduce((sum, appointment) => sum + normalizeNumber(appointment.durationMinutes, 0), 0) / 60;

    return [
      { label: 'Total Appointments', value: total, subtext: 'Persistent records in Postgres' },
      { label: 'Today', value: today, subtext: 'Bookings on the front desk board' },
      { label: 'Upcoming', value: upcoming, subtext: 'Future visits still in play' },
      { label: 'Completed', value: completed, subtext: 'Converted visits with closure' },
      { label: 'Balance Due', value: formatMoney(balanceDue), subtext: `${scheduledHours.toFixed(1)} scheduled hours` },
    ];
  }, [appointments]);

  const openCreate = () => {
    setSelectedAppointmentId('');
    setMode('create');
    setDraft(emptyDraft());
    setFormError('');
  };

  const openEdit = (appointment) => {
    setSelectedAppointmentId(appointment.id);
    setMode('edit');
    setDraft(emptyDraft(appointment));
    setFormError('');
  };

  const handleServiceSelection = (serviceId) => {
    if (String(serviceId || '').startsWith('legacy:')) {
      const legacyServiceName = String(serviceId).slice('legacy:'.length).trim();
      setDraft((current) => ({
        ...current,
        serviceId: '',
        serviceName: legacyServiceName,
      }));
      setFormError('');
      return;
    }

    const selected = serviceOptions.find((service) => service.id === serviceId);
    if (!selected) {
      setDraft((current) => ({
        ...current,
        serviceId: '',
        serviceName: '',
      }));
      setFormError('');
      return;
    }

    setDraft((current) => ({
      ...current,
      serviceId: selected.id,
      serviceName: selected.name,
      durationMinutes: String(selected.durationMinutes || current.durationMinutes || 60),
      amountDue: String(selected.price || current.amountDue || 0),
    }));
    setFormError('');
  };

  const updateStatusDraft = (nextStatus) => {
    setDraft((current) => ({
      ...current,
      status: nextStatus,
      checkInAt: nextStatus === 'Arrived' && !current.checkInAt ? toLocalInput(new Date()) : current.checkInAt,
      completedAt: nextStatus === 'Completed' && !current.completedAt ? toLocalInput(new Date()) : current.completedAt,
      cancelledAt: nextStatus === 'Cancelled' && !current.cancelledAt ? toLocalInput(new Date()) : current.cancelledAt,
    }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!normalizeText(draft.customerName)) {
      setFormError('Customer name is required.');
      return;
    }

    if (!normalizeText(draft.serviceName)) {
      setFormError('Service name is required.');
      return;
    }

    if (!draft.appointmentAt) {
      setFormError('Appointment date and time are required.');
      return;
    }

    if (normalizeNumber(draft.durationMinutes, 0) <= 0) {
      setFormError('Duration must be greater than zero.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(draft);
      if (!payload.appointmentAt) {
        setFormError('Appointment date and time are required.');
        setSaving(false);
        return;
      }
      const saved = mode === 'create'
        ? await crmCreate('appointments', payload)
        : await crmUpdate('appointments', selectedAppointmentId || payload.id, payload);
      const normalized = normalizeAppointment(saved);

      setAppointments((current) => {
        if (mode === 'create') {
          return [normalized, ...current];
        }
        return current.map((appointment) => (appointment.id === normalized.id ? normalized : appointment));
      });
      setSelectedAppointmentId(normalized.id);
      setMode('edit');
      setDraft(emptyDraft(normalized));
    } catch (error) {
      setFormError(error.message || 'Unable to save appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    if (!window.confirm(`Delete the appointment for ${selectedAppointment.customerName}?`)) return;

    setSaving(true);
    setFormError('');
    try {
      await crmDelete('appointments', selectedAppointment.id);
      setAppointments((current) => current.filter((appointment) => appointment.id !== selectedAppointment.id));
      const next = appointments.find((appointment) => appointment.id !== selectedAppointment.id);
      if (next) {
        openEdit(next);
      } else {
        openCreate();
      }
    } catch (error) {
      setFormError(error.message || 'Unable to delete appointment.');
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
    setPaymentFilter('All Payments');
    setBranchFilter('All Branches');
    setStaffFilter('All Staff');
    setTimeScope('All Appointments');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <CrmShell shellClassName="crm-workspace-shell crm-appointments-shell">
      <main className="crm-workspace-main crm-appointments-main">
        <header className="crm-workspace-header crm-appointments-header">
          <div className="crm-workspace-header-copy crm-appointments-header-copy">
            <p className="crm-workspace-kicker">Appointment Operations</p>
            <h1>Appointments</h1>
            <p>
              Manage the live schedule, payment state, and service flow for every spa visit in a persistent calendar workspace.
            </p>
          </div>

          <div className="crm-workspace-header-stack crm-appointments-header-stack">
            <div className="crm-workspace-actions crm-appointments-actions">
              <input
                type="search"
                placeholder="Search by guest, service, staff, branch, or source..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="crm-appointments-search"
              />
              <button type="button" className="crm-workspace-primary-btn" onClick={openCreate}>
                <Plus size={14} />
                New Appointment
              </button>
              <button type="button" className="crm-workspace-ghost-btn" onClick={() => filteredAppointments[0] && openEdit(filteredAppointments[0])}>
                <Sparkles size={14} />
                Open First
              </button>
              <button type="button" className="crm-workspace-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="crm-workspace-summary crm-appointments-summary">
          {summaryCards.map((card) => (
            <article key={card.label} className="crm-workspace-card">
              <p>{card.label}</p>
              <h2>{card.value}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        <section className="crm-workspace-filters crm-appointments-filters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {STATUS_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            {PAYMENT_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            {branchOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}>
            {staffOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={timeScope} onChange={(event) => setTimeScope(event.target.value)}>
            {TIME_SCOPE_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="From date" />
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="To date" />
          <button type="button" className="crm-workspace-chip" onClick={handleResetFilters}>
            <RefreshCcw size={14} />
            Reset Filters
          </button>
        </section>

        <section className="crm-workspace-grid crm-appointments-grid">
          {loadError ? <p className="crm-workspace-inline-error">{loadError}</p> : null}
          <article className={`crm-workspace-table-card crm-appointments-table-card${!isLoading && groupedAppointments.length === 0 ? ' crm-appointments-table-card-empty' : ''}`}>
            <header className="crm-workspace-table-head crm-appointments-table-head">
              <span>Guest</span>
              <span>Service</span>
              <span>Schedule</span>
              <span>Operations</span>
              <span>Status</span>
            </header>

            {isLoading ? (
              <div className="crm-workspace-empty">
                <h3>Loading appointments</h3>
                <p>Fetching live bookings, service assignments, and payment states from Postgres.</p>
              </div>
            ) : groupedAppointments.length === 0 ? (
              <div className="crm-workspace-empty">
                <h3>No appointments found</h3>
                <p>Try broadening the filters or create the first appointment for the schedule.</p>
                <div className="crm-workspace-empty-actions">
                  <button type="button" className="crm-workspace-primary-btn" onClick={openCreate}>
                    <Plus size={14} />
                    New Appointment
                  </button>
                  <button type="button" className="crm-workspace-secondary-btn" onClick={handleResetFilters}>
                    Show All
                  </button>
                </div>
              </div>
            ) : (
              <div className="crm-workspace-group-list">
                {groupedAppointments.map((group) => (
                  <section key={group.key} className="crm-workspace-group">
                    <div className="crm-workspace-group-head">
                      <h4>{group.label}</h4>
                      <span>{group.items.length} appointment{group.items.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="crm-workspace-group-body">
                      {group.items.map((appointment) => {
                        const isSelected = appointment.id === selectedAppointmentId;
                        const overdue = isPastDue(appointment);

                        return (
                          <button
                            key={appointment.id}
                            type="button"
                            className={`crm-workspace-row crm-appointments-row${isSelected ? ' crm-workspace-row-active' : ''}`}
                            onClick={() => openEdit(appointment)}
                          >
                            <div className="crm-workspace-row-primary">
                              <p className="crm-workspace-row-title">{appointment.customerName}</p>
                              <p className="crm-workspace-row-subtitle">
                                {appointment.customerEmail || 'No email'} <span>|</span> {appointment.phone || 'No phone'}
                              </p>
                            </div>
                            <div className="crm-workspace-row-meta">
                              <strong>{appointment.serviceName}</strong>
                              <span>{appointment.source} | {formatMoney(appointment.amountDue)}</span>
                            </div>
                            <div className="crm-workspace-row-meta">
                              <strong>{formatDateTime(appointment.appointmentAt)}</strong>
                              <span>{appointment.durationMinutes} min | {getDayLabel(appointment.appointmentAt)}</span>
                            </div>
                            <div className="crm-workspace-row-meta">
                              <strong>{appointment.staffName}</strong>
                              <span>{appointment.branchName || 'No branch set'}</span>
                            </div>
                            <div className="crm-workspace-badge-row">
                              <span className={`crm-workspace-badge crm-workspace-badge-${getStatusTone(appointment.status)}`}>{appointment.status}</span>
                              <span className={`crm-workspace-badge crm-workspace-badge-${getPaymentTone(appointment.paymentStatus)}`}>{appointment.paymentStatus}</span>
                              <span className={`crm-workspace-badge crm-workspace-badge-${overdue ? 'alert' : getTimeTone(appointment.appointmentAt)}`}>
                                {overdue ? 'Past due' : getDayLabel(appointment.appointmentAt)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </article>

          <aside className="crm-workspace-detail-card crm-appointments-detail-card">
            <div className="crm-workspace-detail-head crm-appointments-detail-head">
              <div className="crm-appointments-detail-copy">
                <p className="crm-workspace-detail-kicker">{mode === 'create' ? 'New Appointment' : 'Appointment Detail'}</p>
                <h3>{mode === 'create' ? 'Create appointment record' : selectedAppointment?.customerName || 'Select an appointment'}</h3>
                <p>
                  {mode === 'create'
                    ? 'Enter the booking once, then manage its operational flow directly from Postgres.'
                    : selectedAppointment
                      ? `Last updated ${formatDateTime(selectedAppointment.updatedAt)}`
                      : 'Pick a row to inspect the booking, payment state, and schedule details.'}
                </p>
              </div>
            </div>

            {selectedAppointment ? (
              <div className="crm-workspace-detail-summary">
                <article>
                  <p>Status</p>
                  <strong>{selectedAppointment.status}</strong>
                </article>
                <article>
                  <p>Payment</p>
                  <strong>{selectedAppointment.paymentStatus}</strong>
                </article>
                <article>
                  <p>Schedule</p>
                  <strong>{formatDateTime(selectedAppointment.appointmentAt)}</strong>
                </article>
                <article>
                  <p>Balance</p>
                  <strong>{formatMoney(selectedAppointment.balanceRemaining)}</strong>
                </article>
              </div>
            ) : null}

            <form className="crm-workspace-form crm-appointments-form" onSubmit={handleSubmit}>
              {formError ? <p className="crm-workspace-inline-error">{formError}</p> : null}

              <div className="crm-workspace-form-grid crm-appointments-form-grid">
                <label className="crm-workspace-field crm-workspace-field-full">
                  <span>Customer Name</span>
                  <input
                    type="text"
                    value={draft.customerName}
                    onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))}
                    placeholder="Guest name"
                    required
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Customer Email</span>
                  <input
                    type="email"
                    value={draft.customerEmail}
                    onChange={(event) => setDraft((current) => ({ ...current, customerEmail: event.target.value }))}
                    placeholder="guest@email.com"
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
                  <span>Service</span>
                  <select
                    value={draftServiceSelectValue}
                    onChange={(event) => handleServiceSelection(event.target.value)}
                    required
                  >
                    <option value="">Select a service</option>
                    {!resolvedDraftService && draft.serviceName ? (
                      <option value={`legacy:${draft.serviceName}`}>{draft.serviceName} (Legacy)</option>
                    ) : null}
                    {serviceOptions.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} | {formatMoney(service.price)} | {service.durationLabel || `${service.durationMinutes} min`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="crm-workspace-field">
                  <span>Staff</span>
                  <input
                    type="text"
                    value={draft.staffName}
                    onChange={(event) => setDraft((current) => ({ ...current, staffName: event.target.value }))}
                    placeholder="Assigned therapist"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Branch</span>
                  <input
                    type="text"
                    value={draft.branchName}
                    onChange={(event) => setDraft((current) => ({ ...current, branchName: event.target.value }))}
                    placeholder="Melrose Sanctuary"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Appointment At</span>
                  <input
                    type="datetime-local"
                    value={draft.appointmentAt}
                    onChange={(event) => setDraft((current) => ({ ...current, appointmentAt: event.target.value }))}
                    required
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Duration Minutes</span>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={draft.durationMinutes}
                    onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: event.target.value }))}
                    placeholder="60"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Source</span>
                  <select value={draft.source} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}>
                    {SOURCE_OPTIONS.filter((option) => option !== 'All Sources').map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="crm-workspace-field">
                  <span>Amount Due</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.amountDue}
                    onChange={(event) => setDraft((current) => ({ ...current, amountDue: event.target.value }))}
                    placeholder="150"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Amount Paid</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.amountPaid}
                    onChange={(event) => setDraft((current) => ({ ...current, amountPaid: event.target.value }))}
                    placeholder="0"
                  />
                </label>
                <label className="crm-workspace-field">
                  <span>Status</span>
                  <select value={draft.status} onChange={(event) => updateStatusDraft(event.target.value)}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="crm-workspace-field">
                  <span>Payment Status</span>
                  <select value={draft.paymentStatus} onChange={(event) => setDraft((current) => ({ ...current, paymentStatus: event.target.value }))}>
                    {PAYMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="crm-workspace-field crm-workspace-field-full">
                  <span>Notes</span>
                  <textarea
                    rows="4"
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Guest preferences, check-in notes, or prep instructions"
                  />
                </label>
              </div>

              <div className="crm-appointments-chip-group">
                <p className="crm-appointments-chip-label">Quick Status</p>
                <div className="crm-workspace-badge-row">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`crm-workspace-chip${draft.status === option ? ' crm-workspace-chip-active' : ''}`}
                      onClick={() => updateStatusDraft(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="crm-appointments-chip-group">
                <p className="crm-appointments-chip-label">Payment State</p>
                <div className="crm-workspace-badge-row">
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`crm-workspace-chip${draft.paymentStatus === option ? ' crm-workspace-chip-active' : ''}`}
                      onClick={() => setDraft((current) => ({ ...current, paymentStatus: option }))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="crm-workspace-detail-summary">
                <article>
                  <p>Balance Remaining</p>
                  <strong>{formatMoney(Math.max(normalizeNumber(draft.amountDue, 0) - normalizeNumber(draft.amountPaid, 0), 0))}</strong>
                </article>
                <article>
                  <p>Duration</p>
                  <strong>{normalizeNumber(draft.durationMinutes, 60)} minutes</strong>
                </article>
                <article>
                  <p>Check-in</p>
                  <strong>{draft.checkInAt ? formatDateTime(draft.checkInAt) : 'Not checked in'}</strong>
                </article>
                <article>
                  <p>Resolved</p>
                  <strong>{draft.status === 'Completed' ? 'Complete' : draft.status === 'Cancelled' ? 'Cancelled' : 'Open'}</strong>
                </article>
              </div>

              <div className="crm-workspace-form-actions">
                <button type="submit" className="crm-workspace-primary-btn" disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Saving...' : mode === 'create' ? 'Create Appointment' : 'Save Changes'}
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

            {selectedAppointment ? (
              <section className="crm-workspace-section">
                <div className="crm-workspace-section-head">
                  <div>
                    <h4>Operational Snapshot</h4>
                    <p>{selectedAppointment.customerName}</p>
                  </div>
                  <button type="button" className="crm-workspace-chip-link" onClick={() => setDraft(emptyDraft(selectedAppointment))}>
                    Reload Record
                  </button>
                </div>

                <div className="crm-workspace-badge-row">
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <UserRound size={12} />
                    {selectedAppointment.customerName}
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <Building2 size={12} />
                    {selectedAppointment.branchName || 'No branch'}
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-info">
                    <CalendarDays size={12} />
                    {getDayLabel(selectedAppointment.appointmentAt)}
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-info">
                    <Clock3 size={12} />
                    {selectedAppointment.durationMinutes} min
                  </span>
                </div>

                <div className="crm-workspace-badge-row">
                  <span className={`crm-workspace-badge crm-workspace-badge-${getStatusTone(selectedAppointment.status)}`}>
                    <CheckCircle2 size={12} />
                    {selectedAppointment.status}
                  </span>
                  <span className={`crm-workspace-badge crm-workspace-badge-${getPaymentTone(selectedAppointment.paymentStatus)}`}>
                    <CreditCard size={12} />
                    {selectedAppointment.paymentStatus}
                  </span>
                  <span className={`crm-workspace-badge crm-workspace-badge-${getTimeTone(selectedAppointment.appointmentAt)}`}>
                    <CalendarClock size={12} />
                    {formatDateTime(selectedAppointment.appointmentAt)}
                  </span>
                </div>

                <div className="crm-workspace-badge-row">
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <MapPin size={12} />
                    {selectedAppointment.branchName || 'No branch'}
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <Clock3 size={12} />
                    Due {formatMoney(selectedAppointment.amountDue)}
                  </span>
                  <span className="crm-workspace-badge crm-workspace-badge-neutral">
                    <Sparkles size={12} />
                    Paid {formatMoney(selectedAppointment.amountPaid)}
                  </span>
                </div>

                {selectedAppointment.notes ? <p className="crm-workspace-inline-note">{selectedAppointment.notes}</p> : null}
              </section>
            ) : null}
          </aside>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmAppointments;

