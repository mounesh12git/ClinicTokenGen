import { useState, useRef } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, database, googleProvider, setupRecaptcha, clearRecaptchaVerifier } from '../firebaseConfig'
import AdsDisplay from './AdsDisplay'
import './LoginPage.css'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [authMethod, setAuthMethod] = useState('email')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtp, setEmailOtp] = useState('')
  const [pendingSignupData, setPendingSignupData] = useState(null)
  const [generatedOtp, setGeneratedOtp] = useState(null)
  const [otpExpiry, setOtpExpiry] = useState(null)
  const confirmationResultRef = useRef(null)

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  const saveUserToDatabase = async (userId, userData, role = 'patient') => {
    try {
      const userRef = ref(database, `users/${userId}`)
      const userWithRole = {
        ...userData,
        role: role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await set(userRef, userWithRole)
      return userWithRole
    } catch (error) {
      console.error('Error saving to database:', error)
      throw error
    }
  }

  const getUserFromDatabase = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`)
      const snapshot = await get(userRef)
      if (snapshot.exists()) {
        return snapshot.val()
      }
      return null
    } catch (error) {
      console.error('Error fetching user from database:', error)
      return null
    }
  }

  // Generate 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Send OTP to email (displays in alert and console)
  const sendEmailOTP = async (emailAddress, otpCode) => {
    try {
      console.log(`📧 Email OTP for ${emailAddress}: ${otpCode}`)
      
      // Show alert with OTP
      alert(`📧 Email OTP Code\n\nEmail: ${emailAddress}\nOTP: ${otpCode}\n\nValid for 5 minutes\n\n(In production, this would be sent via email)`)
      
      return true
    } catch (error) {
      console.error('Error with OTP:', error)
      return false
    }
  }

  // Handle email signup - send OTP step
  const handleEmailSignupSendOTP = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (!email) {
        setError('Email is required')
        setLoading(false)
        return
      }

      if (!password || !confirmPassword) {
        setError('Password is required')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('Invalid email address')
        setLoading(false)
        return
      }

      // Generate OTP
      const newOtp = generateOTP()
      const expiryTime = Date.now() + 5 * 60 * 1000 // 5 minutes expiry
      
      setGeneratedOtp(newOtp)
      setOtpExpiry(expiryTime)

      // Store signup data temporarily
      setPendingSignupData({
        email,
        password,
        mobile: mobile || 'Not provided',
        name: email.split('@')[0]
      })

      // Send OTP to email
      const sent = await sendEmailOTP(email, newOtp)
      
      if (sent) {
        setEmailOtpSent(true)
        setSuccess(`OTP sent to ${email}! Check the alert popup. Valid for 5 minutes.`)
      } else {
        setError('Failed to generate OTP. Please try again.')
      }
    } catch (error) {
      console.error('Signup error:', error)
      setError(error.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Verify email OTP and complete signup
  const handleEmailOTPVerify = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (!emailOtp) {
        setError('Please enter the OTP')
        setLoading(false)
        return
      }

      // Check OTP expiry
      if (Date.now() > otpExpiry) {
        setError('OTP expired. Please request a new one.')
        setEmailOtpSent(false)
        setGeneratedOtp(null)
        setOtpExpiry(null)
        setLoading(false)
        return
      }

      // Verify OTP
      if (emailOtp !== generatedOtp) {
        setError('Invalid OTP. Please try again.')
        setLoading(false)
        return
      }

      // OTP is correct, create account
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          pendingSignupData.email,
          pendingSignupData.password
        )
        const user = userCredential.user

        const userData = {
          id: user.uid,
          email: user.email,
          mobile: pendingSignupData.mobile,
          name: pendingSignupData.name,
          tokenCount: 0,
          maxTokens: 10,
          photoURL: user.photoURL || null
        }

        const savedUser = await saveUserToDatabase(user.uid, userData, 'patient')

        setSuccess('Account created successfully!')
        
        // Reset states
        setEmail('')
        setMobile('')
        setPassword('')
        setConfirmPassword('')
        setEmailOtp('')
        setEmailOtpSent(false)
        setGeneratedOtp(null)
        setOtpExpiry(null)
        setPendingSignupData(null)

        setTimeout(() => {
          onLogin(pendingSignupData.email, pendingSignupData.mobile, savedUser)
        }, 1500)
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          setError('This email is already registered. Please login instead.')
          // Reset OTP but keep email visible for retry
          setEmailOtpSent(false)
          setEmailOtp('')
          setGeneratedOtp(null)
          setOtpExpiry(null)
          setPendingSignupData(null)
        } else if (authError.code === 'auth/weak-password') {
          setError('Password is too weak. Use at least 6 characters.')
        } else {
          setError(authError.message)
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      setError(error.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (!email || !password) {
        setError('Email and password are required')
        setLoading(false)
        return
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const dbUser = await getUserFromDatabase(user.uid)

      if (dbUser) {
        setSuccess('Login successful!')
        setTimeout(() => {
          onLogin(email, mobile, dbUser)
        }, 1000)
      } else {
        setError('User data not found')
      }

      setEmail('')
      setMobile('')
      setPassword('')
    } catch (error) {
      console.error('Login error:', error)
      if (error.code === 'auth/user-not-found') {
        setError('Email not found. Please sign up first.')
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password')
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSignup = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (!mobile || mobile.length < 10) {
        setError('Enter a valid mobile number')
        setLoading(false)
        return
      }

      const phoneNumber = '+91' + mobile
      const recaptcha = setupRecaptcha()

      if (!recaptcha) {
        setError('reCAPTCHA not initialized. Please refresh and try again.')
        setLoading(false)
        return
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptcha)
      confirmationResultRef.current = confirmationResult
      setOtpSent(true)
      setSuccess('OTP sent to your phone number')
    } catch (error) {
      console.error('Phone signup error:', error)
      if (error.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format')
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError(error.message || 'Failed to send OTP')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerify = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (!otp || otp.length < 6) {
        setError('Enter a valid 6-digit OTP')
        setLoading(false)
        return
      }

      const result = await confirmationResultRef.current.confirm(otp)
      const user = result.user

      const userData = {
        id: user.uid,
        email: user.email || 'Not provided',
        mobile: mobile,
        name: mobile,
        tokenCount: 0,
        maxTokens: 10,
        photoURL: user.photoURL || null
      }

      const savedUser = await saveUserToDatabase(user.uid, userData, 'patient')

      setSuccess('Account created successfully!')
      setTimeout(() => {
        onLogin('phone', mobile, savedUser)
      }, 1000)

      setMobile('')
      setOtp('')
      setOtpSent(false)
    } catch (error) {
      console.error('OTP verification error:', error)
      setError('Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (!mobile || mobile.length < 10) {
        setError('Enter a valid mobile number')
        setLoading(false)
        return
      }

      const phoneNumber = '+91' + mobile
      const recaptcha = setupRecaptcha()

      if (!recaptcha) {
        setError('reCAPTCHA not initialized. Please refresh and try again.')
        setLoading(false)
        return
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptcha)
      confirmationResultRef.current = confirmationResult
      setOtpSent(true)
      setSuccess('OTP sent to your phone number')
    } catch (error) {
      console.error('Phone login error:', error)
      if (error.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format')
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError(error.message || 'Failed to send OTP')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpLoginVerify = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (!otp || otp.length < 6) {
        setError('Enter a valid 6-digit OTP')
        setLoading(false)
        return
      }

      const result = await confirmationResultRef.current.confirm(otp)
      const user = result.user

      const dbUser = await getUserFromDatabase(user.uid)

      if (dbUser) {
        setSuccess('Login successful!')
        setTimeout(() => {
          onLogin('phone', mobile, dbUser)
        }, 1000)
      } else {
        setError('User not found. Please sign up first.')
      }

      setMobile('')
      setOtp('')
      setOtpSent(false)
    } catch (error) {
      console.error('OTP login verification error:', error)
      setError('Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    clearMessages()
    setLoading(true)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      let dbUser = await getUserFromDatabase(user.uid)

      if (!dbUser) {
        const userData = {
          id: user.uid,
          email: user.email,
          mobile: mobile || 'Not provided',
          name: user.displayName || 'Google User',
          tokenCount: 0,
          maxTokens: 10,
          photoURL: user.photoURL || null
        }
        dbUser = await saveUserToDatabase(user.uid, userData, 'patient')
      }

      setSuccess('Logged in with Google successfully!')
      setTimeout(() => {
        onLogin(user.email, mobile, dbUser)
      }, 1000)
    } catch (error) {
      console.error('Google login error:', error)
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login popup was closed')
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      const hardcodedAdminEmail = 'admin@hospital.com'
      const hardcodedAdminPassword = 'admin123456'
      const hardcodedPharmaEmail = 'pharma@hospital.com'
      const hardcodedPharmaPassword = 'pharma123456'

      // Admin login
      if (email === hardcodedAdminEmail && adminPassword === hardcodedAdminPassword) {
        const adminData = {
          id: 'admin-001',
          email: email,
          name: 'Hospital Admin',
          role: 'admin',
          mobile: mobile || 'Not provided',
          createdAt: new Date().toISOString(),
          tokenCount: 0,
          maxTokens: 100,
          photoURL: null
        }

        setSuccess('Admin login successful!')
        setTimeout(() => {
          onLogin(email, mobile, adminData)
        }, 1000)

        setEmail('')
        setAdminPassword('')
        setMobile('')
      }
      // Pharma Owner login
      else if (email === hardcodedPharmaEmail && adminPassword === hardcodedPharmaPassword) {
        const pharmaData = {
          id: 'pharma-001',
          email: email,
          name: 'Pharmacy Owner',
          role: 'pharmaowner',
          mobile: mobile || 'Not provided',
          createdAt: new Date().toISOString(),
          photoURL: null
        }

        setSuccess('Pharmacy login successful!')
        setTimeout(() => {
          onLogin(email, mobile, pharmaData)
        }, 1000)

        setEmail('')
        setAdminPassword('')
        setMobile('')
      }
      else {
        setError('Invalid admin credentials')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (!email) {
        setError('Please enter your email address')
        setLoading(false)
        return
      }

      await sendPasswordResetEmail(auth, email)
      setSuccess('Password reset email sent! Check your inbox.')
      setShowForgotPassword(false)
      setEmail('')
    } catch (error) {
      console.error('Password reset error:', error)
      if (error.code === 'auth/user-not-found') {
        setError('Email not found')
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <AdsDisplay location="login" />
      <div className="login-card">
        <h1>🎫 Token Generator</h1>
        
        {!isAdminLogin && !showForgotPassword && (
          <div className="user-type-selector">
            <button
              type="button"
              className="user-type-btn"
              onClick={() => setIsAdminLogin(false)}
            >
              👤 Patient
            </button>
            <button
              type="button"
              className="user-type-btn"
              onClick={() => setIsAdminLogin(true)}
            >
              🔐 Admin
            </button>
          </div>
        )}

        <p className="subtitle">
          {showForgotPassword
            ? 'Reset your password'
            : isAdminLogin
              ? 'Admin Login'
              : isSignup
                ? 'Create your account'
                : 'Login to your account'}
        </p>

        {error && <div className="error-message">❌ {error}</div>}
        {success && <div className="success-message">✅ {success}</div>}

        {isAdminLogin && !showForgotPassword ? (
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label htmlFor="admin-email">Admin Email</label>
              <input
                id="admin-email"
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">Admin Password</label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Admin Login'}
            </button>

            <button
              type="button"
              className="toggle-btn"
              onClick={() => {
                setIsAdminLogin(false)
                clearMessages()
                setEmail('')
                setAdminPassword('')
              }}
            >
              Back to Patient Login
            </button>
          </form>
        ) : showForgotPassword ? (
          <form onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label htmlFor="reset-email">Email Address</label>
              <input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>

            <button
              type="button"
              className="toggle-btn"
              onClick={() => {
                setShowForgotPassword(false)
                clearMessages()
                setEmail('')
              }}
            >
              Back to Login
            </button>
          </form>
        ) : isSignup ? (
          <>
            <div className="auth-method-selector">
              <button
                type="button"
                className={`method-btn ${authMethod === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMethod('email')
                  setOtpSent(false)
                  clearMessages()
                }}
              >
                📧 Email
              </button>
              <button
                type="button"
                className={`method-btn ${authMethod === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMethod('phone')
                  setOtpSent(false)
                  clearMessages()
                }}
              >
                📱 Phone
              </button>
            </div>

            {authMethod === 'email' && (
              <form onSubmit={emailOtpSent ? handleEmailOTPVerify : handleEmailSignupSendOTP}>
                {!emailOtpSent ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="signup-email">Email Address</label>
                      <input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={emailOtpSent}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="signup-mobile">Mobile Number (Optional)</label>
                      <input
                        id="signup-mobile"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.slice(0, 10))}
                        maxLength="10"
                        disabled={emailOtpSent}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="signup-password">Password</label>
                      <input
                        id="signup-password"
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={emailOtpSent}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirm-password">Confirm Password</label>
                      <input
                        id="confirm-password"
                        type="password"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={emailOtpSent}
                      />
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? 'Sending OTP...' : 'Send OTP to Email'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="otp-verification-box">
                      <p className="otp-message">📧 OTP sent to <strong>{email}</strong></p>
                      <p className="otp-subtext">Enter the 6-digit code sent to your email</p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="email-otp">Enter OTP</label>
                      <input
                        id="email-otp"
                        type="text"
                        placeholder="6-digit OTP"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.slice(0, 6))}
                        maxLength="6"
                        required
                      />
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify OTP & Create Account'}
                    </button>

                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() => {
                        setEmailOtpSent(false)
                        setEmailOtp('')
                        setGeneratedOtp(null)
                        setOtpExpiry(null)
                        setPendingSignupData(null)
                        clearMessages()
                      }}
                    >
                      Change Email
                    </button>
                  </>
                )}
              </form>
            )}

            {authMethod === 'phone' && (
              <form onSubmit={!otpSent ? handlePhoneSignup : handleOtpVerify}>
                {!otpSent ? (
                  <div className="form-group">
                    <label htmlFor="phone">Mobile Number</label>
                    <div className="phone-input-wrapper">
                      <span className="country-code">+91</span>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.slice(0, 10))}
                        maxLength="10"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="otp">Enter OTP</label>
                    <input
                      id="otp"
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                      maxLength="6"
                      required
                    />
                  </div>
                )}

                <div id="recaptcha-container"></div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading
                    ? otpSent
                      ? 'Verifying OTP...'
                      : 'Sending OTP...'
                    : otpSent
                      ? 'Verify OTP'
                      : 'Send OTP'}
                </button>

                {otpSent && (
                  <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => {
                      setOtpSent(false)
                      setOtp('')
                      clearMessages()
                    }}
                  >
                    Change Number
                  </button>
                )}
              </form>
            )}
          </>
        ) : (
          <form onSubmit={authMethod === 'phone' ? handlePhoneLogin : handleEmailLogin}>
            {authMethod === 'email' ? (
              <>
                <div className="form-group">
                  <label htmlFor="login-email">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                {!otpSent ? (
                  <div className="form-group">
                    <label htmlFor="login-phone">Mobile Number</label>
                    <div className="phone-input-wrapper">
                      <span className="country-code">+91</span>
                      <input
                        id="login-phone"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.slice(0, 10))}
                        maxLength="10"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="login-otp">Enter OTP</label>
                    <input
                      id="login-otp"
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                      maxLength="6"
                      required
                    />
                  </div>
                )}

                <div id="recaptcha-container"></div>
              </>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading
                ? authMethod === 'phone'
                  ? otpSent
                    ? 'Verifying OTP...'
                    : 'Sending OTP...'
                  : 'Logging in...'
                : authMethod === 'phone'
                  ? otpSent
                    ? 'Verify OTP'
                    : 'Send OTP'
                  : 'Login'}
            </button>

            {authMethod === 'phone' && otpSent && (
              <button
                type="button"
                className="toggle-btn"
                onClick={() => {
                  setOtpSent(false)
                  setOtp('')
                  clearMessages()
                }}
              >
                Change Number
              </button>
            )}

            {authMethod === 'email' && (
              <button
                type="button"
                className="forgot-password-btn"
                onClick={() => {
                  setShowForgotPassword(true)
                  clearMessages()
                }}
              >
                Forgot Password?
              </button>
            )}
          </form>
        )}

        {!showForgotPassword && !isAdminLogin && (
          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            🔐 {loading ? 'Processing...' : 'Login with Google'}
          </button>
        )}

        {!showForgotPassword && !isAdminLogin && (
          <>
            <div className="login-method-selector">
              <button
                type="button"
                className={`method-btn ${authMethod === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMethod('email')
                  setOtpSent(false)
                  clearMessages()
                }}
              >
                📧 Email
              </button>
              <button
                type="button"
                className={`method-btn ${authMethod === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMethod('phone')
                  setOtpSent(false)
                  clearMessages()
                }}
              >
                📱 Phone OTP
              </button>
            </div>

            <div className="toggle-auth">
              {!isSignup ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => {
                      setIsSignup(true)
                      setAuthMethod('email')
                      setOtpSent(false)
                      clearMessages()
                      setEmail('')
                      setMobile('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => {
                      setIsSignup(false)
                      clearMessages()
                      setEmail('')
                      setMobile('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                  >
                    Login
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default LoginPage
