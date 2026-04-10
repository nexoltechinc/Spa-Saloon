import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  Check,
  Clock3,
  Globe2,
  LogOut,
  Mail,
  MapPinned,
  Palette,
  Plus,
  Receipt,
  Settings2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { clearCrmToken } from '../config/crm';
import CrmShell from '../components/CrmShell';
import './CrmSettings.css';

const sections = [
  { id: 'business-profile', label: 'Business Profile', icon: Sparkles },
  { id: 'operating-hours', label: 'Operating Hours', icon: Clock3 },
  { id: 'booking-rules', label: 'Booking Rules', icon: CalendarClock },
  { id: 'branding-receipts', label: 'Branding & Receipts', icon: Palette },
];

const defaultHours = [
  { day: 'Monday', open: '09:00', close: '18:00', enabled: true },
  { day: 'Tuesday', open: '09:00', close: '20:00', enabled: true },
  { day: 'Wednesday', open: '10:00', close: '19:00', enabled: true },
  { day: 'Thursday', open: '10:00', close: '20:00', enabled: true },
  { day: 'Friday', open: '09:00', close: '21:00', enabled: true },
  { day: 'Saturday', open: '10:00', close: '17:00', enabled: true },
  { day: 'Sunday', open: '10:00', close: '17:00', enabled: false },
];

const notificationItems = [
  { title: '2 confirmations sent', detail: 'Guests for today’s bookings were notified 24 hours ahead.' },
  { title: '1 seasonal window pending', detail: 'Holiday hours can be published from Operating Hours.' },
  { title: 'Receipt quote updated', detail: 'The receipt header copy was edited 12 minutes ago.' },
];

