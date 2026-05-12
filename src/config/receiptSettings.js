import { crmGetSettings, crmSaveSettings } from './crmApi.js';
import {
  BRAND_BOOKING_EMAIL,
  BRAND_BOOKING_URL,
  BRAND_CONTACT_EMAIL,
  BRAND_FRONTDESK_EMAIL,
  BRAND_OPERATIONS_EMAIL,
  BRAND_TAGLINE,
  BRAND_WEBSITE,
  SALON_NAME,
} from './brand.js';

const defaultOperatingHours = [
  { day: 'Monday', open: '09:00', close: '18:00', breakStart: '', breakEnd: '', enabled: true, guestBookingOpen: true, note: 'Guest bookings open all day.' },
  { day: 'Tuesday', open: '09:00', close: '20:00', breakStart: '13:00', breakEnd: '14:00', enabled: true, guestBookingOpen: true, note: 'Lunch break reserved for staff reset.' },
  { day: 'Wednesday', open: '10:00', close: '19:00', breakStart: '', breakEnd: '', enabled: true, guestBookingOpen: true, note: 'Midweek rhythm with extended evening slots.' },
  { day: 'Thursday', open: '10:00', close: '20:00', breakStart: '14:00', breakEnd: '14:30', enabled: true, guestBookingOpen: true, note: 'Service recovery window is held in the afternoon.' },
  { day: 'Friday', open: '09:00', close: '21:00', breakStart: '', breakEnd: '', enabled: true, guestBookingOpen: true, note: 'High demand evening booking window.' },
  { day: 'Saturday', open: '10:00', close: '17:00', breakStart: '', breakEnd: '', enabled: true, guestBookingOpen: true, note: 'Shorter weekend rhythm for spa resets.' },
  { day: 'Sunday', open: '10:00', close: '17:00', breakStart: '', breakEnd: '', enabled: false, guestBookingOpen: false, note: 'Online bookings pause for this day.' },
];

const defaultSpecialHours = [
  {
    id: 'special-closure-1',
    date: '2026-05-25',
    label: 'Memorial Day',
    type: 'Holiday closure',
    open: '',
    close: '',
    closed: true,
    note: 'Full closure for the holiday.',
  },
];

const defaultBusinessProfile = {
  businessName: SALON_NAME,
  legalName: SALON_NAME,
  receiptDisplayName: SALON_NAME,
  branchName: 'West Hollywood',
  contactEmail: BRAND_CONTACT_EMAIL,
  contactPhone: '03349794441',
  publicBookingEmail: BRAND_BOOKING_EMAIL,
  publicBookingPhone: '03354464192',
  internalContactName: 'Isabella Rose',
  internalContactEmail: BRAND_OPERATIONS_EMAIL,
  address: '8422 Melrose Ave, West Hollywood, CA 90069',
  mapLink: 'https://maps.google.com/?q=8422+Melrose+Ave+West+Hollywood+CA+90069',
  website: BRAND_WEBSITE,
  bookingPageUrl: BRAND_BOOKING_URL,
  timezone: 'America/Los_Angeles',
  currency: 'USD',
  locale: 'en-US',
  taxId: '12-3456789',
  brandMarkName: SALON_NAME,
  brandMarkImage: '',
};

const defaultRegionalDefaults = {
  timezone: 'America/Los_Angeles',
  currency: 'USD',
  dateFormat: 'MMM d, yyyy',
  timeFormat: '12-hour',
  locale: 'en-US',
};

const defaultBookingRules = {
  bufferTime: '15',
  slotInterval: '30 minutes',
  cancellationWindow: '24 Hours',
  reminderTiming: '24 hours before',
  reminderCadence: '24 hours before',
  maxAdvanceBooking: '60 days',
  minimumLeadTime: '2 hours',
  reschedulePolicy: '24 Hours',
  noShowPolicy: 'Missed visit review',
  defaultAppointmentStatus: 'Pending',
  approvalMode: 'Auto-confirm',
  staffSelectionVisibility: 'Visible to guests',
  sameDayBooking: true,
  walkInsAllowed: true,
  depositRequired: true,
  hidePrices: false,
  guestBookingVisibility: 'Live',
  onlineDepositAmount: '25%',
};

const defaultCommunicationSettings = {
  confirmationEmail: true,
  reminderEmail: true,
  senderName: SALON_NAME,
  senderEmail: BRAND_CONTACT_EMAIL,
  replyToEmail: BRAND_FRONTDESK_EMAIL,
  reminderCadence: '24 hours before',
  confirmationMessage:
    'Your appointment is confirmed. We are looking forward to welcoming you to a calm and polished visit.',
  cancellationMessage:
    'If plans change, reply to this message and we will help you adjust the appointment with care.',
  smsEnabled: false,
  whatsappEnabled: false,
};

