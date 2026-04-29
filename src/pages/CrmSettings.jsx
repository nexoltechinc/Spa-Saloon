import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  Clock3,
  Globe2,
  LogOut,
  Palette,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { clearCrmToken } from '../config/crm';
import { fetchReceiptSettings, loadReceiptSettings, saveReceiptSettings } from '../config/receiptSettings';
import CrmShell from '../components/CrmShell';
import {
  BookingRulesBlock,
  BusinessProfileForm,
  CommunicationSettingsBlock,
  OperatingHoursDayCard,
  ReceiptBrandingPreview,
  RegionalDefaultsBlock,
  SettingsSaveState,
  SettingsDisclosureCard,
  SettingsSectionChip,
  SettingsSectionHeader,
  SettingsTrustPanel,

  SpecialHoursManager,
} from '../components/settings/SettingsBlocks';
import './CrmSettings.css';

const sectionGroups = [
  {
    title: 'Core Business',
    sections: [
      { id: 'business-profile', label: 'Business Profile', icon: Sparkles },
      { id: 'regional-defaults', label: 'Regional Defaults', icon: Globe2 },
      { id: 'operating-hours', label: 'Operating Hours', icon: Clock3 },
    ],
  },
  {
    title: 'Booking Engine',
    sections: [
      { id: 'booking-rules', label: 'Booking Rules', icon: CalendarClock },
      { id: 'communications', label: 'Communications', icon: Bell },
    ],
  },
  {
    title: 'Brand Experience',
    sections: [{ id: 'branding-receipts', label: 'Branding & Receipts', icon: Palette }],
  },
];

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
const isDigitsOnly = (value) => /^\d+$/.test(String(value || '').trim());

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
  regionalDefaults: settings.regionalDefaults,
  operatingHours: settings.operatingHours,
  specialHours: settings.specialHours,
  bookingRules: settings.bookingRules,
  communication: settings.communication,
  branding: settings.branding,
});

