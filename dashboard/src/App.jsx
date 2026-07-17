import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import logoSvg from './assets/ThreadFlow.svg'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [tabKey, setTabKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const switchTab = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setTabKey(k => k + 1)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="login-wrap">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <img src={logoSvg} alt="ThreadFlow" className="logo-img" />
        </div>
        <nav className="nav">
          <button
            className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => switchTab('overview')}
          >
            Overview
          </button>
          <button
            className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => switchTab('calendar')}
          >
            Calendar
          </button>
          <button
            className={`nav-btn ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => switchTab('drafts')}
          >
            Drafts
          </button>
          <button
            className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => switchTab('history')}
          >
            History
          </button>
          <button
            className={`nav-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
            onClick={() => switchTab('evaluation')}
          >
            Evaluation
          </button>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          Keluar
        </button>
      </aside>
      <main className="main">
        <div key={tabKey} className="tab-content">
          <Dashboard activeTab={activeTab} />
        </div>
      </main>
    </div>
  )
}

export default App
