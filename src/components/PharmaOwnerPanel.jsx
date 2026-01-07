import { useState, useEffect } from 'react'
import { ref, set, get, remove, update } from 'firebase/database'
import { database } from '../firebaseConfig'
import './PharmaOwnerPanel.css'

function PharmaOwnerPanel({ userInfo, onLogout }) {
  const [activeTab, setActiveTab] = useState('baby-products')
  const [products, setProducts] = useState([])
  const [babyProducts, setBabyProducts] = useState([])
  const [pharmaProducts, setPharmaProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch all products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const babyRef = ref(database, 'products/baby-products')
      const pharmaRef = ref(database, 'products/pharma-products')
      
      const [babySnapshot, pharmaSnapshot] = await Promise.all([
        get(babyRef),
        get(pharmaRef)
      ])

      const babyData = babySnapshot.exists() 
        ? Object.entries(babySnapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []
      
      const pharmaData = pharmaSnapshot.exists()
        ? Object.entries(pharmaSnapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []

      setBabyProducts(babyData)
      setPharmaProducts(pharmaData)
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleAddProduct = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name || !formData.price || !formData.stock) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const productType = activeTab === 'baby-products' ? 'baby-products' : 'pharma-products'
      const productId = editingId || Date.now().toString()
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const productRef = ref(database, `products/${productType}/${productId}`)
      await set(productRef, productData)

      setSuccess(editingId ? 'Product updated successfully!' : 'Product added successfully!')
      setFormData({ name: '', description: '', price: '', stock: '', category: '', image: '' })
      setEditingId(null)
      setShowForm(false)
      fetchProducts()
    } catch (error) {
      console.error('Error adding product:', error)
      setError('Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (productId, type) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setLoading(true)
        const productRef = ref(database, `products/${type}/${productId}`)
        await remove(productRef)
        setSuccess('Product deleted successfully!')
        fetchProducts()
      } catch (error) {
        console.error('Error deleting product:', error)
        setError('Failed to delete product')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEditProduct = (product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      category: product.category || '',
      image: product.image || ''
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  const handleCancelEdit = () => {
    setFormData({ name: '', description: '', price: '', stock: '', category: '', image: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const displayProducts = activeTab === 'baby-products' ? babyProducts : pharmaProducts
  const productType = activeTab === 'baby-products' ? 'Baby Products' : 'Pharmacy Products'

  return (
    <div className="pharma-owner-panel">
      {/* Header */}
      <div className="pharma-header">
        <div className="pharma-header-content">
          <div className="pharma-info">
            <h1>💊 Pharmacy Owner Dashboard</h1>
            <p>Welcome, {userInfo?.name || 'Pharmacy Owner'}</p>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pharma-container">
        {/* Tabs */}
        <div className="pharma-tabs">
          <button
            className={`pharma-tab-btn ${activeTab === 'baby-products' ? 'active' : ''}`}
            onClick={() => setActiveTab('baby-products')}
          >
            👶 Baby Products
          </button>
          <button
            className={`pharma-tab-btn ${activeTab === 'pharma-products' ? 'active' : ''}`}
            onClick={() => setActiveTab('pharma-products')}
          >
            💊 Pharmacy Products
          </button>
        </div>

        {/* Messages */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Add Product Button & Form */}
        <div className="product-management">
          <button
            className="add-product-btn"
            onClick={() => {
              if (showForm && !editingId) {
                setShowForm(false)
              } else {
                setShowForm(true)
              }
            }}
          >
            {showForm && !editingId ? '✕ Cancel' : '➕ Add New Product'}
          </button>

          {showForm && (
            <form className="product-form" onSubmit={handleAddProduct}>
              <h3>{editingId ? 'Edit Product' : 'Add New ' + productType}</h3>
              
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Enter product description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    placeholder="Enter price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stock Quantity *</label>
                  <input
                    type="number"
                    placeholder="Enter stock quantity"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  placeholder="Enter category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  placeholder="Enter image URL"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? '⏳ Saving...' : (editingId ? '✓ Update Product' : '➕ Add Product')}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Products List */}
        <div className="products-section">
          <h2>{productType} ({displayProducts.length})</h2>
          
          {displayProducts.length === 0 ? (
            <div className="no-products">
              <p>No {productType.toLowerCase()} available yet</p>
              <p>Click "Add New Product" to get started</p>
            </div>
          ) : (
            <div className="products-grid">
              {displayProducts.map((product) => (
                <div key={product.id} className="product-card">
                  {product.image && (
                    <div className="product-image">
                      <img src={product.image} alt={product.name} />
                    </div>
                  )}
                  <div className="product-content">
                    <h4>{product.name}</h4>
                    {product.description && <p className="product-desc">{product.description}</p>}
                    {product.category && <span className="category-badge">{product.category}</span>}
                    
                    <div className="product-info">
                      <div className="price-section">
                        <span className="price">₹{product.price}</span>
                      </div>
                      <div className="stock-section">
                        <span className={`stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>

                    <div className="product-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditProduct(product)}
                        disabled={loading}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteProduct(product.id, activeTab)}
                        disabled={loading}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PharmaOwnerPanel
