import { useEffect, useMemo, useRef, useState } from 'react';
import { crmCreate } from '../../config/crmApi';

const CUSTOMER_GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const CUSTOMER_SOURCE_OPTIONS = ['Walk-In', 'Instagram', 'Referral', 'Website', 'Google', 'Phone Inquiry', 'WhatsApp', 'Other'];
const CUSTOMER_TAG_OPTIONS = ['VIP', 'Regular', 'New', 'High Value', 'Rebook Soon', 'Sensitive', 'Retail Buyer', 'Package Buyer'];
const FALLBACK_SERVICE_OPTIONS = [
  'Signature Facial',
  'Hydra Glow Infusion',
  'Aromatherapy Steam Escape',
  'Full Body Scrub',
  'Wellness Intake Consultation',
];

const normalizeText = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const normalizePhone = (value) => normalizeText(value).replace(/[^\d+]/g, '');

const phoneDigits = (value) => normalizePhone(value).replace(/\D/g, '');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildBranchLabel = (branch) => {
  const name = normalizeText(branch?.name ?? branch?.branchName ?? branch?.label ?? branch?.title ?? branch?.value);
  const city = normalizeText(branch?.city ?? branch?.town ?? branch?.location ?? '');
  const state = normalizeText(branch?.state ?? '');
  const location = [city, state].filter(Boolean).join(', ');
  return [name, location].filter(Boolean).join(' - ') || 'Current branch';
};

const normalizeMultiSelect = (value) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => {
          if (typeof entry === 'string') return normalizeText(entry);
          if (entry && typeof entry === 'object') {
            return normalizeText(entry.name ?? entry.label ?? entry.value ?? entry.id ?? '');
          }
          return '';
        })
        .filter(Boolean),
    ),
  );
};

const buildInitialDraft = ({ branchId = '', branchName = '', customerSource = 'Walk-In' } = {}) => ({
  fullName: '',
  phone: '',
  email: '',
  gender: '',
  dateOfBirth: '',
  branchId,
  branchName,
  customerSource,
  tags: [],
  preferredServices: [],
  notes: '',
});

const validateDraft = (draft, { branchRequired = false } = {}) => {
  const nextErrors = {};

  if (!normalizeText(draft.fullName)) {
    nextErrors.fullName = 'Full name is required.';
  }

  const phoneValue = phoneDigits(draft.phone);
  if (!phoneValue) {
    nextErrors.phone = 'Phone number is required.';
  } else if (phoneValue.length < 10) {
    nextErrors.phone = 'Enter a valid phone number.';
  }

  if (draft.email && !emailPattern.test(normalizeText(draft.email))) {
    nextErrors.email = 'Enter a valid email address.';
  }

  if (branchRequired && !normalizeText(draft.branchId) && !normalizeText(draft.branchName)) {
    nextErrors.branchId = 'Select a branch for this customer.';
  }

  if (draft.dateOfBirth && Number.isNaN(new Date(draft.dateOfBirth).getTime())) {
    nextErrors.dateOfBirth = 'Enter a valid date of birth.';
  }

  return nextErrors;
};

const mapBackendFieldErrors = (fieldErrors = {}) => ({
  fullName: fieldErrors.full_name || fieldErrors.fullName || fieldErrors.name || '',
  phone: fieldErrors.phone || fieldErrors.contactPhone || '',
  email: fieldErrors.email || '',
  gender: fieldErrors.gender || '',
  dateOfBirth: fieldErrors.date_of_birth || fieldErrors.dateOfBirth || '',
  branchId: fieldErrors.branch_id || fieldErrors.branchId || '',
  customerSource: fieldErrors.customer_source || fieldErrors.customerSource || fieldErrors.source || '',
  notes: fieldErrors.notes || '',
});

const formatCreateError = (error) => {
  const code = error?.code || error?.payload?.code || '';
  if (code === 'CRM_NETWORK_UNAVAILABLE') {
    return 'The CRM service could not be reached. Check the backend connection and try again.';
  }
  if (code === 'CRM_SERVICE_UNAVAILABLE' || (error?.status >= 500 && error?.status < 600)) {
    return 'The CRM service is temporarily unavailable. Please try again once the backend is ready.';
  }
  return error?.message || 'Customer save failed.';
};

const normalizeOptionList = (options = [], fallback = []) => {
  const normalized = options
    .map((option) => {
      if (typeof option === 'string') {
        const label = normalizeText(option);
        return label ? { id: label, label, value: label } : null;
      }

      if (!option || typeof option !== 'object') return null;

      const id = normalizeText(option.id || option.branchId || option.value || option.code || option.name || option.label);
      const label = normalizeText(option.label || option.name || option.branchName || option.title || option.city || option.value || id);
      const branchLabel = buildBranchLabel(option);
      const branchName = normalizeText(option.name || option.branchName || label || id);

      if (!id && !label) return null;
      return {
        id: id || label || branchLabel,
        label: label || branchLabel || id,
        value: id || label || branchLabel,
        branchName,
      };
    })
    .filter(Boolean);

  const merged = normalized.length ? normalized : fallback.map((label) => ({ id: label, label, value: label, branchName: label }));
  const deduped = Array.from(new Map(merged.map((option) => [option.id || option.label, option])).values());
  return deduped;
};

