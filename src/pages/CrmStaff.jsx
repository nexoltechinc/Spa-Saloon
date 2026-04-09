import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmList, crmUpdate } from '../config/crmApi';
import { CRM_NAV_ITEMS } from '../config/crmNav';
import './CrmStaff.css';

const staffSeed = [
  {
    id: 'STF-201',
    name: 'Julianne Moore',
    role: 'Senior Massage Therapist',
    phone: '+1 (555) 010-1001',
    email: 'julianne.moore@sanctuary.com',
    services: ['Deep Tissue', 'Hot Stone', 'Aromatherapy', 'Swedish Flow'],
    workingHours: '9:00 AM - 6:00 PM',
    availability: 'Available',
    status: 'Active',
    appointmentsToday: 4,
    capacityToday: 5,
    onDutyToday: true,
    leaveStatus: 'None',
    utilization: 80,
    notes: 'Top-rated therapist. Prioritize VIP requests and sensitive client follow-ups.',
    weeklySchedule: [
      'Mon: 9:00 AM - 6:00 PM',
      'Tue: 9:00 AM - 6:00 PM',
      'Wed: 10:00 AM - 7:00 PM',
      'Thu: 9:00 AM - 6:00 PM',
      'Fri: 9:00 AM - 5:00 PM',
    ],
    todaySchedule: [
      { time: '9:00 AM', item: 'Swedish Flow', state: 'done' },
      { time: '1:30 PM', item: 'Deep Tissue', state: 'next' },
      { time: '4:00 PM', item: 'Hot Stone Ritual', state: 'later' },
    ],
  },
  {
    id: 'STF-202',
    name: 'Marcus Chen',
    role: 'Lead Aesthetician',
    phone: '+1 (555) 010-1002',
    email: 'marcus.chen@sanctuary.com',
    services: ['Facials', 'Peels'],
    workingHours: '10:00 AM - 7:00 PM',
    availability: 'Busy',
    status: 'Active',
    appointmentsToday: 6,
    capacityToday: 6,
    onDutyToday: true,
    leaveStatus: 'None',
    utilization: 100,
    notes: 'Fully booked today. Route urgent bookings to Elena or Sofia.',
    weeklySchedule: [
      'Mon: 10:00 AM - 7:00 PM',
      'Tue: 10:00 AM - 7:00 PM',
      'Wed: 10:00 AM - 7:00 PM',
      'Fri: 10:00 AM - 7:00 PM',
    ],
    todaySchedule: [
      { time: '10:00 AM', item: 'Hydrafacial', state: 'done' },
      { time: '12:30 PM', item: 'Peel Consultation', state: 'next' },
      { time: '3:30 PM', item: 'Acne Recovery Facial', state: 'later' },
    ],
  },
  {
    id: 'STF-203',
    name: 'Sophia Rossi',
    role: 'Skin Consultant',
    phone: '+1 (555) 010-1003',
    email: 'sophia.rossi@sanctuary.com',
    services: ['Consultation'],
    workingHours: '11:00 AM - 5:00 PM',
    availability: 'Off Duty',
    status: 'Active',
    appointmentsToday: 0,
    capacityToday: 4,
    onDutyToday: false,
    leaveStatus: 'None',
    utilization: 0,
    notes: 'Off duty this morning. Available for PM consultations.',
    weeklySchedule: [
      'Tue: 11:00 AM - 5:00 PM',
      'Wed: 11:00 AM - 5:00 PM',
      'Thu: 11:00 AM - 5:00 PM',
      'Sat: 10:00 AM - 2:00 PM',
    ],
    todaySchedule: [
      { time: 'No active slots', item: 'Off duty', state: 'later' },
    ],
  },
  {
    id: 'STF-204',
    name: 'Elena Vance',
    role: 'Therapist',
    phone: '+1 (555) 010-1004',
    email: 'elena.vance@sanctuary.com',
    services: ['Deep Tissue', 'Aromatherapy'],
    workingHours: '9:00 AM - 4:00 PM',
    availability: 'On Leave',
    status: 'Inactive',
    appointmentsToday: 0,
    capacityToday: 0,
    onDutyToday: false,
    leaveStatus: 'Sick Leave',
    utilization: 0,
    notes: 'Temporary leave through Friday. Keep inactive for booking.',
    weeklySchedule: [
      'Leave period active',
    ],
    todaySchedule: [
      { time: 'Unavailable', item: 'Leave', state: 'later' },
    ],
  },
];

