import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login/Login'
import AdminDashboard from './components/AdminDashboard/AdminDashboard'
import UserSurvey from './components/UserSurvey/UserSurvey'
import './styles/global.css'

function App() {
  const [users, setUsers] = useState(
    JSON.parse(localStorage.getItem('users')) || [
      { username: 'admin', isAdmin: true, hasSubmitted: false }
    ]
  )
  const [questions, setQuestions] = useState(
    JSON.parse(localStorage.getItem('questions')) || []
  )
  const [answers, setAnswers] = useState(
    JSON.parse(localStorage.getItem('answers')) || []
  )

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users))
    localStorage.setItem('questions', JSON.stringify(questions))
    localStorage.setItem('answers', JSON.stringify(answers))
  }, [users, questions, answers])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login users={users} />} />
        <Route
          path="/admin"
          element={
            <AdminDashboard
              users={users}
              setUsers={setUsers}
              questions={questions}
              setQuestions={setQuestions}
              answers={answers}
            />
          }
        />
        <Route
          path="/survey"
          element={
            <UserSurvey
              questions={questions}
              answers={answers}
              setAnswers={setAnswers}
              users={users}
              setUsers={setUsers}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App