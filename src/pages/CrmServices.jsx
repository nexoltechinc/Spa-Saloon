import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmList, crmUpdate } from '../config/crmApi';
import { CRM_NAV_ITEMS } from '../config/crmNav';
import './CrmServices.css';

const serviceSeed = [
  {
    id: 'SRV-101',
    name: 'Signature Facial',
    category: 'Facial',
    duration: 60,
    price: 120,
    assignedStaff: ['Elena', 'Sarah', 'Luna'],
    active: true,
    bookingVisible: true,
    posAvailable: true,
    description: 'Transformative facial with custom exfoliation and hydration infusion.',
    note: 'Popular with premium package clients.',
    lastUpdated: '2026-04-08T11:20:00',
    usageTag: 'Most Booked',
  },
  {
    id: 'SRV-102',
    name: 'Deep Tissue Massage',
    category: 'Massage',
    duration: 90,
    price: 150,
    assignedStaff: ['Marcus', 'Sarah'],
    active: true,
    bookingVisible: true,
    posAvailable: true,
    description: 'High-pressure therapeutic session focused on chronic muscle tension.',
    note: 'Often sold with aromatherapy add-on.',
    lastUpdated: '2026-04-02T09:45:00',
    usageTag: 'Popular',
  },
  {
    id: 'SRV-103',
    name: 'Aromatherapy Session',
    category: 'Massage',
    duration: 60,
    price: 135,
    assignedStaff: ['Marcus', 'Elena'],
    active: true,
    bookingVisible: true,
    posAvailable: true,
    description: 'Relaxation-focused therapy combining aroma blends with gentle pressure.',
    note: 'Price review pending for Q3 package.',
    lastUpdated: '2026-03-30T15:10:00',
    usageTag: 'Review Needed',
  },
  {
    id: 'SRV-104',
    name: 'Hot Stone Therapy',
    category: 'Massage',
    duration: 75,
    price: 160,
    assignedStaff: [],
    active: false,
    bookingVisible: false,
    posAvailable: true,
    description: 'Warm stone pressure technique for circulation and stress relief.',
    note: 'Temporarily inactive due to training refresh.',
    lastUpdated: '2026-04-06T17:40:00',
    usageTag: 'Inactive',
  },
];

const categoryOptions = ['All Categories', 'Facial', 'Massage', 'Hair Treatment', 'Skincare', 'Consultation'];
const statusOptions = ['All Statuses', 'Active', 'Inactive'];
const durationOptions = ['Any Duration', 'Under 60 min', '60-90 min', 'Over 90 min'];

const formatCurrency = (amount) => `$${amount.toFixed(2)}`;
const formatDate = (value) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const normalizeService = (service, index = 0) => ({
  id: service.id || service._id || service.serviceId || `service-${index + 1}`,
  name: service.name || service.serviceName || service.title || 'Untitled Service',
  category: service.category || service.serviceCategory || 'General',
  duration: Number(service.duration ?? service.durationMinutes ?? service.length ?? 60),
  price: Number(service.price ?? service.amount ?? service.cost ?? 0),
  assignedStaff: Array.isArray(service.assignedStaff)
    ? service.assignedStaff
    : Array.isArray(service.staff)
      ? service.staff
      : service.assignedStaff
        ? [String(service.assignedStaff)]
        : [],
  active: Boolean(service.active ?? service.isActive ?? true),
  bookingVisible: Boolean(service.bookingVisible ?? service.bookable ?? true),
  posAvailable: Boolean(service.posAvailable ?? service.posVisible ?? true),
  description: service.description || service.summary || '',
  note: service.note || service.notes || '',
  lastUpdated: service.lastUpdated || service.updatedAt || service.updated_at || new Date().toISOString(),
  usageTag: service.usageTag || service.tag || 'Standard',
});

