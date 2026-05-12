import { useQuery } from '@tanstack/react-query';
import { crmList } from '../config/crmApi';
import {
  SERVICE_ADDONS,
  SERVICE_CATEGORIES,
  SERVICE_PACKAGE_ITEMS,
  SERVICE_SEED,
  STAFF_PRICING_RULES,
  slugify,
} from '../config/serviceCatalog';

export const SERVICE_CATALOG_QUERY_KEY = ['service-catalog'];

const toArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mergeById = (fallbackItems, remoteItems) => {
  const map = new Map(fallbackItems.map((item) => [String(item.id), item]));

  remoteItems.forEach((item) => {
    const id = String(item.id || '').trim();
    if (!id) {
      return;
    }

    map.set(id, {
      ...(map.get(id) || {}),
      ...item,
      id,
    });
  });

  return Array.from(map.values());
};

const normalizeCategory = (entry, index = 0) => {
  const name = String(entry.name || entry.title || entry.label || 'Category').trim();
  const id = String(entry.id || entry.categoryId || entry.slug || slugify(name) || `category-${index + 1}`).trim();

  return {
    id,
    name,
    description: String(entry.description || entry.summary || ''),
    sortOrder: toNumber(entry.sortOrder ?? entry.sort_order ?? index + 1, index + 1),
    slug: String(entry.slug || slugify(name) || id),
    isActive: entry.isActive !== false && entry.active !== false,
  };
};

const normalizeAddon = (entry, categories, index = 0) => {
  const name = String(entry.name || entry.title || 'Add-on').trim();
  const rawCategories = toArray(entry.appliesToCategoryIds || entry.appliesToCategories || entry.categoryIds);
  const appliesToCategoryIds = rawCategories.length
    ? rawCategories.map((item) => String(item).trim()).filter(Boolean)
    : categories.map((category) => category.id);

  return {
    id: String(entry.id || entry.addonId || entry.slug || slugify(name) || `addon-${index + 1}`).trim(),
    name,
    pricePkr: Math.max(0, Math.round(toNumber(entry.pricePkr ?? entry.price ?? entry.amount, 0))),
    description: String(entry.description || entry.summary || ''),
    appliesToCategoryIds,
    appliesToCategories: appliesToCategoryIds,
    sortOrder: toNumber(entry.sortOrder ?? entry.sort_order ?? index + 1, index + 1),
    isActive: entry.isActive !== false && entry.active !== false,
  };
};

const normalizePackageItem = (entry, index = 0) => ({
  id: String(entry.id || entry.packageItemId || entry.itemId || `package-item-${index + 1}`).trim(),
  serviceId: String(entry.serviceId || entry.service_id || entry.parentServiceId || '').trim(),
  itemName: String(entry.itemName || entry.name || entry.title || 'Package item').trim(),
  included: entry.included !== false,
  sortOrder: toNumber(entry.sortOrder ?? entry.sort_order ?? index + 1, index + 1),
  notes: String(entry.notes || '').trim(),
});

const normalizeStaffRule = (entry, index = 0) => {
  const label = String(entry.label || entry.level || entry.name || 'Staff Level').trim();
  const id = String(entry.id || entry.ruleId || entry.slug || slugify(label) || `staff-rule-${index + 1}`).trim();

  return {
    id,
    level: String(entry.level || label).trim(),
    label,
    adjustmentPercent: toNumber(entry.adjustmentPercent ?? entry.adjustment_percent ?? 0, 0),
    sortOrder: toNumber(entry.sortOrder ?? entry.sort_order ?? index + 1, index + 1),
    description: String(entry.description || ''),
    isActive: entry.isActive !== false && entry.active !== false,
  };
};

const resolveCategory = (entry, categoryLookup, fallbackCategory, index = 0) => {
  const explicitId = String(entry.categoryId || entry.category_id || entry.serviceCategoryId || entry.service_category_id || '').trim();
  const explicitName = String(entry.category || entry.categoryName || entry.serviceCategory || entry.service_category || '').trim();
  const normalizedName = explicitName.toLowerCase();

  if (explicitId && categoryLookup.has(explicitId)) {
    return categoryLookup.get(explicitId);
  }

  const nameMatch = Array.from(categoryLookup.values()).find((category) => {
    const values = [category.id, category.name, category.slug].map((value) => String(value || '').toLowerCase());
    return values.includes(normalizedName);
  });

  if (nameMatch) {
    return nameMatch;
  }

  if (fallbackCategory) {
    return fallbackCategory;
  }

  const derivedId = explicitId || slugify(explicitName) || `category-${index + 1}`;
  return {
    id: derivedId,
    name: explicitName || 'General',
    description: '',
    sortOrder: index + 1,
    slug: derivedId,
    isActive: true,
  };
};

