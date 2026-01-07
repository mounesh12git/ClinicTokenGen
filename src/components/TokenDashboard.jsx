import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './TokenDashboard.css'

const generateToken = () => {
  return `TOKEN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

function TokenDashboard({ userInfo, onLogout }) {
  const [tokens, setTokens] = useState([])
  const [currentToken, setCurrentToken] = useState(null)
  const [maxTokens, setMaxTokens] = useState(10)
  const [stats, setStats] = useState({
    totalIssued: 0,
    tokenLimitReached: false
  })

  // Initialize with existing tokens from userInfo
  useEffect(() => {
    if (userInfo?.tokenCount > 0) {
      const initialTokens = Array(userInfo.tokenCount).fill(null).map(() => ({
        id: uuidv4(),
        token: generateToken(),
        createdAt: new Date(),
        status: 'active'
      }))
      setTokens(initialTokens)
      if (initialTokens.length > 0) {
        setCurrentToken(initialTokens[initialTokens.length - 1])
      }
      setStats({
        totalIssued: initialTokens.length,
        tokenLimitReached: initialTokens.length >= maxTokens
      })
    }
  }, [userInfo])

  const issueNewToken = () => {
    if (tokens.length >= maxTokens) {
      setStats(prev => ({
        ...prev,
        tokenLimitReached: true
      }))
      return
    }

    const newToken = {
      id: uuidv4(),
      token: generateToken(),
      createdAt: new Date(),
      status: 'active'
    }

    setTokens([...tokens, newToken])
    setCurrentToken(newToken)

    setStats({
      totalIssued: tokens.length + 1,
      tokenLimitReached: tokens.length + 1 >= maxTokens
    })
  }

  const revokeToken = (tokenId) => {
    setTokens(tokens.map(t =>
      t.id === tokenId ? { ...t, status: 'revoked' } : t
    ))
  }

  const deleteToken = (tokenId) => {
    const updatedTokens = tokens.filter(t => t.id !== tokenId)
    setTokens(updatedTokens)

    if (currentToken?.id === tokenId) {
      setCurrentToken(updatedTokens.length > 0 ? updatedTokens[updatedTokens.length - 1] : null)
    }

    setStats({
      totalIssued: updatedTokens.length,
      tokenLimitReached: updatedTokens.length >= maxTokens
    })
  }

  const copyToClipboard = (token) => {
    navigator.clipboard.writeText(token)
    alert('Token copied to clipboard!')
  }

  const activeTokens = tokens.filter(t => t.status === 'active')
  const revokedTokens = tokens.filter(t => t.status === 'revoked')

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>🎫 Token Management Dashboard</h1>
            <p className="welcome-text">Welcome, <strong>{userInfo?.name || userInfo?.email}</strong></p>
          </div>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* User Info Card */}
        <div className="user-info-card">
          <h3>User Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Email</label>
              <p>{userInfo?.email}</p>
            </div>
            <div className="info-item">
              <label>Mobile</label>
              <p>{userInfo?.mobile}</p>
            </div>
            <div className="info-item">
              <label>User ID</label>
              <p>{userInfo?.id}</p>
            </div>
            <div className="info-item">
              <label>Member Since</label>
              <p>{new Date(userInfo?.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Current Token Card */}
        {currentToken && (
          <div className="current-token-card">
            <h3>📌 Current Running Token</h3>
            <div className="token-display">
              <div className="token-content">
                <p className="token-value">{currentToken.token}</p>
                <div className="token-meta">
                  <span className="token-status">Status: <strong className="status-active">Active</strong></span>
                  <span className="token-time">Generated: {currentToken.createdAt.toLocaleTimeString()}</span>
                </div>
              </div>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(currentToken.token)}
              >
                📋 Copy
              </button>
            </div>
          </div>
        )}

        {/* Token Stats */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-value">{activeTokens.length}</div>
            <div className="stat-label">Active Tokens</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{revokedTokens.length}</div>
            <div className="stat-label">Revoked Tokens</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{maxTokens - activeTokens.length}</div>
            <div className="stat-label">Remaining Quota</div>
          </div>
          <div className={`stat-card ${stats.tokenLimitReached ? 'limit-reached' : ''}`}>
            <div className="stat-value">{activeTokens.length}/{maxTokens}</div>
            <div className="stat-label">Usage</div>
          </div>
        </div>

        {/* Issue Token Section */}
        <div className="action-section">
          <h3>🆕 Issue New Token</h3>
          {stats.tokenLimitReached ? (
            <div className="limit-warning">
              <p>⚠️ <strong>Token Limit Reached!</strong></p>
              <p>You have reached the maximum limit of {maxTokens} tokens. Revoke or delete some tokens to issue new ones.</p>
            </div>
          ) : (
            <button className="issue-token-btn" onClick={issueNewToken}>
              + Generate Next Token
            </button>
          )}
        </div>

        {/* Tokens List */}
        <div className="tokens-section">
          <h3>📋 All Tokens</h3>

          {activeTokens.length > 0 && (
            <div className="tokens-category">
              <h4>Active Tokens ({activeTokens.length})</h4>
              <div className="tokens-list">
                {activeTokens.map((token, index) => (
                  <div key={token.id} className="token-item active">
                    <div className="token-info">
                      <div className="token-number">#{index + 1}</div>
                      <div className="token-details">
                        <p className="token-text">{token.token}</p>
                        <p className="token-time">{token.createdAt.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="token-actions">
                      <button
                        className="action-btn copy-small"
                        onClick={() => copyToClipboard(token.token)}
                        title="Copy token"
                      >
                        📋
                      </button>
                      <button
                        className="action-btn revoke-btn"
                        onClick={() => revokeToken(token.id)}
                        title="Revoke token"
                      >
                        🚫
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => deleteToken(token.id)}
                        title="Delete token"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {revokedTokens.length > 0 && (
            <div className="tokens-category">
              <h4>Revoked Tokens ({revokedTokens.length})</h4>
              <div className="tokens-list">
                {revokedTokens.map((token, index) => (
                  <div key={token.id} className="token-item revoked">
                    <div className="token-info">
                      <div className="token-number">#{tokens.indexOf(token) + 1}</div>
                      <div className="token-details">
                        <p className="token-text">{token.token}</p>
                        <p className="token-time">{token.createdAt.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="token-actions">
                      <button
                        className="action-btn delete-btn"
                        onClick={() => deleteToken(token.id)}
                        title="Delete token"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tokens.length === 0 && (
            <div className="empty-state">
              <p>No tokens generated yet. Click "Generate Next Token" to create one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TokenDashboard
