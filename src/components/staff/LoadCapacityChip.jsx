const LoadCapacityChip = ({ load, compact = false }) => {
  return (
    <div className={`crm-staff-load-chip crm-staff-load-${load.tone}${compact ? ' crm-staff-load-compact' : ''}`}>
      <strong>{load.label}</strong>
      <span>{load.detail}</span>
    </div>
  );
};

export default LoadCapacityChip;
