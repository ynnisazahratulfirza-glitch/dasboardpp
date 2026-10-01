import React, { useEffect, useState } from 'react'

export default function LoadingScreen({ onDone }) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 4
      })
    }, 40)

    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(onDone, 400)
    }, 1400)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div style={{ ...styles.overlay, opacity: fadeOut ? 0 : 1, transition: 'opacity 0.4s ease' }}>
      <div style={styles.box}>
        <img
          src="/images (5).jpg"
          alt="Logo PLN"
          style={styles.logo}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div style={styles.appName}>PLN Dashboard</div>
        <div style={styles.subName}>UP3 TJP — Manajemen Pelanggan</div>

        <div style={styles.barWrap}>
          <div style={{ ...styles.barFill, width: `${progress}%` }} />
        </div>
        <div style={styles.loadingText}>Memuat aplikasi...</div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#002060',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  box: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    width: '90px',
    height: '90px',
    objectFit: 'contain',
    borderRadius: '16px',
    marginBottom: '4px',
    filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.4))',
  },
  appName: {
    color: 'white',
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  subName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    marginBottom: '20px',
  },
  barWrap: {
    width: '200px',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#4da6ff',
    borderRadius: '4px',
    transition: 'width 0.04s linear',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    marginTop: '4px',
  },
}
