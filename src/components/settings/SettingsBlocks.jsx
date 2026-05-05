import {
  Bell,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheckBig,
  ChevronDown,
  Globe2,
  LoaderCircle,
  Mail,
  MapPinned,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { SALON_NAME } from '../../config/brand';

const formatSavedAt = (value) => {
  if (!value) return 'Not saved yet';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const statusTone = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('error')) return 'alert';
  if (normalized.includes('dirty') || normalized.includes('unsaved') || normalized.includes('review')) return 'warning';
  if (normalized.includes('saving')) return 'neutral';
  return 'good';
};

const buildPreviewVariant = ({
  activeSectionId,
  previewMode = 'booking',
  profile,
  branding,
  regionalDefaults,
  bookingRules = {},
  communication = {},
}) => {
  const businessName = profile.businessName || SALON_NAME;
  const receiptName = profile.receiptDisplayName || businessName;
  const branchName = profile.branchName || 'West Hollywood';
  const address = profile.address || 'West Hollywood, CA';
  const timezone = regionalDefaults.timezone || 'America/Los_Angeles';
  const currency = regionalDefaults.currency || 'USD';
  const locale = regionalDefaults.locale || 'en-US';
  const receiptPrefix = branding.receiptNumberPrefix || 'RCT-';

  const previewModeVariants = {
    booking: {
      focusTitle: 'Guest booking page',
      focusDescription: 'A guest-facing booking surface that reflects the active configuration in the workspace.',
      documentKicker: 'Booking surface',
      documentTitle: businessName,
      documentBadge: 'Desktop',
      noteTitle: 'Booking preview is live',
      noteDescription: 'Use this mode to check how the public booking experience reads on desktop.',
    },
    receipt: {
      focusTitle: 'Receipt preview',
      focusDescription: 'A branded guest receipt showing how the current typography and spacing will land in print or email.',
      documentKicker: 'Receipt preview',
      documentTitle: receiptName,
      documentBadge: 'Thermal',
      noteTitle: 'Receipt preview is live',
      noteDescription: 'Use this mode to validate footer copy, numbering, and receipt-brand presentation.',
    },
    message: {
      focusTitle: 'Guest notification',
      focusDescription: 'A concise reminder or confirmation draft that reflects the current brand voice.',
      documentKicker: 'Notification preview',
      documentTitle: 'Confirmation message',
      documentBadge: 'Email / SMS',
      noteTitle: 'Notification preview is live',
      noteDescription: 'Use this mode to review reminder cadence and sender presentation without leaving settings.',
    },
  };

  const previewModeVariant = previewModeVariants[previewMode] || previewModeVariants.booking;

  const common = {
    focusTitle: previewModeVariant.focusTitle,
    focusDescription: previewModeVariant.focusDescription,
    previewTitle: receiptName,
    previewSubtitle: `${branchName} - ${address}`,
    previewMark: branding.logoPlacement === 'left' ? <Sparkles size={20} /> : <span>{receiptName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'AS'}</span>,
    meta:
      previewMode === 'receipt'
        ? [
            { label: 'Receipt prefix', value: receiptPrefix },
            { label: 'Tax display', value: branding.taxDisplayMode || 'Included' },
            { label: 'Logo placement', value: branding.logoPlacement || 'Centered' },
          ]
        : previewMode === 'message'
          ? [
              { label: 'Sender', value: communication.senderName || businessName },
              { label: 'Reply-to', value: communication.replyToEmail || profile.contactEmail || 'Not set' },
              { label: 'Reminder', value: communication.reminderCadence || '24 hours before' },
            ]
          : [
              { label: 'Timezone', value: timezone },
              { label: 'Locale', value: locale },
              { label: 'Currency', value: currency },
            ],
    documentKicker: previewModeVariant.documentKicker,
    documentTitle: previewModeVariant.documentTitle,
    documentBadge: previewModeVariant.documentBadge,
    lines:
      previewMode === 'receipt'
        ? [
            { label: 'Signature Facial', value: '$120.00' },
            { label: 'Aromatherapy Add-on', value: '$30.00' },
            { label: 'Cash received', value: '$150.00' },
          ]
        : previewMode === 'message'
          ? [
              { label: 'Subject', value: 'Appointment confirmation' },
              { label: 'Reminder', value: communication.reminderCadence || '24 hours before' },
              { label: 'Channel', value: 'Email and SMS' },
            ]
          : [
              { label: 'Primary contact', value: profile.contactEmail || profile.publicBookingEmail || 'Not set' },
              { label: 'Branch phone', value: profile.contactPhone || profile.publicBookingPhone || 'Not set' },
              { label: 'Website', value: profile.website || 'Not set' },
            ],
    footerTitle:
      previewMode === 'receipt'
        ? `Thank you for visiting ${businessName}.`
        : previewMode === 'message'
          ? `Your appointment with ${businessName} is confirmed.`
          : `Configuration stays branded for ${businessName}.`,
    footerBody:
      previewMode === 'receipt'
        ? branding.receiptFooterText || 'We appreciate your trust and look forward to welcoming you again soon.'
        : previewMode === 'message'
          ? communication.confirmationMessage ||
            'Your appointment is confirmed. We are looking forward to welcoming you to a calm and polished visit.'
          : 'The current section is mirrored in the preview so QA can see the live effect without guessing the downstream output.',
    noteTitle: previewModeVariant.noteTitle,
    noteDescription: previewModeVariant.noteDescription,
  };

  switch (activeSectionId) {
    case 'business-profile':
      return common;
    case 'regional-defaults':
      return {
        ...common,
        focusTitle: 'Regional defaults',
        focusDescription: 'Locale rules that keep dates, money, and time readable throughout the CRM.',
        meta: [
          { label: 'Timezone', value: timezone },
          { label: 'Currency', value: currency },
          { label: 'Locale', value: locale },
        ],
        documentKicker: 'Locale summary',
        documentTitle: 'Regional settings',
        documentBadge: 'Locale',
        lines: [
          { label: 'Date format', value: regionalDefaults.dateFormat || 'MM/DD/YYYY' },
          { label: 'Time format', value: regionalDefaults.timeFormat || '12-hour' },
          { label: 'Currency symbol', value: currency },
        ],
        footerTitle: 'Regional defaults stay aligned.',
        footerBody: 'Timezone, currency, date format, and locale remain consistent across the CRM and guest-facing documents.',
      };
    case 'operating-hours':
      return common;
    case 'booking-rules':
      return {
        ...common,
        focusTitle: 'Booking rules',
        focusDescription: 'The calendar guardrails that shape how far ahead guests can book and how the schedule behaves.',
        meta: [
          { label: 'Buffer', value: `${bookingRules.bufferTime || '0'} min` },
          { label: 'Advance window', value: bookingRules.maxAdvanceBooking || 'Not set' },
          { label: 'Approval mode', value: bookingRules.approvalMode || 'Pending' },
        ],
        documentKicker: 'Booking summary',
        documentTitle: 'Calendar policy',
        documentBadge: 'Booking',
        lines: [
          { label: 'Guest visibility', value: bookingRules.guestBookingVisibility || 'Open' },
          { label: 'Staff selection', value: bookingRules.staffSelectionVisibility || 'Open' },
          { label: 'Cancellation window', value: bookingRules.cancellationWindow || 'Not set' },
        ],
        footerTitle: 'Calendar guardrails stay clear.',
        footerBody: 'Buffer time, approval mode, and availability rules stay aligned with the booking engine.',
      };
    case 'communications':
      return {
        ...common,
        focusTitle: 'Guest communication',
        focusDescription: 'Sender identity, reminders, and confirmation language that keep the front-desk voice consistent.',
        meta: [
          { label: 'Sender', value: communication.senderEmail || 'Not set' },
          { label: 'Reply-to', value: communication.replyToEmail || 'Not set' },
          { label: 'Reminder cadence', value: communication.reminderCadence || 'Not set' },
        ],
        documentKicker: 'Messaging summary',
        documentTitle: 'Communication settings',
        documentBadge: 'Messages',
        lines: [
          { label: 'Sender name', value: communication.senderName || businessName },
          { label: 'Confirmation copy', value: communication.confirmationMessage ? 'Enabled' : 'Not set' },
          { label: 'Cancellation copy', value: communication.cancellationMessage ? 'Enabled' : 'Not set' },
        ],
        footerTitle: 'Communication copy stays branded.',
        footerBody: 'Sender identity, reminder cadence, and confirmation language stay aligned with the guest experience.',
      };
    case 'branding-receipts':
      return common;
    default:
      return common;
  }
};

