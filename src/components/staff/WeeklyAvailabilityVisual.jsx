const MIN_DAY_MINUTES = 8 * 60;
const MAX_DAY_MINUTES = 22 * 60;

const parseTime = (value) => {
  if (!value) return null;

  const [hourPart, minutePart = '0'] = String(value).split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
};

const WeeklyAvailabilityVisual = ({ weeklyAvailability = [] }) => {
  return (
    <div className="crm-staff-weekly-visual">
      <p>Weekly Roster</p>
      <ul>
        {weeklyAvailability.map((day) => {
          if (day.off) {
            return (
              <li key={day.day} className="crm-staff-weekly-row">
                <strong>{day.day}</strong>
                <div className="crm-staff-weekly-off">Off</div>
                <span>{day.note || 'No shift'}</span>
              </li>
            );
          }

          const start = parseTime(day.start) ?? MIN_DAY_MINUTES;
          const end = parseTime(day.end) ?? MAX_DAY_MINUTES;
          const left = ((start - MIN_DAY_MINUTES) / (MAX_DAY_MINUTES - MIN_DAY_MINUTES)) * 100;
          const width = ((end - start) / (MAX_DAY_MINUTES - MIN_DAY_MINUTES)) * 100;

          return (
            <li key={day.day} className="crm-staff-weekly-row">
              <strong>{day.day}</strong>
              <div className="crm-staff-weekly-track">
                <span className="crm-staff-weekly-bar" style={{ left: `${Math.max(0, left)}%`, width: `${Math.max(8, width)}%` }} />
              </div>
              <span>{day.start} - {day.end}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WeeklyAvailabilityVisual;
