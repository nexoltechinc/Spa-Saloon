import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CrmShell from '../components/CrmShell';
import ServiceDetailPanel from '../components/services/ServiceDetailPanel';
import ServiceRow from '../components/services/ServiceRow';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmList, crmUpdate } from '../config/crmApi';
import './CrmServices.css';

const basePackageReadiness = {
  includedInPackage: false,
  promotionEligible: false,
  membershipService: false,
  featuredWebsite: false,
};

const baseService = {
  previousPrice: null,
  priceReviewNeeded: false,
  priceLastUpdated: '2026-01-01T09:00:00',
  priceUpdatedBy: 'System Sync',
  assignedStaff: [],
  active: true,
  bookingVisible: true,
  posAvailable: true,
  description: '',
  note: '',
  updatedBy: 'System Sync',
  bookingsWeek: 0,
  bookingsMonth: 0,
  revenueMonth: 0,
  lastBooked: '',
  popularityRank: 9,
  packageReadiness: basePackageReadiness,
};

const withDefaults = (service) => ({
  ...baseService,
  ...service,
  packageReadiness: {
    ...basePackageReadiness,
    ...(service.packageReadiness || {}),
  },
});

const serviceSeed = [
  withDefaults({
    id: 'SRV-101',
    name: 'Signature Facial',
    category: 'Facial',
    duration: 60,
    price: 120,
    previousPrice: 110,
    priceLastUpdated: '2026-03-21T10:30:00',
    priceUpdatedBy: 'Owner - Nadine',
    assignedStaff: ['Elena Vance', 'Sarah Bloom', 'Luna Hart'],
    description: 'Transformative facial with custom exfoliation and hydration infusion.',
    note: 'Popular with premium package clients and bridal prep plans.',
    lastUpdated: '2026-04-08T11:20:00',
    updatedBy: 'Manager - Olivia',
    bookingsWeek: 9,
    bookingsMonth: 36,
    revenueMonth: 4320,
    lastBooked: '2026-04-13T11:20:00',
    popularityRank: 2,
    packageReadiness: { includedInPackage: true, promotionEligible: true, membershipService: true, featuredWebsite: true },
  }),
  withDefaults({
    id: 'SRV-102', name: 'Deep Tissue Massage', category: 'Massage', duration: 90, price: 150, previousPrice: 145,
    priceLastUpdated: '2026-01-18T09:45:00', priceUpdatedBy: 'Manager - Olivia', assignedStaff: ['Marcus Cole', 'Sarah Bloom'],
    description: 'High-pressure therapeutic session focused on chronic muscle tension.',
    note: 'Frequently paired with aromatherapy add-on at checkout.', lastUpdated: '2026-04-02T09:45:00', updatedBy: 'Manager - Olivia',
    bookingsWeek: 7, bookingsMonth: 28, revenueMonth: 4200, lastBooked: '2026-04-14T14:20:00', popularityRank: 3, priceReviewNeeded: true,
    packageReadiness: { includedInPackage: true, membershipService: true, featuredWebsite: true },
  }),
  withDefaults({
    id: 'SRV-103', name: 'Aromatherapy Session', category: 'Massage', duration: 60, price: 135, previousPrice: 128,
    priceLastUpdated: '2025-12-06T15:10:00', priceUpdatedBy: 'Owner - Nadine', assignedStaff: ['Marcus Cole', 'Elena Vance'],
    description: 'Relaxation-focused therapy combining aroma blends with gentle pressure.',
    note: 'Price review pending for Q3 package and website promo feature.', lastUpdated: '2026-03-30T15:10:00', updatedBy: 'Owner - Nadine',
    bookingsWeek: 4, bookingsMonth: 14, revenueMonth: 1890, lastBooked: '2026-04-11T13:45:00', popularityRank: 5, priceReviewNeeded: true,
    packageReadiness: { promotionEligible: true, membershipService: true },
  }),
  withDefaults({
    id: 'SRV-104', name: 'Hot Stone Therapy', category: 'Massage', duration: 75, price: 160,
    priceLastUpdated: '2025-11-12T17:40:00', assignedStaff: [], active: false, bookingVisible: false,
    description: 'Warm stone pressure technique for circulation and stress relief.',
    note: 'Temporarily inactive due to staff training refresh and protocol checks.',
    lastUpdated: '2026-02-14T17:40:00', updatedBy: 'Manager - Olivia', lastBooked: '2026-01-08T16:20:00', popularityRank: 8,
  }),
  withDefaults({
    id: 'SRV-105', name: 'Scalp Renewal Ritual', category: 'Hair Treatment', duration: 45, price: 95, previousPrice: 90,
    priceLastUpdated: '2026-03-28T10:05:00', priceUpdatedBy: 'Manager - Olivia', assignedStaff: ['Luna Hart', 'Mia Grant'],
    description: 'Detox scalp cleanse with serum massage and warm towel finish.',
    note: 'Strong add-on attach rate before blowout and styling services.',
    lastUpdated: '2026-04-11T10:05:00', updatedBy: 'Reception Coordinator - Amina', bookingsWeek: 5, bookingsMonth: 18, revenueMonth: 1710,
    lastBooked: '2026-04-12T09:10:00', popularityRank: 4, packageReadiness: { includedInPackage: true, promotionEligible: true },
  }),
  withDefaults({
    id: 'SRV-106', name: 'Hydra Glow Infusion', category: 'Skincare', duration: 75, price: 185, previousPrice: 170,
    priceLastUpdated: '2026-02-22T13:20:00', priceUpdatedBy: 'Owner - Nadine', assignedStaff: ['Elena Vance', 'Noor Hale'],
    description: 'Multi-step hydration infusion with oxygen mist and collagen finish.',
    note: 'High conversion from bridal and event clients. Strong premium demand.',
    lastUpdated: '2026-04-09T13:20:00', updatedBy: 'Owner - Nadine', bookingsWeek: 10, bookingsMonth: 41, revenueMonth: 7585,
    lastBooked: '2026-04-15T09:50:00', popularityRank: 1,
    packageReadiness: { includedInPackage: true, promotionEligible: true, membershipService: true, featuredWebsite: true },
  }),
  withDefaults({
    id: 'SRV-107', name: 'Aromatherapy Steam Escape', category: 'Massage', duration: 105, price: 225, previousPrice: 210,
    priceLastUpdated: '2025-10-19T16:50:00', priceUpdatedBy: 'Owner - Nadine', assignedStaff: ['Marcus Cole'], posAvailable: false,
    description: 'Extended massage with guided steam cycle and botanical oils.',
    note: 'Premium package candidate for seasonal promotions and memberships.',
    lastUpdated: '2026-04-07T16:50:00', updatedBy: 'Manager - Olivia', bookingsWeek: 2, bookingsMonth: 6, revenueMonth: 1350,
    lastBooked: '2026-03-19T16:15:00', popularityRank: 7, priceReviewNeeded: true,
    packageReadiness: { promotionEligible: true, featuredWebsite: true },
  }),
  withDefaults({
    id: 'SRV-108', name: 'Wellness Intake Consultation', category: 'Consultation', duration: 30, price: 55,
    priceLastUpdated: '2026-01-05T08:35:00', assignedStaff: [], description: '',
    note: 'Intake workflow is being revised before relaunching as member-first funnel.',
    lastUpdated: '2026-03-06T08:35:00', updatedBy: 'Manager - Olivia', bookingsWeek: 1, bookingsMonth: 2, revenueMonth: 110,
    lastBooked: '2026-02-25T08:00:00', popularityRank: 9, packageReadiness: { membershipService: true },
  }),
];