const FieldShell = ({ label, hint, error, full, icon: Icon, children, className = '' }) => (
  <label className={`crm-settings-field${full ? ' crm-settings-field-full' : ''} ${className}`.trim()}>
    <span>{label}</span>
    {Icon ? (
      <div className="crm-settings-input-icon-wrap">
        <Icon size={15} />
        {children}
      </div>
    ) : (
      children
    )}
    {hint ? <em className="crm-settings-field-hint">{hint}</em> : null}
    {error ? <em className="crm-settings-field-error">{error}</em> : null}
  </label>
);

const ToggleButton = ({ active, onClick, label }) => (
  <button
    className={`crm-settings-toggle${active ? ' crm-settings-toggle-on' : ''}`}
    type="button"
    aria-pressed={active}
    aria-label={label}
    onClick={onClick}
  >
    <span />
  </button>
);

const SettingsFieldSelect = ({ label, hint, value, options, onChange, full, error }) => (
  <FieldShell label={label} hint={hint} error={error} full={full}>
    <select value={value} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </FieldShell>
);

const SettingsFieldInput = ({ label, hint, value, onChange, full, icon: Icon, type = 'text', placeholder, error }) => (
  <FieldShell label={label} hint={hint} error={error} full={full} icon={Icon}>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      aria-invalid={Boolean(error)}
      onChange={(event) => onChange(event.target.value)}
    />
  </FieldShell>
);

