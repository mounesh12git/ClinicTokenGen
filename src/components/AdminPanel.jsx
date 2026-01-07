import { useState, useEffect } from 'react'
import { ref, get, set, remove, update } from 'firebase/database'
import { database } from '../firebaseConfig'
import './AdminPanel.css'

function AdminPanel({ adminUser }) {
  const [patients, setPatients] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [news, setNews] = useState([])
  const [ads, setAds] = useState([])
  const [vaccineSchedules, setVaccineSchedules] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('patients')
  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddNews, setShowAddNews] = useState(false)
  const [showAddVaccine, setShowAddVaccine] = useState(false)
  const [showAddAd, setShowAddAd] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    name: '',
    role: 'patient'
  })
  const [newsForm, setNewsForm] = useState({
    title: '',
    description: ''
  })
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    image: '',
    link: '',
    displayLocation: 'all' // 'login', 'dashboard', 'all'
  })
  const [vaccineForm, setVaccineForm] = useState({
    name: '',
    ageGroup: '0-3',
    description: '',
    dueDate: '',
    vaccines: ''
  })
  const [tokenConfig, setTokenConfig] = useState({
    tokensPerSlot: 50,
    slotResetTime: '09:00',
    maxTokensPerDay: 150
  })
  const [tokenSlots, setTokenSlots] = useState([])
  const [showTokenConfig, setShowTokenConfig] = useState(false)
  const [activeTokenTab, setActiveTokenTab] = useState('create-slot')
  const [slotForm, setSlotForm] = useState({
    name: 'Morning',
    startTime: '09:00',
    endTime: '12:00',
    tokensAllocated: 50
  })
  const [todayTokens, setTodayTokens] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [currentToken, setCurrentToken] = useState(null)
  const [offlineTokenInput, setOfflineTokenInput] = useState('')
  const [currentSlotForToken, setCurrentSlotForToken] = useState('Morning')

  // Fetch all news
  const fetchNews = async () => {
    setLoading(true)
    setError('')
    try {
      const newsRef = ref(database, 'news')
      const snapshot = await get(newsRef)
      
      if (snapshot.exists()) {
        const newsData = snapshot.val()
        const newsList = Object.entries(newsData).map(([id, item]) => ({
          ...item,
          dbId: id
        }))
        setNews(newsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      } else {
        setNews([])
      }
    } catch (err) {
      console.error('Error fetching news:', err)
      setError('Failed to fetch news')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNews = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!newsForm.title || !newsForm.description) {
        setError('All fields are required')
        setLoading(false)
        return
      }

      const newsId = `news-${Date.now()}`
      const newsRef = ref(database, `news/${newsId}`)
      await set(newsRef, {
        title: newsForm.title,
        description: newsForm.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      setSuccess('News published successfully!')
      setNewsForm({ title: '', description: '' })
      setShowAddNews(false)
      fetchNews()
    } catch (err) {
      console.error('Error adding news:', err)
      setError('Failed to publish news')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNews = async (newsId, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      setError('')
      setSuccess('')
      setLoading(true)

      try {
        const newsRef = ref(database, `news/${newsId}`)
        await remove(newsRef)
        setSuccess('News deleted successfully')
        fetchNews()
      } catch (err) {
        console.error('Error deleting news:', err)
        setError('Failed to delete news')
      } finally {
        setLoading(false)
      }
    }
  }

  // Fetch all advertisements
  const fetchAds = async () => {
    setLoading(true)
    setError('')
    try {
      const adsRef = ref(database, 'ads')
      const snapshot = await get(adsRef)
      
      if (snapshot.exists()) {
        const adsData = snapshot.val()
        const adsList = Object.entries(adsData).map(([id, item]) => ({
          ...item,
          dbId: id
        }))
        setAds(adsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      } else {
        setAds([])
      }
    } catch (err) {
      console.error('Error fetching ads:', err)
      setError('Failed to fetch ads')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAd = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!adForm.title || !adForm.description) {
        setError('Title and description are required')
        setLoading(false)
        return
      }

      const adId = `ad-${Date.now()}`
      const adRef = ref(database, `ads/${adId}`)
      await set(adRef, {
        title: adForm.title,
        description: adForm.description,
        image: adForm.image,
        link: adForm.link,
        displayLocation: adForm.displayLocation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true
      })

      setSuccess('Advertisement posted successfully!')
      setAdForm({ title: '', description: '', image: '', link: '', displayLocation: 'all' })
      setShowAddAd(false)
      fetchAds()
    } catch (err) {
      console.error('Error adding ad:', err)
      setError('Failed to post advertisement')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAd = async (adId, title) => {
    if (window.confirm(`Are you sure you want to delete this ad?`)) {
      setError('')
      setSuccess('')
      setLoading(true)

      try {
        const adRef = ref(database, `ads/${adId}`)
        await remove(adRef)
        setSuccess('Advertisement deleted successfully')
        fetchAds()
      } catch (err) {
        console.error('Error deleting ad:', err)
        setError('Failed to delete advertisement')
      } finally {
        setLoading(false)
      }
    }
  }

  // Handle offline token entry
  const handleOfflineTokenEntry = async (e) => {
    e.preventDefault()
    if (!offlineTokenInput.trim()) {
      setError('Please enter a token number')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const tokenData = {
        number: parseInt(offlineTokenInput),
        type: 'offline',
        slotName: currentSlotForToken,
        timestamp: new Date().toISOString()
      }

      const clinicStatusRef = ref(database, `clinicStatus/${today}/currentToken`)
      await set(clinicStatusRef, tokenData)

      setSuccess(`Offline token #${offlineTokenInput} set as current. All patients updated in real-time.`)
      setOfflineTokenInput('')
      setCurrentToken(tokenData)
    } catch (err) {
      console.error('Error setting offline token:', err)
      setError('Failed to set offline token')
    } finally {
      setLoading(false)
    }
  }

  // Call next token (increment current token)
  const handleCallNextToken = async (type) => {
    if (!currentToken) {
      setError('No current token set. Please set a starting token.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const nextTokenData = {
        number: currentToken.number + 1,
        type: type,
        slotName: currentToken.slotName,
        timestamp: new Date().toISOString()
      }

      const clinicStatusRef = ref(database, `clinicStatus/${today}/currentToken`)
      await set(clinicStatusRef, nextTokenData)

      setCurrentToken(nextTokenData)
      setSuccess(`Token #${nextTokenData.number} (${type}) called. Patients notified in real-time.`)
    } catch (err) {
      console.error('Error calling next token:', err)
      setError('Failed to call next token')
    } finally {
      setLoading(false)
    }
  }

  // Fetch vaccine schedules
  const fetchVaccineSchedules = async () => {
    setLoading(true)
    setError('')
    try {
      const vaccineRef = ref(database, 'vaccineSchedules')
      const snapshot = await get(vaccineRef)
      
      if (snapshot.exists()) {
        const scheduleData = snapshot.val()
        const scheduleList = Object.entries(scheduleData).map(([id, item]) => ({
          ...item,
          dbId: id
        }))
        setVaccineSchedules(scheduleList.sort((a, b) => {
          const ageA = parseInt(a.ageGroup.split('-')[0])
          const ageB = parseInt(b.ageGroup.split('-')[0])
          return ageA - ageB
        }))
      } else {
        setVaccineSchedules([])
      }
    } catch (err) {
      console.error('Error fetching vaccine schedules:', err)
      setError('Failed to fetch vaccine schedules')
    } finally {
      setLoading(false)
    }
  }

  // Add vaccine schedule
  const handleAddVaccineSchedule = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!vaccineForm.name || !vaccineForm.ageGroup || !vaccineForm.vaccines) {
        setError('All fields are required')
        setLoading(false)
        return
      }

      const scheduleId = `vaccine-${Date.now()}`
      const vaccineRef = ref(database, `vaccineSchedules/${scheduleId}`)
      await set(vaccineRef, {
        name: vaccineForm.name,
        ageGroup: vaccineForm.ageGroup,
        description: vaccineForm.description,
        dueDate: vaccineForm.dueDate,
        vaccines: vaccineForm.vaccines,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      setSuccess('Vaccine schedule added successfully!')
      setVaccineForm({ name: '', ageGroup: '0-3', description: '', dueDate: '', vaccines: '' })
      setShowAddVaccine(false)
      fetchVaccineSchedules()
    } catch (err) {
      console.error('Error adding vaccine schedule:', err)
      setError('Failed to add vaccine schedule')
    } finally {
      setLoading(false)
    }
  }

  // Delete vaccine schedule
  const handleDeleteVaccineSchedule = async (scheduleId, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      setError('')
      setSuccess('')
      setLoading(true)

      try {
        const vaccineRef = ref(database, `vaccineSchedules/${scheduleId}`)
        await remove(vaccineRef)
        setSuccess('Vaccine schedule deleted successfully')
        fetchVaccineSchedules()
      } catch (err) {
        console.error('Error deleting vaccine schedule:', err)
        setError('Failed to delete vaccine schedule')
      } finally {
        setLoading(false)
      }
    }
  }

  // Fetch token configuration
  const fetchTokenConfig = async () => {
    try {
      const configRef = ref(database, 'config/tokenSettings')
      const snapshot = await get(configRef)
      if (snapshot.exists()) {
        setTokenConfig(snapshot.val())
      }
    } catch (err) {
      console.error('Error fetching token config:', err)
    }
  }

  // Save token configuration
  const handleSaveTokenConfig = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!tokenConfig.tokensPerSlot || !tokenConfig.slotResetTime) {
        setError('All fields are required')
        setLoading(false)
        return
      }

      const configRef = ref(database, 'config/tokenSettings')
      await set(configRef, {
        ...tokenConfig,
        lastUpdated: new Date().toISOString(),
        lastResetDate: new Date().toISOString().split('T')[0]
      })
      setSuccess('Token configuration saved successfully')
      setShowTokenConfig(false)
      fetchTokenConfig()
    } catch (err) {
      console.error('Error saving token config:', err)
      setError('Failed to save token configuration')
    } finally {
      setLoading(false)
    }
  }

  // Fetch today's token slots
  const fetchTodayTokenSlots = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const slotsRef = ref(database, `tokenSlots/${today}`)
      const snapshot = await get(slotsRef)
      if (snapshot.exists()) {
        const slotsData = snapshot.val()
        const slotsList = Object.entries(slotsData).map(([id, data]) => ({
          id,
          ...data
        }))
        setTokenSlots(slotsList.sort((a, b) => a.startTime.localeCompare(b.startTime)))
      } else {
        setTokenSlots([])
      }
    } catch (err) {
      console.error('Error fetching token slots:', err)
    }
  }

  // Create token slots for the day
  const handleCreateSlots = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const defaultSlots = [
        {
          name: 'Morning',
          startTime: '09:00',
          endTime: '12:00',
          tokensAllocated: 50,
          tokensAvailable: 50,
          tokensUsed: 0
        },
        {
          name: 'Afternoon',
          startTime: '14:00',
          endTime: '17:00',
          tokensAllocated: 50,
          tokensAvailable: 50,
          tokensUsed: 0
        },
        {
          name: 'Evening',
          startTime: '17:00',
          endTime: '20:00',
          tokensAllocated: 50,
          tokensAvailable: 50,
          tokensUsed: 0
        }
      ]

      for (let i = 0; i < defaultSlots.length; i++) {
        const slotRef = ref(database, `tokenSlots/${today}/slot${i + 1}`)
        await set(slotRef, {
          ...defaultSlots[i],
          createdAt: new Date().toISOString()
        })
      }

      setSuccess('Token slots created successfully for today')
      fetchTodayTokenSlots()
    } catch (err) {
      console.error('Error creating token slots:', err)
      setError('Failed to create token slots')
    } finally {
      setLoading(false)
    }
  }

  // Fetch all tokens for a specific slot
  const fetchSlotTokens = async (slotId) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const tokensRef = ref(database, `tokenSlots/${today}/${slotId}/tokens`)
      const snapshot = await get(tokensRef)
      if (snapshot.exists()) {
        const tokensData = snapshot.val()
        const tokensList = Object.entries(tokensData).map(([id, data]) => ({
          id,
          ...data
        }))
        setTodayTokens(tokensList.sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0)))
      } else {
        setTodayTokens([])
      }
    } catch (err) {
      console.error('Error fetching slot tokens:', err)
    }
  }

  // Update token status (mark as consulted/cleared)
  const handleClearToken = async (slotId, tokenId) => {
    if (!window.confirm('Mark this token as consulted and cleared?')) return

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const tokenRef = ref(database, `tokenSlots/${today}/${slotId}/tokens/${tokenId}`)
      await update(tokenRef, {
        status: 'cleared',
        clearedAt: new Date().toISOString()
      })

      // Update slot's tokensUsed count
      const slotRef = ref(database, `tokenSlots/${today}/${slotId}`)
      const slotSnapshot = await get(slotRef)
      if (slotSnapshot.exists()) {
        const slotData = slotSnapshot.val()
        await update(slotRef, {
          tokensUsed: (slotData.tokensUsed || 0) + 1,
          tokensAvailable: slotData.tokensAvailable - 1
        })
      }

      setSuccess('Token cleared successfully')
      fetchSlotTokens(slotId)
      fetchTodayTokenSlots()
    } catch (err) {
      console.error('Error clearing token:', err)
      setError('Failed to clear token')
    } finally {
      setLoading(false)
    }
  }

  // Fetch all patients
  const fetchPatients = async () => {
    setLoading(true)
    setError('')
    try {
      const usersRef = ref(database, 'users')
      const snapshot = await get(usersRef)
      
      if (snapshot.exists()) {
        const allUsers = snapshot.val()
        const patientsList = Object.values(allUsers).filter(user => user.role === 'patient')
        setPatients(patientsList)
      } else {
        setPatients([])
      }
    } catch (err) {
      console.error('Error fetching patients:', err)
      setError('Failed to fetch patients')
    } finally {
      setLoading(false)
    }
  }

  // Fetch all users
  const fetchAllUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const usersRef = ref(database, 'users')
      const snapshot = await get(usersRef)
      
      if (snapshot.exists()) {
        const usersData = snapshot.val()
        const usersList = Object.entries(usersData).map(([id, user]) => ({
          ...user,
          dbId: id
        }))
        setAllUsers(usersList)
      } else {
        setAllUsers([])
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'patients') {
      fetchPatients()
    } else if (activeTab === 'manage-users') {
      fetchAllUsers()
    } else if (activeTab === 'news') {
      fetchNews()
    } else if (activeTab === 'ads') {
      fetchAds()
    } else if (activeTab === 'vaccines') {
      fetchVaccineSchedules()
    } else if (activeTab === 'token-config') {
      fetchTokenConfig()
      fetchTodayTokenSlots()
      fetchCurrentToken()
    }
  }, [activeTab])

  const fetchCurrentToken = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentTokenRef = ref(database, `clinicStatus/${today}/currentToken`)
      const snapshot = await get(currentTokenRef)
      
      if (snapshot.exists()) {
        setCurrentToken(snapshot.val())
      } else {
        setCurrentToken(null)
      }
    } catch (err) {
      console.error('Error fetching current token:', err)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!formData.email || !formData.mobile || !formData.name) {
        setError('All fields are required')
        setLoading(false)
        return
      }

      const userId = `user-${Date.now()}`
      const userData = {
        id: userId,
        email: formData.email,
        mobile: formData.mobile,
        name: formData.name,
        role: formData.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tokenCount: 0,
        maxTokens: formData.role === 'admin' ? 100 : 10
      }

      const userRef = ref(database, `users/${userId}`)
      await set(userRef, userData)

      setSuccess(`User "${formData.name}" added successfully as ${formData.role}`)
      setFormData({ email: '', mobile: '', name: '', role: 'patient' })
      setShowAddUser(false)

      // Refresh the list
      if (activeTab === 'patients') {
        fetchPatients()
      } else {
        fetchAllUsers()
      }
    } catch (err) {
      console.error('Error adding user:', err)
      setError('Failed to add user')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const userRef = ref(database, `users/${userId}`)
      const userSnapshot = await get(userRef)
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val()
        await set(userRef, {
          ...userData,
          role: newRole,
          updatedAt: new Date().toISOString()
        })
        setSuccess(`User role updated to ${newRole}`)
        fetchAllUsers()
      }
    } catch (err) {
      console.error('Error updating role:', err)
      setError('Failed to update user role')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
      setError('')
      setSuccess('')
      setLoading(true)

      try {
        const userRef = ref(database, `users/${userId}`)
        await remove(userRef)
        setSuccess(`User "${userName}" deleted successfully`)
        
        // Refresh the list
        if (activeTab === 'patients') {
          fetchPatients()
        } else {
          fetchAllUsers()
        }
      } catch (err) {
        console.error('Error deleting user:', err)
        setError('Failed to delete user')
      } finally {
        setLoading(false)
      }
    }
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>👨‍💼 Admin Dashboard</h2>
        <p>Welcome, {adminUser.name}</p>
      </div>

      {error && <div className="error-message" onClick={clearMessages}>❌ {error}</div>}
      {success && <div className="success-message" onClick={clearMessages}>✅ {success}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          👥 Registered Patients ({patients.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'manage-users' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage-users')}
        >
          🔧 Manage Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          📰 News & Announcements ({news.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'ads' ? 'active' : ''}`}
          onClick={() => setActiveTab('ads')}
        >
          📢 Advertisements ({ads.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'vaccines' ? 'active' : ''}`}
          onClick={() => setActiveTab('vaccines')}
        >
          💉 Vaccine Schedules ({vaccineSchedules.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'token-config' ? 'active' : ''}`}
          onClick={() => setActiveTab('token-config')}
        >
          🎫 Token Configuration
        </button>
      </div>

      {/* Patients List Tab */}
      {activeTab === 'patients' && (
        <div className="tab-content">
          <h3>📋 Patient List</h3>
          {loading ? (
            <p className="loading">Loading patients...</p>
          ) : patients.length > 0 ? (
            <div className="patients-table-wrapper">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Joined Date</th>
                    <th>Token Count</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient, index) => (
                    <tr key={patient.id}>
                      <td>{index + 1}</td>
                      <td>{patient.name}</td>
                      <td>{patient.email}</td>
                      <td>{patient.mobile}</td>
                      <td>{new Date(patient.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className="token-badge">
                          {patient.tokenCount}/{patient.maxTokens}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">No patients registered yet</p>
          )}
        </div>
      )}

      {/* Manage Users Tab */}
      {activeTab === 'manage-users' && (
        <div className="tab-content">
          <div className="manage-users-header">
            <h3>🔧 Manage All Users</h3>
            <button
              className="add-user-btn"
              onClick={() => {
                setShowAddUser(!showAddUser)
                clearMessages()
              }}
            >
              {showAddUser ? '✕ Cancel' : '➕ Add New User'}
            </button>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <form className="add-user-form" onSubmit={handleAddUser}>
              <div className="form-group">
                <label htmlFor="new-email">Email</label>
                <input
                  id="new-email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-mobile">Mobile</label>
                <input
                  id="new-mobile"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value.slice(0, 10) })}
                  maxLength="10"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-name">Name</label>
                <input
                  id="new-name"
                  type="text"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-role">Role</label>
                <select
                  id="new-role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Adding...' : 'Add User'}
              </button>
            </form>
          )}

          {/* Users List */}
          {loading ? (
            <p className="loading">Loading users...</p>
          ) : allUsers.length > 0 ? (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((user, index) => (
                    <tr key={user.dbId}>
                      <td>{index + 1}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.mobile}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.dbId, e.target.value)}
                          className="role-select"
                          disabled={loading}
                        >
                          <option value="patient">Patient</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteUser(user.dbId, user.name)}
                          disabled={loading}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">No users found</p>
          )}
        </div>
      )}

      {/* News Tab */}
      {activeTab === 'news' && (
        <div className="tab-content">
          <div className="manage-users-header">
            <h3>📰 News & Announcements</h3>
            <button
              className="add-user-btn"
              onClick={() => {
                setShowAddNews(!showAddNews)
                clearMessages()
              }}
            >
              {showAddNews ? '✕ Cancel' : '➕ Publish News'}
            </button>
          </div>

          {/* Publish News Form */}
          {showAddNews && (
            <form className="add-user-form" onSubmit={handleAddNews}>
              <div className="form-group">
                <label htmlFor="news-title">Title</label>
                <input
                  id="news-title"
                  type="text"
                  placeholder="News headline"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="news-description">Description</label>
                <textarea
                  id="news-description"
                  placeholder="News details and description"
                  value={newsForm.description}
                  onChange={(e) => setNewsForm({ ...newsForm, description: e.target.value })}
                  required
                  style={{
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1em',
                    minHeight: '120px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Publishing...' : 'Publish News'}
              </button>
            </form>
          )}

          {/* News List */}
          {loading ? (
            <p className="loading">Loading news...</p>
          ) : news.length > 0 ? (
            <div className="news-admin-list">
              {news.map((item) => (
                <div key={item.dbId} className="news-admin-item">
                  <div className="news-admin-content">
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                    <span className="news-admin-date">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteNews(item.dbId, item.title)}
                    disabled={loading}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No news published yet</p>
          )}
        </div>
      )}

      {/* Advertisements Tab */}
      {activeTab === 'ads' && (
        <div className="tab-content">
          <div className="manage-users-header">
            <h3>📢 Manage Advertisements</h3>
            <button
              className="add-user-btn"
              onClick={() => setShowAddAd(!showAddAd)}
            >
              {showAddAd ? '✕ Cancel' : '➕ Post New Ad'}
            </button>
          </div>

          {showAddAd && (
            <form className="add-user-form" onSubmit={handleAddAd}>
              <div className="form-group">
                <label>Ad Title *</label>
                <input
                  type="text"
                  placeholder="Enter advertisement title"
                  value={adForm.title}
                  onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  placeholder="Enter advertisement description"
                  value={adForm.description}
                  onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                  rows="4"
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  placeholder="Enter image URL"
                  value={adForm.image}
                  onChange={(e) => setAdForm({ ...adForm, image: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Action Link</label>
                <input
                  type="url"
                  placeholder="Enter link URL (optional)"
                  value={adForm.link}
                  onChange={(e) => setAdForm({ ...adForm, link: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Display Location</label>
                <select
                  value={adForm.displayLocation}
                  onChange={(e) => setAdForm({ ...adForm, displayLocation: e.target.value })}
                >
                  <option value="all">Show on Login & Dashboard</option>
                  <option value="login">Show on Login Page Only</option>
                  <option value="dashboard">Show on Patient Dashboard Only</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Posting...' : 'Post Advertisement'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddAd(false)
                    setAdForm({ title: '', description: '', image: '', link: '', displayLocation: 'all' })
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {ads.length > 0 ? (
            <div className="news-admin-list">
              {ads.map((item) => (
                <div key={item.dbId} className="news-admin-item">
                  <div className="news-admin-content">
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                    {item.image && <small>📸 Image: {item.image}</small>}
                    <div className="ad-meta">
                      <span className="ad-location">📍 {item.displayLocation === 'all' ? 'Login & Dashboard' : item.displayLocation === 'login' ? 'Login Page' : 'Dashboard'}</span>
                      <span className="news-admin-date">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteAd(item.dbId, item.title)}
                    disabled={loading}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No advertisements posted yet</p>
          )}
        </div>
      )}

      {/* Vaccine Schedules Tab */}
      {activeTab === 'vaccines' && (
        <div className="tab-content">
          <div className="manage-users-header">
            <h3>💉 Vaccine Schedules Management</h3>
            <button
              className="add-user-btn"
              onClick={() => {
                setShowAddVaccine(!showAddVaccine)
                clearMessages()
              }}
            >
              {showAddVaccine ? '✕ Cancel' : '➕ Add Vaccine Schedule'}
            </button>
          </div>

          {/* Add Vaccine Schedule Form */}
          {showAddVaccine && (
            <form className="add-user-form" onSubmit={handleAddVaccineSchedule}>
              <div className="form-group">
                <label htmlFor="vaccine-name">Vaccine Name</label>
                <input
                  id="vaccine-name"
                  type="text"
                  placeholder="e.g., Birth Dose, 6-week Vaccines"
                  value={vaccineForm.name}
                  onChange={(e) => setVaccineForm({ ...vaccineForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="vaccine-age-group">Age Group</label>
                <select
                  id="vaccine-age-group"
                  value={vaccineForm.ageGroup}
                  onChange={(e) => setVaccineForm({ ...vaccineForm, ageGroup: e.target.value })}
                >
                  <option value="0-3">Newborn (0-3 months)</option>
                  <option value="3-6">3-6 months</option>
                  <option value="6-12">6-12 months</option>
                  <option value="12-24">12-24 months</option>
                  <option value="24-36">24-36 months</option>
                  <option value="36-48">36-48 months</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="vaccine-due-date">Due Date (Months/Weeks)</label>
                <input
                  id="vaccine-due-date"
                  type="text"
                  placeholder="e.g., At birth, 6 weeks, 10 weeks"
                  value={vaccineForm.dueDate}
                  onChange={(e) => setVaccineForm({ ...vaccineForm, dueDate: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="vaccine-list">Vaccines to be Given</label>
                <textarea
                  id="vaccine-list"
                  placeholder="List all vaccines (comma separated)"
                  value={vaccineForm.vaccines}
                  onChange={(e) => setVaccineForm({ ...vaccineForm, vaccines: e.target.value })}
                  required
                  style={{
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1em',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="vaccine-description">Description/Notes</label>
                <textarea
                  id="vaccine-description"
                  placeholder="Additional notes or instructions"
                  value={vaccineForm.description}
                  onChange={(e) => setVaccineForm({ ...vaccineForm, description: e.target.value })}
                  style={{
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1em',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Adding...' : 'Add Vaccine Schedule'}
              </button>
            </form>
          )}

          {/* Vaccine Schedules List */}
          {loading ? (
            <p className="loading">Loading vaccine schedules...</p>
          ) : vaccineSchedules.length > 0 ? (
            <div className="vaccine-schedules-list">
              {vaccineSchedules.map((schedule) => (
                <div key={schedule.dbId} className="vaccine-schedule-card">
                  <div className="vaccine-schedule-header">
                    <h4>{schedule.name}</h4>
                    <span className="vaccine-age-badge">{schedule.ageGroup}</span>
                  </div>
                  <div className="vaccine-schedule-body">
                    <p><strong>Due at:</strong> {schedule.dueDate}</p>
                    <p><strong>Vaccines:</strong> {schedule.vaccines}</p>
                    {schedule.description && (
                      <p><strong>Notes:</strong> {schedule.description}</p>
                    )}
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteVaccineSchedule(schedule.dbId, schedule.name)}
                    disabled={loading}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No vaccine schedules configured yet</p>
          )}
        </div>
      )}


      {/* Token Configuration & Management Tab */}
      {activeTab === 'token-config' && (
        <div className="tab-content">
          <h3>🎫 Token Management System</h3>
          
          <div className="token-tabs">
            <button
              className={`token-tab-btn ${activeTokenTab === 'create-slot' ? 'active' : ''}`}
              onClick={() => setActiveTokenTab('create-slot')}
            >
              ➕ Create Daily Slots
            </button>
            <button
              className={`token-tab-btn ${activeTokenTab === 'manage-slots' ? 'active' : ''}`}
              onClick={() => setActiveTokenTab('manage-slots')}
            >
              📊 Manage Tokens ({tokenSlots.length} slots)
            </button>
            <button
              className={`token-tab-btn ${activeTokenTab === 'current-token' ? 'active' : ''}`}
              onClick={() => setActiveTokenTab('current-token')}
            >
              🎯 Current Token
            </button>
            <button
              className={`token-tab-btn ${activeTokenTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTokenTab('settings')}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Create Daily Slots Section */}
          {activeTokenTab === 'create-slot' && (
            <div className="token-slot-section">
              <h4>Create Daily Token Slots</h4>
              <p>Create 3 time slots (Morning, Afternoon, Evening) with 50 tokens each</p>
              
              {tokenSlots.length > 0 ? (
                <div className="slots-info">
                  <p className="info-text">✅ Slots already created for today</p>
                  <div className="slots-display">
                    {tokenSlots.map((slot) => (
                      <div key={slot.id} className="slot-card">
                        <h5>{slot.name}</h5>
                        <p>{slot.startTime} - {slot.endTime}</p>
                        <p className="slot-tokens">
                          <strong>{slot.tokensAvailable}</strong> / {slot.tokensAllocated}
                        </p>
                        <small>Used: {slot.tokensUsed || 0}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button 
                  className="add-btn"
                  onClick={handleCreateSlots}
                  disabled={loading}
                >
                  🔨 Create Today's Slots
                </button>
              )}
            </div>
          )}

          {/* Manage Tokens Section */}
          {activeTokenTab === 'manage-slots' && (
            <div className="manage-tokens-section">
              <h4>Manage Tokens by Slot</h4>
              {tokenSlots.length === 0 ? (
                <p className="no-data">No slots created yet. Please create daily slots first.</p>
              ) : (
                <>
                  <div className="slots-list">
                    {tokenSlots.map((slot) => (
                      <button
                        key={slot.id}
                        className={`slot-select-btn ${selectedSlot?.id === slot.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedSlot(slot)
                          fetchSlotTokens(slot.id)
                        }}
                      >
                        <strong>{slot.name}</strong>
                        <span className="slot-time">{slot.startTime}-{slot.endTime}</span>
                        <span className="slot-count">{slot.tokensAvailable}/{slot.tokensAllocated}</span>
                      </button>
                    ))}
                  </div>

                  {selectedSlot && (
                    <div className="slot-tokens-section">
                      <h5>Tokens for {selectedSlot.name} Slot</h5>
                      {todayTokens.length === 0 ? (
                        <p className="no-data">No token requests yet</p>
                      ) : (
                        <div className="tokens-table">
                          <div className="table-header">
                            <div className="col-token">Token #</div>
                            <div className="col-patient">Patient Name</div>
                            <div className="col-case">Case #</div>
                            <div className="col-arrival">Expected Arrival</div>
                            <div className="col-status">Status</div>
                            <div className="col-action">Action</div>
                          </div>
                          {todayTokens.map((token, idx) => (
                            <div key={token.id} className="table-row">
                              <div className="col-token"><strong>#{token.tokenNumber}</strong></div>
                              <div className="col-patient">{token.patientName}</div>
                              <div className="col-case">{token.caseNumber}</div>
                              <div className="col-arrival">{token.expectedArrivalTime || 'Calculating...'}</div>
                              <div className="col-status">
                                <span className={`status-badge ${token.status || 'pending'}`}>
                                  {token.status === 'cleared' ? '✅ Cleared' : '⏳ Pending'}
                                </span>
                              </div>
                              <div className="col-action">
                                {token.status !== 'cleared' && (
                                  <button
                                    className="clear-btn"
                                    onClick={() => handleClearToken(selectedSlot.id, token.id)}
                                    disabled={loading}
                                  >
                                    ✓ Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Current Token Management Section */}
          {activeTokenTab === 'current-token' && (
            <div className="current-token-section">
              <h4>🎯 Real-time Token Management</h4>
              
              {currentToken && (
                <div className="current-token-display">
                  <div className="token-display-card">
                    <span className="label">Currently Running Token</span>
                    <div className="token-number">{currentToken.number}</div>
                    <div className="token-meta">
                      <span className={`token-type-badge ${currentToken.type}`}>
                        {currentToken.type === 'online' ? '🟢 Online' : '🟠 Offline'}
                      </span>
                      <span className="slot-name">{currentToken.slotName}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="offline-token-form">
                <h5>Enter Offline Token</h5>
                <p>Use this when admin generates tokens for walk-in patients (offline)</p>
                
                <form onSubmit={handleOfflineTokenEntry}>
                  <div className="form-group">
                    <label>Token Number</label>
                    <input
                      type="number"
                      value={offlineTokenInput}
                      onChange={(e) => setOfflineTokenInput(e.target.value)}
                      placeholder="e.g., 45"
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Slot</label>
                    <select
                      value={currentSlotForToken}
                      onChange={(e) => setCurrentSlotForToken(e.target.value)}
                    >
                      <option value="Morning">Morning (09:00 - 12:00)</option>
                      <option value="Afternoon">Afternoon (14:00 - 17:00)</option>
                      <option value="Evening">Evening (17:00 - 20:00)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
                    🟠 Set Offline Token
                  </button>
                </form>
              </div>

              <div className="call-next-token">
                <h5>Call Next Token</h5>
                <p>Click to increment current token and mark as online or offline</p>
                
                <div className="button-group">
                  <button
                    className="next-online-btn"
                    onClick={() => handleCallNextToken('online')}
                    disabled={loading || !currentToken}
                  >
                    🟢 Next (Online)
                  </button>
                  <button
                    className="next-offline-btn"
                    onClick={() => handleCallNextToken('offline')}
                    disabled={loading || !currentToken}
                  >
                    🟠 Next (Offline)
                  </button>
                </div>
              </div>

              {success && <div className="success-msg">{success}</div>}
              {error && <div className="error-msg">{error}</div>}
            </div>
          )}

          {/* Settings Section */}
          {activeTokenTab === 'settings' && (
            <div className="token-config-section">
              <div className="config-info">
                <div className="info-card">
                  <span className="info-label">Tokens per Slot</span>
                  <span className="info-value">{tokenConfig.tokensPerSlot || 50}</span>
                </div>
                <div className="info-card">
                  <span className="info-label">Slot Reset Time</span>
                  <span className="info-value">{tokenConfig.slotResetTime || '09:00'}</span>
                </div>
                <div className="info-card">
                  <span className="info-label">Max Tokens per Day</span>
                  <span className="info-value">{tokenConfig.maxTokensPerDay || 150}</span>
                </div>
              </div>

              {!showTokenConfig ? (
                <button 
                  className="add-btn"
                  onClick={() => setShowTokenConfig(true)}
                >
                  ⚙️ Edit Configuration
                </button>
              ) : (
                <form className="token-config-form" onSubmit={handleSaveTokenConfig}>
                  <div className="form-group">
                    <label>Tokens per Slot</label>
                    <input
                      type="number"
                      value={tokenConfig.tokensPerSlot}
                      onChange={(e) => setTokenConfig({...tokenConfig, tokensPerSlot: parseInt(e.target.value)})}
                      min="1"
                      max="500"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Slot Reset Time (HH:MM)</label>
                    <input
                      type="time"
                      value={tokenConfig.slotResetTime}
                      onChange={(e) => setTokenConfig({...tokenConfig, slotResetTime: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Tokens per Day</label>
                    <input
                      type="number"
                      value={tokenConfig.maxTokensPerDay}
                      onChange={(e) => setTokenConfig({...tokenConfig, maxTokensPerDay: parseInt(e.target.value)})}
                      min="1"
                      max="500"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button 
                      type="submit"
                      className="submit-btn"
                      disabled={loading}
                    >
                      💾 Save Configuration
                    </button>
                    <button 
                      type="button"
                      className="cancel-btn"
                      onClick={() => setShowTokenConfig(false)}
                      disabled={loading}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="config-notes">
                <h4>📝 Configuration Notes:</h4>
                <ul>
                  <li>Set tokens per slot: Maximum tokens available in each time slot</li>
                  <li>Set slot reset time: Daily time when token counter resets</li>
                  <li>Set max tokens per day: Maximum total tokens available in a single day</li>
                  <li>System automatically resets tokens daily at the configured reset time</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminPanel