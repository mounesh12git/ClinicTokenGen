import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

// Replace these with your Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDtqrvWemkW553kZ2muNHxPp__GO8ARNG0",
  authDomain: "moulipharma.firebaseapp.com",
  databaseURL: "https://moulipharma-default-rtdb.firebaseio.com",
  projectId: "moulipharma",
  storageBucket: "moulipharma.firebasestorage.app",
  messagingSenderId: "739263915164",
  appId: "1:739263915164:web:03e744ea46e0bffb48f959",
  measurementId: "G-W069JVF95Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication
export const auth = getAuth(app)

// Initialize Realtime Database
export const database = getDatabase(app)

// Initialize Google Provider
export const googleProvider = new GoogleAuthProvider()

// Recaptcha verifier (needed for phone authentication)
let recaptchaVerifier = null

export const setupRecaptcha = () => {
  try {
    // Check if container exists
    const container = document.getElementById('recaptcha-container')
    if (!container) {
      console.warn('reCAPTCHA container not found in DOM')
      return null
    }

    // Clear previous verifier
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear()
      } catch (e) {
        console.log('Clearing previous verifier...')
      }
      recaptchaVerifier = null
    }

    // Create new verifier
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'normal',
      'callback': (response) => {
        console.log('reCAPTCHA verified:', response)
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired')
        recaptchaVerifier = null
      }
    })

    return recaptchaVerifier
  } catch (error) {
    console.error('Error setting up reCAPTCHA:', error)
    recaptchaVerifier = null
    return null
  }
}

export const getRecaptchaVerifier = () => {
  return recaptchaVerifier
}

export const clearRecaptchaVerifier = () => {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch (e) {
      console.log('Error clearing verifier')
    }
  }
  recaptchaVerifier = null
}

export default app
