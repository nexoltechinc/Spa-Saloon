const shiftTone = {
  Available: 'good',
  Busy: 'busy',
  'On Break': 'break',
  'Off Duty': 'off',
  'On Leave': 'leave',
};

const ShiftStatusBadge = ({ status }) => {
  const tone = shiftTone[status] || 'neutral';
  return <span className={`crm-staff-shift-badge crm-staff-shift-${tone}`}>{status}</span>;
};

export default ShiftStatusBadge;
