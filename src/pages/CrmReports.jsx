import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
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
const reportTabs = ['Overview', 'Sales', 'Appointments', 'Staff', 'Customers', 'Payments'];
const staffOptions = ['All Staff', 'Isabella', 'Elena', 'Marcus', 'Sofia'];
const serviceOptions = ['All Services', 'Radiance Facial', 'Deep Tissue Massage', 'Luxury Manicure', 'Haircut'];
const branchOptions = ['All Locations', 'West Hollywood', 'Beverly Hills', 'Downtown'];

const baseSalesTrend = [44, 48, 41, 58, 56, 74, 68, 82, 75, 94, 85, 108];
const baseAppointmentsTrend = [14, 18, 16, 22, 21, 25, 24, 28, 26, 31, 29, 35];
const basePaymentTrend = [12, 15, 11, 17, 16, 20, 18, 22, 20, 24, 23, 28];
const baseBookingTrend = [8, 10, 9, 13, 12, 16, 15, 19, 18, 21, 20, 24];

const baseStaffRows = [
  { name: 'Julianne M.', role: 'Lead Therapist', appointments: 42, revenue: 12400, utilization: 88 },
  { name: 'Marcus K.', role: 'Massage Specialist', appointments: 39, revenue: 10850, utilization: 82 },
  { name: 'Sarah L.', role: 'Senior Stylist', appointments: 31, revenue: 8900, utilization: 74 },
];

const baseServiceRows = [
  { label: 'Radiance Facial', bookings: 45, revenue: 9200 },
  { label: 'Deep Tissue Massage', bookings: 30, revenue: 8120 },
  { label: 'Luxury Manicure', bookings: 25, revenue: 7130 },
  { label: 'Retail Add-ons', bookings: 18, revenue: 3100 },
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
  '8 unpaid balances need same-day follow-up.',
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

const visibleSections = {
  Overview: ['sales', 'appointments', 'staff', 'services', 'customers', 'payments'],
  Sales: ['sales', 'services', 'payments'],
  Appointments: ['appointments', 'customers'],
  Staff: ['staff', 'appointments'],
  Customers: ['customers', 'staff'],
  Payments: ['payments', 'sales'],
};

const MiniLineChart = ({ values, label }) => {
  const width = 320;
  const height = 180;
  const padding = 18;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const points = values.map((value, index) => {
    const x = padding + (usableWidth * index) / Math.max(values.length - 1, 1);
    const y = height - padding - ((value - min) / range) * usableHeight;
    return { x, y, value };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg className="crm-reports-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {[40, 80, 120].map((gridY) => (
        <line key={gridY} x1={padding} x2={width - padding} y1={gridY} y2={gridY} className="crm-reports-chart-grid" />
      ))}
      <path d={areaPath} className="crm-reports-chart-area" />
      <path d={linePath} className="crm-reports-chart-line" />
      {points.map((point, index) => (
        <circle key={`${point.value}-${index}`} cx={point.x} cy={point.y} r="4.2" className="crm-reports-chart-dot" />
      ))}
    </svg>
  );
};

const MiniBarChart = ({ values, label }) => {
  const width = 320;
  const height = 180;
  const padding = 18;
  const usableHeight = height - padding * 2;
  const barWidth = (width - padding * 2) / Math.max(values.length, 1) - 8;
  const max = Math.max(...values, 1);

  return (
    <svg className="crm-reports-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {[40, 80, 120].map((gridY) => (
        <line key={gridY} x1={padding} x2={width - padding} y1={gridY} y2={gridY} className="crm-reports-chart-grid" />
      ))}
      {values.map((value, index) => {
        const barHeight = Math.max(18, (value / max) * usableHeight);
        const x = padding + index * (barWidth + 8);
        const y = height - padding - barHeight;

        return <rect key={`${label}-${index}`} x={x} y={y} width={barWidth} height={barHeight} rx="10" className="crm-reports-bar" />;
      })}
    </svg>
  );
};

