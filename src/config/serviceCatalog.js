import { resolveHazelCategoryImage, resolveHazelImage } from './serviceMedia';

const CATEGORY_DEFINITIONS = [
  {
    id: 'hair-services',
    name: 'Hair Services',
    description: 'Cuts, styling, color work, smoothing, and restorative hair rituals.',
    sortOrder: 1,
  },
  {
    id: 'facial-skin-care',
    name: 'Facial & Skin Care',
    description: 'Brightening, treatment-led, and deep hydration facial experiences.',
    sortOrder: 2,
  },
  {
    id: 'makeup-services',
    name: 'Makeup Services',
    description: 'Event makeup, bridal looks, and camera-ready finishing services.',
    sortOrder: 3,
  },
  {
    id: 'threading-waxing',
    name: 'Threading & Waxing',
    description: 'Precision grooming and full-body waxing essentials.',
    sortOrder: 4,
  },
  {
    id: 'nail-services',
    name: 'Nail Services',
    description: 'Manicures, pedicures, enhancements, and long-wear nail artistry.',
    sortOrder: 5,
  },
  {
    id: 'spa-massage',
    name: 'Spa & Massage',
    description: 'Relaxation, recovery, and body-reset rituals for guests and members.',
    sortOrder: 6,
  },
  {
    id: 'bridal-packages',
    name: 'Bridal Packages',
    description: 'Complete bridal preparation bundles for the main event and surrounding functions.',
    sortOrder: 7,
  },
];

const ADDON_DEFINITIONS = [
  {
    id: 'home-service',
    name: 'Home Service',
    pricePkr: 5000,
    description: 'On-location setup and travel coverage for the salon team.',
    appliesToCategoryIds: CATEGORY_DEFINITIONS.map((category) => category.id),
    sortOrder: 1,
  },
  {
    id: 'extra-function',
    name: 'Extra Function',
    pricePkr: 10000,
    description: 'Second event or additional appearance in the same booking cycle.',
    appliesToCategoryIds: ['makeup-services', 'bridal-packages'],
    sortOrder: 2,
  },
  {
    id: 'premium-products-upgrade',
    name: 'Premium Products Upgrade',
    pricePkr: 3000,
    description: 'Premium product line upgrade for elevated finish and longevity.',
    appliesToCategoryIds: CATEGORY_DEFINITIONS.map((category) => category.id),
    sortOrder: 3,
  },
  {
    id: 'lashes',
    name: 'Lashes',
    pricePkr: 1500,
    description: 'Individual or strip lashes for bridal and event finishing.',
    appliesToCategoryIds: ['makeup-services', 'bridal-packages', 'facial-skin-care'],
    sortOrder: 4,
  },
  {
    id: 'hair-accessories',
    name: 'Hair Accessories',
    pricePkr: 2000,
    description: 'Pins, embellishments, and finishing accessories for styling looks.',
    appliesToCategoryIds: ['hair-services', 'bridal-packages'],
    sortOrder: 5,
  },
  {
    id: 'extra-touch-up',
    name: 'Extra Touch-up',
    pricePkr: 2500,
    description: 'Post-look touch-up time for events, shoots, and ceremonies.',
    appliesToCategoryIds: ['makeup-services', 'bridal-packages'],
    sortOrder: 6,
  },
];

export const STAFF_PRICING_RULES = [
  {
    id: 'junior-staff',
    level: 'Junior Staff',
    label: 'Junior Staff',
    adjustmentPercent: 0,
    sortOrder: 1,
    description: 'Base rate with no premium charge.',
  },
  {
    id: 'senior-artist',
    level: 'Senior Artist',
    label: 'Senior Artist',
    adjustmentPercent: 20,
    sortOrder: 2,
    description: 'Experienced artist pricing premium.',
  },
  {
    id: 'expert-artist',
    level: 'Expert Artist',
    label: 'Expert Artist',
    adjustmentPercent: 40,
    sortOrder: 3,
    description: 'Master-level price uplift for high-demand stylists.',
  },
];

