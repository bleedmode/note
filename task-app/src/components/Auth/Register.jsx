import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const Register = ({ onToggleView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { signUp, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    try {
      const { error } = await signUp(email, password);
      if (error) {
        setErrorMessage(error.message || 'Failed to sign up');
      } else {
        setSuccessMessage('Registration successful! Please check your email to confirm your account.');
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error(error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create Account</h2>
      {errorMessage && <div className="auth-error">{errorMessage}</div>}
      {successMessage && <div className="auth-success">{successMessage}</div>}
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
            placeholder="Create a password"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />
        </div>
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      <div className="auth-footer">
        <p>
          Already have an account?{' '}
          <button className="auth-link" onClick={() => onToggleView('login')}>
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register; 