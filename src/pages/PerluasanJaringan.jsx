import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { db } from '../firebase.js'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import toast from 'react-hot-toast'

const emptyForm = {
  nadinNps: '',
  namaPelanggan: '',
  idPelanggan: '',
  jenisTransaksi: '',
  kontrak: '',
  vendor: '',
  status: '',
  noAgenda: '',
  tanggalBayar: '',
  dayaLama: '',
  dayaBaru: '',
  keterangan: '',
}

// Hitung hari layanan dari tanggalBayar sampai hari ini
function hitungHariLayanan(tanggalBayar) {
  if (!tanggalBayar) return null
  const bayar = new Date(tanggalBayar)
  if (isNaN(bayar)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  bayar.setHours(0, 0, 0, 0)
  const diff = Math.floor((today - bayar) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
}

// Kompres gambar sebelum simpan ke base64
function compressImage(file, maxWidthPx = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidthPx) {
          h = Math.round((h * maxWidthPx) / w)
          w = maxWidthPx
        }
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve({ base64: canvas.toDataURL('image/jpeg', quality), type: 'image/jpeg' })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function readFileAsBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve({ base64: e.target.result, type: file.type })
    reader.readAsDataURL(file)
  })
}

export default function PerluasanJaringan() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [hapusSemuaConfirm, setHapusSemuaConfirm] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)
  // multi-file states
  const [selectedFiles, setSelectedFiles] = useState([]) // { name, type, base64 }
  const [existingFiles, setExistingFiles] = useState([]) // { name, type, base64 }
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'perluasan_jaringan'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setData(items)
    } catch (err) {
      toast.error('Gagal memuat data: ' + err.message)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setSelectedFiles([])
    setExistingFiles([])
    setShowModal(true)
  }

  const handleOpenEdit = (item) => {
    setForm({
      nadinNps: item.nadinNps || '',
      namaPelanggan: item.namaPelanggan || '',
      idPelanggan: item.idPelanggan || '',
      jenisTransaksi: item.jenisTransaksi || '',
      kontrak: item.kontrak || '',
      vendor: item.vendor || '',
      status: item.status || item.progres || '',
      noAgenda: item.noAgenda || '',
      tanggalBayar: item.tanggalBayar || '',
      dayaLama: item.dayaLama || '',
      dayaBaru: item.dayaBaru || '',
      keterangan: item.keterangan || '',
    })
    setExistingFiles(item.files || [])
    setSelectedFiles([])
    setEditId(item.id)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm)
    setSelectedFiles([])
    setExistingFiles([])
  }

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setProcessing(true)
    try {
      const results = []
      for (const file of files) {
        // Cek duplikat
        const isDup = selectedFiles.some((f) => f.name === file.name && f.size === file.size)
        if (isDup) continue
        let base64, type
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file)
          base64 = compressed.base64
          type = compressed.type
        } else {
          // PDF — cek ukuran max 800KB
          if (file.size > 800 * 1024) {
            toast.error(`${file.name}: PDF terlalu besar (maks 800KB)`)
            continue
          }
          const result = await readFileAsBase64(file)
          base64 = result.base64
          type = result.type
        }
        results.push({ name: file.name, type, base64, size: file.size })
      }
      setSelectedFiles((prev) => [...prev, ...results])
    } catch (err) {
      toast.error('Gagal memproses file: ' + err.message)
    }
    setProcessing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeSelectedFile = (index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  const removeExistingFile = (index) => setExistingFiles((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nadinNps.trim()) { toast.error('Nodin / Nota Dinas harus diisi!'); return }
    setSubmitting(true)
    try {
      const allFiles = [...existingFiles, ...selectedFiles.map((f) => ({ name: f.name, type: f.type, base64: f.base64 }))]
      if (editId) {
        await updateDoc(doc(db, 'perluasan_jaringan', editId), { ...form, files: allFiles, updatedAt: new Date().toISOString() })
        toast.success('Data berhasil diperbarui!')
      } else {
        await addDoc(collection(db, 'perluasan_jaringan'), { ...form, files: allFiles, createdAt: new Date().toISOString() })
        toast.success('Data berhasil ditambahkan!')
      }
      handleCloseModal()
      await loadData()
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message)
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'perluasan_jaringan', id))
      toast.success('Data berhasil dihapus!')
      setDeleteConfirm(null)
      await loadData()
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message)
    }
  }

  const handleHapusSemua = async () => {
    try {
      const existingDocs = await getDocs(collection(db, 'perluasan_jaringan'))
      await Promise.all(existingDocs.docs.map((d) => deleteDoc(doc(db, 'perluasan_jaringan', d.id))))
      toast.success('Semua data berhasil dihapus!')
      setData([])
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message)
    }
    setHapusSemuaConfirm(false)
  }

  const handleExportExcel = () => {
    if (data.length === 0) { toast.error('Tidak ada data untuk diekspor!'); return }
    const rows = data.map((item, idx) => ({
      'No': idx + 1,
      'Nodin / Nota Dinas': item.nadinNps || '',
      'Nama Pelanggan': item.namaPelanggan || '',
      'ID Pelanggan': item.idPelanggan || '',
      'Jenis Transaksi': item.jenisTransaksi || '',
      'Kontrak': item.kontrak || '',
      'Vendor': item.vendor || '',
      'Status': item.status || item.progres || '',
      'No. Agenda': item.noAgenda || '',
      'Tanggal Bayar': item.tanggalBayar || '',
      'Hari Layanan': hitungHariLayanan(item.tanggalBayar) ?? '',
      'Daya Lama': item.dayaLama || '',
      'Daya Baru': item.dayaBaru || '',
      'Keterangan': item.keterangan || '',
      'Jumlah Dokumen': (item.files || []).length,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Perluasan Jaringan')
    ws['!cols'] = [
      { wch: 5 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 16 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 12 },
    ]
    XLSX.writeFile(wb, `Perluasan_Jaringan_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`)
    toast.success('Data berhasil diekspor ke Excel!')
  }

  const getStatusConfig = (status) => {
    const s = String(status).toLowerCase()
    if (s.includes('selesai')) return { color: '#00873a', bg: '#d6f0e0', label: status }
    if (s.includes('pekerjaan')) return { color: '#0070c0', bg: '#dceefb', label: status }
    if (s.includes('kontrak')) return { color: '#c47c00', bg: '#fef3d6', label: status }
    if (s.includes('pembayaran')) return { color: '#7b2fa0', bg: '#f3e6fc', label: status }
    return { color: '#666', bg: '#f0f0f0', label: status || '-' }
  }

  const totalSelesai = data.filter((d) => String(d.status || d.progres || '').toLowerCase().includes('selesai')).length
  const totalProses = data.filter((d) => String(d.status || d.progres || '').toLowerCase().includes('pekerjaan')).length
  const totalBelum = data.filter((d) => String(d.status || d.progres || '').toLowerCase().includes('pembayaran') || String(d.status || d.progres || '').toLowerCase().includes('kontrak')).length

  const isUploading = false

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.breadcrumb}>Dashboard / Perluasan Jaringan</div>
          <h1 style={styles.pageTitle}>Perluasan Jaringan</h1>
          <p style={styles.pageSubtitle}>Kelola data perluasan jaringan PLN UP3 TJP</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleOpenAdd} style={styles.addBtn}>Tambah Data</button>
          {data.length > 0 && (
            <>
              <button onClick={handleExportExcel} style={styles.exportBtn}>Export Excel</button>
              <button onClick={() => setHapusSemuaConfirm(true)} style={styles.hapusSemuaBtn}>Hapus Semua</button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <SummaryCard label="Total Perluasan Jaringan" value={data.length} inisial="PJ" color="#002060" bgColor="#e8edf7" sub="Total semua data" />
        <SummaryCard label="Selesai" value={totalSelesai} inisial="OK" color="#00873a" bgColor="#d6f0e0" sub="Pekerjaan selesai" />
        <SummaryCard label="Progres Pekerjaan" value={totalProses} inisial="PP" color="#0070c0" bgColor="#dceefb" sub="Sedang dikerjakan" />
        <SummaryCard label="Pembayaran / Kontrak" value={totalBelum} inisial="PK" color="#7b2fa0" bgColor="#f3e6fc" sub="Tahap awal" />
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <span style={styles.tableTitle}>Data Perluasan Jaringan</span>
          <span style={styles.tableCount}>{data.length} data</span>
        </div>
        {loading ? (
          <div style={styles.emptyState}><div style={styles.emptyIcon}>PJ</div><div style={styles.emptyTitle}>Memuat data...</div></div>
        ) : data.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>PJ</div>
            <div style={styles.emptyTitle}>Belum ada data</div>
            <div style={styles.emptyDesc}>Klik Tambah Data untuk menambahkan data perluasan jaringan</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>No</th>
                  <th style={styles.th}>Nodin / Nota Dinas</th>
                  <th style={styles.th}>Nama Pelanggan</th>
                  <th style={styles.th}>ID Pelanggan</th>
                  <th style={styles.th}>Jenis Transaksi</th>
                  <th style={styles.th}>Kontrak</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>No. Agenda</th>
                  <th style={styles.th}>Tanggal Bayar</th>
                  <th style={styles.th}>Hari Layanan</th>
                  <th style={styles.th}>Daya Lama</th>
                  <th style={styles.th}>Daya Baru</th>
                  <th style={styles.th}>Keterangan</th>
                  <th style={styles.th}>Dokumen</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => {
                  const sc = getStatusConfig(item.status || item.progres)
                  const hariLayanan = hitungHariLayanan(item.tanggalBayar)
                  const files = item.files || []
                  return (
                    <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={{ ...styles.td, color: '#999', width: '40px' }}>{idx + 1}</td>
                      <td style={styles.td}>
                        <div style={styles.nadinCell}>
                          <div style={styles.nadinAvatar}>{item.nadinNps?.charAt(0)?.toUpperCase() || 'N'}</div>
                          <span style={{ fontWeight: '600', color: '#222' }}>{item.nadinNps || '-'}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{item.namaPelanggan || '-'}</td>
                      <td style={styles.td}><span style={styles.idBadge}>{item.idPelanggan || '-'}</span></td>
                      <td style={styles.td}>
                        {item.jenisTransaksi ? (
                          <span style={{ backgroundColor: item.jenisTransaksi === 'Pasang Baru' ? '#dceefb' : '#d6f0e0', color: item.jenisTransaksi === 'Pasang Baru' ? '#0070c0' : '#00873a', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                            {item.jenisTransaksi}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={styles.td}>{item.kontrak || '-'}</td>
                      <td style={styles.td}>{item.vendor || '-'}</td>
                      <td style={styles.td}>
                        <span style={{ backgroundColor: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={styles.td}>{item.noAgenda || '-'}</td>
                      <td style={styles.td}>{item.tanggalBayar || '-'}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {hariLayanan !== null ? (
                          <span style={{ ...styles.hariLayananBadge, backgroundColor: hariLayanan > 90 ? '#fde8e8' : hariLayanan > 30 ? '#fef3d6' : '#d6f0e0', color: hariLayanan > 90 ? '#c0392b' : hariLayanan > 30 ? '#c47c00' : '#00873a' }}>
                            {hariLayanan} hari
                          </span>
                        ) : '-'}
                      </td>
                      <td style={styles.td}>{item.dayaLama || '-'}</td>
                      <td style={styles.td}>{item.dayaBaru || '-'}</td>
                      <td style={{ ...styles.td, maxWidth: '160px' }}>
                        <KeteranganCell text={item.keterangan} /></td>
                      <td style={styles.td}>
                        {files.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {files.map((f, fi) => (
                              <button key={fi} onClick={() => setPreviewDoc({ url: f.base64, name: f.name, type: f.type })} style={styles.docBtn}>
                                {f.type?.includes('pdf') ? 'PDF' : 'Foto'}{files.length > 1 ? ` ${fi + 1}` : ''}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#ccc', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleOpenEdit(item)} style={styles.editBtn}>Edit</button>
                          <button onClick={() => setDeleteConfirm(item.id)} style={styles.deleteBtn}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={styles.modalHeaderIcon}>
                  {editId ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  )}
                </div>
                <div>
                  <h2 style={styles.modalTitle}>{editId ? 'Edit Data' : 'Tambah Perluasan Jaringan'}</h2>
                  <p style={styles.modalSub}>{editId ? 'Perbarui informasi data perluasan jaringan' : 'Isi form berikut untuk menambahkan data baru'}</p>
                </div>
              </div>
              <button onClick={handleCloseModal} style={styles.closeBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.sectionLabel}><span style={styles.sectionDot} />Identitas</div>
              <div style={styles.formGrid}>
                <FormField label="Nodin / Nota Dinas" required name="nadinNps" value={form.nadinNps} onChange={handleChange} placeholder="Contoh: ND-001/2024" />
                <FormField label="Nama Pelanggan" name="namaPelanggan" value={form.namaPelanggan} onChange={handleChange} placeholder="Nama lengkap pelanggan" />
                <FormField label="ID Pelanggan" name="idPelanggan" value={form.idPelanggan} onChange={handleChange} placeholder="Contoh: 5210xxxxxxxx" />
                <FormField label="No. Agenda" name="noAgenda" value={form.noAgenda} onChange={handleChange} placeholder="Nomor agenda" />
              </div>

              <div style={styles.sectionLabel}><span style={styles.sectionDot} />Transaksi &amp; Daya</div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Jenis Transaksi</label>
                  <select name="jenisTransaksi" value={form.jenisTransaksi} onChange={handleChange} style={styles.select}>
                    <option value="">-- Pilih Jenis Transaksi --</option>
                    <option value="Pasang Baru">Pasang Baru</option>
                    <option value="Perubahan Daya">Perubahan Daya</option>
                  </select>
                </div>
                <FormField label="Kontrak" name="kontrak" value={form.kontrak} onChange={handleChange} placeholder="Nomor kontrak" />
                <FormField label="Daya Lama (VA)" name="dayaLama" value={form.dayaLama} onChange={handleChange} placeholder="Contoh: 900" />
                <FormField label="Daya Baru (VA)" name="dayaBaru" value={form.dayaBaru} onChange={handleChange} placeholder="Contoh: 1300" />
              </div>

              <div style={styles.sectionLabel}><span style={styles.sectionDot} />Pekerjaan</div>
              <div style={styles.formGrid}>
                <FormField label="Vendor" name="vendor" value={form.vendor} onChange={handleChange} placeholder="Nama vendor" />
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select name="status" value={form.status} onChange={handleChange} style={styles.select}>
                    <option value="">-- Pilih Status --</option>
                    <option value="Pembayaran">Pembayaran</option>
                    <option value="Progres Kontrak">Progres Kontrak</option>
                    <option value="Progres Pekerjaan">Progres Pekerjaan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Tanggal Bayar
                    {form.tanggalBayar && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '600', color: '#0070c0' }}>
                        Hari layanan: {hitungHariLayanan(form.tanggalBayar) ?? 0} hari
                      </span>
                    )}
                  </label>
                  <input type="date" name="tanggalBayar" value={form.tanggalBayar} onChange={handleChange} style={styles.input} />
                </div>
              </div>

              <div style={{ ...styles.formGroup, marginBottom: '20px' }}>
                <label style={styles.label}>Keterangan</label>
                <textarea name="keterangan" value={form.keterangan} onChange={handleChange} placeholder="Tuliskan keterangan atau catatan tambahan..." rows={3} style={styles.textarea} />
              </div>

              {/* Upload Multi-File */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Dokumen
                  <span style={styles.labelHint}>Foto (dikompres otomatis) / PDF maks 800KB</span>
                </label>

                {/* File yang sudah ada (edit mode) */}
                {existingFiles.length > 0 && (
                  <div style={styles.fileListBox}>
                    <div style={styles.fileListTitle}>File tersimpan ({existingFiles.length})</div>
                    {existingFiles.map((f, i) => (
                      <div key={i} style={styles.fileItem}>
                        <div style={styles.fileItemIcon}>{f.type?.includes('pdf') ? 'PDF' : 'IMG'}</div>
                        <span style={styles.fileItemName}>{f.name}</span>
                        <button type="button" onClick={() => removeExistingFile(i)} style={styles.fileItemRemove}>Hapus</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File baru dipilih */}
                {selectedFiles.length > 0 && (
                  <div style={styles.fileListBox}>
                    <div style={styles.fileListTitle}>File baru ({selectedFiles.length})</div>
                    {selectedFiles.map((f, i) => (
                      <div key={i} style={styles.fileItem}>
                        <div style={styles.fileItemIcon}>{f.type?.includes('pdf') ? 'PDF' : 'IMG'}</div>
                        <span style={styles.fileItemName}>{f.name}</span>
                        <button type="button" onClick={() => removeSelectedFile(i)} style={styles.fileItemRemove}>Hapus</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tombol Pilih File */}
                <label style={styles.uploadArea}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <div style={styles.uploadPlaceholder}>
                    <div style={styles.uploadPlaceholderIcon}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#aab" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <div style={styles.uploadPlaceholderText}>Klik untuk pilih file</div>
                    <div style={styles.uploadPlaceholderHint}>JPG, PNG, PDF — bisa pilih lebih dari satu</div>
                  </div>
                </label>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={handleCloseModal} style={styles.cancelBtn}>Batal</button>
                <button type="submit" disabled={submitting || processing} style={styles.submitBtn}>
                  {processing ? 'Memproses file...' : submitting ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={styles.confirmModal}>
            <div style={styles.confirmIconBox}>HPS</div>
            <h3 style={styles.confirmTitle}>Hapus Data?</h3>
            <p style={styles.confirmText}>Data dan semua dokumen terkait akan dihapus permanen.</p>
            <div style={styles.confirmActions}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={styles.deleteConfirmBtn}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Hapus Semua Confirm */}
      {hapusSemuaConfirm && (
        <div style={styles.overlay}>
          <div style={styles.confirmModal}>
            <div style={styles.confirmIconBox}>HPS</div>
            <h3 style={styles.confirmTitle}>Hapus Semua Data?</h3>
            <p style={styles.confirmText}>Seluruh {data.length} data dan dokumennya akan dihapus permanen.</p>
            <div style={styles.confirmActions}>
              <button onClick={() => setHapusSemuaConfirm(false)} style={styles.cancelBtn}>Batal</button>
              <button onClick={handleHapusSemua} style={styles.deleteConfirmBtn}>Ya, Hapus Semua</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Dokumen */}
      {previewDoc && (
        <div style={styles.overlay} onClick={() => setPreviewDoc(null)}>
          <div style={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewHeader}>
              <div>
                <div style={styles.previewTitle}>{previewDoc.name || 'Dokumen'}</div>
                <div style={styles.previewSub}>{previewDoc.type?.includes('pdf') ? 'PDF Document' : 'Gambar'}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a href={previewDoc.url} download={previewDoc.name} style={styles.downloadBtn}>Download</a>
                <button onClick={() => setPreviewDoc(null)} style={styles.previewCloseBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
            <div style={styles.previewContent}>
              {previewDoc.type?.includes('image') ? (
                <img src={previewDoc.url} alt={previewDoc.name} style={styles.previewImg} />
              ) : previewDoc.type?.includes('pdf') ? (
                <iframe src={previewDoc.url} title={previewDoc.name} style={styles.previewPdf} />
              ) : (
                <div style={styles.previewUnsupported}>Format file tidak dapat ditampilkan. Silakan download untuk membuka.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KeteranganCell({ text }) {
  const [open, setOpen] = React.useState(false)
  if (!text) return <span style={{ color: '#ccc', fontSize: '12px' }}>-</span>
  const isLong = text.length > 60
  return (
    <>
      <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
        {text}
      </div>
      {isLong && (
        <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: '#0070c0', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 0', marginTop: '2px' }}>
          Lihat selengkapnya
        </button>
      )}
      {open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,20,60,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }} onClick={() => setOpen(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>Keterangan</div>
            <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</p>
            <button onClick={() => setOpen(false)} style={{ marginTop: '20px', padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #e0e0e0', backgroundColor: 'white', color: '#555', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function SummaryCard({ label, value, inisial, color, bgColor, sub }) {
  return (
    <div style={{ ...styles.summaryCard, borderTop: `4px solid ${color}` }}>
      <div style={styles.summaryTop}>
        <div>
          <div style={styles.summaryLabel}>{label}</div>
          <div style={{ ...styles.summaryValue, color }}>{value}</div>
          <div style={styles.summarySub}>{sub}</div>
        </div>
        <div style={{ ...styles.summaryBadge, backgroundColor: bgColor, color }}>{inisial}</div>
      </div>
    </div>
  )
}

function FormField({ label, name, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: '#e53935', marginLeft: '2px' }}>*</span>}
      </label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} style={styles.input} />
    </div>
  )
}

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  breadcrumb: { fontSize: '12px', color: '#999', marginBottom: '4px' },
  pageTitle: { fontSize: '22px', fontWeight: '800', color: '#002060', margin: 0 },
  pageSubtitle: { fontSize: '13px', color: '#888', marginTop: '4px' },
  addBtn: { backgroundColor: '#002060', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,32,96,0.25)' },
  exportBtn: { backgroundColor: '#00873a', color: 'white', border: 'none', padding: '11px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,135,58,0.25)' },
  hapusSemuaBtn: { backgroundColor: 'white', color: '#c0392b', border: '1.5px solid #c0392b', padding: '11px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' },
  summaryCard: { backgroundColor: 'white', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
  summaryTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' },
  summaryLabel: { fontSize: '11px', color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' },
  summaryValue: { fontSize: '34px', fontWeight: '800', lineHeight: 1, marginBottom: '4px' },
  summarySub: { fontSize: '12px', color: '#aaa' },
  summaryBadge: { width: '46px', height: '46px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', flexShrink: 0 },
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
  nadinCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  nadinAvatar: { width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#002060', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
  idBadge: { backgroundColor: '#f4f6fa', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#555', fontFamily: 'monospace' },
  editBtn: { padding: '5px 12px', borderRadius: '6px', border: '1.5px solid #0070c0', color: '#0070c0', backgroundColor: '#dceefb', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  deleteBtn: { padding: '5px 12px', borderRadius: '6px', border: '1.5px solid #c0392b', color: '#c0392b', backgroundColor: '#fde8e8', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  docBtn: { display: 'inline-block', padding: '3px 10px', borderRadius: '6px', backgroundColor: '#e8edf7', color: '#002060', fontSize: '11px', fontWeight: '700', textDecoration: 'none', border: '1px solid #c0cce0', cursor: 'pointer' },
  hariLayananBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' },
  emptyState: { padding: '60px 20px', textAlign: 'center', color: '#bbb' },
  emptyIcon: { width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: '#bbb', margin: '0 auto 14px' },
  emptyTitle: { fontSize: '16px', fontWeight: '600', color: '#999', marginBottom: '6px' },
  emptyDesc: { fontSize: '13px', color: '#ccc' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,20,60,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', backdropFilter: 'blur(2px)' },
  modal: { backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,20,80,0.25)' },
  modalHeader: { padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, borderRadius: '20px 20px 0 0', background: 'linear-gradient(135deg, #002060 0%, #0050a0 100%)' },
  modalHeaderIcon: { width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 },
  modalSub: { fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px', marginBottom: 0 },
  closeBtn: { width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 },
  form: { padding: '24px 28px' },
  sectionLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: '#002060', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', marginTop: '4px' },
  sectionDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#002060', flexShrink: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' },
  labelHint: { marginLeft: 'auto', fontSize: '11px', fontWeight: '500', color: '#aaa' },
  input: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e8eaf0', fontSize: '13.5px', outline: 'none', width: '100%', boxSizing: 'border-box', backgroundColor: '#fafbfd', color: '#222' },
  select: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e8eaf0', fontSize: '13.5px', outline: 'none', backgroundColor: '#fafbfd', cursor: 'pointer', width: '100%', color: '#222' },
  textarea: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e8eaf0', fontSize: '13.5px', outline: 'none', width: '100%', boxSizing: 'border-box', backgroundColor: '#fafbfd', color: '#222', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' },
  fileListBox: { backgroundColor: '#f8fafd', border: '1px solid #e8eaf0', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  fileListTitle: { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  fileItem: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #eef0f6' },
  fileItemIcon: { width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#e8edf7', color: '#002060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800', flexShrink: 0 },
  fileItemName: { flex: 1, fontSize: '12px', color: '#333', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileItemRemove: { padding: '3px 10px', borderRadius: '6px', border: '1px solid #f5c0c0', backgroundColor: '#fde8e8', color: '#c0392b', fontSize: '11px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 },
  uploadArea: { display: 'block', border: '2px dashed #c8d0e0', borderRadius: '12px', padding: '16px', cursor: 'pointer', backgroundColor: '#f8fafd', textAlign: 'center', marginTop: '4px' },
  uploadPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
  uploadPlaceholderIcon: { marginBottom: '2px' },
  uploadPlaceholderText: { fontSize: '13px', fontWeight: '600', color: '#555' },
  uploadPlaceholderHint: { fontSize: '11px', color: '#aaa' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f0f0f0' },
  cancelBtn: { padding: '11px 22px', borderRadius: '10px', border: '1.5px solid #e0e0e0', backgroundColor: 'white', color: '#666', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  submitBtn: { padding: '11px 26px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #002060, #0050a0)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '700', boxShadow: '0 4px 14px rgba(0,32,96,0.3)' },
  confirmModal: { backgroundColor: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', maxWidth: '360px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  confirmIconBox: { width: '60px', height: '60px', borderRadius: '14px', backgroundColor: '#fde8e8', color: '#c0392b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', margin: '0 auto 16px' },
  confirmTitle: { fontSize: '20px', fontWeight: '800', color: '#222', marginBottom: '8px' },
  confirmText: { fontSize: '14px', color: '#999', marginBottom: '24px' },
  confirmActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  deleteConfirmBtn: { padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#c0392b', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  previewModal: { backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,20,80,0.25)', overflow: 'hidden' },
  previewHeader: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  previewTitle: { fontSize: '15px', fontWeight: '700', color: '#222' },
  previewSub: { fontSize: '12px', color: '#aaa', marginTop: '2px' },
  downloadBtn: { padding: '8px 18px', borderRadius: '8px', backgroundColor: '#002060', color: 'white', fontSize: '13px', fontWeight: '600', textDecoration: 'none', border: 'none', cursor: 'pointer' },
  previewCloseBtn: { width: '34px', height: '34px', borderRadius: '8px', border: '1.5px solid #e0e0e0', backgroundColor: 'white', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  previewContent: { flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6fa', padding: '20px', minHeight: '300px' },
  previewImg: { maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', objectFit: 'contain' },
  previewPdf: { width: '100%', height: '70vh', border: 'none', borderRadius: '4px' },
  previewUnsupported: { color: '#999', fontSize: '14px', textAlign: 'center', padding: '40px' },
}