const validateSettings = (settings) => {
  const issues = {
    profile: [],
    regionalDefaults: [],
    operatingHours: [],
    bookingRules: [],
    communications: [],
    branding: [],
  };

  if (!isNonEmpty(settings.profile.businessName)) issues.profile.push('Business name is required.');
  if (!isEmailLike(settings.profile.contactEmail)) issues.profile.push('Main contact email should be valid.');
  if (!isNonEmpty(settings.profile.address)) issues.profile.push('Primary location address is missing.');
  if (!isNonEmpty(settings.regionalDefaults.timezone)) issues.regionalDefaults.push('Timezone is required.');
  if (!isNonEmpty(settings.regionalDefaults.currency)) issues.regionalDefaults.push('Currency is required.');

  settings.operatingHours.forEach((entry) => {
    if (entry.enabled && (!isNonEmpty(entry.open) || !isNonEmpty(entry.close))) {
      issues.operatingHours.push(`${entry.day} needs open and close times.`);
    }
    if (entry.enabled && isNonEmpty(entry.breakStart) !== isNonEmpty(entry.breakEnd)) {
      issues.operatingHours.push(`${entry.day} break times should be completed together.`);
    }
  });

  if (!isDigitsOnly(settings.bookingRules.bufferTime)) issues.bookingRules.push('Buffer time should be a number.');
  if (!isNonEmpty(settings.bookingRules.slotInterval)) issues.bookingRules.push('Slot interval is required.');
  if (!isNonEmpty(settings.bookingRules.maxAdvanceBooking)) issues.bookingRules.push('Maximum advance booking is required.');
  if (!isEmailLike(settings.communication.senderEmail)) issues.communications.push('Sender email should be valid.');
  if (!isEmailLike(settings.communication.replyToEmail)) issues.communications.push('Reply-to email should be valid.');
  if (!isNonEmpty(settings.branding.receiptNumberPrefix)) issues.branding.push('Receipt number prefix is required.');
  if (!isNonEmpty(settings.branding.receiptHeaderQuote)) issues.branding.push('Receipt header quote can not be blank.');
  if (!isNonEmpty(settings.branding.receiptFooterText)) issues.branding.push('Receipt footer text can not be blank.');

  return issues;
};
const CrmSettings = () => {
  const navigate = useNavigate();
  const brandMarkInputRef = useRef(null);
  const [bootSettings] = useState(() => loadReceiptSettings());
  const [savedSettings, setSavedSettings] = useState(() => cloneSettings(bootSettings));
  const [draft, setDraft] = useState(() => cloneSettings(bootSettings));
  const [saveState, setSaveState] = useState('saved');
  const [activeSection, setActiveSection] = useState('business-profile');
  const [activePanel, setActivePanel] = useState(null);
  const [specialHourDraft, setSpecialHourDraft] = useState(() => createSpecialHourDraft());
  const [brandMarkLabel, setBrandMarkLabel] = useState(bootSettings.profile.brandMarkName || 'Update brand mark');
  const [brandMarkPreview, setBrandMarkPreview] = useState(bootSettings.profile.brandMarkImage || '');
  const [lastSavedAt, setLastSavedAt] = useState(bootSettings.updatedAt || new Date().toISOString());
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
      } catch {
        if (!mounted) return;
        setSavedSettings(bootSettings);
        setDraft(cloneSettings(bootSettings));
        setBrandMarkLabel(bootSettings.profile.brandMarkName || 'Update brand mark');
        setBrandMarkPreview(bootSettings.profile.brandMarkImage || '');
        setLastSavedAt(bootSettings.updatedAt || new Date().toISOString());
      } finally {
        if (mounted) setIsBooting(false);
      }
    };

    void hydrateSettings();

    return () => {
      mounted = false;
    };
  }, [bootSettings]);

  const validationErrors = useMemo(() => validateSettings(draft), [draft]);
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
      regionalDefaults: compare('regionalDefaults'),
      operatingHours: compare('operatingHours') || compare('specialHours'),
      bookingRules: compare('bookingRules'),
      communications: compare('communication'),
      branding: compare('branding'),
    };
  }, [draft, savedSettings]);

  const dirty = Object.values(dirtySections).some(Boolean);
  const effectiveSaveState = saveState === 'saving' || saveState === 'error' ? saveState : dirty ? 'dirty' : 'saved';

  const sectionStates = useMemo(
    () => [
      ['business-profile', 'Business Profile', 'profile'],
      ['regional-defaults', 'Regional Defaults', 'regionalDefaults'],
      ['operating-hours', 'Operating Hours', 'operatingHours'],
      ['booking-rules', 'Booking Rules', 'bookingRules'],
      ['communications', 'Communications', 'communications'],
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

  const markChanged = () => {
    setSaveState((current) => (current === 'saving' ? current : 'dirty'));
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateProfile = (field, value) => {
    setDraft((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
    markChanged();
  };

  const updateRegionalDefaults = (field, value) => {
    setDraft((current) => ({ ...current, regionalDefaults: { ...current.regionalDefaults, [field]: value } }));
    markChanged();
  };

  const updateBooking = (field, value) => {
    setDraft((current) => ({ ...current, bookingRules: { ...current.bookingRules, [field]: value } }));
    markChanged();
  };

  const toggleBooking = (field) => {
    setDraft((current) => ({ ...current, bookingRules: { ...current.bookingRules, [field]: !current.bookingRules[field] } }));
    markChanged();
  };

  const updateCommunication = (field, value) => {
    setDraft((current) => ({ ...current, communication: { ...current.communication, [field]: value } }));
    markChanged();
  };

  const toggleCommunication = (field) => {
    setDraft((current) => ({ ...current, communication: { ...current.communication, [field]: !current.communication[field] } }));
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
    setActivePanel(null);
  };

  const handleRemoveSpecialHour = (id) => {
    setDraft((current) => ({ ...current, specialHours: current.specialHours.filter((item) => item.id !== id) }));
    markChanged();
  };

  const resetAll = () => {
    const snapshot = cloneSettings(savedSettings);
    setDraft(snapshot);
    setBrandMarkLabel(snapshot.profile.brandMarkName || 'Update brand mark');
    setBrandMarkPreview(snapshot.profile.brandMarkImage || '');
    setSaveState('saved');
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
        case 'regional-defaults':
          next.regionalDefaults = cloneSettings(savedSettings.regionalDefaults);
          break;
        case 'operating-hours':
          next.operatingHours = cloneSettings(savedSettings.operatingHours);
          next.specialHours = cloneSettings(savedSettings.specialHours);
          break;
        case 'booking-rules':
          next.bookingRules = cloneSettings(savedSettings.bookingRules);
          break;
        case 'communications':
          next.communication = cloneSettings(savedSettings.communication);
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
  };

  const handleSave = async () => {
    if (validationCount > 0) {
      setSaveState('error');
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
    } catch {
      setSaveState('error');
    }
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };
  const activePanelMeta = activePanel ? panelMetaById[activePanel] || panelMetaById.terms : null;

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
              Configure the business profile, operating rhythm, booking rules, guest communication,
              and branded receipt presentation that shape the premium spa experience.
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

        <section className="crm-settings-tabs crm-settings-tabs-grouped" aria-label="Settings sections">
          {sectionGroups.map((group) => (
            <div key={group.title} className="crm-settings-tab-group">
              <span className="crm-settings-tab-group-label">{group.title}</span>
              <div className="crm-settings-tab-group-row">
                {group.sections.map((section) => {
                  const sectionState = sectionStateById[section.id];
                  return (
                    <SettingsSectionChip
                      key={section.id}
                      label={section.label}
                      icon={section.icon}
                      active={activeSection === section.id}
                      status={sectionState?.state || 'saved'}
                      onClick={() => scrollToSection(section.id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="crm-settings-workspace">
          <div className="crm-settings-primary-stack">
            <article className="crm-settings-card crm-settings-card-profile" id="business-profile">
              <SettingsSectionHeader
                kicker="Core Business"
                title="Business Profile"
                description="Public-facing identity and contact details visible to guests."
                status={sectionStateById['business-profile']?.stateLabel}
                statusTone={sectionStateById['business-profile']?.state}
                actions={
                  <button className="crm-settings-ghost-action" type="button" onClick={() => resetSection('business-profile')}>
                    <span>Reset Section</span>
                  </button>
                }
              />

              {activeSection === 'business-profile' ? (
                <BusinessProfileForm
                  profile={draft.profile}
                  onChange={updateProfile}
                  brandMarkLabel={brandMarkLabel}
                  brandMarkPreview={brandMarkPreview}
                  onPickBrandMark={() => brandMarkInputRef.current?.click()}
                />
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
                  <button className="crm-settings-ghost-action" type="button" onClick={handleAddSpecialHours}>
                    <Sparkles size={15} />
                    <span>Add Special Hours</span>
                  </button>
                }
              />

              {activeSection === 'operating-hours' ? (
                <>
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

            <section className="crm-settings-lower-grid">
              <article className="crm-settings-card" id="regional-defaults">
                <SettingsSectionHeader
                  kicker="Core Business"
                  title="Regional Defaults"
                  description="Timezone, currency, date format, and locale settings used across the CRM."
                  status={sectionStateById['regional-defaults']?.stateLabel}
                  statusTone={sectionStateById['regional-defaults']?.state}
                  actions={
                    <button className="crm-settings-ghost-action" type="button" onClick={() => resetSection('regional-defaults')}>
                      <span>Reset Section</span>
                    </button>
                  }
                />

                {activeSection === 'regional-defaults' ? (
                  <RegionalDefaultsBlock regionalDefaults={draft.regionalDefaults} onChange={updateRegionalDefaults} />
                ) : (
                  <SectionCompactPanel
                    description="Timezone, currency, date format, and locale defaults across the CRM."
                    points={[
                      draft.regionalDefaults.timezone,
                      draft.regionalDefaults.currency,
                      draft.regionalDefaults.locale,
                    ]}
                    onOpen={() => scrollToSection('regional-defaults')}
                  />
                )}
              </article>

              <article className="crm-settings-card" id="booking-rules">
                <SettingsSectionHeader
                  kicker="Booking Engine"
                  title="Booking Rules"
                  description="Guide guest expectations, booking windows, confirmations, and premium slot handling."
                  status={sectionStateById['booking-rules']?.stateLabel}
                  statusTone={sectionStateById['booking-rules']?.state}
                  actions={
                    <button className="crm-settings-ghost-action" type="button" onClick={() => resetSection('booking-rules')}>
                      <span>Reset Section</span>
                    </button>
                  }
                />

                {activeSection === 'booking-rules' ? (
                  <BookingRulesBlock bookingRules={draft.bookingRules} onChange={updateBooking} onToggle={toggleBooking} />
                ) : (
                  <SectionCompactPanel
                    description="Buffer times, approvals, visibility, and guest policy controls."
                    points={[
                      `${draft.bookingRules.bufferTime} min buffer`,
                      draft.bookingRules.defaultAppointmentStatus,
                      draft.bookingRules.guestBookingVisibility,
                    ]}
                    onOpen={() => scrollToSection('booking-rules')}
                  />
                )}
              </article>
            </section>

            <section className="crm-settings-lower-grid">
              <article className="crm-settings-card" id="communications">
                <SettingsSectionHeader
                  kicker="Booking Engine"
                  title="Communication Settings"
                  description="Keep booking confirmations and reminders aligned with the guest experience."
                  status={sectionStateById.communications?.stateLabel}
                  statusTone={sectionStateById.communications?.state}
                  actions={
                    <button className="crm-settings-ghost-action" type="button" onClick={() => resetSection('communications')}>
                      <span>Reset Section</span>
                    </button>
                  }
                />

                {activeSection === 'communications' ? (
                  <CommunicationSettingsBlock
                    communication={draft.communication}
                    onChange={updateCommunication}
                    onToggle={toggleCommunication}
                  />
                ) : (
                  <SectionCompactPanel
                    description="Confirmation and reminder defaults, sender identity, and preview copy."
                    points={[
                      draft.communication.senderName,
                      draft.communication.senderEmail,
                      draft.communication.reminderCadence,
                    ]}
                    onOpen={() => scrollToSection('communications')}
                  />
                )}
              </article>

              <article className="crm-settings-card" id="branding-receipts">
                <SettingsSectionHeader
                  kicker="Brand Experience"
                  title="Branding & Receipts"
                  description="Shape the post-visit touchpoint with polished brand presentation."
                  status={sectionStateById['branding-receipts']?.stateLabel}
                  statusTone={sectionStateById['branding-receipts']?.state}
                  actions={
                    <button className="crm-settings-ghost-action" type="button" onClick={() => resetSection('branding-receipts')}>
                      <span>Reset Section</span>
                    </button>
                  }
                />

                {activeSection === 'branding-receipts' ? (
                  <div className="crm-settings-branding-panel">
                    <div className="crm-settings-form-grid crm-settings-form-grid-compact">
                      <label className="crm-settings-field crm-settings-field-full crm-settings-field-textarea">
                        <span>Receipt Header Quote</span>
                        <textarea rows="4" value={draft.branding.receiptHeaderQuote} onChange={(e) => updateBranding('receiptHeaderQuote', e.target.value)} />
                      </label>
                      <label className="crm-settings-field crm-settings-field-full crm-settings-field-textarea">
                        <span>Receipt Footer Text</span>
                        <textarea rows="4" value={draft.branding.receiptFooterText} onChange={(e) => updateBranding('receiptFooterText', e.target.value)} />
                      </label>
                      <label className="crm-settings-field">
                        <span>Receipt Number Prefix</span>
                        <input type="text" value={draft.branding.receiptNumberPrefix} onChange={(e) => updateBranding('receiptNumberPrefix', e.target.value)} />
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
            </section>
          </div>

          <div className="crm-settings-rail-stack">
            <ReceiptBrandingPreview
              profile={draft.profile}
              branding={draft.branding}
              communication={draft.communication}
              regionalDefaults={draft.regionalDefaults}
            />

            <SettingsTrustPanel
              saveState={saveState}
              dirty={dirty}
              lastSavedAt={lastSavedAt}
              validationCount={validationCount}
              sectionStates={sectionStates}
            />
          </div>
        </section>

        <footer className="crm-settings-footer">
          <span>(c) 2026 Aura Wellness Ecosystem</span>
          <div className="crm-settings-footer-links">
            <button type="button" onClick={() => setActivePanel('privacy')}>Privacy</button>
            <button type="button" onClick={() => setActivePanel('terms')}>Terms</button>
            <span className="crm-settings-footer-status">System Status: Optimal</span>
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
                  <article className="crm-settings-modal-item"><strong>Current user</strong><p>Isabella Rose, General Manager</p></article>
                  <article className="crm-settings-modal-item"><strong>Quick actions</strong><p>Use the sidebar, or jump directly to profile settings and logout.</p></article>
                  <div className="crm-settings-modal-actions">
                    <button type="button" onClick={() => scrollToSection('business-profile')}>Open profile</button>
                    <button type="button" onClick={handleLogout}>Logout</button>
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

