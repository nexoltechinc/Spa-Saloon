import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent, CalendarDays, Sparkles } from 'lucide-react';
import {
  SERVICE_ADDONS,
  SERVICE_CATEGORIES,
  SERVICE_SEED,
  STAFF_PRICING_RULES,
  formatDuration,
  formatPkr,
  getAddonsForService,
  getCategoryCountMap,
  getPackageItemsForService,
  getServicesByCategory,
} from '../config/serviceCatalog';
import './ServiceCatalogPages.css';

const statusMessage = 'Professional salon treatments, bridal packages, and smart pricing in one luxury catalog.';

const Services = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const activeServices = useMemo(
    () => SERVICE_SEED.filter((service) => service.status !== 'Inactive' && service.active !== false),
    [],
  );

  const categoryCountMap = useMemo(() => getCategoryCountMap(activeServices), [activeServices]);

  const visibleServices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return activeServices.filter((service) => {
      const matchesCategory = selectedCategory === 'all' || service.categoryId === selectedCategory;
      const matchesSearch =
        !search ||
        `${service.name} ${service.category} ${service.description} ${service.price}`.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [activeServices, searchTerm, selectedCategory]);

  const featuredServices = useMemo(
    () => SERVICE_CATEGORIES.flatMap((category) => getServicesByCategory(category.id, activeServices)).slice(0, 6),
    [activeServices],
  );

  const topAddons = useMemo(() => SERVICE_ADDONS.filter((addon) => addon.isActive).slice(0, 4), []);

  const staffRules = useMemo(() => STAFF_PRICING_RULES.filter((rule) => rule.isActive), []);

  const totalPackageItems = useMemo(
    () => activeServices.reduce((count, service) => count + getPackageItemsForService(service.id).length, 0),
    [activeServices],
  );

  const heroStats = [
    { label: 'Categories', value: SERVICE_CATEGORIES.length },
    { label: 'Live Services', value: activeServices.length },
    { label: 'Bridal Items', value: totalPackageItems },
    { label: 'Add-ons', value: topAddons.length },
  ];

  const selectedCategoryName = selectedCategory === 'all'
    ? 'All Services'
    : SERVICE_CATEGORIES.find((category) => category.id === selectedCategory)?.name || 'All Services';

  return (
    <div className="service-catalog-page">
      <section className="service-catalog-hero">
        <div className="service-catalog-hero-copy">
          <p className="service-catalog-kicker">Treatment / Services</p>
          <h1>Services & Pricing</h1>
          <p>{statusMessage}</p>

          <div className="service-catalog-actions">
            <label className="service-catalog-search">
              <Sparkles size={16} />
              <input
                type="search"
                placeholder="Search hair, facial, makeup, waxing, nails, spa..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <Link to="/booking" className="service-catalog-primary-link">
              Book a Treatment
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="service-catalog-hero-panel">
          <div className="service-catalog-panel-intro">
            <span>Price Preview</span>
            <strong>{formatPkr(activeServices[0]?.price || 0)}</strong>
            <p>{activeServices[0]?.name || 'Catalog Service'} starts the menu.</p>
          </div>
          <div className="service-catalog-stat-grid">
            {heroStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="service-catalog-nav">
        <button
          type="button"
          className={selectedCategory === 'all' ? 'is-active' : ''}
          onClick={() => setSelectedCategory('all')}
        >
          All Services <span>{activeServices.length}</span>
        </button>
        {SERVICE_CATEGORIES.map((category) => (
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

      <section className="service-catalog-content">
        <div className="service-catalog-main">
          <div className="service-catalog-section-head">
            <div>
              <p>Catalog View</p>
              <h2>{selectedCategoryName}</h2>
            </div>
            <span>{visibleServices.length} services visible</span>
          </div>

          <div className="service-catalog-grid">
            {visibleServices.map((service) => {
              const addonNames = getAddonsForService(service, SERVICE_ADDONS).map((addon) => addon.name);
              const packageItems = getPackageItemsForService(service.id);

              return (
                <article key={service.id} className="service-catalog-card">
                  <div className="service-catalog-card-top">
                    <div>
                      <span className="service-catalog-badge">{service.category}</span>
                      <h3>{service.name}</h3>
                    </div>
                    <strong>{formatPkr(service.price)}</strong>
                  </div>

                  <p>{service.description}</p>

                  <div className="service-catalog-metadata">
                    <span>
                      <CalendarDays size={14} />
                      {service.durationLabel || formatDuration(service)}
                    </span>
                    <span>
                      <BadgePercent size={14} />
                      Staff pricing ready
                    </span>
                  </div>

                  {addonNames.length ? (
                    <div className="service-catalog-chip-row">
                      {addonNames.slice(0, 3).map((addonName) => (
                        <span key={`${service.id}-${addonName}`} className="service-catalog-chip">
                          {addonName}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {packageItems.length ? (
                    <ul className="service-catalog-package-list">
                      {packageItems.map((item) => (
                        <li key={`${service.id}-${item.itemName}`}>{item.itemName}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="service-catalog-card-actions">
                    <Link to="/booking" className="service-catalog-secondary-link">
                      Continue to Booking
                    </Link>
                    <span>{service.durationMinutes} min</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="service-catalog-sidebar">
          <article className="service-catalog-side-card">
            <p className="service-catalog-side-kicker">Staff Pricing</p>
            <h3>Adjustment Tiers</h3>
            <div className="service-catalog-tier-list">
              {staffRules.map((rule) => (
                <div key={rule.id} className="service-catalog-tier-item">
                  <strong>{rule.label}</strong>
                  <span>{rule.adjustmentPercent}% uplift</span>
                </div>
              ))}
            </div>
          </article>

          <article className="service-catalog-side-card">
            <p className="service-catalog-side-kicker">Popular Add-ons</p>
            <h3>Salon Upgrades</h3>
            <div className="service-catalog-addon-list">
              {topAddons.map((addon) => (
                <div key={addon.id} className="service-catalog-addon-item">
                  <div>
                    <strong>{addon.name}</strong>
                    <p>{addon.description}</p>
                  </div>
                  <span>{formatPkr(addon.pricePkr)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="service-catalog-side-card service-catalog-side-highlight">
            <p className="service-catalog-side-kicker">Featured Treatments</p>
            <h3>Best Sellers</h3>
            <div className="service-catalog-featured-list">
              {featuredServices.map((service) => (
                <div key={service.id} className="service-catalog-featured-item">
                  <strong>{service.name}</strong>
                  <span>{formatPkr(service.price)} | {formatDuration(service)}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
};

export default Services;
