import React, { useState } from 'react'

const Pomodoro = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="nav-item">
      <span className="nav-icon">🕐</span>
      <span className="nav-text">{formatTime(timeLeft)}</span>
    </div>
  )
}

export default Pomodoro 