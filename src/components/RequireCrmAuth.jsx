import { Navigate, useLocation } from 'react-router-dom';
import { getCrmSession } from '../config/crm';

const RequireCrmAuth = ({ children }) => {
  const location = useLocation();
  const session = getCrmSession();

  if (!session) {
    return <Navigate to="/crm-login" replace state={{ from: location }} />;
  }

  return children;
};

export default RequireCrmAuth;
