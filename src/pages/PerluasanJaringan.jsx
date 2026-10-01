import React, { useState, useEffect } from 'react'
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
  kontrak: '',
  vendor: '',
  progres: '',
  noAgenda: '',
  tanggalBayar: '',
  keterangan: '',
}

export default function PerluasanJaringan() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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

  const handleOpenAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true) }
  const handleOpenEdit = (item) => {
    setForm({ nadinNps: item.nadinNps || '', kontrak: item.kontrak || '', vendor: item.vendor || '', progres: item.progres || '', noAgenda: item.noAgenda || '', tanggalBayar: item.tanggalBayar || '', keterangan: item.keterangan || '' })
    setEditId(item.id)
    setShowModal(true)
  }
  const handleCloseModal = () => { setShowModal(false); setEditId(null); setForm(emptyForm) }
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nadinNps.trim()) { toast.error('Nadin / NPS harus diisi!'); return }
    setSubmitting(true)
    try {
      if (editId) {
        await updateDoc(doc(db, 'perluasan_jaringan', editId), { ...form, updatedAt: new Date().toISOString() })
        toast.success('Data berhasil diperbarui!')
      } else {
        await addDoc(collection(db, 'perluasan_jaringan'), { ...form, createdAt: new Date().toISOString() })
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

  const getProgresConfig = (progres) => {
    const p = String(progres).toLowerCase()
    if (p.includes('selesai') || p.includes('done')) return { color: '#00873a', bg: '#d6f0e0', label: progres }
    if (p.includes('proses') || p.includes('progress')) return { color: '#c47c00', bg: '#fef3d6', label: progres }
    if (p.includes('belum') || p.includes('pending')) return { color: '#c45c00', bg: '#fde8d5', label: progres }
    return { color: '#666', bg: '#f0f0f0', label: progres || '-' }
  }

  const totalSelesai = data.filter((d) => String(d.progres).toLowerCase().includes('selesai')).length
  const totalProses = data.filter((d) => String(d.progres).toLowerCase().includes('proses') || String(d.progres).toLowerCase().includes('progress')).length
  const totalBelum = data.filter((d) => String(d.progres).toLowerCase().includes('belum') || String(d.progres).toLowerCase().includes('pending')).length

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.breadcrumb}>Dashboard / Perluasan Jaringan</div>
          <h1 style={styles.pageTitle}>Perluasan Jaringan</h1>
          <p style={styles.pageSubtitle}>Kelola data perluasan jaringan PLN UP3 TJP</p>
        </div>
        <button onClick={handleOpenAdd} style={styles.addBtn}>Tambah Data</button>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <SummaryCard label="Total Perluasan Jaringan" value={`${data.length}`} inisial="PJ" color="#002060" bgColor="#e8edf7" sub="Total semua data" />
        <SummaryCard label="Selesai" value={totalSelesai} inisial="OK" color="#00873a" bgColor="#d6f0e0" sub="Pekerjaan selesai" />
        <SummaryCard label="Dalam Proses" value={totalProses} inisial="PR" color="#c47c00" bgColor="#fef3d6" sub="Sedang dikerjakan" />
        <SummaryCard label="Belum Mulai" value={totalBelum} inisial="BM" color="#c45c00" bgColor="#fde8d5" sub="Menunggu pengerjaan" />
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div>
            <span style={styles.tableTitle}>Data Perluasan Jaringan</span>
            <span style={styles.tableCount}>{data.length} data</span>
          </div>
        </div>
        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>PJ</div>
            <div style={styles.emptyTitle}>Memuat data...</div>
          </div>
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
                  <th style={styles.th}>Nadin / NPS</th>
                  <th style={styles.th}>Kontrak</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Progres</th>
                  <th style={styles.th}>No. Agenda</th>
                  <th style={styles.th}>Tanggal Bayar</th>
                  <th style={styles.th}>Keterangan</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => {
                  const pc = getProgresConfig(item.progres)
                  return (
                    <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={{ ...styles.td, color: '#999', width: '40px' }}>{idx + 1}</td>
                      <td style={styles.td}>
                        <div style={styles.nadinCell}>
                          <div style={styles.nadinAvatar}>{item.nadinNps?.charAt(0)?.toUpperCase() || 'N'}</div>
                          <span style={{ fontWeight: '600', color: '#222' }}>{item.nadinNps || '-'}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{item.kontrak || '-'}</td>
                      <td style={styles.td}>{item.vendor || '-'}</td>
                      <td style={styles.td}>
                        <span style={{ backgroundColor: pc.bg, color: pc.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                          {pc.label}
                        </span>
                      </td>
                      <td style={styles.td}>{item.noAgenda || '-'}</td>
                      <td style={styles.td}>{item.tanggalBayar || '-'}</td>
                      <td style={{ ...styles.td, maxWidth: '160px', fontSize: '12px', color: '#777' }}>{item.keterangan || '-'}</td>
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
              <div>
                <h2 style={styles.modalTitle}>{editId ? 'Edit Data' : 'Tambah Perluasan Jaringan'}</h2>
                <p style={styles.modalSub}>Lengkapi semua informasi yang diperlukan</p>
              </div>
              <button onClick={handleCloseModal} style={styles.closeBtn}>Tutup</button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <FormField label="Nadin / NPS *" name="nadinNps" value={form.nadinNps} onChange={handleChange} placeholder="Masukkan Nadin / NPS" required />
                <FormField label="Kontrak" name="kontrak" value={form.kontrak} onChange={handleChange} placeholder="Nomor kontrak" />
                <FormField label="Vendor" name="vendor" value={form.vendor} onChange={handleChange} placeholder="Nama vendor" />
                <div style={styles.formGroup}>
                  <label style={styles.label}>Progres</label>
                  <select name="progres" value={form.progres} onChange={handleChange} style={styles.select}>
                    <option value="">-- Pilih Progres --</option>
                    <option value="Belum Mulai">Belum Mulai</option>
                    <option value="Dalam Proses">Dalam Proses</option>
                    <option value="On Progress">On Progress</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <FormField label="No. Agenda" name="noAgenda" value={form.noAgenda} onChange={handleChange} placeholder="Nomor agenda" />
                <FormField label="Tanggal Bayar" name="tanggalBayar" value={form.tanggalBayar} onChange={handleChange} type="date" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Keterangan</label>
                <textarea name="keterangan" value={form.keterangan} onChange={handleChange} placeholder="Keterangan tambahan..." rows={3} style={{ ...styles.input, resize: 'vertical' }} />
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={handleCloseModal} style={styles.cancelBtn}>Batal</button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>
                  {submitting ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Data'}
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
            <p style={styles.confirmText}>Data yang dihapus tidak dapat dikembalikan.</p>
            <div style={styles.confirmActions}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={styles.deleteConfirmBtn}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
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
      <label style={styles.label}>{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} style={styles.input} />
    </div>
  )
}

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  breadcrumb: { fontSize: '12px', color: '#999', marginBottom: '4px' },
  pageTitle: { fontSize: '22px', fontWeight: '800', color: '#002060', margin: 0 },
  pageSubtitle: { fontSize: '13px', color: '#888', marginTop: '4px' },
  addBtn: {
    backgroundColor: '#002060',
    color: 'white',
    border: 'none',
    padding: '11px 22px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(0,32,96,0.25)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '18px 20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
  },
  summaryTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
  },
  summaryLabel: {
    fontSize: '11px',
    color: '#999',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: '6px',
  },
  summaryValue: {
    fontSize: '34px',
    fontWeight: '800',
    lineHeight: 1,
    marginBottom: '4px',
  },
  summarySub: { fontSize: '12px', color: '#aaa' },
  summaryBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '800',
    flexShrink: 0,
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  tableHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableTitle: { fontWeight: '700', color: '#222', fontSize: '15px', marginRight: '10px' },
  tableCount: { fontSize: '12px', color: '#aaa', fontWeight: '500' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeadRow: { backgroundColor: '#002060' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', letterSpacing: '0.4px' },
  td: { padding: '11px 14px', fontSize: '13px', color: '#444', borderBottom: '1px solid #f5f5f5', verticalAlign: 'middle' },
  trEven: { backgroundColor: 'white' },
  trOdd: { backgroundColor: '#fafbfc' },
  nadinCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  nadinAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: '#002060',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
  idBadge: {
    backgroundColor: '#f4f6fa',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#555',
    fontFamily: 'monospace',
  },
  editBtn: {
    padding: '5px 12px',
    borderRadius: '6px',
    border: '1.5px solid #0070c0',
    color: '#0070c0',
    backgroundColor: '#dceefb',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: '5px 12px',
    borderRadius: '6px',
    border: '1.5px solid #c0392b',
    color: '#c0392b',
    backgroundColor: '#fde8e8',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  emptyState: { padding: '60px 20px', textAlign: 'center', color: '#bbb' },
  emptyIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#f4f6fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '800',
    color: '#bbb',
    margin: '0 auto 14px',
  },
  emptyTitle: { fontSize: '16px', fontWeight: '600', color: '#999', marginBottom: '6px' },
  emptyDesc: { fontSize: '13px', color: '#ccc' },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    borderRadius: '16px 16px 0 0',
  },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: '#002060', margin: 0 },
  modalSub: { fontSize: '12px', color: '#aaa', marginTop: '2px' },
  closeBtn: {
    background: 'none',
    border: '1.5px solid #ddd',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#666',
    padding: '6px 12px',
    borderRadius: '8px',
    fontWeight: '600',
  },
  form: { padding: '24px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', outline: 'none', width: '100%' },
  select: { padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', outline: 'none', backgroundColor: 'white', cursor: 'pointer' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' },
  cancelBtn: { padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #ddd', backgroundColor: 'white', color: '#555', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  submitBtn: { padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#002060', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    maxWidth: '360px',
    width: '100%',
    boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
  },
  confirmIconBox: {
    width: '60px',
    height: '60px',
    borderRadius: '14px',
    backgroundColor: '#fde8e8',
    color: '#c0392b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '800',
    margin: '0 auto 16px',
  },
  confirmTitle: { fontSize: '20px', fontWeight: '800', color: '#222', marginBottom: '8px' },
  confirmText: { fontSize: '14px', color: '#999', marginBottom: '24px' },
  confirmActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  deleteConfirmBtn: { padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#c0392b', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}
