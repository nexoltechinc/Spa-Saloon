import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgePercent,
  Copy,
  Eye,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users2,
  WalletCards,
  X,
} from 'lucide-react';
import CrmShell from '../components/CrmShell';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmDelete, crmList, crmUpdate } from '../config/crmApi';
import {
  SERVICE_ADDONS,
  SERVICE_CATEGORIES,
  SERVICE_SEED,
  STAFF_PRICING_RULES,
  calculateServicePricing,
  formatDuration,
  formatPkr,
  getAddonsForService,
  getCategoryCountMap,
  isAddonApplicable,
  slugify,
} from '../config/serviceCatalog';
import './CrmServicesModern.css';

const statusOptions = ['All Statuses', 'Active', 'Inactive'];

const safeDateTime = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const normalizeCategory = (category, index = 0) => ({
  id: String(category?.id || category?.slug || slugify(category?.name) || `category-${index + 1}`),
  name: String(category?.name || category?.label || 'Category'),
  description: String(category?.description || ''),
  sortOrder: Number(category?.sortOrder ?? category?.sort_order ?? index + 1),
  isActive: category?.isActive !== false && category?.is_active !== false,
});

const normalizeAddon = (addon, index = 0) => ({
  id: String(addon?.id || `addon-${index + 1}`),
  name: String(addon?.name || 'Add-on'),
  pricePkr: Number(addon?.pricePkr ?? addon?.price_pkr ?? 0),
  description: String(addon?.description || ''),
  appliesToCategories: Array.isArray(addon?.appliesToCategories)
    ? addon.appliesToCategories
    : Array.isArray(addon?.applies_to_categories)
      ? addon.applies_to_categories
      : [],
  isActive: addon?.isActive !== false && addon?.is_active !== false,
  sortOrder: Number(addon?.sortOrder ?? addon?.sort_order ?? index + 1),
});

const normalizeStaffRule = (rule, index = 0) => ({
  id: String(rule?.id || `staff-rule-${index + 1}`),
  level: String(rule?.level || rule?.label || 'Junior Staff'),
  label: String(rule?.label || rule?.level || 'Junior Staff'),
  adjustmentPercent: Number(rule?.adjustmentPercent ?? rule?.adjustment_percent ?? 0),
  isActive: rule?.isActive !== false && rule?.is_active !== false,
  sortOrder: Number(rule?.sortOrder ?? rule?.sort_order ?? index + 1),
  notes: String(rule?.notes || ''),
});

const normalizePackageItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item, index) => ({
    itemName: String(item?.itemName || item?.name || item || '').trim(),
    included: item?.included !== false,
    sortOrder: Number(item?.sortOrder ?? item?.sort_order ?? index + 1),
    notes: String(item?.notes || ''),
  })).filter((item) => item.itemName);

const normalizeService = (service, index = 0) => {
  const category = String(service?.category || service?.serviceCategory || 'General');
  const status = String(service?.status || (service?.active === false ? 'Inactive' : 'Active'));
  const createdAt = service?.createdAt || service?.created_at || '';
  const updatedAt = service?.updatedAt || service?.updated_at || createdAt || '';

  return {
    id: String(service?.id || service?.serviceId || `service-${index + 1}`),
    name: String(service?.name || service?.serviceName || service?.title || 'Untitled Service'),
    category,
    categoryId: String(service?.categoryId || service?.category_id || slugify(category)),
    price: Number(service?.price ?? service?.amount ?? 0),
    minPricePkr:
      service?.minPricePkr !== undefined && service?.minPricePkr !== null && service?.minPricePkr !== ''
        ? Number(service.minPricePkr)
        : Number(service?.price ?? 0),
    maxPricePkr:
      service?.maxPricePkr !== undefined && service?.maxPricePkr !== null && service?.maxPricePkr !== ''
        ? Number(service.maxPricePkr)
        : Number(service?.price ?? 0),
    durationMinutes: Number(service?.durationMinutes ?? service?.duration ?? 60),
    durationLabel: String(service?.durationLabel || ''),
    description: String(service?.description || ''),
    status,
    active: status !== 'Inactive',
    bookingVisible: service?.bookingVisible !== false,
    posAvailable: service?.posAvailable !== false,
    defaultAddonIds: Array.isArray(service?.defaultAddonIds) ? service.defaultAddonIds.map((value) => String(value)) : [],
    taxRatePercent: Number(service?.taxRatePercent ?? 0),
    defaultDiscountAmountPkr: Number(service?.defaultDiscountAmountPkr ?? 0),
    priceReviewNeeded: Boolean(service?.priceReviewNeeded),
    priceLastUpdated: service?.priceLastUpdated || '',
    priceUpdatedBy: String(service?.priceUpdatedBy || 'System Sync'),
    packageItems: normalizePackageItems(service?.packageItems || service?.package_items || []),
    note: String(service?.note || service?.notes || ''),
    branchName: String(service?.branchName || ''),
    createdAt,
    updatedAt,
    raw: service,
  };
};

