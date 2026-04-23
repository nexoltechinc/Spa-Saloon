import CoverageWarningBadge from './CoverageWarningBadge';

const operationTabs = [
  { key: 'coverage', label: 'Service Coverage' },
  { key: 'activity', label: 'Notes / Activity' },
];

const StaffOperationsWorkspace = ({
  operationTab,
  onTabChange,
  coverageRows,
  recentActivity,
}) => {
  const renderCoverage = () => (
    <div className="crm-staff-ops-panel">
      <div className="crm-staff-coverage-grid">
        {coverageRows.map((item) => (
          <article key={item.service}>
            <p>{item.service}</p>
            <strong>{item.onDutyCount} on duty - {item.activeCount} active</strong>
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
        <p>Use this area for real-time coverage and activity decisions.</p>
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

      {operationTab === 'coverage' ? renderCoverage() : null}
      {operationTab === 'activity' ? renderActivity() : null}
    </article>
  );
};

export default StaffOperationsWorkspace;
