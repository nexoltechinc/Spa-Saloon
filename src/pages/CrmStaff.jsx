import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CrmShell from '../components/CrmShell';
import StaffDetailPanel from '../components/staff/StaffDetailPanel';
import StaffOperationsWorkspace from '../components/staff/StaffOperationsWorkspace';
import StaffRow from '../components/staff/StaffRow';
import StaffMemberDrawer from '../components/staff/StaffMemberDrawer';
import { clearCrmToken, getCrmSession } from '../config/crm';
import { crmList, crmUpdate } from '../config/crmApi';
import { collectOptionValues } from './crmWorkspaceUtils';
import './CrmStaff.css';

const IS_RECOVERABLE_SYNC_ERROR = (error) => {
  const status = Number(error?.status);
  const message = String(error?.message || '');

  return [502, 503, 504].includes(status) || /(?:502|503|504)/.test(message);
};

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHIFT_OPTIONS = ['Available', 'Busy', 'On Break', 'Off Duty', 'On Leave'];
const EMPLOYMENT_OPTIONS = ['Active', 'Inactive'];
const BASE_SERVICES = ['Deep Tissue', 'Hot Stone', 'Aromatherapy', 'Facials', 'Peels', 'Consultation', 'Hydra Glow'];

const baseWeeklyAvailability = WEEK_DAYS.map((day) => ({ day, off: true, note: 'Off' }));

const fillWeeklyAvailability = (input = []) => {
  const byDay = input.reduce((acc, entry) => {
    if (entry?.day) acc[entry.day] = entry;
    return acc;
  }, {});

  return baseWeeklyAvailability.map((day) => ({
    ...day,
    ...(byDay[day.day] || {}),
  }));
};

const hiddenStaffIdentifiers = new Set([
  'STF-201',
  'julianne moore',
  'julianne.moore@sanctuary.com',
]);

const shouldHideStaff = (staff) => {
  const id = String(staff?.id || staff?.staffId || staff?._id || '').trim().toUpperCase();
  const name = String(staff?.name || staff?.fullName || staff?.displayName || '').trim().toLowerCase();
  const email = String(staff?.email || staff?.contactEmail || '').trim().toLowerCase();

  return hiddenStaffIdentifiers.has(id) || hiddenStaffIdentifiers.has(name) || hiddenStaffIdentifiers.has(email);
};

