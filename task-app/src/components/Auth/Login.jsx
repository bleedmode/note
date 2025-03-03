import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const Login = ({ onToggleView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMessage(error.message || 'Failed to sign in');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error(error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign In</h2>
      {errorMessage && <div className="auth-error">{errorMessage}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <div className="auth-footer">
        <p>
          Don't have an account?{' '}
          <button className="auth-link" onClick={() => onToggleView('register')}>
            Sign Up
          </button>
        </p>
        <p>
          <button className="auth-link" onClick={() => onToggleView('reset')}>
            Forgot Password?
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login; 