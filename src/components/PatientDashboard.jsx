import { useState, useEffect } from 'react'
import { ref, get, set, update, remove } from 'firebase/database'
import { database } from '../firebaseConfig'
import AdsDisplay from './AdsDisplay'
import CurrentTokenBanner from './CurrentTokenBanner'
import './PatientDashboard.css'

function PatientDashboard({ userInfo, onLogout, onPharmacyClick }) {
  const [news, setNews] = useState([])
  const [kids, setKids] = useState([])
  const [tokenStatus, setTokenStatus] = useState(null)
  const [upcomingTokenTime, setUpcomingTokenTime] = useState(null)
  const [vaccineSchedules, setVaccineSchedules] = useState([])
  const [selectedKidVaccines, setSelectedKidVaccines] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [loading, setLoading] = useState(false)
  const [showAddKid, setShowAddKid] = useState(false)
  const [editingKidId, setEditingKidId] = useState(null)
  const [kidForm, setKidForm] = useState({
    name: '',
    age: '',
    dateOfBirth: ''
  })
  const [newTokenRequest, setNewTokenRequest] = useState('')
  const [tokenSlots, setTokenSlots] = useState([])
  const [showTokenRequestForm, setShowTokenRequestForm] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [tokenRequestForm, setTokenRequestForm] = useState({
    caseNumber: '',
    reason: '',
    contactNumber: '',
    dependentName: ''
  })
  const [currentToken, setCurrentToken] = useState(null)
  const [queueInfo, setQueueInfo] = useState(null)
  const [showTokenDetailsModal, setShowTokenDetailsModal] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    comment: '',
    experience: 'excellent'
  })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const MAX_KIDS = 3 // Maximum 3 kids allowed

  // Check if a slot should be disabled based on current time
  const isSlotDisabled = (slotName) => {
    const now = new Date()
    const currentHour = now.getHours()
    
    if (slotName === 'Morning' && currentHour >= 12) {
      return true // Disable morning if it's afternoon or later
    }
    if (slotName === 'Afternoon' && currentHour >= 17) {
      return true // Disable afternoon if it's evening or later
    }
    if (slotName === 'Evening' && currentHour >= 20) {
      return true // Disable evening if it's 8 PM or later
    }
    return false
  }

  // Fetch news and announcements
  const fetchNews = async () => {
    try {
      const newsRef = ref(database, 'news')
      const snapshot = await get(newsRef)
      if (snapshot.exists()) {
        const newsArray = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }))
        setNews(newsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      }
    } catch (error) {
      console.error('Error fetching news:', error)
    }
  }

  // Fetch user's kids
  const fetchKids = async () => {
    try {
      const kidsRef = ref(database, `users/${userInfo.id}/kids`)
      const snapshot = await get(kidsRef)
      if (snapshot.exists()) {
        const kidsArray = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }))
        setKids(kidsArray)
      } else {
        setKids([])
      }
    } catch (error) {
      console.error('Error fetching kids:', error)
    }
  }

  // Fetch token status
  const fetchTokenStatus = async () => {
    try {
      const userRef = ref(database, `users/${userInfo.id}`)
      const snapshot = await get(userRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        setTokenStatus({
          current: data.tokenCount || 0,
          max: data.maxTokens || 10,
          percentage: ((data.tokenCount || 0) / (data.maxTokens || 10)) * 100
        })
      }

      // Fetch token configuration to calculate upcoming time
      const configRef = ref(database, 'config/tokenSettings')
      const configSnapshot = await get(configRef)
      if (configSnapshot.exists()) {
        const config = configSnapshot.val()
        calculateUpcomingTokenTime(config.slotResetTime)
      }
    } catch (error) {
      console.error('Error fetching token status:', error)
    }
  }

  // Calculate upcoming token time based on slot reset time
  const calculateUpcomingTokenTime = (slotResetTime) => {
    if (!slotResetTime) {
      setUpcomingTokenTime('09:00 AM')
      return
    }

    const [resetHour, resetMinute] = slotResetTime.split(':').map(Number)
    const now = new Date()
    const resetTime = new Date()
    resetTime.setHours(resetHour, resetMinute, 0)

    // If reset time has already passed today, show tomorrow's time
    if (now > resetTime) {
      resetTime.setDate(resetTime.getDate() + 1)
    }

    // Format time in 12-hour format
    const hour = resetTime.getHours()
    const minute = resetTime.getMinutes()
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinute = String(minute).padStart(2, '0')
    
    setUpcomingTokenTime(`${displayHour}:${displayMinute} ${ampm}`)
  }

  // Fetch vaccine schedules
  const fetchVaccineSchedules = async () => {
    try {
      const vaccineRef = ref(database, 'vaccineSchedules')
      const snapshot = await get(vaccineRef)
      if (snapshot.exists()) {
        const schedules = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }))
        setVaccineSchedules(schedules.sort((a, b) => {
          const ageA = parseInt(a.ageGroup.split('-')[0])
          const ageB = parseInt(b.ageGroup.split('-')[0])
          return ageA - ageB
        }))
      } else {
        setVaccineSchedules([])
      }
    } catch (error) {
      console.error('Error fetching vaccine schedules:', error)
    }
  }

  // Fetch today's token slots
  const fetchTokenSlots = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const slotsRef = ref(database, `tokenSlots/${today}`)
      const snapshot = await get(slotsRef)
      if (snapshot.exists()) {
        const slotsData = snapshot.val()
        const currentTime = new Date()
        
        const slotsList = Object.entries(slotsData).map(([id, data]) => {
          // Parse slot end time (assuming format HH:MM)
          const [endHour, endMinute] = (data.endTime || '20:00').split(':').map(Number)
          const slotEndTime = new Date()
          slotEndTime.setHours(endHour, endMinute, 0, 0)
          
          // Check if slot has expired (current time is past slot end time)
          const isExpired = currentTime > slotEndTime
          
          // Check if user already has a token in this slot (prevent one-token-per-slot violation)
          let userHasTokenInSlot = false
          if (data.tokens) {
            userHasTokenInSlot = Object.values(data.tokens).some(
              token => token.patientId === userInfo.id && token.status !== 'cleared' && token.status !== 'canceled'
            )
          }
          
          // Check for uncleared/uncanceled tokens in slot (admin didn't clear or user didn't cancel)
          let hasUnhandledTokens = false
          if (data.tokens) {
            hasUnhandledTokens = Object.values(data.tokens).some(
              token => (token.status === 'pending' || token.status === 'called') && currentTime > slotEndTime
            )
          }
          
          return {
            id,
            ...data,
            isExpired,
            isDisabled: isExpired || userHasTokenInSlot || hasUnhandledTokens,
            disableReason: isExpired ? 'slot-expired' : userHasTokenInSlot ? 'user-has-token' : hasUnhandledTokens ? 'unhandled-tokens' : null
          }
        })
        
        setTokenSlots(slotsList.sort((a, b) => a.startTime.localeCompare(b.startTime)))
      } else {
        setTokenSlots([])
      }
    } catch (error) {
      console.error('Error fetching token slots:', error)
    }
  }

  // Fetch patient's current token and queue information
  const fetchPatientTokenStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const slotsRef = ref(database, `tokenSlots/${today}`)
      const snapshot = await get(slotsRef)
      
      if (!snapshot.exists()) {
        setCurrentToken(null)
        setQueueInfo(null)
        return
      }

      const slotsData = snapshot.val()
      let patientToken = null
      let slotInfo = null

      // Search for patient's token in all slots
      for (const [slotId, slotData] of Object.entries(slotsData)) {
        if (slotData.tokens) {
          const tokens = Object.entries(slotData.tokens)
          const foundToken = tokens.find(([_, token]) => token.patientId === userInfo.id)
          
          if (foundToken) {
            patientToken = {
              id: foundToken[0],
              slotId,
              ...foundToken[1]
            }
            slotInfo = slotData
            break
          }
        }
      }

      if (patientToken) {
        // Calculate queue info
        const tokensInSlot = slotInfo.tokens ? Object.values(slotInfo.tokens) : []
        const pendingTokens = tokensInSlot.filter(t => t.status !== 'cleared')
        const patientsAhead = pendingTokens.filter(t => t.tokenNumber < patientToken.tokenNumber).length

        setCurrentToken(patientToken)
        setQueueInfo({
          totalPatientsInSlot: tokensInSlot.length,
          patientsAhead,
          patientsWaiting: pendingTokens.length,
          availableTokens: slotInfo.tokensAvailable || 0,
          slotName: slotInfo.name,
          slotStartTime: slotInfo.startTime
        })
      } else {
        setCurrentToken(null)
        setQueueInfo(null)
      }
    } catch (error) {
      console.error('Error fetching patient token status:', error)
      setCurrentToken(null)
      setQueueInfo(null)
    }
  }

  // Cancel patient's token
  const handleCancelPatientToken = async () => {
    if (!currentToken || !queueInfo) {
      alert('No active token to cancel')
      return
    }

    if (!window.confirm('Are you sure you want to cancel your token? You will lose your place in the queue.')) {
      return
    }

    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const tokenRef = ref(database, `tokenSlots/${today}/${currentToken.slotId}/tokens/${currentToken.id}`)
      
      // Delete the token
      await remove(tokenRef)

      // Update slot availability
      const slotRef = ref(database, `tokenSlots/${today}/${currentToken.slotId}`)
      await update(slotRef, {
        tokensAvailable: (queueInfo.availableTokens || 0) + 1,
        tokensUsed: Math.max(0, (currentToken.tokenNumber || 1) - 1)
      })

      alert('Your token has been cancelled successfully')
      setCurrentToken(null)
      setQueueInfo(null)
      fetchTokenSlots()
    } catch (error) {
      console.error('Error cancelling token:', error)
      alert('Failed to cancel token: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Request token for a specific slot
  const handleRequestToken = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!selectedSlotId || !tokenRequestForm.caseNumber || !tokenRequestForm.reason || !tokenRequestForm.contactNumber) {
        alert('Please fill all required fields')
        setLoading(false)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const slotRef = ref(database, `tokenSlots/${today}/${selectedSlotId}`)
      const slotSnapshot = await get(slotRef)

      if (!slotSnapshot.exists()) {
        alert('Slot not found')
        setLoading(false)
        return
      }

      const slotData = slotSnapshot.val()
      
      // ✅ VALIDATION: Check if user already has a token in this slot
      if (slotData.tokens) {
        const userExistingToken = Object.values(slotData.tokens).find(
          token => token.patientId === userInfo.id && 
                   token.status !== 'cleared' && 
                   token.status !== 'canceled' &&
                   token.status !== 'rated'
        )
        
        if (userExistingToken) {
          alert(`❌ You can only request one token per slot!\n\nYou already have Token #${userExistingToken.tokenNumber} in this slot.\nPlease cancel it first if you want to request a different slot.`)
          setLoading(false)
          return
        }
      }
      
      // ✅ VALIDATION: Check if slot has expired (server-time based)
      const currentTime = new Date()
      const [endHour, endMinute] = slotData.endTime.split(':').map(Number)
      const slotEndTime = new Date()
      slotEndTime.setHours(endHour, endMinute, 0, 0)
      
      if (currentTime > slotEndTime) {
        alert('❌ This slot has expired and is no longer accepting token requests.')
        setLoading(false)
        return
      }
      
      if (slotData.tokensAvailable <= 0) {
        alert('No tokens available for this slot')
        setLoading(false)
        return
      }

      // Calculate token number and expected arrival time
      const tokenNumber = (slotData.tokensAllocated - slotData.tokensAvailable) + 1
      const [startHour, startMinute] = slotData.startTime.split(':').map(Number)
      const expectedArrivalDate = new Date()
      expectedArrivalDate.setHours(startHour, startMinute + (tokenNumber - 1) * 5, 0)
      const expectedArrivalTime = expectedArrivalDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })

      // Create token
      const tokenId = `token-${Date.now()}`
      const tokenData = {
        id: tokenId,
        tokenNumber,
        patientId: userInfo.id,
        patientName: userInfo.name || 'Patient',
        caseNumber: tokenRequestForm.caseNumber,
        reason: tokenRequestForm.reason,
        contactNumber: tokenRequestForm.contactNumber,
        dependentName: tokenRequestForm.dependentName,
        slotName: slotData.name,
        slotStartTime: slotData.startTime,
        expectedArrivalTime,
        status: 'pending',
        requestedAt: new Date().toISOString()
      }

      const tokenRef = ref(database, `tokenSlots/${today}/${selectedSlotId}/tokens/${tokenId}`)
      await set(tokenRef, tokenData)

      // Update slot availability
      await update(slotRef, {
        tokensAvailable: slotData.tokensAvailable - 1,
        tokensUsed: (slotData.tokensUsed || 0) + 1
      })

      alert(`Token #${tokenNumber} created successfully!\nExpected arrival: ${expectedArrivalTime}`)
      setTokenRequestForm({
        caseNumber: '',
        reason: '',
        contactNumber: '',
        dependentName: ''
      })
      setSelectedSlotId(null)
      setShowTokenRequestForm(false)
      fetchTokenSlots()
    } catch (error) {
      console.error('Error requesting token:', error)
      alert('Failed to request token: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Submit feedback/rating for completed appointment
  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    setSubmittingFeedback(true)

    try {
      if (!currentToken) {
        alert('No token found')
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const feedbackId = `feedback-${Date.now()}`
      
      const feedbackData = {
        id: feedbackId,
        tokenId: currentToken.id,
        patientId: userInfo.id,
        patientName: userInfo.name || 'Patient',
        tokenNumber: currentToken.tokenNumber,
        rating: parseInt(feedbackForm.rating),
        experience: feedbackForm.experience,
        comment: feedbackForm.comment,
        submittedAt: new Date().toISOString(),
        slotName: queueInfo?.slotName || 'Unknown'
      }

      // Store feedback in database
      const feedbackRef = ref(database, `feedback/${today}/${feedbackId}`)
      await set(feedbackRef, feedbackData)

      // Mark token as rated in the slot
      const tokenRef = ref(database, `tokenSlots/${today}/${currentToken.slotId}/tokens/${currentToken.id}`)
      await update(tokenRef, {
        status: 'rated',
        ratedAt: new Date().toISOString()
      })

      // Show success and reset UI properly
      alert('✅ Thank you for your feedback! Your rating has been submitted.')
      
      // Reset form and clear token
      setShowFeedbackForm(false)
      setFeedbackForm({
        rating: 5,
        comment: '',
        experience: 'excellent'
      })
      
      // Clear the current token and queue info
      setCurrentToken(null)
      setQueueInfo(null)
      setShowTokenRequestForm(false)
      setSelectedSlotId(null)
      
      // Refresh slots
      await fetchTokenSlots()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback: ' + error.message)
    } finally {
      setSubmittingFeedback(false)
    }
  }

  useEffect(() => {
    fetchNews()
    fetchKids()
    fetchTokenStatus()
    fetchVaccineSchedules()
    fetchTokenSlots()
    fetchPatientTokenStatus()
  }, [userInfo.id])

  // Auto-refresh queue info every 10 seconds if patient has an active token
  useEffect(() => {
    if (!currentToken || currentToken.status === 'cleared') return

    const interval = setInterval(() => {
      fetchPatientTokenStatus()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [currentToken])

  const handleAddKid = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!kidForm.name || !kidForm.age || !kidForm.dateOfBirth) {
        alert('Please fill all fields')
        setLoading(false)
        return
      }

      if (editingKidId) {
        // Edit existing kid
        const kidRef = ref(database, `users/${userInfo.id}/kids/${editingKidId}`)
        await update(kidRef, {
          ...kidForm,
          updatedAt: new Date().toISOString()
        })
      } else {
        // Add new kid
        if (kids.length >= MAX_KIDS) {
          alert(`You can add maximum ${MAX_KIDS} kids`)
          setLoading(false)
          return
        }

        const kidId = `kid-${Date.now()}`
        const kidRef = ref(database, `users/${userInfo.id}/kids/${kidId}`)
        await set(kidRef, {
          ...kidForm,
          createdAt: new Date().toISOString()
        })
      }

      setKidForm({ name: '', age: '', dateOfBirth: '' })
      setShowAddKid(false)
      setEditingKidId(null)
      fetchKids()
    } catch (error) {
      console.error('Error saving kid:', error)
      alert('Error saving kid information')
    } finally {
      setLoading(false)
    }
  }

  const handleEditKid = (kid) => {
    setEditingKidId(kid.id)
    setKidForm({
      name: kid.name,
      age: kid.age,
      dateOfBirth: kid.dateOfBirth
    })
    setShowAddKid(true)
  }

  const handleDeleteKid = async (kidId) => {
    if (window.confirm('Are you sure you want to remove this kid?')) {
      try {
        const kidRef = ref(database, `users/${userInfo.id}/kids/${kidId}`)
        await remove(kidRef)
        fetchKids()
      } catch (error) {
        console.error('Error deleting kid:', error)
      }
    }
  }


  const handleCancelToken = async () => {
    if (window.confirm('Are you sure you want to cancel your token?')) {
      try {
        const userRef = ref(database, `users/${userInfo.id}`)
        await update(userRef, {
          tokenCount: Math.max(0, (tokenStatus.current || 1) - 1),
          updatedAt: new Date().toISOString()
        })
        fetchTokenStatus()
      } catch (error) {
        console.error('Error canceling token:', error)
      }
    }
  }

  return (
    <div className="patient-dashboard">
      {/* News Banner */}
      {news.length > 0 && (
        <div className="news-banner">
          <div className="news-content">
            <span className="news-icon">📢</span>
            <div className="news-text">
              <h3>{news[0].title}</h3>
              <p>{news[0].description}</p>
              <span className="news-date">{new Date(news[0].createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>👋 Welcome, {userInfo.name}!</h1>
          <p>Manage your family's healthcare needs</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>

      {/* Advertisements */}
      <AdsDisplay location="dashboard" />

      {/* Current Token Banner - Real-time Display */}
      <CurrentTokenBanner userToken={currentToken} />

      {/* Quick Stats */}
      {tokenStatus && (
        <div className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Tokens Available</span>
            <span className="stat-value">{tokenStatus.current}/{tokenStatus.max}</span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${tokenStatus.percentage}%` }}
              ></div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Kids</span>
            <span className="stat-value">{kids.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Member Since</span>
            <span className="stat-value">{new Date(userInfo.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {/* Main Cards Grid */}
      <div className="cards-grid">
        {/* Add Kids Card */}
        <div className="service-card kids-card">
          <div className="card-header">
            <span className="card-icon">👶</span>
            <h2>Add Kids ({kids.length}/{MAX_KIDS})</h2>
          </div>
          <p className="card-description">Register your children</p>
          <button
            className="card-btn"
            onClick={() => {
              if (!editingKidId) {
                setShowAddKid(!showAddKid)
              } else {
                setShowAddKid(false)
                setEditingKidId(null)
                setKidForm({ name: '', age: '', dateOfBirth: '' })
              }
            }}
            disabled={kids.length >= MAX_KIDS && !showAddKid && !editingKidId}
          >
            {editingKidId ? '✓ Update Kid' : showAddKid ? '✕ Cancel' : kids.length >= MAX_KIDS ? '➕ Max kids reached' : '➕ Add Kid'}
          </button>

          {showAddKid && (
            <form className="kid-form" onSubmit={handleAddKid}>
              <div className="form-group">
                <label>Child's Name</label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={kidForm.name}
                  onChange={(e) => setKidForm({ ...kidForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input
                  type="number"
                  placeholder="Age in years"
                  value={kidForm.age}
                  onChange={(e) => setKidForm({ ...kidForm, age: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={kidForm.dateOfBirth}
                  onChange={(e) => setKidForm({ ...kidForm, dateOfBirth: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="form-submit" disabled={loading}>
                {loading ? (editingKidId ? 'Updating...' : 'Adding...') : (editingKidId ? 'Update Child' : 'Add Child')}
              </button>
            </form>
          )}

          {kids.length > 0 && (
            <div className="kids-list">
              {kids.map((kid) => (
                <div key={kid.id} className="kid-item">
                  <div className="kid-info">
                    <p className="kid-name">{kid.name}</p>
                    <p className="kid-age">Age: {kid.age} years | DOB: {kid.dateOfBirth}</p>
                  </div>
                  <div className="kid-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditKid(kid)}
                      title="Edit kid"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteKid(kid.id)}
                      title="Delete kid"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Token Card */}
        <div className="service-card request-token-card">
          <div className="card-header">
            <span className="card-icon">🎫</span>
            <h2>Request Token</h2>
          </div>
          <p className="card-description">Get an appointment slot</p>
          
          {currentToken ? (
            currentToken.status === 'cleared' ? (
              // Token completed - show feedback form
              <div className="completed-token-message">
                <div className="message-icon">✅</div>
                <p className="message-title">Your Appointment is Complete!</p>
                <p className="message-text">Thank you for visiting us. We would love to hear about your experience.</p>
                
                {!showFeedbackForm ? (
                  <div className="completed-actions">
                    <button 
                      className="feedback-btn"
                      onClick={() => setShowFeedbackForm(true)}
                    >
                      ⭐ Give Feedback & Rating
                    </button>
                  </div>
                ) : (
                  <form className="feedback-form" onSubmit={handleSubmitFeedback}>
                    <div className="form-group">
                      <label>How was your experience? *</label>
                      <select 
                        value={feedbackForm.experience}
                        onChange={(e) => setFeedbackForm({...feedbackForm, experience: e.target.value})}
                        required
                      >
                        <option value="excellent">⭐⭐⭐⭐⭐ Excellent</option>
                        <option value="good">⭐⭐⭐⭐ Good</option>
                        <option value="average">⭐⭐⭐ Average</option>
                        <option value="poor">⭐⭐ Poor</option>
                        <option value="veryPoor">⭐ Very Poor</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Rating (1-5) *</label>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            className={`star ${feedbackForm.rating >= star ? 'active' : ''}`}
                            onClick={() => setFeedbackForm({...feedbackForm, rating: star})}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <small>Selected: {feedbackForm.rating}/5</small>
                    </div>

                    <div className="form-group">
                      <label>Your Comments (Optional)</label>
                      <textarea
                        value={feedbackForm.comment}
                        onChange={(e) => setFeedbackForm({...feedbackForm, comment: e.target.value})}
                        placeholder="Share your thoughts about your appointment..."
                        rows="3"
                      />
                    </div>

                    <div className="feedback-actions">
                      <button 
                        type="submit"
                        className="submit-feedback-btn"
                        disabled={submittingFeedback}
                      >
                        {submittingFeedback ? '📤 Submitting...' : '✓ Submit Feedback'}
                      </button>
                      <button 
                        type="button"
                        className="skip-feedback-btn"
                        onClick={() => {
                          setShowFeedbackForm(false)
                          setCurrentToken(null)
                          setQueueInfo(null)
                          fetchTokenSlots()
                        }}
                      >
                        Skip for Now
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              // Active token - show in progress message
              <div className="already-token-message">
                <div className="message-icon">⏳</div>
                <p className="message-title">Token in Progress</p>
                <p className="message-text">You already have an active token. Please complete your appointment.</p>
                <p className="token-info">Current Token: <strong>#{currentToken.tokenNumber}</strong> in {queueInfo?.slotName}</p>
                <button 
                  className="cancel-token-btn"
                  onClick={handleCancelPatientToken}
                  disabled={loading}
                >
                  🚫 Cancel Token
                </button>
              </div>
            )
          ) : !showTokenRequestForm ? (
            <>
              {tokenSlots.length === 0 ? (
                <div className="no-slots-message">
                  <p>No available slots for today</p>
                  <small>Please check back later</small>
                </div>
              ) : (
                <>
                  <div className="slots-grid">
                    {tokenSlots.map((slot) => {
                      const isDisabledByAvailability = slot.tokensAvailable === 0
                      const isDisabledByTime = new Date() >= new Date(`${new Date().toISOString().split('T')[0]}T${slot.startTime}:00`)
                      const isDisabledOverall = slot.isDisabled || isDisabledByAvailability || loading
                      // Get appropriate tooltip message based on disable reason
                      let disabledMessage = 'Select this slot'
                      if (slot.isDisabled) {
                        if (slot.disableReason === 'slot-expired') {
                          disabledMessage = '❌ This slot has expired - no longer accepting requests'
                        } else if (slot.disableReason === 'user-has-token') {
                          disabledMessage = '❌ You already have a token in this slot'
                        } else if (slot.disableReason === 'unhandled-tokens') {
                          disabledMessage = '⚠️ Slot disabled - unhandled tokens (admin did not clear or user did not cancel past deadline)'
                        }
                      } else if (isDisabledByAvailability) {
                        disabledMessage = '❌ No tokens available'
                      }
                      
                      return (
                        <div 
                          key={slot.id} 
                          className={`slot-option ${isDisabledOverall ? 'disabled' : ''} ${
                            slot.disableReason === 'user-has-token' ? 'disabled-user-token' :
                            slot.disableReason === 'slot-expired' ? 'disabled-expired' :
                            slot.disableReason === 'unhandled-tokens' ? 'disabled-unhandled' : ''
                          }`}
                          title={disabledMessage}
                        >
                          <h4>{slot.name}</h4>
                          <p className="slot-time">{slot.startTime} - {slot.endTime}</p>
                          <p className="slot-available">
                            Available: <strong>{slot.tokensAvailable}/{slot.tokensAllocated}</strong>
                          </p>
                          {isDisabledOverall && (
                            <p className="slot-disabled-reason">
                              {slot.disableReason === 'slot-expired' && '⏰ Slot Expired'}
                              {slot.disableReason === 'user-has-token' && '👤 You Have Token'}
                              {slot.disableReason === 'unhandled-tokens' && '⚠️ Unhandled Tokens'}
                              {isDisabledByAvailability && !slot.isDisabled && '📭 No Tokens'}
                            </p>
                          )}
                          <button
                            className="select-slot-btn"
                            onClick={() => {
                              setSelectedSlotId(slot.id)
                              setShowTokenRequestForm(true)
                            }}
                            disabled={isDisabledOverall}
                            title={disabledMessage}
                          >
                            {isDisabledByTime ? '⏰ Already Started' : isDisabledByAvailability ? '❌ Full' : '📝 Select'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <form className="token-request-form" onSubmit={handleRequestToken}>
              <div className="form-group">
                <label>Case Number *</label>
                <input
                  type="text"
                  placeholder="Enter case number"
                  value={tokenRequestForm.caseNumber}
                  onChange={(e) => setTokenRequestForm({...tokenRequestForm, caseNumber: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason for Visit *</label>
                <textarea
                  placeholder="Describe your reason for visit"
                  value={tokenRequestForm.reason}
                  onChange={(e) => setTokenRequestForm({...tokenRequestForm, reason: e.target.value})}
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label>Contact Number *</label>
                <input
                  type="tel"
                  placeholder="Enter your contact number"
                  value={tokenRequestForm.contactNumber}
                  onChange={(e) => setTokenRequestForm({...tokenRequestForm, contactNumber: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Dependent Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Name of child or dependent"
                  value={tokenRequestForm.dependentName}
                  onChange={(e) => setTokenRequestForm({...tokenRequestForm, dependentName: e.target.value})}
                />
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="card-btn submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Requesting...' : '✓ Request Token'}
                </button>
                <button 
                  type="button" 
                  className="card-btn cancel-btn"
                  onClick={() => {
                    setShowTokenRequestForm(false)
                    setSelectedSlotId(null)
                  }}
                  disabled={loading}
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live Token Status Card */}
        <div className="service-card status-card">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <h2>Token Status</h2>
          </div>
          <p className="card-description">Your appointment details</p>
          
          {currentToken && queueInfo ? (
            <div className="compact-status-content">
              {/* Token Number - Large Display */}
              <div className="token-number-display">
                <div className="token-circle">#{currentToken.tokenNumber}</div>
                <p className="slot-name">{queueInfo.slotName}</p>
              </div>

              {/* Key Info Summary */}
              <div className="status-summary">
                <div className="summary-item">
                  <span className="summary-label">Position</span>
                  <span className="summary-value">{queueInfo.patientsAhead + 1} / {queueInfo.patientsWaiting}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Arrival Time</span>
                  <span className="summary-value">{currentToken.expectedArrivalTime}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="token-status-compact">
                <span className={`status-badge ${currentToken.status || 'pending'}`}>
                  {currentToken.status === 'cleared' ? '✅ Consultation Complete' : '⏳ Waiting for Turn'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="card-actions">
                <button
                  className="card-btn view-details-btn"
                  onClick={() => setShowTokenDetailsModal(true)}
                >
                  📋 View Details
                </button>
                {currentToken.status !== 'cleared' && (
                  <button
                    className="card-btn cancel-token-btn"
                    onClick={handleCancelPatientToken}
                    disabled={loading}
                  >
                    ❌ Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="no-token-message">
              <p>No active token request</p>
              <small>Go to "Request Token" card above to get a token</small>
            </div>
          )}
        </div>

        {/* Token Details Modal */}
        {showTokenDetailsModal && currentToken && queueInfo && (
          <div className="modal-overlay" onClick={() => setShowTokenDetailsModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Token Details</h2>
                <button 
                  className="modal-close-btn"
                  onClick={() => setShowTokenDetailsModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {/* Token Number Section */}
                <div className="modal-section token-section">
                  <div className="token-display-modal">
                    <div className="token-number-large">#{currentToken.tokenNumber}</div>
                    <p className="slot-badge-modal">{queueInfo.slotName}</p>
                  </div>
                </div>

                {/* Queue Information */}
                <div className="modal-section">
                  <h3>Queue Information</h3>
                  <div className="info-grid">
                    <div className="info-card">
                      <span className="info-label">Position in Queue</span>
                      <span className="info-value">{queueInfo.patientsAhead + 1} of {queueInfo.patientsWaiting}</span>
                    </div>
                    <div className="info-card">
                      <span className="info-label">Patients Ahead</span>
                      <span className="info-value">{queueInfo.patientsAhead}</span>
                    </div>
                    <div className="info-card">
                      <span className="info-label">Total Waiting</span>
                      <span className="info-value">{queueInfo.patientsWaiting}</span>
                    </div>
                    <div className="info-card">
                      <span className="info-label">Available Tokens</span>
                      <span className="info-value">{queueInfo.availableTokens}</span>
                    </div>
                  </div>
                </div>

                {/* Arrival Time */}
                <div className="modal-section arrival-section">
                  <h3>Expected Arrival Time</h3>
                  <div className="arrival-display">
                    <p className="arrival-time">{currentToken.expectedArrivalTime}</p>
                    <p className="arrival-subtitle">
                      ~{queueInfo.patientsAhead * 5} minutes from slot start
                    </p>
                  </div>
                </div>

                {/* Case Details */}
                <div className="modal-section case-section">
                  <h3>Case Details</h3>
                  <div className="case-info">
                    <div className="case-row">
                      <span className="case-label">Case Number:</span>
                      <span className="case-value">{currentToken.caseNumber}</span>
                    </div>
                    <div className="case-row">
                      <span className="case-label">Contact Number:</span>
                      <span className="case-value">{currentToken.contactNumber}</span>
                    </div>
                    <div className="case-row">
                      <span className="case-label">Reason for Visit:</span>
                      <span className="case-value">{currentToken.reason}</span>
                    </div>
                    {currentToken.dependentName && (
                      <div className="case-row">
                        <span className="case-label">Dependent Name:</span>
                        <span className="case-value">{currentToken.dependentName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="modal-section status-section">
                  <span className={`status-badge ${currentToken.status || 'pending'}`}>
                    {currentToken.status === 'cleared' ? '✅ Consultation Complete' : '⏳ Waiting for Turn'}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                {currentToken.status !== 'cleared' && (
                  <button
                    className="modal-btn cancel-btn"
                    onClick={() => {
                      handleCancelPatientToken()
                      setShowTokenDetailsModal(false)
                    }}
                    disabled={loading}
                  >
                    ❌ Cancel Token
                  </button>
                )}
                <button
                  className="modal-btn close-btn"
                  onClick={() => setShowTokenDetailsModal(false)}
                >
                  ✓ Close
                </button>
              </div>
            </div>
          </div>
        )}        {/* Vaccine Schedules Card */}
        <div className="service-card vaccine-card">
          <div className="card-header">
            <span className="card-icon">💉</span>
            <h2>Vaccine Schedules</h2>
          </div>
          <p className="card-description">Track vaccination plans for your kids</p>
          
          {kids.length > 0 ? (
            <div className="vaccine-selection">
              <label htmlFor="select-kid">Select Kid:</label>
              <select
                id="select-kid"
                onChange={(e) => setSelectedKidVaccines(e.target.value)}
                value={selectedKidVaccines || ''}
              >
                <option value="">Choose a child...</option>
                {kids.map(kid => (
                  <option key={kid.id} value={kid.age}>{kid.name} ({kid.age} years)</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="vaccine-notice">Add kids first to view vaccine schedules</p>
          )}

          {selectedKidVaccines && vaccineSchedules.length > 0 && (
            <div className="vaccine-list">
              {vaccineSchedules
                .filter(schedule => {
                  const [minAge, maxAge] = schedule.ageGroup.split('-').map(Number)
                  return selectedKidVaccines >= minAge && selectedKidVaccines <= maxAge
                })
                .map(vaccine => (
                  <div key={vaccine.id} className="vaccine-item">
                    <div className="vaccine-name">{vaccine.name}</div>
                    <div className="vaccine-details">
                      <span className="due-date">📅 {vaccine.dueDate}</span>
                      <span className="vaccines-given">💉 {vaccine.vaccines}</span>
                    </div>
                    {vaccine.description && (
                      <div className="vaccine-notes">{vaccine.description}</div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {selectedKidVaccines && vaccineSchedules.length > 0 && 
            vaccineSchedules.filter(schedule => {
              const [minAge, maxAge] = schedule.ageGroup.split('-').map(Number)
              return selectedKidVaccines >= minAge && selectedKidVaccines <= maxAge
            }).length === 0 && (
            <p className="vaccine-notice">No vaccines scheduled for this age group</p>
          )}

          {vaccineSchedules.length === 0 && selectedKidVaccines && (
            <p className="vaccine-notice">No vaccine schedules available</p>
          )}
        </div>

        {/* Pharmacy Medicines Card */}
        <div className="service-card pharmacy-card">
          <div className="card-header">
            <span className="card-icon">💊</span>
            <h2>Pharmacy Medicines</h2>
          </div>
          <p className="card-description">Prescription & medicines</p>
          <div className="pharmacy-info">
            <p className="info-text">View and manage your medicines</p>
            <p className="info-text">Get delivery at home</p>
            <p className="info-text">Best prices guaranteed</p>
          </div>
          <button 
            className="card-btn" 
            onClick={onPharmacyClick}
            disabled={kids.length === 0}
            title={kids.length === 0 ? 'Add kids first to view medicines' : ''}
          >
            🛒 {kids.length === 0 ? 'Add Kids First' : 'Shop Medicines'}
          </button>
        </div>

        {/* Baby Products Card */}
        <div className="service-card products-card">
          <div className="card-header">
            <span className="card-icon">🍼</span>
            <h2>Baby Products</h2>
          </div>
          <p className="card-description">Essential baby care items</p>
          <div className="products-info">
            <p className="info-text">Diapers & wipes</p>
            <p className="info-text">Baby food & formula</p>
            <p className="info-text">Toys & gear</p>
          </div>
          <button className="card-btn">🛍️ Shop Now</button>
        </div>
      </div>

      {/* All News Section */}
      {news.length > 0 && (
        <div className="all-news-section">
          <h2>📰 Latest Updates</h2>
          <div className="news-list">
            {news.map((item) => (
              <div key={item.id} className="news-item">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <span className="news-date">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PatientDashboard