const rawStaffSeed = [
  {
    id: 'STF-202',
    name: 'Marcus Chen',
    role: 'Senior Aesthetician',
    branchName: 'West Hollywood',
    phone: '+1 (555) 010-1002',
    email: 'marcus.chen@sanctuary.com',
    services: ['Facials', 'Peels', 'Hydra Glow'],
    workingHours: '10:00 AM - 7:00 PM',
    employmentStatus: 'Active',
    shiftStatus: 'Busy',
    leaveStatus: 'None',
    appointmentsToday: 6,
    capacityToday: 6,
    appointmentsCompletedWeek: 24,
    notes: 'Fully booked today. Route urgent skin bookings to Noor where possible.',
    clientHandlingNotes: 'Excellent with acne-recovery clients and post-treatment consults.',
    weeklyAvailability: [
      { day: 'Mon', start: '10:00', end: '19:00', off: false },
      { day: 'Tue', start: '10:00', end: '19:00', off: false },
      { day: 'Wed', start: '10:00', end: '19:00', off: false },
      { day: 'Fri', start: '10:00', end: '19:00', off: false },
      { day: 'Sat', start: '10:00', end: '15:00', off: false },
    ],
    todaySchedule: [
      { id: 'M-1', time: '10:00 AM', customer: 'Alyssa K.', service: 'Hydra Glow', status: 'Completed', state: 'completed' },
      { id: 'M-2', time: '12:30 PM', customer: 'Jenna L.', service: 'Peel Consultation', status: 'In Progress', state: 'current' },
      { id: 'M-3', time: '2:30 PM', customer: 'Vera T.', service: 'Brightening Facial', status: 'Next Up', state: 'next' },
      { id: 'M-4', time: '4:30 PM', customer: 'Hazel M.', service: 'Acne Recovery Facial', status: 'Scheduled', state: 'upcoming' },
      { id: 'M-5', time: '6:00 PM', customer: 'Leah S.', service: 'Peel Check-in', status: 'Scheduled', state: 'upcoming' },
    ],
  },
  {
    id: 'STF-203',
    name: 'Sophia Rossi',
    role: 'Skin Consultant',
    branchName: 'Beverly Hills',
    phone: '+1 (555) 010-1003',
    email: 'sophia.rossi@sanctuary.com',
    services: ['Consultation', 'Facials'],
    workingHours: '11:00 AM - 5:00 PM',
    employmentStatus: 'Active',
    shiftStatus: 'On Break',
    leaveStatus: 'None',
    appointmentsToday: 2,
    capacityToday: 4,
    appointmentsCompletedWeek: 11,
    notes: 'Excellent conversion on consultation-to-treatment journeys.',
    clientHandlingNotes: 'Preferred for sensitive skin consultations and calm onboarding.',
    weeklyAvailability: [
      { day: 'Tue', start: '11:00', end: '17:00', off: false },
      { day: 'Wed', start: '11:00', end: '17:00', off: false },
      { day: 'Thu', start: '11:00', end: '17:00', off: false },
      { day: 'Sat', start: '10:00', end: '14:00', off: false },
    ],
    todaySchedule: [
      { id: 'S-1', time: '11:00 AM', customer: 'Nina C.', service: 'Consultation', status: 'Completed', state: 'completed' },
      { id: 'S-2', time: '1:45 PM', customer: 'Talia N.', service: 'Skin Consult', status: 'Next Up', state: 'next' },
      { id: 'S-gap', type: 'gap', label: '1h 15m free gap for reassignment' },
      { id: 'S-3', time: '4:00 PM', customer: 'Mila H.', service: 'Facial Review', status: 'Scheduled', state: 'upcoming' },
    ],
  },
  {
    id: 'STF-204',
    name: 'Noor Hale',
    role: 'Therapist',
    branchName: 'Downtown',
    phone: '+1 (555) 010-1005',
    email: 'noor.hale@sanctuary.com',
    services: ['Hydra Glow', 'Aromatherapy', 'Consultation'],
    workingHours: '12:00 PM - 8:00 PM',
    employmentStatus: 'Active',
    shiftStatus: 'Off Duty',
    leaveStatus: 'None',
    appointmentsToday: 0,
    capacityToday: 5,
    appointmentsCompletedWeek: 6,
    notes: 'Great backup for premium skincare and consultation-heavy days.',
    clientHandlingNotes: 'Handles anxious first-time clients with high retention.',
    weeklyAvailability: [
      { day: 'Mon', start: '12:00', end: '20:00', off: false },
      { day: 'Wed', start: '12:00', end: '20:00', off: false },
      { day: 'Thu', start: '12:00', end: '20:00', off: false },
      { day: 'Fri', start: '12:00', end: '20:00', off: false },
    ],
    todaySchedule: [],
  },
  {
    id: 'STF-205',
    name: 'Elena Vance',
    role: 'Therapist',
    branchName: 'West Hollywood',
    phone: '+1 (555) 010-1004',
    email: 'elena.vance@sanctuary.com',
    services: ['Deep Tissue', 'Aromatherapy'],
    workingHours: '9:00 AM - 4:00 PM',
    employmentStatus: 'Inactive',
    shiftStatus: 'On Leave',
    leaveStatus: 'Medical Leave (through Friday)',
    appointmentsToday: 0,
    capacityToday: 0,
    appointmentsCompletedWeek: 0,
    notes: 'Temporary leave through Friday. Keep profile inactive for scheduling.',
    clientHandlingNotes: 'Reassign her recurring clients to Marcus or Noor.',
    weeklyAvailability: [
      { day: 'Mon', off: true, note: 'Leave' },
      { day: 'Tue', off: true, note: 'Leave' },
      { day: 'Wed', off: true, note: 'Leave' },
      { day: 'Thu', off: true, note: 'Leave' },
      { day: 'Fri', off: true, note: 'Leave' },
    ],
    todaySchedule: [{ id: 'E-leave', type: 'gap', label: 'On leave today' }],
  },
];

const STAFF_SEED = rawStaffSeed.map((staff) => ({
  ...staff,
  weeklyAvailability: fillWeeklyAvailability(staff.weeklyAvailability),
}));

const toIsoDate = () => new Date().toISOString();

const parseClock = (value) => {
  if (!value || !String(value).includes(':')) return null;
  const cleaned = String(value).trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (period) {
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
  }

  return hour * 60 + minutes;
};