const categoryOptions = ['Facial', 'Massage', 'Hair Treatment', 'Skincare', 'Consultation'];
const statusOptions = ['All Statuses', 'Active', 'Inactive'];
const durationOptions = ['Any Duration', 'Under 60 min', '60-90 min', 'Over 90 min'];

const roleCapabilities = {
  owner: { manageServices: true, managePricing: true, manageAssignments: true },
  manager: { manageServices: true, managePricing: true, manageAssignments: true },
  receptionist: { manageServices: false, managePricing: false, manageAssignments: false },
  admin: { manageServices: true, managePricing: true, manageAssignments: true },
};

const defaultRole = 'manager';
const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown');
const formatRelativeDate = (value) => {
  if (!value) return 'recently';
  const diffDays = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24)));
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.round(diffDays / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
};

const normalizeService = (service, index = 0) => {
  const merged = withDefaults(service);
  const price = Number(merged.price ?? merged.amount ?? merged.cost ?? 0);
  const assignedStaff = Array.isArray(merged.assignedStaff)
    ? merged.assignedStaff
    : Array.isArray(merged.staff)
      ? merged.staff
      : merged.assignedStaff
        ? [String(merged.assignedStaff)]
        : [];
  return {
    ...merged,
    id: merged.id || merged._id || merged.serviceId || `service-${index + 1}`,
    name: merged.name || merged.serviceName || merged.title || 'Untitled Service',
    category: merged.category || merged.serviceCategory || merged.service_category || 'General',
    duration: Number(merged.duration ?? merged.durationMinutes ?? merged.length ?? merged.duration_minutes ?? 60),
    price,
    previousPrice: Number(merged.previousPrice ?? price),
    assignedStaff,
    active: Boolean(merged.active ?? merged.isActive ?? true),
    bookingVisible: Boolean(merged.bookingVisible ?? merged.bookable ?? true),
    posAvailable: Boolean(merged.posAvailable ?? merged.posVisible ?? true),
    description: merged.description || merged.summary || '',
    note: merged.note || merged.notes || '',
    lastUpdated: merged.lastUpdated || merged.updatedAt || merged.updated_at || new Date().toISOString(),
    updatedBy: merged.updatedBy || merged.editor || 'System Sync',
    priceLastUpdated: merged.priceLastUpdated || merged.priceUpdatedAt || merged.pricingUpdatedAt || merged.lastUpdated || new Date().toISOString(),
    priceUpdatedBy: merged.priceUpdatedBy || merged.priceEditedBy || merged.updatedBy || 'System Sync',
    bookingsWeek: Number(merged.bookingsWeek ?? 0),
    bookingsMonth: Number(merged.bookingsMonth ?? 0),
    revenueMonth: Number(merged.revenueMonth ?? Number(merged.bookingsMonth ?? 0) * price),
    lastBooked: merged.lastBooked || merged.lastBookingAt || merged.lastBookedAt || '',
    popularityRank: Number(merged.popularityRank ?? 9),
  };
};