const PACKAGE_ITEM_DEFINITIONS = {
  'basic-bridal-package': [
    'Basic Makeup',
    'Simple Hairstyling',
    'Dupatta Setting',
  ],
  'premium-bridal-package': [
    'HD Makeup',
    'Advanced Hairstyling',
    'Lashes',
    'Dupatta Setting',
  ],
  'luxury-bridal-package': [
    'HD / Airbrush Makeup',
    'Premium Hairstyling',
    'Full Accessories Setting',
    'Touch-up Kit',
  ],
};

const buildDurationLabel = (minutes, fallback = '') => {
  const totalMinutes = Math.max(0, Number(minutes) || 0);
  if (!totalMinutes) return fallback;
  if (totalMinutes < 60) return `${totalMinutes} min`;
  if (totalMinutes % 60 === 0) {
    const hours = totalMinutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remaining = totalMinutes % 60;
  if (!hours) return `${remaining} min`;
  return `${hours} hr ${remaining} min`;
};

const buildService = ({
  id,
  name,
  categoryId,
  price,
  durationMinutes,
  durationLabel = '',
  description,
  status = 'Active',
  minPricePkr = price,
  maxPricePkr = price,
  taxRatePercent = 0,
  defaultDiscountAmountPkr = 0,
  defaultAddonIds = [],
  packageItems = [],
  isPackage = false,
  imageUrl = '',
}) => {
  const category = CATEGORY_DEFINITIONS.find((entry) => entry.id === categoryId);

  return {
    id,
    name,
    categoryId,
    category: category?.name || 'General',
    price,
    minPricePkr,
    maxPricePkr,
    durationMinutes,
    durationLabel: durationLabel || buildDurationLabel(durationMinutes),
    description,
    status,
    active: status === 'Active',
    taxRatePercent,
    defaultDiscountAmountPkr,
    defaultAddonIds,
    packageItems,
    isPackage,
    imageUrl: imageUrl || resolveHazelImage(categoryId, id),
    bookingVisible: status === 'Active',
    posAvailable: status === 'Active',
    createdAt: '',
    updatedAt: '',
  };
};

export const SERVICE_CATEGORIES = CATEGORY_DEFINITIONS.map((category) => ({
  ...category,
  slug: category.id,
  imageUrl: resolveHazelCategoryImage(category.id),
  isActive: true,
}));

export const SERVICE_ADDONS = ADDON_DEFINITIONS.map((addon) => ({
  ...addon,
  appliesToCategories: [...addon.appliesToCategoryIds],
  isActive: true,
}));

export const SERVICE_PACKAGE_ITEMS = Object.entries(PACKAGE_ITEM_DEFINITIONS).flatMap(([serviceId, items]) =>
  items.map((itemName, index) => ({
    id: `${serviceId}-item-${index + 1}`,
    serviceId,
    itemName,
    included: true,
    sortOrder: index + 1,
    notes: '',
  })),
);

export const SERVICE_SEED = [
  buildService({
    id: 'hair-cut',
    name: 'Hair Cut',
    categoryId: 'hair-services',
    price: 2500,
    durationMinutes: 45,
    description: 'Precision cut with consultation, shaping, and a polished finish.',
  }),
  buildService({
    id: 'blow-dry',
    name: 'Blow Dry',
    categoryId: 'hair-services',
    price: 2500,
    durationMinutes: 30,
    description: 'Smooth blow-out with volume control and polished shine.',
  }),
  buildService({
    id: 'hair-styling',
    name: 'Hair Styling',
    categoryId: 'hair-services',
    price: 3000,
    durationMinutes: 45,
    description: 'Event-ready styling with waves, curls, braids, or sleek finishing.',
  }),
  buildService({
    id: 'hair-color-basic',
    name: 'Hair Color Basic',
    categoryId: 'hair-services',
    price: 6000,
    durationMinutes: 90,
    description: 'Single-process color service with clean application and shine seal.',
  }),
  buildService({
    id: 'keratin-rebonding',
    name: 'Keratin / Rebonding',
    categoryId: 'hair-services',
    price: 20000,
    durationMinutes: 180,
    description: 'Smoothening service designed to reduce frizz and improve manageability.',
  }),
  buildService({
    id: 'hair-spa',
    name: 'Hair Spa',
    categoryId: 'hair-services',
    price: 4500,
    durationMinutes: 60,
    description: 'Scalp reset with deep conditioning, massage, and hydration treatment.',
  }),
  buildService({
    id: 'basic-facial',
    name: 'Basic Facial',
    categoryId: 'facial-skin-care',
    price: 3000,
    durationMinutes: 45,
    description: 'Classic cleansing and brightening facial for regular skin maintenance.',
  }),
  buildService({
    id: 'whitening-facial',
    name: 'Whitening Facial',
    categoryId: 'facial-skin-care',
    price: 4500,
    durationMinutes: 60,
    description: 'Glow-boosting facial focused on radiance and even tone refresh.',
  }),
  buildService({
    id: 'hydra-facial',
    name: 'Hydra Facial',
    categoryId: 'facial-skin-care',
    price: 12000,
    durationMinutes: 60,
    description: 'Hydration-led facial with deep cleansing and serum infusion.',
  }),
  buildService({
    id: 'acne-treatment',
    name: 'Acne Treatment',
    categoryId: 'facial-skin-care',
    price: 7000,
    durationMinutes: 60,
    description: 'Targeted treatment designed to calm breakouts and support recovery.',
  }),
  buildService({
    id: 'skin-polisher',
    name: 'Skin Polisher',
    categoryId: 'facial-skin-care',
    price: 2500,
    durationMinutes: 30,
    description: 'Quick polish treatment for smoother texture and refreshed tone.',
  }),
  buildService({
    id: 'premium-facial',
    name: 'Premium Facial',
    categoryId: 'facial-skin-care',
    price: 15000,
    durationMinutes: 75,
    description: 'High-touch facial experience with advanced nourishment and glow support.',
  }),
  buildService({
    id: 'party-makeup',
    name: 'Party Makeup',
    categoryId: 'makeup-services',
    price: 7000,
    durationMinutes: 60,
    description: 'Polished event makeup with balanced tones and camera-ready finishing.',
  }),
  buildService({
    id: 'glam-makeup',
    name: 'Glam Makeup',
    categoryId: 'makeup-services',
    price: 10000,
    durationMinutes: 75,
    description: 'Statement glam look with stronger contour, glow, and definition.',
  }),
  buildService({
    id: 'engagement-makeup',
    name: 'Engagement Makeup',
    categoryId: 'makeup-services',
    price: 15000,
    durationMinutes: 90,
    description: 'Polished celebration makeup tailored for engagement and formal events.',
  }),
  buildService({
    id: 'hd-airbrush-makeup',
    name: 'HD / Airbrush Makeup',
    categoryId: 'makeup-services',
    price: 30000,
    durationMinutes: 120,
    description: 'Long-wear high-definition finish for premium events and bridal prep.',
  }),
  buildService({
    id: 'eyebrow-threading',
    name: 'Eyebrow Threading',
    categoryId: 'threading-waxing',
    price: 300,
    durationMinutes: 10,
    description: 'Precision brow cleanup with clean facial framing.',
  }),
  buildService({
    id: 'upper-lips',
    name: 'Upper Lips',
    categoryId: 'threading-waxing',
    price: 200,
    durationMinutes: 10,
    description: 'Fast upper-lip threading service for clean grooming.',
  }),
  buildService({
    id: 'full-face-threading',
    name: 'Full Face Threading',
    categoryId: 'threading-waxing',
    price: 1500,
    durationMinutes: 25,
    description: 'Full facial threading for a smooth, well-defined finish.',
  }),
  buildService({
    id: 'full-arms-waxing',
    name: 'Full Arms Waxing',
    categoryId: 'threading-waxing',
    price: 1800,
    durationMinutes: 30,
    description: 'Complete arm waxing service with skin-calming aftercare.',
  }),
  buildService({
    id: 'full-legs-waxing',
    name: 'Full Legs Waxing',
    categoryId: 'threading-waxing',
    price: 3500,
    durationMinutes: 45,
    description: 'Leg waxing service for a smooth, even finish and long-lasting result.',
  }),
  buildService({
    id: 'underarms-waxing',
    name: 'Underarms Waxing',
    categoryId: 'threading-waxing',
    price: 700,
    durationMinutes: 15,
    description: 'Quick underarm waxing with a clean, polished finish.',
  }),
  buildService({
    id: 'full-body-waxing',
    name: 'Full Body Waxing',
    categoryId: 'threading-waxing',
    price: 8500,
    durationMinutes: 90,
    description: 'Comprehensive waxing service for full-body smoothness and hygiene.',
  }),
  buildService({
    id: 'manicure',
    name: 'Manicure',
    categoryId: 'nail-services',
    price: 3500,
    durationMinutes: 45,
    description: 'Classic manicure with shaping, cuticle care, and clean polish finish.',
  }),
  buildService({
    id: 'pedicure',
    name: 'Pedicure',
    categoryId: 'nail-services',
    price: 4000,
    durationMinutes: 45,
    description: 'Refreshing pedicure experience with soothing foot care and polish.',
  }),
  buildService({
    id: 'luxury-mani-pedi',
    name: 'Luxury Mani/Pedi',
    categoryId: 'nail-services',
    price: 6000,
    durationMinutes: 75,
    description: 'Extended manicure and pedicure ritual with a premium finish.',
  }),
  buildService({
    id: 'gel-nails',
    name: 'Gel Nails',
    categoryId: 'nail-services',
    price: 7000,
    durationMinutes: 90,
    description: 'Long-wear gel nail application with gloss and durability.',
  }),
  buildService({
    id: 'nail-extensions',
    name: 'Nail Extensions',
    categoryId: 'nail-services',
    price: 15000,
    durationMinutes: 120,
    description: 'Custom nail extension set with sculpting and finishing polish.',
  }),
  buildService({
    id: 'head-massage',
    name: 'Head Massage',
    categoryId: 'spa-massage',
    price: 1500,
    durationMinutes: 20,
    description: 'Short relief session focused on scalp relaxation and tension release.',
  }),
  buildService({
    id: 'body-massage',
    name: 'Body Massage',
    categoryId: 'spa-massage',
    price: 7000,
    durationMinutes: 60,
    description: 'Full-body massage for relaxation, circulation, and stress relief.',
  }),
  buildService({
    id: 'full-body-scrub',
    name: 'Full Body Scrub',
    categoryId: 'spa-massage',
    price: 7000,
    durationMinutes: 60,
    description: 'Exfoliating body polish designed to smooth and refresh the skin.',
  }),
  buildService({
    id: 'hot-stone-therapy',
    name: 'Hot Stone Therapy',
    categoryId: 'spa-massage',
    price: 9000,
    durationMinutes: 75,
    description: 'Warm stone therapy for deep relaxation and muscular ease.',
  }),
  buildService({
    id: 'basic-bridal-package',
    name: 'Basic Bridal Package',
    categoryId: 'bridal-packages',
    price: 25000,
    durationMinutes: 240,
    durationLabel: '3-4 hours',
    description: 'Entry bridal bundle with polished makeup, hairstyling, and dupatta setting.',
    packageItems: PACKAGE_ITEM_DEFINITIONS['basic-bridal-package'],
    isPackage: true,
  }),
  buildService({
    id: 'premium-bridal-package',
    name: 'Premium Bridal Package',
    categoryId: 'bridal-packages',
    price: 40000,
    durationMinutes: 300,
    durationLabel: '4-5 hours',
    description: 'Enhanced bridal bundle with HD makeup, advanced hairstyling, and lashes.',
    packageItems: PACKAGE_ITEM_DEFINITIONS['premium-bridal-package'],
    isPackage: true,
  }),
  buildService({
    id: 'luxury-bridal-package',
    name: 'Luxury Bridal Package',
    categoryId: 'bridal-packages',
    price: 50000,
    durationMinutes: 360,
    durationLabel: '5-6 hours',
    description: 'Full luxury bridal experience with premium styling, accessories, and touch-up kit.',
    packageItems: PACKAGE_ITEM_DEFINITIONS['luxury-bridal-package'],
    isPackage: true,
  }),
];

export const SERVICE_LOOKUP = new Map(SERVICE_SEED.map((service) => [service.id, service]));

export const SERVICE_CATEGORY_LOOKUP = new Map(SERVICE_CATEGORIES.map((category) => [category.id, category]));

export const ADDON_LOOKUP = new Map(SERVICE_ADDONS.map((addon) => [addon.id, addon]));

export const STAFF_RULE_LOOKUP = new Map(STAFF_PRICING_RULES.map((rule) => [rule.id, rule]));

export const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const formatPkr = (value) => {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

export const formatDuration = (service = {}) => {
  if (service.durationLabel) return service.durationLabel;
  return buildDurationLabel(service.durationMinutes, '0 min');
};

export const isAddonApplicable = (addon, service) => {
  if (!addon || addon.isActive === false) return false;
  const serviceCategoryId = service?.categoryId || slugify(service?.category);
  const scopes = Array.isArray(addon.appliesToCategories) ? addon.appliesToCategories : [];
  return scopes.includes(serviceCategoryId) || scopes.includes('all') || scopes.length === 0;
};

const normalizeSelectionIds = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const calculateServicePricing = (
  service,
  {
    selectedAddonIds = [],
    staffLevel = 'Junior Staff',
    discountAmount = 0,
    discountPercent = 0,
    taxRatePercent = 0,
    addonCatalog = SERVICE_ADDONS,
    staffRules = STAFF_PRICING_RULES,
  } = {},
) => {
  const basePrice = Math.max(0, Math.round(Number(service?.price || 0)));
  const addonIds = normalizeSelectionIds(selectedAddonIds.length ? selectedAddonIds : service?.defaultAddonIds || []);
  const addons = addonCatalog.filter((addon) => addonIds.includes(addon.id) && isAddonApplicable(addon, service));
  const addonTotal = addons.reduce((sum, addon) => sum + Math.max(0, Math.round(Number(addon.pricePkr || 0))), 0);
  const subtotalBeforeStaff = basePrice + addonTotal;
  const staffRule =
    staffRules.find((rule) => rule.isActive !== false && (rule.id === staffLevel || rule.level === staffLevel || rule.label === staffLevel)) ||
    staffRules.find((rule) => rule.isActive !== false) ||
    staffRules[0] ||
    STAFF_PRICING_RULES[0];
  const staffAdjustmentPercent = Math.max(0, Number(staffRule?.adjustmentPercent || 0));
  const staffAdjustmentAmount = Math.round((subtotalBeforeStaff * staffAdjustmentPercent) / 100);
  const subtotalAfterStaff = subtotalBeforeStaff + staffAdjustmentAmount;
  const discountFromPercent = Math.round((subtotalAfterStaff * Math.max(0, Number(discountPercent || 0))) / 100);
  const resolvedDiscountAmount = Math.max(0, Math.round(Number(discountAmount || 0))) + discountFromPercent;
  const subtotalAfterDiscount = Math.max(0, subtotalAfterStaff - resolvedDiscountAmount);
  const taxRate = Math.max(0, Number(taxRatePercent || service?.taxRatePercent || 0));
  const taxAmount = Math.round((subtotalAfterDiscount * taxRate) / 100);
  const finalPrice = Math.max(0, subtotalAfterDiscount + taxAmount);

  return {
    serviceId: service?.id || '',
    serviceName: service?.name || '',
    basePrice,
    addonTotal,
    addons,
    subtotalBeforeStaff,
    staffLevel: staffRule?.label || staffLevel,
    staffAdjustmentPercent,
    staffAdjustmentAmount,
    subtotalAfterStaff,
    discountAmount: resolvedDiscountAmount,
    taxRatePercent: taxRate,
    taxAmount,
    finalPrice,
  };
};

export const getServicesByCategory = (categoryIdOrName, services = SERVICE_SEED) => {
  const normalized = String(categoryIdOrName || '').trim().toLowerCase();
  if (!normalized) return services;
  return services.filter((service) => {
    const categoryId = String(service.categoryId || '').toLowerCase();
    const categoryName = String(service.category || '').toLowerCase();
    return categoryId === normalized || categoryName === normalized;
  });
};

export const getAddonsForService = (service, addonCatalog = SERVICE_ADDONS) =>
  addonCatalog.filter((addon) => isAddonApplicable(addon, service));

export const getPackageItemsForService = (serviceId) =>
  SERVICE_PACKAGE_ITEMS.filter((item) => item.serviceId === serviceId);

export const getCategoryCountMap = (services = SERVICE_SEED) =>
  services.reduce((acc, service) => {
    const categoryId = service.categoryId || slugify(service.category);
    acc.set(categoryId, (acc.get(categoryId) || 0) + 1);
    return acc;
  }, new Map());
