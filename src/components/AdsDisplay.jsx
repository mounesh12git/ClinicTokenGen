import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { database } from '../firebaseConfig'
import './AdsDisplay.css'

function AdsDisplay({ location = 'login' }) {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentAdIndex, setCurrentAdIndex] = useState(0)

  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true)
        const adsRef = ref(database, 'ads')
        const snapshot = await get(adsRef)
        
        if (snapshot.exists()) {
          const adsData = snapshot.val()
          const adsList = Object.entries(adsData)
            .map(([id, data]) => ({ id, ...data }))
            .filter(ad => ad.active && (ad.displayLocation === 'all' || ad.displayLocation === location))
          
          setAds(adsList)
        }
      } catch (error) {
        console.error('Error fetching ads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAds()
  }, [location])

  // Auto-rotate ads every 5 seconds
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [ads.length])

  if (loading || ads.length === 0) {
    return null
  }

  const currentAd = ads[currentAdIndex]

  return (
    <div className="ads-display-container">
      <div className="ads-banner">
        {currentAd.image && (
          <div className="ads-image">
            <img src={currentAd.image} alt={currentAd.title} />
          </div>
        )}
        <div className="ads-content">
          <h3>{currentAd.title}</h3>
          <p>{currentAd.description}</p>
          {currentAd.link && (
            <a href={currentAd.link} target="_blank" rel="noopener noreferrer" className="ads-link">
              Learn More →
            </a>
          )}
        </div>
        <button className="ads-close" onClick={() => setAds(ads.filter((_, i) => i !== currentAdIndex))}>
          ✕
        </button>
      </div>

      {/* Ads Carousel Indicators */}
      {ads.length > 1 && (
        <div className="ads-indicators">
          {ads.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentAdIndex ? 'active' : ''}`}
              onClick={() => setCurrentAdIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AdsDisplay
