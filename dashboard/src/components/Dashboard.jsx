import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function getAngleClass(angle) {
  const a = angle?.toLowerCase() || ''
  if (a.includes('serius') || a.includes('edukasi') || a.includes('bts') || a.includes('pengalaman')) return 'serius'
  if (a.includes('lucu') || a.includes('receh')) return 'lucu'
  if (a.includes('horror') || a.includes('misteri')) return 'horror'
  if (a.includes('q&a') || a.includes('qa') || a.includes('q & a')) return 'qna'
  if (a.includes('rekap') || a.includes('refleksi')) return 'rekap'
  return 'serius'
}

function getPillarClass(pillar) {
  const p = pillar?.toLowerCase() || ''
  if (p.includes('penerbangan') || p.includes('aviation') || p.includes('pilot')) return 'penerbangan'
  if (p.includes('bisnis') || p.includes('business')) return 'bisnis'
  return 'teknologi'
}

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Dashboard({ activeTab }) {
  const [drafts, setDrafts] = useState([])
  const [history, setHistory] = useState([])
  const [pillars, setPillars] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [draftsRes, historyRes, pillarsRes, schedulesRes] = await Promise.all([
      supabase.from('drafts').select('*').order('created_at', { ascending: false }),
      supabase.from('history').select('*').order('published_at', { ascending: false }),
      supabase.from('persona_pillar').select('*'),
      supabase.from('angle_schedule').select('*'),
    ])
    setDrafts(draftsRes.data || [])
    setHistory(historyRes.data || [])
    setPillars(pillarsRes.data || [])
    setSchedules(schedulesRes.data || [])
    setLoading(false)
  }

  const pendingCount = drafts.filter(d => d.status === 'pending_approval').length
  const publishedCount = drafts.filter(d => d.status === 'published').length
  const rejectedCount = drafts.filter(d => d.status === 'rejected').length
  const totalHistory = history.length

  if (loading) {
    return <div className="loading">Loading data...</div>
  }

  return (
    <div>
      {activeTab === 'overview' && (
        <Overview
          pendingCount={pendingCount}
          publishedCount={publishedCount}
          rejectedCount={rejectedCount}
          totalHistory={totalHistory}
          drafts={drafts}
          pillars={pillars}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
        />
      )}
      {activeTab === 'calendar' && (
        <CalendarView
          drafts={drafts}
          history={history}
          schedules={schedules}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
        />
      )}
      {activeTab === 'drafts' && (
        <DraftsView drafts={drafts} onRefresh={fetchData} />
      )}
      {activeTab === 'history' && (
        <HistoryView history={history} />
      )}
      {activeTab === 'evaluation' && (
        <EvaluationView />
      )}
    </div>
  )
}

