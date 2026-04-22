import ServiceHealthBadge from './ServiceHealthBadge';
import StaffCoverageIndicator from './StaffCoverageIndicator';

const ServiceRow = ({ service, isSelected, onSelect, onOpenQuick, formatCurrency }) => {
  const visibleSignals = service.healthSignals.slice(0, 2);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(service.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`crm-service-row${isSelected ? ' crm-service-row-active' : ''}`}
      onClick={() => onSelect(service.id)}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${service.name}`}
    >
      <div>
        <p className="crm-service-name">{service.name}</p>
        <p className="crm-service-sub" title={service.description || 'No description'}>
          {service.description || 'Description missing'}
        </p>
      </div>

      <div>
        <span className="crm-service-category-pill">{service.category || 'Uncategorized'}</span>
      </div>

      <p className="crm-service-cell">{service.duration} min</p>
      <p className="crm-service-cell">{formatCurrency(service.price)}</p>

      <div className="crm-service-row-staff">
        <StaffCoverageIndicator
          coverage={service.staffCoverage}
          staffCount={service.assignedStaff.length}
          staff={service.assignedStaff}
          compact
        />
      </div>

      <div className="crm-service-row-health">
        {visibleSignals.length > 0
          ? visibleSignals.map((signal) => <ServiceHealthBadge key={signal.key} label={signal.label} tone={signal.tone} />)
          : <ServiceHealthBadge label="Healthy" tone="good" />}
      </div>

      <div>
        <span className={`crm-service-state-pill ${service.bookingVisible ? 'crm-service-state-positive' : 'crm-service-state-warning'}`}>
          {service.bookingVisible ? 'Bookable' : 'Not Bookable'}
        </span>
      </div>

      <div>
        <span className={`crm-service-state-pill ${service.active ? 'crm-service-state-positive' : 'crm-service-state-muted'}`}>
          {service.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="crm-service-row-actions">
        <button
          type="button"
          className="crm-service-open-btn"
          onClick={(event) => {
            event.stopPropagation();
            onOpenQuick(service.id);
          }}
        >
          Open
        </button>
      </div>
    </div>
  );
};

export default ServiceRow;
