import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmList, crmUpdate } from '../config/crmApi';
import { CRM_NAV_ITEMS } from '../config/crmNav';
import './CrmAppointments.css';

const staffLanes = ['Sarah J.', 'Michael C.', 'Elena L.'];
const baseDate = '2026-04-09';

const appointmentSeed = [
  {
    id: 'AS-4920',
    customer: 'Jane Doe',
    phone: '+1 (555) 010-2222',
    service: 'Deep Tissue Massage',
    staff: 'Sarah J.',
    start: '09:30',
    end: '10:40',
    status: 'Confirmed',
    note: 'Focus on lower back tension. Arriving 5 minutes early.',
    paymentStatus: 'Paid',
    reminderScheduled: true,
  },
  {
    id: 'AS-4921',
    customer: 'Michael Smith',
    phone: '+1 (555) 010-3333',
    service: 'Sports Therapy',
    staff: 'Michael C.',
    start: '10:15',
    end: '11:15',
    status: 'Pending',
    note: 'First-time guest. Explain package options.',
    paymentStatus: 'Unpaid',
    reminderScheduled: true,
  },
  {
    id: 'AS-4922',
    customer: 'Anna Wright',
    phone: '+1 (555) 010-4444',
    service: 'Signature Facial',
    staff: 'Sarah J.',
    start: '11:00',
    end: '11:50',
    status: 'In Progress',
    note: 'Sensitive skin profile in customer notes.',
    paymentStatus: 'Pending',
    reminderScheduled: false,
  },
  {
    id: 'AS-4923',
    customer: 'Sofia Vergara',
    phone: '+1 (555) 010-5555',
    service: 'Acupuncture',
    staff: 'Elena L.',
    start: '11:00',
    end: '12:00',
    status: 'Confirmed',
    note: 'Follow-up treatment session.',
    paymentStatus: 'Unpaid',
    reminderScheduled: true,
  },
  {
    id: 'AS-4924',
    customer: 'Liam Stewart',
    phone: '+1 (555) 010-6666',
    service: 'Hot Stone Therapy',
    staff: 'Elena L.',
    start: '13:30',
    end: '14:15',
    status: 'Cancelled',
    note: 'Cancelled by customer via call.',
    paymentStatus: 'N/A',
    reminderScheduled: false,
  },
];

const weekOverview = [
  { day: 'Mon', total: 18, confirmed: 14 },
  { day: 'Tue', total: 24, confirmed: 19 },
  { day: 'Wed', total: 21, confirmed: 17 },
  { day: 'Thu', total: 25, confirmed: 20 },
  { day: 'Fri', total: 29, confirmed: 24 },
  { day: 'Sat', total: 31, confirmed: 26 },
  { day: 'Sun', total: 12, confirmed: 8 },
];

const statusOptions = ['All Statuses', 'Pending', 'Confirmed', 'Arrived', 'In Progress', 'Completed', 'Cancelled', 'No Show'];
const serviceOptions = ['All Services', 'Deep Tissue Massage', 'Sports Therapy', 'Signature Facial', 'Acupuncture', 'Hot Stone Therapy'];
const staffOptions = ['All Staff', ...staffLanes];
const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];

const toMinutes = (clock) => {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
};

const getStatusTone = (status) => {
  switch (status) {
    case 'Confirmed':
      return 'confirmed';
    case 'In Progress':
      return 'progress';
    case 'Completed':
      return 'completed';
    case 'Pending':
      return 'pending';
    case 'Cancelled':
      return 'cancelled';
    default:
      return 'neutral';
  }
};

const normalizeAppointment = (appointment, index = 0) => ({
  id: appointment.id || appointment._id || appointment.appointmentId || `appt-${index + 1}`,
  customer: appointment.customer || appointment.customerName || appointment.name || 'Guest',
  phone: appointment.phone || appointment.contactNumber || '',
  service: appointment.service || appointment.serviceName || appointment.treatment || 'Service',
  staff: appointment.staff || appointment.assignedStaff || appointment.therapist || 'Unassigned',
  start: appointment.start || appointment.startTime || appointment.timeStart || '09:00',
  end: appointment.end || appointment.endTime || appointment.timeEnd || '10:00',
  status: appointment.status || appointment.appointmentStatus || 'Pending',
  note: appointment.note || appointment.notes || '',
  paymentStatus: appointment.paymentStatus || appointment.payment || 'Pending',
  reminderScheduled: Boolean(appointment.reminderScheduled ?? appointment.reminder ?? false),
});

const CrmAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState(appointmentSeed);
  const [viewMode, setViewMode] = useState('Day');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [staffFilter, setStaffFilter] = useState('All Staff');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(appointmentSeed[0].id);
  const [dayOffset, setDayOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadAppointments = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('appointments');
        if (!mounted) return;

        const normalized = data.length > 0 ? data.map(normalizeAppointment) : appointmentSeed;
        setAppointments(normalized);
        setSelectedId((current) => (normalized.some((item) => item.id === current) ? current : normalized[0]?.id || ''));
      } catch (error) {
        if (!mounted) return;
        setAppointments(appointmentSeed);
        setLoadError(error.message || 'Unable to load appointments from the CRM API.');
        setSelectedId(appointmentSeed[0]?.id || '');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadAppointments();

    return () => {
      mounted = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((item) => item.status === 'Confirmed').length;
    const inProgress = appointments.filter((item) => item.status === 'In Progress' || item.status === 'Arrived').length;
    const completed = appointments.filter((item) => item.status === 'Completed').length;
    const cancelled = appointments.filter((item) => item.status === 'Cancelled').length;
    const pending = appointments.filter((item) => item.status === 'Pending').length;

    return [
      { label: "Today's Appointments", value: total, subtext: '+3 from yesterday' },
      { label: 'Confirmed', value: confirmed, subtext: `${Math.round((confirmed / total) * 100) || 0}% confirmed` },
      { label: 'Arrived / In Progress', value: inProgress, subtext: '4 currently active' },
      { label: 'Completed', value: completed, subtext: `${Math.round((completed / total) * 100) || 0}% complete` },
      { label: 'Cancelled', value: cancelled, subtext: '1 today' },
      { label: 'Pending', value: pending, subtext: '1 overdue' },
    ];
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const matchesStatus = statusFilter === 'All Statuses' || item.status === statusFilter;
      const matchesStaff = staffFilter === 'All Staff' || item.staff === staffFilter;
      const matchesService = serviceFilter === 'All Services' || item.service === serviceFilter;
      const matchesSearch = !searchTerm || `${item.customer} ${item.phone} ${item.service}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesStaff && matchesService && matchesSearch;
    });
  }, [appointments, searchTerm, serviceFilter, staffFilter, statusFilter]);

  const selectedAppointment = useMemo(() => {
    return filteredAppointments.find((item) => item.id === selectedId) || filteredAppointments[0] || null;
  }, [filteredAppointments, selectedId]);

  const currentDateLabel = useMemo(() => {
    const base = new Date(baseDate);
    base.setDate(base.getDate() + dayOffset);
    return base.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [dayOffset]);

  const groupedByStaff = useMemo(() => {
    return staffLanes.reduce((acc, staffName) => {
      acc[staffName] = filteredAppointments.filter((item) => item.staff === staffName);
      return acc;
    }, {});
  }, [filteredAppointments]);

  const handleStatusChange = (appointmentId, status) => {
    setAppointments((current) =>
      current.map((item) => (item.id === appointmentId ? { ...item, status } : item)),
    );

    void crmUpdate('appointments', appointmentId, { status }).catch((error) => {
      setLoadError(error.message || 'Appointment status update failed.');
    });
  };

  const handleQuickCreateAppointment = async () => {
    const customer = window.prompt('Customer name');
    if (!customer) return;

    const service = window.prompt('Service name', 'Deep Tissue Massage') || 'Service';
    const staff = window.prompt('Assigned staff', 'Sarah J.') || 'Unassigned';
    const start = window.prompt('Start time (HH:MM)', '09:00') || '09:00';
    const end = window.prompt('End time (HH:MM)', '10:00') || '10:00';

    try {
      const created = await crmCreate('appointments', {
        customer,
        phone: '',
        service,
        staff,
        start,
        end,
        status: 'Pending',
        note: 'Created from CRM quick add',
        paymentStatus: 'Pending',
        reminderScheduled: true,
      });

      const normalized = normalizeAppointment(created, appointments.length);
      setAppointments((current) => [normalized, ...current]);
      setSelectedId(normalized.id);
    } catch (error) {
      setLoadError(error.message || 'Appointment creation failed.');
    }
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <div className="crm-appt-shell">
      <aside className="crm-appt-sidebar">
        <div className="crm-appt-brand">
          <p>Aura Sanctuary</p>
          <span>Premium Wellness</span>
        </div>

        <nav className="crm-appt-menu">
          {CRM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `crm-appt-menu-item${isActive ? ' crm-appt-menu-item-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="crm-appt-book-btn" onClick={() => navigate('/crm/customers')}>
          Quick Booking
        </button>
      </aside>

      <main className="crm-appt-main">
        <header className="crm-appt-header">
          <div>
            <h1>Appointments</h1>
            <p>Manage all client bookings and staff schedules with conflict-safe visibility.</p>
          </div>
          <div className="crm-appt-header-actions">
            <input
              type="search"
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className="crm-appt-ghost-btn" onClick={() => setDayOffset((value) => value - 1)}>
              Prev
            </button>
            <button type="button" className="crm-appt-ghost-btn" onClick={() => setDayOffset(0)}>
              Today
            </button>
            <button type="button" className="crm-appt-ghost-btn" onClick={() => setDayOffset((value) => value + 1)}>
              Next
            </button>
            <button type="button" className="crm-appt-primary-btn" onClick={handleQuickCreateAppointment}>
              New Appointment
            </button>
            <button type="button" className="crm-appt-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <section className="crm-appt-controls">
          <div className="crm-appt-view-toggle">
            <button
              type="button"
              className={viewMode === 'Day' ? 'crm-appt-view-active' : ''}
              onClick={() => setViewMode('Day')}
            >
              Day
            </button>
            <button
              type="button"
              className={viewMode === 'Week' ? 'crm-appt-view-active' : ''}
              onClick={() => setViewMode('Week')}
            >
              Week
            </button>
          </div>

          <select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}>
            {staffOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
            {serviceOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </section>

        <section className="crm-appt-summary">
          {summaryCards.map((card) => (
            <article key={card.label}>
              <p>{card.label}</p>
              <h2>{String(card.value).padStart(2, '0')}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        {loadError ? (
          <section className="crm-appt-empty" style={{ marginBottom: '1rem' }}>
            <h3>CRM sync warning</h3>
            <p>{loadError}</p>
          </section>
        ) : null}

        <section className="crm-appt-content">
          <article className="crm-appt-calendar-card">
            <header>
              <h2>{currentDateLabel}</h2>
              <p>{viewMode} View</p>
            </header>

            {isLoading ? (
              <div className="crm-appt-empty">
                <h3>Loading appointments</h3>
                <p>Syncing the latest booking data from the CRM backend.</p>
              </div>
            ) : viewMode === 'Day' ? (
              <div className="crm-appt-day-grid">
                <div className="crm-appt-time-column">
                  {hours.map((hour) => <span key={hour}>{hour}</span>)}
                </div>

                <div className="crm-appt-lanes">
                  <div className="crm-appt-lane-head">
                    {staffLanes.map((lane) => <p key={lane}>{lane}</p>)}
                  </div>
                  <div className="crm-appt-lane-body">
                    {staffLanes.map((lane) => (
                      <div key={lane} className="crm-appt-lane">
                        {groupedByStaff[lane].map((item) => {
                          const startOffset = toMinutes(item.start) - toMinutes('09:00');
                          const endOffset = toMinutes(item.end) - toMinutes('09:00');
                          const top = (startOffset / 60) * 92;
                          const height = Math.max(((endOffset - startOffset) / 60) * 92, 62);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              className={`crm-appt-card crm-appt-card-${getStatusTone(item.status)}${selectedAppointment?.id === item.id ? ' crm-appt-card-selected' : ''}`}
                              style={{ top: `${top}px`, height: `${height}px` }}
                              onClick={() => setSelectedId(item.id)}
                            >
                              <span>{item.status}</span>
                              <strong>{item.customer}</strong>
                              <p>{item.service}</p>
                              <p>{item.start} - {item.end}</p>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="crm-appt-week-grid">
                {weekOverview.map((day) => (
                  <article key={day.day}>
                    <p>{day.day}</p>
                    <h3>{day.total}</h3>
                    <span>{day.confirmed} confirmed</span>
                    <div>
                      <em style={{ width: `${Math.min((day.total / 32) * 100, 100)}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <aside className="crm-appt-detail-card">
            {selectedAppointment ? (
              <>
                <p className="crm-appt-ref">Selected Appointment</p>
                <h3>{selectedAppointment.customer}</h3>
                <p className="crm-appt-sub">{selectedAppointment.id} | {baseDate}</p>

                <div className="crm-appt-meta">
                  <div>
                    <p>Service</p>
                    <strong>{selectedAppointment.service}</strong>
                  </div>
                  <div>
                    <p>Therapist</p>
                    <strong>{selectedAppointment.staff}</strong>
                  </div>
                  <div>
                    <p>Slot</p>
                    <strong>{selectedAppointment.start} - {selectedAppointment.end}</strong>
                  </div>
                  <div>
                    <p>Payment</p>
                    <strong>{selectedAppointment.paymentStatus}</strong>
                  </div>
                </div>

                <label htmlFor="selected-status">Status</label>
                <select
                  id="selected-status"
                  value={selectedAppointment.status}
                  onChange={(event) => handleStatusChange(selectedAppointment.id, event.target.value)}
                >
                  {statusOptions.filter((option) => option !== 'All Statuses').map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>

                <p className="crm-appt-note">{selectedAppointment.note}</p>
                <p className="crm-appt-reminder">
                  Reminder: {selectedAppointment.reminderScheduled ? 'Scheduled' : 'Not scheduled'}
                </p>

                <div className="crm-appt-quick-actions">
                  <button type="button" className="crm-appt-primary-btn" onClick={() => handleStatusChange(selectedAppointment.id, 'Arrived')}>
                    Check In
                  </button>
                  <button type="button" className="crm-appt-secondary-btn" onClick={() => navigate('/crm/appointments')}>
                    Reschedule
                  </button>
                  <button type="button" className="crm-appt-secondary-btn" onClick={() => navigate('/crm/payments')}>
                    Record Payment
                  </button>
                  <button type="button" className="crm-appt-ghost-btn" onClick={() => navigate('/crm/customers')}>
                    Open Customer
                  </button>
                </div>

                <div className="crm-appt-upcoming">
                  <p>Upcoming Today</p>
                  <ul>
                    {filteredAppointments.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <span>{item.customer}</span>
                        <em>{item.start}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="crm-appt-empty">
                <h3>No appointment selected</h3>
                <p>Choose a card to open full details and quick actions.</p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
};

export default CrmAppointments;