const SettingsFieldTextarea = ({ label, hint, value, onChange, full, rows = 4, placeholder, error }) => (
  <FieldShell label={label} hint={hint} error={error} full={full}>
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      aria-invalid={Boolean(error)}
      onChange={(event) => onChange(event.target.value)}
    />
  </FieldShell>
);

const SettingsGroupCard = ({ title, description, full = false, children }) => (
  <section className={`crm-settings-group-card${full ? ' crm-settings-group-card-full' : ''}`}>
    <div className="crm-settings-group-head">
      <div>
        <h5>{title}</h5>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
    {children}
  </section>
);

export const SettingsDisclosureCard = ({
  title,
  description,
  badge = 'Advanced',
  defaultOpen = false,
  full = false,
  children,
}) => (
  <details className={`crm-settings-disclosure-card${full ? ' crm-settings-disclosure-card-full' : ''}`} open={defaultOpen}>
    <summary className="crm-settings-disclosure-summary">
      <div>
        <h6>{title}</h6>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="crm-settings-disclosure-meta">
        {badge ? <span>{badge}</span> : null}
        <ChevronDown size={15} />
      </div>
    </summary>
    <div className="crm-settings-disclosure-body">{children}</div>
  </details>
);

export const SettingsSectionChip = ({ label, icon: Icon, active, status = 'saved', onClick }) => (
  <button
    type="button"
    className={`crm-settings-tab${active ? ' crm-settings-tab-active' : ''} crm-settings-tab-${statusTone(status)}`}
    onClick={onClick}
  >
    {Icon ? <Icon size={15} /> : null}
    <span>{label}</span>
    <em>{String(status || '').toUpperCase()}</em>
  </button>
);