const buildServiceDraft = (service = {}) => ({
  id: String(service?.id || ''),
  name: String(service?.name || ''),
  category: String(service?.category || service?.categoryId || SERVICE_CATEGORIES[0]?.name || 'Hair Services'),
  price: String(service?.price ?? 0),
  minPricePkr: String(service?.minPricePkr ?? service?.price ?? 0),
  maxPricePkr: String(service?.maxPricePkr ?? service?.price ?? 0),
  durationMinutes: String(service?.durationMinutes ?? 60),
  durationLabel: String(service?.durationLabel || ''),
  description: String(service?.description || ''),
  status: String(service?.status || (service?.active === false ? 'Inactive' : 'Active')),
  bookingVisible: service?.bookingVisible !== false,
  posAvailable: service?.posAvailable !== false,
  taxRatePercent: String(service?.taxRatePercent ?? 0),
  defaultDiscountAmountPkr: String(service?.defaultDiscountAmountPkr ?? 0),
  defaultAddonIds: Array.isArray(service?.defaultAddonIds) ? service.defaultAddonIds.map((value) => String(value)) : [],
  packageItemsText: normalizePackageItems(service?.packageItems || []).map((item) => item.itemName).join('\n'),
  note: String(service?.note || ''),
});

const draftToPreviewService = (draft = {}) => ({
  id: draft.id || 'draft-service',
  name: draft.name || 'Untitled Service',
  category: draft.category || 'Hair Services',
  categoryId: slugify(draft.category || 'Hair Services'),
  price: Number(draft.price || 0),
  minPricePkr: Number(draft.minPricePkr || draft.price || 0),
  maxPricePkr: Number(draft.maxPricePkr || draft.price || 0),
  durationMinutes: Number(draft.durationMinutes || 60),
  durationLabel: draft.durationLabel || '',
  description: draft.description || '',
  status: draft.status || 'Active',
  active: String(draft.status || 'Active') !== 'Inactive',
  defaultAddonIds: Array.isArray(draft.defaultAddonIds) ? draft.defaultAddonIds : [],
  taxRatePercent: Number(draft.taxRatePercent || 0),
  defaultDiscountAmountPkr: Number(draft.defaultDiscountAmountPkr || 0),
  packageItems: draft.packageItemsText
    ? draft.packageItemsText.split('\n').map((itemName, index) => ({
        itemName: itemName.trim(),
        included: true,
        sortOrder: index + 1,
        notes: '',
      })).filter((item) => item.itemName)
    : [],
});

const buildServicePayload = (draft) => ({
  id: String(draft.id || '').trim(),
  name: String(draft.name || '').trim(),
  category: String(draft.category || '').trim(),
  price: Math.max(0, Math.round(Number(draft.price || 0))),
  minPricePkr: Math.max(0, Math.round(Number(draft.minPricePkr || 0))),
  maxPricePkr: Math.max(0, Math.round(Number(draft.maxPricePkr || 0))),
  durationMinutes: Math.max(0, Math.round(Number(draft.durationMinutes || 0))),
  durationLabel: String(draft.durationLabel || '').trim(),
  description: String(draft.description || '').trim(),
  status: String(draft.status || 'Active'),
  active: String(draft.status || 'Active') !== 'Inactive',
  bookingVisible: Boolean(draft.bookingVisible),
  posAvailable: Boolean(draft.posAvailable),
  taxRatePercent: Math.max(0, Math.round(Number(draft.taxRatePercent || 0))),
  defaultDiscountAmountPkr: Math.max(0, Math.round(Number(draft.defaultDiscountAmountPkr || 0))),
  defaultAddonIds: Array.isArray(draft.defaultAddonIds) ? draft.defaultAddonIds.filter(Boolean) : [],
  packageItems: draft.packageItemsText
    ? draft.packageItemsText.split('\n').map((itemName, index) => ({
        itemName: itemName.trim(),
        included: true,
        sortOrder: index + 1,
        notes: '',
      })).filter((item) => item.itemName)
    : [],
  note: String(draft.note || '').trim(),
});

