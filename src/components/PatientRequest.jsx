import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './PatientRequest.css'

function PatientRequest({ clinicData, onTokenRequested, userInfo }) {
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [requestedToken, setRequestedToken] = useState(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const calculateWaitingTime = (queuePosition) => {
    // Assuming 5 minutes per patient
    const avgTimePerPatient = 5
    return queuePosition * avgTimePerPatient
  }

  const handleRequestToken = (e) => {
    e.preventDefault()
    setError('')

    if (!patientName.trim() || !patientPhone.trim()) {
      setError('Patient name and phone number are required')
      return
    }

    if (clinicData.availableTokens <= 0) {
      setError('No tokens available at the moment. Please try again later.')
      return
    }

    const newToken = {
      id: uuidv4(),
      tokenNumber: `CLN-${Date.now().toString().slice(-6)}`,
      patientName,
      patientPhone,
      patientEmail,
      symptoms,
      requestedAt: new Date(),
      status: 'waiting', // waiting, called, completed
      queuePosition: clinicData.totalRequests + 1,
      estimatedWaitTime: calculateWaitingTime(clinicData.totalRequests + 1)
    }

    setRequestedToken(newToken)
    setSubmitted(true)
    onTokenRequested(newToken)

    // Reset form
    setPatientName('')
    setPatientPhone('')
    setPatientEmail('')
    setSymptoms('')
  }

  const handleNewRequest = () => {
    setRequestedToken(null)
    setSubmitted(false)
    setError('')
  }

  if (submitted && requestedToken) {
    return (
      <div className="patient-request-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h2>Token Request Successful!</h2>
          
          <div className="token-details">
            <div className="detail-item">
              <label>Your Token Number</label>
              <p className="token-number">{requestedToken.tokenNumber}</p>
            </div>

            <div className="detail-item">
              <label>Queue Position</label>
              <p className="position-badge">#{requestedToken.queuePosition}</p>
            </div>

            <div className="detail-item">
              <label>Estimated Waiting Time</label>
              <p className="waiting-time">
                {requestedToken.estimatedWaitTime} minutes
              </p>
            </div>

            <div className="detail-item">
              <label>Request Time</label>
              <p>{requestedToken.requestedAt.toLocaleTimeString()}</p>
            </div>

            <div className="detail-item">
              <label>Patient Name</label>
              <p>{requestedToken.patientName}</p>
            </div>

            <div className="detail-item">
              <label>Contact</label>
              <p>{requestedToken.patientPhone}</p>
            </div>
          </div>

          <div className="waiting-info">
            <h4>📢 Important Information</h4>
            <ul>
              <li>Please arrive at the clinic 5 minutes before your estimated time</li>
              <li>Keep your token number for reference</li>
              <li>Listen for announcements when your token is called</li>
              <li>If you need to cancel, please inform the receptionist</li>
            </ul>
          </div>

          <div className="status-tracker">
            <h4>Status Tracker</h4>
            <div className="status-steps">
              <div className="step active">
                <div className="step-number">1</div>
                <p>Token Requested</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <p>Waiting</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <p>Called</p>
              </div>
              <div className="step">
                <div className="step-number">4</div>
                <p>Completed</p>
              </div>
            </div>
          </div>

          <button className="new-request-btn" onClick={handleNewRequest}>
            Request Another Token
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="patient-request-container">
      <div className="request-card">
        <h1>🏥 Request Clinic Token</h1>
        <p className="subtitle">Avoid waiting in long queues</p>

        <div className="clinic-info">
          <h3>Clinic Status</h3>
          <div className="info-grid">
            <div className="info-box">
              <div className="info-label">Available Tokens</div>
              <div className="info-value" style={{color: clinicData.availableTokens > 0 ? '#4ecdc4' : '#ff6b6b'}}>
                {clinicData.availableTokens}
              </div>
            </div>
            <div className="info-box">
              <div className="info-label">Patients Waiting</div>
              <div className="info-value">{clinicData.totalRequests}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Patients Being Served</div>
              <div className="info-value">{clinicData.beingServed}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Avg Wait Time</div>
              <div className="info-value">{Math.ceil(clinicData.totalRequests * 5)} min</div>
            </div>
          </div>
        </div>

        {clinicData.availableTokens <= 0 && (
          <div className="unavailable-alert">
            <p>⚠️ No tokens available at the moment. The clinic is at full capacity. Please try again later.</p>
          </div>
        )}

        <form onSubmit={handleRequestToken}>
          <div className="form-group">
            <label htmlFor="patientName">Patient Name *</label>
            <input
              id="patientName"
              type="text"
              placeholder="Full name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              disabled={clinicData.availableTokens <= 0}
            />
          </div>

          <div className="form-group">
            <label htmlFor="patientPhone">Phone Number *</label>
            <input
              id="patientPhone"
              type="tel"
              placeholder="Contact number"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value.slice(0, 10))}
              maxLength="10"
              disabled={clinicData.availableTokens <= 0}
            />
          </div>

          <div className="form-group">
            <label htmlFor="patientEmail">Email Address</label>
            <input
              id="patientEmail"
              type="email"
              placeholder="Your email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              disabled={clinicData.availableTokens <= 0}
            />
          </div>

          <div className="form-group">
            <label htmlFor="symptoms">Symptoms / Reason for Visit</label>
            <textarea
              id="symptoms"
              placeholder="Briefly describe your symptoms or reason for visit"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value.slice(0, 200))}
              maxLength="200"
              rows="4"
              disabled={clinicData.availableTokens <= 0}
            />
            <small>{symptoms.length}/200</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="request-btn"
            disabled={clinicData.availableTokens <= 0}
          >
            {clinicData.availableTokens <= 0 ? 'No Tokens Available' : 'Request Token'}
          </button>
        </form>

        <div className="benefits">
          <h4>✨ Benefits of Online Token Request</h4>
          <ul>
            <li>No need to wait in physical queue</li>
            <li>Know exact waiting time before coming</li>
            <li>Track your position in real-time</li>
            <li>Reduce clinic overcrowding</li>
            <li>Efficient time management</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PatientRequest
