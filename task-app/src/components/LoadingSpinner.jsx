import React from 'react';

/**
 * LoadingSpinner component - Displays a loading animation with optional message
 * @param {Object} props - Component props
 * @param {string} [props.message="Loading..."] - Message to display below the spinner
 * @param {boolean} [props.fullScreen=false] - Whether to display the spinner full screen
 */
const LoadingSpinner = ({ message = "Loading...", fullScreen = false }) => {
  return (
    <div className={`loading-container ${fullScreen ? 'full-screen' : ''}`}>
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default LoadingSpinner; 