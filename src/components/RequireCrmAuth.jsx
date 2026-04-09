import { Navigate, useLocation } from 'react-router-dom';
import { getCrmToken } from '../config/crm';

const RequireCrmAuth = ({ children }) => {
  const location = useLocation();
  const token = getCrmToken();

  if (!token) {
    return <Navigate to="/crm-login" replace state={{ from: location }} />;
  }

  return children;
};

export default RequireCrmAuth;