const roleOptions = ['All Roles', 'Senior Massage Therapist', 'Lead Aesthetician', 'Skin Consultant', 'Therapist', 'Receptionist', 'Manager'];
const statusOptions = ['All Statuses', 'Active', 'Inactive'];
const availabilityOptions = ['All Availability', 'Available', 'Busy', 'Off Duty', 'On Leave'];
const serviceOptions = ['All Services', 'Deep Tissue', 'Hot Stone', 'Aromatherapy', 'Facials', 'Peels', 'Consultation'];

const availabilityTone = (status) => {
  switch (status) {
    case 'Available':
      return 'good';
    case 'Busy':
      return 'busy';
    case 'Off Duty':
      return 'off';
    case 'On Leave':
      return 'leave';
    default:
      return 'neutral';
  }
};

const normalizeStaff = (staff, index = 0) => ({
  id: staff.id || staff._id || staff.staffId || `staff-${index + 1}`,
  name: staff.name || staff.fullName || staff.displayName || 'Untitled Staff',
  role: staff.role || staff.title || staff.position || 'Staff Member',
  phone: staff.phone || staff.contactNumber || '',
  email: staff.email || staff.contactEmail || '',
  services: Array.isArray(staff.services)
    ? staff.services
    : Array.isArray(staff.assignedServices)
      ? staff.assignedServices
      : staff.services
        ? [String(staff.services)]
        : [],
  workingHours: staff.workingHours || staff.shift || staff.schedule || '9:00 AM - 5:00 PM',
  availability: staff.availability || staff.currentAvailability || 'Available',
  status: staff.status || staff.activeStatus || 'Active',
  appointmentsToday: Number(staff.appointmentsToday ?? staff.todayAppointments ?? staff.bookingsToday ?? 0),
  capacityToday: Number(staff.capacityToday ?? staff.dailyCapacity ?? staff.capacity ?? 0),
  onDutyToday: Boolean(staff.onDutyToday ?? staff.onDuty ?? true),
  leaveStatus: staff.leaveStatus || staff.leave || 'None',
  utilization: Number(staff.utilization ?? staff.utilisation ?? 0),
  notes: staff.notes || staff.comment || '',
  weeklySchedule: Array.isArray(staff.weeklySchedule)
    ? staff.weeklySchedule
    : Array.isArray(staff.weeklyAvailability)
      ? staff.weeklyAvailability
      : [],
  todaySchedule: Array.isArray(staff.todaySchedule)
    ? staff.todaySchedule
    : Array.isArray(staff.scheduleToday)
      ? staff.scheduleToday
      : [],
});

