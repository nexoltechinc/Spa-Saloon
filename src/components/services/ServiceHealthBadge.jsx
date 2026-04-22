const toneClass = {
  good: 'crm-service-health-good',
  warning: 'crm-service-health-warning',
  risk: 'crm-service-health-risk',
  neutral: 'crm-service-health-neutral',
  premium: 'crm-service-health-premium',
};

const ServiceHealthBadge = ({ label, tone = 'neutral' }) => {
  const cssTone = toneClass[tone] || toneClass.neutral;

  return <span className={`crm-service-health-badge ${cssTone}`}>{label}</span>;
};

export default ServiceHealthBadge;
