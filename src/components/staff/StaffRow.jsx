import CoverageWarningBadge from './CoverageWarningBadge';
import EmploymentStatusBadge from './EmploymentStatusBadge';
import LoadCapacityChip from './LoadCapacityChip';
import ShiftStatusBadge from './ShiftStatusBadge';

const StaffRow = ({ staff, isSelected, onSelect, onOpen }) => {
  const servicePreview = staff.services.slice(0, 3);
  const extraServices = Math.max(staff.services.length - servicePreview.length, 0);
  const rowWarnings = staff.rowWarnings.slice(0, 2);

  const nextAppointmentLabel = staff.nextAppointment
    ? `${staff.nextAppointment.time} • ${staff.nextAppointment.service}`
    : 'No upcoming appointment';

  return (
    <div
      role="button"
      tabIndex={0}
      className={`crm-staff-row${isSelected ? ' crm-staff-row-active' : ''}`}
      onClick={() => onSelect(staff.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(staff.id);
        }
      }}
      aria-label={`Open profile for ${staff.name}`}
    >
      <div>
        <p className="crm-staff-name">{staff.name}</p>
        <p className="crm-staff-subline">{staff.role}</p>
        <div className="crm-staff-row-warning-list">
          {rowWarnings.map((warning) => (
            <CoverageWarningBadge key={`${staff.id}-${warning.label}`} label={warning.label} tone={warning.tone} />
          ))}
        </div>
      </div>

      <div className="crm-staff-service-tags">
        {servicePreview.map((service) => <span key={service}>{service}</span>)}
        {extraServices > 0 ? <span>+{extraServices}</span> : null}
      </div>

      <p className="crm-staff-cell">{staff.workingHours}</p>
      <p className="crm-staff-cell">{nextAppointmentLabel}</p>

      <LoadCapacityChip load={staff.load} compact />
      <ShiftStatusBadge status={staff.shiftStatus} />
      <EmploymentStatusBadge status={staff.employmentStatus} />

      <div className="crm-staff-row-actions">
        <button
          type="button"
          className="crm-staff-open-btn"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(staff.id);
          }}
        >
          Open
        </button>
      </div>
    </div>
  );
};

export default StaffRow;