const normalizeService = (entry, categoryLookup, fallbackService, index = 0) => {
  const fallbackCategory = fallbackService
    ? categoryLookup.get(String(fallbackService.categoryId || '')) || null
    : null;
  const category = resolveCategory(entry, categoryLookup, fallbackCategory, index);
  const name = String(entry.name || entry.serviceName || entry.title || fallbackService?.name || 'Service').trim();
  const remoteDefaultAddonIds = toArray(entry.defaultAddonIds || entry.default_addon_ids || entry.addonIds || entry.addon_ids)
    .map((item) => String(item).trim())
    .filter(Boolean);
  const remotePackageItems = toArray(entry.packageItems).map(normalizePackageItem);
  const fallbackPackageItems = Array.isArray(fallbackService?.packageItems) ? fallbackService.packageItems : [];

  return {
    ...fallbackService,
    id: String(entry.id || entry.serviceId || fallbackService?.id || slugify(name) || `service-${index + 1}`).trim(),
    name,
    categoryId: category.id,
    category: category.name,
    price: Math.max(0, Math.round(toNumber(entry.price ?? entry.pricePkr ?? entry.basePrice ?? fallbackService?.price, fallbackService?.price || 0))),
    minPricePkr: Math.max(0, Math.round(toNumber(entry.minPricePkr ?? entry.minPrice ?? entry.price ?? fallbackService?.minPricePkr, fallbackService?.minPricePkr || 0))),
    maxPricePkr: Math.max(0, Math.round(toNumber(entry.maxPricePkr ?? entry.maxPrice ?? entry.price ?? fallbackService?.maxPricePkr, fallbackService?.maxPricePkr || 0))),
    durationMinutes: Math.max(0, Math.round(toNumber(entry.durationMinutes ?? entry.duration ?? fallbackService?.durationMinutes ?? 0, fallbackService?.durationMinutes || 0))),
    durationLabel: String(entry.durationLabel || entry.duration_label || fallbackService?.durationLabel || ''),
    description: String(entry.description || entry.summary || fallbackService?.description || 'Service'),
    status: String(entry.status || fallbackService?.status || (entry.active === false ? 'Inactive' : 'Active')),
    active: entry.active !== false && String(entry.status || fallbackService?.status || 'Active') !== 'Inactive',
    taxRatePercent: toNumber(entry.taxRatePercent ?? entry.tax_rate_percent ?? fallbackService?.taxRatePercent ?? 0, fallbackService?.taxRatePercent || 0),
    defaultDiscountAmountPkr: toNumber(entry.defaultDiscountAmountPkr ?? entry.defaultDiscountAmount ?? fallbackService?.defaultDiscountAmountPkr ?? 0, fallbackService?.defaultDiscountAmountPkr || 0),
    defaultAddonIds: remoteDefaultAddonIds.length ? remoteDefaultAddonIds : fallbackService?.defaultAddonIds || [],
    packageItems: remotePackageItems.length ? remotePackageItems : fallbackPackageItems,
    isPackage: Boolean(entry.isPackage ?? fallbackService?.isPackage ?? String(category.name).toLowerCase().includes('package')),
    bookingVisible: entry.bookingVisible !== false && String(entry.status || fallbackService?.status || 'Active') !== 'Inactive',
    posAvailable: entry.posAvailable !== false && String(entry.status || fallbackService?.status || 'Active') !== 'Inactive',
    createdAt: entry.createdAt || fallbackService?.createdAt || '',
    updatedAt: entry.updatedAt || fallbackService?.updatedAt || '',
  };
};

const buildServiceCatalog = async () => {
  const [servicesResult, categoriesResult, addonsResult, packageItemsResult, staffRulesResult] = await Promise.allSettled([
    crmList('services'),
    crmList('service-categories'),
    crmList('service-addons'),
    crmList('service-package-items'),
    crmList('staff-pricing-rules'),
  ]);

  const remoteCategories = categoriesResult.status === 'fulfilled' ? toArray(categoriesResult.value).map(normalizeCategory) : [];
  const hasRemoteCategories = remoteCategories.length > 0;
  const categories = hasRemoteCategories ? mergeById(SERVICE_CATEGORIES, remoteCategories) : SERVICE_CATEGORIES;
  const categoryLookup = new Map(categories.map((category) => [String(category.id), category]));
  const fallbackServices = new Map(SERVICE_SEED.map((service) => [String(service.id), service]));

  const remoteServices = servicesResult.status === 'fulfilled'
    ? toArray(servicesResult.value).map((entry, index) =>
        normalizeService(entry, categoryLookup, fallbackServices.get(String(entry.id || entry.serviceId || '')), index),
      )
    : [];
  const hasRemoteServices = remoteServices.length > 0;
  const services = hasRemoteServices ? mergeById(SERVICE_SEED, remoteServices) : SERVICE_SEED;

  const remoteAddons = addonsResult.status === 'fulfilled' ? toArray(addonsResult.value).map((entry, index) => normalizeAddon(entry, categories, index)) : [];
  const hasRemoteAddons = remoteAddons.length > 0;
  const addons = hasRemoteAddons ? mergeById(SERVICE_ADDONS, remoteAddons) : SERVICE_ADDONS;

  const remotePackageItems = packageItemsResult.status === 'fulfilled' ? toArray(packageItemsResult.value).map(normalizePackageItem) : [];
  const hasRemotePackageItems = remotePackageItems.length > 0;
  const packageItems = hasRemotePackageItems ? mergeById(SERVICE_PACKAGE_ITEMS, remotePackageItems) : SERVICE_PACKAGE_ITEMS;

  const remoteStaffRules = staffRulesResult.status === 'fulfilled' ? toArray(staffRulesResult.value).map(normalizeStaffRule) : [];
  const hasRemoteStaffRules = remoteStaffRules.length > 0;
  const staffPricingRules = hasRemoteStaffRules ? mergeById(STAFF_PRICING_RULES, remoteStaffRules) : STAFF_PRICING_RULES;

  return {
    services,
    categories,
    addons,
    packageItems,
    staffPricingRules,
    source: hasRemoteServices || hasRemoteCategories || hasRemotePackageItems || hasRemoteAddons || hasRemoteStaffRules ? 'crm' : 'seed',
  };
};

export const useServiceCatalog = () =>
  useQuery({
    queryKey: SERVICE_CATALOG_QUERY_KEY,
    queryFn: buildServiceCatalog,
    staleTime: 5 * 60 * 1000,
  });
