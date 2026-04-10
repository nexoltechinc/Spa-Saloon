import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmList, crmUpdate } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import './CrmSettings.css';
import './CrmCustomers.css';

const customerSeed = [
  {
    id: 'C-1190',
    name: 'Isabella Thorne',
    phone: '+1 (555) 012-9988',
    email: 'isabella.thorne@example.com',
    tag: 'VIP',
    status: 'Active',
    createdAt: '2025-06-12',
    lastVisit: '2026-04-05',
    nextAppointment: '2026-04-12T10:00:00',
    totalVisits: 24,
    totalSpend: 4820,
    loyaltyPoints: 1240,
    preferredStaff: 'Sarah Jenkins',
    preferredTimes: 'Weekday mornings',
    preferences: ['Deep Tissue', 'Aromatherapy', 'Rose Quartz Facial'],
    allergies: 'Prefers fragrance-sensitive oils',
    followUpState: 'normal',
    notes: 'Requested extra focus on lower back tension. Enjoys post-treatment peppermint tea.',
    paymentHistory: ['Apr 05 - Cash - $185', 'Mar 22 - Cash - $210', 'Mar 05 - Card - $120'],
    receiptCount: 17,
  },
  {
    id: 'C-1144',
    name: 'Julian Marc',
    phone: '+1 (555) 012-4433',
    email: 'julian.marc@example.com',
    tag: 'Regular',
    status: 'Active',
    createdAt: '2025-11-03',
    lastVisit: '2026-03-28',
    nextAppointment: '',
    totalVisits: 8,
    totalSpend: 1190,
    loyaltyPoints: 410,
    preferredStaff: 'Marcus',
    preferredTimes: 'Late afternoons',
    preferences: ['Swedish Massage'],
    allergies: 'None reported',
    followUpState: 'needs_follow_up',
    notes: 'No visit booked for this month. Good candidate for re-engagement sequence.',
    paymentHistory: ['Mar 28 - Cash - $125', 'Mar 04 - Cash - $140'],
    receiptCount: 8,
  },
  {
    id: 'C-1087',
    name: 'Elara Vance',
    phone: '+1 (555) 012-7722',
    email: 'elara.vance@example.com',
    tag: 'VIP',
    status: 'Active',
    createdAt: '2024-10-19',
    lastVisit: '2026-03-20',
    nextAppointment: '2026-04-22T10:00:00',
    totalVisits: 42,
    totalSpend: 9210,
    loyaltyPoints: 2104,
    preferredStaff: 'Elena',
    preferredTimes: 'Mid-morning',
    preferences: ['Hot Stone', 'Deluxe Facial'],
    allergies: 'Avoid peppermint products',
    followUpState: 'normal',
    notes: 'Long-term client. Celebrating birthday package in May.',
    paymentHistory: ['Mar 20 - Cash - $275', 'Feb 26 - Card - $310'],
    receiptCount: 39,
  },
  {
    id: 'C-1012',
    name: 'Arthur Penhaligon',
    phone: '+1 (555) 012-1100',
    email: 'arthur.penhaligon@example.com',
    tag: 'Inactive',
    status: 'Dormant',
    createdAt: '2024-02-07',
    lastVisit: '2025-10-14',
    nextAppointment: '',
    totalVisits: 2,
    totalSpend: 260,
    loyaltyPoints: 55,
    preferredStaff: 'Unassigned',
    preferredTimes: 'N/A',
    preferences: ['Reflexology'],
    allergies: 'None reported',
    followUpState: 'overdue',
    notes: 'No visits in the last 6 months. Needs follow-up outreach.',
    paymentHistory: ['Oct 14 - Cash - $130', 'Sep 28 - Cash - $130'],
    receiptCount: 2,
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

const typeFilters = ['All Types', 'VIP', 'Regular', 'New', 'Inactive'];
const spendFilters = ['Any Spend', 'Above $500', 'Above $1000', 'Above $3000'];
const visitFilters = ['Any Frequency', 'Monthly', 'Quarterly', 'Annually'];

const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const normalizeCustomer = (customer, index = 0) => ({
  id: customer.id || customer._id || customer.customerId || `customer-${index + 1}`,
  name: customer.name || customer.fullName || customer.customerName || 'Untitled Customer',
  phone: customer.phone || customer.mobile || customer.contactNumber || '',
  email: customer.email || customer.contactEmail || '',
  tag: customer.tag || customer.customerType || 'Regular',
  status: customer.status || customer.accountStatus || 'Active',
  createdAt: customer.createdAt || customer.created_at || customer.joinedAt || new Date().toISOString(),
  lastVisit: customer.lastVisit || customer.lastVisitDate || customer.lastAppointment || '',
  nextAppointment: customer.nextAppointment || customer.nextAppt || customer.nextAppointmentAt || '',
  totalVisits: Number(customer.totalVisits ?? customer.visitCount ?? customer.visits ?? 0),
  totalSpend: Number(customer.totalSpend ?? customer.lifetimeSpend ?? customer.spend ?? 0),
  loyaltyPoints: Number(customer.loyaltyPoints ?? customer.points ?? 0),
  preferredStaff: customer.preferredStaff || customer.preferredTherapist || 'Unassigned',
  preferredTimes: customer.preferredTimes || customer.preferredTime || 'N/A',
  preferences: Array.isArray(customer.preferences)
    ? customer.preferences
    : customer.preferences
      ? [String(customer.preferences)]
      : [],
  allergies: customer.allergies || customer.notes || 'None reported',
  followUpState: customer.followUpState || customer.followUp || 'normal',
  notes: customer.notes || customer.comment || '',
  paymentHistory: Array.isArray(customer.paymentHistory)
    ? customer.paymentHistory
    : customer.paymentHistory
      ? [String(customer.paymentHistory)]
      : [],
  receiptCount: Number(customer.receiptCount ?? customer.receipts ?? 0),
});

const CrmCustomers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(customerSeed);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [spendFilter, setSpendFilter] = useState('Any Spend');
  const [visitFilter, setVisitFilter] = useState('Any Frequency');
  const [vipOnly, setVipOnly] = useState(false);
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerSeed[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activePanel, setActivePanel] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadCustomers = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('customers');
        if (!mounted) return;

        const normalized = data.length > 0 ? data.map(normalizeCustomer) : customerSeed;
        setCustomers(normalized);
        setSelectedCustomerId((current) => (normalized.some((customer) => customer.id === current) ? current : normalized[0]?.id || ''));
      } catch (error) {
        if (!mounted) return;
        setCustomers(customerSeed);
        setLoadError(error.message || 'Unable to load customers from the CRM API.');
        setSelectedCustomerId(customerSeed[0]?.id || '');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadCustomers();

    return () => {
      mounted = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    const totalCustomers = customers.length;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const newThisMonth = customers.filter((customer) => {
      const createdCandidate = new Date(customer.createdAt);
      return createdCandidate.getMonth() === thisMonth && createdCandidate.getFullYear() === thisYear;
    }).length;
    const repeatCustomers = customers.filter((customer) => customer.totalVisits > 1).length;
    const vipCustomers = customers.filter((customer) => customer.tag === 'VIP').length;
    const upcomingAppointments = customers.filter((customer) => Boolean(customer.nextAppointment)).length;
    const needingFollowUp = customers.filter((customer) => customer.followUpState !== 'normal').length;

    return [
      { label: 'Total Customers', value: totalCustomers, subtext: '+5 this week' },
      { label: 'New This Month', value: newThisMonth, subtext: '+10% vs last month' },
      { label: 'Repeat Customers', value: repeatCustomers, subtext: `${Math.round((repeatCustomers / totalCustomers) * 100)}% of total` },
      { label: 'VIP Customers', value: vipCustomers, subtext: 'Top value segment' },
      { label: 'Upcoming Appts', value: upcomingAppointments, subtext: '20 due today' },
      { label: 'Need Follow-up', value: needingFollowUp, subtext: '5 overdue' },
    ];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const text = `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase();
      const matchesSearch = !searchTerm || text.includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'All Types' || customer.tag === typeFilter;

      const matchesSpend = (() => {
        if (spendFilter === 'Any Spend') return true;
        if (spendFilter === 'Above $500') return customer.totalSpend > 500;
        if (spendFilter === 'Above $1000') return customer.totalSpend > 1000;
        if (spendFilter === 'Above $3000') return customer.totalSpend > 3000;
        return true;
      })();

      const matchesVisit = (() => {
        if (visitFilter === 'Any Frequency') return true;
        if (visitFilter === 'Monthly') return customer.totalVisits >= 10;
        if (visitFilter === 'Quarterly') return customer.totalVisits >= 4 && customer.totalVisits < 10;
        if (visitFilter === 'Annually') return customer.totalVisits < 4;
        return true;
      })();

      const matchesVip = !vipOnly || customer.tag === 'VIP';
      const matchesFollowUp = !followUpOnly || customer.followUpState !== 'normal';
      const matchesInactive = !inactiveOnly || customer.tag === 'Inactive';

      return matchesSearch && matchesType && matchesSpend && matchesVisit && matchesVip && matchesFollowUp && matchesInactive;
    });
  }, [customers, followUpOnly, inactiveOnly, searchTerm, spendFilter, typeFilter, vipOnly, visitFilter]);

  const selectedCustomer = useMemo(() => {
    return filteredCustomers.find((customer) => customer.id === selectedCustomerId) || filteredCustomers[0] || null;
  }, [filteredCustomers, selectedCustomerId]);

  const handleTagUpdate = (customerId, tag) => {
    setCustomers((list) => list.map((entry) => (entry.id === customerId ? { ...entry, tag } : entry)));

    void crmUpdate('customers', customerId, { tag, customerType: tag }).catch((error) => {
      setLoadError(error.message || 'Customer tag update failed.');
    });
  };

  const handleQuickCreateCustomer = async () => {
    const name = window.prompt('Customer name');
    if (!name) return;

    const phone = window.prompt('Phone number', '') || '';
    const email = window.prompt('Email address', '') || '';
    const tag = window.prompt('Customer tag', 'Regular') || 'Regular';

    try {
      const created = await crmCreate('customers', {
        name,
        phone,
        email,
        tag,
        status: tag === 'Inactive' ? 'Dormant' : 'Active',
        createdAt: new Date().toISOString(),
        lastVisit: '',
        nextAppointment: '',
        totalVisits: 0,
        totalSpend: 0,
        loyaltyPoints: 0,
        preferredStaff: 'Unassigned',
        preferredTimes: 'N/A',
        preferences: [],
        allergies: 'None reported',
        followUpState: 'normal',
        notes: 'Created from CRM quick add',
        paymentHistory: [],
        receiptCount: 0,
      });

      const normalized = normalizeCustomer(created, customers.length);
      setCustomers((current) => [normalized, ...current]);
      setSelectedCustomerId(normalized.id);
    } catch (error) {
      setLoadError(error.message || 'Customer creation failed.');
    }
  };

  const handleExportCustomers = () => {
    const rows = [
      ['Customer ID', 'Name', 'Phone', 'Email', 'Tag', 'Status', 'Visits', 'Spend', 'Loyalty Points'],
      ...filteredCustomers.map((customer) => [
        customer.id,
        customer.name,
        customer.phone,
        customer.email,
        customer.tag,
        customer.status,
        customer.totalVisits,
        customer.totalSpend,
        customer.loyaltyPoints,
      ]),
    ];

    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleBookAppointment = () => {
    if (!selectedCustomer) return;

    const service = window.prompt('Service name', selectedCustomer.preferences[0] || 'Signature Facial') || 'Signature Facial';
    const start = window.prompt('Start time', '10:00') || '10:00';
    const end = window.prompt('End time', '11:00') || '11:00';
    void crmCreate('appointments', {
      customer: selectedCustomer.name,
      phone: selectedCustomer.phone,
      service,
      staff: selectedCustomer.preferredStaff || 'Unassigned',
      start,
      end,
      status: 'Confirmed',
      note: `Booked from customer profile ${selectedCustomer.id}`,
      paymentStatus: 'Pending',
      reminderScheduled: true,
    }).catch((error) => {
      setLoadError(error.message || 'Customer booking failed.');
    });
  };

  const handleRecordPayment = () => {
    if (!selectedCustomer) return;

    const amountDue = Number(window.prompt('Amount due', '120') || 120);
    const amountPaid = Number(window.prompt('Amount paid', String(amountDue)) || amountDue);
    const balanceRemaining = Math.max(amountDue - amountPaid, 0);

    void crmCreate('payments', {
      customerName: selectedCustomer.name,
      appointmentId: selectedCustomer.nextAppointment || '',
      serviceName: selectedCustomer.preferences[0] || 'Service',
      amountDue,
      amountPaid,
      balanceRemaining,
      method: 'Cash',
      status: balanceRemaining <= 0 ? 'Paid' : 'Partial',
      paymentDate: new Date().toISOString(),
      recordedBy: 'Front Desk',
      notes: `Recorded from customer profile ${selectedCustomer.id}`,
      receiptStatus: amountPaid > 0 ? 'Pending' : 'Not Issued',
    }).catch((error) => {
      setLoadError(error.message || 'Customer payment failed.');
    });
  };

  const handleSendFollowUp = () => {
    if (!selectedCustomer) return;

    setCustomers((current) =>
      current.map((customer) =>
        customer.id === selectedCustomer.id
          ? {
              ...customer,
              followUpState: 'watch',
              notes: `${customer.notes} Follow-up queued from customer screen.`,
            }
          : customer,
      ),
    );

    void crmUpdate('customers', selectedCustomer.id, {
      followUpState: 'watch',
      notes: `${selectedCustomer.notes} Follow-up queued from customer screen.`,
    }).catch((error) => {
      setLoadError(error.message || 'Unable to store follow-up note.');
    });
  };

  const handleOpenReceiptHistory = () => {
    setActivePanel('receipts');
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <CrmShell
      shellClassName="crm-customers-shell"
    >
      <main className="crm-customers-main">
        <header className="crm-customers-header">
          <div>
            <h1>Customers</h1>
            <p>Manage all client records, service history, and preferences in one place.</p>
          </div>

          <div className="crm-customers-header-actions">
            <input
              type="search"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className="crm-customers-ghost-btn" onClick={handleExportCustomers}>
              Export
            </button>
            <button type="button" className="crm-customers-ghost-btn" onClick={() => setFollowUpOnly((value) => !value)}>
              Filter
            </button>
            <button type="button" className="crm-customers-primary-btn" onClick={handleQuickCreateCustomer}>
              Add New Customer
            </button>
            <button type="button" className="crm-customers-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-customers-summary">
          {summaryCards.map((card) => (
            <article key={card.label} className="crm-customers-summary-card">
              <p>{card.label}</p>
              <h2>{card.value}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        <section className="crm-customers-filter-bar">
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            {typeFilters.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={visitFilter} onChange={(event) => setVisitFilter(event.target.value)}>
            {visitFilters.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={spendFilter} onChange={(event) => setSpendFilter(event.target.value)}>
            {spendFilters.map((option) => <option key={option}>{option}</option>)}
          </select>
          <button
            type="button"
            className={`crm-customers-chip${vipOnly ? ' crm-customers-chip-active' : ''}`}
            onClick={() => setVipOnly((value) => !value)}
          >
            VIP Only
          </button>
          <button
            type="button"
            className={`crm-customers-chip${followUpOnly ? ' crm-customers-chip-active' : ''}`}
            onClick={() => setFollowUpOnly((value) => !value)}
          >
            Follow-up Needed
          </button>
          <button
            type="button"
            className={`crm-customers-chip${inactiveOnly ? ' crm-customers-chip-active' : ''}`}
            onClick={() => setInactiveOnly((value) => !value)}
          >
            Inactive
          </button>
        </section>

        <section className="crm-customers-content">
          <article className="crm-customers-table-card">
            <header>
              <p>Guest</p>
              <p>Last Visit</p>
              <p>Next Appt</p>
              <p>Visits</p>
              <p>Spend</p>
              <p>Tag</p>
            </header>
            {isLoading ? (
              <div className="crm-customers-empty">
                <h3>Loading customers</h3>
                <p>Fetching the latest client records from the CRM backend.</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="crm-customers-empty">
                <h3>No customers found</h3>
                <p>Try removing a filter or add a new customer profile.</p>
              </div>
            ) : (
              <div className="crm-customers-table-body">
                {filteredCustomers.map((customer) => {
                  const isSelected = selectedCustomer?.id === customer.id;
                  return (
                    <button
                      type="button"
                      key={customer.id}
                      className={`crm-customer-row${isSelected ? ' crm-customer-row-active' : ''}`}
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      <div>
                        <p className="crm-customer-name">
                          {customer.name}
                          <span>{customer.tag}</span>
                        </p>
                        <p className="crm-customer-sub">{customer.phone}</p>
                        <p className="crm-customer-sub">{customer.email}</p>
                      </div>
                      <p>{formatDate(customer.lastVisit)}</p>
                      <p>{formatDateTime(customer.nextAppointment)}</p>
                      <p>{customer.totalVisits}</p>
                      <p>${customer.totalSpend.toLocaleString()}</p>
                      <select
                        value={customer.tag}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => handleTagUpdate(customer.id, event.target.value)}
                      >
                        <option>VIP</option>
                        <option>Regular</option>
                        <option>New</option>
                        <option>Inactive</option>
                      </select>
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="crm-customer-detail">
            {selectedCustomer ? (
              <>
                <div className="crm-customer-profile">
                  <div className="crm-customer-avatar">{selectedCustomer.name.slice(0, 2).toUpperCase()}</div>
                  <h3>{selectedCustomer.name}</h3>
                  <span>{selectedCustomer.tag} Guest</span>
                  <p>{selectedCustomer.notes}</p>
                </div>

                <div className="crm-customer-metrics">
                  <article>
                    <p>Lifetime Spend</p>
                    <strong>${selectedCustomer.totalSpend.toLocaleString()}</strong>
                  </article>
                  <article>
                    <p>Loyalty Points</p>
                    <strong>{selectedCustomer.loyaltyPoints.toLocaleString()}</strong>
                  </article>
                </div>

                <div className="crm-customer-info-block">
                  <p className="crm-info-title">Service Preferences</p>
                  <div className="crm-chip-row">
                    {selectedCustomer.preferences.map((pref) => <span key={pref}>{pref}</span>)}
                  </div>
                  <p className="crm-info-title">Preferred Staff</p>
                  <p className="crm-info-copy">{selectedCustomer.preferredStaff}</p>
                  <p className="crm-info-title">Preferred Times</p>
                  <p className="crm-info-copy">{selectedCustomer.preferredTimes}</p>
                  <p className="crm-info-title">Allergies / Sensitivities</p>
                  <p className="crm-info-copy">{selectedCustomer.allergies}</p>
                </div>

                <div className="crm-customer-actions">
                <button type="button" className="crm-customers-primary-btn" onClick={handleBookAppointment}>
                  Book New Appointment
                </button>
                <button type="button" className="crm-customers-secondary-btn" onClick={handleRecordPayment}>
                  Record Payment
                </button>
                <button type="button" className="crm-customers-ghost-btn" onClick={handleOpenReceiptHistory}>
                  Open Receipt History
                </button>
                <button type="button" className="crm-customers-ghost-btn" onClick={handleSendFollowUp}>
                  Send Follow-up
                </button>
                </div>

                <div className="crm-customer-history">
                  <p className="crm-info-title">Payment / Receipt History</p>
                  <ul>
                    {selectedCustomer.paymentHistory.map((historyItem) => (
                      <li key={historyItem}>{historyItem}</li>
                    ))}
                  </ul>
                  <p className="crm-info-copy">Receipt count: {selectedCustomer.receiptCount}</p>
                </div>
              </>
            ) : (
              <div className="crm-customers-empty">
                <h3>Select a customer</h3>
                <p>Choose a row to open profile intelligence and quick actions.</p>
              </div>
            )}
          </aside>
        </section>

        {activePanel === 'receipts' && selectedCustomer ? (
          <div className="crm-settings-modal-backdrop" role="presentation" onClick={() => setActivePanel(null)}>
            <article
              className="crm-settings-modal-card"
              role="dialog"
              aria-modal="true"
              aria-label="Receipt history"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="crm-settings-modal-head">
                <div>
                  <p>Receipt History</p>
                  <h3>{selectedCustomer.name}</h3>
                </div>
                <button type="button" className="crm-settings-modal-close" onClick={() => setActivePanel(null)}>
                  Close
                </button>
              </div>
              <div className="crm-settings-modal-list">
                {selectedCustomer.paymentHistory.length ? (
                  selectedCustomer.paymentHistory.map((item) => (
                    <article key={item} className="crm-settings-modal-item">
                      <strong>{item}</strong>
                    </article>
                  ))
                ) : (
                  <article className="crm-settings-modal-item">
                    <strong>No receipts yet</strong>
                    <p>This customer does not have receipt history in the CRM yet.</p>
                  </article>
                )}
              </div>
            </article>
          </div>
        ) : null}
      </main>
    </CrmShell>
  );
};

export default CrmCustomers;