function Overview({ pendingCount, publishedCount, rejectedCount, totalHistory, drafts, pillars, currentMonth, setCurrentMonth }) {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Overview</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value pending">{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Published</div>
          <div className="stat-value published">{publishedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value rejected">{rejectedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total History</div>
          <div className="stat-value">{totalHistory}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Recent Drafts</h2>
        </div>
        {drafts.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <p>Belum ada drafts</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pillar</th>
                  <th>Angle</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {drafts.slice(0, 5).map(d => (
                  <tr key={d.id}>
                    <td>
                      <span className={`pillar-tag ${getPillarClass(d.pillar_name)}`}>
                        {d.pillar_name}
                      </span>
                    </td>
                    <td>{d.angle}</td>
                    <td>{d.topic || '-'}</td>
                    <td><span className={`badge ${d.status}`}>{d.status}</span></td>
                    <td>{formatDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function CalendarView({ drafts, history, schedules, currentMonth, setCurrentMonth }) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const events = {}
  drafts.forEach(d => {
    if (!d.scheduled_time) return
    const dt = new Date(d.scheduled_time)
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      const day = dt.getDate()
      if (!events[day]) events[day] = []
      events[day].push({ angle: d.angle, pillar: d.pillar_name, status: d.status })
    }
  })
  history.forEach(h => {
    if (!h.published_at) return
    const dt = new Date(h.published_at)
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      const day = dt.getDate()
      if (!events[day]) events[day] = []
      events[day].push({ angle: h.angle, pillar: h.pillar_name, status: 'published' })
    }
  })

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="section-header">
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Calendar</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={prevMonth} style={calBtn}>&lt;</button>
          <span style={{ fontWeight: 600, minWidth: 140, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={calBtn}>&gt;</button>
        </div>
      </div>

      <div className="calendar-grid">
        {DAYS.map(d => (
          <div key={d} className="calendar-header">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`calendar-day ${day === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? 'today' : ''}`}
          >
            {day && <div className="calendar-day-num">{day}</div>}
            {day && events[day]?.map((ev, j) => (
              <div key={j} className={`calendar-event ${getAngleClass(ev.angle)}`}>
                {ev.angle}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const calBtn = {
  background: '#27272a',
  border: 'none',
  color: '#e4e4e7',
  width: 32,
  height: 32,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
}

function DraftsView({ drafts, onRefresh }) {
  return (
    <div>
      <div className="section-header">
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Drafts</h1>
        <button onClick={onRefresh} style={refreshBtn}>Refresh</button>
      </div>

      {drafts.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📝</div>
          <p>Belum ada drafts</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pillar</th>
                <th>Angle</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map(d => (
                <tr key={d.id}>
                  <td>
                    <span className={`pillar-tag ${getPillarClass(d.pillar_name)}`}>
                      {d.pillar_name}
                    </span>
                  </td>
                  <td>{d.angle}</td>
                  <td>{d.topic || '-'}</td>
                  <td><span className={`badge ${d.status}`}>{d.status}</span></td>
                  <td>{formatDate(d.scheduled_time)} {formatTime(d.scheduled_time)}</td>
                  <td>{formatDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function HistoryView({ history }) {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>History</h1>

      {history.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <p>Belum ada history publikasi</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pillar</th>
                <th>Angle</th>
                <th>Topic</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td>
                    <span className={`pillar-tag ${getPillarClass(h.pillar_name)}`}>
                      {h.pillar_name}
                    </span>
                  </td>
                  <td>{h.angle}</td>
                  <td>{h.topic}</td>
                  <td>{formatDate(h.published_at)} {formatTime(h.published_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const refreshBtn = {
  background: '#6366f1',
  border: 'none',
  color: 'white',
  padding: '8px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
}

function EvaluationView() {
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { fetchEvaluations() }, [])

  async function fetchEvaluations() {
    setLoading(true)
    const { data } = await supabase
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: false })
    setEvaluations(data || [])
    setLoading(false)
  }

  const versions = [...new Set(evaluations.map(e => e.prompt_version).filter(Boolean))]

  const filtered = selectedVersion === 'all'
    ? evaluations
    : evaluations.filter(e => e.prompt_version === selectedVersion)

  const avgPersona = filtered.length ? (filtered.reduce((s, e) => s + (e.skor_persona || 0), 0) / filtered.length).toFixed(1) : '-'
  const avgCliche = filtered.length ? (filtered.reduce((s, e) => s + (e.skor_cliche || 0), 0) / filtered.length).toFixed(1) : '-'
  const avgRelevansi = filtered.length ? (filtered.reduce((s, e) => s + (e.skor_relevansi || 0), 0) / filtered.length).toFixed(1) : '-'
  const avgTeknis = filtered.length ? (filtered.reduce((s, e) => s + (e.skor_teknis || 0), 0) / filtered.length).toFixed(1) : '-'
  const avgTotal = filtered.length ? (filtered.reduce((s, e) => s + (e.skor_total || 0), 0) / filtered.length).toFixed(1) : '-'

  if (loading) return <div className="loading">Loading evaluations...</div>

  return (
    <div>
      <div className="section-header">
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Evaluation</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedVersion}
            onChange={e => setSelectedVersion(e.target.value)}
            style={selectStyle}
          >
            <option value="all">Semua Versi</option>
            {versions.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <button onClick={fetchEvaluations} style={refreshBtn}>Refresh</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="eval-summary-grid">
        <div className="eval-summary-card">
          <div className="eval-summary-label">Total Evaluasi</div>
          <div className="eval-summary-value">{filtered.length}</div>
        </div>
        <div className="eval-summary-card">
          <div className="eval-summary-label">Rata-rata Total</div>
          <div className="eval-summary-value" style={{ color: getScoreColor(avgTotal) }}>{avgTotal}<span style={{ fontSize: 14, color: '#71717a' }}>/40</span></div>
        </div>
        <div className="eval-summary-card">
          <div className="eval-summary-label">Rata-rata Persona</div>
          <div className="eval-score-bar-wrap">
            <div className="eval-score-bar"><div className="eval-score-fill" style={{ width: `${avgPersona * 10}%`, background: '#6366f1' }} /></div>
            <span className="eval-score-num">{avgPersona}</span>
          </div>
        </div>
        <div className="eval-summary-card">
          <div className="eval-summary-label">Rata-rata Anti-Cliche</div>
          <div className="eval-score-bar-wrap">
            <div className="eval-score-bar"><div className="eval-score-fill" style={{ width: `${avgCliche * 10}%`, background: '#f59e0b' }} /></div>
            <span className="eval-score-num">{avgCliche}</span>
          </div>
        </div>
        <div className="eval-summary-card">
          <div className="eval-summary-label">Rata-rata Relevansi</div>
          <div className="eval-score-bar-wrap">
            <div className="eval-score-bar"><div className="eval-score-fill" style={{ width: `${avgRelevansi * 10}%`, background: '#10b981' }} /></div>
            <span className="eval-score-num">{avgRelevansi}</span>
          </div>
        </div>
        <div className="eval-summary-card">
          <div className="eval-summary-label">Rata-rata Teknis</div>
          <div className="eval-score-bar-wrap">
            <div className="eval-score-bar"><div className="eval-score-fill" style={{ width: `${avgTeknis * 10}%`, background: '#3b82f6' }} /></div>
            <span className="eval-score-num">{avgTeknis}</span>
          </div>
        </div>
      </div>

      {/* Evaluation Table */}
      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">&#x1f50d;</div>
          <p>Belum ada data evaluasi</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Jalankan workflow evaluasi di n8n untuk mengisi data</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pillar</th>
                <th>Angle</th>
                <th>Topic</th>
                <th>Persona</th>
                <th>Anti-Cliche</th>
                <th>Relevansi</th>
                <th>Teknis</th>
                <th>Total</th>
                <th>Versi</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <EvaluationRow
                  key={e.id}
                  evaluation={e}
                  isExpanded={expandedId === e.id}
                  onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EvaluationRow({ evaluation: e, isExpanded, onToggle }) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <span className={`pillar-tag ${getPillarClass(e.pillar_name)}`}>
            {e.pillar_name}
          </span>
        </td>
        <td>{e.angle}</td>
        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {e.topic || '-'}
        </td>
        <td><ScoreCell score={e.skor_persona} color="#6366f1" /></td>
        <td><ScoreCell score={e.skor_cliche} color="#f59e0b" /></td>
        <td><ScoreCell score={e.skor_relevansi} color="#10b981" /></td>
        <td><ScoreCell score={e.skor_teknis} color="#3b82f6" /></td>
        <td>
          <span style={{ fontWeight: 700, color: getScoreColor(e.skor_total) }}>
            {e.skor_total || '-'}
          </span>
        </td>
        <td>
          <span className="eval-version-tag">{e.prompt_version || '-'}</span>
        </td>
        <td>{formatDate(e.created_at)}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={10} style={{ padding: 0 }}>
            <div className="eval-detail">
              <div className="eval-detail-grid">
                <div className="eval-detail-section">
                  <h4>Output Thread</h4>
                  <div className="eval-output-text">
                    {e.output_thread || 'Tidak ada output'}
                  </div>
                </div>
                <div className="eval-detail-section">
                  <h4>Alasan Judge</h4>
                  <div className="eval-output-text">
                    {e.alasan_judge || 'Tidak ada alasan'}
                  </div>
                </div>
              </div>
              {e.model_used && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#71717a' }}>
                  Model: {e.model_used}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ScoreCell({ score, color }) {
  if (score == null) return <span style={{ color: '#52525b' }}>-</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 40,
        height: 6,
        background: '#27272a',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${score * 10}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{score}</span>
    </div>
  )
}

function getScoreColor(score) {
  if (score == null) return '#71717a'
  const n = Number(score)
  if (n >= 32) return '#34d399'
  if (n >= 24) return '#fbbf24'
  return '#f87171'
}

const selectStyle = {
  background: '#27272a',
  border: '1px solid #3f3f46',
  color: '#e4e4e7',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  outline: 'none',
}
