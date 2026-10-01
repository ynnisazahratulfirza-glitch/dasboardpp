import React, { useState, useEffect } from 'react'
import { auth } from './firebase.js'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import Sidebar from './components/Sidebar.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import Login from './pages/Login.jsx'
import DaftarTunggu from './pages/DaftarTunggu.jsx'
import PerluasanJaringan from './pages/PerluasanJaringan.jsx'
import { Toaster } from 'react-hot-toast'

export default function App() {
  const [activePage, setActivePage] = useState('daftar-tunggu')
  const [loaded, setLoaded] = useState(false)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthChecked(true)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
  }

  // Belum cek auth
  if (!authChecked) return null

  // Belum login
  if (!user) return <Login />

  // Loading screen
  if (!loaded) return <LoadingScreen onDone={() => setLoaded(true)} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Toaster position="top-right" />
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={handleLogout}
      />
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {activePage === 'daftar-tunggu' && <DaftarTunggu />}
        {activePage === 'perluasan-jaringan' && <PerluasanJaringan />}
      </main>
    </div>
  )
}