const defaultBrandingSettings = {
  receiptHeaderQuote: BRAND_TAGLINE,
  receiptFooterText:
    'We appreciate your trust and look forward to welcoming you again soon.',
  receiptNumberPrefix: 'RCT-',
  logoPlacement: 'centered',
  logoSize: 'medium',
  showAddressOnReceipt: true,
  showPhoneOnReceipt: true,
  showEmailOnReceipt: true,
  showWebsiteOnReceipt: false,
  showTaxIdOnReceipt: false,
  taxDisplayMode: 'Included',
  includeSocialHandles: false,
  showBrandMark: true,
};

export const defaultReceiptSettings = {
  profile: defaultBusinessProfile,
  regionalDefaults: defaultRegionalDefaults,
  operatingHours: defaultOperatingHours,
  specialHours: defaultSpecialHours,
  bookingRules: defaultBookingRules,
  communication: defaultCommunicationSettings,
  branding: defaultBrandingSettings,
  receiptQuote: defaultBrandingSettings.receiptHeaderQuote,
  receiptFooterText: defaultBrandingSettings.receiptFooterText,
  brandingLayout: defaultBrandingSettings.logoPlacement,
  includeSocialHandles: defaultBrandingSettings.includeSocialHandles,
  updatedAt: null,
};

const normalizeText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeBrandValue = (value, fallback = '') => {
  const text = normalizeText(value, '');
  if (!text) return fallback;

  const lowered = text.toLowerCase();
  const legacyBrandTokens = [
    'aura spa & wellness',
    'aura wellness group llc',
    'aura wellness ecosystem',
    'aura mark',
    'spa saloon',
    'spa saloon crm',
  ];

  if (legacyBrandTokens.includes(lowered) || lowered.includes('aurawellness.com')) {
    return fallback;
  }

  return text;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  return fallback;
};

const normalizeProfile = (profile) => {
  const fallback = defaultBusinessProfile;
  return {
    businessName: normalizeBrandValue(profile?.businessName, fallback.businessName),
    legalName: normalizeBrandValue(profile?.legalName, fallback.legalName),
    receiptDisplayName: normalizeBrandValue(profile?.receiptDisplayName, fallback.receiptDisplayName),
    branchName: normalizeText(profile?.branchName, fallback.branchName),
    contactEmail: normalizeBrandValue(profile?.contactEmail, fallback.contactEmail),
    contactPhone: normalizeText(profile?.contactPhone, fallback.contactPhone),
    publicBookingEmail: normalizeBrandValue(profile?.publicBookingEmail, fallback.publicBookingEmail),
    publicBookingPhone: normalizeText(profile?.publicBookingPhone, fallback.publicBookingPhone),
    internalContactName: normalizeText(profile?.internalContactName, fallback.internalContactName),
    internalContactEmail: normalizeBrandValue(profile?.internalContactEmail, fallback.internalContactEmail),
    address: normalizeText(profile?.address, fallback.address),
    mapLink: normalizeText(profile?.mapLink, fallback.mapLink),
    website: normalizeBrandValue(profile?.website, fallback.website),
    bookingPageUrl: normalizeBrandValue(profile?.bookingPageUrl, fallback.bookingPageUrl),
    timezone: normalizeText(profile?.timezone, fallback.timezone),
    currency: normalizeText(profile?.currency, fallback.currency),
    locale: normalizeText(profile?.locale, fallback.locale),
    taxId: normalizeText(profile?.taxId, fallback.taxId),
    brandMarkName: normalizeBrandValue(profile?.brandMarkName, fallback.brandMarkName),
    brandMarkImage: normalizeText(profile?.brandMarkImage, fallback.brandMarkImage),
  };
};

const normalizeRegionalDefaults = (regionalDefaults) => {
  const fallback = defaultRegionalDefaults;
  return {
    timezone: normalizeText(regionalDefaults?.timezone, fallback.timezone),
    currency: normalizeText(regionalDefaults?.currency, fallback.currency),
    dateFormat: normalizeText(regionalDefaults?.dateFormat, fallback.dateFormat),
    timeFormat: normalizeText(regionalDefaults?.timeFormat, fallback.timeFormat),
    locale: normalizeText(regionalDefaults?.locale, fallback.locale),
  };
};