const CrmServices = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState(serviceSeed);
  const [selectedServiceId, setSelectedServiceId] = useState(serviceSeed[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [durationFilter, setDurationFilter] = useState('Any Duration');
  const [bookableOnly, setBookableOnly] = useState(false);
  const [needsStaffOnly, setNeedsStaffOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadServices = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('services');
        if (!mounted) return;

        const normalized = data.length > 0 ? data.map(normalizeService) : serviceSeed;
        setServices(normalized);
        setSelectedServiceId((current) => (normalized.some((service) => service.id === current) ? current : normalized[0]?.id || ''));
      } catch (error) {
        if (!mounted) return;
        setServices(serviceSeed);
        setLoadError(error.message || 'Unable to load services from the CRM API.');
        setSelectedServiceId(serviceSeed[0]?.id || '');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadServices();

    return () => {
      mounted = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    const total = services.length;
    const active = services.filter((item) => item.active).length;
    const inactive = services.filter((item) => !item.active).length;
    const categories = new Set(services.map((item) => item.category)).size;
    const mostBooked = services.filter((item) => item.usageTag === 'Most Booked').length;
    const reviewNeeded = services.filter((item) => item.usageTag === 'Review Needed').length;

    return [
      { label: 'Total Services', value: total, subtext: '+2 this month' },
      { label: 'Active Services', value: active, subtext: `${Math.round((active / total) * 100) || 0}% active` },
      { label: 'Inactive Services', value: inactive, subtext: '1 archived' },
      { label: 'Categories', value: categories, subtext: '2 new categories' },
      { label: 'Most Booked', value: mostBooked, subtext: 'Top performers' },
      { label: 'Needs Review', value: reviewNeeded, subtext: 'Price update needed' },
    ];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = !searchTerm || `${service.name} ${service.category}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All Categories' || service.category === categoryFilter;
      const matchesStatus = statusFilter === 'All Statuses' || (statusFilter === 'Active' ? service.active : !service.active);
      const matchesDuration = (() => {
        if (durationFilter === 'Any Duration') return true;
        if (durationFilter === 'Under 60 min') return service.duration < 60;
        if (durationFilter === '60-90 min') return service.duration >= 60 && service.duration <= 90;
        if (durationFilter === 'Over 90 min') return service.duration > 90;
        return true;
      })();
      const matchesBookable = !bookableOnly || (service.active && service.bookingVisible);
      const matchesStaffNeed = !needsStaffOnly || service.assignedStaff.length === 0;

      return matchesSearch && matchesCategory && matchesStatus && matchesDuration && matchesBookable && matchesStaffNeed;
    });
  }, [bookableOnly, categoryFilter, durationFilter, needsStaffOnly, searchTerm, services, statusFilter]);

  const selectedService = useMemo(() => {
    return filteredServices.find((service) => service.id === selectedServiceId) || filteredServices[0] || null;
  }, [filteredServices, selectedServiceId]);

  const patchService = (serviceId, updates) => {
    setServices((current) => current.map((item) => (item.id === serviceId ? { ...item, ...updates } : item)));

    void crmUpdate('services', serviceId, updates).catch((error) => {
      setLoadError(error.message || 'Service update failed.');
    });
  };

  const handleQuickCreateService = async () => {
    const name = window.prompt('Service name');
    if (!name) return;

    const category = window.prompt('Category', 'Massage') || 'General';
    const duration = Number(window.prompt('Duration in minutes', '60') || 60);
    const price = Number(window.prompt('Price', '120') || 120);

    try {
      const created = await crmCreate('services', {
        name,
        category,
        duration,
        price,
        assignedStaff: [],
        active: true,
        bookingVisible: true,
        posAvailable: true,
        description: '',
        note: 'Created from CRM quick add',
        lastUpdated: new Date().toISOString(),
        usageTag: 'Standard',
      });

      const normalized = normalizeService(created, services.length);
      setServices((current) => [normalized, ...current]);
      setSelectedServiceId(normalized.id);
    } catch (error) {
      setLoadError(error.message || 'Service creation failed.');
    }
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <div className="crm-services-shell">
      <aside className="crm-services-sidebar">
        <div className="crm-services-brand">
          <p>The Sanctuary</p>
          <span>Global Premium</span>
        </div>
        <nav className="crm-services-menu">
          {CRM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `crm-services-menu-item${isActive ? ' crm-services-menu-item-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="crm-services-quick-btn" onClick={() => navigate('/crm/appointments')}>
          Quick Booking
        </button>
      </aside>

      <main className="crm-services-main">
        <header className="crm-services-header">
          <div>
            <h1>Treatments / Services</h1>
            <p>Manage your service catalog, pricing, and staff assignments across booking and POS.</p>
          </div>
          <div className="crm-services-header-actions">
            <input
              type="search"
              placeholder="Search therapies..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className="crm-services-ghost-btn" onClick={() => navigate('/crm/services')}>
              Manage Categories
            </button>
            <button type="button" className="crm-services-ghost-btn" onClick={() => navigate('/crm/reports')}>
              Export
            </button>
            <button type="button" className="crm-services-primary-btn" onClick={handleQuickCreateService}>
              Add New Service
            </button>
            <button type="button" className="crm-services-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-services-summary">
          {summaryCards.map((card) => (
            <article key={card.label}>
              <p>{card.label}</p>
              <h2>{card.value}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        {loadError ? (
          <section className="crm-services-empty" style={{ marginBottom: '1rem' }}>
            <h3>CRM sync warning</h3>
            <p>{loadError}</p>
          </section>
        ) : null}

        <section className="crm-services-filter-bar">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            {categoryOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={durationFilter} onChange={(event) => setDurationFilter(event.target.value)}>
            {durationOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <button
            type="button"
            className={`crm-services-chip${bookableOnly ? ' crm-services-chip-active' : ''}`}
            onClick={() => setBookableOnly((value) => !value)}
          >
            Bookable Only
          </button>
          <button
            type="button"
            className={`crm-services-chip${needsStaffOnly ? ' crm-services-chip-active' : ''}`}
            onClick={() => setNeedsStaffOnly((value) => !value)}
          >
            No Staff Assigned
          </button>
        </section>

        <section className="crm-services-content">
          <article className="crm-services-table-card">
            <header>
              <p>Service Name</p>
              <p>Category</p>
              <p>Duration</p>
              <p>Price</p>
              <p>Staff</p>
              <p>Booking</p>
              <p>POS</p>
              <p>Active</p>
            </header>
            {isLoading ? (
              <div className="crm-services-empty">
                <h3>Loading services</h3>
                <p>Fetching the latest service catalog from the CRM backend.</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="crm-services-empty">
                <h3>No services match this filter</h3>
                <p>Try broadening filters or create a new service in the catalog.</p>
              </div>
            ) : (
              <div className="crm-services-table-body">
                {filteredServices.map((service) => {
                  const selected = selectedService?.id === service.id;
                  return (
                    <button
                      type="button"
                      key={service.id}
                      className={`crm-service-row${selected ? ' crm-service-row-active' : ''}`}
                      onClick={() => setSelectedServiceId(service.id)}
                    >
                      <div>
                        <p className="crm-service-name">{service.name}</p>
                        <p className="crm-service-sub">{service.description}</p>
                      </div>
                      <p>{service.category}</p>
                      <p>{service.duration} min</p>
                      <p>{formatCurrency(service.price)}</p>
                      <p>{service.assignedStaff.length}</p>

                      <label className="crm-toggle-wrap" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={service.bookingVisible}
                          onChange={(event) => patchService(service.id, { bookingVisible: event.target.checked })}
                        />
                        <span />
                      </label>
                      <label className="crm-toggle-wrap" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={service.posAvailable}
                          onChange={(event) => patchService(service.id, { posAvailable: event.target.checked })}
                        />
                        <span />
                      </label>
                      <label className="crm-toggle-wrap" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={service.active}
                          onChange={(event) => patchService(service.id, { active: event.target.checked })}
                        />
                        <span />
                      </label>
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="crm-services-detail-card">
            {selectedService ? (
              <>
                <p className="crm-services-kicker">{selectedService.category}</p>
                <h3>{selectedService.name}</h3>
                <p className="crm-services-description">{selectedService.description}</p>

                <div className="crm-services-meta-grid">
                  <div>
                    <p>Duration</p>
                    <strong>{selectedService.duration} min</strong>
                  </div>
                  <div>
                    <p>Pricing</p>
                    <strong>{formatCurrency(selectedService.price)}</strong>
                  </div>
                  <div>
                    <p>Booking</p>
                    <strong>{selectedService.bookingVisible ? 'Visible' : 'Hidden'}</strong>
                  </div>
                  <div>
                    <p>POS</p>
                    <strong>{selectedService.posAvailable ? 'Available' : 'Unavailable'}</strong>
                  </div>
                </div>

                <div className="crm-services-assigned">
                  <p>Assigned Staff</p>
                  {selectedService.assignedStaff.length > 0 ? (
                    <div className="crm-staff-chip-row">
                      {selectedService.assignedStaff.map((name) => <span key={name}>{name}</span>)}
                    </div>
                  ) : (
                    <p className="crm-services-warning">No staff assigned. This service cannot be reliably booked.</p>
                  )}
                </div>

                <p className="crm-services-note">{selectedService.note}</p>
                <p className="crm-services-updated">Last updated: {formatDate(selectedService.lastUpdated)}</p>

                <div className="crm-services-actions">
                  <button type="button" className="crm-services-primary-btn" onClick={() => navigate('/crm/services')}>
                    Edit Service
                  </button>
                  <button type="button" className="crm-services-secondary-btn" onClick={() => navigate('/crm/services')}>
                    Assign Staff
                  </button>
                  <button type="button" className="crm-services-secondary-btn" onClick={() => navigate('/crm/reports')}>
                    Update Price
                  </button>
                  <button type="button" className="crm-services-ghost-btn" onClick={() => setSelectedServiceId(selectedService.id)}>
                    Duplicate Service
                  </button>
                </div>
              </>
            ) : (
              <div className="crm-services-empty">
                <h3>Select a service</h3>
                <p>Pick a row to review pricing, assignment, and visibility settings.</p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
};

export default CrmServices;
