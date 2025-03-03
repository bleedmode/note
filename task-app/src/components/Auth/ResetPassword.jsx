import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ResetPassword = ({ onToggleView }) => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { resetPassword, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email) {
      setErrorMessage('Please enter your email');
      return;
    }

    try {
      const { error, success } = await resetPassword(email);
      if (error) {
        setErrorMessage(error.message || 'Failed to send reset email');
      } else if (success) {
        setSuccessMessage('Password reset email sent. Please check your inbox.');
        setEmail('');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error(error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Reset Password</h2>
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
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      <div className="auth-footer">
        <p>
          <button className="auth-link" onClick={() => onToggleView('login')}>
            Back to Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword; 