import { useState, useEffect } from 'react'
import { ref, onValue, get } from 'firebase/database'
import { database } from '../firebaseConfig'
import './CurrentTokenBanner.css'

function CurrentTokenBanner({ userToken }) {
  const [currentToken, setCurrentToken] = useState(null)
  const [timeToUser, setTimeToUser] = useState(null)
  const [pendingTokens, setPendingTokens] = useState(0)
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  // Real-time listener for current token
  useEffect(() => {
    const currentTokenRef = ref(database, `clinicStatus/${today}/currentToken`)
    
    const unsubscribe = onValue(currentTokenRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentToken(snapshot.val())
      }
      setLoading(false)
    }, (error) => {
      console.error('Error fetching current token:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [today])

  // Calculate time to user's turn
  useEffect(() => {
    if (userToken && currentToken) {
      const currentNum = currentToken.number
      const userNum = userToken.tokenNumber
      
      if (userNum > currentNum) {
        const tokensDifference = userNum - currentNum
        const minutesPerToken = 5 // Standard 5 minutes per patient
        const estimatedMinutes = tokensDifference * minutesPerToken
        
        const hours = Math.floor(estimatedMinutes / 60)
        const minutes = estimatedMinutes % 60
        
        if (hours > 0) {
          setTimeToUser(`${hours}h ${minutes}m`)
        } else {
          setTimeToUser(`${minutes}m`)
        }
        
        setPendingTokens(tokensDifference - 1)
      } else if (userNum === currentNum) {
        setTimeToUser('Your Turn Now!')
        setPendingTokens(0)
      } else {
        setTimeToUser('Completed')
        setPendingTokens(0)
      }
    }
  }, [userToken, currentToken])

  if (loading) {
    return (
      <div className="current-token-banner">
        <div className="banner-content">Loading current token...</div>
      </div>
    )
  }

  if (!currentToken) {
    return (
      <div className="current-token-banner empty">
        <div className="banner-content">
          <p>⏳ No tokens being served currently</p>
        </div>
      </div>
    )
  }

  return (
    <div className="current-token-banner">
      <div className="banner-content">
        {/* Currently Running Token */}
        <div className="token-section">
          <div className="section-label">Currently Running</div>
          <div className="token-display">
            <span className="token-number">{currentToken.number}</span>
            <span className={`token-type ${currentToken.type}`}>
              {currentToken.type === 'online' ? '📱 Online' : '📋 Offline'}
            </span>
          </div>
          <small className="slot-name">{currentToken.slotName}</small>
        </div>

        {/* Divider */}
        <div className="divider"></div>

        {/* User's Token Info */}
        {userToken ? (
          <div className="user-token-section">
            <div className="section-label">Your Token</div>
            <div className="user-token-info">
              <div className="user-token-number">#{userToken.tokenNumber}</div>
              <div className="user-token-meta">
                <div className="meta-item">
                  <span className="meta-label">Status</span>
                  <span className="meta-value">
                    {timeToUser === 'Your Turn Now!' ? '🟢 Now' : timeToUser === 'Completed' ? '✅ Done' : '⏳ Waiting'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Time Left</span>
                  <span className={`meta-value ${timeToUser === 'Your Turn Now!' ? 'urgent' : ''}`}>
                    {timeToUser}
                  </span>
                </div>
                {pendingTokens > 0 && (
                  <div className="meta-item">
                    <span className="meta-label">Patients Ahead</span>
                    <span className="meta-value">{pendingTokens}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="no-user-token">
            <p>📭 You haven't requested a token yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CurrentTokenBanner