const CrmSettings = () => {
  const navigate = useNavigate();
  const brandMarkInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState('business-profile');
  const [dirty, setDirty] = useState(false);
  const [savedMessage, setSavedMessage] = useState('All changes synced 2 minutes ago');
  const [seasonalSchedules, setSeasonalSchedules] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [profile, setProfile] = useState({
    businessName: 'Aura Spa & Wellness',
    legalName: 'Aura Wellness Group LLC',
    contactEmail: 'hello@aurawellness.com',
    contactPhone: '(323) 555-0188',
    address: '8422 Melrose Ave, West Hollywood, CA 90069',
    website: 'www.aurawellness.com',
  });
  const [booking, setBooking] = useState({
    bufferTime: '15',
    cancellationWindow: '24 Hours',
    reminderLeadTime: '24 hours before',
  });
  const [hours, setHours] = useState(defaultHours);
  const [receiptQuote, setReceiptQuote] = useState('May your calm endure long after you leave.');
  const [brandingLayout, setBrandingLayout] = useState('centered');
  const [brandMarkLabel, setBrandMarkLabel] = useState('Update brand mark');
  const [toggles, setToggles] = useState({
    automatedConfirmations: true,
    collectDeposit: true,
    includeSocialHandles: false,
    hidePrices: false,
  });

  const markDirty = () => setDirty(true);

  const scrollToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
    markDirty();
  };

  const updateBooking = (field, value) => {
    setBooking((current) => ({ ...current, [field]: value }));
    markDirty();
  };

  const updateHour = (index, field, value) => {
    setHours((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    markDirty();
  };

  const toggleHour = (index) => {
    setHours((current) =>
      current.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item)),
    );
    markDirty();
  };

  const toggleSetting = (field) => {
    setToggles((current) => ({ ...current, [field]: !current[field] }));
    markDirty();
  };

  const closePanel = () => setActivePanel(null);

  const handleOpenBrandMarkPicker = () => {
    brandMarkInputRef.current?.click();
  };

  const handleBrandMarkChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBrandMarkLabel(file.name);
    setSavedMessage(`Brand mark staged: ${file.name}`);
    markDirty();
  };

  const handleAddSeasonalSchedule = () => {
    const newSchedule = {
      id: `seasonal-${Date.now()}`,
      label: 'Seasonal Hours',
      range: 'Next 2 weeks',
      note: 'Extended availability for peak booking periods.',
      status: 'Draft',
    };

    setSeasonalSchedules((current) => [newSchedule, ...current]);
    setSavedMessage(
      `Seasonal schedule staged at ${new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`,
    );
    markDirty();
  };

  const handleSave = () => {
    setDirty(false);
    setSavedMessage(
      `Updated just now at ${new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`,
    );
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <CrmShell
      shellClassName="crm-settings-shell"
    >
      <main className="crm-settings-main">
        <header className="crm-settings-topbar">
          <div className="crm-settings-header-copy">
            <p className="crm-settings-kicker">Ecosystem Configuration</p>
            <h1>Refine the Essence of Your Sanctuary</h1>
            <p className="crm-settings-subcopy">
              Configure the business profile, operating rhythm, booking rules, and guest-facing
              branding that shape the premium spa experience.
            </p>
          </div>

          <div className="crm-settings-topbar-actions">
            <button
              className={`crm-settings-save-btn${dirty ? ' crm-settings-save-btn-dirty' : ''}`}
              type="button"
              onClick={handleSave}
            >
              <Check size={15} />
              <span>{dirty ? 'Save Changes' : 'Saved'}</span>
            </button>
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
        </header>

        <section className="crm-settings-tabs" aria-label="Settings sections">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                className={`crm-settings-tab${isActive ? ' crm-settings-tab-active' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                <Icon size={15} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </section>

        <section className="crm-settings-content-grid">
          <article className="crm-settings-card crm-settings-card-profile" id="business-profile">
            <div className="crm-settings-card-head">
              <div>
                <h3>Business Profile</h3>
                <p>Public-facing identity and contact details visible to guests.</p>
              </div>
            </div>

            <div className="crm-settings-brand-row">
              <div className="crm-settings-brand-seal">
                <div className="crm-settings-brand-mark">AW</div>
              </div>

              <div className="crm-settings-brand-copy">
                <h4>{profile.businessName}</h4>
                <p>Established 2021 - Los Angeles, CA</p>
                <button className="crm-settings-inline-link" type="button" onClick={handleOpenBrandMarkPicker}>
                  Update Brand Mark
                </button>
                <input
                  ref={brandMarkInputRef}
                  className="crm-settings-sr-file"
                  type="file"
                  accept="image/*"
                  onChange={handleBrandMarkChange}
                  aria-label="Upload brand mark"
                />
                <span className="crm-settings-inline-note">{brandMarkLabel}</span>
              </div>

              <div className="crm-settings-brand-meta">
                <div>
                  <span>Guest Visibility</span>
                  <strong>Live</strong>
                </div>
                <div>
                  <span>Timezone</span>
                  <strong>PST</strong>
                </div>
              </div>
            </div>

            <div className="crm-settings-form-grid">
              <label className="crm-settings-field">
                <span>Business Name</span>
                <input type="text" value={profile.businessName} onChange={(e) => updateProfile('businessName', e.target.value)} />
              </label>

              <label className="crm-settings-field">
                <span>Contact Email</span>
                <div className="crm-settings-input-icon-wrap">
                  <Mail size={15} />
                  <input type="email" value={profile.contactEmail} onChange={(e) => updateProfile('contactEmail', e.target.value)} />
                </div>
              </label>

              <label className="crm-settings-field">
                <span>Legal Entity Name</span>
                <input type="text" value={profile.legalName} onChange={(e) => updateProfile('legalName', e.target.value)} />
              </label>

              <label className="crm-settings-field">
                <span>Business Phone</span>
                <input type="text" value={profile.contactPhone} onChange={(e) => updateProfile('contactPhone', e.target.value)} />
              </label>

              <label className="crm-settings-field crm-settings-field-full">
                <span>Primary Location Address</span>
                <div className="crm-settings-input-icon-wrap">
                  <MapPinned size={15} />
                  <input type="text" value={profile.address} onChange={(e) => updateProfile('address', e.target.value)} />
                </div>
              </label>

              <label className="crm-settings-field crm-settings-field-full">
                <span>Website</span>
                <div className="crm-settings-input-icon-wrap">
                  <Globe2 size={15} />
                  <input type="text" value={profile.website} onChange={(e) => updateProfile('website', e.target.value)} />
                </div>
              </label>
            </div>
          </article>

          <div className="crm-settings-side-stack">
            <article className="crm-settings-card crm-settings-location-card">
              <div className="crm-settings-card-head">
                <div>
                  <h3>Location Preview</h3>
                  <p>Signature arrival view for guest confirmations and receipts.</p>
                </div>
              </div>

              <div className="crm-settings-location-frame">
                <div className="crm-settings-location-art">
                  <div className="crm-settings-location-grid" />
                  <div className="crm-settings-location-wave crm-settings-location-wave-top" />
                  <div className="crm-settings-location-wave crm-settings-location-wave-bottom" />
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="crm-settings-card crm-settings-hours-section" id="operating-hours">
          <div className="crm-settings-card-head crm-settings-card-head-inline">
            <div>
              <h3>Operating Hours</h3>
              <p>Control the weekly rhythm your booking engine presents to guests.</p>
            </div>
            <button className="crm-settings-ghost-action" type="button" onClick={handleAddSeasonalSchedule}>
              <Plus size={15} />
              <span>Add Seasonal Schedule</span>
            </button>
          </div>

          <div className="crm-settings-hours-grid">
            {hours.map((entry, index) => (
              <article
                key={entry.day}
                className={`crm-settings-hour-card${entry.enabled ? '' : ' crm-settings-hour-card-closed'}`}
              >
                <div className="crm-settings-hour-head">
                  <span>{entry.day}</span>
                  <button
                    className={`crm-settings-toggle${entry.enabled ? ' crm-settings-toggle-on' : ''}`}
                    type="button"
                    aria-pressed={entry.enabled}
                    onClick={() => toggleHour(index)}
                  >
                    <span />
                  </button>
                </div>

                {entry.enabled ? (
                  <div className="crm-settings-hour-inputs">
                    <label>
                      <span>From</span>
                      <input type="time" value={entry.open} onChange={(e) => updateHour(index, 'open', e.target.value)} />
                    </label>
                    <label>
                      <span>To</span>
                      <input type="time" value={entry.close} onChange={(e) => updateHour(index, 'close', e.target.value)} />
                    </label>
                  </div>
                ) : (
                  <div className="crm-settings-hour-closed-copy">
                    <strong>Sanctuary Closed</strong>
                    <p>Online bookings pause for this day.</p>
                  </div>
                )}
              </article>
            ))}

            <button className="crm-settings-hour-add-card" type="button" onClick={handleAddSeasonalSchedule}>
              <Plus size={24} />
              <span>Create Special Hours</span>
            </button>
          </div>

          {seasonalSchedules.length ? (
            <div className="crm-settings-seasonal-grid">
              {seasonalSchedules.map((schedule) => (
                <article key={schedule.id} className="crm-settings-seasonal-card">
                  <div>
                    <span>{schedule.label}</span>
                    <strong>{schedule.range}</strong>
                  </div>
                  <p>{schedule.note}</p>
                  <em>{schedule.status}</em>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="crm-settings-lower-grid">
          <article className="crm-settings-card" id="booking-rules">
            <div className="crm-settings-card-head">
              <div>
                <h3>Booking Rules</h3>
                <p>Guide guest expectations, lead times, and automated confirmations.</p>
              </div>
            </div>

            <div className="crm-settings-rule-stack">
              <div className="crm-settings-rule-row">
                <div>
                  <span>Buffer Time</span>
                  <p>Minutes required between each treatment.</p>
                </div>
                <input className="crm-settings-pill-input" type="text" value={booking.bufferTime} onChange={(e) => updateBooking('bufferTime', e.target.value)} />
              </div>

              <div className="crm-settings-rule-row">
                <div>
                  <span>Cancellation Window</span>
                  <p>Minimum notice for penalty-free cancellation.</p>
                </div>
                <input className="crm-settings-pill-input crm-settings-pill-input-wide" type="text" value={booking.cancellationWindow} onChange={(e) => updateBooking('cancellationWindow', e.target.value)} />
              </div>

              <div className="crm-settings-rule-row">
                <div>
                  <span>Email Reminder Timing</span>
                  <p>Default reminder cadence before each appointment.</p>
                </div>
                <input className="crm-settings-pill-input crm-settings-pill-input-wide" type="text" value={booking.reminderLeadTime} onChange={(e) => updateBooking('reminderLeadTime', e.target.value)} />
              </div>

              <div className="crm-settings-switch-row">
                <div>
                  <span>Automated Confirmations</span>
                  <p>Send tailored email and SMS messages 24 hours before each booking.</p>
                </div>
                <button
                  className={`crm-settings-toggle${toggles.automatedConfirmations ? ' crm-settings-toggle-on' : ''}`}
                  type="button"
                  aria-pressed={toggles.automatedConfirmations}
                  onClick={() => toggleSetting('automatedConfirmations')}
                >
                  <span />
                </button>
              </div>

              <div className="crm-settings-switch-row">
                <div>
                  <span>Collect Deposit for Online Bookings</span>
                  <p>Protect premium time slots with a deposit at checkout.</p>
                </div>
                <button
                  className={`crm-settings-toggle${toggles.collectDeposit ? ' crm-settings-toggle-on' : ''}`}
                  type="button"
                  aria-pressed={toggles.collectDeposit}
                  onClick={() => toggleSetting('collectDeposit')}
                >
                  <span />
                </button>
              </div>

              <div className="crm-settings-switch-row">
                <div>
                  <span>Hide Prices from Guest Portal</span>
                  <p>Keep pricing visible only after a guest chooses a service path.</p>
                </div>
                <button
                  className={`crm-settings-toggle${toggles.hidePrices ? ' crm-settings-toggle-on' : ''}`}
                  type="button"
                  aria-pressed={toggles.hidePrices}
                  onClick={() => toggleSetting('hidePrices')}
                >
                  <span />
                </button>
              </div>
            </div>
          </article>

          <article className="crm-settings-card" id="branding-receipts">
            <div className="crm-settings-card-head">
              <div>
                <h3>Branding &amp; Receipts</h3>
                <p>Shape the post-visit touchpoint with polished brand presentation.</p>
              </div>
            </div>

            <label className="crm-settings-field crm-settings-field-textarea">
              <span>Receipt Header Quote</span>
              <textarea rows="4" value={receiptQuote} onChange={(e) => { setReceiptQuote(e.target.value); markDirty(); }} />
            </label>

            <div className="crm-settings-branding-layouts">
              <button
                className={`crm-settings-layout-option${brandingLayout === 'centered' ? ' crm-settings-layout-option-active' : ''}`}
                type="button"
                onClick={() => {
                  setBrandingLayout('centered');
                  markDirty();
                }}
              >
                <div className="crm-settings-layout-preview crm-settings-layout-preview-centered">
                  <div className="crm-settings-layout-logo">A</div>
                </div>
                <span>Logo Centered</span>
              </button>

              <button
                className={`crm-settings-layout-option${brandingLayout === 'left' ? ' crm-settings-layout-option-active' : ''}`}
                type="button"
                onClick={() => {
                  setBrandingLayout('left');
                  markDirty();
                }}
              >
                <div className="crm-settings-layout-preview crm-settings-layout-preview-left">
                  <div className="crm-settings-layout-logo crm-settings-layout-logo-left" />
                  <div className="crm-settings-layout-lines" />
                </div>
                <span>Logo Left</span>
              </button>
            </div>

            <div className="crm-settings-branding-summary">
              <div className="crm-settings-branding-chip">
                <Receipt size={16} />
                <span>Luxury Receipt Style</span>
              </div>
              <div className="crm-settings-branding-chip">
                <Settings2 size={16} />
                <span>Default Tax Included</span>
              </div>
            </div>

            <div className="crm-settings-switch-row crm-settings-switch-row-compact">
              <div>
                <span>Include Social Handles</span>
                <p>Display Instagram and website references on receipts and confirmations.</p>
              </div>
              <button
                className={`crm-settings-toggle${toggles.includeSocialHandles ? ' crm-settings-toggle-on' : ''}`}
                type="button"
                aria-pressed={toggles.includeSocialHandles}
                onClick={() => toggleSetting('includeSocialHandles')}
              >
                <span />
              </button>
            </div>
          </article>
        </section>

        <footer className="crm-settings-footer">
          <span>(c) 2026 Aura Wellness Ecosystem</span>
          <div className="crm-settings-footer-links">
            <button type="button" onClick={() => setActivePanel('privacy')}>
              Privacy
            </button>
            <button type="button" onClick={() => setActivePanel('terms')}>
              Terms
            </button>
            <span className="crm-settings-footer-status">System Status: Optimal</span>
          </div>
        </footer>

        {activePanel ? (
          <div className="crm-settings-modal-backdrop" role="presentation" onClick={closePanel}>
            <article
              className="crm-settings-modal-card"
              role="dialog"
              aria-modal="true"
              aria-label={activePanel}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="crm-settings-modal-head">
                <div>
                  <p>
                    {activePanel === 'notifications'
                      ? 'Notifications'
                      : activePanel === 'account'
                        ? 'Account'
                        : activePanel === 'privacy'
                          ? 'Privacy'
                          : 'Terms'}
                  </p>
                  <h3>
                    {activePanel === 'notifications'
                      ? 'Live activity and pending actions'
                      : activePanel === 'account'
                        ? 'Account controls'
                        : activePanel === 'privacy'
                          ? 'Privacy summary'
                          : 'Terms summary'}
                  </h3>
                </div>
                <button type="button" className="crm-settings-modal-close" onClick={closePanel}>
                  Close
                </button>
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
                  <article className="crm-settings-modal-item">
                    <strong>Current user</strong>
                    <p>Isabella Rose, General Manager</p>
                  </article>
                  <article className="crm-settings-modal-item">
                    <strong>Quick actions</strong>
                    <p>Use the sidebar, or jump directly to profile settings and logout.</p>
                  </article>
                  <div className="crm-settings-modal-actions">
                    <button type="button" onClick={() => scrollToSection('business-profile')}>
                      Open profile
                    </button>
                    <button type="button" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}

              {activePanel === 'privacy' ? (
                <p className="crm-settings-modal-copy">
                  The CRM keeps guest, booking, and payment data inside the workspace only. Use the
                  settings tab to control what is visible on receipts, confirmations, and the guest
                  portal.
                </p>
              ) : null}

              {activePanel === 'terms' ? (
                <p className="crm-settings-modal-copy">
                  Staff-facing actions in this CRM are operational controls for scheduling,
                  payments, and customer service. Use the booking and payment rules above to align
                  the front desk with your business policies.
                </p>
              ) : null}
            </article>
          </div>
        ) : null}
      </main>
    </CrmShell>
  );
};

export default CrmSettings;
