const CoverageWarningBadge = ({ label, tone = 'warning' }) => {
  return <span className={`crm-staff-coverage-badge crm-staff-coverage-${tone}`}>{label}</span>;
};

export default CoverageWarningBadge;
