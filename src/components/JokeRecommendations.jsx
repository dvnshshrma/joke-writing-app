import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { jokesAPI } from '../services/api'
import { analysisAPI } from '../services/analysisAPI'
import './JokeRecommendations.css'

function JokeRecommendations() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [jokes, setJokes] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [recommendations, setRecommendations] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [jokesData, analysesData] = await Promise.all([
        jokesAPI.getAll(),
        analysisAPI.getAll()
      ])
      
      setJokes(jokesData.filter(j => !j.isOneLiner))
      setAnalyses(analysesData)
      
      // Generate recommendations
      const recs = generateRecommendations(jokesData.filter(j => !j.isOneLiner), analysesData)
      setRecommendations(recs)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateRecommendations = (jokes, analyses) => {
    // Collect all joke performance data from analyses
    const jokePerformance = new Map()
    
    for (const analysis of analyses) {
      if (analysis.jokeMetrics) {
        for (const metric of analysis.jokeMetrics) {
          const key = metric.header?.toLowerCase().trim()
          if (!key) continue
          
          if (!jokePerformance.has(key)) {
            jokePerformance.set(key, {
              header: metric.header,
              performances: [],
              totalLaughs: 0,
              avgLaughs: 0
            })
          }
          
          const perf = jokePerformance.get(key)
          perf.performances.push({
            laughs: metric.laughs,
            date: analysis.createdAt,
            setName: analysis.setName,
            category: analysis.category
          })
          perf.totalLaughs += metric.laughs
        }
      }
    }

    // Calculate averages
    for (const [, perf] of jokePerformance) {
      perf.avgLaughs = perf.performances.length > 0 
        ? perf.totalLaughs / perf.performances.length 
        : 0
    }

    // Sort by performance
    const sortedByPerformance = [...jokePerformance.values()]
      .filter(p => p.performances.length >= 1)
      .sort((a, b) => b.avgLaughs - a.avgLaughs)

    // Top performers (top 20%)
    const topCount = Math.max(3, Math.ceil(sortedByPerformance.length * 0.2))
    const topPerformers = sortedByPerformance.slice(0, topCount)

    // Needs work (bottom 20%)
    const needsWork = sortedByPerformance.slice(-topCount).reverse()

    // Rising stars (improving over time)
    const risingStars = sortedByPerformance
      .filter(p => p.performances.length >= 2)
      .filter(p => {
        const sorted = [...p.performances].sort((a, b) => new Date(a.date) - new Date(b.date))
        const recentHalf = sorted.slice(Math.floor(sorted.length / 2))
        const olderHalf = sorted.slice(0, Math.floor(sorted.length / 2))
        const recentAvg = recentHalf.reduce((s, x) => s + x.laughs, 0) / recentHalf.length
        const olderAvg = olderHalf.length > 0 ? olderHalf.reduce((s, x) => s + x.laughs, 0) / olderHalf.length : 0
        return recentAvg > olderAvg * 1.2 // 20% improvement
      })
      .slice(0, 5)

    // Untested jokes (not in any analysis)
    const testedHeaders = new Set([...jokePerformance.keys()])
    const untestedJokes = jokes.filter(j => 
      !testedHeaders.has(j.header?.toLowerCase().trim())
    )

    // Topic analysis
    const topicPerformance = new Map()
    for (const analysis of analyses) {
      if (analysis.extractedJokes) {
        for (const joke of analysis.extractedJokes) {
          if (joke.topic) {
            if (!topicPerformance.has(joke.topic)) {
              topicPerformance.set(joke.topic, { topic: joke.topic, laughs: 0, count: 0 })
            }
            const t = topicPerformance.get(joke.topic)
            t.laughs += analysis.jokeMetrics?.find(m => m.header === joke.header)?.laughs || 0
            t.count++
          }
        }
      }
    }
    
    const topTopics = [...topicPerformance.values()]
      .map(t => ({ ...t, avgLaughs: t.count > 0 ? t.laughs / t.count : 0 }))
      .sort((a, b) => b.avgLaughs - a.avgLaughs)
      .slice(0, 5)

    // Generate actionable insights
    const insights = []
    
    if (topPerformers.length > 0) {
      const topJoke = topPerformers[0]
      insights.push({
        type: 'success',
        icon: '🔥',
        title: 'Your killer joke',
        text: `"${topJoke.header}" averages ${topJoke.avgLaughs.toFixed(1)} laughs. Keep this in your set!`
      })
    }

    if (needsWork.length > 0 && needsWork[0].avgLaughs < 3) {
      insights.push({
        type: 'warning',
        icon: '🛠️',
        title: 'Consider reworking',
        text: `"${needsWork[0].header}" only gets ${needsWork[0].avgLaughs.toFixed(1)} laughs on average. Try rewriting the punchline.`
      })
    }

    if (untestedJokes.length > 5) {
      insights.push({
        type: 'info',
        icon: '🎯',
        title: 'Test more material',
        text: `You have ${untestedJokes.length} jokes that haven't been tested on stage. Time to try them out!`
      })
    }

    if (risingStars.length > 0) {
      insights.push({
        type: 'success',
        icon: '📈',
        title: 'Rising star',
        text: `"${risingStars[0].header}" is improving! Recent performances are stronger.`
      })
    }

    if (topTopics.length > 0 && topTopics[0].avgLaughs > 5) {
      insights.push({
        type: 'info',
        icon: '💡',
        title: 'Your best topic',
        text: `${topTopics[0].topic} jokes perform best for you (${topTopics[0].avgLaughs.toFixed(1)} avg laughs). Write more!`
      })
    }

    // Set building recommendations
    const setRecommendations = []
    
    if (topPerformers.length >= 5) {
      setRecommendations.push({
        title: 'Power Set',
        description: 'Your top 5 proven jokes for a guaranteed strong set',
        jokes: topPerformers.slice(0, 5).map(p => p.header)
      })
    }

    if (untestedJokes.length >= 3 && topPerformers.length >= 2) {
      setRecommendations.push({
        title: 'Test Run Set',
        description: '2 proven jokes + 3 new ones to test',
        jokes: [
          ...topPerformers.slice(0, 2).map(p => p.header),
          ...untestedJokes.slice(0, 3).map(j => j.header)
        ]
      })
    }

    return {
      topPerformers,
      needsWork,
      risingStars,
      untestedJokes,
      topTopics,
      insights,
      setRecommendations,
      totalAnalyses: analyses.length,
      totalJokes: jokes.length,
      testedJokes: jokePerformance.size
    }
  }

  if (loading) {
    return (
      <div className="joke-recommendations loading">
        <div className="loading-spinner">⏳ Analyzing your comedy data...</div>
      </div>
    )
  }

  if (!recommendations || analyses.length === 0) {
    return (
      <div className="joke-recommendations">
        <div className="rec-header">
          <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
          <h1>🎯 Joke Recommendations</h1>
        </div>
        <div className="no-data">
          <span className="no-data-icon">📊</span>
          <h2>Not enough data yet</h2>
          <p>Analyze at least one set to get personalized recommendations.</p>
          <button onClick={() => navigate('/analyze')}>Analyze a Set</button>
        </div>
      </div>
    )
  }

  return (
    <div className="joke-recommendations">
      <div className="rec-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1>🎯 Joke Recommendations</h1>
        <p>AI-powered insights based on {recommendations.totalAnalyses} performance analyses</p>
      </div>

      <div className="rec-nav">
        <button 
          className={activeSection === 'overview' ? 'active' : ''}
          onClick={() => setActiveSection('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={activeSection === 'performers' ? 'active' : ''}
          onClick={() => setActiveSection('performers')}
        >
          🏆 Top & Bottom
        </button>
        <button 
          className={activeSection === 'untested' ? 'active' : ''}
          onClick={() => setActiveSection('untested')}
        >
          🎲 Untested
        </button>
        <button 
          className={activeSection === 'sets' ? 'active' : ''}
          onClick={() => setActiveSection('sets')}
        >
          🎤 Set Builder
        </button>
      </div>

      <div className="rec-content">
        {activeSection === 'overview' && (
          <div className="overview-section">
            {/* Quick Stats */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-value">{recommendations.totalJokes}</span>
                <span className="stat-label">Total Jokes</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{recommendations.testedJokes}</span>
                <span className="stat-label">Tested on Stage</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{recommendations.untestedJokes.length}</span>
                <span className="stat-label">Untested</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{recommendations.totalAnalyses}</span>
                <span className="stat-label">Performances</span>
              </div>
            </div>

            {/* Insights */}
            <div className="insights-section">
              <h2>💡 Key Insights</h2>
              <div className="insights-list">
                {recommendations.insights.map((insight, i) => (
                  <div key={i} className={`insight-card ${insight.type}`}>
                    <span className="insight-icon">{insight.icon}</span>
                    <div className="insight-content">
                      <h3>{insight.title}</h3>
                      <p>{insight.text}</p>
                    </div>
                  </div>
                ))}
                {recommendations.insights.length === 0 && (
                  <p className="no-insights">Analyze more performances to get personalized insights!</p>
                )}
              </div>
            </div>

            {/* Best Topics */}
            {recommendations.topTopics.length > 0 && (
              <div className="topics-section">
                <h2>🎭 Your Best Topics</h2>
                <div className="topics-list">
                  {recommendations.topTopics.map((topic, i) => (
                    <div key={i} className="topic-item">
                      <span className="topic-rank">#{i + 1}</span>
                      <span className="topic-name">{topic.topic}</span>
                      <span className="topic-stats">{topic.avgLaughs.toFixed(1)} avg laughs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'performers' && (
          <div className="performers-section">
            <div className="performers-grid">
              {/* Top Performers */}
              <div className="performer-column top">
                <h2>🏆 Top Performers</h2>
                <p className="column-desc">These jokes consistently kill</p>
                {recommendations.topPerformers.map((joke, i) => (
                  <div key={i} className="performer-card">
                    <div className="performer-rank">{i + 1}</div>
                    <div className="performer-info">
                      <h3>{joke.header}</h3>
                      <div className="performer-stats">
                        <span>{joke.avgLaughs.toFixed(1)} avg laughs</span>
                        <span>{joke.performances.length} performances</span>
                      </div>
                    </div>
                    <div className="performer-trend">
                      {joke.avgLaughs >= 8 ? '🔥' : joke.avgLaughs >= 5 ? '👍' : '📈'}
                    </div>
                  </div>
                ))}
                {recommendations.topPerformers.length === 0 && (
                  <p className="no-data-message">No performance data yet</p>
                )}
              </div>

              {/* Needs Work */}
              <div className="performer-column bottom">
                <h2>🛠️ Needs Work</h2>
                <p className="column-desc">Consider reworking these</p>
                {recommendations.needsWork.map((joke, i) => (
                  <div key={i} className="performer-card needs-work">
                    <div className="performer-info">
                      <h3>{joke.header}</h3>
                      <div className="performer-stats">
                        <span>{joke.avgLaughs.toFixed(1)} avg laughs</span>
                        <span>{joke.performances.length} performances</span>
                      </div>
                    </div>
                    <div className="work-suggestions">
                      {joke.avgLaughs < 2 && <span className="suggestion">Try new punchline</span>}
                      {joke.avgLaughs >= 2 && joke.avgLaughs < 4 && <span className="suggestion">Tighten setup</span>}
                    </div>
                  </div>
                ))}
                {recommendations.needsWork.length === 0 && (
                  <p className="no-data-message">Great! All your tested jokes are performing well.</p>
                )}
              </div>
            </div>

            {/* Rising Stars */}
            {recommendations.risingStars.length > 0 && (
              <div className="rising-section">
                <h2>📈 Rising Stars</h2>
                <p className="section-desc">These jokes are improving over time</p>
                <div className="rising-list">
                  {recommendations.risingStars.map((joke, i) => (
                    <div key={i} className="rising-card">
                      <span className="rising-icon">🚀</span>
                      <span className="rising-name">{joke.header}</span>
                      <span className="rising-trend">↗ Improving</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'untested' && (
          <div className="untested-section">
            <h2>🎲 Untested Material</h2>
            <p className="section-desc">
              {recommendations.untestedJokes.length} jokes haven't been analyzed in a performance yet
            </p>
            
            {recommendations.untestedJokes.length > 0 ? (
              <div className="untested-grid">
                {recommendations.untestedJokes.map((joke, i) => (
                  <div key={joke.id} className="untested-card">
                    <div className="untested-header">
                      <h3>{joke.header}</h3>
                      <span className={`status-badge ${joke.isDraft ? 'draft' : 'final'}`}>
                        {joke.isDraft ? 'Draft' : 'Final'}
                      </span>
                    </div>
                    <p className="untested-preview">
                      {joke.sections?.[0]?.text?.substring(0, 100) || 'No preview available'}...
                    </p>
                    <div className="untested-actions">
                      <button onClick={() => navigate(`/joke/edit/${joke.id}`)}>
                        ✏️ Edit
                      </button>
                      <span className="untested-date">
                        Created {new Date(joke.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="all-tested">
                <span className="all-tested-icon">✅</span>
                <p>Amazing! All your jokes have been tested on stage.</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'sets' && (
          <div className="sets-section">
            <h2>🎤 Recommended Sets</h2>
            <p className="section-desc">AI-curated set lists based on your performance data</p>

            {recommendations.setRecommendations.length > 0 ? (
              <div className="set-recommendations">
                {recommendations.setRecommendations.map((set, i) => (
                  <div key={i} className="set-rec-card">
                    <div className="set-rec-header">
                      <h3>{set.title}</h3>
                      <span className="joke-count">{set.jokes.length} jokes</span>
                    </div>
                    <p className="set-rec-desc">{set.description}</p>
                    <div className="set-rec-jokes">
                      {set.jokes.map((joke, j) => (
                        <div key={j} className="set-joke-item">
                          <span className="joke-order">{j + 1}</span>
                          <span className="joke-name">{joke}</span>
                        </div>
                      ))}
                    </div>
                    <button 
                      className="use-set-btn"
                      onClick={() => navigate('/set/short')}
                    >
                      Use This Set →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-set-recs">
                <span className="no-recs-icon">📝</span>
                <p>Analyze more performances to get set recommendations.</p>
                <p className="hint">We need at least 5 tested jokes to build a power set.</p>
              </div>
            )}

            {/* Quick Set Tips */}
            <div className="set-tips">
              <h3>💡 Set Building Tips</h3>
              <ul>
                <li><strong>Strong opener:</strong> Start with a proven laugh-getter to warm up the crowd</li>
                <li><strong>Test in the middle:</strong> Put new material in the middle of your set</li>
                <li><strong>Killer closer:</strong> End with your strongest joke for maximum impact</li>
                <li><strong>Similar topics:</strong> Group related jokes together for better flow</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JokeRecommendations