const getPriceRangeLabel = (service) => {
  if (!service) return formatPkr(0);
  const minPrice = Number(service.minPricePkr ?? service.price ?? 0);
  const maxPrice = Number(service.maxPricePkr ?? service.price ?? 0);
  if (minPrice && maxPrice && minPrice !== maxPrice) {
    return `${formatPkr(minPrice)} - ${formatPkr(maxPrice)}`;
  }
  return formatPkr(service.price ?? minPrice);
};

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'good';
  if (normalized === 'inactive') return 'alert';
  return 'neutral';
};

const CrmServicesModern = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState(SERVICE_CATEGORIES);
  const [addons, setAddons] = useState(SERVICE_ADDONS);
  const [staffRules, setStaffRules] = useState(STAFF_PRICING_RULES);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState('view');
  const [draft, setDraft] = useState(() => buildServiceDraft());
  const [draftError, setDraftError] = useState('');
  const [pricingAddonIds, setPricingAddonIds] = useState([]);
  const [pricingStaffLevel, setPricingStaffLevel] = useState(STAFF_PRICING_RULES[0]?.label || 'Junior Staff');
  const [pricingDiscountAmount, setPricingDiscountAmount] = useState('0');
  const [pricingTaxPercent, setPricingTaxPercent] = useState('0');

  useEffect(() => {
    let mounted = true;

    const loadCatalog = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [servicesResult, categoriesResult, addonsResult, rulesResult] = await Promise.allSettled([
          crmList('services'),
          crmList('service-categories'),
          crmList('service-addons'),
          crmList('staff-pricing-rules'),
        ]);

        if (!mounted) return;

        const loadedServices = servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value) && servicesResult.value.length
          ? servicesResult.value.map(normalizeService)
          : SERVICE_SEED.map(normalizeService);
        const loadedCategories = categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value) && categoriesResult.value.length
          ? categoriesResult.value.map(normalizeCategory)
          : SERVICE_CATEGORIES.map(normalizeCategory);
        const loadedAddons = addonsResult.status === 'fulfilled' && Array.isArray(addonsResult.value) && addonsResult.value.length
          ? addonsResult.value.map(normalizeAddon)
          : SERVICE_ADDONS.map(normalizeAddon);
        const loadedRules = rulesResult.status === 'fulfilled' && Array.isArray(rulesResult.value) && rulesResult.value.length
          ? rulesResult.value.map(normalizeStaffRule)
          : STAFF_PRICING_RULES.map(normalizeStaffRule);

        const syncNotes = [
          servicesResult.status === 'rejected' ? 'services' : null,
          categoriesResult.status === 'rejected' ? 'categories' : null,
          addonsResult.status === 'rejected' ? 'addons' : null,
          rulesResult.status === 'rejected' ? 'pricing rules' : null,
        ].filter(Boolean);

        setServices(loadedServices);
        setCategories(loadedCategories);
        setAddons(loadedAddons);
        setStaffRules(loadedRules);
        setSelectedServiceId((current) => (loadedServices.some((service) => service.id === current) ? current : loadedServices[0]?.id || ''));
        setDraft(buildServiceDraft(loadedServices[0] || {}));
        setLoadError(syncNotes.length ? `Live sync is partial. Falling back on default ${syncNotes.join(', ')}.` : '');
      } catch (error) {
        if (!mounted) return;
        setServices(SERVICE_SEED.map(normalizeService));
        setCategories(SERVICE_CATEGORIES.map(normalizeCategory));
        setAddons(SERVICE_ADDONS.map(normalizeAddon));
        setStaffRules(STAFF_PRICING_RULES.map(normalizeStaffRule));
        setLoadError(error?.message || 'Unable to load service catalog.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const selected = services.find((service) => service.id === selectedServiceId) || services[0] || null;
    if (!selected) return;
    setDraft(buildServiceDraft(selected));
    setPricingAddonIds(selected.defaultAddonIds?.length ? selected.defaultAddonIds : []);
    setPricingStaffLevel(STAFF_PRICING_RULES[0]?.label || 'Junior Staff');
    setPricingDiscountAmount(String(selected.defaultDiscountAmountPkr || 0));
    setPricingTaxPercent(String(selected.taxRatePercent || 0));
  }, [selectedServiceId, services]);

  const categoryCountMap = useMemo(() => getCategoryCountMap(services), [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const searchable = `${service.name} ${service.category} ${service.description} ${service.price}`.toLowerCase();
      const matchesSearch = !searchTerm || searchable.includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All Categories' || service.category === categoryFilter;
      const matchesStatus = statusFilter === 'All Statuses' || service.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((left, right) => {
      if (left.status !== right.status) return left.status === 'Active' ? -1 : 1;
      return left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
    });
  }, [categoryFilter, searchTerm, services, statusFilter]);

  const selectedService = useMemo(
    () => filteredServices.find((service) => service.id === selectedServiceId) || filteredServices[0] || null,
    [filteredServices, selectedServiceId],
  );

  const previewService = editorMode === 'edit' || editorMode === 'create' ? draftToPreviewService(draft) : selectedService;

  const selectedApplicableAddons = useMemo(
    () => (previewService ? getAddonsForService(previewService, addons) : []),
    [addons, previewService],
  );

  const priceQuote = useMemo(() => {
    if (!previewService) {
      return null;
    }

    return calculateServicePricing(previewService, {
      selectedAddonIds: pricingAddonIds,
      staffLevel: pricingStaffLevel,
      discountAmount: pricingDiscountAmount,
      taxRatePercent: pricingTaxPercent,
      addonCatalog: addons,
      staffRules,
    });
  }, [addons, pricingAddonIds, pricingDiscountAmount, pricingStaffLevel, pricingTaxPercent, previewService, staffRules]);

  const previewStaffQuotes = useMemo(() => {
    if (!previewService) return [];
    return staffRules
      .filter((rule) => rule.isActive)
      .map((rule) => ({
        ...rule,
        quote: calculateServicePricing(previewService, {
          selectedAddonIds: pricingAddonIds,
          staffLevel: rule.label,
          discountAmount: pricingDiscountAmount,
          taxRatePercent: pricingTaxPercent,
          addonCatalog: addons,
          staffRules,
        }),
      }));
  }, [addons, pricingAddonIds, pricingDiscountAmount, pricingTaxPercent, previewService, staffRules]);

  const summaryCards = useMemo(() => {
    const total = services.length;
    const active = services.filter((service) => service.status === 'Active').length;
    const inactive = total - active;
    const packageServices = services.filter((service) => service.packageItems.length > 0).length;
    const averagePrice = total
      ? Math.round(services.reduce((sum, service) => sum + Number(service.price || 0), 0) / total)
      : 0;

    return [
      { label: 'Total Services', value: total, subtext: 'Across all salon categories' },
      { label: 'Active Services', value: active, subtext: 'Visible in booking and billing' },
      { label: 'Inactive', value: inactive, subtext: 'Kept in history and disabled from booking' },
      { label: 'Bridal Packages', value: packageServices, subtext: 'Services with package item lists' },
      { label: 'Average Base', value: formatPkr(averagePrice), subtext: 'Average catalog base price' },
    ];
  }, [services]);

  const openEditor = (service = null, mode = 'edit') => {
    const source = service || selectedService || {};
    setEditorMode(mode);
    setDraft(buildServiceDraft(source));
    setDraftError('');
    if (source.id) {
      setSelectedServiceId(source.id);
    }
  };

  const resetEditor = () => {
    setEditorMode('view');
    setDraftError('');
    if (selectedService) {
      setDraft(buildServiceDraft(selectedService));
    }
  };

  const saveService = async (event) => {
    event.preventDefault();
    setDraftError('');

    if (!String(draft.name || '').trim()) {
      setDraftError('Service name is required.');
      return;
    }

    if (!String(draft.category || '').trim()) {
      setDraftError('Category is required.');
      return;
    }

    const priceValue = Math.max(0, Math.round(Number(draft.price || 0)));
    const durationValue = Math.max(0, Math.round(Number(draft.durationMinutes || 0)));
    if (priceValue <= 0) {
      setDraftError('Price must be positive.');
      return;
    }
    if (durationValue <= 0) {
      setDraftError('Duration is required.');
      return;
    }

    const duplicate = services.some(
      (service) =>
        service.id !== draft.id &&
        service.category.toLowerCase() === String(draft.category || '').trim().toLowerCase() &&
        service.name.toLowerCase() === String(draft.name || '').trim().toLowerCase(),
    );
    if (duplicate) {
      setDraftError('Duplicate service names in the same category are not allowed.');
      return;
    }

    setSaving(true);
    const payload = buildServicePayload(draft);

    try {
      const saved = editorMode === 'create'
        ? await crmCreate('services', payload)
        : await crmUpdate('services', payload.id || draft.id, payload);
      const normalized = normalizeService(saved, services.length);

      setServices((current) => {
        const next = current.filter((service) => service.id !== normalized.id);
        return [normalized, ...next];
      });
      setSelectedServiceId(normalized.id);
      setEditorMode('view');
      setDraft(buildServiceDraft(normalized));
    } catch (error) {
      setDraftError(error?.message || 'Unable to save service.');
    } finally {
      setSaving(false);
    }
  };

  const patchService = async (serviceId, updates) => {
    const current = services.find((service) => service.id === serviceId);
    if (!current) return;

    const optimistic = normalizeService({ ...current.raw, ...updates, id: serviceId }, 0);
    setServices((list) => list.map((service) => (service.id === serviceId ? optimistic : service)));

    try {
      const saved = await crmUpdate('services', serviceId, updates);
      const normalized = normalizeService(saved, 0);
      setServices((list) => list.map((service) => (service.id === serviceId ? normalized : service)));
    } catch (error) {
      setServices((list) => list.map((service) => (service.id === serviceId ? current : service)));
      setLoadError(error?.message || 'Service update failed.');
    }
  };

  const toggleServiceStatus = async (service) => {
    const nextStatus = service.status === 'Active' ? 'Inactive' : 'Active';
    await patchService(service.id, {
      status: nextStatus,
      active: nextStatus === 'Active',
      bookingVisible: nextStatus === 'Active',
      posAvailable: nextStatus === 'Active',
    });
  };

  const duplicateService = async (service) => {
    const copyPayload = buildServicePayload({
      ...service,
      id: '',
      name: `${service.name} Copy`,
    });

    try {
      const created = await crmCreate('services', copyPayload);
      const normalized = normalizeService(created, services.length);
      setServices((current) => [normalized, ...current]);
      setSelectedServiceId(normalized.id);
      setEditorMode('view');
    } catch (error) {
      setLoadError(error?.message || 'Service duplication failed.');
    }
  };

  const deleteService = async (service) => {
    const confirmed = window.confirm(`Archive ${service.name}? Inactive services stay in history but stop appearing in booking.`);
    if (!confirmed) return;

    try {
      await crmDelete('services', service.id);
      setServices((current) => current.map((item) => (
        item.id === service.id
          ? { ...item, status: 'Inactive', active: false, bookingVisible: false, posAvailable: false }
          : item
      )));
      if (selectedServiceId === service.id) {
        setSelectedServiceId(services.find((item) => item.id !== service.id)?.id || '');
      }
    } catch (error) {
      setLoadError(error?.message || 'Service archive failed.');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All Categories');
    setStatusFilter('All Statuses');
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <CrmShell shellClassName="crm-services-modern-shell">
      <main className="crm-services-modern-main">
        <header className="crm-services-modern-hero">
          <div className="crm-services-modern-hero-copy">
            <p className="crm-services-modern-kicker">Treatments / Services</p>
            <h1>Services & Pricing</h1>
            <p>
              Manage the salon menu, service packages, add-ons, and pricing rules from one premium control center.
            </p>
            {loadError ? <div className="crm-services-modern-banner">{loadError}</div> : null}
          </div>

          <div className="crm-services-modern-actions">
            <label className="crm-services-modern-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search by service, category, or price..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <button type="button" className="crm-services-modern-ghost" onClick={clearFilters}>
              Clear Filters
            </button>
            <button type="button" className="crm-services-modern-ghost" onClick={() => openEditor(null, 'create')}>
              <Plus size={16} />
              Add Service
            </button>
            <button type="button" className="crm-services-modern-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-services-modern-stats">
          {summaryCards.map((card) => (
            <article key={card.label} className="crm-services-modern-stat-card">
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        <section className="crm-services-modern-filters">
          <div className="crm-services-modern-filter-tabs">
            <button
              type="button"
              className={categoryFilter === 'All Categories' ? 'is-active' : ''}
              onClick={() => setCategoryFilter('All Categories')}
            >
              All Categories
            </button>
            {categories
              .filter((category) => category.isActive)
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={categoryFilter === category.name ? 'is-active' : ''}
                  onClick={() => setCategoryFilter(category.name)}
                >
                  {category.name}
                  <span>{categoryCountMap.get(category.id) || 0}</span>
                </button>
              ))}
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </section>

        <section className="crm-services-modern-grid">
          <article className="crm-services-modern-list-panel">
            <div className="crm-services-modern-list-head">
              <div>
                <p>Catalog</p>
                <h2>{filteredServices.length} services</h2>
              </div>
              <button type="button" className="crm-services-modern-secondary" onClick={() => openEditor(null, 'create')}>
                <Plus size={16} />
                New Service
              </button>
            </div>

            <div className="crm-services-modern-list">
              {isLoading ? (
                <div className="crm-services-modern-empty">
                  <Sparkles size={30} />
                  <h3>Loading service catalog</h3>
                  <p>Pulling live services, categories, add-ons, and pricing rules from the CRM backend.</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="crm-services-modern-empty">
                  <Users2 size={30} />
                  <h3>No services found</h3>
                  <p>Try loosening the filters or add a fresh treatment to the catalog.</p>
                </div>
              ) : (
                filteredServices.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <article
                      key={service.id}
                      className={`crm-services-modern-service-row${isSelected ? ' is-selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedServiceId(service.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedServiceId(service.id);
                        }
                      }}
                    >
                      <div className="crm-services-modern-service-main">
                        <div className="crm-services-modern-service-title">
                          <strong>{service.name}</strong>
                          <span className={`crm-services-modern-badge tone-${getStatusTone(service.status)}`}>{service.status}</span>
                        </div>
                        <p>{service.category}</p>
                      </div>

                      <div className="crm-services-modern-service-meta">
                        <span>{getPriceRangeLabel(service)}</span>
                        <small>{service.durationLabel || formatDuration(service)}</small>
                      </div>

                      <div className="crm-services-modern-service-tools">
                        <button type="button" onClick={(event) => { event.stopPropagation(); openEditor(service, 'edit'); }} aria-label="Edit service">
                          <PencilLine size={16} />
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); duplicateService(service); }} aria-label="Duplicate service">
                          <Copy size={16} />
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); toggleServiceStatus(service); }} aria-label="Toggle service status">
                          {service.status === 'Active' ? <X size={16} /> : <Eye size={16} />}
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); deleteService(service); }} aria-label="Archive service">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </article>

          <aside className="crm-services-modern-detail-panel">
            {editorMode !== 'view' ? (
              <form className="crm-services-modern-editor" onSubmit={saveService}>
                <div className="crm-services-modern-editor-head">
                  <div>
                    <p>{editorMode === 'create' ? 'Create service' : 'Edit service'}</p>
                    <h2>{draft.name || 'Untitled Service'}</h2>
                    <span>Make the service menu consistent across booking, POS, and receipts.</span>
                  </div>
                  <button type="button" className="crm-services-modern-icon-btn" onClick={resetEditor} aria-label="Close editor">
                    <X size={18} />
                  </button>
                </div>

                {draftError ? <div className="crm-services-modern-error">{draftError}</div> : null}

                <div className="crm-services-modern-editor-grid">
                  <label>
                    <span>Service Name</span>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Category</span>
                    <select
                      value={draft.category}
                      onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Base Price (PKR)</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.price}
                      onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Min Price</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.minPricePkr}
                      onChange={(event) => setDraft((current) => ({ ...current, minPricePkr: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Max Price</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.maxPricePkr}
                      onChange={(event) => setDraft((current) => ({ ...current, maxPricePkr: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Duration (minutes)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={draft.durationMinutes}
                      onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Duration Label</span>
                    <input
                      type="text"
                      placeholder="3-4 hours or 45 min"
                      value={draft.durationLabel}
                      onChange={(event) => setDraft((current) => ({ ...current, durationLabel: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Status</span>
                    <select
                      value={draft.status}
                      onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </label>
                  <label>
                    <span>Tax Rate (%)</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.taxRatePercent}
                      onChange={(event) => setDraft((current) => ({ ...current, taxRatePercent: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Default Discount (PKR)</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.defaultDiscountAmountPkr}
                      onChange={(event) => setDraft((current) => ({ ...current, defaultDiscountAmountPkr: event.target.value }))}
                    />
                  </label>
                  <label className="crm-services-modern-editor-full">
                    <span>Description</span>
                    <textarea
                      rows={4}
                      value={draft.description}
                      onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                  <label className="crm-services-modern-editor-full">
                    <span>Default Add-ons</span>
                    <div className="crm-services-modern-addon-pills">
                      {addons
                        .filter((addon) => addon.isActive && isAddonApplicable(addon, draftToPreviewService(draft)))
                        .map((addon) => {
                          const checked = draft.defaultAddonIds.includes(addon.id);
                          return (
                            <button
                              key={addon.id}
                              type="button"
                              className={checked ? 'is-active' : ''}
                              onClick={() => {
                                setDraft((current) => ({
                                  ...current,
                                  defaultAddonIds: checked
                                    ? current.defaultAddonIds.filter((value) => value !== addon.id)
                                    : [...current.defaultAddonIds, addon.id],
                                }));
                              }}
                            >
                              {addon.name}
                              <small>{formatPkr(addon.pricePkr)}</small>
                            </button>
                          );
                        })}
                    </div>
                  </label>
                  <label className="crm-services-modern-editor-full">
                    <span>Bridal / Package Items</span>
                    <textarea
                      rows={5}
                      placeholder="One item per line"
                      value={draft.packageItemsText}
                      onChange={(event) => setDraft((current) => ({ ...current, packageItemsText: event.target.value }))}
                    />
                  </label>
                  <label className="crm-services-modern-editor-full">
                    <span>Internal Note</span>
                    <textarea
                      rows={3}
                      value={draft.note}
                      onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="crm-services-modern-editor-actions">
                  <button type="submit" className="crm-services-modern-primary" disabled={saving}>
                    {saving ? 'Saving...' : editorMode === 'create' ? 'Create Service' : 'Save Changes'}
                  </button>
                  <button type="button" className="crm-services-modern-secondary" onClick={resetEditor} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="crm-services-modern-preview">
                {selectedService ? (
                  <>
                    <div className="crm-services-modern-preview-head">
                      <div>
                        <p>{selectedService.category}</p>
                        <h2>{selectedService.name}</h2>
                        <span>{selectedService.description}</span>
                      </div>
                      <span className={`crm-services-modern-badge tone-${getStatusTone(selectedService.status)}`}>
                        {selectedService.status}
                      </span>
                    </div>

                    <div className="crm-services-modern-price-hero">
                      <div>
                        <p>Price Preview</p>
                        <strong>{priceQuote ? formatPkr(priceQuote.finalPrice) : getPriceRangeLabel(selectedService)}</strong>
                        <span>{selectedService.durationLabel || formatDuration(selectedService)} | {selectedService.branchName || 'Catalog item'}</span>
                      </div>
                      <BadgePercent size={28} />
                    </div>

                    <div className="crm-services-modern-preview-grid">
                      <div>
                        <span>Base Price</span>
                        <strong>{formatPkr(priceQuote?.basePrice ?? selectedService.price)}</strong>
                      </div>
                      <div>
                        <span>Add-ons</span>
                        <strong>{formatPkr(priceQuote?.addonTotal ?? 0)}</strong>
                      </div>
                      <div>
                        <span>Staff Uplift</span>
                        <strong>{formatPkr(priceQuote?.staffAdjustmentAmount ?? 0)}</strong>
                      </div>
                      <div>
                        <span>Tax</span>
                        <strong>{formatPkr(priceQuote?.taxAmount ?? 0)}</strong>
                      </div>
                    </div>

                    <div className="crm-services-modern-controls">
                      <label>
                        <span>Staff Level</span>
                        <select value={pricingStaffLevel} onChange={(event) => setPricingStaffLevel(event.target.value)}>
                          {staffRules.filter((rule) => rule.isActive).map((rule) => (
                            <option key={rule.id} value={rule.label}>
                              {rule.label} (+{rule.adjustmentPercent}%)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Discount (PKR)</span>
                        <input type="number" min="0" step="1" value={pricingDiscountAmount} onChange={(event) => setPricingDiscountAmount(event.target.value)} />
                      </label>
                      <label>
                        <span>Tax (%)</span>
                        <input type="number" min="0" step="1" value={pricingTaxPercent} onChange={(event) => setPricingTaxPercent(event.target.value)} />
                      </label>
                    </div>

                    <div className="crm-services-modern-addon-selector">
                      <div className="crm-services-modern-section-title">
                        <h3>Add-ons</h3>
                        <span>{selectedApplicableAddons.length} available</span>
                      </div>
                      <div className="crm-services-modern-addon-list">
                        {selectedApplicableAddons.map((addon) => {
                          const checked = pricingAddonIds.includes(addon.id);
                          return (
                            <button
                              key={addon.id}
                              type="button"
                              className={checked ? 'is-active' : ''}
                              onClick={() => {
                                setPricingAddonIds((current) =>
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

                    {selectedService.packageItems.length ? (
                      <div className="crm-services-modern-package-list">
                        <div className="crm-services-modern-section-title">
                          <h3>Package Items</h3>
                          <span>{selectedService.packageItems.length} included items</span>
                        </div>
                        <ul>
                          {selectedService.packageItems.map((item) => (
                            <li key={`${selectedService.id}-${item.sortOrder}-${item.itemName}`}>
                              <span>{item.itemName}</span>
                              <small>{item.included ? 'Included' : 'Optional'}</small>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="crm-services-modern-staff-grid">
                      <div className="crm-services-modern-section-title">
                        <h3>Staff Pricing Preview</h3>
                        <span>Junior, senior, and expert tiers</span>
                      </div>
                      <div className="crm-services-modern-staff-chips">
                        {previewStaffQuotes.map((rule) => (
                          <div key={rule.id} className="crm-services-modern-staff-chip">
                            <strong>{rule.label}</strong>
                            <span>{formatPkr(rule.quote.finalPrice)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="crm-services-modern-meta">
                      <div>
                        <span>Created</span>
                        <strong>{safeDateTime(selectedService.createdAt)}</strong>
                      </div>
                      <div>
                        <span>Updated</span>
                        <strong>{safeDateTime(selectedService.updatedAt)}</strong>
                      </div>
                      <div>
                        <span>Price Updated By</span>
                        <strong>{selectedService.priceUpdatedBy}</strong>
                      </div>
                      <div>
                        <span>Price Updated</span>
                        <strong>{safeDateTime(selectedService.priceLastUpdated)}</strong>
                      </div>
                    </div>

                    <div className="crm-services-modern-preview-actions">
                      <button type="button" className="crm-services-modern-primary" onClick={() => openEditor(selectedService, 'edit')}>
                        <PencilLine size={16} />
                        Edit Service
                      </button>
                      <button type="button" className="crm-services-modern-secondary" onClick={() => duplicateService(selectedService)}>
                        <Copy size={16} />
                        Duplicate
                      </button>
                      <button type="button" className="crm-services-modern-secondary" onClick={() => toggleServiceStatus(selectedService)}>
                        {selectedService.status === 'Active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="crm-services-modern-empty">
                    <WalletCards size={30} />
                    <h3>Select a service</h3>
                    <p>Choose a service on the left to review pricing, add-ons, package items, and staff-tier adjustments.</p>
                  </div>
                )}
              </div>
            )}
          </aside>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmServicesModern;
