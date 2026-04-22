import CoverageWarningBadge from './CoverageWarningBadge';
import ScheduleSnapshot from './ScheduleSnapshot';
import WeeklyAvailabilityVisual from './WeeklyAvailabilityVisual';

const operationTabs = [
  { key: 'today', label: "Today's Schedule" },
  { key: 'roster', label: 'Weekly Roster' },
  { key: 'coverage', label: 'Service Coverage' },
  { key: 'activity', label: 'Notes / Activity' },
];

const StaffOperationsWorkspace = ({
  selectedStaff,
  operationTab,
  onTabChange,
  coverageRows,
  onDutyStaff,
  availableStaff,
  recentActivity,
}) => {
  const renderToday = () => (
    <div className="crm-staff-ops-panel">
      <ScheduleSnapshot
        title={selectedStaff ? `${selectedStaff.name.split(' ')[0]}'s Schedule` : "Today's Schedule"}
        schedule={selectedStaff?.todaySchedule || []}
        emptyText="Select a staff member to review the day plan."
      />
    </div>
  );

  const renderRoster = () => (
    <div className="crm-staff-ops-panel">
      {selectedStaff ? <WeeklyAvailabilityVisual weeklyAvailability={selectedStaff.weeklyAvailability} /> : null}
      <div className="crm-staff-ops-meta">
        <article>
          <p>On Duty Now</p>
          <strong>{onDutyStaff.length}</strong>
          <span>{onDutyStaff.join(', ') || 'No on-duty staff'}</span>
        </article>
        <article>
          <p>Available Now</p>
          <strong>{availableStaff.length}</strong>
          <span>{availableStaff.join(', ') || 'No immediately available staff'}</span>
        </article>
      </div>
    </div>
  );

  const renderCoverage = () => (
    <div className="crm-staff-ops-panel">
      <div className="crm-staff-coverage-grid">
        {coverageRows.map((item) => (
          <article key={item.service}>
            <p>{item.service}</p>
            <strong>{item.onDutyCount} on duty • {item.activeCount} active</strong>
            <div>
              <CoverageWarningBadge label={item.label} tone={item.tone} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="crm-staff-ops-panel">
      <ul className="crm-staff-activity-list">
        {recentActivity.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.title}</strong>
            <span>{entry.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <article className="crm-staff-operations-card">
      <header>
        <h3>Staff Operations Workspace</h3>
        <p>Use this area for real-time schedule, roster, and coverage decisions.</p>
      </header>

      <div className="crm-staff-operations-tabs" role="tablist" aria-label="Staff operations tabs">
        {operationTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={operationTab === tab.key}
            className={`crm-staff-op-tab${operationTab === tab.key ? ' crm-staff-op-tab-active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {operationTab === 'today' ? renderToday() : null}
      {operationTab === 'roster' ? renderRoster() : null}
      {operationTab === 'coverage' ? renderCoverage() : null}
      {operationTab === 'activity' ? renderActivity() : null}
    </article>
  );
};

export default StaffOperationsWorkspace;
