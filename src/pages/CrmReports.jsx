import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleAlert,
  Download,
  Filter,
  LineChart,
  Printer,
  ReceiptText,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { crmList } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import './CrmReports.css';

const dateOptions = ['Today', 'This Week', 'This Month', 'Last 7 Days', 'Custom Range'];
const staffOptions = ['All Staff', 'Isabella', 'Elena', 'Marcus', 'Sofia'];
const serviceOptions = ['All Services', 'Radiance Facial', 'Deep Tissue Massage', 'Luxury Manicure', 'Haircut'];
const branchOptions = ['All Locations', 'West Hollywood', 'Beverly Hills', 'Downtown'];

const baseSalesTrend = [44, 48, 41, 58, 56, 74, 68, 82, 75, 94, 85, 108];
const baseAppointmentsTrend = [14, 18, 16, 22, 21, 25, 24, 28, 26, 31, 29, 35];
const basePaymentTrend = [12, 15, 11, 17, 16, 20, 18, 22, 20, 24, 23, 28];
const baseBookingTrend = [8, 10, 9, 13, 12, 16, 15, 19, 18, 21, 20, 24];

const baseStaffRows = [
  { name: 'Julianne M.', role: 'Senior Therapist', appointments: 42, revenue: 12400, utilization: 88 },
  { name: 'Marcus K.', role: 'Massage Specialist', appointments: 39, revenue: 10850, utilization: 82 },
  { name: 'Sarah L.', role: 'Senior Stylist', appointments: 31, revenue: 8900, utilization: 74 },
];

const baseServiceRows = [
  { label: 'Radiance Facial', bookings: 45, revenue: 9200 },
  { label: 'Deep Tissue Massage', bookings: 30, revenue: 8120 },
  { label: 'Luxury Manicure', bookings: 25, revenue: 7130 },
  { label: 'Haircut', bookings: 22, revenue: 4620 },
  { label: 'Retail Add-ons', bookings: 18, revenue: 3100 },
];

const reportServiceAssignments = [
  { staffName: 'Julianne M.', branchName: 'West Hollywood' },
  { staffName: 'Marcus K.', branchName: 'Beverly Hills' },
  { staffName: 'Sarah L.', branchName: 'Downtown' },
  { staffName: 'Marcus K.', branchName: 'West Hollywood' },
  { staffName: 'Julianne M.', branchName: 'Beverly Hills' },
];

const baseCustomerRows = [
  { label: 'New Customers', value: 32, tone: 'good' },
  { label: 'Repeat Customers', value: 68, tone: 'gold' },
  { label: 'Inactive Customers', value: 9, tone: 'alert' },
  { label: 'Upcoming Bookings', value: 24, tone: 'neutral' },
  { label: 'Top Spenders', value: '$4,820', tone: 'gold' },
];

const basePaymentBreakdown = [
  { label: 'Paid', value: 78, color: '#a67d2f' },
  { label: 'Partial', value: 14, color: '#d0b47a' },
  { label: 'Pending', value: 8, color: '#e9dfcb' },
];

const baseUpcomingBookings = [
  { name: 'Eleanor Hebert', time: '10:30 AM', service: 'Radiance Facial' },
  { name: 'Julian Waters', time: '11:45 AM', service: 'Deep Tissue Massage' },
  { name: 'Sienna Miller', time: '1:00 PM', service: 'Luxury Manicure' },
];

const baseInsights = [
  'Saturday produced the highest sales total this week.',
  'Julianne M. is leading both utilization and revenue output.',
  'Radiance Facial remains the most booked treatment.',
  '8 unpaid balances need same-day attention.',
  'Repeat customer rate is holding at 68% this period.',
];

const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatPercent = (value) => `${Number(value || 0).toFixed(0)}%`;
const formatCount = (value) => Number(value || 0).toLocaleString();
const normalizeText = (value) => String(value || '').toLowerCase();

const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === 'object') {
    return parseNumber(value.value ?? value.amount ?? value.total ?? value.count ?? value.displayValue ?? 0);
  }
  return 0;
};

const findLiveItem = (rows, needles) =>
  rows.find((row) => {
    const label = normalizeText(row.label || row.metric || row.name || row.title);
    return needles.some((needle) => label.includes(needle));
  });