const getStaffCoverage = (service) => {
  if (service.assignedStaff.length === 0) return { label: 'No Staff Assigned', tone: 'risk', level: 'none' };
  if (service.assignedStaff.length === 1) return { label: 'Limited Coverage', tone: 'warning', level: 'limited' };
  return { label: 'Healthy Coverage', tone: 'good', level: 'healthy' };
};

const getOperationalState = (service, coverage) => {
  if (!service.active) return { label: 'Inactive', detail: 'Retained for reporting history. Not offered in active channels.', tone: 'neutral' };
  if (service.active && service.bookingVisible && service.posAvailable && coverage.level !== 'none') {
    return { label: 'Offer Ready', detail: `${coverage.label}. Customers can book online and reception can check out in POS.`, tone: 'good' };
  }
  if (service.active && service.bookingVisible && coverage.level === 'none') {
    return { label: 'Booking Risk', detail: 'Bookable but no staff assigned. Disable booking or assign therapists immediately.', tone: 'risk' };
  }
  if (service.active && !service.bookingVisible && service.posAvailable) return { label: 'POS Only', detail: 'Service can be sold by front desk but cannot be booked online.', tone: 'warning' };
  if (service.active && service.bookingVisible && !service.posAvailable) return { label: 'Booking Only', detail: 'Customers can book, but service is hidden in POS checkout.', tone: 'warning' };
  return { label: 'Visibility Limited', detail: 'Review booking and POS visibility to ensure smooth operations.', tone: 'warning' };
};

