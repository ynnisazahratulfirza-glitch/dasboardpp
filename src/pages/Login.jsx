import React, { useState } from 'react'
import { auth } from '../firebase.js'
import { signInWithEmailAndPassword } from 'firebase/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email atau password salah.')
      } else {
        setError('Gagal login: ' + err.message)
      }
    }
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img
            src="/images (5).jpg"
            alt="Logo PLN"
            style={styles.logo}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
        <h1 style={styles.title}>PLN Dashboard</h1>
        <p style={styles.subtitle}>UP3 TJP - Manajemen Pelanggan</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0,32,96,0.12)',
    textAlign: 'center',
  },
  logoWrap: {
    marginBottom: '16px',
  },
  logo: {
    width: '72px',
    height: '72px',
    objectFit: 'contain',
    borderRadius: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#002060',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '28px',
  },
  form: {
    textAlign: 'left',
  },
  field: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#444',
  },
  input: {
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1.5px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    backgroundColor: '#fde8e8',
    color: '#c0392b',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    fontWeight: '600',
  },
  btn: {
    width: '100%',
    padding: '13px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#002060',
    color: 'white',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '4px',
    boxShadow: '0 4px 12px rgba(0,32,96,0.25)',
  },
}
