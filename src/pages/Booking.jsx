import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BadgePercent, CalendarDays, Sparkles } from 'lucide-react';
import {
  SERVICE_ADDONS,
  SERVICE_CATEGORIES,
  SERVICE_PACKAGE_ITEMS,
  SERVICE_SEED,
  STAFF_PRICING_RULES,
  calculateServicePricing,
  formatDuration,
  formatPkr,
  getAddonsForService,
  getCategoryCountMap,
} from '../config/serviceCatalog';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import './ServiceCatalogPages.css';

const Booking = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { data: catalog } = useServiceCatalog();

  const servicesCatalog = catalog?.services?.length ? catalog.services : SERVICE_SEED;
  const categoriesCatalog = catalog?.categories?.length ? catalog.categories : SERVICE_CATEGORIES;
  const addonsCatalog = catalog?.addons?.length ? catalog.addons : SERVICE_ADDONS;
  const packageItemCatalog = catalog?.packageItems?.length ? catalog.packageItems : SERVICE_PACKAGE_ITEMS;
  const staffPricingRules = catalog?.staffPricingRules?.length ? catalog.staffPricingRules : STAFF_PRICING_RULES;
  const incomingSelectedServiceIds = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryIds = (searchParams.get('services') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const stateIds = Array.isArray(location.state?.selectedServiceIds) ? location.state.selectedServiceIds : [];
    const stateSingleId = location.state?.selectedServiceId ? [location.state.selectedServiceId] : [];

    return [...stateIds, ...stateSingleId, ...queryIds]
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }, [location.search, location.state]);

  const [selectedServiceId, setSelectedServiceId] = useState(() => incomingSelectedServiceIds[0] || SERVICE_SEED[0]?.id || '');
  const [selectedAddonIds, setSelectedAddonIds] = useState(() => SERVICE_SEED[0]?.defaultAddonIds || []);
  const [staffLevel, setStaffLevel] = useState(STAFF_PRICING_RULES[0]?.label || 'Junior Staff');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxRatePercent, setTaxRatePercent] = useState('0');

  const activeServices = useMemo(
    () => servicesCatalog.filter((service) => service.status !== 'Inactive' && service.active !== false),
    [servicesCatalog],
  );

  const categoryCountMap = useMemo(() => getCategoryCountMap(activeServices), [activeServices]);

  const filteredServices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return activeServices.filter((service) => {
      const matchesCategory = selectedCategory === 'all' || service.categoryId === selectedCategory;
      const matchesSearch =
        !search ||
        `${service.name} ${service.category} ${service.description} ${service.price}`.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [activeServices, searchTerm, selectedCategory]);

  const selectedService = useMemo(
    () => activeServices.find((service) => service.id === selectedServiceId) || null,
    [activeServices, selectedServiceId],
  );

  const availableAddons = useMemo(() => getAddonsForService(selectedService, addonsCatalog), [addonsCatalog, selectedService]);

  const pricingQuote = useMemo(() => {
    if (!selectedService) return null;

    return calculateServicePricing(selectedService, {
      selectedAddonIds,
      staffLevel,
      discountAmount,
      taxRatePercent,
      addonCatalog: addonsCatalog,
      staffRules: staffPricingRules,
    });
  }, [addonsCatalog, discountAmount, selectedAddonIds, selectedService, staffLevel, staffPricingRules, taxRatePercent]);

  const selectedCategoryName = selectedCategory === 'all'
    ? 'All Treatments'
    : categoriesCatalog.find((category) => category.id === selectedCategory)?.name || 'All Treatments';

  const selectedPackageItems = selectedService
    ? packageItemCatalog.filter((item) => item.serviceId === selectedService.id)
    : [];

  const getPackageItemsForService = (serviceId) => packageItemCatalog.filter((item) => item.serviceId === serviceId);

  const selectService = (service) => {
    setSelectedServiceId(service.id);
    setSelectedCategory(service.categoryId);
    setSelectedAddonIds(service.defaultAddonIds || []);
  };

  const heroStats = [
    { label: 'Live treatments', value: activeServices.length },
    { label: 'Categories', value: categoriesCatalog.length },
    { label: 'Add-ons', value: addonsCatalog.length },
    { label: 'Staff tiers', value: staffPricingRules.length },
  ];

  const heroVisualService = selectedService || activeServices[0] || SERVICE_SEED[0] || null;
  const heroVisualImage = heroVisualService?.imageUrl || SERVICE_SEED[0]?.imageUrl || '/images/hero.png';
  const heroVisualAlt = heroVisualService
    ? `${heroVisualService.name} service photograph from Hazel Beauty Saloon`
    : 'Hazel Beauty Saloon treatment photograph';

  return (
    <div className="service-booking-page">
      <section className="service-booking-hero">
        <div className="service-booking-hero-copy">
          <p className="service-booking-kicker">Booking / Treatment Flow</p>
          <h1>Choose a service, tune the price, and prepare the visit.</h1>
          <p>
            The booking view now pulls from the same catalog as the CRM, with active treatments only, live add-ons,
            and staff-based pricing previews.
          </p>

          <div className="service-booking-actions">
            <label className="service-booking-search">
              <Sparkles size={16} />
              <input
                type="search"
                placeholder="Search services by name or category..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <Link to="/services" className="service-booking-secondary-link">
              Browse Services
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="service-booking-hero-panel">
          <div className="service-booking-hero-visual">
            <img
              src={heroVisualImage}
              alt={heroVisualAlt}
              className="service-booking-hero-visual-image"
              loading="eager"
            />
            <div className="service-booking-hero-visual-overlay" aria-hidden="true" />
            <article className="service-booking-hero-visual-copy">
              <span>Selected treatment</span>
              <strong>{heroVisualService?.name || 'Choose a treatment'}</strong>
              <p>{heroVisualService?.category || 'A calm preview from the Hazel catalog.'}</p>
            </article>
          </div>

          <div className="service-booking-price-card">
            <span>Final Preview</span>
            <strong>{pricingQuote ? formatPkr(pricingQuote.finalPrice) : formatPkr(0)}</strong>
            <p>{selectedService?.name || 'Select a service to preview pricing.'}</p>
          </div>
          <div className="service-booking-stat-grid">
            {heroStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="service-booking-nav">
        <button type="button" className={selectedCategory === 'all' ? 'is-active' : ''} onClick={() => setSelectedCategory('all')}>
          All <span>{activeServices.length}</span>
        </button>
        {categoriesCatalog.map((category) => (
            <button
              key={category.id}
              type="button"
              className={selectedCategory === category.id ? 'is-active' : ''}
              onClick={() => setSelectedCategory(category.id)}
          >
            {category.name} <span>{categoryCountMap.get(category.id) || 0}</span>
          </button>
        ))}
      </section>

      <section className="service-booking-layout">
        <div className="service-booking-catalog">
          <div className="service-booking-section-head">
            <div>
              <p>Available Treatments</p>
              <h2>{selectedCategoryName}</h2>
            </div>
            <span>{filteredServices.length} active services</span>
          </div>

          <div className="service-booking-grid">
            {filteredServices.map((service) => {
              const isSelected = service.id === selectedServiceId;
              const packageItems = getPackageItemsForService(service.id);

              return (
                <button
                  key={service.id}
                  type="button"
                  className={`service-booking-card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => selectService(service)}
                >
                  <div className="service-booking-card-media">
                    <img
                      src={service.imageUrl || SERVICE_SEED[0]?.imageUrl || '/images/hero.png'}
                      alt={`${service.name} service photograph from Hazel Beauty Saloon`}
                      className="service-booking-card-image"
                      loading="lazy"
                    />
                    <div className="service-booking-card-media-overlay" aria-hidden="true" />
                  </div>

                  <div className="service-booking-card-body">
                    <div className="service-booking-card-top">
                      <div>
                        <span className="service-booking-badge">{service.category}</span>
                        <h3>{service.name}</h3>
                      </div>
                      <strong>{formatPkr(service.price)}</strong>
                    </div>

                    <p>{service.description}</p>

                    <div className="service-booking-metadata">
                      <span>
                        <CalendarDays size={14} />
                        {service.durationLabel || formatDuration(service)}
                      </span>
                      <span>
                        <BadgePercent size={14} />
                        Staff pricing ready
                      </span>
                    </div>

                    {packageItems.length ? (
                      <div className="service-booking-package-mini">
                        {packageItems.slice(0, 3).map((item) => (
                          <span key={`${service.id}-${item.itemName}`}>{item.itemName}</span>
                        ))}
                      </div>
                    ) : null}

                    <span className="service-booking-card-link">
                      {isSelected ? 'Selected' : 'Select service'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="service-booking-summary">
          <article className="service-booking-summary-card">
            <p className="service-booking-summary-kicker">Pricing Preview</p>
            <h2>{selectedService?.name || 'No service selected'}</h2>
            <p>{selectedService?.description || 'Choose a treatment from the catalog to preview pricing.'}</p>

            {selectedService ? (
              <>
                <div className="service-booking-summary-pricing">
                  <div>
                    <span>Base Price</span>
                    <strong>{formatPkr(pricingQuote?.basePrice ?? selectedService.price)}</strong>
                  </div>
                  <div>
                    <span>Add-ons</span>
                    <strong>{formatPkr(pricingQuote?.addonTotal ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Staff Uplift</span>
                    <strong>{formatPkr(pricingQuote?.staffAdjustmentAmount ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Tax</span>
                    <strong>{formatPkr(pricingQuote?.taxAmount ?? 0)}</strong>
                  </div>
                </div>

                <div className="service-booking-controls">
                  <label>
                    <span>Staff Level</span>
                    <select value={staffLevel} onChange={(event) => setStaffLevel(event.target.value)}>
                      {staffPricingRules.map((rule) => (
                        <option key={rule.id} value={rule.label}>
                          {rule.label} (+{rule.adjustmentPercent}%)
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Discount (PKR)</span>
                    <input type="number" min="0" step="1" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
                  </label>
                  <label>
                    <span>Tax (%)</span>
                    <input type="number" min="0" step="1" value={taxRatePercent} onChange={(event) => setTaxRatePercent(event.target.value)} />
                  </label>
                </div>

                <div className="service-booking-addon-panel">
                  <div className="service-booking-section-head compact">
                    <h3>Add-ons</h3>
                    <span>{availableAddons.length} available</span>
                  </div>
                  <div className="service-booking-addon-list">
                    {availableAddons.map((addon) => {
                      const checked = selectedAddonIds.includes(addon.id);

                      return (
                        <button
                          key={addon.id}
                          type="button"
                          className={checked ? 'is-active' : ''}
                          onClick={() => {
                            setSelectedAddonIds((current) =>
                              current.includes(addon.id)
                                ? current.filter((value) => value !== addon.id)
                                : [...current, addon.id],
                            );
                          }}
                        >
                          <strong>{addon.name}</strong>
                          <span>{formatPkr(addon.pricePkr)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedPackageItems.length ? (
                  <div className="service-booking-package-panel">
                    <div className="service-booking-section-head compact">
                      <h3>Package Items</h3>
                      <span>{selectedPackageItems.length} included</span>
                    </div>
                    <ul>
                      {selectedPackageItems.map((item) => (
                        <li key={`${selectedService.id}-${item.itemName}`}>
                          <span>{item.itemName}</span>
                          <small>{item.included ? 'Included' : 'Optional'}</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="service-booking-total">
                  <span>Final Price</span>
                  <strong>{pricingQuote ? formatPkr(pricingQuote.finalPrice) : formatPkr(selectedService.price)}</strong>
                </div>

                <Link to="/crm/appointments" className="service-booking-primary-link">
                  Send to Appointment Booking
                  <ArrowRight size={16} />
                </Link>
              </>
            ) : (
              <div className="service-booking-empty">
                Select a service to preview the booking quote.
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
};

export default Booking;