const getReviewReasons = (service, coverage) => {
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;
  const priceAge = Math.round((now - new Date(service.priceLastUpdated).getTime()) / dayMs);
  const inactiveAge = Math.round((now - new Date(service.lastUpdated).getTime()) / dayMs);
  const usageAge = service.lastBooked ? Math.round((now - new Date(service.lastBooked).getTime()) / dayMs) : 999;
  const reasons = [];
  if (coverage.level === 'none') reasons.push('No Staff Assigned');
  if (service.active && !service.bookingVisible) reasons.push('Booking Disabled');
  if (service.active && !service.posAvailable) reasons.push('POS Hidden');
  if (!service.active && inactiveAge > 30) reasons.push('Inactive Too Long');
  if (service.priceReviewNeeded || priceAge > 90) reasons.push('Price Update Needed');
  if (service.active && (service.bookingsMonth <= 2 || usageAge > 40)) reasons.push('No Recent Usage');
  if (!service.description?.trim()) reasons.push('Missing Description');
  if (!service.category?.trim()) reasons.push('Category Missing');
  return reasons;
};

const enrichService = (service) => {
  const staffCoverage = getStaffCoverage(service);
  const reviewReasons = getReviewReasons(service, staffCoverage);
  const reviewNeeded = reviewReasons.length > 0;
  const healthSignals = [];
  if (reviewNeeded) healthSignals.push({ key: 'review', label: 'Needs Review', tone: 'warning' });
  if (staffCoverage.level === 'none') healthSignals.push({ key: 'no-staff', label: 'No Staff', tone: 'risk' });
  if (staffCoverage.level === 'limited') healthSignals.push({ key: 'limited-staff', label: 'Limited Coverage', tone: 'warning' });
  if (!service.bookingVisible) healthSignals.push({ key: 'not-bookable', label: 'Not Bookable', tone: 'warning' });
  if (!service.posAvailable) healthSignals.push({ key: 'pos-hidden', label: 'POS Hidden', tone: 'warning' });
  if (!service.active) healthSignals.push({ key: 'inactive', label: 'Inactive', tone: 'neutral' });
  if (service.popularityRank <= 3) healthSignals.push({ key: 'top-seller', label: 'Top Seller', tone: 'good' });
  if (service.price >= 180) healthSignals.push({ key: 'premium', label: 'Premium Service', tone: 'premium' });
  if (service.bookingsMonth <= 2) healthSignals.push({ key: 'low-usage', label: 'Low Usage', tone: 'warning' });
  return {
    ...service,
    staffCoverage,
    reviewReasons,
    reviewNeeded,
    healthSignals,
    isTopPerformer: service.popularityRank <= 3,
    lowUsage: service.bookingsMonth <= 2,
    isPremiumService: service.price >= 180,
    operationalState: getOperationalState(service, staffCoverage),
  };
};

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
  const [reviewOnly, setReviewOnly] = useState(false);
  const [extraCategories, setExtraCategories] = useState([]);
  const [detailTab, setDetailTab] = useState('overview');
  const [activeRole] = useState(defaultRole);
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

  const permissions = roleCapabilities[activeRole] || roleCapabilities.manager;

  const enrichedServices = useMemo(() => services.map(enrichService), [services]);

  const availableCategories = useMemo(() => {
    const fromServices = services.map((service) => service.category).filter(Boolean);
    return ['All Categories', ...new Set([...categoryOptions, ...fromServices, ...extraCategories])];
  }, [extraCategories, services]);

  const summaryCards = useMemo(() => {
    const total = enrichedServices.length;
    const active = enrichedServices.filter((item) => item.active).length;
    const inactive = total - active;
    const activeCategories = new Set(enrichedServices.filter((item) => item.active).map((item) => item.category)).size;
    const mostBookedService = [...enrichedServices].sort((a, b) => b.bookingsMonth - a.bookingsMonth)[0] || null;
    const reviewNeeded = enrichedServices.filter((item) => item.reviewNeeded).length;
    const noStaffCount = enrichedServices.filter((item) => item.staffCoverage.level === 'none').length;
    const pricingReviewCount = enrichedServices.filter((item) => item.reviewReasons.includes('Price Update Needed')).length;

    return [
      { label: 'Total Services', value: total, subtext: `${activeCategories} active categories` },
      { label: 'Active Services', value: active, subtext: `${Math.round((active / total) * 100) || 0}% of catalog active` },
      { label: 'Inactive Services', value: inactive, subtext: `${inactive} retained for history or pause` },
      { label: 'Categories', value: activeCategories, subtext: `${availableCategories.length - 1} total configured` },
      {
        label: 'Most Booked',
        value: mostBookedService?.bookingsMonth || 0,
        subtext: mostBookedService ? `${mostBookedService.name} tops monthly bookings` : 'No booking data',
        action: () => {
          if (mostBookedService) {
            setSelectedServiceId(mostBookedService.id);
            setDetailTab('performance');
          }
        },
      },
      {
        label: 'Needs Review',
        value: reviewNeeded,
        subtext: `${noStaffCount} staffing, ${pricingReviewCount} pricing or visibility issues`,
        action: () => setReviewOnly(true),
      },
    ];
  }, [availableCategories.length, enrichedServices]);

  const categoryCounts = useMemo(() => {
    const counts = enrichedServices.reduce((acc, service) => {
      acc[service.category] = (acc[service.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [enrichedServices]);

  const filteredServices = useMemo(() => {
    return enrichedServices
      .filter((service) => {
        const searchable = `${service.name} ${service.category} ${service.duration} ${service.price} ${service.description}`.toLowerCase();
        const matchesSearch = !searchTerm || searchable.includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All Categories' || service.category === categoryFilter;
        const matchesStatus = statusFilter === 'All Statuses' || (statusFilter === 'Active' ? service.active : !service.active);
        const matchesDuration =
          durationFilter === 'Any Duration' ||
          (durationFilter === 'Under 60 min' && service.duration < 60) ||
          (durationFilter === '60-90 min' && service.duration >= 60 && service.duration <= 90) ||
          (durationFilter === 'Over 90 min' && service.duration > 90);
        const matchesBookable = !bookableOnly || (service.active && service.bookingVisible);
        const matchesStaffNeed = !needsStaffOnly || service.staffCoverage.level === 'none';
        const matchesReviewOnly = !reviewOnly || service.reviewNeeded;
        return matchesSearch && matchesCategory && matchesStatus && matchesDuration && matchesBookable && matchesStaffNeed && matchesReviewOnly;
      })
      .sort((a, b) => {
        if (a.reviewNeeded !== b.reviewNeeded) return a.reviewNeeded ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [bookableOnly, categoryFilter, durationFilter, enrichedServices, needsStaffOnly, reviewOnly, searchTerm, statusFilter]);

  useEffect(() => {
    if (filteredServices.length === 0) {
      setSelectedServiceId('');
      return;
    }
    if (!filteredServices.some((service) => service.id === selectedServiceId)) {
      setSelectedServiceId(filteredServices[0].id);
    }
  }, [filteredServices, selectedServiceId]);

  const selectedService = useMemo(() => filteredServices.find((service) => service.id === selectedServiceId) || null, [filteredServices, selectedServiceId]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    categoryFilter !== 'All Categories' ||
    statusFilter !== 'All Statuses' ||
    durationFilter !== 'Any Duration' ||
    bookableOnly ||
    needsStaffOnly ||
    reviewOnly;

  const patchService = (serviceId, updates) => {
    const stamped = {
      ...updates,
      lastUpdated: new Date().toISOString(),
      updatedBy: `${activeRole.charAt(0).toUpperCase()}${activeRole.slice(1)}`,
    };
    setServices((current) => current.map((item) => (item.id === serviceId ? { ...item, ...stamped } : item)));
    void crmUpdate('services', serviceId, stamped).catch((error) => {
      setLoadError(error.message || 'Service update failed.');
    });
  };

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

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All Categories');
    setStatusFilter('All Statuses');
    setDurationFilter('Any Duration');
    setBookableOnly(false);
    setNeedsStaffOnly(false);
    setReviewOnly(false);
  };

  const handleQuickCreateService = async () => {
    const name = window.prompt('Service name');
    if (!name) return;
    const category = window.prompt('Category', 'Massage') || 'General';
    const duration = Number(window.prompt('Duration in minutes', '60') || 60);
    const price = Number(window.prompt('Price', '120') || 120);
    try {
      const created = await crmCreate('services', withDefaults({
        name,
        category,
        duration,
        price,
        previousPrice: price,
        priceLastUpdated: new Date().toISOString(),
        priceUpdatedBy: 'Manager',
        note: 'Created from CRM quick add',
      }));
      const normalized = normalizeService(created, services.length);
      setServices((current) => [normalized, ...current]);
      setSelectedServiceId(normalized.id);
      setDetailTab('overview');
    } catch (error) {
      setLoadError(error.message || 'Service creation failed.');
    }
  };

  const handleExportServices = () => {
    const rows = [
      ['Service ID', 'Name', 'Category', 'Duration', 'Price', 'Assigned Staff', 'Coverage', 'Bookable', 'POS', 'Active', 'Needs Review', 'Review Reasons'],
      ...filteredServices.map((service) => [
        service.id,
        service.name,
        service.category,
        service.duration,
        service.price,
        service.assignedStaff.join(' / '),
        service.staffCoverage.label,
        service.bookingVisible ? 'Visible' : 'Hidden',
        service.posAvailable ? 'Visible' : 'Hidden',
        service.active ? 'Active' : 'Inactive',
        service.reviewNeeded ? 'Yes' : 'No',
        service.reviewReasons.join(' | '),
      ]),
    ];
    downloadCsv(`services-catalog-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleManageCategories = () => {
    const raw = window.prompt('Add categories (comma separated)', extraCategories.length ? extraCategories.join(', ') : 'Body Treatment, Consultation');
    if (!raw) return;
    const values = raw.split(',').map((item) => item.trim()).filter(Boolean);
    setExtraCategories((current) => Array.from(new Set([...current, ...values])));
  };

  const handleEditService = () => {
    if (!selectedService) return;
    const name = window.prompt('Service name', selectedService.name) || selectedService.name;
    const category = window.prompt('Category', selectedService.category) || selectedService.category;
    const description = window.prompt('Description', selectedService.description) ?? selectedService.description;
    const duration = Number(window.prompt('Duration in minutes', String(selectedService.duration)) || selectedService.duration);
    patchService(selectedService.id, { name, category, description, duration });
  };

  const handleAssignStaff = () => {
    if (!selectedService) return;
    const staff = window.prompt('Assigned staff (comma separated)', selectedService.assignedStaff.join(', ')) || '';
    const assignedStaff = staff.split(',').map((value) => value.trim()).filter(Boolean);
    patchService(selectedService.id, { assignedStaff });
  };

  const handleUpdatePrice = () => {
    if (!selectedService) return;
    const price = Number(window.prompt('New price', String(selectedService.price)) || selectedService.price);
    patchService(selectedService.id, {
      previousPrice: selectedService.price,
      price,
      priceLastUpdated: new Date().toISOString(),
      priceUpdatedBy: `${activeRole.charAt(0).toUpperCase()}${activeRole.slice(1)}`,
      priceReviewNeeded: false,
    });
  };

  const handleDuplicateService = async () => {
    if (!selectedService) return;
    try {
      const { id: _id, ...serviceCopy } = selectedService;
      const created = await crmCreate('services', {
        ...serviceCopy,
        name: `${selectedService.name} Copy`,
        assignedStaff: [...selectedService.assignedStaff],
        updatedBy: `${activeRole.charAt(0).toUpperCase()}${activeRole.slice(1)}`,
        lastUpdated: new Date().toISOString(),
      });
      const normalized = normalizeService(created, services.length);
      setServices((current) => [normalized, ...current]);
      setSelectedServiceId(normalized.id);
      setDetailTab('overview');
    } catch (error) {
      setLoadError(error.message || 'Service duplication failed.');
    }
  };

  const handleOpenService = (serviceId, tab = 'overview') => {
    setSelectedServiceId(serviceId);
    setDetailTab(tab);
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <CrmShell shellClassName="crm-services-shell">
      <main className="crm-services-main">
        <header className="crm-services-header">
          <div>
            <h1>Treatments / Services</h1>
            <p>Manage your service catalog, pricing, staffing coverage, and operational visibility across booking and POS.</p>
          </div>
          <div className="crm-services-header-actions">
            <input
              type="search"
              placeholder="Search services by name, category, duration, or price..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className={`crm-services-chip${reviewOnly ? ' crm-services-chip-active' : ''}`} onClick={() => setReviewOnly((value) => !value)}>
              Review Needed
            </button>
            {hasActiveFilters ? (
              <button type="button" className="crm-services-ghost-btn" onClick={handleClearFilters}>Clear Filters</button>
            ) : null}
            <button type="button" className="crm-services-ghost-btn" onClick={handleManageCategories}>Manage Categories</button>
            <button type="button" className="crm-services-ghost-btn" onClick={handleExportServices}>Export</button>
            <button type="button" className="crm-services-primary-btn" onClick={handleQuickCreateService}>Add New Service</button>
            <button type="button" className="crm-services-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {loadError ? <p className="crm-services-error">{loadError}</p> : null}

        <section className="crm-services-summary">
          {summaryCards.map((card) => (
            <article key={card.label} className={card.action ? 'crm-services-summary-actionable' : ''}>
              <button type="button" onClick={() => card.action?.()} disabled={!card.action} className="crm-services-summary-btn">
                <p>{card.label}</p>
                <h2>{card.value}</h2>
                <span>{card.subtext}</span>
              </button>
            </article>
          ))}
        </section>

        <section className="crm-services-filter-bar">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>{availableCategories.map((option) => <option key={option}>{option}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select>
          <select value={durationFilter} onChange={(event) => setDurationFilter(event.target.value)}>{durationOptions.map((option) => <option key={option}>{option}</option>)}</select>
          <button type="button" className={`crm-services-chip${bookableOnly ? ' crm-services-chip-active' : ''}`} onClick={() => setBookableOnly((value) => !value)}>Bookable Only</button>
          <button type="button" className={`crm-services-chip${needsStaffOnly ? ' crm-services-chip-active' : ''}`} onClick={() => setNeedsStaffOnly((value) => !value)}>No Staff Assigned</button>
        </section>

        <section className="crm-services-category-strip" aria-label="Category quick filters">
          <button
            type="button"
            className={`crm-services-category-chip${categoryFilter === 'All Categories' ? ' crm-services-category-chip-active' : ''}`}
            onClick={() => setCategoryFilter('All Categories')}
          >
            All ({enrichedServices.length})
          </button>
          {categoryCounts.map(([category, count]) => (
            <button
              type="button"
              key={category}
              className={`crm-services-category-chip${categoryFilter === category ? ' crm-services-category-chip-active' : ''}`}
              onClick={() => setCategoryFilter(category)}
            >
              {category} ({count})
            </button>
          ))}
        </section>

        <section className="crm-services-content">
          <article className="crm-services-table-card">
            <header>
              <p>Service</p>
              <p>Category</p>
              <p>Duration</p>
              <p>Price</p>
              <p>Staff</p>
              <p>Health</p>
              <p>Bookable</p>
              <p>Status</p>
              <p>Action</p>
            </header>

            {isLoading ? (
              <div className="crm-services-empty">
                <h3>Loading services</h3>
                <p>Fetching the latest service catalog from the CRM backend.</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="crm-services-empty">
                <h3>{reviewOnly ? 'No services currently need review' : 'No services match this filter'}</h3>
                <p>
                  {reviewOnly
                    ? 'Great news. Review-needed services are clear right now. Remove the review filter to browse the full catalog.'
                    : 'Try broadening filters or create a new service in the catalog.'}
                </p>
              </div>
            ) : (
              <div className="crm-services-table-body">
                {filteredServices.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    isSelected={selectedService?.id === service.id}
                    onSelect={(id) => handleOpenService(id, 'overview')}
                    onOpenQuick={(id) => handleOpenService(id, 'overview')}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            )}
          </article>

          <aside className="crm-services-detail-card">
            <ServiceDetailPanel
              service={selectedService}
              detailTab={detailTab}
              onTabChange={setDetailTab}
              onPatchService={patchService}
              onEditService={handleEditService}
              onAssignStaff={handleAssignStaff}
              onUpdatePrice={handleUpdatePrice}
              onDuplicateService={handleDuplicateService}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              formatRelativeDate={formatRelativeDate}
              canManageServices={permissions.manageServices}
              canManagePricing={permissions.managePricing}
              canManageAssignments={permissions.manageAssignments}
            />
          </aside>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmServices;
