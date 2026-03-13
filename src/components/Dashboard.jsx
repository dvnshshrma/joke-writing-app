import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { jokesAPI } from '../services/api'
import { analysisAPI } from '../services/analysisAPI'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [analyses, setAnalyses] = useState([])
  const [jokes, setJokes] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [analysesData, jokesData] = await Promise.all([
        analysisAPI.getAll(),
        jokesAPI.getAll()
      ])

      const sorted = [...analysesData].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      )

      setAnalyses(sorted)
      setJokes(jokesData)
      setStats(computeStats(sorted, jokesData))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const computeStats = (sortedAnalyses, jokesData) => {
    const totalShows = sortedAnalyses.length
    const totalJokes = jokesData.length

    // Best LPM ever
    const bestLpm = sortedAnalyses.reduce((best, a) => {
      const lpm = a.laughsPerMinute || 0
      return lpm > best ? lpm : best
    }, 0)

    // Current LPM (avg of last 3 shows)
    const last3 = sortedAnalyses.slice(-3)
    const prev3 = sortedAnalyses.slice(-6, -3)
    const currentLpm =
      last3.length > 0
        ? last3.reduce((s, a) => s + (a.laughsPerMinute || 0), 0) / last3.length
        : 0
    const prevLpm =
      prev3.length > 0
        ? prev3.reduce((s, a) => s + (a.laughsPerMinute || 0), 0) / prev3.length
        : null

    let growthArrow = null
    if (prevLpm !== null && last3.length >= 3) {
      growthArrow = currentLpm > prevLpm ? 'up' : currentLpm < prevLpm ? 'down' : 'flat'
    }

    // Growth chart data
    const maxLpm = sortedAnalyses.reduce((m, a) => Math.max(m, a.laughsPerMinute || 0), 0.1)
    const growthBars = sortedAnalyses.map((a) => ({
      lpm: a.laughsPerMinute || 0,
      heightPct: Math.max(4, Math.round(((a.laughsPerMinute || 0) / maxLpm) * 100)),
      profile: a.performanceProfile || 'unknown',
      label: a.setName || 'Untitled',
      date: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '',
    }))

    // Material health — aggregate jokeMetrics across all analyses
    const jokeMap = new Map()
    for (const analysis of sortedAnalyses) {
      if (!Array.isArray(analysis.jokeMetrics)) continue
      for (const m of analysis.jokeMetrics) {
        const key = (m.header || '').toLowerCase().trim()
        if (!key) continue
        if (!jokeMap.has(key)) {
          jokeMap.set(key, { header: m.header, laughsList: [] })
        }
        jokeMap.get(key).laughsList.push(m.laughs || 0)
      }
    }

    const jokeHealth = [...jokeMap.values()]
      .map(({ header, laughsList }) => ({
        header,
        count: laughsList.length,
        avgLaughs:
          laughsList.reduce((s, v) => s + v, 0) / laughsList.length,
      }))
      .sort((a, b) => b.avgLaughs - a.avgLaughs)

    const top3 = jokeHealth.slice(0, 3)
    const bottom3 = jokeHealth.length > 3 ? jokeHealth.slice(-3).reverse() : []

    // Venue breakdown
    const venueMap = new Map()
    for (const a of sortedAnalyses) {
      const venue = a.venueType || 'Unknown'
      if (!venueMap.has(venue)) venueMap.set(venue, { total: 0, count: 0 })
      const v = venueMap.get(venue)
      v.total += a.laughsPerMinute || 0
      v.count += 1
    }
    const maxVenueLpm = [...venueMap.values()].reduce(
      (m, v) => Math.max(m, v.count > 0 ? v.total / v.count : 0),
      0.1
    )
    const venueBreakdown = [...venueMap.entries()]
      .map(([venue, { total, count }]) => ({
        venue,
        avgLpm: count > 0 ? total / count : 0,
        count,
        barPct: Math.max(4, Math.round(((count > 0 ? total / count : 0) / maxVenueLpm) * 100)),
      }))
      .sort((a, b) => b.avgLpm - a.avgLpm)

    // Lifecycle summary
    const lifecycleCounts = { New: 0, Testing: 0, Proven: 0, Retired: 0 }
    for (const joke of jokesData) {
      const lc = joke.lifecycle
      if (lc && lc in lifecycleCounts) {
        lifecycleCounts[lc] += 1
      }
    }

    return {
      totalShows,
      bestLpm,
      currentLpm,
      totalJokes,
      growthArrow,
      growthBars,
      top3,
      bottom3,
      venueBreakdown,
      lifecycleCounts,
    }
  }

  const profileColor = (profile) => {
    if (!profile) return '#9e9e9e'
    const p = profile.toLowerCase()
    if (p.includes('strong') || p === 'great' || p === 'green') return '#4caf50'
    if (p.includes('average') || p === 'yellow' || p === 'ok') return '#ff9800'
    if (p.includes('weak') || p === 'red' || p === 'poor') return '#f44336'
    return '#667eea'
  }

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="dash-loading-spinner">Loading your dashboard...</div>
      </div>
    )
  }

  const notEnoughData = analyses.length < 2

  return (
    <div className="dashboard">
      <div className="dash-header">
        <button className="dash-back-btn" onClick={() => navigate('/')}>
          &larr; Back
        </button>
        <h1 className="dash-title">Comedian Dashboard</h1>
        <p className="dash-subtitle">Your performance at a glance</p>
      </div>

      {notEnoughData ? (
        <div className="dash-empty">
          <span className="dash-empty-icon">📊</span>
          <h2>Not enough data yet</h2>
          <p>Analyze at least 2 shows to unlock your growth dashboard.</p>
          <button className="dash-cta-btn" onClick={() => navigate('/analyze')}>
            Analyze a Set
          </button>
        </div>
      ) : (
        <>
          {/* Header Stats Row */}
          <div className="dash-stats-row">
            <div className="dash-stat-card">
              <span className="dash-stat-value">{stats.totalShows}</span>
              <span className="dash-stat-label">Shows Analyzed</span>
            </div>
            <div className="dash-stat-card highlight">
              <span className="dash-stat-value">{stats.bestLpm.toFixed(1)}</span>
              <span className="dash-stat-label">Best LPM Ever</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-value">
                {stats.currentLpm.toFixed(1)}
                {stats.growthArrow === 'up' && (
                  <span className="dash-arrow up"> &uarr;</span>
                )}
                {stats.growthArrow === 'down' && (
                  <span className="dash-arrow down"> &darr;</span>
                )}
              </span>
              <span className="dash-stat-label">Current LPM (last 3)</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-value">{stats.totalJokes}</span>
              <span className="dash-stat-label">Jokes Written</span>
            </div>
          </div>

          {/* Growth Chart */}
          <div className="dash-section">
            <h2 className="dash-section-title">Growth Over Time</h2>
            <p className="dash-section-desc">LPM across each analyzed show (hover for details)</p>
            <div className="dash-bar-chart">
              {stats.growthBars.map((bar, i) => (
                <div
                  key={i}
                  className="dash-bar-col"
                  title={`${bar.label} — ${bar.date}\n${bar.lpm.toFixed(1)} LPM`}
                >
                  <span className="dash-bar-lpm">{bar.lpm.toFixed(1)}</span>
                  <div
                    className="dash-bar"
                    style={{
                      height: `${bar.heightPct}%`,
                      backgroundColor: profileColor(bar.profile),
                    }}
                  />
                  <span className="dash-bar-label">
                    {bar.label.length > 8 ? bar.label.slice(0, 8) + '…' : bar.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="dash-chart-legend">
              <span className="legend-dot" style={{ background: '#4caf50' }} /> Strong
              <span className="legend-dot" style={{ background: '#ff9800' }} /> Average
              <span className="legend-dot" style={{ background: '#f44336' }} /> Needs work
              <span className="legend-dot" style={{ background: '#667eea' }} /> Other
            </div>
          </div>

          {/* Material Health */}
          <div className="dash-section">
            <h2 className="dash-section-title">Material Health Snapshot</h2>
            <div className="dash-material-grid">
              {stats.top3.length > 0 && (
                <div className="dash-material-col top">
                  <h3>Top Performers</h3>
                  {stats.top3.map((joke, i) => (
                    <div key={i} className="dash-joke-card top">
                      <span className="dash-joke-rank">{i + 1}</span>
                      <div className="dash-joke-info">
                        <span className="dash-joke-header">{joke.header}</span>
                        <span className="dash-joke-meta">
                          {joke.avgLaughs.toFixed(1)} avg laughs &middot; {joke.count} show
                          {joke.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {stats.bottom3.length > 0 && (
                <div className="dash-material-col bottom">
                  <h3>Needs Work</h3>
                  {stats.bottom3.map((joke, i) => (
                    <div key={i} className="dash-joke-card bottom">
                      <div className="dash-joke-info">
                        <span className="dash-joke-header">{joke.header}</span>
                        <span className="dash-joke-meta">
                          {joke.avgLaughs.toFixed(1)} avg laughs &middot; {joke.count} show
                          {joke.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {stats.top3.length === 0 && stats.bottom3.length === 0 && (
                <p className="dash-empty-note">No joke performance data available yet.</p>
              )}
            </div>
          </div>

          {/* Venue Breakdown */}
          {stats.venueBreakdown.length > 0 && (
            <div className="dash-section">
              <h2 className="dash-section-title">Venue Breakdown</h2>
              <p className="dash-section-desc">Average LPM by venue type</p>
              <div className="dash-venue-chart">
                {stats.venueBreakdown.map((v, i) => (
                  <div key={i} className="dash-venue-row">
                    <span className="dash-venue-name">{v.venue}</span>
                    <div className="dash-venue-bar-wrap">
                      <div
                        className="dash-venue-bar"
                        style={{ width: `${v.barPct}%` }}
                      />
                    </div>
                    <span className="dash-venue-lpm">
                      {v.avgLpm.toFixed(1)} LPM
                      <span className="dash-venue-count"> ({v.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lifecycle Summary */}
          <div className="dash-section">
            <h2 className="dash-section-title">Material Lifecycle</h2>
            <p className="dash-section-desc">
              Where your jokes stand &mdash;{' '}
              <button className="dash-link-btn" onClick={() => navigate('/joke')}>
                manage them
              </button>
            </p>
            <div className="dash-lifecycle-row">
              {Object.entries(stats.lifecycleCounts).map(([stage, count]) => (
                <div key={stage} className={`dash-lifecycle-pill ${stage.toLowerCase()}`}>
                  <span className="lifecycle-count">{count}</span>
                  <span className="lifecycle-label">{stage}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
