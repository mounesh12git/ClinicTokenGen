import { useState, useEffect } from 'react'
import './ClinicAdminPanel.css'

function ClinicAdminPanel({ tokenRequests, userInfo, onLogout }) {
  const [requests, setRequests] = useState(tokenRequests)
  const [currentlyServing, setCurrentlyServing] = useState(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [stats, setStats] = useState({
    totalRequests: tokenRequests.length,
    waitingCount: tokenRequests.filter(r => r.status === 'waiting').length,
    calledCount: tokenRequests.filter(r => r.status === 'called').length,
    completedCount: 0
  })

  useEffect(() => {
    updateStats()
  }, [requests])

  const updateStats = () => {
    const waitingCount = requests.filter(r => r.status === 'waiting').length
    const calledCount = requests.filter(r => r.status === 'called').length
    const completed = requests.filter(r => r.status === 'completed').length

    setStats({
      totalRequests: requests.length,
      waitingCount,
      calledCount,
      completedCount: completed
    })
  }

  const callNextPatient = () => {
    const nextWaiting = requests.find(r => r.status === 'waiting')
    if (nextWaiting) {
      // Mark previous as completed
      if (currentlyServing) {
        setRequests(requests.map(r =>
          r.id === currentlyServing.id ? { ...r, status: 'completed', completedAt: new Date() } : r
        ))
      }

      // Call next patient
      const updated = requests.map(r =>
        r.id === nextWaiting.id ? { ...r, status: 'called', calledAt: new Date() } : r
      )
      setRequests(updated)
      setCurrentlyServing(nextWaiting)
    }
  }

  const completePatient = (id) => {
    setRequests(requests.map(r =>
      r.id === id ? { ...r, status: 'completed', completedAt: new Date() } : r
    ))
    if (currentlyServing?.id === id) {
      setCurrentlyServing(null)
    }
  }

  const markNoShow = (id) => {
    setRequests(requests.map(r =>
      r.id === id ? { ...r, status: 'no-show' } : r
    ))
    if (currentlyServing?.id === id) {
      setCurrentlyServing(null)
    }
  }

  const cancelRequest = (id) => {
    setRequests(requests.filter(r => r.id !== id))
  }

  const waitingRequests = requests.filter(r => r.status === 'waiting')
  const completedRequests = requests.filter(r => r.status === 'completed')

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div>
          <h1>🏥 Clinic Admin Panel</h1>
          <p>Manage patient queue and tokens</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </header>

      <div className="admin-content">
        {/* Quick Stats */}
        <div className="stats-row">
          <div className="stat-box primary">
            <div className="stat-number">{stats.totalRequests}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-box warning">
            <div className="stat-number">{stats.waitingCount}</div>
            <div className="stat-label">Waiting</div>
          </div>
          <div className="stat-box info">
            <div className="stat-number">{stats.calledCount}</div>
            <div className="stat-label">Being Served</div>
          </div>
          <div className="stat-box success">
            <div className="stat-number">{stats.completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        {/* Currently Serving Section */}
        <div className="currently-serving-section">
          <h3>🎤 Currently Serving</h3>
          {currentlyServing ? (
            <div className="serving-card">
              <div className="serving-content">
                <div className="token-display">
                  <span className="serving-token">{currentlyServing.tokenNumber}</span>
                </div>
                <div className="patient-details">
                  <p><strong>{currentlyServing.patientName}</strong></p>
                  <p className="contact">📱 {currentlyServing.patientPhone}</p>
                  {currentlyServing.symptoms && (
                    <p className="symptoms">Reason: {currentlyServing.symptoms}</p>
                  )}
                </div>
              </div>
              <div className="serving-actions">
                <button 
                  className="complete-btn"
                  onClick={() => completePatient(currentlyServing.id)}
                >
                  ✓ Mark Complete
                </button>
                <button 
                  className="noshow-btn"
                  onClick={() => markNoShow(currentlyServing.id)}
                >
                  ⚠️ No Show
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-serving">
              <p>No patient is being served</p>
              <button className="call-next-btn" onClick={callNextPatient}>
                📢 Call Next Patient
              </button>
            </div>
          )}
          {currentlyServing && (
            <button className="call-next-btn" onClick={callNextPatient}>
              ➜ Call Next Patient
            </button>
          )}
        </div>

        {/* Waiting Queue */}
        <div className="waiting-queue-section">
          <h3>⏳ Waiting Queue ({waitingRequests.length})</h3>
          {waitingRequests.length > 0 ? (
            <div className="queue-list">
              {waitingRequests.map((request, index) => (
                <div key={request.id} className="queue-item">
                  <div className="queue-position">
                    <span className="position-number">{index + 1}</span>
                  </div>
                  <div className="queue-info">
                    <p className="queue-token">{request.tokenNumber}</p>
                    <p className="queue-name">{request.patientName}</p>
                    <p className="queue-phone">📱 {request.patientPhone}</p>
                    {request.symptoms && (
                      <p className="queue-symptoms">Reason: {request.symptoms}</p>
                    )}
                  </div>
                  <div className="queue-time">
                    <p className="wait-time">{index * 5} min wait</p>
                    <small>{request.requestedAt.toLocaleTimeString()}</small>
                  </div>
                  <div className="queue-actions">
                    <button 
                      className="call-btn"
                      onClick={() => {
                        if (currentlyServing) {
                          completePatient(currentlyServing.id)
                        }
                        setRequests(requests.map(r =>
                          r.id === request.id ? { ...r, status: 'called', calledAt: new Date() } : r
                        ))
                        setCurrentlyServing(request)
                      }}
                    >
                      📢 Call
                    </button>
                    <button 
                      className="cancel-btn"
                      onClick={() => cancelRequest(request.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-queue">
              <p>No patients waiting</p>
            </div>
          )}
        </div>

        {/* Completed Patients */}
        <div className="completed-section">
          <h3>✓ Completed ({completedRequests.length})</h3>
          {completedRequests.length > 0 ? (
            <div className="completed-list">
              {completedRequests.slice(-5).reverse().map((request) => (
                <div key={request.id} className="completed-item">
                  <div className="completed-token">{request.tokenNumber}</div>
                  <div className="completed-info">
                    <p>{request.patientName}</p>
                    <small>{request.completedAt?.toLocaleTimeString()}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No completed patients yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClinicAdminPanel
