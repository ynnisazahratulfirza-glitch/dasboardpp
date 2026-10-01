import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { db } from '../firebase.js'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import toast from 'react-hot-toast'

const KATEGORI_KEYWORDS = {
  pasangBaru: ['pasang baru', 'pb'],
  perubahanDaya: ['perubahan daya', 'pd', 'ubah daya', 'tambah daya'],
}

function detectKategori(value) {
  if (!value) return 'lainnya'
  const v = String(value).toLowerCase()
  for (const k of KATEGORI_KEYWORDS.pasangBaru) {
    if (v.includes(k)) return 'pasangBaru'
  }
  for (const k of KATEGORI_KEYWORDS.perubahanDaya) {
    if (v.includes(k)) return 'perubahanDaya'
  }
  return 'lainnya'
}

export default function DaftarTunggu() {
  const [pelanggan, setPelanggan] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('semua')
  const [confirmHapus, setConfirmHapus] = useState(false)
  const [uploadMode, setUploadMode] = useState('tambah')
  const fileInputRef = useRef(null)

  const handleClickUpload = (mode) => {
    setUploadMode(mode)
    fileInputRef.current?.click()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'daftar_tunggu'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setPelanggan(data)
    } catch (err) {
      toast.error('Gagal memuat data: ' + err.message)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleHapusSatu = async (id) => {
    if (!window.confirm('Hapus data ini?')) return
    try {
      await deleteDoc(doc(db, 'daftar_tunggu', id))
      setPelanggan((prev) => prev.filter((p) => p.id !== id))
      toast.success('Data berhasil dihapus!')
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message)
    }
  }

  const doHapusSemua = async () => {
    try {
      const existingDocs = await getDocs(collection(db, 'daftar_tunggu'))
      await Promise.all(existingDocs.docs.map((d) => deleteDoc(doc(db, 'daftar_tunggu', d.id))))
      toast.success('Semua data berhasil dihapus!')
      setPelanggan([])
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message)
    }
    setConfirmHapus(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    toast.loading('Membaca file Excel...', { id: 'upload' })
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Cari baris header otomatis
        const jsonRaw = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 1 })
        let headerRowIndex = 0
        for (let i = 0; i < Math.min(jsonRaw.length, 15); i++) {
          const rowStr = jsonRaw[i].map((c) => String(c).toLowerCase()).join(' ')
          if (rowStr.includes('nama') || rowStr.includes('idpel') || rowStr.includes('no agenda') || rowStr.includes('jenis transaksi') || rowStr.includes('ket transaksi')) {
            headerRowIndex = i
            break
          }
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', range: headerRowIndex })
        if (jsonData.length === 0) {
          toast.error('File Excel kosong atau format tidak sesuai', { id: 'upload' })
          setUploading(false)
          return
        }

        const headers = Object.keys(jsonData[0])
        const colMap = detectColumns(headers)

        const newData = jsonData
          .filter((row) => {
            const nama = getVal(row, colMap.nama, ['Nama', 'NAMA'])
            const idpel = getVal(row, colMap.idPel, ['IDPEL', 'ID PEL'])
            return String(nama).trim() !== '' || String(idpel).trim() !== ''
          })
          .map((row, index) => {
            const namaPelanggan = getVal(row, colMap.nama, ['nama', 'Nama', 'NAMA']) || `Pelanggan ${index + 1}`
            const noAgenda = getVal(row, colMap.noAgenda, ['noagenda_individu', 'noagenda_kolektif', 'No Agenda Individu', 'NO AGENDA'])
            const idPel = getVal(row, colMap.idPel, ['idpel', 'IDPEL', 'ID PEL', 'Id Pel'])
            const jenisTransaksi = getVal(row, colMap.jenisTransaksi, ['jenis_transaksi', 'ket_transaksi', 'Jenis Transaksi', 'Ket Transaksi'])
            const kategoriRaw = jenisTransaksi
            const kategori = detectKategori(kategoriRaw)
            const statusRaw = getVal(row, colMap.status, ['status_permohonan', 'Status Permohonan', 'STATUS PERMOHONAN'])
            const tanggal = getVal(row, colMap.tanggal, ['tglmohon', 'tgl_mohon', 'Tgl Mohon', 'TGL MOHON'])
            const daya = getVal(row, colMap.daya, ['daya_lama', 'Daya Lama', 'DAYA LAMA'])
            const dayaBaru = getVal(row, colMap.dayaBaru, ['daya_baru', 'Daya Baru', 'DAYA BARU'])
            const keterangan = getVal(row, colMap.keterangan, ['alasan_kriteria_tmp', 'Alasan Kriteria TMP', 'KETERANGAN'])
            const ulp = getVal(row, colMap.ulp, ['unitup', 'unitap', 'unit_ui', 'Unit UI', 'ULP'])
            return {
              namaPelanggan: String(namaPelanggan).trim(),
              noAgenda: String(noAgenda).trim(),
              idPel: String(idPel).trim(),
              kategoriRaw: String(kategoriRaw).trim(),
              kategori,
              status: String(statusRaw).trim(),
              tanggal: String(tanggal).trim(),
              daya: String(daya).trim(),
              dayaBaru: String(dayaBaru).trim(),
              keterangan: String(keterangan).trim(),
              ulp: String(ulp).trim(),
              createdAt: new Date().toISOString(),
            }
          })

        // SINKRONISASI: tambah yang baru, hapus yang tidak ada di file
        const existingDocs = await getDocs(collection(db, 'daftar_tunggu'))

        // Set no agenda dari file yang diupload
        const newAgendaSet = new Set(newData.map((d) => d.noAgenda).filter(Boolean))
        // Set no agenda yang sudah ada di database
        const existingAgendas = new Set(existingDocs.docs.map((d) => d.data().noAgenda).filter(Boolean))

        // Hapus data di database yang tidak ada di file baru
        const toDelete = existingDocs.docs.filter((d) => {
          const agenda = d.data().noAgenda
          return agenda && !newAgendaSet.has(agenda)
        })
        await Promise.all(toDelete.map((d) => deleteDoc(doc(db, 'daftar_tunggu', d.id))))

        // Tambah data dari file yang belum ada di database
        const toAdd = newData.filter((item) => item.noAgenda && !existingAgendas.has(item.noAgenda))
        await Promise.all(toAdd.map((item) => addDoc(collection(db, 'daftar_tunggu'), item)))

        toast.success(
          `Sinkronisasi selesai: ${toAdd.length} ditambahkan, ${toDelete.length} dihapus`,
          { id: 'upload' }
        )
        await loadData()
        setUploading(false)
      }
      reader.readAsArrayBuffer(file)
    } catch (err) {
      toast.error('Gagal membaca Excel: ' + err.message, { id: 'upload' })
      setUploading(false)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function getVal(row, mappedKey, fallbackKeys = []) {
    if (mappedKey && row[mappedKey] !== undefined && row[mappedKey] !== '') return row[mappedKey]
    for (const key of fallbackKeys) {
      if (row[key] !== undefined && row[key] !== '') return row[key]
    }
    return ''
  }

  function detectColumns(headers) {
    const map = {}
    headers.forEach((h) => {
      const lower = h.toLowerCase().trim()
      // Nama pelanggan
      if (lower === 'nama') map.nama = h
      else if (lower.includes('nama') && lower.includes('pelanggan')) map.nama = map.nama || h
      else if (lower.includes('nama')) map.nama = map.nama || h
      // ID Pelanggan
      if (lower === 'idpel') map.idPel = h
      else if (lower === 'id_pel' || lower === 'id pel') map.idPel = map.idPel || h
      else if (lower.includes('idpel') || (lower.includes('id') && lower.includes('pel'))) map.idPel = map.idPel || h
      // No Agenda — individu lebih prioritas
      if (lower === 'noagenda_individu' || lower === 'no agenda individu' || lower.includes('noagenda_individu')) map.noAgenda = h
      else if (lower === 'noagenda_kolektif' || lower.includes('noagenda_kolektif')) map.noAgenda = map.noAgenda || h
      else if (lower.includes('no agenda') || lower.includes('noagenda')) map.noAgenda = map.noAgenda || h
      // Jenis / Ket Transaksi
      if (lower === 'jenis_transaksi' || lower === 'jenis transaksi') map.jenisTransaksi = h
      else if (lower === 'ket_transaksi' || lower === 'ket transaksi') map.jenisTransaksi = map.jenisTransaksi || h
      // Status Permohonan
      if (lower === 'status_permohonan' || lower === 'status permohonan') map.status = h
      else if (lower.includes('status')) map.status = map.status || h
      // Tanggal Mohon
      if (lower === 'tglmohon' || lower === 'tgl_mohon' || lower === 'tgl mohon') map.tanggal = h
      else if (lower.includes('tglmohon') || lower.includes('tgl_mohon') || lower.includes('tanggal')) map.tanggal = map.tanggal || h
      // Daya Lama
      if (lower === 'daya_lama' || lower === 'daya lama') map.daya = h
      else if (lower.includes('daya_lama') || lower.includes('daya lama')) map.daya = map.daya || h
      // Daya Baru
      if (lower === 'daya_baru' || lower === 'daya baru') map.dayaBaru = h
      else if (lower.includes('daya_baru') || lower.includes('daya baru')) map.dayaBaru = map.dayaBaru || h
      // Keterangan — alasan_kriteria_tmp lebih prioritas
      if (lower === 'alasan_kriteria_tmp' || lower === 'alasan kriteria tmp') map.keterangan = h
      else if (lower.includes('alasan_kriteria') || lower.includes('alasan kriteria')) map.keterangan = map.keterangan || h
      else if (lower.includes('keterangan')) map.keterangan = map.keterangan || h
      // ULP — unitup atau unitap
      if (lower === 'unitup') map.ulp = h
      else if (lower === 'unitap') map.ulp = map.ulp || h
      else if (lower === 'unit ui' || lower === 'unit_ui') map.ulp = map.ulp || h
      else if (lower === 'ulp') map.ulp = map.ulp || h
    })
    return map
  }

  const filteredData = pelanggan.filter((p) => {
    const matchSearch =
      search === '' ||
      p.namaPelanggan?.toLowerCase().includes(search.toLowerCase()) ||
      p.noAgenda?.toLowerCase().includes(search.toLowerCase()) ||
      p.idPel?.toLowerCase().includes(search.toLowerCase())
    const matchKategori = filterKategori === 'semua' || p.kategori === filterKategori
    return matchSearch && matchKategori
  })

  const totalDaftarTunggu = pelanggan.length
  const totalPasangBaru = pelanggan.filter((p) => p.kategori === 'pasangBaru').length
  const totalPerubahanDaya = pelanggan.filter((p) => p.kategori === 'perubahanDaya').length
  const totalLainnya = pelanggan.filter((p) => p.kategori === 'lainnya').length
  const pctPB = totalDaftarTunggu > 0 ? Math.round((totalPasangBaru / totalDaftarTunggu) * 100) : 0
  const pctPD = totalDaftarTunggu > 0 ? Math.round((totalPerubahanDaya / totalDaftarTunggu) * 100) : 0

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.breadcrumb}>Dashboard / Daftar Tunggu</div>
          <h1 style={styles.pageTitle}>Daftar Tunggu Pelanggan</h1>
          <p style={styles.pageSubtitle}>Upload file Excel — data baru akan ditambahkan, data lama tetap ada</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={styles.uploadBtn}>
            {uploading ? 'Mengupload...' : 'Upload Excel'}
          </button>
          {pelanggan.length > 0 && (
            <button onClick={() => setConfirmHapus(true)} style={styles.resetBtn}>
              Hapus Semua
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Total Daftar Tunggu" value={totalDaftarTunggu} inisial="DT" color="#002060" bgColor="#e8edf7" sub="Total semua pelanggan" bar={100} />
        <StatCard label="Pasang Baru" value={totalPasangBaru} inisial="PB" color="#0070c0" bgColor="#dceefb" sub={`${pctPB}% dari total`} bar={pctPB} />
        <StatCard label="Perubahan Daya" value={totalPerubahanDaya} inisial="PD" color="#00873a" bgColor="#d6f0e0" sub={`${pctPD}% dari total`} bar={pctPD} />
        <StatCard label="Lainnya" value={totalLainnya} inisial="LN" color="#c45c00" bgColor="#fde8d5" sub="Kategori lainnya" bar={totalDaftarTunggu > 0 ? Math.round((totalLainnya / totalDaftarTunggu) * 100) : 0} />
      </div>

      {totalDaftarTunggu > 0 && (
        <div style={styles.infoBar}>
          <div style={styles.infoBarItem}>
            <span style={styles.infoBarLabel}>Total Data</span>
            <span style={styles.infoBarValue}>{totalDaftarTunggu} pelanggan</span>
          </div>
          <div style={styles.infoBarDivider} />
          <div style={styles.infoBarItem}>
            <span style={styles.infoBarLabel}>Pasang Baru</span>
            <span style={{ ...styles.infoBarValue, color: '#0070c0' }}>{totalPasangBaru} ({pctPB}%)</span>
          </div>
          <div style={styles.infoBarDivider} />
          <div style={styles.infoBarItem}>
            <span style={styles.infoBarLabel}>Perubahan Daya</span>
            <span style={{ ...styles.infoBarValue, color: '#00873a' }}>{totalPerubahanDaya} ({pctPD}%)</span>
          </div>
          <div style={styles.infoBarDivider} />
          <div style={styles.infoBarItem}>
            <span style={styles.infoBarLabel}>Ditampilkan</span>
            <span style={styles.infoBarValue}>{filteredData.length} data</span>
          </div>
        </div>
      )}

      <div style={styles.filterBar}>
        <input type="text" placeholder="Cari nama pelanggan, ID, atau no. agenda..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} />
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Filter:</span>
          {[{ key: 'semua', label: 'Semua' }, { key: 'pasangBaru', label: 'Pasang Baru' }, { key: 'perubahanDaya', label: 'Perubahan Daya' }, { key: 'lainnya', label: 'Lainnya' }].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterKategori(key)} style={{ ...styles.filterBtn, ...(filterKategori === key ? styles.filterBtnActive : {}) }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <span style={styles.tableTitle}>Data Pelanggan</span>
          <span style={styles.tableCount}>{filteredData.length} dari {totalDaftarTunggu} data</span>
        </div>
        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>...</div>
            <div style={styles.emptyTitle}>Memuat data...</div>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>{pelanggan.length === 0 ? 'XLS' : '?'}</div>
            <div style={styles.emptyTitle}>{pelanggan.length === 0 ? 'Belum ada data' : 'Data tidak ditemukan'}</div>
            <div style={styles.emptyDesc}>{pelanggan.length === 0 ? 'Klik Upload Excel untuk mengimpor data daftar tunggu' : 'Coba ubah kata kunci pencarian atau filter'}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>No</th>
                  <th style={styles.th}>Nama Pelanggan</th>
                  <th style={styles.th}>ID Pelanggan</th>
                  <th style={styles.th}>No. Agenda</th>
                  <th style={styles.th}>ULP</th>
                  <th style={styles.th}>Kategori</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Daya Lama</th>
                  <th style={styles.th}>Daya Baru</th>
                  <th style={styles.th}>Tanggal</th>
                  <th style={styles.th}>Keterangan</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((p, idx) => (
                  <tr key={p.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={{ ...styles.td, color: '#999', width: '40px' }}>{idx + 1}</td>
                    <td style={{ ...styles.td, minWidth: '160px' }}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{p.namaPelanggan?.charAt(0)?.toUpperCase() || 'P'}</div>
                        <span style={{ fontWeight: '600', color: '#222' }}>{p.namaPelanggan}</span>
                      </div>
                    </td>
                    <td style={styles.td}><span style={styles.idBadge}>{p.idPel || '-'}</span></td>
                    <td style={styles.td}>{p.noAgenda || '-'}</td>
                    <td style={styles.td}>{p.ulp || '-'}</td>
                    <td style={styles.td}><KategoriBadge kategori={p.kategori} label={p.kategoriRaw} /></td>
                    <td style={styles.td}>{p.status || '-'}</td>
                    <td style={styles.td}>{p.daya || '-'}</td>
                    <td style={styles.td}>{p.dayaBaru || '-'}</td>
                    <td style={styles.td}>{p.tanggal || '-'}</td>
                    <td style={{ ...styles.td, maxWidth: '200px', fontSize: '12px', color: '#666' }}>{p.keterangan || '-'}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleHapusSatu(p.id)}
                        style={styles.deleteRowBtn}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmHapus && (
        <div style={styles.overlay}>
          <div style={styles.confirmModal}>
            <div style={styles.confirmIconBox}>HPS</div>
            <h3 style={styles.confirmTitle}>Hapus Semua Data?</h3>
            <p style={styles.confirmText}>Seluruh {totalDaftarTunggu} data daftar tunggu akan dihapus permanen.</p>
            <div style={styles.confirmActions}>
              <button onClick={() => setConfirmHapus(false)} style={styles.cancelBtn}>Batal</button>
              <button onClick={doHapusSemua} style={styles.deleteConfirmBtn}>Ya, Hapus Semua</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, inisial, color, bgColor, sub, bar }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <div style={styles.statTop}>
        <div style={{ flex: 1 }}>
          <div style={styles.statLabel}>{label}</div>
          <div style={{ ...styles.statValue, color }}>{value}</div>
          <div style={styles.statSub}>{sub}</div>
        </div>
        <div style={{ ...styles.statBadge, backgroundColor: bgColor, color }}>{inisial}</div>
      </div>
      <div style={styles.statBarBg}>
        <div style={{ ...styles.statBarFill, width: `${Math.min(bar, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function KategoriBadge({ kategori, label }) {
  if (kategori === 'pasangBaru') return <span style={{ ...styles.badge, backgroundColor: '#dceefb', color: '#0070c0' }}>Pasang Baru</span>
  if (kategori === 'perubahanDaya') return <span style={{ ...styles.badge, backgroundColor: '#d6f0e0', color: '#00873a' }}>Perubahan Daya</span>
  return <span style={{ ...styles.badge, backgroundColor: '#fde8d5', color: '#c45c00' }}>{label || 'Lainnya'}</span>
}

const styles = {
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  breadcrumb: { fontSize: '12px', color: '#999', marginBottom: '4px' },
  pageTitle: { fontSize: '22px', fontWeight: '800', color: '#002060', margin: 0 },
  pageSubtitle: { fontSize: '13px', color: '#888', marginTop: '4px' },
  uploadBtn: { backgroundColor: '#002060', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,32,96,0.25)' },
  uploadBtnGanti: { backgroundColor: 'white', color: '#0070c0', border: '1.5px solid #0070c0', padding: '11px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  resetBtn: { backgroundColor: 'white', color: '#c0392b', border: '1.5px solid #c0392b', padding: '11px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' },
  statCard: { backgroundColor: 'white', borderRadius: '12px', padding: '18px 20px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '10px' },
  statLabel: { fontSize: '11px', color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' },
  statValue: { fontSize: '38px', fontWeight: '800', lineHeight: 1, marginBottom: '4px' },
  statSub: { fontSize: '12px', color: '#aaa' },
  statBadge: { width: '46px', height: '46px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', flexShrink: 0, letterSpacing: '0.5px' },
  statBarBg: { height: '4px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: '4px', transition: 'width 0.6s ease' },
  infoBar: { backgroundColor: 'white', borderRadius: '10px', padding: '14px 20px', display: 'flex', gap: '0', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', flexWrap: 'wrap' },
  infoBarItem: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 20px', flex: 1, minWidth: '100px' },
  infoBarLabel: { fontSize: '11px', color: '#aaa', fontWeight: '600', textTransform: 'uppercase' },
  infoBarValue: { fontSize: '15px', fontWeight: '700', color: '#222' },
  infoBarDivider: { width: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' },
  filterBar: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '13px', outline: 'none', backgroundColor: 'white' },
  filterGroup: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' },
  filterLabel: { fontSize: '12px', color: '#888', fontWeight: '600' },
  filterBtn: { padding: '7px 14px', borderRadius: '20px', border: '1.5px solid #e0e0e0', backgroundColor: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#666' },
  filterBtnActive: { backgroundColor: '#002060', color: 'white', borderColor: '#002060' },
  tableCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tableHeader: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tableTitle: { fontWeight: '700', color: '#222', fontSize: '15px' },
  tableCount: { fontSize: '12px', color: '#aaa', fontWeight: '500' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeadRow: { backgroundColor: '#002060' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', letterSpacing: '0.4px' },
  td: { padding: '11px 14px', fontSize: '13px', color: '#444', borderBottom: '1px solid #f5f5f5', verticalAlign: 'middle' },
  trEven: { backgroundColor: 'white' },
  trOdd: { backgroundColor: '#fafbfc' },
  nameCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#002060', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
  idBadge: { backgroundColor: '#f4f6fa', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#555', fontFamily: 'monospace' },
  badge: { padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' },
  emptyState: { padding: '60px 20px', textAlign: 'center', color: '#bbb' },
  emptyIcon: { width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: '#bbb', margin: '0 auto 14px', letterSpacing: '0.5px' },
  emptyTitle: { fontSize: '16px', fontWeight: '600', color: '#999', marginBottom: '6px' },
  emptyDesc: { fontSize: '13px', color: '#ccc' },
  deleteRowBtn: { padding: '4px 10px', borderRadius: '6px', border: '1.5px solid #c0392b', color: '#c0392b', backgroundColor: '#fde8e8', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  confirmModal: { backgroundColor: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', maxWidth: '360px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  confirmIconBox: { width: '60px', height: '60px', borderRadius: '14px', backgroundColor: '#fde8e8', color: '#c0392b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', margin: '0 auto 16px' },
  confirmTitle: { fontSize: '20px', fontWeight: '800', color: '#222', marginBottom: '8px' },
  confirmText: { fontSize: '14px', color: '#999', marginBottom: '24px' },
  confirmActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  cancelBtn: { padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #ddd', backgroundColor: 'white', color: '#555', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  deleteConfirmBtn: { padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#c0392b', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}