const CrmStaff = () => {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState(staffSeed);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [availabilityFilter, setAvailabilityFilter] = useState('All Availability');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [onDutyOnly, setOnDutyOnly] = useState(false);
  const [fullyBookedOnly, setFullyBookedOnly] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(staffSeed[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadStaff = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('staff');
        if (!mounted) return;

        const normalized = data.length > 0 ? data.map(normalizeStaff) : staffSeed;
        setStaffList(normalized);
        setSelectedStaffId((current) => (normalized.some((staff) => staff.id === current) ? current : normalized[0]?.id || ''));
      } catch (error) {
        if (!mounted) return;
        setStaffList(staffSeed);
        setLoadError(error.message || 'Unable to load staff from the CRM API.');
        setSelectedStaffId(staffSeed[0]?.id || '');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadStaff();

    return () => {
      mounted = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((item) => item.status === 'Active').length;
    const onDuty = staffList.filter((item) => item.onDutyToday).length;
    const fullyBooked = staffList.filter((item) => item.capacityToday > 0 && item.appointmentsToday >= item.capacityToday).length;
    const available = staffList.filter((item) => item.availability === 'Available').length;
    const inactive = staffList.filter((item) => item.status === 'Inactive').length;

    return [
      { label: 'Total Staff', value: total, subtext: '+1 this quarter' },
      { label: 'Active Staff', value: active, subtext: `${Math.round((active / total) * 100) || 0}% active` },
      { label: 'On Duty Today', value: onDuty, subtext: '2 available now' },
      { label: 'Fully Booked', value: fullyBooked, subtext: '37% utilization peak' },
      { label: 'Available Staff', value: available, subtext: '2 on break' },
      { label: 'Inactive Staff', value: inactive, subtext: '1 on leave' },
    ];
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchSearch = !searchTerm || `${staff.name} ${staff.role} ${staff.services.join(' ')}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === 'All Roles' || staff.role === roleFilter;
      const matchStatus = statusFilter === 'All Statuses' || staff.status === statusFilter;
      const matchAvailability = availabilityFilter === 'All Availability' || staff.availability === availabilityFilter;
      const matchService = serviceFilter === 'All Services' || staff.services.includes(serviceFilter);
      const matchOnDuty = !onDutyOnly || staff.onDutyToday;
      const matchFullyBooked = !fullyBookedOnly || (staff.capacityToday > 0 && staff.appointmentsToday >= staff.capacityToday);

      return matchSearch && matchRole && matchStatus && matchAvailability && matchService && matchOnDuty && matchFullyBooked;
    });
  }, [availabilityFilter, fullyBookedOnly, onDutyOnly, roleFilter, searchTerm, serviceFilter, staffList, statusFilter]);

  const selectedStaff = useMemo(() => {
    return filteredStaff.find((item) => item.id === selectedStaffId) || filteredStaff[0] || null;
  }, [filteredStaff, selectedStaffId]);

  const updateStaff = (staffId, updates) => {
    setStaffList((current) => current.map((item) => (item.id === staffId ? { ...item, ...updates } : item)));

    void crmUpdate('staff', staffId, updates).catch((error) => {
      setLoadError(error.message || 'Staff update failed.');
    });
  };

  const handleQuickCreateStaff = async () => {
    const name = window.prompt('Staff name');
    if (!name) return;

    const role = window.prompt('Role', 'Therapist') || 'Therapist';
    const services = window.prompt('Services (comma separated)', 'Massage') || '';
    const workingHours = window.prompt('Working hours', '9:00 AM - 5:00 PM') || '9:00 AM - 5:00 PM';

    try {
      const created = await crmCreate('staff', {
        name,
        role,
        phone: '',
        email: '',
        services: services.split(',').map((value) => value.trim()).filter(Boolean),
        workingHours,
        availability: 'Available',
        status: 'Active',
        appointmentsToday: 0,
        capacityToday: 0,
        onDutyToday: false,
        leaveStatus: 'None',
        utilization: 0,
        notes: 'Created from CRM quick add',
        weeklySchedule: [],
        todaySchedule: [],
      });

      const normalized = normalizeStaff(created, staffList.length);
      setStaffList((current) => [normalized, ...current]);
      setSelectedStaffId(normalized.id);
    } catch (error) {
      setLoadError(error.message || 'Staff creation failed.');
    }
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <div className="crm-staff-shell">
      <aside className="crm-staff-sidebar">
        <div className="crm-staff-brand">
          <p>The Sanctuary</p>
          <span>Premium Wellness</span>
        </div>

        <nav className="crm-staff-menu">
          {CRM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `crm-staff-menu-item${isActive ? ' crm-staff-menu-item-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="crm-staff-book-btn" onClick={() => navigate('/crm/appointments')}>
          Book Now
        </button>
      </aside>

      <main className="crm-staff-main">
        <header className="crm-staff-header">
          <div>
            <h1>Staff Management</h1>
            <p>Manage your team, their schedules, and service assignments with operational clarity.</p>
          </div>

          <div className="crm-staff-header-actions">
            <input
              type="search"
              placeholder="Search staff or services..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className="crm-staff-ghost-btn" onClick={() => navigate('/crm/staff')}>
              Manage Roles
            </button>
            <button type="button" className="crm-staff-ghost-btn" onClick={() => navigate('/crm/reports')}>
              Export
            </button>
            <button type="button" className="crm-staff-primary-btn" onClick={handleQuickCreateStaff}>
              Add Staff Member
            </button>
            <button type="button" className="crm-staff-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-staff-summary">
          {summaryCards.map((card) => (
            <article key={card.label}>
              <p>{card.label}</p>
              <h2>{String(card.value).padStart(2, '0')}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        {loadError ? (
          <section className="crm-staff-empty" style={{ marginBottom: '1rem' }}>
            <h3>CRM sync warning</h3>
            <p>{loadError}</p>
          </section>
        ) : null}

        <section className="crm-staff-filter-bar">
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {roleOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
            {availabilityOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
            {serviceOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <button
            type="button"
            className={`crm-staff-chip${onDutyOnly ? ' crm-staff-chip-active' : ''}`}
            onClick={() => setOnDutyOnly((value) => !value)}
          >
            On-Duty Today
          </button>
          <button
            type="button"
            className={`crm-staff-chip${fullyBookedOnly ? ' crm-staff-chip-active' : ''}`}
            onClick={() => setFullyBookedOnly((value) => !value)}
          >
            Fully Booked
          </button>
        </section>

        <section className="crm-staff-content">
          <article className="crm-staff-table-card">
            <header>
              <p>Name & Role</p>
              <p>Services Assigned</p>
              <p>Working Hours</p>
              <p>Today&apos;s Appts</p>
              <p>Status</p>
              <p>Active</p>
            </header>

            {isLoading ? (
              <div className="crm-staff-empty">
                <h3>Loading staff</h3>
                <p>Fetching the latest staff roster from the CRM backend.</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="crm-staff-empty">
                <h3>No staff match this filter</h3>
                <p>Adjust the segment bar or add a new staff member to restore coverage.</p>
              </div>
            ) : (
              <div className="crm-staff-table-body">
                {filteredStaff.map((staff) => {
                  const selected = selectedStaff?.id === staff.id;
                  const utilizationText = `${staff.appointmentsToday}/${staff.capacityToday || 0}`;
                  return (
                    <button
                      type="button"
                      key={staff.id}
                      className={`crm-staff-row${selected ? ' crm-staff-row-active' : ''}`}
                      onClick={() => setSelectedStaffId(staff.id)}
                    >
                      <div>
                        <p className="crm-staff-name">{staff.name}</p>
                        <p className="crm-staff-subline">{staff.role}</p>
                      </div>

                      <div className="crm-staff-service-tags">
                        {staff.services.slice(0, 3).map((service) => <span key={service}>{service}</span>)}
                      </div>

                      <p className="crm-staff-cell">{staff.workingHours}</p>
                      <p className="crm-staff-cell">{utilizationText}</p>

                      <div>
                        <span className={`crm-staff-status-pill crm-staff-status-${availabilityTone(staff.availability)}`}>
                          {staff.availability}
                        </span>
                      </div>

                      <label className="crm-staff-toggle-wrap" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={staff.status === 'Active'}
                          onChange={(event) =>
                            updateStaff(staff.id, {
                              status: event.target.checked ? 'Active' : 'Inactive',
                              availability: event.target.checked ? 'Available' : 'Off Duty',
                            })
                          }
                        />
                        <span />
                      </label>
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="crm-staff-detail-card">
            {selectedStaff ? (
              <>
                <div className="crm-staff-profile-head">
                  <div className="crm-staff-avatar">{selectedStaff.name.slice(0, 2).toUpperCase()}</div>
                  <h3>{selectedStaff.name}</h3>
                  <p>{selectedStaff.role}</p>
                  <p>{selectedStaff.email}</p>
                  <p>{selectedStaff.phone}</p>
                </div>

                <div className="crm-staff-detail-meta">
                  <div>
                    <p>Availability</p>
                    <strong>{selectedStaff.availability}</strong>
                  </div>
                  <div>
                    <p>Today&apos;s Load</p>
                    <strong>{selectedStaff.appointmentsToday}/{selectedStaff.capacityToday || 0}</strong>
                  </div>
                  <div>
                    <p>Leave Status</p>
                    <strong>{selectedStaff.leaveStatus}</strong>
                  </div>
                  <div>
                    <p>Utilization</p>
                    <strong>{selectedStaff.utilization}%</strong>
                  </div>
                </div>

                <div className="crm-staff-utilization">
                  <span style={{ width: `${selectedStaff.utilization}%` }} />
                </div>

                <div className="crm-staff-assigned-services">
                  <p>Specialized Services</p>
                  <div className="crm-staff-service-tags">
                    {selectedStaff.services.map((service) => <span key={service}>{service}</span>)}
                  </div>
                </div>

                <div className="crm-staff-schedule">
                  <p>Schedule Snapshot</p>
                  <ul>
                    {selectedStaff.todaySchedule.map((slot) => (
                      <li key={`${slot.time}-${slot.item}`} className={`crm-staff-slot-${slot.state}`}>
                        <strong>{slot.time}</strong>
                        <span>{slot.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="crm-staff-weekly">
                  <p>Weekly Availability</p>
                  <ul>
                    {selectedStaff.weeklySchedule.map((entry) => <li key={entry}>{entry}</li>)}
                  </ul>
                </div>

                <p className="crm-staff-notes">{selectedStaff.notes}</p>

                <div className="crm-staff-actions">
                  <button type="button" className="crm-staff-primary-btn" onClick={() => setSelectedStaffId(selectedStaff.id)}>
                    Edit Profile
                  </button>
                  <button type="button" className="crm-staff-secondary-btn" onClick={() => navigate('/crm/staff')}>
                    Assign Services
                  </button>
                  <button type="button" className="crm-staff-secondary-btn" onClick={() => setSelectedStaffId(selectedStaff.id)}>
                    Update Availability
                  </button>
                  <button type="button" className="crm-staff-ghost-btn" onClick={() => navigate('/crm/appointments')}>
                    View Schedule
                  </button>
                </div>
              </>
            ) : (
              <div className="crm-staff-empty">
                <h3>Select a staff member</h3>
                <p>Choose a profile to review availability, workload, and assignments.</p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
};

export default CrmStaff;
