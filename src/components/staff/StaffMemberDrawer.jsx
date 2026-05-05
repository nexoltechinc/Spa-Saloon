import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { crmCreate, crmUpdate } from '../../config/crmApi';
import './StaffMemberDrawer.css';

const ROLE_OPTIONS = ['Stylist', 'Therapist', 'Receptionist', 'Manager', 'Aesthetician', 'Consultant', 'Spa Coordinator', 'Other'];
const EMPLOYMENT_OPTIONS = ['Full-time', 'Part-time', 'Contract'];
const SHIFT_OPTIONS = ['Morning', 'Evening', 'Custom'];
const FALLBACK_SERVICE_OPTIONS = ['Deep Tissue', 'Hot Stone', 'Aromatherapy', 'Facials', 'Peels', 'Consultation', 'Hydra Glow'];

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

const normalizeBranchOptions = (options = [], fallbackBranch = null) => {
  const normalized = options
    .map((option) => {
      if (typeof option === 'string') {
        const label = normalizeText(option);
        return label ? { id: label, label, value: label, branchName: label } : null;
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

  if (normalized.length) {
    return Array.from(new Map(normalized.map((branch) => [branch.id || branch.label, branch])).values());
  }

  if (fallbackBranch) {
    const label = buildBranchLabel(fallbackBranch);
    const id = normalizeText(fallbackBranch.id || fallbackBranch.branchId || fallbackBranch.value || label);
    return [{ id, label, value: id, branchName: normalizeText(fallbackBranch.name || fallbackBranch.branchName || label) }];
  }

  return [];
};

const normalizeServiceOptions = (options = []) => {
  const normalized = options
    .map((option) => {
      if (typeof option === 'string') {
        const label = normalizeText(option);
        return label ? { id: label, label, value: label } : null;
      }

      if (!option || typeof option !== 'object') return null;

      const id = normalizeText(option.id || option.serviceId || option.value || option.name || option.label || option.title);
      const label = normalizeText(option.label || option.name || option.serviceName || option.title || id);

      if (!id && !label) return null;

      return {
        id: id || label,
        label: label || id,
        value: id || label,
      };
    })
    .filter(Boolean);

  const merged = normalized.length ? normalized : FALLBACK_SERVICE_OPTIONS.map((label) => ({ id: label, label, value: label }));
  return Array.from(new Map(merged.map((service) => [service.id || service.label, service])).values());
};

const resolveBranchSelection = (branchOptions, staff = {}, defaultBranchId = '', defaultBranchName = '') => {
  const targetId = normalizeText(staff.branchId || staff.branch_id || defaultBranchId);
  const targetName = normalizeText(staff.branchName || staff.branch_name || defaultBranchName);

  const matched = branchOptions.find((branch) => {
    const candidateId = normalizeText(branch.id || branch.value);
    const candidateName = normalizeText(branch.branchName || branch.label);
    return (
      (targetId && candidateId && candidateId === targetId) ||
      (targetName && candidateName && candidateName.toLowerCase() === targetName.toLowerCase())
    );
  });

  if (matched) {
    return {
      branchId: normalizeText(matched.id || matched.value),
      branchName: normalizeText(matched.branchName || matched.label),
    };
  }

  if (!targetId && !targetName && branchOptions.length === 1) {
    const [branch] = branchOptions;
    return {
      branchId: normalizeText(branch.id || branch.value),
      branchName: normalizeText(branch.branchName || branch.label),
    };
  }

  return {
    branchId: targetId,
    branchName: targetName,
  };
};

const resolveServiceSelection = (services = [], serviceOptions = []) =>
  Array.from(
    new Set(
      (Array.isArray(services) ? services : [])
        .map((entry) => normalizeText(entry))
        .filter(Boolean)
        .map((entry) => {
          const matched = serviceOptions.find((service) => {
            const candidateId = normalizeText(service.id || service.value);
            const candidateLabel = normalizeText(service.label);
            return (
              (candidateId && candidateId.toLowerCase() === entry.toLowerCase()) ||
              (candidateLabel && candidateLabel.toLowerCase() === entry.toLowerCase())
            );
          });

          return matched ? normalizeText(matched.id || matched.value) : entry;
        }),
    ),
  );

const buildInitialDraft = ({ staff = null, branchOptions = [], serviceOptions = [], defaultBranchId = '', defaultBranchName = '' } = {}) => {
  const branchSelection = resolveBranchSelection(branchOptions, staff || {}, defaultBranchId, defaultBranchName);

  return {
    fullName: normalizeText(staff?.fullName || staff?.name),
    phone: normalizeText(staff?.phone),
    email: normalizeText(staff?.email),
    role: normalizeText(staff?.role),
    branchId: branchSelection.branchId,
    branchName: branchSelection.branchName,
    employmentType: normalizeText(staff?.employmentType || staff?.employment_type || 'Full-time', 'Full-time'),
    shiftLabel: normalizeText(staff?.shiftLabel || staff?.shift_label || 'Morning', 'Morning'),
    workingHours: normalizeText(staff?.workingHours || staff?.working_hours || '9:00 AM - 5:00 PM', '9:00 AM - 5:00 PM'),
    onDuty: staff?.onDuty ?? staff?.on_duty ?? true,
    services: resolveServiceSelection(staff?.services || staff?.assignedServices || [], serviceOptions),
    bio: normalizeText(staff?.bio || staff?.notes || ''),
    profileImage: normalizeText(staff?.profileImage || staff?.avatar || staff?.photo || ''),
  };
};

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

  if (!normalizeText(draft.role)) {
    nextErrors.role = 'Role is required.';
  }

  if (branchRequired && !normalizeText(draft.branchId) && !normalizeText(draft.branchName)) {
    nextErrors.branchId = 'Choose a branch for this staff member.';
  }

  if (draft.email && !emailPattern.test(normalizeText(draft.email))) {
    nextErrors.email = 'Enter a valid email address.';
  }

  if (draft.shiftLabel === 'Custom' && !normalizeText(draft.workingHours)) {
    nextErrors.workingHours = 'Enter custom working hours for this shift.';
  }

  return nextErrors;
};

const mapBackendFieldErrors = (fieldErrors = {}) => ({
  fullName: fieldErrors.full_name || fieldErrors.fullName || fieldErrors.name || '',
  phone: fieldErrors.phone || fieldErrors.contactPhone || '',
  email: fieldErrors.email || '',
  role: fieldErrors.role || '',
  branchId: fieldErrors.branch_id || fieldErrors.branchId || '',
  employmentType: fieldErrors.employment_type || fieldErrors.employmentType || '',
  shiftLabel: fieldErrors.shift_label || fieldErrors.shiftLabel || '',
  workingHours: fieldErrors.working_hours || fieldErrors.workingHours || '',
  bio: fieldErrors.bio || fieldErrors.notes || '',
});

const formatSaveError = (error) => {
  const code = error?.code || error?.payload?.code || '';
  if (code === 'CRM_NETWORK_UNAVAILABLE') {
    return 'The CRM service could not be reached. Check the backend connection and try again.';
  }
  if (code === 'CRM_SERVICE_UNAVAILABLE' || (error?.status >= 500 && error?.status < 600)) {
    return 'The CRM service is temporarily unavailable. Please try again once the backend is ready.';
  }
  return error?.message || 'Staff save failed.';
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });

const StaffMemberDrawer = ({
  open,
  mode = 'create',
  staff = null,
  branches = [],
  services = [],
  existingStaff = [],
  defaultBranchId = '',
  defaultBranchName = '',
  onClose,
  onSaved,
}) => {
  const [isRendered, setIsRendered] = useState(open);
  const [draft, setDraft] = useState(() => buildInitialDraft({ staff, branchOptions: [], serviceOptions: [], defaultBranchId, defaultBranchName }));
  const [errors, setErrors] = useState({});
  const [submissionError, setSubmissionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const closeTimerRef = useRef(null);
  const drawerRef = useRef(null);
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const wasOpenRef = useRef(false);

  const branchOptions = useMemo(() => normalizeBranchOptions(branches, defaultBranchId || defaultBranchName ? { id: defaultBranchId || defaultBranchName, name: defaultBranchName || defaultBranchId } : null), [branches, defaultBranchId, defaultBranchName]);
  const serviceOptions = useMemo(() => normalizeServiceOptions(services), [services]);
  const editingStaffId = normalizeText(staff?.id);
  const branchRequired = branchOptions.length > 1;

  const duplicateMatch = useMemo(() => {
    const targetPhone = phoneDigits(draft.phone);
    const targetEmail = normalizeText(draft.email).toLowerCase();

    if (!targetPhone && !targetEmail) return null;

    return (
      existingStaff.find((member) => {
        const memberId = normalizeText(member?.id);
        if (memberId && editingStaffId && memberId === editingStaffId) return false;

        const memberPhone = phoneDigits(member?.phone);
        const memberEmail = normalizeText(member?.email).toLowerCase();
        return (targetPhone && memberPhone === targetPhone) || (targetEmail && memberEmail === targetEmail);
      }) || null
    );
  }, [draft.email, draft.phone, editingStaffId, existingStaff]);

  const duplicateWarning = duplicateMatch
    ? `Potential duplicate detected: ${normalizeText(duplicateMatch.name || duplicateMatch.fullName || 'existing staff member')} - ${normalizeText(duplicateMatch.phone || duplicateMatch.email || '')}`
    : '';

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setIsRendered(true);
      setDraft(buildInitialDraft({ staff, branchOptions, serviceOptions, defaultBranchId, defaultBranchName }));
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
  }, [branchOptions, defaultBranchId, defaultBranchName, open, serviceOptions, staff]);

  useEffect(() => {
    if (!open) return;

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

  useEffect(() => {
    if (!open) return;

    if (!draft.branchId && !draft.branchName && branchOptions.length === 1) {
      const [branch] = branchOptions;
      setDraft((current) => ({
        ...current,
        branchId: normalizeText(branch.id || branch.value),
        branchName: normalizeText(branch.branchName || branch.label),
      }));
    }
  }, [branchOptions, draft.branchId, draft.branchName, open]);

  if (!isRendered) return null;

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleToggleService = (serviceId) => {
    setDraft((current) => {
      const active = current.services.includes(serviceId);
      return {
        ...current,
        services: active ? current.services.filter((value) => value !== serviceId) : [...current.services, serviceId],
      };
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setDraft((current) => ({ ...current, profileImage: dataUrl }));
    } catch (error) {
      setSubmissionError(error?.message || 'Unable to load the selected image.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

    const selectedBranch = branchOptions.find((branch) => normalizeText(branch.id || branch.value) === normalizeText(draft.branchId))
      || branchOptions.find((branch) => normalizeText(branch.branchName || branch.label).toLowerCase() === normalizeText(draft.branchName).toLowerCase())
      || null;

    const payload = {
      id: editingStaffId || undefined,
      full_name: normalizeText(draft.fullName),
      fullName: normalizeText(draft.fullName),
      name: normalizeText(draft.fullName),
      phone: normalizePhone(draft.phone),
      email: normalizeText(draft.email).toLowerCase(),
      role: normalizeText(draft.role),
      branch_id: normalizeText(draft.branchId),
      branchId: normalizeText(draft.branchId),
      branch_name: normalizeText(selectedBranch?.branchName || selectedBranch?.label || draft.branchName),
      branchName: normalizeText(selectedBranch?.branchName || selectedBranch?.label || draft.branchName),
      employment_type: normalizeText(draft.employmentType, 'Full-time'),
      employmentType: normalizeText(draft.employmentType, 'Full-time'),
      shift_label: normalizeText(draft.shiftLabel, ''),
      shiftLabel: normalizeText(draft.shiftLabel, ''),
      working_hours: normalizeText(draft.workingHours, ''),
      workingHours: normalizeText(draft.workingHours, ''),
      on_duty: Boolean(draft.onDuty),
      onDuty: Boolean(draft.onDuty),
      services: draft.services,
      assignedServices: draft.services,
      bio: normalizeText(draft.bio),
      notes: normalizeText(draft.bio),
      profileImage: normalizeText(draft.profileImage),
    };

    try {
      const saved = mode === 'edit'
        ? await crmUpdate('staff', editingStaffId, payload)
        : await crmCreate('staff', payload);

      await onSaved?.(saved, {
        mode,
        duplicateWarning: normalizeText(saved?.duplicateWarning || duplicateWarning),
        duplicateMatch: saved?.duplicateMatch || duplicateMatch,
      });
      onClose?.();
    } catch (error) {
      const fieldErrors = mapBackendFieldErrors(error?.payload?.fieldErrors || error?.payload?.errors || {});
      if (Object.keys(fieldErrors).some((key) => fieldErrors[key])) {
        setErrors((current) => ({ ...current, ...fieldErrors }));
      }
      setSubmissionError(formatSaveError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const profilePreview = draft.profileImage
    ? <img src={draft.profileImage} alt="" />
    : <span>{normalizeText(draft.fullName || 'Staff').slice(0, 2).toUpperCase()}</span>;

  return (
    <div
      className={`crm-staff-drawer-backdrop${open ? ' crm-staff-drawer-backdrop-open' : ' crm-staff-drawer-backdrop-closing'}`}
      onClick={isSubmitting ? undefined : onClose}
    >
      <aside
        ref={drawerRef}
        className={`crm-staff-drawer-panel${open ? ' crm-staff-drawer-panel-open' : ' crm-staff-drawer-panel-closing'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-staff-drawer-title"
        aria-describedby="crm-staff-drawer-subtitle"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="crm-staff-drawer-head">
          <div>
            <p className="crm-staff-drawer-kicker">Staff workspace</p>
            <h2 id="crm-staff-drawer-title">{mode === 'edit' ? 'Edit Staff Member' : 'New Staff Member'}</h2>
            <p id="crm-staff-drawer-subtitle">
              {mode === 'edit' ? 'Refine a team member profile in your salon CRM.' : 'Add a team member to your salon.'}
            </p>
          </div>
          <button
            type="button"
            className="crm-staff-drawer-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </header>

        <form className="crm-staff-drawer-form" noValidate onSubmit={handleSubmit}>
          <div className="crm-staff-drawer-body">
            {submissionError ? <p className="crm-staff-drawer-error">{submissionError}</p> : null}
            {duplicateWarning ? <p className="crm-staff-drawer-warning">{duplicateWarning}</p> : null}

            <section className="crm-staff-drawer-section">
              <div className="crm-staff-drawer-section-head">
                <div>
                  <p className="crm-staff-drawer-section-kicker">Basic info</p>
                  <h3>Identity and contact</h3>
                </div>
                <p>Keep the core team record accurate so the CRM can route bookings and communication cleanly.</p>
              </div>

              <label className={`crm-staff-drawer-field${errors.fullName ? ' crm-staff-drawer-field-error' : ''}`}>
                <span>Full Name</span>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={draft.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  onBlur={() => setSubmitAttempted(true)}
                  placeholder="Amina Khan"
                  disabled={isSubmitting}
                  required
                />
                {errors.fullName ? <small>{errors.fullName}</small> : null}
              </label>

              <div className="crm-staff-drawer-grid">
                <label className={`crm-staff-drawer-field${errors.phone ? ' crm-staff-drawer-field-error' : ''}`}>
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    onBlur={() => setSubmitAttempted(true)}
                    placeholder="(323) 555-2200"
                    inputMode="tel"
                    disabled={isSubmitting}
                    required
                  />
                  {errors.phone ? <small>{errors.phone}</small> : null}
                </label>

                <label className={`crm-staff-drawer-field${errors.email ? ' crm-staff-drawer-field-error' : ''}`}>
                  <span>Email</span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    onBlur={() => setSubmitAttempted(true)}
                    placeholder="amina.khan@example.com"
                    disabled={isSubmitting}
                  />
                  {errors.email ? <small>{errors.email}</small> : null}
                </label>

                <label className={`crm-staff-drawer-field${errors.role ? ' crm-staff-drawer-field-error' : ''}`}>
                  <span>Role</span>
                  <select
                    value={draft.role}
                    onChange={(event) => updateField('role', event.target.value)}
                    onBlur={() => setSubmitAttempted(true)}
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">Select a role</option>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.role ? <small>{errors.role}</small> : null}
                </label>

                <label className="crm-staff-drawer-field">
                  <span>Profile Image</span>
                  <div className="crm-staff-drawer-upload">
                    <div className="crm-staff-drawer-upload-preview">{profilePreview}</div>
                    <div className="crm-staff-drawer-upload-copy">
                      <strong>{draft.profileImage ? 'Image ready' : 'Optional staff photo'}</strong>
                      <span>Upload a clean portrait to personalize the team profile.</span>
                      <button
                        type="button"
                        className="crm-staff-drawer-upload-button"
                        onClick={() => fileInputRef.current?.click?.()}
                        disabled={isSubmitting}
                      >
                        {draft.profileImage ? 'Replace image' : 'Upload image'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="crm-staff-drawer-file-input"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </label>
              </div>
            </section>

            <section className="crm-staff-drawer-section">
              <div className="crm-staff-drawer-section-head">
                <div>
                  <p className="crm-staff-drawer-section-kicker">Work details</p>
                  <h3>Branch, employment, and shift</h3>
                </div>
                <p>Assign the member to the right branch and make their working pattern visible to the team.</p>
              </div>

              <div className="crm-staff-drawer-grid">
                <label className={`crm-staff-drawer-field${errors.branchId ? ' crm-staff-drawer-field-error' : ''}`}>
                  <span>Branch</span>
                  <select
                    value={draft.branchId || ''}
                    onChange={(event) => {
                      const nextBranchId = event.target.value;
                      const nextBranch = branchOptions.find((branch) => normalizeText(branch.id || branch.value) === normalizeText(nextBranchId)) || null;
                      updateField('branchId', nextBranchId);
                      updateField('branchName', nextBranch ? normalizeText(nextBranch.branchName || nextBranch.label) : '');
                    }}
                    onBlur={() => setSubmitAttempted(true)}
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

                <label className="crm-staff-drawer-field">
                  <span>Employment Type</span>
                  <select
                    value={draft.employmentType}
                    onChange={(event) => updateField('employmentType', event.target.value)}
                    onBlur={() => setSubmitAttempted(true)}
                    disabled={isSubmitting}
                  >
                    {EMPLOYMENT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="crm-staff-drawer-field">
                  <span>Shift</span>
                  <select
                    value={draft.shiftLabel}
                    onChange={(event) => updateField('shiftLabel', event.target.value)}
                    onBlur={() => setSubmitAttempted(true)}
                    disabled={isSubmitting}
                  >
                    {SHIFT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={`crm-staff-drawer-field${errors.workingHours ? ' crm-staff-drawer-field-error' : ''}`}>
                  <span>Working Hours</span>
                  <input
                    type="text"
                    value={draft.workingHours}
                    onChange={(event) => updateField('workingHours', event.target.value)}
                    onBlur={() => setSubmitAttempted(true)}
                    placeholder="9:00 AM - 5:00 PM"
                    disabled={isSubmitting}
                  />
                  {errors.workingHours ? <small>{errors.workingHours}</small> : null}
                </label>

                <button
                  type="button"
                  className={`crm-staff-drawer-toggle${draft.onDuty ? ' crm-staff-drawer-toggle-active' : ''}`}
                  onClick={() => updateField('onDuty', !draft.onDuty)}
                  disabled={isSubmitting}
                  aria-pressed={draft.onDuty}
                >
                  <span>
                    <strong>On Duty</strong>
                    <span>Marks the staff member available for live booking coverage.</span>
                  </span>
                  <span className="crm-staff-drawer-toggle-indicator" aria-hidden="true" />
                </button>
              </div>
            </section>

            <section className="crm-staff-drawer-section">
              <div className="crm-staff-drawer-section-head">
                <div>
                  <p className="crm-staff-drawer-section-kicker">Services assignment</p>
                  <h3>Multi-select services</h3>
                </div>
                <p>Assign every service the staff member can confidently perform.</p>
              </div>

              <div className="crm-staff-drawer-stack">
                <div className="crm-staff-drawer-stack-head">
                  <div>
                    <span>Services</span>
                    <p>Pick from the current catalog or the fallback menu if the catalog is not loaded yet.</p>
                  </div>
                  <span>{draft.services.length} selected</span>
                </div>
                <div className="crm-staff-drawer-chip-grid">
                  {serviceOptions.map((service) => {
                    const active = draft.services.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        className={`crm-staff-drawer-chip${active ? ' crm-staff-drawer-chip-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => handleToggleService(service.id)}
                        disabled={isSubmitting}
                      >
                        {service.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="crm-staff-drawer-section">
              <div className="crm-staff-drawer-section-head">
                <div>
                  <p className="crm-staff-drawer-section-kicker">Profile info</p>
                  <h3>Bio and internal context</h3>
                </div>
                <p>Capture the notes the front desk and managers need to keep the staff record useful.</p>
              </div>

              <label className="crm-staff-drawer-field crm-staff-drawer-field-textarea">
                <span>Bio / Notes</span>
                <textarea
                  rows="4"
                  value={draft.bio}
                  onChange={(event) => updateField('bio', event.target.value)}
                  onBlur={() => setSubmitAttempted(true)}
                  placeholder="Add bio details, handling preferences, or manager notes."
                  disabled={isSubmitting}
                />
              </label>
            </section>
          </div>

          <footer className="crm-staff-drawer-footer">
            <button type="button" className="crm-staff-secondary-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="crm-staff-primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Staff'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
};

export default StaffMemberDrawer;
