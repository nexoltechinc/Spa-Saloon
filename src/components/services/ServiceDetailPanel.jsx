import ReviewReasonBadge from './ReviewReasonBadge';
import ServiceHealthBadge from './ServiceHealthBadge';
import ServicePerformanceSummary from './ServicePerformanceSummary';
import StaffCoverageIndicator from './StaffCoverageIndicator';

const detailTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'staff', label: 'Staff' },
  { key: 'performance', label: 'Performance' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'notes', label: 'Notes' },
];

const ServiceDetailPanel = ({
  service,
  detailTab,
  onTabChange,
  onPatchService,
  onEditService,
  onAssignStaff,
  onUpdatePrice,
  onDuplicateService,
  formatCurrency,
  formatDate,
  formatRelativeDate,
  canManageServices,
  canManagePricing,
  canManageAssignments,
}) => {
  if (!service) {
    return (
      <div className="crm-services-empty">
        <h3>Select a service</h3>
        <p>Pick a row to review operations, pricing, and service intelligence.</p>
      </div>
    );
  }

  const renderOverview = () => {
    return (
      <div className="crm-service-panel-section">
        <div className="crm-services-meta-grid">
          <div>
            <p>Duration</p>
            <strong>{service.duration} min</strong>
          </div>
          <div>
            <p>Current Price</p>
            <strong>{formatCurrency(service.price)}</strong>
          </div>
          <div>
            <p>Bookable</p>
            <strong>{service.bookingVisible ? 'Enabled' : 'Disabled'}</strong>
          </div>
          <div>
            <p>POS Visibility</p>
            <strong>{service.posAvailable ? 'Visible' : 'Hidden'}</strong>
          </div>
          <div>
            <p>Status</p>
            <strong>{service.active ? 'Active' : 'Inactive'}</strong>
          </div>
          <div>
            <p>Staff Coverage</p>
            <strong>{service.staffCoverage.label}</strong>
          </div>
        </div>

        <div className="crm-service-toggle-stack">
          <div className="crm-service-toggle-row">
            <p>Bookable in online booking</p>
            <label className="crm-toggle-wrap">
              <input
                type="checkbox"
                checked={service.bookingVisible}
                disabled={!canManageServices}
                onChange={(event) => onPatchService(service.id, { bookingVisible: event.target.checked })}
              />
              <span />
            </label>
          </div>
          <div className="crm-service-toggle-row">
            <p>Visible in POS checkout</p>
            <label className="crm-toggle-wrap">
              <input
                type="checkbox"
                checked={service.posAvailable}
                disabled={!canManageServices}
                onChange={(event) => onPatchService(service.id, { posAvailable: event.target.checked })}
              />
              <span />
            </label>
          </div>
          <div className="crm-service-toggle-row">
            <p>Service active in catalog</p>
            <label className="crm-toggle-wrap">
              <input
                type="checkbox"
                checked={service.active}
                disabled={!canManageServices}
                onChange={(event) => onPatchService(service.id, { active: event.target.checked })}
              />
              <span />
            </label>
          </div>
        </div>

        <div className={`crm-service-dependency-card crm-service-dependency-${service.operationalState.tone}`}>
          <p>Operational Readiness</p>
          <strong>{service.operationalState.label}</strong>
          <span>{service.operationalState.detail}</span>
        </div>

        {service.reviewNeeded ? (
          <div className="crm-service-review-list">
            <p>Needs Review</p>
            <div>
              {service.reviewReasons.map((reason) => (
                <ReviewReasonBadge key={reason} reason={reason} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderStaff = () => {
    return (
      <div className="crm-service-panel-section">
        <StaffCoverageIndicator
          coverage={service.staffCoverage}
          staffCount={service.assignedStaff.length}
          staff={service.assignedStaff}
        />

        {service.assignedStaff.length > 0 ? (
          <div className="crm-service-staff-list">
            <p>Assigned Team</p>
            <div className="crm-staff-chip-row">
              {service.assignedStaff.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="crm-services-warning">No staff assigned. Assign at least one therapist before enabling bookings.</p>
        )}

        <p className="crm-services-note">
          Compatibility mapping is ready for role-based therapist eligibility. Future rules can be applied by role, certification, and branch.
        </p>
      </div>
    );
  };

  const renderPricing = () => {
    return (
      <div className="crm-service-panel-section">
        <div className="crm-services-meta-grid">
          <div>
            <p>Current Price</p>
            <strong>{formatCurrency(service.price)}</strong>
          </div>
          <div>
            <p>Previous Price</p>
            <strong>{service.previousPrice ? formatCurrency(service.previousPrice) : 'No previous price'}</strong>
          </div>
          <div>
            <p>Price Last Updated</p>
            <strong>{formatDate(service.priceLastUpdated)}</strong>
          </div>
          <div>
            <p>Updated By</p>
            <strong>{service.priceUpdatedBy || service.updatedBy || 'System Sync'}</strong>
          </div>
        </div>

        <div className="crm-service-performance-signals">
          {service.priceReviewNeeded ? <ServiceHealthBadge label="Pricing Review Needed" tone="warning" /> : <ServiceHealthBadge label="Pricing Fresh" tone="good" />}
          {service.isPremiumService ? <ServiceHealthBadge label="Premium Service" tone="premium" /> : null}
        </div>
      </div>
    );
  };

  const renderNotes = () => {
    return (
      <div className="crm-service-panel-section">
        <div className="crm-service-note-block">
          <p>Internal Notes</p>
          <span>{service.note || 'No notes added yet.'}</span>
        </div>

        <div className="crm-service-future-block">
          <p>Package and Promotion Readiness</p>
          <ul>
            <li>{service.packageReadiness.includedInPackage ? 'Included in package offerings' : 'Not included in package offerings yet'}</li>
            <li>{service.packageReadiness.promotionEligible ? 'Promotion eligible' : 'Promotion eligibility pending'}</li>
            <li>{service.packageReadiness.membershipService ? 'Available for membership plans' : 'Membership linkage pending'}</li>
            <li>{service.packageReadiness.featuredWebsite ? 'Featured on website service list' : 'Website feature slot available'}</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="crm-services-detail-head">
        <div>
          <p className="crm-services-kicker">{service.category || 'Uncategorized'}</p>
          <h3>{service.name}</h3>
        </div>
        <p className="crm-services-id">{service.id}</p>
      </div>

      <p className="crm-services-description">{service.description || 'Description missing. Add treatment details to improve booking confidence.'}</p>

      <div className="crm-service-health-row">
        <ServiceHealthBadge
          label={service.operationalState.label}
          tone={['good', 'warning', 'risk', 'neutral', 'premium'].includes(service.operationalState.tone) ? service.operationalState.tone : 'warning'}
        />
        {service.reviewNeeded ? <ServiceHealthBadge label="Needs Review" tone="warning" /> : <ServiceHealthBadge label="Healthy" tone="good" />}
        {service.isTopPerformer ? <ServiceHealthBadge label={`Top ${service.popularityRank}`} tone="good" /> : null}
      </div>

      <div className="crm-service-detail-tabs" role="tablist" aria-label="Selected service details">
        {detailTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={detailTab === tab.key}
            className={`crm-service-tab-btn${detailTab === tab.key ? ' crm-service-tab-btn-active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {detailTab === 'overview' ? renderOverview() : null}
      {detailTab === 'staff' ? renderStaff() : null}
      {detailTab === 'performance' ? (
        <ServicePerformanceSummary
          service={service}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatRelativeDate={formatRelativeDate}
        />
      ) : null}
      {detailTab === 'pricing' ? renderPricing() : null}
      {detailTab === 'notes' ? renderNotes() : null}

      <p className="crm-services-updated">Last updated: {formatDate(service.lastUpdated)} by {service.updatedBy || 'System Sync'}</p>

      <div className="crm-services-actions">
        {canManageServices ? (
          <button type="button" className="crm-services-primary-btn" onClick={onEditService}>
            Edit Service
          </button>
        ) : null}

        {canManageAssignments ? (
          <button type="button" className="crm-services-secondary-btn" onClick={onAssignStaff}>
            Assign Staff
          </button>
        ) : null}

        {canManagePricing ? (
          <button type="button" className="crm-services-secondary-btn" onClick={onUpdatePrice}>
            Update Price
          </button>
        ) : null}

        <button type="button" className="crm-services-ghost-btn" onClick={onDuplicateService}>
          Duplicate Service
        </button>
      </div>
    </>
  );
};

export default ServiceDetailPanel;