const formatGapLabel = (minutes) => {
  if (minutes < 60) return `${minutes}m free gap`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m free gap` : `${hours}h free gap`;
};

const enrichScheduleWithGaps = (schedule = []) => {
  const clean = schedule.filter(Boolean);
  if (clean.length <= 1) return clean;

  const withGaps = [];

  clean.forEach((slot, index) => {
    withGaps.push(slot);
    if (slot.type === 'gap') return;

    const next = clean[index + 1];
    if (!next || next.type === 'gap') return;

    const start = parseClock(slot.time);
    const nextStart = parseClock(next.time);
    if (start === null || nextStart === null) return;

    const gap = nextStart - start - 60;
    if (gap >= 45) {
      withGaps.push({
        id: `${slot.id || slot.time}-gap-${next.id || next.time}`,
        type: 'gap',
        label: formatGapLabel(gap),
      });
    }
  });

  return withGaps;
};

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

const normalizeWeeklyAvailability = (staff) => {
  if (Array.isArray(staff.weeklyAvailability) && staff.weeklyAvailability[0]?.day) {
    return fillWeeklyAvailability(staff.weeklyAvailability);
  }

  if (Array.isArray(staff.weeklySchedule) && staff.weeklySchedule.length > 0) {
    const parsed = staff.weeklySchedule
      .map((entry) => {
        const match = String(entry).match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*(.+)\s-\s(.+)$/i);
        if (!match) return null;
        return {
          day: match[1].slice(0, 1).toUpperCase() + match[1].slice(1, 3).toLowerCase(),
          start: match[2].includes(':') ? match[2].trim() : '09:00',
          end: match[3].includes(':') ? match[3].trim() : '17:00',
          off: false,
        };
      })
      .filter(Boolean);

    return fillWeeklyAvailability(parsed);
  }

  const fallback = WEEK_DAYS.slice(0, 5).map((day) => ({ day, start: '09:00', end: '17:00', off: false }));
  return fillWeeklyAvailability(fallback);
};

const normalizeTodaySchedule = (staff) => {
  const source = Array.isArray(staff.todaySchedule)
    ? staff.todaySchedule
    : Array.isArray(staff.scheduleToday)
      ? staff.scheduleToday
      : [];

  const mapped = source.map((slot, index) => {
    if (slot?.type === 'gap') return slot;

    const stateMap = {
      done: 'completed',
      later: 'upcoming',
      next: 'next',
      current: 'current',
      completed: 'completed',
      upcoming: 'upcoming',
    };

    return {
      id: slot.id || `${staff.id || 'staff'}-slot-${index + 1}`,
      time: slot.time || slot.at || 'TBD',
      customer: slot.customer || slot.clientName || 'Client',
      service: slot.service || slot.item || slot.serviceName || 'Service',
      status: slot.status || (slot.state === 'current' ? 'In Progress' : 'Scheduled'),
      state: stateMap[slot.state] || 'upcoming',
    };
  });

  return enrichScheduleWithGaps(mapped);
};

const normalizeStaff = (staff, index = 0) => {
  const employmentStatus = staff.employmentStatus || staff.status || staff.activeStatus || 'Active';
  const shiftStatus = staff.shiftStatus || staff.availability || staff.currentAvailability || 'Available';

  return {
    id: staff.id || staff._id || staff.staffId || `staff-${index + 1}`,
    name: staff.name || staff.fullName || staff.displayName || 'Untitled Staff',
    fullName: staff.fullName || staff.name || staff.displayName || 'Untitled Staff',
    role: staff.role || staff.title || staff.position || 'Staff Member',
    phone: staff.phone || staff.contactNumber || '',
    email: staff.email || staff.contactEmail || '',
    branchId: staff.branchId || staff.branch_id || '',
    branchName: staff.branchName || staff.branch || staff.locationName || '',
    employmentType: staff.employmentType || staff.employment_type || 'Full-time',
    shiftLabel: staff.shiftLabel || staff.shift_label || '',
    bio: staff.bio || '',
    profileImage: staff.profileImage || staff.avatar || staff.photo || '',
    onDuty: Boolean(staff.onDuty ?? staff.on_duty ?? (shiftStatus !== 'Off Duty')),
    services: Array.isArray(staff.services)
      ? staff.services
      : Array.isArray(staff.assignedServices)
        ? staff.assignedServices
        : staff.services
          ? [String(staff.services)]
          : [],
    workingHours: staff.workingHours || staff.shift || staff.schedule || '9:00 AM - 5:00 PM',
    employmentStatus,
    shiftStatus,
    leaveStatus: staff.leaveStatus || staff.leave || (shiftStatus === 'On Leave' ? 'On Leave' : 'None'),
    appointmentsToday: Number(staff.appointmentsToday ?? staff.todayAppointments ?? staff.bookingsToday ?? 0),
    capacityToday: Number(staff.capacityToday ?? staff.dailyCapacity ?? staff.capacity ?? 0),
    appointmentsCompletedWeek: Number(staff.appointmentsCompletedWeek ?? staff.weeklyAppointments ?? staff.completedWeek ?? 0),
    notes: staff.notes || staff.comment || '',
    clientHandlingNotes: staff.clientHandlingNotes || staff.vipNotes || staff.specialNotes || '',
    weeklyAvailability: normalizeWeeklyAvailability(staff),
    todaySchedule: normalizeTodaySchedule(staff),
    lastUpdated: staff.lastUpdated || staff.updatedAt || toIsoDate(),
  };
};

const toShiftState = (status) => {
  if (status === 'On Leave') return { onDuty: false, availableNow: false };
  if (status === 'Off Duty') return { onDuty: false, availableNow: false };
  if (status === 'On Break') return { onDuty: true, availableNow: false };
  if (status === 'Busy') return { onDuty: true, availableNow: false };
  return { onDuty: true, availableNow: true };
};

const getLoadDescriptor = (appointmentsToday, capacityToday) => {
  const booked = Number(appointmentsToday || 0);
  const capacity = Number(capacityToday || 0);

  if (capacity <= 0) {
    return {
      label: booked > 0 ? 'Custom Load' : 'Capacity Not Set',
      detail: booked > 0 ? `${booked} booked today` : 'No slots configured',
      tone: 'neutral',
      utilization: 0,
      isFullyBooked: false,
      isUnderutilized: false,
    };
  }

  const utilization = Math.min(100, Math.round((booked / capacity) * 100));
  const remaining = Math.max(capacity - booked, 0);

  if (booked === 0) {
    return {
      label: 'No Bookings Today',
      detail: `0 of ${capacity} booked - ${remaining} remaining`,
      tone: 'light',
      utilization,
      isFullyBooked: false,
      isUnderutilized: true,
    };
  }

  if (booked >= capacity) {
    return {
      label: 'Fully Booked',
      detail: `${booked} of ${capacity} booked - 0 remaining`,
      tone: 'full',
      utilization: 100,
      isFullyBooked: true,
      isUnderutilized: false,
    };
  }

  if (utilization >= 85) {
    return {
      label: 'High Load',
      detail: `${booked} of ${capacity} booked - ${remaining} remaining`,
      tone: 'high',
      utilization,
      isFullyBooked: false,
      isUnderutilized: false,
    };
  }

  if (utilization >= 50) {
    return {
      label: 'Moderate Load',
      detail: `${booked} of ${capacity} booked - ${remaining} remaining`,
      tone: 'moderate',
      utilization,
      isFullyBooked: false,
      isUnderutilized: false,
    };
  }

  return {
    label: utilization < 35 ? 'Underutilized' : 'Light Load',
    detail: `${booked} of ${capacity} booked - ${remaining} remaining`,
    tone: 'light',
    utilization,
    isFullyBooked: false,
    isUnderutilized: true,
  };
};

const getCoverageLabel = (activeCount, onDutyCount) => {
  if (activeCount === 0) return { label: 'No Active Provider', tone: 'risk' };
  if (onDutyCount === 0) return { label: 'No On-Duty Coverage', tone: 'risk' };
  if (onDutyCount === 1) return { label: 'Reduced Coverage', tone: 'warning' };
  return { label: 'Strong Coverage', tone: 'good' };
};

const buildCoverageMap = (staff) => {
  const coverageByService = {};
  const serviceUniverse = new Set(BASE_SERVICES);

  staff.forEach((member) => {
    member.services.forEach((service) => serviceUniverse.add(service));
  });

  [...serviceUniverse].forEach((service) => {
    const providers = staff.filter((member) => member.services.includes(service));
    const activeProviders = providers.filter((member) => member.employmentStatus === 'Active');
    const onDutyProviders = activeProviders.filter((member) => member.onDuty);

    const { label, tone } = getCoverageLabel(activeProviders.length, onDutyProviders.length);

    coverageByService[service] = {
      service,
      activeCount: activeProviders.length,
      onDutyCount: onDutyProviders.length,
      label,
      tone,
      providerIds: providers.map((member) => member.id),
      providerNames: providers.map((member) => member.name),
      onDutyNames: onDutyProviders.map((member) => member.name),
    };
  });

  return coverageByService;
};

const withOperationalFields = (member, coverageByService) => {
  const shiftInfo = toShiftState(member.shiftStatus);
  const employmentActive = member.employmentStatus === 'Active';
  const onDuty = employmentActive && shiftInfo.onDuty;
  const availableNow = onDuty && shiftInfo.availableNow;

  const nextAppointment = member.todaySchedule.find((slot) => slot.type !== 'gap' && ['current', 'next', 'upcoming'].includes(slot.state)) || null;
  const appointmentsRemaining = member.todaySchedule.filter((slot) => slot.type !== 'gap' && ['next', 'upcoming'].includes(slot.state)).length;

  const load = getLoadDescriptor(member.appointmentsToday, member.capacityToday);

  const onlyProviderServices = member.services.filter((service) => coverageByService[service]?.activeCount === 1 && coverageByService[service]?.providerIds.includes(member.id));

  const coverageWarnings = member.services
    .map((service) => {
      const coverage = coverageByService[service];
      if (!coverage) return null;

      if (coverage.activeCount === 0) return { label: `${service}: no active provider`, tone: 'risk' };
      if (coverage.onDutyCount === 0) return { label: `${service}: nobody on duty`, tone: 'risk' };
      if (coverage.onDutyCount === 1) return { label: `${service}: only one on duty`, tone: 'warning' };

      return null;
    })
    .filter(Boolean);

  const rowWarnings = [
    ...onlyProviderServices.map((service) => ({ label: `Only provider: ${service}`, tone: 'risk' })),
    ...(member.shiftStatus === 'On Leave' ? [{ label: 'On leave', tone: 'neutral' }] : []),
    ...(load.isFullyBooked ? [{ label: 'Fully booked', tone: 'warning' }] : []),
    ...(load.isUnderutilized && onDuty ? [{ label: 'Underutilized', tone: 'neutral' }] : []),
  ];

  return {
    ...member,
    onDuty,
    availableNow,
    nextAppointment,
    appointmentsRemaining,
    load,
    utilization: load.utilization,
    onlyProviderServices,
    coverageWarnings,
    rowWarnings,
    reassignmentReady: onDuty && !load.isFullyBooked && member.shiftStatus !== 'On Leave',
  };
};

const roleCapabilities = {
  owner: { manageStaff: true },
  manager: { manageStaff: true },
  receptionist: { manageStaff: false },
  admin: { manageStaff: true },
};

const defaultRole = 'manager';

const CrmStaff = () => {
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [employmentFilter, setEmploymentFilter] = useState('All Employment');
  const [shiftFilter, setShiftFilter] = useState('All Shift Status');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [onDutyOnly, setOnDutyOnly] = useState(false);
  const [fullyBookedOnly, setFullyBookedOnly] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [detailTab, setDetailTab] = useState('overview');
  const [operationTab, setOperationTab] = useState('coverage');
  const [activeRole] = useState(() => getCrmSession()?.role || defaultRole);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [branchCatalog, setBranchCatalog] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [staffDrawer, setStaffDrawer] = useState({ open: false, mode: 'create', staff: null });
  const [toast, setToast] = useState(null);
  const isMountedRef = useRef(true);
  const toastTimerRef = useRef(null);

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const data = await crmList('staff');
      if (!isMountedRef.current) return;
      const visibleStaff = Array.isArray(data) ? data.filter((staff) => !shouldHideStaff(staff)) : [];
      const normalized = visibleStaff.map(normalizeStaff);
      setStaffList(normalized);
      setSelectedStaffId((current) => (normalized.some((staff) => staff.id === current) ? current : normalized[0]?.id || ''));
    } catch (error) {
      if (!isMountedRef.current) return;
      setStaffList([]);
      setSelectedStaffId('');
      setLoadError(error.message || 'Unable to load staff from the CRM API.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    const [branchesResult, servicesResult] = await Promise.allSettled([
      crmList('branches').catch(() => []),
      crmList('services').catch(() => []),
    ]);

    if (!isMountedRef.current) return;

    setBranchCatalog(Array.isArray(branchesResult.value) ? branchesResult.value : []);
    setServiceCatalog(Array.isArray(servicesResult.value) ? servicesResult.value : []);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadStaff();
    void loadReferenceData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadReferenceData, loadStaff]);

  useEffect(() => {
    if (!toast) return undefined;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3800);

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [toast]);

  const permissions = roleCapabilities[activeRole] || roleCapabilities.manager;

  const preparsedStaff = useMemo(() => {
    return staffList.map((member) => {
      const shiftInfo = toShiftState(member.shiftStatus);
      const employmentActive = member.employmentStatus === 'Active';
      return {
        ...member,
        onDuty: employmentActive && shiftInfo.onDuty,
      };
    });
  }, [staffList]);

  const coverageByService = useMemo(() => buildCoverageMap(preparsedStaff), [preparsedStaff]);

  const enrichedStaff = useMemo(() => {
    return staffList.map((member) => withOperationalFields(member, coverageByService));
  }, [coverageByService, staffList]);

  const roleOptions = useMemo(() => ['All Roles', ...new Set(enrichedStaff.map((member) => member.role))], [enrichedStaff]);
  const serviceOptions = useMemo(() => ['All Services', ...new Set(enrichedStaff.flatMap((member) => member.services))], [enrichedStaff]);
  const branchOptions = useMemo(() => ['All Branches', ...collectOptionValues(enrichedStaff, ['branchName'])], [enrichedStaff]);

  const summaryCards = useMemo(() => {
    const total = enrichedStaff.length;
    const active = enrichedStaff.filter((item) => item.employmentStatus === 'Active').length;
    const onDuty = enrichedStaff.filter((item) => item.onDuty).length;
    const fullyBooked = enrichedStaff.filter((item) => item.load.isFullyBooked).length;
    const available = enrichedStaff.filter((item) => item.availableNow).length;
    const inactive = total - active;

    return [
      { label: 'Total Staff', value: total, subtext: `${total} profiles in this location` },
      { label: 'Active Staff', value: active, subtext: 'Employment active and schedulable' },
      { label: 'On Duty Today', value: onDuty, subtext: 'Active on current shift' },
      { label: 'Fully Booked', value: fullyBooked, subtext: 'No remaining slots today' },
      { label: 'Available Staff', value: available, subtext: 'Free now for new bookings' },
      { label: 'Inactive Staff', value: inactive, subtext: 'Not schedulable in operations' },
    ];
  }, [enrichedStaff]);

  const filteredStaff = useMemo(() => {
    return enrichedStaff.filter((staff) => {
      const searchable = `${staff.name} ${staff.role} ${staff.services.join(' ')}`.toLowerCase();
      const matchesSearch = !searchTerm || searchable.includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'All Roles' || staff.role === roleFilter;
      const matchesEmployment = employmentFilter === 'All Employment' || staff.employmentStatus === employmentFilter;
      const matchesShift = shiftFilter === 'All Shift Status' || staff.shiftStatus === shiftFilter;
      const matchesService = serviceFilter === 'All Services' || staff.services.includes(serviceFilter);
      const matchesBranch = branchFilter === 'All Branches' || staff.branchName === branchFilter;
      const matchesOnDuty = !onDutyOnly || staff.onDuty;
      const matchesFullyBooked = !fullyBookedOnly || staff.load.isFullyBooked;

      return matchesSearch && matchesRole && matchesEmployment && matchesShift && matchesService && matchesBranch && matchesOnDuty && matchesFullyBooked;
    });
  }, [branchFilter, employmentFilter, enrichedStaff, fullyBookedOnly, onDutyOnly, roleFilter, searchTerm, serviceFilter, shiftFilter]);

  useEffect(() => {
    if (filteredStaff.length === 0) {
      setSelectedStaffId('');
      return;
    }

    if (!filteredStaff.some((staff) => staff.id === selectedStaffId)) {
      setSelectedStaffId(filteredStaff[0].id);
    }
  }, [filteredStaff, selectedStaffId]);

  const selectedStaff = useMemo(() => filteredStaff.find((item) => item.id === selectedStaffId) || null, [filteredStaff, selectedStaffId]);

  const hasActiveFilters = Boolean(searchTerm) ||
    roleFilter !== 'All Roles' ||
    employmentFilter !== 'All Employment' ||
    shiftFilter !== 'All Shift Status' ||
    serviceFilter !== 'All Services' ||
    branchFilter !== 'All Branches' ||
    onDutyOnly ||
    fullyBookedOnly;

  const openStaffDrawer = useCallback((mode = 'create', targetStaff = null) => {
    if (!permissions.manageStaff) return;
    setStaffDrawer({
      open: true,
      mode,
      staff: targetStaff,
    });
  }, [permissions.manageStaff]);

  const closeStaffDrawer = useCallback(() => {
    setStaffDrawer((current) => ({
      ...current,
      open: false,
    }));
  }, []);

  const handleStaffSaved = useCallback((record, meta = {}) => {
    const normalized = normalizeStaff(record, 0);
    setStaffList((current) => {
      const filtered = current.filter((item) => item.id !== normalized.id);
      return [normalized, ...filtered];
    });
    setSelectedStaffId(normalized.id);
    setDetailTab('overview');
    setToast({
      tone: meta.duplicateWarning ? 'warning' : 'success',
      title: meta.mode === 'edit' ? 'Staff member updated successfully' : 'Staff member added successfully',
      message: meta.duplicateWarning || 'The staff profile was saved and synced to the CRM.',
    });
    void loadStaff();
  }, [loadStaff]);

  const syncCompatibleFields = (updates) => {
    const next = { ...updates };

    if (updates.employmentStatus) {
      next.status = updates.employmentStatus;
    }

    if (updates.shiftStatus) {
      next.availability = updates.shiftStatus;
      if (updates.shiftStatus === 'On Leave' && !updates.leaveStatus) {
        next.leaveStatus = 'On Leave';
      }
      if (updates.shiftStatus !== 'On Leave' && updates.leaveStatus === 'On Leave') {
        next.leaveStatus = 'None';
      }
    }

    if (updates.leaveStatus && updates.leaveStatus !== 'None' && !updates.shiftStatus) {
      next.shiftStatus = 'On Leave';
      next.availability = 'On Leave';
    }

    if (updates.leaveStatus === 'None' && !updates.shiftStatus) {
      next.shiftStatus = 'Available';
      next.availability = 'Available';
    }

    next.lastUpdated = toIsoDate();
    return next;
  };

  const updateStaff = (staffId, updates) => {
    const previousStaff = staffList.find((item) => item.id === staffId);
    const stamped = syncCompatibleFields(updates);
    setStaffList((current) => current.map((item) => (item.id === staffId ? { ...item, ...stamped } : item)));

    void crmUpdate('staff', staffId, stamped).catch((error) => {
      if (previousStaff) {
        setStaffList((current) => current.map((item) => (item.id === staffId ? previousStaff : item)));
      }
      setLoadError(error.message || 'Staff update failed.');
    });
  };

  const handleQuickCreateStaff = () => {
    openStaffDrawer('create');
  };

  const handleExportStaff = () => {
    const rows = [
      ['Staff ID', 'Name', 'Role', 'Services', 'Employment', 'Shift', 'Load', 'Next Appointment', 'Leave Status'],
      ...filteredStaff.map((staff) => [
        staff.id,
        staff.name,
        staff.role,
        staff.services.join(' / '),
        staff.employmentStatus,
        staff.shiftStatus,
        staff.load.detail,
        staff.nextAppointment ? `${staff.nextAppointment.time} - ${staff.nextAppointment.service}` : 'No upcoming appointment',
        staff.leaveStatus,
      ]),
    ];

    downloadCsv(`staff-operations-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleManageRoles = () => {
    if (!selectedStaff) return;
    openStaffDrawer('edit', selectedStaff);
  };

  const handleAssignServices = () => {
    if (!selectedStaff) return;
    openStaffDrawer('edit', selectedStaff);
  };

  const handleUpdateAvailability = () => {
    if (!selectedStaff) return;
    openStaffDrawer('edit', selectedStaff);
  };

  const handleViewSchedule = () => {
    if (!selectedStaff) return;
    setSelectedStaffId(selectedStaff.id);
    setDetailTab('schedule');
  };

  const handleViewTodayAppointments = () => {
    if (!selectedStaff) return;
    setSelectedStaffId(selectedStaff.id);
    setDetailTab('schedule');
  };

  const handleReassignAppointments = () => {
    if (!selectedStaff) return;
    setOperationTab('coverage');
  };

  const handleViewCoverageImpact = () => {
    if (!selectedStaff) return;
    setSelectedStaffId(selectedStaff.id);
    setDetailTab('services');
  };

  const handleEditProfile = () => {
    if (!selectedStaff) return;
    openStaffDrawer('edit', selectedStaff);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('All Roles');
    setEmploymentFilter('All Employment');
    setShiftFilter('All Shift Status');
    setServiceFilter('All Services');
    setBranchFilter('All Branches');
    setOnDutyOnly(false);
    setFullyBookedOnly(false);
  };

  const coverageRows = Object.values(coverageByService)
    .sort((a, b) => a.service.localeCompare(b.service))
    .slice(0, 8);

  const recentActivity = enrichedStaff
    .slice(0, 6)
    .map((member) => ({
      id: `${member.id}-activity`,
      title: `${member.name}: ${member.load.label}`,
      detail: member.nextAppointment
        ? `Next: ${member.nextAppointment.time} ${member.nextAppointment.service}`
        : 'No upcoming appointment scheduled.',
    }));

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  const handleRetryLoad = () => {
    void loadStaff();
  };

  return (
    <CrmShell shellClassName="crm-staff-shell">
      <main className="crm-staff-main">
        <header className="crm-staff-header">
          <div>
            <h1>Staff Management</h1>
            <p>Manage team shifts, service coverage, and booking readiness with operational clarity.</p>
          </div>

          <div className="crm-staff-header-actions">
            <input
              type="search"
              placeholder="Search staff by name, role, or service..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className={`crm-staff-chip${onDutyOnly ? ' crm-staff-chip-active' : ''}`} onClick={() => setOnDutyOnly((value) => !value)}>
              On Duty Today
            </button>
            {hasActiveFilters ? (
              <button type="button" className="crm-staff-ghost-btn" onClick={clearFilters}>Clear Filters</button>
            ) : null}
            <button type="button" className="crm-staff-ghost-btn" onClick={handleManageRoles} disabled={!permissions.manageStaff}>Manage Roles</button>
            <button type="button" className="crm-staff-ghost-btn" onClick={handleExportStaff}>Export</button>
            <button type="button" className="crm-staff-primary-btn" onClick={handleQuickCreateStaff} disabled={!permissions.manageStaff}>+ Add Staff</button>
            <button type="button" className="crm-staff-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {loadError ? (
          <section className="crm-staff-error" role="status" aria-live="polite">
            <div>
              <p>CRM sync issue</p>
              <h2>Live staff data unavailable</h2>
              <span>{loadError}. Retry sync once the CRM backend is reachable again.</span>
            </div>
            <button type="button" className="crm-staff-secondary-btn" onClick={handleRetryLoad}>
              Retry Sync
            </button>
          </section>
        ) : null}

        <section className="crm-staff-summary">
          {summaryCards.map((card) => (
            <article key={card.label}>
              <p>{card.label}</p>
              <h2>{String(card.value).padStart(2, '0')}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        <section className="crm-staff-filter-bar">
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {roleOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={employmentFilter} onChange={(event) => setEmploymentFilter(event.target.value)}>
            <option>All Employment</option>
            {EMPLOYMENT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}>
            <option>All Shift Status</option>
            {SHIFT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
            {serviceOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            {branchOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <button type="button" className={`crm-staff-chip${fullyBookedOnly ? ' crm-staff-chip-active' : ''}`} onClick={() => setFullyBookedOnly((value) => !value)}>
            Fully Booked
          </button>
        </section>

        <section className="crm-staff-content">
          <div className="crm-staff-primary-column">
            <article className="crm-staff-table-card">
                <header>
                  <p>Name &amp; Role</p>
                  <p>Services</p>
                  <p>Shift Hours</p>
                  <p>Next Appointment</p>
                  <p>Today&apos;s Load</p>
                  <p>Status</p>
                  <p>Action</p>
                </header>

              {isLoading ? (
                <div className="crm-staff-empty">
                  <h3>Loading staff</h3>
                  <p>Fetching the latest staff data from the CRM backend.</p>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="crm-staff-empty">
                  <h3>No staff match this filter</h3>
                  <p>Adjust the filters or add a new staff profile to restore coverage.</p>
                </div>
              ) : (
                <div className="crm-staff-table-body">
                  {filteredStaff.map((staff) => (
                    <StaffRow
                      key={staff.id}
                      staff={staff}
                      isSelected={selectedStaff?.id === staff.id}
                      onSelect={(id) => setSelectedStaffId(id)}
                      onOpen={(id) => {
                        setSelectedStaffId(id);
                        setDetailTab('overview');
                      }}
                    />
                  ))}
                </div>
              )}
            </article>

            <StaffOperationsWorkspace
              operationTab={operationTab}
              onTabChange={setOperationTab}
              coverageRows={coverageRows}
              recentActivity={recentActivity}
            />
          </div>

          <aside className="crm-staff-detail-card">
            <StaffDetailPanel
              staff={selectedStaff}
              detailTab={detailTab}
              onTabChange={setDetailTab}
              onUpdateStaff={updateStaff}
              onEditProfile={handleEditProfile}
              onAssignServices={handleAssignServices}
              onUpdateAvailability={handleUpdateAvailability}
              onViewSchedule={handleViewSchedule}
              onViewTodayAppointments={handleViewTodayAppointments}
              onReassignAppointments={handleReassignAppointments}
              onViewCoverageImpact={handleViewCoverageImpact}
              canManageStaff={permissions.manageStaff}
            />
          </aside>
        </section>
        <StaffMemberDrawer
          open={staffDrawer.open}
          mode={staffDrawer.mode}
          staff={staffDrawer.staff}
          branches={branchCatalog}
          services={serviceCatalog}
          existingStaff={staffList}
          onClose={closeStaffDrawer}
          onSaved={handleStaffSaved}
        />
        {toast ? (
          <div className={`crm-staff-toast crm-staff-toast-${toast.tone || 'success'}`} role="status" aria-live="polite">
            <p>{toast.title}</p>
            <span>{toast.message}</span>
          </div>
        ) : null}
      </main>
    </CrmShell>
  );
};

export default CrmStaff;
