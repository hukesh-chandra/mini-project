import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './UserSurvey.css'

export default function UserSurvey({ questions, answers, saveAnswers, users, saveUsers }) {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem('currentUser'))
  )
  const [responses, setResponses] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    if (!currentUser || users.find(u => u.username === currentUser.username)?.hasSubmitted) {
      navigate('/')
    }
  }, [currentUser, users, navigate])

  const handleSubmit = () => {
    const confirmSubmit = window.confirm('Are you sure you want to submit the survey?')
    if (confirmSubmit) {
      const newAnswers = Object.entries(responses).map(([questionId, answer]) => ({
        userId: currentUser.username,
        questionId,
        answer,
      }))

      const updatedAnswers = [...answers, ...newAnswers]
      saveAnswers(updatedAnswers)

      const updatedUsers = users.map(u =>
        u.username === currentUser.username ? { ...u, hasSubmitted: true } : u
      )
      saveUsers(updatedUsers)

      localStorage.removeItem('currentUser')
      alert('Survey submitted successfully!')
      navigate('/')
    }
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="survey-container">
      <h1>Survey</h1>
      {questions.map(question => (
        <div key={question.id} className="question-card">
          <h3>{question.text}</h3>
          {question.options.map(option => (
            <label key={option} className="option-label">
              <input
                type="radio"
                name={question.id}
                value={option}
                onChange={() => setResponses({ ...responses, [question.id]: option })}
                className="option-input"
              />
              {option}
            </label>
          ))}
        </div>
      ))}
      <button onClick={handleSubmit} className="submit-button">Submit</button>
    </div>
  )
}