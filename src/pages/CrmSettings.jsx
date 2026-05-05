import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock3,
  LogOut,
  Palette,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { clearCrmToken, getCrmSession } from '../config/crm';
import { crmHealthCheck } from '../config/crmApi';
import { fetchReceiptSettings, loadReceiptSettings, saveReceiptSettings } from '../config/receiptSettings';
import CrmShell from '../components/CrmShell';
import {
  BusinessProfileForm,
  OperatingHoursDayCard,
  ReceiptBrandingPreview,
  SettingsSaveState,
  SettingsDisclosureCard,
  SettingsSectionHeader,
  SpecialHoursManager,
} from '../components/settings/SettingsBlocks';
import './CrmSettings.css';

const sectionGroups = [
  {
    title: 'Core Business',
    sections: [
      { id: 'business-profile', label: 'Business Profile', icon: Sparkles, summary: 'Identity, contact, and legal details.' },
      { id: 'operating-hours', label: 'Operating Hours', icon: Clock3, summary: 'Weekly rhythm and seasonal windows.' },
    ],
  },
  {
    title: 'Brand Experience',
    sections: [{ id: 'branding-receipts', label: 'Branding & Receipts', icon: Palette, summary: 'Receipts and visual presentation.' }],
  },
];

const sectionMetaById = sectionGroups.reduce((acc, group) => {
  group.sections.forEach((section) => {
    acc[section.id] = {
      groupTitle: group.title,
      sectionLabel: section.label,
      sectionSummary: section.summary,
    };
  });
  return acc;
}, {});

const SETTINGS_ROLE_ALIASES = {
  admin: 'owner',
  owner: 'owner',
  manager: 'manager',
  supervisor: 'manager',
  receptionist: 'front-desk',
  frontdesk: 'front-desk',
  front_desk: 'front-desk',
};

const SETTINGS_ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  'front-desk': 'Front Desk',
};

const normalizeSettingsRole = (role) => {
  const value = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return SETTINGS_ROLE_ALIASES[value] || value || 'front-desk';
};

const formatSettingsRoleLabel = (role) => SETTINGS_ROLE_LABELS[normalizeSettingsRole(role)] || 'CRM user';

const formatDisplayName = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  const localPart = text.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!localPart) return '';

  return localPart
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const notificationItems = [
  { title: '2 confirmations sent', detail: 'Guests for today\'s bookings were notified 24 hours ahead.' },
  { title: '1 seasonal window pending', detail: 'Holiday hours can be published from Operating Hours.' },
  { title: 'Receipt quote updated', detail: 'The receipt header copy was edited 12 minutes ago.' },
];

const BRANDING_SWITCHES = [
  ['showAddressOnReceipt', 'Show address on receipt', 'Display the location address on customer receipts.'],
  ['showPhoneOnReceipt', 'Show phone on receipt', 'Display the business phone number on receipts.'],
  ['showEmailOnReceipt', 'Show email on receipt', 'Display the business email on receipts.'],
  ['showWebsiteOnReceipt', 'Show website on receipt', 'Display the website on receipts.'],
  ['showTaxIdOnReceipt', 'Show tax/legal ID', 'Include the legal identifier on branded documents.'],
  ['includeSocialHandles', 'Include social handles', 'Display social or website references on receipts.'],
  ['showBrandMark', 'Show brand mark', 'Use the uploaded brand mark when available.'],
];

const panelMetaById = {
  notifications: {
    label: 'Notifications',
    title: 'Live activity and pending actions',
  },
  account: {
    label: 'Account',
    title: 'Account controls',
  },
  privacy: {
    label: 'Privacy',
    title: 'Privacy summary',
  },
  'special-hours': {
    label: 'Special Hours',
    title: 'Holiday closure or seasonal override',
  },
  terms: {
    label: 'Terms',
    title: 'Terms summary',
  },
  'history-business-profile': {
    label: 'Audit trail',
    title: 'Business Profile change history',
  },
  'history-operating-hours': {
    label: 'Audit trail',
    title: 'Operating Hours change history',
  },
  'history-branding-receipts': {
    label: 'Audit trail',
    title: 'Branding & Receipts change history',
  },
};

const SectionCompactPanel = ({ description, points = [], onOpen }) => (
  <div className="crm-settings-section-compact">
    <p>{description}</p>
    {points.length ? (
      <div className="crm-settings-section-compact-points">
        {points.map((point, index) => (
          <span key={`${point}-${index}`}>{point}</span>
        ))}
      </div>
    ) : null}
    <button type="button" className="crm-settings-section-open" onClick={onOpen}>
      Open section
    </button>
  </div>
);

const cloneSettings = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const createSpecialHourDraft = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return {
    id: `special-${Date.now()}`,
    label: 'Seasonal Hours',
    date: date.toISOString().slice(0, 10),
    type: 'Seasonal hours',
    open: '10:00',
    close: '16:00',
    closed: true,
    note: 'Temporary seasonal window staged from Settings.',
  };
};

const isNonEmpty = (value) => String(value || '').trim().length > 0;
const isEmailLike = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const buildSectionSnapshot = (settings) => ({
  profile: {
    businessName: settings.profile.businessName,
    legalName: settings.profile.legalName,
    receiptDisplayName: settings.profile.receiptDisplayName,
    branchName: settings.profile.branchName,
    contactEmail: settings.profile.contactEmail,
    contactPhone: settings.profile.contactPhone,
    publicBookingEmail: settings.profile.publicBookingEmail,
    publicBookingPhone: settings.profile.publicBookingPhone,
    internalContactName: settings.profile.internalContactName,
    internalContactEmail: settings.profile.internalContactEmail,
    address: settings.profile.address,
    mapLink: settings.profile.mapLink,
    website: settings.profile.website,
    bookingPageUrl: settings.profile.bookingPageUrl,
    taxId: settings.profile.taxId,
    brandMarkName: settings.profile.brandMarkName,
    brandMarkImage: settings.profile.brandMarkImage,
  },
  operatingHours: settings.operatingHours,
  specialHours: settings.specialHours,
  communication: settings.communication,
  branding: settings.branding,
});

