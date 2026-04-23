const ScheduleSnapshot = ({ title = 'Today\'s Schedule', schedule = [], emptyText = 'No schedule entries.', compact = false }) => {
  return (
    <div className={`crm-staff-schedule-widget${compact ? ' crm-staff-schedule-widget-compact' : ''}`}>
      <p>{title}</p>
      {schedule.length === 0 ? (
        <div className="crm-staff-schedule-empty">{emptyText}</div>
      ) : (
        <ul>
          {schedule.map((slot) => {
            if (slot.type === 'gap') {
              return (
                <li key={slot.id || `${slot.time}-gap`} className="crm-staff-schedule-gap">
                  <span>{slot.label || 'Open gap'}</span>
                </li>
              );
            }

            return (
              <li key={slot.id || `${slot.time}-${slot.service}`} className={`crm-staff-schedule-slot crm-staff-slot-${slot.state || 'upcoming'}`}>
                <div>
                  <strong>{slot.time}</strong>
                  <span>{slot.customer || 'Walk-in'} - {slot.service}</span>
                </div>
                <em>{slot.status || 'Scheduled'}</em>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ScheduleSnapshot;