const normalizeOperatingHours = (hours) => {
  const source = Array.isArray(hours) && hours.length ? hours : defaultOperatingHours;
  return source.map((entry, index) => {
    const fallback = defaultOperatingHours[index] || defaultOperatingHours[0];

    return {
      day: normalizeText(entry?.day, fallback.day),
      open: normalizeText(entry?.open, fallback.open),
      close: normalizeText(entry?.close, fallback.close),
      breakStart: normalizeText(entry?.breakStart, fallback.breakStart),
      breakEnd: normalizeText(entry?.breakEnd, fallback.breakEnd),
      enabled: normalizeBoolean(entry?.enabled, fallback.enabled),
      guestBookingOpen: normalizeBoolean(entry?.guestBookingOpen, fallback.guestBookingOpen),
      note: normalizeText(entry?.note, fallback.note),
    };
  });
};

const normalizeSpecialHours = (specialHours) => {
  const source = Array.isArray(specialHours) && specialHours.length ? specialHours : defaultSpecialHours;
  return source.map((entry, index) => {
    const fallback = defaultSpecialHours[index] || defaultSpecialHours[0] || {};

    return {
      id: normalizeText(entry?.id, fallback.id || `special-${index + 1}`),
      date: normalizeText(entry?.date, fallback.date || ''),
      label: normalizeText(entry?.label, fallback.label || 'Special Hours'),
      type: normalizeText(entry?.type, fallback.type || 'Special hours'),
      open: normalizeText(entry?.open, fallback.open || ''),
      close: normalizeText(entry?.close, fallback.close || ''),
      closed: normalizeBoolean(entry?.closed, fallback.closed ?? true),
      note: normalizeText(entry?.note, fallback.note || ''),
    };
  });
};

const normalizeBookingRules = (bookingRules) => {
  const fallback = defaultBookingRules;
  return {
    bufferTime: normalizeText(bookingRules?.bufferTime, fallback.bufferTime),
    slotInterval: normalizeText(bookingRules?.slotInterval, fallback.slotInterval),
    cancellationWindow: normalizeText(bookingRules?.cancellationWindow, fallback.cancellationWindow),
    reminderTiming: normalizeText(bookingRules?.reminderTiming, fallback.reminderTiming),
    reminderCadence: normalizeText(bookingRules?.reminderCadence, fallback.reminderCadence),
    maxAdvanceBooking: normalizeText(bookingRules?.maxAdvanceBooking, fallback.maxAdvanceBooking),
    minimumLeadTime: normalizeText(bookingRules?.minimumLeadTime, fallback.minimumLeadTime),
    reschedulePolicy: normalizeText(bookingRules?.reschedulePolicy, fallback.reschedulePolicy),
    noShowPolicy: normalizeText(bookingRules?.noShowPolicy, fallback.noShowPolicy),
    defaultAppointmentStatus: normalizeText(
      bookingRules?.defaultAppointmentStatus,
      fallback.defaultAppointmentStatus,
    ),
    approvalMode: normalizeText(bookingRules?.approvalMode, fallback.approvalMode),
    staffSelectionVisibility: normalizeText(
      bookingRules?.staffSelectionVisibility,
      fallback.staffSelectionVisibility,
    ),
    sameDayBooking: normalizeBoolean(bookingRules?.sameDayBooking, fallback.sameDayBooking),
    walkInsAllowed: normalizeBoolean(bookingRules?.walkInsAllowed, fallback.walkInsAllowed),
    depositRequired: normalizeBoolean(bookingRules?.depositRequired, fallback.depositRequired),
    hidePrices: normalizeBoolean(bookingRules?.hidePrices, fallback.hidePrices),
    guestBookingVisibility: normalizeText(
      bookingRules?.guestBookingVisibility,
      fallback.guestBookingVisibility,
    ),
    onlineDepositAmount: normalizeText(
      bookingRules?.onlineDepositAmount,
      fallback.onlineDepositAmount,
    ),
  };
};

