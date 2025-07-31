// src/routes/AuthRedirect.tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Si está logueado e intenta ir al login, redirigilo a la página principal
    if (user?.uid && location.pathname === '/login') {
      navigate('/unidades', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return <>{children}</>;
};

export default AuthRedirect;