const DonutChart = ({ segments, totalLabel }) => {
  const size = 140;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="crm-reports-donut-wrap">
      <svg className="crm-reports-donut" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={totalLabel}>
        <circle className="crm-reports-donut-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        {segments.map((segment) => {
          const dash = (segment.value / 100) * circumference;
          const circle = (
            <circle
              key={segment.label}
              className="crm-reports-donut-segment"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="crm-reports-donut-center">
        <span>{segments[0]?.label || 'Mix'}</span>
        <strong>{segments[0]?.value ?? 0}%</strong>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="crm-reports-skeleton-grid" aria-hidden="true">
    <div className="crm-reports-skeleton-line-lg" />
    <div className="crm-reports-skeleton-card" />
    <div className="crm-reports-skeleton-card" />
    <div className="crm-reports-skeleton-card" />
    <div className="crm-reports-skeleton-panel" />
    <div className="crm-reports-skeleton-panel" />
  </div>
);

const CrmReports = () => {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [selectedTab, setSelectedTab] = useState('Overview');
  const [staffFilter, setStaffFilter] = useState('All Staff');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [branchFilter, setBranchFilter] = useState('All Locations');
  const [liveRows, setLiveRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('reports').catch(() => []);
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
  const dataSourceLabel = hasLiveData ? 'Live CRM data synced' : 'Sample analytics view';

  const liveSales = extractLiveValue(liveRows, ['sales', 'revenue', 'gross revenue', 'total sales']);
  const liveAppointments = extractLiveValue(liveRows, ['appointments', 'bookings', 'sessions']);
  const liveCompleted = extractLiveValue(liveRows, ['completed']);
  const livePending = extractLiveValue(liveRows, ['pending payments', 'pending', 'unpaid']);
  const liveTopService = extractLiveValue(liveRows, ['top service', 'service']);
  const liveRepeat = extractLiveValue(liveRows, ['repeat', 'returning customers']);

  const metrics = {
    totalSales: typeof liveSales === 'number' ? liveSales : preset.totalSales,
    appointments: typeof liveAppointments === 'number' ? liveAppointments : preset.appointments,
    completed: typeof liveCompleted === 'number' ? liveCompleted : preset.completed,
    pendingPayments: typeof livePending === 'number' ? livePending : preset.pendingPayments,
    topService: typeof liveTopService === 'string' ? liveTopService : preset.topService,
    repeatCustomers: typeof liveRepeat === 'number' ? liveRepeat : preset.repeatCustomers,
    cashCollected: preset.cashCollected,
    avgBillValue: preset.avgBillValue,
    cancelled: preset.cancelled,
    newCustomers: preset.newCustomers,
    inactiveCustomers: preset.inactiveCustomers,
    overduePayments: preset.overduePayments,
    partialPayments: preset.partialPayments,
    receipts: preset.receipts,
    completionRate: preset.completionRate,
    serviceCount: preset.serviceCount,
    highestSalesDay: preset.highestSalesDay,
    highestSalesTotal: preset.highestSalesTotal,
    topStaffMember: preset.topStaffMember,
  };

  const summaryCards = [
    { label: 'Total Sales', value: formatMoney(metrics.totalSales), trend: '+10% vs last week', icon: BarChart3, tone: 'good' },
    { label: 'Total Appointments', value: formatCount(metrics.appointments), trend: '+5% vs last month', icon: CalendarDays, tone: 'neutral' },
    { label: 'Completed', value: formatCount(metrics.completed), trend: `${metrics.completionRate}% completion rate`, icon: Sparkles, tone: 'gold' },
    { label: 'Pending Payments', value: formatCount(metrics.pendingPayments), trend: `${formatMoney(metrics.overduePayments)} overdue`, icon: Wallet, tone: 'alert' },
    { label: 'Top Service', value: metrics.topService, trend: 'Consistent leader', icon: ReceiptText, tone: 'neutral' },
    { label: 'Repeat Customers', value: formatPercent(metrics.repeatCustomers), trend: '+2% from last quarter', icon: Users, tone: 'good' },
  ];

  const visibleKeys = visibleSections[selectedTab] || visibleSections.Overview;

  const filteredStaffRows = useMemo(() => {
    if (staffFilter === 'All Staff') return preset.staffRows;
    return preset.staffRows.filter((row) => row.name.includes(staffFilter));
  }, [preset.staffRows, staffFilter]);

  const filteredServiceRows = useMemo(() => {
    if (serviceFilter === 'All Services') return preset.serviceRows;
    return preset.serviceRows.filter((row) => row.label === serviceFilter);
  }, [preset.serviceRows, serviceFilter]);

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

  const activeServiceMix = [
    { label: 'Facials', value: 45, color: '#a88230' },
    { label: 'Massage', value: 30, color: '#d2b782' },
    { label: 'Retail', value: 25, color: '#eadfc8' },
  ];

  const selectedStaffRow = filteredStaffRows[0] || preset.staffRows[0];

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
                <span>Report Type</span>
                <select value={selectedTab} onChange={(event) => setSelectedTab(event.target.value)}>
                  {reportTabs.map((option) => (
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
            </div>
          </div>
        </header>

        <div className={`crm-reports-status-strip${noDataState ? ' crm-reports-status-strip-muted' : ''}`}>
          <span className="crm-reports-status-chip">
            <Filter size={14} />
            {selectedRange}
          </span>
          <span className="crm-reports-status-chip">
            <Building2 size={14} />
            {branchFilter}
          </span>
          <span className="crm-reports-status-chip">
            <LineChart size={14} />
            {dataSourceLabel}
          </span>
          {noDataState ? (
            <span className="crm-reports-status-chip crm-reports-status-chip-warning">
              <CircleAlert size={14} />
              Low-data state
            </span>
          ) : null}
        </div>

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
                  <article key={card.label} className={`crm-reports-kpi-card crm-reports-kpi-card-${card.tone}`}>
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
              <>
                {visibleKeys.includes('sales') ? (
                  <article className="crm-reports-panel crm-reports-panel-wide">
                    <div className="crm-reports-panel-head">
                      <div>
                        <p className="crm-reports-panel-kicker">Revenue / Sales Trend</p>
                        <h2>Sales performance across the selected period</h2>
                      </div>
                      <div className="crm-reports-panel-metrics">
                        <span>
                          <strong>{formatMoney(metrics.totalSales)}</strong>
                          Total Revenue
                        </span>
                        <span>
                          <strong>{formatMoney(metrics.cashCollected)}</strong>
                          Cash Collected
                        </span>
                        <span>
                          <strong>{formatMoney(metrics.avgBillValue)}</strong>
                          Average Ticket
                        </span>
                      </div>
                    </div>

                    <div className="crm-reports-chart-card">
                      <MiniLineChart values={preset.salesTrend} label="Sales trend line chart" />
                      <div className="crm-reports-chart-legend">
                        <span>
                          <i className="crm-reports-dot crm-reports-dot-gold" />
                          Services
                        </span>
                        <span>
                          <i className="crm-reports-dot crm-reports-dot-cream" />
                          Retail
                        </span>
                      </div>
                    </div>
                  </article>
                ) : null}

                {visibleKeys.includes('appointments') ? (
                  <div className="crm-reports-dual-grid">
                    <article className="crm-reports-panel">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Appointment Performance</p>
                          <h2>Bookings and completion trends</h2>
                        </div>
                      </div>
                      <MiniBarChart values={preset.appointmentsTrend} label="Appointment volume bar chart" />
                      <div className="crm-reports-stat-row">
                        <span>
                          <strong>{formatCount(metrics.completed)}</strong>
                          Completed
                        </span>
                        <span>
                          <strong>{formatCount(metrics.cancelled)}</strong>
                          Cancelled
                        </span>
                        <span>
                          <strong>{formatCount(metrics.pendingPayments)}</strong>
                          Pending
                        </span>
                      </div>
                    </article>

                    <article className="crm-reports-panel">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Busy Windows</p>
                          <h2>Peak operational blocks</h2>
                        </div>
                      </div>
                      <div className="crm-reports-heatmap">
                        {['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM'].map((slot, index) => (
                          <div key={slot} className={`crm-reports-heat-card crm-reports-heat-${index + 1}`}>
                            <span>{slot}</span>
                            <strong>{['Low', 'Rising', 'Peak', 'Peak', 'Busy', 'High'][index]}</strong>
                          </div>
                        ))}
                      </div>
                      <button className="crm-reports-inline-link" type="button" onClick={() => navigate('/crm/appointments')}>
                        Open appointment details <ArrowRight size={14} />
                      </button>
                    </article>
                  </div>
                ) : null}

                {visibleKeys.includes('staff') ? (
                  <div className="crm-reports-dual-grid">
                    <article className="crm-reports-panel">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Staff Performance</p>
                          <h2>Appointments, revenue, and utilization</h2>
                        </div>
                      </div>

                      <div className="crm-reports-staff-list">
                        {filteredStaffRows.map((row) => (
                          <div key={row.name} className="crm-reports-staff-row">
                            <div className="crm-reports-avatar">{row.name.slice(0, 1)}</div>
                            <div className="crm-reports-staff-copy">
                              <strong>{row.name}</strong>
                              <span>{row.role}</span>
                            </div>
                            <div className="crm-reports-staff-metric">
                              <strong>{formatMoney(row.revenue)}</strong>
                              <span>{formatCount(row.appointments)} appts</span>
                            </div>
                            <div className="crm-reports-utilization">
                              <div className="crm-reports-utilization-track">
                                <span style={{ width: `${row.utilization}%` }} />
                              </div>
                              <small>{row.utilization}%</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="crm-reports-panel crm-reports-panel-summary">
                      <p className="crm-reports-panel-kicker">Executive Highlights</p>
                      <h2>Actionable takeaways for the manager on duty</h2>

                      <div className="crm-reports-highlights-grid">
                        <div>
                          <span>Highest Sales Day</span>
                          <strong>{metrics.highestSalesDay}</strong>
                        </div>
                        <div>
                          <span>Top Staff</span>
                          <strong>{selectedStaffRow.name}</strong>
                        </div>
                        <div>
                          <span>Most Booked Service</span>
                          <strong>{metrics.topService}</strong>
                        </div>
                        <div>
                          <span>Overdue Payments</span>
                          <strong>{formatMoney(metrics.overduePayments)}</strong>
                        </div>
                      </div>

                      <div className="crm-reports-highlight-foot">
                        <span>
                          Repeat Customer Rate
                          <strong>{formatPercent(metrics.repeatCustomers)}</strong>
                        </span>
                      </div>

                      <button className="crm-reports-highlight-btn" type="button" onClick={() => navigate('/crm/payments')}>
                        Review payments <ArrowRight size={14} />
                      </button>
                    </article>
                  </div>
                ) : null}

                {visibleKeys.includes('services') ? (
                  <div className="crm-reports-dual-grid">
                    <article className="crm-reports-panel">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Service Performance</p>
                          <h2>Top bookings and revenue by treatment</h2>
                        </div>
                      </div>

                      <div className="crm-reports-service-layout">
                        <DonutChart segments={activeServiceMix} totalLabel="Service category mix" />
                        <div className="crm-reports-service-breakdown">
                          {filteredServiceRows.map((row) => (
                            <div key={row.label} className="crm-reports-service-row">
                              <div>
                                <strong>{row.label}</strong>
                                <span>{formatCount(row.bookings)} bookings</span>
                              </div>
                              <p>{formatMoney(row.revenue)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>

                    <article className="crm-reports-panel">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Service Trend</p>
                          <h2>Popularity over time</h2>
                        </div>
                      </div>
                      <MiniLineChart values={preset.bookingTrend} label="Service popularity line chart" />
                      <div className="crm-reports-mini-foot">
                        <span>Top service</span>
                        <strong>{metrics.topService}</strong>
                      </div>
                    </article>
                  </div>
                ) : null}

                {visibleKeys.includes('customers') ? (
                  <div className="crm-reports-dual-grid">
                    <article className="crm-reports-panel">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Customer Insights</p>
                          <h2>Acquisition and retention signals</h2>
                        </div>
                      </div>

                      <div className="crm-reports-customer-grid">
                        {preset.customerRows.map((item) => (
                          <div key={item.label} className={`crm-reports-customer-card crm-reports-customer-${item.tone}`}>
                            <strong>{item.value}</strong>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="crm-reports-bookings-list">
                        <p className="crm-reports-list-label">Upcoming Bookings</p>
                        {preset.upcomingBookings.map((booking) => (
                          <div key={`${booking.name}-${booking.time}`} className="crm-reports-booking-row">
                            <div>
                              <strong>{booking.name}</strong>
                              <span>{booking.service}</span>
                            </div>
                            <p>{booking.time}</p>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="crm-reports-panel crm-reports-panel-soft">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Customer Activity</p>
                          <h2>Repeat behavior and first-time visits</h2>
                        </div>
                      </div>
                      <MiniBarChart values={preset.bookingTrend} label="Customer activity bar chart" />
                      <div className="crm-reports-mini-stats">
                        <span>
                          <strong>{formatCount(metrics.newCustomers)}</strong>
                          New clients
                        </span>
                        <span>
                          <strong>{formatCount(metrics.inactiveCustomers)}</strong>
                          Inactive clients
                        </span>
                        <span>
                          <strong>{formatPercent(metrics.repeatCustomers)}</strong>
                          Repeat rate
                        </span>
                      </div>
                    </article>
                  </div>
                ) : null}

                {visibleKeys.includes('payments') ? (
                  <div className="crm-reports-dual-grid">
                    <article className="crm-reports-panel">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Payment / Cash Summary</p>
                          <h2>Settlement status and cash flow</h2>
                        </div>
                      </div>

                      <div className="crm-reports-cash-grid">
                        <div className="crm-reports-cash-card">
                          <span>Cash Collected</span>
                          <strong>{formatMoney(metrics.cashCollected)}</strong>
                        </div>
                        <div className="crm-reports-cash-card crm-reports-cash-card-alert">
                          <span>Unpaid Balances</span>
                          <strong>{formatMoney(metrics.overduePayments)}</strong>
                        </div>
                        <div className="crm-reports-cash-card">
                          <span>Partial Payments</span>
                          <strong>{formatCount(metrics.partialPayments)}</strong>
                        </div>
                        <div className="crm-reports-cash-card">
                          <span>Receipts Generated</span>
                          <strong>{formatCount(metrics.receipts)}</strong>
                        </div>
                      </div>
                    </article>

                    <article className="crm-reports-panel">
                      <div className="crm-reports-panel-head">
                        <div>
                          <p className="crm-reports-panel-kicker">Payment Status Breakdown</p>
                          <h2>Paid, partial, and pending mix</h2>
                        </div>
                      </div>

                      <div className="crm-reports-payment-layout">
                        <DonutChart segments={preset.paymentBreakdown} totalLabel="Payment status donut chart" />
                        <div className="crm-reports-payment-list">
                          {preset.paymentBreakdown.map((segment) => (
                            <div key={segment.label} className="crm-reports-payment-row">
                              <span>
                                <i style={{ background: segment.color }} />
                                {segment.label}
                              </span>
                              <strong>{formatPercent(segment.value)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  </div>
                ) : null}
              </>
            )}
          </div>

        </section>
      </main>
    </CrmShell>
  );
};

export default CrmReports;