const validateSettings = (settings) => {
  const issues = {
    profile: [],
    operatingHours: [],
    branding: [],
  };

  if (!isNonEmpty(settings.profile.businessName)) issues.profile.push('Business name is required.');
  if (!isEmailLike(settings.profile.contactEmail)) issues.profile.push('Main contact email should be valid.');
  if (!isNonEmpty(settings.profile.address)) issues.profile.push('Primary location address is missing.');

  settings.operatingHours.forEach((entry) => {
    if (entry.enabled && (!isNonEmpty(entry.open) || !isNonEmpty(entry.close))) {
      issues.operatingHours.push(`${entry.day} needs open and close times.`);
    }
    if (entry.enabled && isNonEmpty(entry.breakStart) !== isNonEmpty(entry.breakEnd)) {
      issues.operatingHours.push(`${entry.day} break times should be completed together.`);
    }
  });

  if (!isNonEmpty(settings.branding.receiptNumberPrefix)) issues.branding.push('Receipt number prefix is required.');
  if (!isNonEmpty(settings.branding.receiptHeaderQuote)) issues.branding.push('Receipt header quote can not be blank.');
  if (!isNonEmpty(settings.branding.receiptFooterText)) issues.branding.push('Receipt footer text can not be blank.');

  return issues;
};

const buildValidationFieldErrors = (settings) => ({
  profile: {
    businessName: !isNonEmpty(settings.profile.businessName) ? 'Business name is required.' : '',
    contactEmail: !isEmailLike(settings.profile.contactEmail) ? 'Main contact email should be valid.' : '',
    address: !isNonEmpty(settings.profile.address) ? 'Primary location address is missing.' : '',
  },
  branding: {
    receiptNumberPrefix: !isNonEmpty(settings.branding.receiptNumberPrefix) ? 'Receipt number prefix is required.' : '',
    receiptHeaderQuote: !isNonEmpty(settings.branding.receiptHeaderQuote) ? 'Receipt header quote can not be blank.' : '',
    receiptFooterText: !isNonEmpty(settings.branding.receiptFooterText) ? 'Receipt footer text can not be blank.' : '',
  },
});

const formatTimestamp = (value) =>
  new Date(value || Date.now()).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const listProfileChanges = (draftProfile, savedProfile) => {
  const fields = [
    ['businessName', 'Business name'],
    ['legalName', 'Legal entity name'],
    ['receiptDisplayName', 'Receipt display name'],
    ['branchName', 'Branch name'],
    ['contactEmail', 'Main contact email'],
    ['contactPhone', 'Main contact phone'],
    ['publicBookingEmail', 'Public booking email'],
    ['publicBookingPhone', 'Public booking phone'],
    ['internalContactName', 'Internal contact name'],
    ['internalContactEmail', 'Internal contact email'],
    ['address', 'Address'],
    ['mapLink', 'Map link'],
    ['website', 'Website'],
    ['bookingPageUrl', 'Booking page URL'],
    ['timezone', 'Timezone'],
    ['currency', 'Currency'],
    ['locale', 'Locale'],
    ['taxId', 'Tax / legal ID'],
    ['brandMarkName', 'Brand mark label'],
  ];

  return fields
    .filter(([field]) => String(draftProfile?.[field] || '') !== String(savedProfile?.[field] || ''))
    .map(([, label]) => label);
};

const listBrandingChanges = (draftBranding, savedBranding) => {
  const fields = [
    ['receiptHeaderQuote', 'Receipt header quote'],
    ['receiptFooterText', 'Receipt footer text'],
    ['receiptNumberPrefix', 'Receipt number prefix'],
    ['logoPlacement', 'Logo placement'],
    ['logoSize', 'Logo size'],
    ['taxDisplayMode', 'Tax display'],
    ['showAddressOnReceipt', 'Address visibility'],
    ['showPhoneOnReceipt', 'Phone visibility'],
    ['showEmailOnReceipt', 'Email visibility'],
    ['showWebsiteOnReceipt', 'Website visibility'],
    ['showTaxIdOnReceipt', 'Tax/legal ID visibility'],
    ['includeSocialHandles', 'Social handles'],
    ['showBrandMark', 'Brand mark visibility'],
  ];

  return fields
    .filter(([field]) => JSON.stringify(draftBranding?.[field]) !== JSON.stringify(savedBranding?.[field]))
    .map(([, label]) => label);
};

const listOperatingHourChanges = (draftHours, savedHours, draftSpecialHours, savedSpecialHours) => {
  const changedDays = [];

  draftHours.forEach((entry, index) => {
    const savedEntry = savedHours?.[index];
    const keys = ['open', 'close', 'breakStart', 'breakEnd', 'enabled', 'guestBookingOpen', 'note'];
    const hasChanged = !savedEntry || keys.some((key) => JSON.stringify(entry?.[key]) !== JSON.stringify(savedEntry?.[key]));
    if (hasChanged) changedDays.push(entry.day || `Day ${index + 1}`);
  });

  const specialChanged = JSON.stringify(draftSpecialHours || []) !== JSON.stringify(savedSpecialHours || []);
  const summary = changedDays.length ? `${changedDays.join(', ')} updated` : 'Weekly schedule unchanged';

  if (specialChanged) {
    return `${summary}; special hours changed`;
  }

  return summary;
};

const describeSectionChanges = (sectionId, draftSettings, savedSettings) => {
  if (sectionId === 'business-profile') {
    const changes = listProfileChanges(draftSettings.profile, savedSettings.profile);
    return changes.length ? `${changes.slice(0, 3).join(', ')} updated` : 'No profile changes to record';
  }

  if (sectionId === 'operating-hours') {
    return listOperatingHourChanges(
      draftSettings.operatingHours,
      savedSettings.operatingHours,
      draftSettings.specialHours,
      savedSettings.specialHours,
    );
  }

  if (sectionId === 'branding-receipts') {
    const changes = listBrandingChanges(draftSettings.branding, savedSettings.branding);
    return changes.length ? `${changes.slice(0, 3).join(', ')} updated` : 'No branding changes to record';
  }

  return 'Configuration updated';
};

const makeAuditEntry = (sectionId, title, detail, tone = 'good') => ({
  id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  sectionId,
  title,
  detail,
  tone,
  at: new Date().toISOString(),
});

const CrmSettings = () => {
  const navigate = useNavigate();
  const brandMarkInputRef = useRef(null);
  const crmSession = useMemo(() => getCrmSession(), []);
  const crmRole = useMemo(() => normalizeSettingsRole(crmSession?.role), [crmSession]);
  const crmRoleLabel = useMemo(() => formatSettingsRoleLabel(crmRole), [crmRole]);
  const crmUserLabel = useMemo(
    () => formatDisplayName(crmSession?.email || crmSession?.sub) || crmSession?.fullName || crmRoleLabel,
    [crmSession, crmRoleLabel],
  );
  const [bootSettings] = useState(() => loadReceiptSettings());
  const [savedSettings, setSavedSettings] = useState(() => cloneSettings(bootSettings));
  const [draft, setDraft] = useState(() => cloneSettings(bootSettings));
  const [saveState, setSaveState] = useState('saved');
  const [saveIssue, setSaveIssue] = useState(null);
  const [activeSection, setActiveSection] = useState('business-profile');
  const [activePanel, setActivePanel] = useState(null);
  const [previewMode, setPreviewMode] = useState('booking');
  const [specialHourDraft, setSpecialHourDraft] = useState(() => createSpecialHourDraft());
  const [brandMarkLabel, setBrandMarkLabel] = useState(bootSettings.profile.brandMarkName || 'Update brand mark');
  const [brandMarkPreview, setBrandMarkPreview] = useState(bootSettings.profile.brandMarkImage || '');
  const [lastSavedAt, setLastSavedAt] = useState(bootSettings.updatedAt || new Date().toISOString());
  const [systemHealth, setSystemHealth] = useState({
    state: 'checking',
    ok: null,
    message: 'Checking CRM backend...',
    database: null,
    timestamp: null,
  });
  const [auditTrail, setAuditTrail] = useState(() => [
    makeAuditEntry('workspace', 'Workspace loaded', 'The settings surface opened from the saved CRM cache.', 'good'),
  ]);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hydrateSettings = async () => {
      try {
        const settings = await fetchReceiptSettings();
        if (!mounted) return;
        const snapshot = cloneSettings(settings);
        setSavedSettings(snapshot);
        setDraft(snapshot);
        setBrandMarkLabel(snapshot.profile.brandMarkName || 'Update brand mark');
        setBrandMarkPreview(snapshot.profile.brandMarkImage || '');
        setLastSavedAt(snapshot.updatedAt || new Date().toISOString());
        recordAuditEntries([
          {
            sectionId: 'workspace',
            title: 'Settings synced',
            detail: 'Latest CRM settings were loaded from the backend.',
            tone: 'good',
          },
        ]);
      } catch {
        if (!mounted) return;
        setSavedSettings(bootSettings);
        setDraft(cloneSettings(bootSettings));
        setBrandMarkLabel(bootSettings.profile.brandMarkName || 'Update brand mark');
        setBrandMarkPreview(bootSettings.profile.brandMarkImage || '');
        setLastSavedAt(bootSettings.updatedAt || new Date().toISOString());
        recordAuditEntries([
          {
            sectionId: 'workspace',
            title: 'Loaded from local cache',
            detail: 'CRM settings API was unavailable, so the saved local workspace snapshot was used.',
            tone: 'warning',
          },
        ]);
      } finally {
        if (mounted) setIsBooting(false);
      }

      if (mounted) {
        await refreshSystemHealth();
      }
    };

    void hydrateSettings();

    return () => {
      mounted = false;
    };
  }, [bootSettings]);

  const validationErrors = useMemo(() => validateSettings(draft), [draft]);
  const validationFieldErrors = useMemo(() => buildValidationFieldErrors(draft), [draft]);
  const validationCount = useMemo(
    () => Object.values(validationErrors).reduce((sum, list) => sum + list.length, 0),
    [validationErrors],
  );

  const dirtySections = useMemo(() => {
    const current = buildSectionSnapshot(draft);
    const saved = buildSectionSnapshot(savedSettings);
    const compare = (key) => JSON.stringify(current[key]) !== JSON.stringify(saved[key]);

    return {
      profile: compare('profile'),
      operatingHours: compare('operatingHours') || compare('specialHours'),
      branding: compare('branding'),
    };
  }, [draft, savedSettings]);

  const dirty = Object.values(dirtySections).some(Boolean);
  const effectiveSaveState = saveState === 'saving' || saveState === 'error' ? saveState : dirty ? 'dirty' : 'saved';

  const sectionStates = useMemo(
    () => [
      ['business-profile', 'Business Profile', 'profile'],
      ['operating-hours', 'Operating Hours', 'operatingHours'],
      ['branding-receipts', 'Branding & Receipts', 'branding'],
    ].map(([id, label, key]) => {
      const errorCount = validationErrors[key]?.length || 0;
      const sectionDirty = dirtySections[key];
      const state = errorCount > 0 ? 'error' : sectionDirty ? 'dirty' : 'saved';
      return { id, label, key, state, stateLabel: errorCount > 0 ? `${errorCount} issue${errorCount === 1 ? '' : 's'}` : sectionDirty ? 'Draft' : 'Ready' };
    }),
    [dirtySections, validationErrors],
  );
  const sectionStateById = useMemo(
    () => Object.fromEntries(sectionStates.map((section) => [section.id, section])),
    [sectionStates],
  );

  const recordAuditEntries = (entries) => {
    if (!entries.length) return;
    setAuditTrail((current) => {
      const nextEntries = entries.map((entry) =>
        entry.id
          ? entry
          : makeAuditEntry(
              entry.sectionId || 'workspace',
              entry.title || 'Workspace update',
              entry.detail || 'Settings were updated.',
              entry.tone || 'good',
            ),
      );

      return [...nextEntries, ...current].slice(0, 18);
    });
  };

  const refreshSystemHealth = async () => {
    try {
      const snapshot = await crmHealthCheck();
      const database = snapshot.payload?.database || {};
      const ready = Boolean(snapshot.ok);
      const state = ready ? 'ready' : String(database.state || '').toLowerCase().includes('degrad') ? 'degraded' : 'offline';
      setSystemHealth({
        state,
        ok: ready,
        message: ready
          ? 'CRM backend and database are ready.'
          : database.message || 'CRM backend is unavailable while the database starts.',
        database,
        timestamp: snapshot.payload?.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      setSystemHealth({
        state: 'offline',
        ok: false,
        message: error?.message || 'CRM backend could not be reached.',
        database: null,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const markChanged = () => {
    setSaveState((current) => (current === 'saving' ? current : 'dirty'));
    setSaveIssue(null);
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateProfile = (field, value) => {
    setDraft((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
    markChanged();
  };

  const updateBranding = (field, value) => {
    setDraft((current) => ({ ...current, branding: { ...current.branding, [field]: value } }));
    markChanged();
  };

  const updateHour = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      operatingHours: current.operatingHours.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    }));
    markChanged();
  };

  const toggleHour = (index) => {
    setDraft((current) => ({
      ...current,
      operatingHours: current.operatingHours.map((entry, i) => (i === index ? { ...entry, enabled: !entry.enabled } : entry)),
    }));
    markChanged();
  };

  const handleBrandMarkChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setBrandMarkLabel(file.name);
      setBrandMarkPreview(dataUrl);
      updateProfile('brandMarkName', file.name);
      updateProfile('brandMarkImage', dataUrl);
      recordAuditEntries([
        {
          sectionId: 'business-profile',
          title: 'Brand mark updated',
          detail: `Uploaded ${file.name} for the business profile.`,
          tone: 'good',
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSpecialHours = () => {
    setSpecialHourDraft(createSpecialHourDraft());
    setActivePanel('special-hours');
  };

  const updateSpecialHourDraft = (field, value) => {
    setSpecialHourDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSaveSpecialHours = () => {
    setDraft((current) => ({ ...current, specialHours: [specialHourDraft, ...current.specialHours] }));
    setSaveState('dirty');
    setSaveIssue(null);
    recordAuditEntries([
      {
        sectionId: 'operating-hours',
        title: 'Special hours staged',
        detail: `${specialHourDraft.label} was added to the seasonal schedule draft.`,
        tone: 'warning',
      },
    ]);
    setActivePanel(null);
  };

  const handleRemoveSpecialHour = (id) => {
    const removed = draft.specialHours.find((item) => item.id === id);
    setDraft((current) => ({ ...current, specialHours: current.specialHours.filter((item) => item.id !== id) }));
    markChanged();
    recordAuditEntries([
      {
        sectionId: 'operating-hours',
        title: 'Special hours removed',
        detail: removed ? `${removed.label} was removed from the seasonal schedule.` : 'A special hours entry was removed from the seasonal schedule.',
        tone: 'warning',
      },
    ]);
  };

  const resetAll = () => {
    const snapshot = cloneSettings(savedSettings);
    setDraft(snapshot);
    setBrandMarkLabel(snapshot.profile.brandMarkName || 'Update brand mark');
    setBrandMarkPreview(snapshot.profile.brandMarkImage || '');
    setSaveState('saved');
    setSaveIssue(null);
    recordAuditEntries([
      {
        sectionId: 'workspace',
        title: 'Workspace reset',
        detail: 'Unsaved changes were discarded and the last saved configuration was restored.',
        tone: 'warning',
      },
    ]);
  };

  const resetSection = (sectionId) => {
    setDraft((current) => {
      const next = cloneSettings(current);
      switch (sectionId) {
        case 'business-profile':
          next.profile = cloneSettings(savedSettings.profile);
          setBrandMarkLabel(savedSettings.profile.brandMarkName || 'Update brand mark');
          setBrandMarkPreview(savedSettings.profile.brandMarkImage || '');
          break;
        case 'operating-hours':
          next.operatingHours = cloneSettings(savedSettings.operatingHours);
          next.specialHours = cloneSettings(savedSettings.specialHours);
          break;
        case 'branding-receipts':
          next.branding = cloneSettings(savedSettings.branding);
          break;
        default:
          return current;
      }
      return next;
    });
    setSaveState('dirty');
    setSaveIssue(null);
    recordAuditEntries([
      {
        sectionId,
        title: `${sectionStateById[sectionId]?.label || 'Section'} reset`,
        detail: `The ${sectionStateById[sectionId]?.label || 'selected'} settings were restored from the last saved snapshot.`,
        tone: 'warning',
      },
    ]);
  };

  const handleSave = async () => {
    if (validationCount > 0) {
      setSaveState('error');
      setSaveIssue('validation');
      return;
    }

    try {
      setSaveState('saving');
      const saved = await saveReceiptSettings(draft);
      const snapshot = cloneSettings(saved);
      setSavedSettings(snapshot);
      setDraft(snapshot);
      setBrandMarkLabel(snapshot.profile.brandMarkName || 'Update brand mark');
      setBrandMarkPreview(snapshot.profile.brandMarkImage || '');
      setLastSavedAt(snapshot.updatedAt || new Date().toISOString());
      setSaveState('saved');
      setSaveIssue(null);
      recordAuditEntries(
        Object.entries(dirtySections)
          .filter(([, changed]) => changed)
          .map(([sectionId]) => ({
            sectionId,
            title: `${sectionStateById[sectionId]?.label || 'Section'} saved`,
            detail: describeSectionChanges(sectionId, draft, snapshot),
            tone: 'good',
          })),
      );
      recordAuditEntries([
        {
          sectionId: 'workspace',
          title: 'Settings saved',
          detail: `Saved at ${formatTimestamp(snapshot.updatedAt || new Date().toISOString())}.`,
          tone: 'good',
        },
      ]);
    } catch {
      setSaveState('error');
      setSaveIssue('sync');
    }
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };
  const activeHistorySectionId = activePanel?.startsWith('history-') ? activePanel.slice('history-'.length) : null;
  const activePanelMeta = activePanel
    ? panelMetaById[activePanel] ||
      (activeHistorySectionId
        ? {
            label: 'Audit trail',
            title: `${sectionStateById[activeHistorySectionId]?.label || 'Section'} change history`,
          }
        : panelMetaById.terms)
    : null;
  const activeHistoryEntries = useMemo(
    () => (activeHistorySectionId ? auditTrail.filter((entry) => entry.sectionId === activeHistorySectionId) : []),
    [activeHistorySectionId, auditTrail],
  );
  const activeSectionSummary = useMemo(
    () => describeSectionChanges(activeSection, draft, savedSettings),
    [activeSection, draft, savedSettings],
  );
  const systemStateLabel =
    systemHealth.state === 'ready'
      ? 'Healthy'
      : systemHealth.state === 'checking'
        ? 'Checking'
        : systemHealth.state === 'degraded'
          ? 'Degraded'
          : 'Offline';

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  if (isBooting) {
    return (
      <CrmShell shellClassName="crm-settings-shell">
        <main className="crm-settings-main">
          <div className="crm-settings-loading-grid" aria-label="Loading settings">
            <div className="crm-settings-loading-card crm-settings-loading-card-large" />
            <div className="crm-settings-loading-card crm-settings-loading-card-tall" />
            <div className="crm-settings-loading-row">
              <div className="crm-settings-loading-card" />
              <div className="crm-settings-loading-card" />
            </div>
            <div className="crm-settings-loading-row">
              <div className="crm-settings-loading-card" />
              <div className="crm-settings-loading-card" />
            </div>
          </div>
        </main>
      </CrmShell>
    );
  }

  return (
    <CrmShell shellClassName="crm-settings-shell">
      <main className="crm-settings-main">
        <header className="crm-settings-topbar">
          <div className="crm-settings-header-copy">
            <p className="crm-settings-kicker">Ecosystem Configuration</p>
            <h1>Refine the Essence of Your Sanctuary</h1>
            <p className="crm-settings-subcopy">
              Configure the business profile, operating rhythm, and branded receipt presentation
              from one calm dual-pane workspace with live preview and status feedback.
            </p>
          </div>

          <div className="crm-settings-topbar-stack">
            <SettingsSaveState
              saveState={effectiveSaveState}
              dirty={dirty}
              validationCount={validationCount}
              lastSavedAt={lastSavedAt}
              onSave={handleSave}
              onResetAll={resetAll}
              saveIssue={saveIssue}
              backendReady={systemHealth.ok !== false}
            />

            <div className="crm-settings-topbar-actions">
              <button
                className="crm-settings-icon-btn"
                type="button"
                aria-label="Notifications"
                aria-expanded={activePanel === 'notifications'}
                onClick={() => setActivePanel(activePanel === 'notifications' ? null : 'notifications')}
              >
                <Bell size={16} />
              </button>
              <button
                className="crm-settings-icon-btn"
                type="button"
                aria-label="Account"
                aria-expanded={activePanel === 'account'}
                onClick={() => setActivePanel(activePanel === 'account' ? null : 'account')}
              >
                <UserRound size={16} />
              </button>
              <button className="crm-settings-logout-btn" type="button" onClick={handleLogout}>
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        <section className="crm-settings-workspace crm-settings-workspace-dual">
          <aside className="crm-settings-nav-rail">
            <article className="crm-settings-rail-card crm-settings-rail-summary">
              <p className="crm-settings-rail-kicker">Workspace status</p>
              <h3>
                {saveState === 'saving'
                  ? 'Saving changes'
                  : saveState === 'error'
                    ? saveIssue === 'validation'
                      ? 'Review required'
                      : 'Save failed'
                    : dirty
                      ? 'Draft changes'
                      : 'Configuration synced'}
              </h3>
              <p>
                {saveState === 'error' && saveIssue !== 'validation'
                  ? systemHealth.state === 'ready'
                    ? 'The CRM could not confirm the last save.'
                    : 'The CRM backend is offline. Start the API or database, then save again.'
                  : dirty
                    ? 'You have unsaved configuration changes in the active workspace.'
                    : 'The current settings are synced across the CRM workspace.'}
              </p>
              <div className="crm-settings-rail-metrics">
                <span>{crmRoleLabel}</span>
                <span>{dirty ? 'Draft' : 'Synced'}</span>
                <span>{validationCount ? `${validationCount} review` : 'No blockers'}</span>
              </div>
            </article>

            <nav className="crm-settings-nav-list" aria-label="Settings sections">
              {sectionGroups.map((group) => (
                <section key={group.title} className="crm-settings-nav-group">
                  <span className="crm-settings-nav-group-label">{group.title}</span>
                  <div className="crm-settings-nav-group-items">
                    {group.sections.map((section) => {
                      const sectionState = sectionStateById[section.id];
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          className={`crm-settings-nav-item${isActive ? ' crm-settings-nav-item-active' : ''}`}
                          onClick={() => scrollToSection(section.id)}
                        >
                          <div>
                            <strong>{section.label}</strong>
                            <p>{section.summary}</p>
                          </div>
                          <em>{sectionState?.stateLabel || 'Ready'}</em>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>

            <article className="crm-settings-rail-card crm-settings-rail-health">
              <div className="crm-settings-rail-card-head">
                <div>
                  <p className="crm-settings-rail-kicker">System status</p>
                  <h3>{systemStateLabel}</h3>
                </div>
                <button type="button" className="crm-settings-inline-action" onClick={refreshSystemHealth}>
                  Refresh
                </button>
              </div>
              <p className="crm-settings-rail-copy">{systemHealth.message}</p>
              <div className="crm-settings-rail-grid">
                <div>
                  <span>API</span>
                  <strong>{systemHealth.ok ? 'Online' : 'Unavailable'}</strong>
                </div>
                <div>
                  <span>Database</span>
                  <strong>{systemHealth.database?.state || 'Unknown'}</strong>
                </div>
                <div>
                  <span>Heartbeat</span>
                  <strong>{systemHealth.timestamp ? formatTimestamp(systemHealth.timestamp) : 'Pending'}</strong>
                </div>
              </div>
            </article>

            <article className="crm-settings-rail-card crm-settings-rail-access">
              <div className="crm-settings-rail-card-head">
                <div>
                  <p className="crm-settings-rail-kicker">Access & audit</p>
                  <h3>{crmRoleLabel}</h3>
                </div>
                <button type="button" className="crm-settings-inline-action" onClick={() => setActivePanel('history-business-profile')}>
                  View history
                </button>
              </div>
              <p className="crm-settings-rail-copy">{crmUserLabel}</p>
              <div className="crm-settings-rail-metrics crm-settings-rail-metrics-wrap">
                <span>{crmRoleLabel}</span>
                <span>{dirty ? 'Draft changes' : 'Synced'}</span>
                <span>{validationCount ? `${validationCount} issues` : 'Ready'}</span>
                <span>{sectionMetaById[activeSection]?.sectionLabel || 'Business Profile'}</span>
              </div>
            </article>
          </aside>

          <div className="crm-settings-primary-stack crm-settings-center-stack">
            <article className="crm-settings-card crm-settings-card-profile" id="business-profile">
              <SettingsSectionHeader
                kicker="Core Business"
                title="Business Profile"
                description="Public-facing identity and contact details visible to guests."
                status={sectionStateById['business-profile']?.stateLabel}
                statusTone={sectionStateById['business-profile']?.state}
                actions={
                  <div className="crm-settings-section-actions">
                    <button
                      className="crm-settings-inline-action"
                      type="button"
                      onClick={() => setActivePanel('history-business-profile')}
                    >
                      View history
                    </button>
                    <button className="crm-settings-ghost-action" type="button" onClick={() => resetSection('business-profile')}>
                      <span>Reset Section</span>
                    </button>
                  </div>
                }
              />

              {activeSection === 'business-profile' ? (
                <>
                  {validationErrors.profile.length ? (
                    <div className="crm-settings-inline-alert">
                      <strong>{validationErrors.profile.length} profile issue{validationErrors.profile.length === 1 ? '' : 's'} to review</strong>
                      <p>{validationErrors.profile.join(' ')}</p>
                    </div>
                  ) : null}
                  <BusinessProfileForm
                    profile={draft.profile}
                    onChange={updateProfile}
                    brandMarkLabel={brandMarkLabel}
                    brandMarkPreview={brandMarkPreview}
                    onPickBrandMark={() => brandMarkInputRef.current?.click()}
                    errors={validationFieldErrors.profile}
                  />
                </>
              ) : (
                <SectionCompactPanel
                  description="Public identity, contact channels, and legal details for the business profile."
                  points={[
                    draft.profile.businessName || 'Business name',
                    draft.profile.branchName || 'Branch name',
                    draft.profile.receiptDisplayName || 'Receipt display name',
                  ]}
                  onOpen={() => scrollToSection('business-profile')}
                />
              )}

              <input
                ref={brandMarkInputRef}
                className="crm-settings-sr-file"
                type="file"
                accept="image/*"
                onChange={handleBrandMarkChange}
                aria-label="Upload brand mark"
              />
            </article>

            <section className="crm-settings-card crm-settings-hours-section" id="operating-hours">
              <SettingsSectionHeader
                kicker="Core Business"
                title="Operating Hours"
                description="Control the weekly rhythm your booking engine presents to guests."
                status={sectionStateById['operating-hours']?.stateLabel}
                statusTone={sectionStateById['operating-hours']?.state}
                actions={
                  <div className="crm-settings-section-actions">
                    <button
                      className="crm-settings-inline-action"
                      type="button"
                      onClick={() => setActivePanel('history-operating-hours')}
                    >
                      View history
                    </button>
                    <button className="crm-settings-ghost-action" type="button" onClick={handleAddSpecialHours}>
                      <Sparkles size={15} />
                      <span>Add Special Hours</span>
                    </button>
                  </div>
                }
              />

              {activeSection === 'operating-hours' ? (
                <>
                  {validationErrors.operatingHours.length ? (
                    <div className="crm-settings-inline-alert">
                      <strong>{validationErrors.operatingHours.length} schedule issue{validationErrors.operatingHours.length === 1 ? '' : 's'} to review</strong>
                      <p>{validationErrors.operatingHours.join(' ')}</p>
                    </div>
                  ) : null}
                  <div className="crm-settings-hours-grid">
                    {draft.operatingHours.map((entry, index) => (
                      <OperatingHoursDayCard
                        key={entry.day}
                        entry={entry}
                        onChange={(field, value) => updateHour(index, field, value)}
                        onToggle={() => toggleHour(index)}
                      />
                    ))}

                    <button className="crm-settings-hour-add-card" type="button" onClick={handleAddSpecialHours}>
                      <Sparkles size={24} />
                      <span>Create Special Hours</span>
                    </button>
                  </div>

                  <SpecialHoursManager
                    specialHours={draft.specialHours}
                    onAdd={handleAddSpecialHours}
                    onRemove={handleRemoveSpecialHour}
                  />
                </>
              ) : (
                <SectionCompactPanel
                  description="Weekly operating rhythm, guest-booking availability, and seasonal exceptions."
                  points={[
                    `${draft.operatingHours.filter((entry) => entry.enabled).length} open days`,
                    `${draft.specialHours.length} special windows`,
                    `${draft.operatingHours.filter((entry) => entry.guestBookingOpen).length} guest-booking days`,
                  ]}
                  onOpen={() => scrollToSection('operating-hours')}
                />
              )}
            </section>

            <article className="crm-settings-card" id="branding-receipts">
              <SettingsSectionHeader
                kicker="Brand Experience"
                title="Branding & Receipts"
                description="Shape the post-visit touchpoint with polished brand presentation."
                status={sectionStateById['branding-receipts']?.stateLabel}
                statusTone={sectionStateById['branding-receipts']?.state}
                actions={
                  <div className="crm-settings-section-actions">
                    <button
                      className="crm-settings-inline-action"
                      type="button"
                      onClick={() => setActivePanel('history-branding-receipts')}
                    >
                      View history
                    </button>
                    <button className="crm-settings-ghost-action" type="button" onClick={() => resetSection('branding-receipts')}>
                      <span>Reset Section</span>
                    </button>
                  </div>
                }
              />

              {activeSection === 'branding-receipts' ? (
                <div className="crm-settings-branding-panel">
                  {validationErrors.branding.length ? (
                    <div className="crm-settings-inline-alert">
                      <strong>{validationErrors.branding.length} branding issue{validationErrors.branding.length === 1 ? '' : 's'} to review</strong>
                      <p>{validationErrors.branding.join(' ')}</p>
                    </div>
                  ) : null}
                  <div className="crm-settings-form-grid crm-settings-form-grid-compact">
                    <label className="crm-settings-field crm-settings-field-full crm-settings-field-textarea">
                      <span>Receipt Header Quote</span>
                      <textarea
                        rows="4"
                        value={draft.branding.receiptHeaderQuote}
                        aria-invalid={Boolean(validationFieldErrors.branding.receiptHeaderQuote)}
                        onChange={(e) => updateBranding('receiptHeaderQuote', e.target.value)}
                      />
                      {validationFieldErrors.branding.receiptHeaderQuote ? (
                        <em className="crm-settings-field-error">{validationFieldErrors.branding.receiptHeaderQuote}</em>
                      ) : null}
                    </label>
                    <label className="crm-settings-field crm-settings-field-full crm-settings-field-textarea">
                      <span>Receipt Footer Text</span>
                      <textarea
                        rows="4"
                        value={draft.branding.receiptFooterText}
                        aria-invalid={Boolean(validationFieldErrors.branding.receiptFooterText)}
                        onChange={(e) => updateBranding('receiptFooterText', e.target.value)}
                      />
                      {validationFieldErrors.branding.receiptFooterText ? (
                        <em className="crm-settings-field-error">{validationFieldErrors.branding.receiptFooterText}</em>
                      ) : null}
                    </label>
                    <label className="crm-settings-field">
                      <span>Receipt Number Prefix</span>
                      <input
                        type="text"
                        value={draft.branding.receiptNumberPrefix}
                        aria-invalid={Boolean(validationFieldErrors.branding.receiptNumberPrefix)}
                        onChange={(e) => updateBranding('receiptNumberPrefix', e.target.value)}
                      />
                      {validationFieldErrors.branding.receiptNumberPrefix ? (
                        <em className="crm-settings-field-error">{validationFieldErrors.branding.receiptNumberPrefix}</em>
                      ) : null}
                    </label>
                    <label className="crm-settings-field">
                      <span>Logo Placement</span>
                      <select value={draft.branding.logoPlacement} onChange={(e) => updateBranding('logoPlacement', e.target.value)}>
                        <option value="centered">Centered</option>
                        <option value="left">Left aligned</option>
                      </select>
                    </label>
                    <label className="crm-settings-field">
                      <span>Logo Size</span>
                      <select value={draft.branding.logoSize} onChange={(e) => updateBranding('logoSize', e.target.value)}>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </label>
                    <label className="crm-settings-field">
                      <span>Tax Display</span>
                      <select value={draft.branding.taxDisplayMode} onChange={(e) => updateBranding('taxDisplayMode', e.target.value)}>
                        <option value="Included">Included</option>
                        <option value="Excluded">Excluded</option>
                      </select>
                    </label>
                  </div>

                  <SettingsDisclosureCard
                    title="Receipt visibility"
                    description="Control which contact, tax, and brand details appear on receipts."
                    badge="Advanced"
                    full
                  >
                    <div className="crm-settings-switch-stack crm-settings-switch-stack-compact">
                      {BRANDING_SWITCHES.map(([key, label, hint]) => (
                        <div className="crm-settings-switch-row" key={key}>
                          <div>
                            <span>{label}</span>
                            <p>{hint}</p>
                          </div>
                          <button
                            className={`crm-settings-toggle${draft.branding[key] ? ' crm-settings-toggle-on' : ''}`}
                            type="button"
                            aria-pressed={draft.branding[key]}
                            onClick={() => updateBranding(key, !draft.branding[key])}
                          >
                            <span />
                          </button>
                        </div>
                      ))}
                    </div>
                  </SettingsDisclosureCard>

                  <div className="crm-settings-branding-summary">
                    <div className="crm-settings-branding-chip">
                      <Sparkles size={16} />
                      <span>{draft.branding.logoPlacement === 'left' ? 'Logo left' : 'Logo centered'}</span>
                    </div>
                    <div className="crm-settings-branding-chip">
                      <Palette size={16} />
                      <span>Receipt quote active</span>
                    </div>
                    <div className="crm-settings-branding-chip">
                      <Clock3 size={16} />
                      <span>{draft.branding.taxDisplayMode} tax display</span>
                    </div>
                  </div>
                </div>
              ) : (
                <SectionCompactPanel
                  description="Receipt header, footer, numbering, logo placement, and visibility rules."
                  points={[
                    draft.branding.receiptNumberPrefix || 'RCT-',
                    draft.branding.logoPlacement === 'left' ? 'Logo left' : 'Logo centered',
                    draft.branding.taxDisplayMode,
                  ]}
                  onOpen={() => scrollToSection('branding-receipts')}
                />
              )}
            </article>
          </div>

          <div className="crm-settings-rail-stack">
            <ReceiptBrandingPreview
              profile={draft.profile}
              branding={draft.branding}
              communication={draft.communication}
              regionalDefaults={draft.regionalDefaults}
              operatingHours={draft.operatingHours}
              specialHours={draft.specialHours}
              bookingRules={draft.bookingRules}
              activeSectionId={activeSection}
              previewMode={previewMode}
              onPreviewModeChange={setPreviewMode}
              activeSectionLabel={sectionStateById[activeSection]?.label || 'Business Profile'}
              activeSectionMeta={sectionMetaById[activeSection] || sectionMetaById['business-profile']}
            />
          </div>
        </section>

        <footer className="crm-settings-footer">
          <span>(c) 2026 Aura Wellness Ecosystem</span>
          <div className="crm-settings-footer-links">
            <button type="button" onClick={() => setActivePanel('privacy')}>Privacy</button>
            <button type="button" onClick={() => setActivePanel('terms')}>Terms</button>
            <span className="crm-settings-footer-status">System Status: {systemStateLabel}</span>
          </div>
        </footer>

        {activePanel ? (
          <div className="crm-settings-modal-backdrop" role="presentation" onClick={() => setActivePanel(null)}>
            <article className="crm-settings-modal-card" role="dialog" aria-modal="true" aria-label={activePanel} onClick={(e) => e.stopPropagation()}>
              <div className="crm-settings-modal-head">
                <div>
                  <p>{activePanelMeta?.label || 'Panel'}</p>
                  <h3>{activePanelMeta?.title || 'Workspace panel'}</h3>
                </div>
                <button type="button" className="crm-settings-modal-close" onClick={() => setActivePanel(null)}>Close</button>
              </div>

              {activePanel === 'notifications' ? (
                <div className="crm-settings-modal-list">
                  {notificationItems.map((item) => (
                    <article key={item.title} className="crm-settings-modal-item">
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              {activePanel === 'account' ? (
                <div className="crm-settings-modal-list">
                  <article className="crm-settings-modal-item"><strong>Current user</strong><p>{crmUserLabel} - {crmRoleLabel}</p></article>
                  <article className="crm-settings-modal-item"><strong>Quick actions</strong><p>Use the sidebar, or jump directly to profile settings and logout.</p></article>
                  <div className="crm-settings-modal-actions">
                    <button type="button" onClick={() => scrollToSection('business-profile')}>Open profile</button>
                    <button type="button" onClick={handleLogout}>Logout</button>
                  </div>
                </div>
              ) : null}

              {activeHistorySectionId ? (
                <div className="crm-settings-modal-list">
                  <article className="crm-settings-modal-item">
                    <strong>Latest draft changes</strong>
                    <p>{activeSectionSummary}</p>
                  </article>
                  {activeHistoryEntries.length ? (
                    activeHistoryEntries.map((entry) => (
                      <article key={entry.id} className="crm-settings-modal-item">
                        <strong>{entry.title}</strong>
                        <p>{entry.detail}</p>
                        <span className="crm-settings-modal-timestamp">{formatTimestamp(entry.at)}</span>
                      </article>
                    ))
                  ) : (
                    <article className="crm-settings-modal-item">
                      <strong>No saved history yet</strong>
                      <p>This section will show a change trail once the workspace is saved or reset.</p>
                    </article>
                  )}
                  <div className="crm-settings-modal-actions">
                    <button type="button" onClick={() => scrollToSection(activeHistorySectionId)}>Open section</button>
                  </div>
                </div>
              ) : null}

              {activePanel === 'privacy' ? <p className="crm-settings-modal-copy">The CRM keeps guest, booking, and payment data inside the workspace only. Use the settings screen to control what is visible on receipts, confirmations, and the guest portal.</p> : null}
              {activePanel === 'terms' ? <p className="crm-settings-modal-copy">Staff-facing actions in this CRM are operational controls for scheduling, payments, and customer service. Use the booking and receipt settings above to align the front desk with your business policies.</p> : null}

              {activePanel === 'special-hours' ? (
                <div className="crm-settings-modal-list">
                  <div className="crm-settings-form-grid crm-settings-form-grid-compact">
                    <label className="crm-settings-field"><span>Label</span><input type="text" value={specialHourDraft.label} onChange={(e) => updateSpecialHourDraft('label', e.target.value)} /></label>
                    <label className="crm-settings-field"><span>Date</span><input type="date" value={specialHourDraft.date} onChange={(e) => updateSpecialHourDraft('date', e.target.value)} /></label>
                    <label className="crm-settings-field"><span>Type</span><select value={specialHourDraft.type} onChange={(e) => updateSpecialHourDraft('type', e.target.value)}><option value="Holiday closure">Holiday closure</option><option value="Seasonal hours">Seasonal hours</option><option value="Private event">Private event</option><option value="Staff training">Staff training</option></select></label>
                    <label className="crm-settings-field"><span>Open</span><input type="time" value={specialHourDraft.open} onChange={(e) => updateSpecialHourDraft('open', e.target.value)} /></label>
                    <label className="crm-settings-field"><span>Close</span><input type="time" value={specialHourDraft.close} onChange={(e) => updateSpecialHourDraft('close', e.target.value)} /></label>
                    <label className="crm-settings-field crm-settings-field-full crm-settings-field-textarea"><span>Note</span><textarea rows="3" value={specialHourDraft.note} onChange={(e) => updateSpecialHourDraft('note', e.target.value)} /></label>
                  </div>
                  <div className="crm-settings-switch-row crm-settings-switch-row-compact">
                    <div><span>Closed all day</span><p>Use this for holiday closures or fully unavailable days.</p></div>
                    <button className={`crm-settings-toggle${specialHourDraft.closed ? ' crm-settings-toggle-on' : ''}`} type="button" aria-pressed={specialHourDraft.closed} onClick={() => updateSpecialHourDraft('closed', !specialHourDraft.closed)}><span /></button>
                  </div>
                  <div className="crm-settings-modal-actions"><button type="button" onClick={handleSaveSpecialHours}>Save special hours</button></div>
                </div>
              ) : null}
            </article>
          </div>
        ) : null}
      </main>
    </CrmShell>
  );
};

export default CrmSettings;

