import React, { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import DaftarTunggu from './pages/DaftarTunggu.jsx'
import PerluasanJaringan from './pages/PerluasanJaringan.jsx'
import { Toaster } from 'react-hot-toast'

export default function App() {
  const [activePage, setActivePage] = useState('daftar-tunggu')
  const [loaded, setLoaded] = useState(false)

  if (!loaded) {
    return <LoadingScreen onDone={() => setLoaded(true)} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Toaster position="top-right" />
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {activePage === 'daftar-tunggu' && <DaftarTunggu />}
        {activePage === 'perluasan-jaringan' && <PerluasanJaringan />}
      </main>
    </div>
  )
}