export const SettingsSectionHeader = ({
  kicker,
  title,
  description,
  status,
  statusTone: tone,
  actions,
}) => (
  <div className="crm-settings-card-head crm-settings-section-head">
    <div>
      {kicker ? <p className="crm-settings-section-kicker">{kicker}</p> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
    <div className="crm-settings-section-head-actions">
      {status ? (
        <span className={`crm-settings-section-status crm-settings-section-status-${tone || statusTone(status)}`}>
          {status}
        </span>
      ) : null}
      {actions}
    </div>
  </div>
);

export const SettingsSaveState = ({
  saveState,
  dirty,
  validationCount = 0,
  lastSavedAt,
  onSave,
  onResetAll,
  saveIssue = null,
  backendReady = true,
}) => {
  const tone =
    saveState === 'error'
      ? 'alert'
      : saveState === 'saving'
        ? 'neutral'
        : dirty
          ? 'warning'
          : 'good';

  const statusLabel =
    saveState === 'saving'
      ? 'Saving changes'
      : saveState === 'error'
        ? saveIssue === 'validation'
          ? 'Review required'
          : 'Failed'
        : dirty
          ? 'Unsaved Changes'
          : 'Saved';

  const helperLabel =
    saveState === 'saving'
      ? 'Writing updates to the CRM workspace...'
      : saveState === 'error'
        ? saveIssue === 'validation'
          ? `${validationCount} validation issue${validationCount === 1 ? '' : 's'} to review`
          : backendReady
            ? 'The CRM could not confirm this save. Try again in a moment.'
            : 'CRM backend is offline. Start the API or database, then save again.'
        : validationCount > 0
          ? `${validationCount} validation issue${validationCount === 1 ? '' : 's'} to review`
          : dirty
            ? 'Changes are ready to be saved'
            : 'Configuration is synced across the CRM';

  return (
    <div className="crm-settings-save-state">
      <div className={`crm-settings-save-pill crm-settings-save-pill-${tone}`}>
        {saveState === 'saving' ? (
          <LoaderCircle size={15} className="crm-settings-spin" />
        ) : saveState === 'error' ? (
          <CircleAlert size={15} />
        ) : (
          <CircleCheckBig size={15} />
        )}
        <div>
          <strong>{statusLabel}</strong>
          <span>{helperLabel}</span>
        </div>
      </div>

      <div className="crm-settings-save-meta">
        <div>
          <span>Last saved</span>
          <strong>{formatSavedAt(lastSavedAt)}</strong>
        </div>
        <div>
          <span>Validation</span>
          <strong>{validationCount > 0 ? 'Review required' : 'Ready'}</strong>
        </div>
      </div>

      <div className="crm-settings-save-actions">
        {dirty ? (
          <button className="crm-settings-ghost-action" type="button" onClick={onResetAll}>
            <RefreshCcw size={15} />
            <span>Revert All</span>
          </button>
        ) : null}
        <button className="crm-settings-save-btn" type="button" onClick={onSave}>
          <Check size={15} />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};

export const BusinessProfileForm = ({
  profile,
  onChange,
  brandMarkLabel,
  brandMarkPreview,
  onPickBrandMark,
  errors = {},
}) => (
  <div className="crm-settings-profile-block">
    <div className="crm-settings-brand-row">
      <div className="crm-settings-brand-seal">
        {brandMarkPreview ? (
          <img className="crm-settings-brand-image" src={brandMarkPreview} alt="Brand mark preview" />
        ) : (
          <div className="crm-settings-brand-mark">
            {(profile.receiptDisplayName || profile.businessName || 'RS')
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'RS'}
          </div>
        )}
      </div>

      <div className="crm-settings-brand-copy">
        <h4>{profile.businessName}</h4>
        <p>{profile.branchName} - {profile.address}</p>
        <button className="crm-settings-inline-link" type="button" onClick={onPickBrandMark}>
          Update brand mark
        </button>
        <span className="crm-settings-inline-note">{brandMarkLabel}</span>
      </div>

      <div className="crm-settings-brand-meta">
        <div>
          <span>Guest Visibility</span>
          <strong>Live</strong>
        </div>
        <div>
          <span>Timezone</span>
          <strong>{profile.timezone || 'America/Los_Angeles'}</strong>
        </div>
        <div>
          <span>Receipt name</span>
          <strong>{profile.receiptDisplayName || profile.businessName}</strong>
        </div>
      </div>
    </div>

    <div className="crm-settings-group-grid crm-settings-profile-groups">
      <SettingsGroupCard
        title="Guest identity"
        description="The name and receipt identity guests see across booking, payment, and confirmations."
      >
        <div className="crm-settings-form-grid crm-settings-form-grid-compact">
          <SettingsFieldInput
            label="Business Name"
            value={profile.businessName}
            onChange={(value) => onChange('businessName', value)}
            error={errors.businessName}
          />
          <SettingsFieldInput
            label="Branch Name"
            value={profile.branchName}
            onChange={(value) => onChange('branchName', value)}
          />
          <SettingsFieldInput
            label="Receipt Display Name"
            hint="Name used on customer-facing receipts."
            value={profile.receiptDisplayName}
            onChange={(value) => onChange('receiptDisplayName', value)}
          />
        </div>
      </SettingsGroupCard>

      <SettingsDisclosureCard
        title="Guest contact"
        description="Public booking channels guests can use to connect with the spa."
        badge="Public"
        full
      >
        <div className="crm-settings-form-grid crm-settings-form-grid-compact">
          <SettingsFieldInput
            label="Public Booking Email"
            icon={Mail}
            value={profile.publicBookingEmail}
            onChange={(value) => onChange('publicBookingEmail', value)}
          />
          <SettingsFieldInput
            label="Public Booking Phone"
            icon={Phone}
            value={profile.publicBookingPhone}
            onChange={(value) => onChange('publicBookingPhone', value)}
          />
          <SettingsFieldInput
            label="Website"
            icon={Globe2}
            value={profile.website}
            onChange={(value) => onChange('website', value)}
          />
          <SettingsFieldInput
            label="Booking Page URL"
            value={profile.bookingPageUrl}
            onChange={(value) => onChange('bookingPageUrl', value)}
          />
        </div>
      </SettingsDisclosureCard>

      <SettingsDisclosureCard
        title="Location and legal"
        description="Operational and legal contact details used by receipts, admin, and staff workflows."
        badge="Advanced"
        full
      >
        <div className="crm-settings-form-grid crm-settings-form-grid-compact">
          <SettingsFieldInput
            label="Primary Location Address"
            icon={MapPinned}
            full
            value={profile.address}
            onChange={(value) => onChange('address', value)}
            error={errors.address}
          />
          <SettingsFieldInput
            label="Map Link"
            icon={Globe2}
            full
            value={profile.mapLink}
            onChange={(value) => onChange('mapLink', value)}
          />
          <SettingsFieldInput
            label="Legal Entity Name"
            value={profile.legalName}
            onChange={(value) => onChange('legalName', value)}
          />
          <SettingsFieldInput
            label="Main Contact Email"
            icon={Mail}
            value={profile.contactEmail}
            onChange={(value) => onChange('contactEmail', value)}
            error={errors.contactEmail}
          />
          <SettingsFieldInput
            label="Main Contact Phone"
            icon={Phone}
            value={profile.contactPhone}
            onChange={(value) => onChange('contactPhone', value)}
          />
          <SettingsFieldInput
            label="Internal Contact Name"
            icon={UserRound}
            value={profile.internalContactName}
            onChange={(value) => onChange('internalContactName', value)}
          />
          <SettingsFieldInput
            label="Internal Contact Email"
            icon={Mail}
            value={profile.internalContactEmail}
            onChange={(value) => onChange('internalContactEmail', value)}
          />
          <SettingsFieldInput
            label="Tax / Legal ID"
            value={profile.taxId}
            onChange={(value) => onChange('taxId', value)}
          />
        </div>
      </SettingsDisclosureCard>
    </div>
  </div>
);

export const RegionalDefaultsBlock = ({ regionalDefaults, onChange }) => (
  <div className="crm-settings-form-grid crm-settings-form-grid-compact">
    <SettingsFieldSelect
      label="Timezone"
      value={regionalDefaults.timezone}
      onChange={(value) => onChange('timezone', value)}
      options={[
        { value: 'America/Los_Angeles', label: 'Pacific Time (America/Los_Angeles)' },
        { value: 'America/Denver', label: 'Mountain Time (America/Denver)' },
        { value: 'America/Chicago', label: 'Central Time (America/Chicago)' },
        { value: 'America/New_York', label: 'Eastern Time (America/New_York)' },
      ]}
    />
    <SettingsFieldSelect
      label="Currency"
      value={regionalDefaults.currency}
      onChange={(value) => onChange('currency', value)}
      options={[
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'EUR', label: 'EUR - Euro' },
      ]}
    />
    <SettingsFieldSelect
      label="Date Format"
      value={regionalDefaults.dateFormat}
      onChange={(value) => onChange('dateFormat', value)}
      options={[
        { value: 'MMM d, yyyy', label: 'Apr 15, 2026' },
        { value: 'MM/dd/yyyy', label: '04/15/2026' },
        { value: 'dd/MM/yyyy', label: '15/04/2026' },
      ]}
    />
    <SettingsFieldSelect
      label="Time Format"
      value={regionalDefaults.timeFormat}
      onChange={(value) => onChange('timeFormat', value)}
      options={[
        { value: '12-hour', label: '12-hour' },
        { value: '24-hour', label: '24-hour' },
      ]}
    />
    <SettingsFieldSelect
      label="Locale"
      value={regionalDefaults.locale}
      onChange={(value) => onChange('locale', value)}
      options={[
        { value: 'en-US', label: 'English (United States)' },
        { value: 'en-GB', label: 'English (United Kingdom)' },
        { value: 'es-US', label: 'Spanish (United States)' },
      ]}
      full
    />
  </div>
);

export const OperatingHoursDayCard = ({ entry, onChange, onToggle }) => (
  <article className={`crm-settings-hour-card${entry.enabled ? '' : ' crm-settings-hour-card-closed'}`}>
    <div className="crm-settings-hour-head">
      <div>
        <span>{entry.day}</span>
        <strong>{entry.enabled ? 'Open for bookings' : 'Closed for bookings'}</strong>
      </div>
      <ToggleButton active={entry.enabled} onClick={onToggle} label={`Toggle ${entry.day}`} />
    </div>

    {entry.enabled ? (
      <div className="crm-settings-hour-inputs">
        <SettingsFieldInput
          label="From"
          value={entry.open}
          onChange={(value) => onChange('open', value)}
          type="time"
        />
        <SettingsFieldInput
          label="To"
          value={entry.close}
          onChange={(value) => onChange('close', value)}
          type="time"
        />

        <details className="crm-settings-hour-details" open={Boolean(entry.breakStart || entry.breakEnd)}>
          <summary>
            <span>Break window</span>
            <ChevronDown size={14} />
          </summary>
          <div className="crm-settings-hour-break-grid">
            <SettingsFieldInput
              label="Break start"
              value={entry.breakStart}
              onChange={(value) => onChange('breakStart', value)}
              type="time"
            />
            <SettingsFieldInput
              label="Break end"
              value={entry.breakEnd}
              onChange={(value) => onChange('breakEnd', value)}
              type="time"
            />
          </div>
        </details>
      </div>
    ) : (
      <div className="crm-settings-hour-closed-copy">
        <strong>Sanctuary Closed</strong>
        <p>{entry.note || 'Online bookings pause for this day.'}</p>
      </div>
    )}

    <p className="crm-settings-hour-note">{entry.note}</p>
    <span className="crm-settings-hour-badge">
      <ShieldCheck size={13} />
      <span>{entry.guestBookingOpen ? 'Guest booking open' : 'Staff only'}</span>
    </span>
  </article>
);

export const SpecialHoursManager = ({ specialHours, onAdd, onRemove }) => (
  <div className="crm-settings-special-hours">
    <div className="crm-settings-special-hours-head">
      <div>
        <h4>Special Hours & Exceptions</h4>
        <p>Add holidays, closures, or seasonal windows that override the weekly schedule.</p>
      </div>
      <button className="crm-settings-ghost-action" type="button" onClick={onAdd}>
        <Plus size={15} />
        <span>Add Special Hours</span>
      </button>
    </div>

    {specialHours.length ? (
      <div className="crm-settings-seasonal-grid">
        {specialHours.map((item) => (
          <article key={item.id} className="crm-settings-seasonal-card">
            <div>
              <span>{item.label}</span>
              <strong>{item.date}</strong>
            </div>
            <p>{item.note}</p>
            <div className="crm-settings-seasonal-meta">
              <em>{item.type}</em>
              <button type="button" className="crm-settings-inline-action" onClick={() => onRemove(item.id)}>
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="crm-settings-special-hours-empty">
        <CalendarDays size={18} />
        <div>
          <strong>No special hours yet</strong>
          <p>Create holiday closures, extended weekends, or seasonal windows for the booking engine.</p>
        </div>
      </div>
    )}
  </div>
);

export const BookingRulesBlock = ({ bookingRules, onChange, onToggle }) => (
  <div className="crm-settings-rule-stack">
    <div className="crm-settings-group-grid crm-settings-rule-groups">
      <SettingsGroupCard
        title="Booking windows"
        description="How the calendar spaces treatment times and manages lead times."
      >
        <div className="crm-settings-rule-grid">
          <SettingsFieldInput
            label="Buffer Time"
            hint="Minutes required between treatments."
            value={bookingRules.bufferTime}
            onChange={(value) => onChange('bufferTime', value)}
          />
          <SettingsFieldInput
            label="Slot Interval"
            hint="Booking engine slot length."
            value={bookingRules.slotInterval}
            onChange={(value) => onChange('slotInterval', value)}
          />
          <SettingsFieldInput
            label="Cancellation Window"
            hint="Minimum notice for penalty-free cancellation."
            value={bookingRules.cancellationWindow}
            onChange={(value) => onChange('cancellationWindow', value)}
          />
          <SettingsFieldInput
            label="Reminder Timing"
            hint="Default reminder cadence before each appointment."
            value={bookingRules.reminderTiming}
            onChange={(value) => onChange('reminderTiming', value)}
          />
        </div>

        <SettingsDisclosureCard
          title="Advanced lead times"
          description="Define how far ahead guests can book and the minimum notice they must give."
          badge="Advanced"
        >
          <div className="crm-settings-rule-grid crm-settings-rule-grid-advanced">
            <SettingsFieldInput
              label="Max Advance Booking"
              hint="How far ahead guests may book."
              value={bookingRules.maxAdvanceBooking}
              onChange={(value) => onChange('maxAdvanceBooking', value)}
            />
            <SettingsFieldInput
              label="Minimum Lead Time"
              hint="Minimum time before a booking can be made."
              value={bookingRules.minimumLeadTime}
              onChange={(value) => onChange('minimumLeadTime', value)}
            />
          </div>
        </SettingsDisclosureCard>
      </SettingsGroupCard>

      <SettingsGroupCard
        title="Visibility and approvals"
        description="How guests discover the service menu and how bookings enter the schedule."
      >
        <div className="crm-settings-rule-grid">
          <SettingsFieldSelect
            label="Default Appointment Status"
            value={bookingRules.defaultAppointmentStatus}
            onChange={(value) => onChange('defaultAppointmentStatus', value)}
            options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Confirmed', label: 'Confirmed' },
              { value: 'Auto-confirmed', label: 'Auto-confirmed' },
            ]}
          />
          <SettingsFieldSelect
            label="Approval Mode"
            value={bookingRules.approvalMode}
            onChange={(value) => onChange('approvalMode', value)}
            options={[
              { value: 'Auto-confirm', label: 'Auto-confirm' },
              { value: 'Manual approval', label: 'Manual approval' },
            ]}
          />
          <SettingsFieldSelect
            label="Guest Visibility"
            value={bookingRules.guestBookingVisibility}
            onChange={(value) => onChange('guestBookingVisibility', value)}
            options={[
              { value: 'Live', label: 'Live' },
              { value: 'Request only', label: 'Request only' },
              { value: 'Hidden', label: 'Hidden' },
            ]}
          />
          <SettingsFieldSelect
            label="Staff Selection"
            value={bookingRules.staffSelectionVisibility}
            onChange={(value) => onChange('staffSelectionVisibility', value)}
            options={[
              { value: 'Visible to guests', label: 'Visible to guests' },
              { value: 'Hidden from guests', label: 'Hidden from guests' },
            ]}
          />
        </div>
      </SettingsGroupCard>

      <SettingsDisclosureCard
        title="Guest policies"
        description="Operating rules that shape same-day access, deposits, and guest pricing visibility."
        full
        badge="Advanced"
      >
        <div className="crm-settings-switch-stack">
          {[
            ['sameDayBooking', 'Same-day booking allowed', 'Allow same-day booking requests from guests.'],
            ['walkInsAllowed', 'Walk-ins allowed', 'Keep a lane open for walk-in visits.'],
            ['depositRequired', 'Deposit required for online bookings', 'Protect premium time slots with a booking deposit.'],
            ['hidePrices', 'Hide prices from guest portal', 'Show pricing only after the guest chooses a service path.'],
          ].map(([key, label, hint]) => (
            <div className="crm-settings-switch-row" key={key}>
              <div>
                <span>{label}</span>
                <p>{hint}</p>
              </div>
              <ToggleButton active={bookingRules[key]} onClick={() => onToggle(key)} label={label} />
            </div>
          ))}
        </div>
      </SettingsDisclosureCard>
    </div>
  </div>
);

export const CommunicationSettingsBlock = ({ communication, onChange, onToggle }) => (
  <div className="crm-settings-communication-stack">
    <div className="crm-settings-switch-stack">
      {[ 
        ['confirmationEmail', 'Booking confirmation email', 'Send a confirmation when a booking is created.'],
        ['reminderEmail', 'Reminder email', 'Send an automated reminder before the visit.'],
      ].map(([key, label, hint]) => (
        <div className="crm-settings-switch-row" key={key}>
          <div>
            <span>{label}</span>
            <p>{hint}</p>
          </div>
          <ToggleButton active={communication[key]} onClick={() => onToggle(key)} label={label} />
        </div>
      ))}
    </div>

    <div className="crm-settings-form-grid crm-settings-form-grid-compact">
      <SettingsFieldInput
        label="Sender Name"
        value={communication.senderName}
        onChange={(value) => onChange('senderName', value)}
      />
      <SettingsFieldInput
        label="Sender Email"
        icon={Mail}
        value={communication.senderEmail}
        onChange={(value) => onChange('senderEmail', value)}
      />
      <SettingsFieldInput
        label="Reply-to Email"
        icon={Mail}
        value={communication.replyToEmail}
        onChange={(value) => onChange('replyToEmail', value)}
      />
      <SettingsFieldInput
        label="Reminder Cadence"
        icon={Bell}
        value={communication.reminderCadence}
        onChange={(value) => onChange('reminderCadence', value)}
      />
    </div>

    <div className="crm-settings-message-grid">
      <SettingsFieldTextarea
        label="Confirmation Message Preview"
        hint="Shown in booking confirmation emails."
        value={communication.confirmationMessage}
        onChange={(value) => onChange('confirmationMessage', value)}
        rows={4}
      />
      <SettingsFieldTextarea
        label="Cancellation Message Preview"
        hint="Shown when a booking is cancelled or rescheduled."
        value={communication.cancellationMessage}
        onChange={(value) => onChange('cancellationMessage', value)}
        rows={4}
      />
    </div>

    <div className="crm-settings-future-row">
      <div>
        <strong>Future-ready channels</strong>
        <p>SMS and WhatsApp can be enabled later without changing the screen structure.</p>
      </div>
      <div className="crm-settings-branding-summary">
        <span className="crm-settings-branding-chip">
          <MessageSquareText size={16} />
          <span>SMS ready</span>
        </span>
        <span className="crm-settings-branding-chip">
          <Phone size={16} />
          <span>WhatsApp ready</span>
        </span>
      </div>
    </div>
  </div>
);

export const ReceiptBrandingPreview = ({
  profile,
  branding,
  regionalDefaults,
  operatingHours,
  specialHours,
  bookingRules,
  communication,
  activeSectionId,
  previewMode,
  onPreviewModeChange,
  activeSectionLabel,
  activeSectionMeta,
}) => {
  const preview = buildPreviewVariant({
    activeSectionId,
    previewMode,
    profile,
    branding,
    regionalDefaults,
    operatingHours,
    specialHours,
    bookingRules,
    communication,
  });

  return (
    <div className="crm-settings-preview-card">
      <SettingsSectionHeader
        kicker="Workspace Preview"
        title="Live configuration preview"
        description="A customer-facing preview of how the active settings area reads across the CRM."
        status="Live"
        statusTone="good"
      />

      {onPreviewModeChange ? (
        <div className="crm-settings-preview-modes" role="tablist" aria-label="Preview mode">
          {[
            ['booking', 'Guest booking'],
            ['receipt', 'Receipt'],
            ['message', 'Notification'],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={previewMode === mode}
              className={`crm-settings-preview-mode${previewMode === mode ? ' crm-settings-preview-mode-active' : ''}`}
              onClick={() => onPreviewModeChange(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="crm-settings-preview-focus">
        <div>
          <span>Current focus</span>
          <strong>{activeSectionMeta?.sectionLabel || preview.focusTitle}</strong>
        </div>
        <div>
          <span>Group</span>
          <strong>{activeSectionMeta?.groupTitle || 'Core Business'}</strong>
        </div>
        <p>{activeSectionMeta?.sectionSummary || activeSectionLabel || preview.focusDescription}</p>
      </div>

      <div className="crm-settings-preview-shell">
        <div className="crm-settings-preview-brand">
          <div className="crm-settings-preview-mark">
            {preview.previewMark}
          </div>
          <div>
            <strong>{preview.previewTitle}</strong>
            <p>{preview.previewSubtitle}</p>
          </div>
        </div>

        <div className="crm-settings-preview-meta">
          {preview.meta.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="crm-settings-preview-receipt">
          <div className="crm-settings-preview-receipt-head">
            <div>
              <p>{preview.documentKicker}</p>
              <strong>{preview.documentTitle}</strong>
            </div>
            <span>{preview.documentBadge}</span>
          </div>
          <div className="crm-settings-preview-receipt-lines">
            {preview.lines.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <footer>
            <strong>{preview.footerTitle}</strong>
            <p>{preview.footerBody}</p>
          </footer>
        </div>

        <div className="crm-settings-preview-note">
          <Sparkles size={16} />
          <div>
            <strong>{preview.noteTitle}</strong>
            <p>{preview.noteDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SettingsTrustPanel = ({
  saveState,
  dirty,
  lastSavedAt,
  validationCount,
  sectionStates,
}) => (
  <div className="crm-settings-trust-card">
    <SettingsSectionHeader
      kicker="Trust & Readiness"
      title="Configuration Health"
      description="A quick view of what is saved, what still needs attention, and where the business setup stands."
      status={dirty ? 'Unsaved' : 'Saved'}
      statusTone={dirty ? 'warning' : 'good'}
    />

    <div className="crm-settings-trust-stack">
      <div className="crm-settings-trust-stat">
        <span>Save state</span>
        <strong>{saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Error saving' : dirty ? 'Unsaved changes' : 'Saved and synced'}</strong>
      </div>
      <div className="crm-settings-trust-stat">
        <span>Last saved</span>
        <strong>{formatSavedAt(lastSavedAt)}</strong>
      </div>
      <div className="crm-settings-trust-stat">
        <span>Validation</span>
        <strong>{validationCount > 0 ? `${validationCount} items to review` : 'No blocking issues'}</strong>
      </div>
    </div>

    <div className="crm-settings-status-grid">
      {sectionStates.map((section) => (
        <div key={section.id} className={`crm-settings-status-pill crm-settings-status-pill-${section.state}`}>
          <span>{section.label}</span>
          <strong>{section.stateLabel}</strong>
        </div>
      ))}
    </div>

    <div className="crm-settings-permissions">
      <div className="crm-settings-permissions-head">
        <ShieldCheck size={15} />
        <strong>Permissions-ready structure</strong>
      </div>
      <p>
        Business profile, booking rules, branding, and receipt presentation can each be scoped to
        owner, manager, or front desk access later without changing the section layout.
      </p>
      <div className="crm-settings-permissions-tags">
        <span>Owner</span>
        <span>Manager</span>
        <span>Front desk</span>
        <span>Read only</span>
      </div>
    </div>
  </div>
);

export const SpecialHoursDialog = ({
  draft,
  onChange,
  onClose,
  onSave,
}) => (
  <div className="crm-settings-modal-backdrop" role="presentation" onClick={onClose}>
    <article
      className="crm-settings-modal-card crm-settings-modal-card-wide"
      role="dialog"
      aria-modal="true"
      aria-label="Special hours"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="crm-settings-modal-head">
        <div>
          <p>Special Hours</p>
          <h3>Holiday closure or seasonal override</h3>
        </div>
        <button type="button" className="crm-settings-modal-close" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="crm-settings-form-grid crm-settings-form-grid-compact">
        <SettingsFieldInput
          label="Label"
          value={draft.label}
          onChange={(value) => onChange('label', value)}
        />
        <SettingsFieldInput
          label="Date"
          value={draft.date}
          onChange={(value) => onChange('date', value)}
          type="date"
        />
        <SettingsFieldSelect
          label="Type"
          value={draft.type}
          onChange={(value) => onChange('type', value)}
          options={[
            { value: 'Holiday closure', label: 'Holiday closure' },
            { value: 'Seasonal hours', label: 'Seasonal hours' },
            { value: 'Private event', label: 'Private event' },
            { value: 'Staff training', label: 'Staff training' },
          ]}
        />
        <SettingsFieldInput
          label="Open"
          value={draft.open}
          onChange={(value) => onChange('open', value)}
          type="time"
          full
        />
        <SettingsFieldInput
          label="Close"
          value={draft.close}
          onChange={(value) => onChange('close', value)}
          type="time"
          full
        />
        <SettingsFieldTextarea
          label="Note"
          value={draft.note}
          onChange={(value) => onChange('note', value)}
          rows={3}
          full
        />
      </div>

      <div className="crm-settings-switch-row crm-settings-switch-row-compact">
        <div>
          <span>Closed all day</span>
          <p>Use this for full holiday closures or fully unavailable days.</p>
        </div>
        <ToggleButton
          active={draft.closed}
          onClick={() => onChange('closed', !draft.closed)}
          label="Toggle closed all day"
        />
      </div>

      <div className="crm-settings-modal-actions">
        <button type="button" onClick={onSave}>
          Save special hours
        </button>
      </div>
    </article>
  </div>
);
