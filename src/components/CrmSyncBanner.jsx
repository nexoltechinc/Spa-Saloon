import './CrmSyncBanner.css';

const CrmSyncBanner = ({ message, title = 'CRM sync warning' }) => {
  if (!message) return null;

  return (
    <div className="crm-sync-banner" role="alert" aria-live="polite">
      <span className="crm-sync-banner-mark" aria-hidden="true" />
      <div className="crm-sync-banner-body">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default CrmSyncBanner;