const extractLiveValue = (rows, needles) => {
  const item = findLiveItem(rows, needles);
  if (!item) return null;

  const raw = item.value ?? item.amount ?? item.total ?? item.count ?? item.displayValue ?? item.metricValue;
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return raw;
  return parseNumber(raw);
};

const scaleSeries = (series, factor) => series.map((value) => Math.max(0, Math.round(value * factor)));

const decorateServiceRows = (rows) =>
  rows.map((row, index) => ({
    ...row,
    ...reportServiceAssignments[index % reportServiceAssignments.length],
  }));

const buildPreset = (factor, overrides = {}) => ({
  totalSales: Math.round(5250 * factor),
  appointments: Math.round(120 * factor),
  completed: Math.round(105 * factor),
  cancelled: Math.max(1, Math.round(7 * factor)),
  pendingPayments: Math.max(1, Math.round(8 * factor)),
  cashCollected: Math.round(4160 * factor),
  avgBillValue: Math.round(92 * (0.92 + factor * 0.08)),
  repeatCustomers: Math.min(92, Math.round(68 * (0.88 + factor * 0.12))),
  newCustomers: Math.max(6, Math.round(18 * factor + 4)),
  inactiveCustomers: Math.max(2, Math.round(9 * factor + 1)),
  receipts: Math.max(12, Math.round(78 * factor)),
  overduePayments: Math.round(1240 * factor),
  partialPayments: Math.max(1, Math.round(4 * factor)),
  serviceCount: 12,
  topService: 'Radiance Facial',
  completionRate: 88,
  highestSalesDay: 'Saturday',
  highestSalesTotal: Math.round(1480 * factor + 640),
  topStaffMember: 'Julianne M.',
  salesTrend: scaleSeries(baseSalesTrend, factor),
  appointmentsTrend: scaleSeries(baseAppointmentsTrend, factor),
  bookingTrend: scaleSeries(baseBookingTrend, factor),
  paymentTrend: scaleSeries(basePaymentTrend, factor),
  staffRows: baseStaffRows.map((row, index) => ({
    ...row,
    appointments: Math.max(1, Math.round(row.appointments * factor)),
    revenue: Math.max(500, Math.round(row.revenue * factor)),
    utilization: Math.min(96, Math.max(42, Math.round(row.utilization * (0.9 + factor * 0.12)) + index)),
  })),
  serviceRows: baseServiceRows.map((row) => ({
    ...row,
    bookings: Math.max(1, Math.round(row.bookings * factor)),
    revenue: Math.max(300, Math.round(row.revenue * factor)),
  })),
  customerRows: baseCustomerRows,
  paymentBreakdown: basePaymentBreakdown,
  upcomingBookings: baseUpcomingBookings,
  insights: baseInsights,
  ...overrides,
});

const REPORT_PRESETS = {
  Today: buildPreset(0.28, {
    topService: 'Deep Tissue Massage',
    topStaffMember: 'Marcus K.',
    highestSalesDay: 'Today',
    highestSalesTotal: 780,
    completionRate: 91,
  }),
  'This Week': buildPreset(0.72, {
    topService: 'Radiance Facial',
    topStaffMember: 'Julianne M.',
    highestSalesDay: 'Saturday',
    highestSalesTotal: 1320,
  }),
  'This Month': buildPreset(1, {
    topService: 'Radiance Facial',
    topStaffMember: 'Julianne M.',
    highestSalesDay: 'Friday',
    highestSalesTotal: 1480,
  }),
  'Last 7 Days': buildPreset(0.62, {
    topService: 'Luxury Manicure',
    topStaffMember: 'Sarah L.',
    highestSalesDay: 'Thursday',
    highestSalesTotal: 1220,
  }),
  'Custom Range': buildPreset(0.9, {
    topService: 'Deep Tissue Massage',
    topStaffMember: 'Marcus K.',
    highestSalesDay: 'Saturday',
    highestSalesTotal: 1410,
  }),
};

