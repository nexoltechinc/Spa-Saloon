import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Clock3, MapPin, Plus, Settings2, Users } from 'lucide-react';
import { clearCrmToken } from '../config/crm';
import { CRM_NAV_ITEMS } from '../config/crmNav';
import CrmShell from '../components/CrmShell';
import './CrmGenericModule.css';

const initialBranches = [
  {
    id: 'branch-downtown',
    name: 'Downtown Sanctuary',
    status: 'Open',
    manager: 'Isabella Rose',
    city: 'Los Angeles',
    phone: '(323) 555-0101',
    hours: '9:00 AM - 8:00 PM',
    teamSize: 18,
    rooms: 9,
  },
  {
    id: 'branch-uptown',
    name: 'Uptown Sanctuary',
    status: 'Open',
    manager: 'Elena Vance',
    city: 'Beverly Hills',
    phone: '(323) 555-0120',
    hours: '10:00 AM - 7:00 PM',
    teamSize: 14,
    rooms: 7,
  },
  {
    id: 'branch-westside',
    name: 'Westside Sanctuary',
    status: 'Planning',
    manager: 'Marcus Chen',
    city: 'Santa Monica',
    phone: '(323) 555-0133',
    hours: 'Preview stage',
    teamSize: 0,
    rooms: 5,
  },
];

const CrmBranches = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState(initialBranches);
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranches[0].id);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) || branches[0],
    [branches, selectedBranchId],
  );

  const handleAddBranch = () => {
    const name = window.prompt('Branch name');
    if (!name) return;

    const manager = window.prompt('Branch manager', 'Unassigned') || 'Unassigned';
    const newBranch = {
      id: `branch-${Date.now()}`,
      name,
      status: 'Planning',
      manager,
      city: 'New location',
      phone: '(000) 000-0000',
      hours: 'To be scheduled',
      teamSize: 0,
      rooms: 0,
    };

    setBranches((current) => [newBranch, ...current]);
    setSelectedBranchId(newBranch.id);
  };

  const handleToggleStatus = (branchId) => {
    setBranches((current) =>
      current.map((branch) =>
        branch.id === branchId
          ? { ...branch, status: branch.status === 'Open' ? 'Planning' : 'Open' }
          : branch,
      ),
    );
  };

  const handleOpenBranch = () => {
    navigate('/crm/dashboard');
  };

  const handleBranchSettings = () => {
    navigate('/crm/settings');
  };

  return (
    <CrmShell
      shellClassName="crm-generic-shell"
    >
      <main className="crm-generic-main">
        <header className="crm-generic-header">
          <div>
            <h1>Branches</h1>
            <p>Manage branch locations, managers, hours, and operational visibility.</p>
          </div>
          <div className="crm-generic-actions">
            <button className="crm-generic-primary" type="button" onClick={handleAddBranch}>
              <Plus size={14} />
              Add Branch
            </button>
            <button className="crm-generic-ghost" type="button" onClick={handleBranchSettings}>
              <Settings2 size={14} />
              Branch Settings
            </button>
            <button className="crm-generic-ghost" type="button" onClick={handleOpenBranch}>
              <Building2 size={14} />
              Open Branch
            </button>
            <button
              className="crm-generic-ghost"
              type="button"
              onClick={() => {
                clearCrmToken();
                navigate('/crm-login');
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="crm-generic-grid">
          <article className="crm-generic-card">
            <p>Active Branches</p>
            <h2>{branches.filter((branch) => branch.status === 'Open').length}</h2>
          </article>
          <article className="crm-generic-card">
            <p>Planning</p>
            <h2>{branches.filter((branch) => branch.status !== 'Open').length}</h2>
          </article>
          <article className="crm-generic-card">
            <p>Managers</p>
            <h2>{branches.length}</h2>
          </article>
        </section>

        <section className="crm-generic-panel crm-generic-branch-layout">
          <div>
            <h2>Branch Directory</h2>
            <div className="crm-generic-table">
              {branches.map((row) => {
                const isSelected = row.id === selectedBranchId;
                return (
                  <div
                    key={row.id}
                    className={`crm-generic-table-row crm-generic-branch-row${isSelected ? ' crm-generic-branch-row-active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBranchId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedBranchId(row.id);
                      }
                    }}
                  >
                    <div>
                      <strong>{row.name}</strong>
                      <span>{row.city}</span>
                    </div>
                    <span>{row.status}</span>
                    <span>{row.manager}</span>
                    <div className="crm-generic-branch-actions">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedBranchId(row.id); }}>
                        View
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); handleToggleStatus(row.id); }}>
                        Toggle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="crm-generic-detail-card">
            {selectedBranch ? (
              <>
                <p>Selected Branch</p>
                <h3>{selectedBranch.name}</h3>
                <div className="crm-generic-detail-points">
                  <div>
                    <MapPin size={15} />
                    <span>{selectedBranch.city}</span>
                  </div>
                  <div>
                    <Users size={15} />
                    <span>{selectedBranch.teamSize} team members</span>
                  </div>
                  <div>
                    <Clock3 size={15} />
                    <span>{selectedBranch.hours}</span>
                  </div>
                </div>
                <div className="crm-generic-detail-meta">
                  <span>Manager</span>
                  <strong>{selectedBranch.manager}</strong>
                </div>
                <div className="crm-generic-detail-meta">
                  <span>Phone</span>
                  <strong>{selectedBranch.phone}</strong>
                </div>
                <div className="crm-generic-detail-meta">
                  <span>Rooms</span>
                  <strong>{selectedBranch.rooms}</strong>
                </div>
                <div className="crm-generic-detail-actions">
                  <button type="button" onClick={handleOpenBranch}>
                    Open Branch
                  </button>
                  <button type="button" onClick={handleBranchSettings}>
                    Branch Settings
                  </button>
                  <button type="button" onClick={() => handleToggleStatus(selectedBranch.id)}>
                    Toggle Status
                  </button>
                </div>
              </>
            ) : null}
          </aside>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmBranches;
