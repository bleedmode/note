import { useState } from 'react';
import Login from './Login';
import Register from './Register';
import ResetPassword from './ResetPassword';

const AuthContainer = () => {
  const [view, setView] = useState('login');

  const handleToggleView = (newView) => {
    setView(newView);
  };

  return (
    <div className="auth-wrapper">
      {view === 'login' && <Login onToggleView={handleToggleView} />}
      {view === 'register' && <Register onToggleView={handleToggleView} />}
      {view === 'reset' && <ResetPassword onToggleView={handleToggleView} />}
    </div>
  );
};

export default AuthContainer; 