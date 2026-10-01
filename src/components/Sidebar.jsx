import React from 'react'

const menuItems = [
  { id: 'daftar-tunggu', label: 'Daftar Tunggu' },
  { id: 'perluasan-jaringan', label: 'Perluasan Jaringan' },
]

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <img
          src="/images (5).jpg"
          alt="Logo PLN"
          style={styles.logoImg}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div>
          <div style={styles.logoTitle}>PLN Dashboard</div>
          <div style={styles.logoSub}>Manajemen Pelanggan</div>
        </div>
      </div>

      <nav style={styles.nav}>
        <div style={styles.menuLabel}>MENU UTAMA</div>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            style={{
              ...styles.menuItem,
              ...(activePage === item.id ? styles.menuItemActive : {}),
            }}
          >
            <span
              style={{
                ...styles.indicator,
                ...(activePage === item.id ? styles.indicatorActive : {}),
              }}
            />
            {item.label}
          </button>
        ))}
      </nav>

      <div style={styles.footer}>
        <div style={styles.footerText}>PLN UP3 TJP</div>
        <div style={styles.footerSub}>2026</div>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '240px',
    minHeight: '100vh',
    backgroundColor: '#002060',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '3px 0 12px rgba(0,0,0,0.25)',
    flexShrink: 0,
  },
  header: {
    padding: '20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#001a4d',
  },
  logoImg: {
    width: '44px',
    height: '44px',
    objectFit: 'contain',
    flexShrink: 0,
    borderRadius: '6px',
  },
  logoTitle: {
    fontWeight: '700',
    fontSize: '15px',
    letterSpacing: '0.3px',
    color: 'white',
  },
  logoSub: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '2px',
  },
  nav: {
    flex: 1,
    padding: '20px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  menuLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '1.2px',
    padding: '0 10px',
    marginBottom: '8px',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 12px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.65)',
    cursor: 'pointer',
    fontSize: '13.5px',
    fontWeight: '500',
    textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
  },
  menuItemActive: {
    background: 'rgba(255,255,255,0.12)',
    color: 'white',
    fontWeight: '700',
  },
  indicator: {
    width: '4px',
    height: '18px',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  indicatorActive: {
    backgroundColor: '#4da6ff',
  },
  footer: {
    padding: '14px 16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  footerSub: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '2px',
  },
}