const DonutChart = ({
  segments,
  totalLabel,
  centerLabel,
  centerValue,
  activeSegmentLabel,
  onSegmentMove,
  onSegmentLeave,
  onSegmentClick,
}) => {
  const size = 162;
  const strokeWidth = 24;
  const segmentGap = 3.6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const resolvePointer = (event) => {
    const svgBounds = event.currentTarget?.ownerSVGElement?.getBoundingClientRect?.();
    const bounds = svgBounds || event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };
  const segmentMeta = segments.map((segment, index) => {
    const fullShare = (segment.value / 100) * circumference;
    const dash = Math.max(0, fullShare - segmentGap);
    const offset = segments
      .slice(0, index)
      .reduce((sum, previous) => sum + (previous.value / 100) * circumference, 0);
    return { segment, dash, offset };
  });

  return (
    <div className="crm-reports-donut-wrap">
      <svg className="crm-reports-donut" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={totalLabel}>
        <circle className="crm-reports-donut-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        {segmentMeta.map(({ segment, dash, offset }) => (
          <circle
            key={segment.label}
            className={`crm-reports-donut-segment${activeSegmentLabel === segment.label ? ' is-active' : ''}`}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            onMouseMove={(event) => onSegmentMove?.(segment.label, resolvePointer(event))}
            onMouseEnter={(event) => onSegmentMove?.(segment.label, resolvePointer(event))}
            onMouseLeave={() => onSegmentLeave?.()}
            onClick={(event) => {
              event.stopPropagation();
              onSegmentClick?.(segment.label, resolvePointer(event));
            }}
          />
        ))}
      </svg>
      <div className="crm-reports-donut-center">
        <span>{centerLabel || 'Mix'}</span>
        <strong>{centerValue || `${segments[0]?.value ?? 0}%`}</strong>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="crm-reports-skeleton-grid" aria-hidden="true">
    <div className="crm-reports-skeleton-panel" />
  </div>
);

