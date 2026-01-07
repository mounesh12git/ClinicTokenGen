import './RoleSelection.css'

function RoleSelection({ onRoleSelect }) {
  return (
    <div className="role-selection-container">
      <div className="role-card">
        <h1>🏥 Clinic Token Management System</h1>
        <p className="subtitle">Choose your role to continue</p>

        <div className="roles-grid">
          <div 
            className="role-option patient-role"
            onClick={() => onRoleSelect('patient')}
          >
            <div className="role-icon">👤</div>
            <h3>Patient</h3>
            <p>Request tokens and track your waiting time in the queue</p>
            <button className="role-btn">Continue as Patient</button>
          </div>

          <div 
            className="role-option admin-role"
            onClick={() => onRoleSelect('clinic-admin')}
          >
            <div className="role-icon">👨‍⚕️</div>
            <h3>Clinic Admin</h3>
            <p>Manage patient queue and call patients</p>
            <button className="role-btn">Continue as Admin</button>
          </div>

          <div 
            className="role-option manager-role"
            onClick={() => onRoleSelect('token-admin')}
          >
            <div className="role-icon">📊</div>
            <h3>Manager</h3>
            <p>Manage tokens and system configuration</p>
            <button className="role-btn">Continue as Manager</button>
          </div>

          <div 
            className="role-option pharma-role"
            onClick={() => onRoleSelect('pharma-owner')}
          >
            <div className="role-icon">💊</div>
            <h3>Pharmacy Owner</h3>
            <p>Manage baby products and pharmacy medicines</p>
            <button className="role-btn">Continue as Pharmacy Owner</button>
          </div>
        </div>

        <div className="features-info">
          <h4>✨ System Features</h4>
          <ul>
            <li>🎫 Online token requests to avoid queues</li>
            <li>⏳ Real-time waiting time estimates</li>
            <li>📱 Patient queue management</li>
            <li>🔔 Automated patient calling system</li>
            <li>📊 Clinic analytics and reports</li>
            <li>👥 Reduce clinic overcrowding</li>
            <li>💊 Pharmacy management system</li>
            <li>👶 Baby products catalog</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default RoleSelection
