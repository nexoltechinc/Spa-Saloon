import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {
  SERVICE_ADDONS,
  SERVICE_SEED,
  STAFF_PRICING_RULES,
  calculateServicePricing,
  formatDuration,
  formatPkr,
  getAddonsForService,
  getPackageItemsForService,
} from '../config/serviceCatalog';
import './ServicesMenu.css';

const statusMessage =
  'A hierarchical service menu with sticky filters, elegant accordion rows, and a live booking summary.';

const MENU_GROUPS = [
  {
    id: 'all',
    label: 'All',
    categoryIds: SERVICE_SEED.map((service) => service.categoryId),
    description: 'Complete menu',
  },
  {
    id: 'hair',
    label: 'Hair',
    categoryIds: ['hair-services'],
    description: 'Shape, color, and polish',
  },
  {
    id: 'skin',
    label: 'Skin',
    categoryIds: ['facial-skin-care'],
    description: 'Facials and skin rituals',
  },
  {
    id: 'body',
    label: 'Body',
    categoryIds: ['spa-massage', 'threading-waxing'],
    description: 'Massage and grooming',
  },
  {
    id: 'nails',
    label: 'Nails',
    categoryIds: ['nail-services'],
    description: 'Manicure and pedicure care',
  },
  {
    id: 'makeup',
    label: 'Makeup',
    categoryIds: ['makeup-services'],
    description: 'Event and bridal looks',
  },
  {
    id: 'packages',
    label: 'Packages',
    categoryIds: ['bridal-packages'],
    description: 'Complete bundles',
  },
];

const GROUP_THEMES = {
  all: {
    start: '#0b1a12',
    end: '#c5a059',
    haze: 'rgba(255, 255, 255, 0.14)',
    glow: 'rgba(197, 160, 89, 0.24)',
  },
  hair: {
    start: '#10231b',
    end: '#b9934d',
    haze: 'rgba(255, 255, 255, 0.12)',
    glow: 'rgba(185, 147, 77, 0.22)',
  },
  skin: {
    start: '#1f2f27',
    end: '#d7ba72',
    haze: 'rgba(255, 255, 255, 0.1)',
    glow: 'rgba(215, 186, 114, 0.2)',
  },
  body: {
    start: '#17261f',
    end: '#c59f59',
    haze: 'rgba(255, 255, 255, 0.12)',
    glow: 'rgba(197, 159, 89, 0.2)',
  },
  nails: {
    start: '#241e1a',
    end: '#d1b277',
    haze: 'rgba(255, 255, 255, 0.12)',
    glow: 'rgba(209, 178, 119, 0.22)',
  },
  makeup: {
    start: '#1c241e',
    end: '#caa055',
    haze: 'rgba(255, 255, 255, 0.12)',
    glow: 'rgba(202, 160, 85, 0.22)',
  },
  packages: {
    start: '#111b15',
    end: '#d0ae69',
    haze: 'rgba(255, 255, 255, 0.12)',
    glow: 'rgba(208, 174, 105, 0.24)',
  },
};

const formatMinutesTotal = (minutes) => {
  const total = Math.max(0, Number(minutes) || 0);
  if (!total) return '0 min';
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  if (!remaining) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours} hr ${remaining} min`;
};

const getGroupById = (groupId) => MENU_GROUPS.find((group) => group.id === groupId) || MENU_GROUPS[0];

const getBookingHref = (selectedServiceIds) => {
  const ids = selectedServiceIds.filter(Boolean);
  if (!ids.length) return '/booking';
  return `/booking?services=${encodeURIComponent(ids.join(','))}`;
};

const Services = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedServiceId, setExpandedServiceId] = useState(SERVICE_SEED[0]?.id || '');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const activeServices = useMemo(
    () => SERVICE_SEED.filter((service) => service.status !== 'Inactive' && service.active !== false),
    [],
  );

  const groupCountMap = useMemo(
    () =>
      MENU_GROUPS.reduce((map, group) => {
        if (group.id === 'all') {
          map.set(group.id, activeServices.length);
          return map;
        }

        const count = activeServices.filter((service) => group.categoryIds.includes(service.categoryId)).length;
        map.set(group.id, count);
        return map;
      }, new Map()),
    [activeServices],
  );

  const visibleGroups = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const groups = selectedCategory === 'all'
      ? MENU_GROUPS.filter((group) => group.id !== 'all')
      : MENU_GROUPS.filter((group) => group.id === selectedCategory);

    return groups
      .map((group) => {
        const services = activeServices.filter((service) => {
          const inGroup = group.categoryIds.includes(service.categoryId);
          const matchesSearch =
            !search ||
            `${service.name} ${service.category} ${service.description} ${service.price}`.toLowerCase().includes(search);
          return inGroup && matchesSearch;
        });

        return {
          ...group,
          services,
        };
      })
      .filter((group) => group.services.length > 0);
  }, [activeServices, searchTerm, selectedCategory]);

  const visibleServices = useMemo(
    () => visibleGroups.flatMap((group) => group.services),
    [visibleGroups],
  );

  const selectedServices = useMemo(
    () => selectedServiceIds.map((serviceId) => activeServices.find((service) => service.id === serviceId)).filter(Boolean),
    [activeServices, selectedServiceIds],
  );

  const selectedTotal = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0),
    [selectedServices],
  );

  const selectedDurationMinutes = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.durationMinutes || 0), 0),
    [selectedServices],
  );

  const selectedCategoryName = selectedCategory === 'all'
    ? 'All Services'
    : getGroupById(selectedCategory).label;

  const heroStats = [
    { label: 'Categories', value: MENU_GROUPS.length - 1 },
    { label: 'Visible items', value: visibleServices.length },
    { label: 'Selected items', value: selectedServices.length },
    { label: 'Running total', value: formatPkr(selectedTotal) },
  ];

  const bookingHref = getBookingHref(selectedServiceIds);

  const addServiceToSummary = (service) => {
    setSelectedServiceIds((current) => (current.includes(service.id) ? current : [...current, service.id]));
    setExpandedServiceId(service.id);
  };

  const removeServiceFromSummary = (serviceId) => {
    setSelectedServiceIds((current) => current.filter((currentId) => currentId !== serviceId));
  };

  const clearSummary = () => {
    setSelectedServiceIds([]);
  };

  const renderTierQuotes = (service) =>
    STAFF_PRICING_RULES.slice(0, 3).map((rule) => {
      const quote = calculateServicePricing(service, {
        staffLevel: rule.label,
        selectedAddonIds: [],
        addonCatalog: [],
        staffRules: STAFF_PRICING_RULES,
      });

      return {
        id: rule.id,
        label: rule.label,
        price: quote.finalPrice,
        uplift: rule.adjustmentPercent,
      };
    });

  return (
    <div className="services-menu-page">
      <section className="services-menu-hero">
        <div className="services-menu-hero-copy">
          <p className="services-menu-kicker">Treatment Menu / Services Architecture</p>
          <h1>An effortless menu for calm, high-conversion booking.</h1>
          <p>{statusMessage}</p>

          <div className="services-menu-actions">
            <label className="services-menu-search">
              <Sparkles size={16} />
              <input
                type="search"
                placeholder="Search hair, skin, body, nails, makeup, or packages"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <Link to={bookingHref} state={{ selectedServiceIds, selectedServiceId: selectedServiceIds[0] || '' }} className="services-menu-primary-link">
              {selectedServiceIds.length ? 'Complete Reservation' : 'Open Booking Planner'}
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="services-menu-hero-note">
            <Star size={14} />
            <span>Quick add to booking, tiered price previews, and a sticky reservation summary.</span>
          </div>
        </div>

        <div className="services-menu-hero-panel">
          <div className="services-menu-hero-highlight">
            <span>Selected services</span>
            <strong>{selectedServices.length || '0'}</strong>
            <p>{selectedServices.length ? formatMinutesTotal(selectedDurationMinutes) : 'Nothing added yet'}</p>
          </div>

          <div className="services-menu-stats">
            {heroStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="services-menu-filterbar" aria-label="Service categories">
        <div className="services-menu-filterbar-copy">
          <span className="services-menu-filterbar-kicker">
            <Filter size={14} />
            Filter menu
          </span>
          <strong>{selectedCategoryName}</strong>
          <p>{selectedCategory === 'all' ? 'Browse the full ritual menu.' : getGroupById(selectedCategory).description}</p>
        </div>

        <div className="services-menu-filter-scroll">
          {MENU_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              className={selectedCategory === group.id ? 'is-active' : ''}
              onClick={() => setSelectedCategory(group.id)}
            >
              {group.label}
              <span>{groupCountMap.get(group.id) || 0}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="services-menu-layout">
        <div className="services-menu-main">
          {visibleGroups.length ? (
            visibleGroups.map((group) => (
              <section key={group.id} className="services-menu-group">
                <div className="services-menu-group-head">
                  <div>
                    <p>{group.label}</p>
                    <h2>{group.description}</h2>
                  </div>
                  <span>{group.services.length} services</span>
                </div>

                <div className="services-menu-accordion-list">
                  {group.services.map((service) => {
                    const isExpanded = expandedServiceId === service.id;
                    const isSelected = selectedServiceIds.includes(service.id);
                    const packageItems = getPackageItemsForService(service.id);
                    const addOns = getAddonsForService(service, SERVICE_ADDONS);
                    const tierQuotes = renderTierQuotes(service);
                    const theme = GROUP_THEMES[group.id] || GROUP_THEMES.all;
                    const serviceBookingIds = isSelected ? selectedServiceIds : [...selectedServiceIds, service.id];
                    const serviceBookingHref = getBookingHref(serviceBookingIds);

                    return (
                      <article key={service.id} className={`services-menu-accordion${isExpanded ? ' is-open' : ''}`}>
                        <button
                          type="button"
                          className="services-menu-toggle"
                          aria-expanded={isExpanded}
                          aria-controls={`services-menu-panel-${service.id}`}
                          onClick={() => setExpandedServiceId((current) => (current === service.id ? '' : service.id))}
                        >
                          <div className="services-menu-toggle-copy">
                            <span className="services-menu-badge">{service.category}</span>
                            <h3>{service.name}</h3>
                            <p>
                              Starting at {formatPkr(service.price)} · {formatDuration(service)}
                            </p>
                          </div>

                          <div className="services-menu-toggle-meta">
                            <strong>{formatPkr(service.price)}</strong>
                            <span>{isSelected ? 'Added' : 'Open'}</span>
                            <ChevronDown size={18} className="services-menu-chevron" />
                          </div>
                        </button>

                        {isExpanded ? (
                          <div
                            id={`services-menu-panel-${service.id}`}
                            className="services-menu-panel"
                            style={{
                              '--panel-start': theme.start,
                              '--panel-end': theme.end,
                              '--panel-haze': theme.haze,
                              '--panel-glow': theme.glow,
                            }}
                          >
                            <div className="services-menu-preview">
                              <div className="services-menu-preview-shape" aria-hidden="true" />
                              <span>{group.label} ritual</span>
                              <strong>{service.name}</strong>
                              <p>
                                {group.description}. The experience feels curated, softly paced, and elevated from the first glance.
                              </p>
                            </div>

                            <div className="services-menu-detail">
                              <p>{service.description}</p>

                              <div className="services-menu-detail-grid">
                                <article>
                                  <span>Duration</span>
                                  <strong>{formatDuration(service)}</strong>
                                </article>
                                <article>
                                  <span>Base price</span>
                                  <strong>{formatPkr(service.price)}</strong>
                                </article>
                                <article>
                                  <span>Focus</span>
                                  <strong>{service.isPackage ? 'Concierge bundle' : service.category}</strong>
                                </article>
                              </div>

                              <div className="services-menu-tier-grid">
                                {tierQuotes.map((tier) => (
                                  <article key={tier.id} className="services-menu-tier">
                                    <span>{tier.label}</span>
                                    <strong>{formatPkr(tier.price)}</strong>
                                    <small>{tier.uplift ? `${tier.uplift}% uplift` : 'Base rate'}</small>
                                  </article>
                                ))}
                              </div>

                              {service.isPackage && packageItems.length ? (
                                <div className="services-menu-list-block">
                                  <span>Package items</span>
                                  <ul>
                                    {packageItems.map((item) => (
                                      <li key={`${service.id}-${item.itemName}`}>
                                        <Check size={14} />
                                        <span>{item.itemName}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {!service.isPackage && addOns.length ? (
                                <div className="services-menu-list-block">
                                  <span>Recommended add-ons</span>
                                  <div className="services-menu-chip-row">
                                    {addOns.slice(0, 3).map((addon) => (
                                      <span key={`${service.id}-${addon.id}`}>{addon.name}</span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              <div className="services-menu-detail-actions">
                                <button type="button" className="services-menu-quick-add" onClick={() => addServiceToSummary(service)}>
                                  <Plus size={16} />
                                  {isSelected ? 'Added to summary' : 'Quick add to booking'}
                                </button>
                                <Link
                                  to={serviceBookingHref}
                                  state={{
                                    selectedServiceIds: serviceBookingIds,
                                    selectedServiceId: service.id,
                                  }}
                                  className="services-menu-secondary-link"
                                >
                                  Go to booking
                                  <ArrowRight size={16} />
                                </Link>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <article className="services-menu-empty">
              <p>No services match the current filter.</p>
              <Link
                to="/services"
                className="services-menu-secondary-link"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                Reset filters
                <ArrowRight size={16} />
              </Link>
            </article>
          )}
        </div>

        <aside className="services-menu-sidebar">
          <article className="services-menu-summary-card">
            <div className="services-menu-summary-head">
              <div>
                <p className="services-menu-summary-kicker">Sticky booking summary</p>
                <h2>{selectedServices.length ? `${selectedServices.length} selected services` : 'Ready to curate your menu'}</h2>
              </div>
              <ShoppingBag size={18} />
            </div>

            <p className="services-menu-summary-copy">
              Build a clean reservation stack, review the running total, and continue to booking when the menu feels complete.
            </p>

            <div className="services-menu-summary-metrics">
              <article>
                <span>Total time</span>
                <strong>{selectedServices.length ? formatMinutesTotal(selectedDurationMinutes) : '0 min'}</strong>
              </article>
              <article>
                <span>Running total</span>
                <strong>{formatPkr(selectedTotal)}</strong>
              </article>
            </div>

            <div className="services-menu-selected-list">
              {selectedServices.length ? (
                selectedServices.map((service) => (
                  <div key={service.id} className="services-menu-selected-item">
                    <div>
                      <strong>{service.name}</strong>
                      <span>{formatPkr(service.price)} · {formatDuration(service)}</span>
                    </div>
                    <button
                      type="button"
                      className="services-menu-selected-remove"
                      aria-label={`Remove ${service.name}`}
                      onClick={() => removeServiceFromSummary(service.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="services-menu-empty-state">
                  Add services from the menu and they will appear here with a running total.
                </div>
              )}
            </div>

            <div className="services-menu-summary-actions">
              <button type="button" className="services-menu-secondary-button" onClick={clearSummary} disabled={!selectedServices.length}>
                Clear summary
              </button>
              <Link to={bookingHref} state={{ selectedServiceIds, selectedServiceId: selectedServiceIds[0] || '' }} className="services-menu-primary-link">
                {selectedServices.length ? 'Complete Reservation' : 'Open booking'}
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
};

export default Services;
