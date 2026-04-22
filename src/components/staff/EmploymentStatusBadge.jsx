const EmploymentStatusBadge = ({ status }) => {
  const isActive = status === 'Active';
  return (
    <span className={`crm-staff-employment-badge ${isActive ? 'crm-staff-employment-active' : 'crm-staff-employment-inactive'}`}>
      {status}
    </span>
  );
};

export default EmploymentStatusBadge;
