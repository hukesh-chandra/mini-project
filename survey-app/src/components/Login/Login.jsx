import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

export default function Login({ users }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('') // Add error state
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    const trimmedUsername = username.trim() // Trim whitespace
    if (!trimmedUsername) {
      setError('Username cannot be empty') // Validate input
      return
    }

    const user = users.find(u => u.username === trimmedUsername)

    if (user) {
      if (user.isAdmin) {
        navigate('/admin')
      } else {
        if (user.hasSubmitted) {
          const confirmResubmit = window.confirm(
            'You have already submitted the survey. Do you want to resubmit?'
          )
          if (confirmResubmit) {
            localStorage.setItem('currentUser', JSON.stringify(user))
            navigate('/survey')
          }
        } else {
          localStorage.setItem('currentUser', JSON.stringify(user))
          navigate('/survey')
        }
      }
    } else {
      setError('Invalid username') // Show error message
    }
  }

  return (
    <div className="login-container">
      <h1>Login</h1>
      <form onSubmit={handleLogin} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setError('') // Clear error on input change
          }}
          className="login-input"
        />
        {error && <p className="error-message">{error}</p>} {/* Display error */}
        <button type="submit" className="login-button">Login</button>
      </form>
    </div>
  )
}