const StaffCoverageIndicator = ({ coverage, staffCount, staff = [], compact = false }) => {
  const previewStaff = staff.slice(0, compact ? 2 : 4);
  const remaining = Math.max(staff.length - previewStaff.length, 0);

  return (
    <div className={`crm-service-staff-coverage${compact ? ' crm-service-staff-coverage-compact' : ''}`}>
      <span className={`crm-service-coverage-pill crm-service-coverage-${coverage.tone}`}>{coverage.label}</span>
      <span className="crm-service-coverage-count">{staffCount} staff</span>
      <div className="crm-service-staff-preview" aria-hidden="true">
        {previewStaff.map((name) => (
          <span key={name} className="crm-service-staff-avatar" title={name}>
            {name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
        ))}
        {remaining > 0 ? <span className="crm-service-staff-more">+{remaining}</span> : null}
      </div>
    </div>
  );
};

export default StaffCoverageIndicator;
