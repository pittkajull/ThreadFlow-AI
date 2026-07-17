import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Dashboard from './components/Dashboard'
import logoSvg from './assets/ThreadFlow.svg'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [tabKey, setTabKey] = useState(0)

  const switchTab = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setTabKey(k => k + 1)
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