const CustomerCreateDrawer = ({
  open,
  branches = [],
  services = [],
  existingCustomers = [],
  defaultBranchId = '',
  defaultBranchName = '',
  onClose,
  onCreated,
}) => {
  const [isRendered, setIsRendered] = useState(open);
  const [draft, setDraft] = useState(() => buildInitialDraft({ branchId: defaultBranchId, branchName: defaultBranchName }));
  const [errors, setErrors] = useState({});
  const [submissionError, setSubmissionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const closeTimerRef = useRef(null);
  const drawerRef = useRef(null);
  const nameInputRef = useRef(null);

  const branchOptions = useMemo(() => {
    const normalized = normalizeOptionList(branches);
    const fallbackBranch = normalizeText(defaultBranchId) || normalizeText(defaultBranchName)
      ? [{
          id: normalizeText(defaultBranchId || defaultBranchName),
          label: normalizeText(defaultBranchName || defaultBranchId || 'Current branch'),
          value: normalizeText(defaultBranchId || defaultBranchName),
          branchName: normalizeText(defaultBranchName || defaultBranchId || 'Current branch'),
        }]
      : [];

    const merged = normalized.length ? normalized : fallbackBranch;
    return Array.from(new Map(merged.map((branch) => [branch.id || branch.label, branch])).values());
  }, [branches, defaultBranchId, defaultBranchName]);

  const serviceOptions = useMemo(() => {
    const fromApi = normalizeOptionList(services, FALLBACK_SERVICE_OPTIONS);
    if (!fromApi.length) return FALLBACK_SERVICE_OPTIONS.map((label) => ({ id: label, label, value: label }));
    return fromApi;
  }, [services]);

  const selectedBranch = useMemo(() => {
    const byId = branchOptions.find((branch) => branch.id === draft.branchId);
    if (byId) return byId;
    const byName = branchOptions.find((branch) => branch.branchName === draft.branchName || branch.label === draft.branchName);
    return byName || branchOptions[0] || null;
  }, [branchOptions, draft.branchId, draft.branchName]);

  const duplicateCustomer = useMemo(() => {
    const targetDigits = phoneDigits(draft.phone);
    if (!targetDigits) return null;

    return (
      existingCustomers.find((customer) => phoneDigits(customer?.phone) === targetDigits) || null
    );
  }, [draft.phone, existingCustomers]);

  const duplicateWarning = duplicateCustomer
    ? `Potential duplicate detected: ${normalizeText(duplicateCustomer.name || duplicateCustomer.fullName || 'existing customer')} - ${normalizeText(duplicateCustomer.phone)}`
    : '';

  const branchRequired = branchOptions.length > 1;

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setIsRendered(true);
      setDraft(buildInitialDraft({
        branchId: defaultBranchId || '',
        branchName: defaultBranchName || '',
      }));
      setErrors({});
      setSubmissionError('');
      setIsSubmitting(false);
      setSubmitAttempted(false);

      requestAnimationFrame(() => {
        nameInputRef.current?.focus?.();
      });
    }

    if (!open && wasOpenRef.current) {
      setSubmissionError('');
      setIsSubmitting(false);

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }

      closeTimerRef.current = setTimeout(() => {
        setIsRendered(false);
      }, 220);
    }

    wasOpenRef.current = open;

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, defaultBranchId, defaultBranchName]);

  useEffect(() => {
    if (!open) return;

    if (draft.branchId || draft.branchName || branchOptions.length !== 1) {
      return;
    }

    const [onlyBranch] = branchOptions;
    if (onlyBranch) {
      setDraft((current) => ({
        ...current,
        branchId: onlyBranch.id,
        branchName: onlyBranch.branchName || onlyBranch.label,
      }));
    }
  }, [branchOptions, draft.branchId, draft.branchName, open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onClose, open]);

  useEffect(() => {
    if (!open || !submitAttempted) return;
    setErrors(validateDraft(draft, { branchRequired }));
  }, [branchRequired, draft, open, submitAttempted]);

  if (!isRendered) return null;

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const markTouched = () => {
    setSubmitAttempted(true);
  };

  const toggleTag = (tag) => {
    setDraft((current) => {
      const hasTag = current.tags.includes(tag);
      return {
        ...current,
        tags: hasTag ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
      };
    });
  };

  const toggleService = (service) => {
    setDraft((current) => {
      const hasService = current.preferredServices.includes(service);
      return {
        ...current,
        preferredServices: hasService
          ? current.preferredServices.filter((item) => item !== service)
          : [...current.preferredServices, service],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);

    const nextErrors = validateDraft(draft, { branchRequired });
    setErrors(nextErrors);
    setSubmissionError('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await crmCreate('customers', {
        full_name: normalizeText(draft.fullName),
        fullName: normalizeText(draft.fullName),
        name: normalizeText(draft.fullName),
        phone: normalizePhone(draft.phone),
        email: normalizeText(draft.email).toLowerCase(),
        gender: normalizeText(draft.gender),
        date_of_birth: normalizeText(draft.dateOfBirth),
        dateOfBirth: normalizeText(draft.dateOfBirth),
        branch_id: normalizeText(draft.branchId),
        branchId: normalizeText(draft.branchId),
        branch_name: normalizeText(selectedBranch?.branchName || selectedBranch?.label || draft.branchName),
        branchName: normalizeText(selectedBranch?.branchName || selectedBranch?.label || draft.branchName),
        customer_source: normalizeText(draft.customerSource, 'Walk-In'),
        customerSource: normalizeText(draft.customerSource, 'Walk-In'),
        source: normalizeText(draft.customerSource, 'Walk-In'),
        notes: normalizeText(draft.notes),
        tags: normalizeMultiSelect(draft.tags),
        preferences: normalizeMultiSelect(draft.preferredServices),
      });

      await onCreated?.(created, {
        duplicateWarning: normalizeText(created?.duplicateWarning || created?.warning || duplicateWarning),
      });
      onClose?.();
    } catch (error) {
      const fieldErrors = mapBackendFieldErrors(error?.payload?.fieldErrors || error?.payload?.errors || {});
      if (Object.keys(fieldErrors).some((key) => fieldErrors[key])) {
        setErrors((current) => ({ ...current, ...fieldErrors }));
      }
      setSubmissionError(formatCreateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`crm-customer-drawer-backdrop${open ? ' crm-customer-drawer-backdrop-open' : ' crm-customer-drawer-backdrop-closing'}`}
      onClick={isSubmitting ? undefined : onClose}
    >
      <aside
        ref={drawerRef}
        className={`crm-customer-drawer-panel${open ? ' crm-customer-drawer-panel-open' : ' crm-customer-drawer-panel-closing'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-customer-drawer-title"
        aria-describedby="crm-customer-drawer-subtitle"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="crm-customer-drawer-head">
          <div>
            <p className="crm-customer-drawer-kicker">Customer workspace</p>
            <h2 id="crm-customer-drawer-title">New Customer</h2>
            <p id="crm-customer-drawer-subtitle">Add a new client to your CRM.</p>
          </div>
          <button
            type="button"
            className="crm-customer-drawer-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close drawer"
          >
            X
          </button>
        </header>

        <form className="crm-customer-drawer-form" noValidate onSubmit={handleSubmit}>
          <div className="crm-customer-drawer-body">
            {submissionError ? <p className="crm-customer-drawer-error">{submissionError}</p> : null}
            {duplicateWarning ? <p className="crm-customer-drawer-warning">{duplicateWarning}</p> : null}

            <section className="crm-customer-drawer-section">
              <div className="crm-customer-drawer-section-head">
                <div>
                  <p className="crm-customer-drawer-section-kicker">Basic info</p>
                  <h3>Identity and contact</h3>
                </div>
                <p>Use the customer's real contact details so follow-up and retention flows stay accurate.</p>
              </div>

              <label className={`crm-customer-drawer-field${errors.fullName ? ' crm-customer-drawer-field-error' : ''}`}>
                <span>Full Name</span>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={draft.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  onBlur={markTouched}
                  placeholder="Carla Kim"
                  disabled={isSubmitting}
                  required
                />
                {errors.fullName ? <small>{errors.fullName}</small> : null}
              </label>

              <div className="crm-customer-drawer-grid">
                <label className={`crm-customer-drawer-field${errors.phone ? ' crm-customer-drawer-field-error' : ''}`}>
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    onBlur={markTouched}
                    placeholder="(323) 555-2200"
                    inputMode="tel"
                    disabled={isSubmitting}
                    required
                  />
                  {errors.phone ? <small>{errors.phone}</small> : null}
                </label>

                <label className={`crm-customer-drawer-field${errors.email ? ' crm-customer-drawer-field-error' : ''}`}>
                  <span>Email</span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    onBlur={markTouched}
                    placeholder="carla.kim@example.com"
                    disabled={isSubmitting}
                  />
                  {errors.email ? <small>{errors.email}</small> : null}
                </label>

                <label className="crm-customer-drawer-field">
                  <span>Gender</span>
                  <select
                    value={draft.gender}
                    onChange={(event) => updateField('gender', event.target.value)}
                    onBlur={markTouched}
                    disabled={isSubmitting}
                  >
                    <option value="">Select optional</option>
                    {CUSTOMER_GENDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={`crm-customer-drawer-field${errors.dateOfBirth ? ' crm-customer-drawer-field-error' : ''}`}>
                  <span>Date of Birth</span>
                  <input
                    type="date"
                    value={draft.dateOfBirth}
                    onChange={(event) => updateField('dateOfBirth', event.target.value)}
                    onBlur={markTouched}
                    disabled={isSubmitting}
                  />
                  {errors.dateOfBirth ? <small>{errors.dateOfBirth}</small> : null}
                </label>
              </div>
            </section>

            <section className="crm-customer-drawer-section">
              <div className="crm-customer-drawer-section-head">
                <div>
                  <p className="crm-customer-drawer-section-kicker">Business info</p>
                  <h3>Branch and source</h3>
                </div>
                <p>Route the customer to the correct location and preserve where they came from.</p>
              </div>

              <div className="crm-customer-drawer-grid">
                <label className={`crm-customer-drawer-field${errors.branchId ? ' crm-customer-drawer-field-error' : ''}`}>
                  <span>Branch</span>
                  <select
                    value={draft.branchId || ''}
                    onChange={(event) => {
                      const nextBranchId = event.target.value;
                      const nextBranch = branchOptions.find((branch) => branch.id === nextBranchId) || null;
                      updateField('branchId', nextBranchId);
                      updateField('branchName', nextBranch ? nextBranch.branchName || nextBranch.label : '');
                    }}
                    onBlur={markTouched}
                    disabled={isSubmitting || branchOptions.length <= 1}
                    required={branchRequired}
                  >
                    <option value="">{branchOptions.length > 1 ? 'Select a branch' : 'Current branch'}</option>
                    {branchOptions.map((branch) => (
                      <option key={branch.id || branch.label} value={branch.id}>
                        {branch.label}
                      </option>
                    ))}
                  </select>
                  {errors.branchId ? <small>{errors.branchId}</small> : branchOptions.length <= 1 ? <small>Branch assignment follows the current CRM location.</small> : null}
                </label>

                <label className="crm-customer-drawer-field">
                  <span>Customer Source</span>
                  <select
                    value={draft.customerSource}
                    onChange={(event) => updateField('customerSource', event.target.value)}
                    onBlur={markTouched}
                    disabled={isSubmitting}
                  >
                    {CUSTOMER_SOURCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="crm-customer-drawer-stack">
                <div className="crm-customer-drawer-stack-head">
                  <div>
                    <span>Tags</span>
                    <p>Optional relationship markers for VIP, repeat, and retention workflows.</p>
                  </div>
                  <span>{draft.tags.length} selected</span>
                </div>
                <div className="crm-customer-drawer-chip-grid">
                  {CUSTOMER_TAG_OPTIONS.map((tag) => {
                    const active = draft.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`crm-customer-drawer-chip${active ? ' crm-customer-drawer-chip-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => toggleTag(tag)}
                        disabled={isSubmitting}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="crm-customer-drawer-section">
              <div className="crm-customer-drawer-section-head">
                <div>
                  <p className="crm-customer-drawer-section-kicker">Notes & preferences</p>
                  <h3>Context for the team</h3>
                </div>
                <p>Keep preferences close so front desk and service staff can tailor the experience.</p>
              </div>

              <label className="crm-customer-drawer-field crm-customer-drawer-field-textarea">
                <span>Notes</span>
                <textarea
                  rows="4"
                  value={draft.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  onBlur={markTouched}
                  placeholder="Add client preferences, sensitivities, or follow-up context."
                  disabled={isSubmitting}
                />
              </label>

              <div className="crm-customer-drawer-stack">
                <div className="crm-customer-drawer-stack-head">
                  <div>
                    <span>Preferred Services</span>
                    <p>Mark services the customer tends to book or asks about most often.</p>
                  </div>
                  <span>{draft.preferredServices.length} selected</span>
                </div>
                <div className="crm-customer-drawer-chip-grid crm-customer-drawer-chip-grid-services">
                  {serviceOptions.map((service) => {
                    const label = service.label || service.id;
                    const active = draft.preferredServices.includes(label);
                    return (
                      <button
                        key={service.id || label}
                        type="button"
                        className={`crm-customer-drawer-chip${active ? ' crm-customer-drawer-chip-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => toggleService(label)}
                        disabled={isSubmitting}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <footer className="crm-customer-drawer-footer">
            <button type="button" className="crm-customers-ghost-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="crm-customers-primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
};

export default CustomerCreateDrawer;
