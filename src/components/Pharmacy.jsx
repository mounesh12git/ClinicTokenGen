import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { database } from '../firebaseConfig'
import './Pharmacy.css'

function Pharmacy({ userInfo, onLogout, onBack }) {
  const [babyProducts, setBabyProducts] = useState([])
  const [pharmaProducts, setPharmaProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])

  useEffect(() => {
    fetchAllProducts()
  }, [])

  // Fetch all products from Firebase
  const fetchAllProducts = async () => {
    try {
      setLoading(true)
      const babyRef = ref(database, 'products/baby-products')
      const pharmaRef = ref(database, 'products/pharma-products')
      
      const [babySnapshot, pharmaSnapshot] = await Promise.all([
        get(babyRef),
        get(pharmaRef)
      ])

      const babyData = babySnapshot.exists() 
        ? Object.entries(babySnapshot.val()).map(([id, data]) => ({ 
            id, 
            ...data,
            category: 'Baby Products',
            categoryIcon: '👶'
          }))
        : []
      
      const pharmaData = pharmaSnapshot.exists()
        ? Object.entries(pharmaSnapshot.val()).map(([id, data]) => ({ 
            id, 
            ...data,
            category: 'Pharmacy Products',
            categoryIcon: '💊'
          }))
        : []

      setBabyProducts(babyData)
      setPharmaProducts(pharmaData)
      setAllProducts([...babyData, ...pharmaData])
      setFilteredProducts([...babyData, ...pharmaData])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter products based on tab and search
  useEffect(() => {
    let filtered = []
    
    if (activeTab === 'all') {
      filtered = allProducts
    } else if (activeTab === 'baby') {
      filtered = babyProducts
    } else if (activeTab === 'pharma') {
      filtered = pharmaProducts
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredProducts(filtered)
  }, [activeTab, searchTerm, babyProducts, pharmaProducts, allProducts])

  return (
    <div className="pharmacy-container">
      {/* Header */}
      <div className="pharmacy-header">
        <div className="pharmacy-title">
          <button className="back-btn" onClick={onBack}>
            ← Back to Dashboard
          </button>
          <h1>🛍️ Shop - All Products</h1>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>

      <div className="pharmacy-content">
        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            📦 All Products ({allProducts.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'baby' ? 'active' : ''}`}
            onClick={() => setActiveTab('baby')}
          >
            👶 Baby Products ({babyProducts.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'pharma' ? 'active' : ''}`}
            onClick={() => setActiveTab('pharma')}
          >
            💊 Medicines ({pharmaProducts.length})
          </button>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                {product.image && (
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                  </div>
                )}
                <div className="product-info">
                  <div className="product-header">
                    <h3>{product.name}</h3>
                    <span className="category-badge">{product.categoryIcon} {product.category}</span>
                  </div>

                  {product.description && (
                    <p className="product-description">{product.description}</p>
                  )}

                  {product.category && (
                    <p className="product-type">
                      <small>Type: {product.category}</small>
                    </p>
                  )}

                  <div className="product-details">
                    <div className="price-stock">
                      <span className="price">₹{product.price}</span>
                      <span className={`stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  <button 
                    className="add-to-cart-btn"
                    disabled={product.stock <= 0}
                  >
                    {product.stock > 0 ? '🛒 Add to Cart' : '❌ Out of Stock'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-products">
            <p>🔍 No products found</p>
            {searchTerm && (
              <p className="search-hint">Try searching with different keywords</p>
            )}
            {allProducts.length === 0 && !searchTerm && (
              <p className="empty-hint">No products available yet. Check back soon!</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Pharmacy
