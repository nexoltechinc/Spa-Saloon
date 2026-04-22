import CoverageWarningBadge from './CoverageWarningBadge';
import EmploymentStatusBadge from './EmploymentStatusBadge';
import LoadCapacityChip from './LoadCapacityChip';
import ScheduleSnapshot from './ScheduleSnapshot';
import ShiftStatusBadge from './ShiftStatusBadge';
import WeeklyAvailabilityVisual from './WeeklyAvailabilityVisual';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'services', label: 'Services' },
  { key: 'availability', label: 'Availability' },
  { key: 'notes', label: 'Notes' },
];

const StaffDetailPanel = ({
  staff,
  detailTab,
  onTabChange,
  onUpdateStaff,
  onEditProfile,
  onAssignServices,
  onUpdateAvailability,
  onViewSchedule,
  onViewTodayAppointments,
  onReassignAppointments,
  onViewCoverageImpact,
  canManageStaff,
}) => {
  if (!staff) {
    return (
      <div className="crm-staff-empty">
        <h3>Select a staff member</h3>
        <p>Choose a profile to review shift readiness, schedule, and coverage impact.</p>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="crm-staff-panel-section">
      <div className="crm-staff-status-row">
        <ShiftStatusBadge status={staff.shiftStatus} />
        <EmploymentStatusBadge status={staff.employmentStatus} />
      </div>

      <div className="crm-staff-detail-meta-grid">
        <article>
          <p>Today&apos;s Load</p>
          <strong>{staff.load.detail}</strong>
        </article>
        <article>
          <p>Utilization</p>
          <strong>{staff.load.utilization}%</strong>
        </article>
        <article>
          <p>Next Appointment</p>
          <strong>{staff.nextAppointment ? `${staff.nextAppointment.time} • ${staff.nextAppointment.service}` : 'No upcoming appointment'}</strong>
        </article>
        <article>
          <p>Remaining Today</p>
          <strong>{staff.appointmentsRemaining} appointments</strong>
        </article>
      </div>

      <LoadCapacityChip load={staff.load} />

      <div className="crm-staff-control-grid">
        <label>
          <span>Employment Status</span>
          <select
            value={staff.employmentStatus}
            disabled={!canManageStaff}
            onChange={(event) => onUpdateStaff(staff.id, { employmentStatus: event.target.value })}
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </label>
        <label>
          <span>Shift Status</span>
          <select
            value={staff.shiftStatus}
            disabled={!canManageStaff}
            onChange={(event) => onUpdateStaff(staff.id, { shiftStatus: event.target.value })}
          >
            <option>Available</option>
            <option>Busy</option>
            <option>On Break</option>
            <option>Off Duty</option>
            <option>On Leave</option>
          </select>
        </label>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="crm-staff-panel-section">
      <ScheduleSnapshot
        title="Today\'s Schedule"
        schedule={staff.todaySchedule}
        emptyText="No appointments scheduled for today."
      />
      <p className="crm-staff-panel-note">
        Shift ends at {staff.shiftEnd || 'end of day'}. Keep at least one flexible slot for reassignment when coverage is tight.
      </p>
    </div>
  );

  const renderServices = () => (
    <div className="crm-staff-panel-section">
      <div className="crm-staff-service-tags">
        {staff.services.map((service) => <span key={service}>{service}</span>)}
      </div>

      {staff.onlyProviderServices.length > 0 ? (
        <div className="crm-staff-coverage-list">
          <p>Critical Provider Signals</p>
          {staff.onlyProviderServices.map((service) => (
            <CoverageWarningBadge key={service} label={`Only Provider: ${service}`} tone="risk" />
          ))}
        </div>
      ) : null}

      {staff.coverageWarnings.length > 0 ? (
        <div className="crm-staff-coverage-list">
          <p>Coverage Warnings</p>
          {staff.coverageWarnings.map((item) => (
            <CoverageWarningBadge key={item.label} label={item.label} tone={item.tone} />
          ))}
        </div>
      ) : null}
    </div>
  );

  const renderAvailability = () => (
    <div className="crm-staff-panel-section">
      <WeeklyAvailabilityVisual weeklyAvailability={staff.weeklyAvailability} />
      <div className="crm-staff-detail-meta-grid">
        <article>
          <p>Working Hours</p>
          <strong>{staff.workingHours}</strong>
        </article>
        <article>
          <p>Leave Status</p>
          <strong>{staff.leaveStatus}</strong>
        </article>
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="crm-staff-panel-section">
      <div className="crm-staff-note-block">
        <p>Internal Notes</p>
        <span>{staff.notes || 'No internal notes added yet.'}</span>
      </div>
      <div className="crm-staff-note-block">
        <p>Client Handling Notes</p>
        <span>{staff.clientHandlingNotes || 'No special handling notes yet.'}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="crm-staff-profile-head">
        <div className="crm-staff-avatar">{staff.name.slice(0, 2).toUpperCase()}</div>
        <h3>{staff.name}</h3>
        <p>{staff.role}</p>
        <p>{staff.email}</p>
        <p>{staff.phone}</p>
      </div>

      <div className="crm-staff-detail-tabs" role="tablist" aria-label="Staff detail tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={detailTab === tab.key}
            className={`crm-staff-tab-btn${detailTab === tab.key ? ' crm-staff-tab-btn-active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {detailTab === 'overview' ? renderOverview() : null}
      {detailTab === 'schedule' ? renderSchedule() : null}
      {detailTab === 'services' ? renderServices() : null}
      {detailTab === 'availability' ? renderAvailability() : null}
      {detailTab === 'notes' ? renderNotes() : null}

      <div className="crm-staff-actions">
        <button type="button" className="crm-staff-primary-btn" onClick={onEditProfile}>Edit Profile</button>
        <button type="button" className="crm-staff-secondary-btn" onClick={onAssignServices}>Assign Services</button>
        <button type="button" className="crm-staff-secondary-btn" onClick={onUpdateAvailability}>Update Availability</button>
        <button type="button" className="crm-staff-ghost-btn" onClick={onViewTodayAppointments}>View Today&apos;s Appointments</button>
        <button type="button" className="crm-staff-ghost-btn" onClick={onReassignAppointments}>Reassign Appointments</button>
        <button type="button" className="crm-staff-ghost-btn" onClick={onViewCoverageImpact}>View Coverage Impact</button>
        <button type="button" className="crm-staff-ghost-btn" onClick={onViewSchedule}>View Schedule</button>
      </div>
    </>
  );
};

export default StaffDetailPanel;
