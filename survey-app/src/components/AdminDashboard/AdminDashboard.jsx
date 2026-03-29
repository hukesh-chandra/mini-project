import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { v4 as uuidv4 } from 'uuid'
import { database, ref, onValue, set } from '../../firebase'
import './AdminDashboard.css'

export default function AdminDashboard({ users, saveUsers }) {
  const [newUser, setNewUser] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [newOptions, setNewOptions] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])

  // Load data from Firebase
  useEffect(() => {
    const questionsRef = ref(database, 'questions')
    onValue(questionsRef, (snapshot) => {
      const data = snapshot.val()
      setQuestions(data ? Object.values(data) : []) // Convert object to array
    })

    const answersRef = ref(database, 'answers')
    onValue(answersRef, (snapshot) => {
      const data = snapshot.val()
      setAnswers(data ? Object.values(data) : []) // Convert object to array
    })

    const usersRef = ref(database, 'users')
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      saveUsers(data ? Object.values(data) : []) // Convert object to array
    })
  }, [saveUsers])

  const addUser = () => {
    if (newUser) {
      const updatedUsers = [...users, { 
        username: newUser, 
        isAdmin: false, 
        hasSubmitted: false 
      }]
      // Update both local state and Firebase
      saveUsers(updatedUsers)
      set(ref(database, 'users'), updatedUsers)
      setNewUser('')
    }
  }

  const addQuestion = () => {
    if (newQuestion && newOptions) {
      const updatedQuestions = [...questions, {
        id: uuidv4(),
        text: newQuestion.trim(),
        options: newOptions.split(',').map(opt => opt.trim())
      }]
      // Update both local state and Firebase
      setQuestions(updatedQuestions)
      set(ref(database, 'questions'), updatedQuestions)
      setNewQuestion('')
      setNewOptions('')
    }
  }

  const getChartData = (questionId) => {
    const questionAnswers = answers.filter(a => a.questionId === questionId)
    const question = questions.find(q => q.id === questionId)
    if (!question) return []
    return question.options.map(option => ({
      option,
      count: questionAnswers.filter(a => a.answer === option).length
    }))
  }

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>

      <div className="section">
        <h2>Manage Users</h2>
        <input
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          className="admin-input"
        />
        <button onClick={addUser} className="admin-button">Add User</button>
        <ul className="user-list">
          {users.map(user => (
            <li key={user.username} className="user-item">
              {user.username}
              {!user.isAdmin && (
                <>
                  <button
                    onClick={() => {
                      const updatedUsers = users.filter(u => u.username !== user.username)
                      saveUsers(updatedUsers)
                      set(ref(database, 'users'), updatedUsers)
                    }}
                    className="admin-button danger"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      const updatedUsers = users.map(u => 
                        u.username === user.username ? { ...u, hasSubmitted: false } : u
                      )
                      saveUsers(updatedUsers)
                      set(ref(database, 'users'), updatedUsers)
                    }}
                    className="admin-button warning"
                  >
                    Reset
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h2>Manage Questions</h2>
        <input
          placeholder="Question"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          className="admin-input"
        />
        <input
          placeholder="Options (comma separated)"
          value={newOptions}
          onChange={(e) => setNewOptions(e.target.value)}
          className="admin-input"
        />
        <button onClick={addQuestion} className="admin-button">Add Question</button>
        <ul className="question-list">
          {questions.map(question => (
            <li key={question.id} className="question-item">
              {question.text}
              <button
                onClick={() => {
                  const updatedQuestions = questions.filter(q => q.id !== question.id)
                  setQuestions(updatedQuestions)
                  set(ref(database, 'questions'), updatedQuestions)
                }}
                className="admin-button danger"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h2>Results</h2>
        {questions.map(question => (
          <div key={question.id} className="chart-container">
            <h3>{question.text}</h3>
            <BarChart width={400} height={300} data={getChartData(question.id)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="option" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </div>
        ))}
      </div>
    </div>
  )
}