const CrmReports = () => {
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [staffFilter, setStaffFilter] = useState('All Staff');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [branchFilter, setBranchFilter] = useState('All Locations');
  const [liveRows, setLiveRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeSegmentLabel, setActiveSegmentLabel] = useState('');
  const [hoveredSegmentLabel, setHoveredSegmentLabel] = useState('');
  const [chartTooltip, setChartTooltip] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('reports');
        if (!mounted) return;
        setLiveRows(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!mounted) return;
        setLoadError(error.message || 'Unable to load reports from the CRM API.');
        setLiveRows([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadReports();

    return () => {
      mounted = false;
    };
  }, []);

  const preset = REPORT_PRESETS[selectedRange] || REPORT_PRESETS['This Month'];
  const hasLiveData = liveRows.length > 0;
  const noDataState = !isLoading && !hasLiveData;
  const dataSourceLabel = hasLiveData ? 'Live CRM Data Synced' : loadError ? 'Live CRM Data Unavailable' : 'Sample Analytics View';
  const filterIsActive = staffFilter !== 'All Staff' || serviceFilter !== 'All Services' || branchFilter !== 'All Locations';

  const liveSales = extractLiveValue(liveRows, ['sales', 'revenue', 'gross revenue', 'total sales']);
  const liveAppointments = extractLiveValue(liveRows, ['appointments', 'bookings', 'sessions']);
  const liveCompleted = extractLiveValue(liveRows, ['completed']);
  const livePending = extractLiveValue(liveRows, ['pending payments', 'pending', 'unpaid']);
  const liveTopService = extractLiveValue(liveRows, ['top service', 'service']);
  const liveRepeat = extractLiveValue(liveRows, ['repeat', 'returning customers']);

  const decoratedServiceRows = useMemo(() => decorateServiceRows(preset.serviceRows), [preset.serviceRows]);
  const filteredServiceRows = useMemo(() => {
    return decoratedServiceRows.filter((row) => {
      const matchesStaff = staffFilter === 'All Staff' || row.staffName === staffFilter;
      const matchesService = serviceFilter === 'All Services' || row.label === serviceFilter;
      const matchesBranch = branchFilter === 'All Locations' || row.branchName === branchFilter;
      return matchesStaff && matchesService && matchesBranch;
    });
  }, [branchFilter, decoratedServiceRows, serviceFilter, staffFilter]);

  const visibleServiceRows = useMemo(
    () => [...filteredServiceRows].sort((left, right) => right.revenue - left.revenue),
    [filteredServiceRows]
  );
  const baseServiceRevenue = decoratedServiceRows.reduce((sum, row) => sum + row.revenue, 0) || 1;
  const visibleServiceRevenue = visibleServiceRows.reduce((sum, row) => sum + row.revenue, 0);
  const visibleServiceBookings = visibleServiceRows.reduce((sum, row) => sum + row.bookings, 0);
  const visibilityRatio = filterIsActive ? visibleServiceRevenue / baseServiceRevenue : 1;
  const filteredTopStaff = visibleServiceRows.reduce((top, row) => {
    if (!row.staffName) return top;
    if (!top || row.revenue > top.revenue) {
      return row;
    }
    return top;
  }, null);

  const metrics = {
    totalSales: filterIsActive
      ? Math.round(preset.totalSales * visibilityRatio)
      : (typeof liveSales === 'number' ? liveSales : preset.totalSales),
    appointments: filterIsActive
      ? Math.round(preset.appointments * visibilityRatio)
      : (typeof liveAppointments === 'number' ? liveAppointments : preset.appointments),
    completed: filterIsActive
      ? Math.round(preset.completed * visibilityRatio)
      : (typeof liveCompleted === 'number' ? liveCompleted : preset.completed),
    pendingPayments: filterIsActive
      ? Math.round(preset.pendingPayments * visibilityRatio)
      : (typeof livePending === 'number' ? livePending : preset.pendingPayments),
    topService: visibleServiceRows[0]?.label || (typeof liveTopService === 'string' ? liveTopService : preset.topService),
    repeatCustomers: filterIsActive
      ? Math.max(0, Math.round(preset.repeatCustomers * (0.7 + visibilityRatio * 0.3)))
      : (typeof liveRepeat === 'number' ? liveRepeat : preset.repeatCustomers),
    cashCollected: filterIsActive ? Math.round(preset.cashCollected * visibilityRatio) : preset.cashCollected,
    avgBillValue: visibleServiceBookings > 0 ? Math.round(visibleServiceRevenue / visibleServiceBookings) : preset.avgBillValue,
    cancelled: filterIsActive ? Math.max(1, Math.round(preset.cancelled * visibilityRatio)) : preset.cancelled,
    newCustomers: filterIsActive ? Math.max(1, Math.round(preset.newCustomers * (0.6 + visibilityRatio * 0.4))) : preset.newCustomers,
    inactiveCustomers: filterIsActive ? Math.max(1, Math.round(preset.inactiveCustomers * (0.7 + visibilityRatio * 0.3))) : preset.inactiveCustomers,
    overduePayments: filterIsActive ? Math.round(preset.overduePayments * visibilityRatio) : preset.overduePayments,
    partialPayments: filterIsActive ? Math.max(1, Math.round(preset.partialPayments * visibilityRatio)) : preset.partialPayments,
    receipts: filterIsActive ? Math.max(1, Math.round(preset.receipts * visibilityRatio)) : preset.receipts,
    completionRate: visibleServiceRows.length > 0
      ? Math.min(99, Math.max(45, Math.round(preset.completionRate * (0.85 + visibilityRatio * 0.15))))
      : preset.completionRate,
    serviceCount: visibleServiceRows.length || preset.serviceCount,
    highestSalesDay: filterIsActive ? 'Filtered selection' : preset.highestSalesDay,
    highestSalesTotal: filterIsActive ? Math.max(0, Math.round(preset.highestSalesTotal * visibilityRatio)) : preset.highestSalesTotal,
    topStaffMember: filterIsActive
      ? (staffFilter !== 'All Staff' ? staffFilter : filteredTopStaff?.staffName || preset.topStaffMember)
      : preset.topStaffMember,
  };

  const summaryCards = [
    { label: 'Total Sales', value: formatMoney(metrics.totalSales), trend: '+10% vs last week', icon: BarChart3, tone: 'good' },
    { label: 'Total Appointments', value: formatCount(metrics.appointments), trend: '+5% vs last month', icon: CalendarDays, tone: 'neutral' },
    { label: 'Completed', value: formatCount(metrics.completed), trend: `${metrics.completionRate}% completion rate`, icon: Sparkles, tone: 'gold' },
    { label: 'Pending Payments', value: formatCount(metrics.pendingPayments), trend: `${formatMoney(metrics.overduePayments)} overdue`, icon: Wallet, tone: 'alert' },
    {
      label: 'Top Service',
      value: metrics.topService,
      trend: 'Consistent leader',
      icon: ReceiptText,
      tone: 'neutral',
      valueClass: 'crm-reports-kpi-card-text',
    },
    { label: 'Repeat Customers', value: formatPercent(metrics.repeatCustomers), trend: '+2% from last quarter', icon: Users, tone: 'good' },
  ];

  const serviceMixSegments = useMemo(() => {
    const totalRevenue = visibleServiceRows.reduce((sum, row) => sum + row.revenue, 0) || 1;
    const colors = ['#b08a34', '#59b4dc', '#35b878', '#e18455', '#3e3a37', '#7a64d4'];
    const draft = visibleServiceRows.map((row, index) => ({
      label: row.label,
      value: Math.max(1, Math.round((row.revenue / totalRevenue) * 100)),
      color: colors[index % colors.length],
    }));
    const totalPercent = draft.reduce((sum, segment) => sum + segment.value, 0);
    if (draft.length > 0 && totalPercent !== 100) {
      draft[draft.length - 1].value = Math.max(1, draft[draft.length - 1].value + (100 - totalPercent));
    }
    return draft;
  }, [visibleServiceRows]);

  const totalServiceRevenue = useMemo(
    () => visibleServiceRows.reduce((sum, row) => sum + row.revenue, 0),
    [visibleServiceRows]
  );

  const totalServiceBookings = useMemo(
    () => visibleServiceRows.reduce((sum, row) => sum + row.bookings, 0),
    [visibleServiceRows]
  );

  const topServiceRow = visibleServiceRows[0] || null;
  const dominantServiceSegment = serviceMixSegments.reduce(
    (best, current) => (current.value > (best?.value ?? -1) ? current : best),
    null
  );
  const segmentInsights = useMemo(() => {
    const map = new Map(visibleServiceRows.map((row) => [row.label, row]));
    return serviceMixSegments.map((segment) => {
      const row = map.get(segment.label);
      return {
        ...segment,
        revenue: row?.revenue || 0,
        bookings: row?.bookings || 0,
        staffName: row?.staffName || 'Unassigned',
      };
    });
  }, [serviceMixSegments, visibleServiceRows]);
  const selectedSegmentInsight = segmentInsights.find((segment) => segment.label === activeSegmentLabel)
    || segmentInsights.find((segment) => segment.label === hoveredSegmentLabel)
    || segmentInsights[0]
    || null;
  const tooltipSegmentInsight = segmentInsights.find((segment) => segment.label === chartTooltip?.label) || null;

  useEffect(() => {
    if (!segmentInsights.some((segment) => segment.label === activeSegmentLabel)) {
      setActiveSegmentLabel('');
      if (!hoveredSegmentLabel) {
        setChartTooltip(null);
      }
    }
  }, [activeSegmentLabel, hoveredSegmentLabel, segmentInsights]);

  const handleSegmentMove = (label, pointer) => {
    setHoveredSegmentLabel(label);
    if (chartTooltip?.pinned) return;
    setChartTooltip({ label, pointer, pinned: false });
  };

  const handleSegmentLeave = () => {
    setHoveredSegmentLabel('');
    if (!chartTooltip?.pinned) {
      setChartTooltip(null);
    }
  };

  const handleSegmentClick = (label, pointer) => {
    if (activeSegmentLabel === label) {
      setActiveSegmentLabel('');
      setChartTooltip(null);
      return;
    }
    setActiveSegmentLabel(label);
    setChartTooltip({ label, pointer, pinned: true });
  };

  const handleExportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Date Range', selectedRange],
      ['Total Sales', metrics.totalSales],
      ['Appointments', metrics.appointments],
      ['Completed', metrics.completed],
      ['Pending Payments', metrics.pendingPayments],
      ['Top Service', metrics.topService],
      ['Repeat Customers', metrics.repeatCustomers],
      ['Cash Collected', metrics.cashCollected],
      ['Average Bill Value', metrics.avgBillValue],
      ['Receipts', metrics.receipts],
      ['Overdue Payments', metrics.overduePayments],
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reports-business-insights-${selectedRange.toLowerCase().replaceAll(' ', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <CrmShell
      shellClassName="crm-reports-shell"
    >
      <main className="crm-reports-main">
        <header className="crm-reports-header">
          <div className="crm-reports-title-block">
            <p className="crm-reports-kicker">Executive Intelligence</p>
            <h1>Reports / Business Insights</h1>
            <p className="crm-reports-helper">
              A premium operational view of sales, bookings, staff productivity, payment flow, and customer activity.
            </p>
          </div>

          <div className="crm-reports-header-actions">
            <div className="crm-reports-filters">
              <label className="crm-reports-select">
                <span>Date Range</span>
                <select value={selectedRange} onChange={(event) => setSelectedRange(event.target.value)}>
                  {dateOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="crm-reports-select">
                <span>Staff</span>
                <select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}>
                  {staffOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="crm-reports-select">
                <span>Service</span>
                <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
                  {serviceOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="crm-reports-select">
                <span>Branch</span>
                <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                  {branchOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="crm-reports-action-row">
              <button type="button" className="crm-reports-action-btn" onClick={handlePrint}>
                <Printer size={15} />
                <span>Print Summary</span>
              </button>
              <button type="button" className="crm-reports-export-btn" onClick={handleExportCsv}>
                <Download size={15} />
                <span>Export Report</span>
              </button>
              <button
                type="button"
                className="crm-reports-action-btn"
                onClick={() => {
                  setSelectedRange('This Month');
                  setStaffFilter('All Staff');
                  setServiceFilter('All Services');
                  setBranchFilter('All Locations');
                }}
              >
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </header>

        <div className={`crm-reports-status-strip${noDataState ? ' crm-reports-status-strip-muted' : ''}`}>
          <span className="crm-reports-status-chip">
            <Filter size={14} />
            {selectedRange}
          </span>
          <span className="crm-reports-status-chip">
            <Users size={14} />
            {staffFilter}
          </span>
          <span className="crm-reports-status-chip">
            <ReceiptText size={14} />
            {serviceFilter}
          </span>
          <span className="crm-reports-status-chip">
            <Building2 size={14} />
            {branchFilter}
          </span>
          <span className="crm-reports-status-chip">
            <LineChart size={14} />
            {dataSourceLabel} | Pie View
          </span>
          {noDataState ? (
            <span className="crm-reports-status-chip crm-reports-status-chip-warning">
              <CircleAlert size={14} />
              Low-data state
            </span>
          ) : null}
        </div>
        {loadError ? <p className="crm-reports-inline-error">{loadError}</p> : null}

        <section className="crm-reports-kpi-grid">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <article key={index} className="crm-reports-kpi-card crm-reports-kpi-card-skeleton">
                  <div className="crm-reports-skeleton-chip" />
                  <div className="crm-reports-skeleton-line" />
                  <div className="crm-reports-skeleton-subline" />
                </article>
              ))
            : summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.label}
                    className={`crm-reports-kpi-card crm-reports-kpi-card-${card.tone}${card.valueClass ? ` ${card.valueClass}` : ''}`}
                  >
                    <div className="crm-reports-kpi-top">
                      <span className="crm-reports-kpi-label">{card.label}</span>
                      <Icon size={16} />
                    </div>
                    <div className="crm-reports-kpi-value">{card.value}</div>
                    <div className="crm-reports-kpi-trend">{card.trend}</div>
                  </article>
                );
              })}
        </section>

        <section className="crm-reports-workspace">
          <div className="crm-reports-main-column">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <article className="crm-reports-panel crm-reports-panel-service-modern">
                <div className="crm-reports-panel-head">
                  <div>
                    <p className="crm-reports-panel-kicker">Service Intelligence</p>
                    <h2>Revenue mix and booking share by treatment</h2>
                  </div>
                  <div className="crm-reports-panel-metrics crm-reports-panel-metrics-modern">
                    <span>
                      <strong>{formatMoney(totalServiceRevenue)}</strong>
                      Service Revenue
                    </span>
                    <span>
                      <strong>{formatCount(totalServiceBookings)}</strong>
                      Total Bookings
                    </span>
                    <span>
                      <strong>{topServiceRow?.label || 'N/A'}</strong>
                      Top Service
                    </span>
                  </div>
                </div>

                {visibleServiceRows.length === 0 ? (
                  <div className="crm-reports-empty-card">
                    <CircleAlert size={18} />
                    <h3>No matching report rows</h3>
                    <p>Try clearing the staff, branch, or service filters to restore the analytics view.</p>
                  </div>
                ) : (
                  <div className="crm-reports-service-layout crm-reports-service-layout-modern">
                    <div className="crm-reports-service-chart-zone">
                      <div className="crm-reports-donut-frame">
                        <DonutChart
                          segments={serviceMixSegments}
                          totalLabel="Service category mix"
                          centerLabel={selectedSegmentInsight?.label || dominantServiceSegment?.label || 'Service Mix'}
                          centerValue={formatPercent(selectedSegmentInsight?.value || dominantServiceSegment?.value || 0)}
                          activeSegmentLabel={activeSegmentLabel || hoveredSegmentLabel}
                          onSegmentMove={handleSegmentMove}
                          onSegmentLeave={handleSegmentLeave}
                          onSegmentClick={handleSegmentClick}
                        />
                        {chartTooltip?.label ? (
                          <div
                            className={`crm-reports-chart-tooltip${chartTooltip.pinned ? ' is-pinned' : ''}`}
                            style={{
                              left: `${Math.min(150, Math.max(16, chartTooltip.pointer?.x || 0))}px`,
                              top: `${Math.min(148, Math.max(20, chartTooltip.pointer?.y || 0))}px`,
                            }}
                          >
                            <strong>{chartTooltip.label}</strong>
                            <span>
                              {tooltipSegmentInsight
                                ? `${formatPercent(tooltipSegmentInsight.value)} share | ${formatMoney(tooltipSegmentInsight.revenue)} | ${formatCount(tooltipSegmentInsight.bookings)} bookings`
                                : 'Segment detail'}
                            </span>
                            <small>{chartTooltip.pinned ? 'Pinned. Click same slice to clear.' : 'Click to pin details.'}</small>
                          </div>
                        ) : null}
                        <ul className="crm-reports-chart-legend crm-reports-chart-legend-modern">
                          {serviceMixSegments.map((segment) => (
                            <li
                              key={segment.label}
                              className={selectedSegmentInsight?.label === segment.label ? 'is-active' : ''}
                            >
                              <i className="crm-reports-dot" style={{ background: segment.color }} />
                              <span>{segment.label}</span>
                              <small>{segment.value}%</small>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="crm-reports-donut-meta">
                        <span>{selectedSegmentInsight ? 'Selected Segment' : 'Total Revenue'}</span>
                        <strong>
                          {selectedSegmentInsight ? selectedSegmentInsight.label : formatMoney(totalServiceRevenue)}
                        </strong>
                        <small>
                          {selectedSegmentInsight
                            ? `${formatMoney(selectedSegmentInsight.revenue)} | ${formatCount(selectedSegmentInsight.bookings)} bookings | ${formatPercent(selectedSegmentInsight.value)} share`
                            : `${formatCount(totalServiceBookings)} bookings`}
                        </small>
                      </div>
                    </div>

                    <div className="crm-reports-service-breakdown">
                      {visibleServiceRows.map((row, index) => (
                        <div key={`${row.label}-${row.staffName}-${row.branchName}`} className="crm-reports-service-row">
                          <div className="crm-reports-service-row-copy">
                            <strong>{row.label}</strong>
                            <span>
                              {formatCount(row.bookings)} bookings | {row.staffName}
                            </span>
                          </div>
                          <div className="crm-reports-service-row-metrics">
                            <p>{formatMoney(row.revenue)}</p>
                            <small>{formatPercent(serviceMixSegments[index]?.value || 0)} share</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            )}
          </div>

        </section>
      </main>
    </CrmShell>
  );
};

export default CrmReports;