const normalizeCommunication = (communication) => {
  const fallback = defaultCommunicationSettings;
  return {
    confirmationEmail: normalizeBoolean(communication?.confirmationEmail, fallback.confirmationEmail),
    reminderEmail: normalizeBoolean(communication?.reminderEmail, fallback.reminderEmail),
    senderName: normalizeBrandValue(communication?.senderName, fallback.senderName),
    senderEmail: normalizeBrandValue(communication?.senderEmail, fallback.senderEmail),
    replyToEmail: normalizeBrandValue(communication?.replyToEmail, fallback.replyToEmail),
    reminderCadence: normalizeText(communication?.reminderCadence, fallback.reminderCadence),
    confirmationMessage: normalizeText(
      communication?.confirmationMessage,
      fallback.confirmationMessage,
    ),
    cancellationMessage: normalizeText(
      communication?.cancellationMessage,
      fallback.cancellationMessage,
    ),
    smsEnabled: normalizeBoolean(communication?.smsEnabled, fallback.smsEnabled),
    whatsappEnabled: normalizeBoolean(communication?.whatsappEnabled, fallback.whatsappEnabled),
  };
};

const normalizeBranding = (branding, legacySettings = {}) => {
  const fallback = defaultBrandingSettings;
  const receiptHeaderQuote = normalizeText(
    branding?.receiptHeaderQuote ?? legacySettings.receiptQuote,
    fallback.receiptHeaderQuote,
  );
  const receiptFooterText = normalizeText(
    branding?.receiptFooterText ?? legacySettings.receiptFooterText,
    fallback.receiptFooterText,
  );
  const logoPlacement = branding?.logoPlacement === 'left' ? 'left' : fallback.logoPlacement;
  const logoSize = ['small', 'medium', 'large'].includes(branding?.logoSize)
    ? branding.logoSize
    : fallback.logoSize;
  const taxDisplayMode = branding?.taxDisplayMode === 'Excluded' ? 'Excluded' : fallback.taxDisplayMode;

  return {
    receiptHeaderQuote,
    receiptFooterText,
    receiptNumberPrefix: normalizeText(branding?.receiptNumberPrefix, fallback.receiptNumberPrefix),
    logoPlacement,
    logoSize,
    showAddressOnReceipt: normalizeBoolean(branding?.showAddressOnReceipt, fallback.showAddressOnReceipt),
    showPhoneOnReceipt: normalizeBoolean(branding?.showPhoneOnReceipt, fallback.showPhoneOnReceipt),
    showEmailOnReceipt: normalizeBoolean(branding?.showEmailOnReceipt, fallback.showEmailOnReceipt),
    showWebsiteOnReceipt: normalizeBoolean(branding?.showWebsiteOnReceipt, fallback.showWebsiteOnReceipt),
    showTaxIdOnReceipt: normalizeBoolean(branding?.showTaxIdOnReceipt, fallback.showTaxIdOnReceipt),
    taxDisplayMode,
    includeSocialHandles: normalizeBoolean(
      branding?.includeSocialHandles ?? legacySettings.includeSocialHandles,
      fallback.includeSocialHandles,
    ),
    showBrandMark: normalizeBoolean(branding?.showBrandMark, fallback.showBrandMark),
  };
};

const normalizeReceiptSettings = (settings) => {
  const profile = normalizeProfile(settings?.profile);
  const regionalDefaults = normalizeRegionalDefaults(settings?.regionalDefaults);
  const operatingHours = normalizeOperatingHours(settings?.operatingHours);
  const specialHours = normalizeSpecialHours(settings?.specialHours);
  const bookingRules = normalizeBookingRules(settings?.bookingRules);
  const communication = normalizeCommunication(settings?.communication);
  const branding = normalizeBranding(settings?.branding, settings || {});

  return {
    profile,
    regionalDefaults,
    operatingHours,
    specialHours,
    bookingRules,
    communication,
    branding,
    receiptQuote: branding.receiptHeaderQuote,
    receiptFooterText: branding.receiptFooterText,
    brandingLayout: branding.logoPlacement,
    includeSocialHandles: branding.includeSocialHandles,
    updatedAt: normalizeText(settings?.updatedAt, ''),
  };
};

const defaultNormalizedReceiptSettings = normalizeReceiptSettings(defaultReceiptSettings);

let receiptSettingsCache = defaultNormalizedReceiptSettings;

export const primeReceiptSettings = (settings) => {
  receiptSettingsCache = normalizeReceiptSettings(settings);
  return receiptSettingsCache;
};

export const loadReceiptSettings = () => receiptSettingsCache;

export const fetchReceiptSettings = async () => {
  try {
    const settings = await crmGetSettings();
    return primeReceiptSettings(settings);
  } catch (error) {
    if (error?.status === 404) {
      return receiptSettingsCache || defaultNormalizedReceiptSettings;
    }

    throw error;
  }
};

export const saveReceiptSettings = async (settings) => {
  const saved = await crmSaveSettings(settings);
  return primeReceiptSettings(saved);
};
