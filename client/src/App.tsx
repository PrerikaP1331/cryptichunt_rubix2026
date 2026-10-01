import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  Eye,
  FileKey2,
  Flag,
  LockKeyhole,
  LogOut,
  Menu,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

type Level = {
  id: number
  title: string
  story: string
  direction: string
  cipher: string
  hint: string
  skill: string
}

type SolvedEntry = {
  level: number
  points: number
  solvedAt: string | null
}

type User = {
  id: string
  username: string
  teamName: string
  role: 'participant' | 'admin'
  totalPoints: number
  solvedLevels: SolvedEntry[]
  finishedAt: string | null
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

const levels: Level[] = [
  { id: 1, title: 'The Entrance', story: 'Every labyrinth begins with a whisper. Read it.', direction: 'This fragment uses a familiar alphabet of letters, numbers, and symbols, with padding at the end. Decode the wrapper first, then read the sentence inside.', cipher: 'VGhlIGdhdGUgb3BlbnMgZm9yIHRob3NlIHdobyBzYXk6IGxhbnRlcm4=', hint: 'The padding and alphabet point to a common encoding.', skill: 'Base64' },
  { id: 2, title: 'The Second Door', story: 'The light you just found is the key to this door.', direction: 'The spaces and word lengths have survived, but the letters have shifted unevenly. Use your previous answer as a repeating key to reverse the shifts.', cipher: 'ehr litbyd qhsi nysjxvj gz azuii', hint: 'Use the answer from the previous level as the key.', skill: 'Vigenere' },
  { id: 3, title: 'The Lock', story: 'This lock opens only for the fossilised resin from the previous door.', direction: 'The payload contains only hexadecimal characters. Convert those pairs into bytes first; if CyberChef reports a raw byte array or displays random symbols, that is expected. Add XOR as the second step, use your previous answer as the repeating UTF-8 key, and read the new text.', cipher: '150507450609041001520d02010e52081e420713120c0e11', hint: 'CyberChef recipe: From Hex (delimiter None), then XOR with key amber and key type UTF8. The readable sentence appears only after both steps.', skill: 'Hex + XOR' },
  { id: 4, title: 'The Seal', story: 'The stone you found has a number of letters. Let that many rails carry the message up and down.', direction: 'Nothing has been substituted: the letters have only been rearranged. Count the letters in your previous answer and use that number for a zig-zag rail transposition.', cipher: 'TERHSAAREHLYOFTRSWOREDUA', hint: 'The previous answer tells you how many rails to use.', skill: 'Rail Fence' },
  { id: 5, title: 'The Signal', story: 'A guardian speaks in dots and dashes, wrapped in an old wrapper of 32 symbols.', direction: 'The uppercase alphabet and trailing padding identify the outer layer. After removing it, preserve the separators: dots and dashes form letters, while slashes separate words.', cipher: 'FUQC4LROFYQC4IBPEAXC4LJOEAXC4IBOFYWS4IBNEAXC4LROEAXSALJNFYQC4LRNEAXC2IBOFUXCALJOFYQC4LRAFYWSALJOEAXSALROEAXC4LRAF4QC4LJOEAXC2IBOFYXC2IBOEAWS4===', hint: 'Unwrap the 32-symbol layer, then listen to the dots and dashes.', skill: 'Base32 + Morse' },
  { id: 6, title: 'The Shifting Path', story: 'Count the letters of the guardian you just met. Walk the alphabet that many steps.', direction: 'The spaces remain in place and every letter has moved by the same amount. Use the length of the previous answer to walk backward through the alphabet.', cipher: 'ymj xncym ufym qjfix yt nsinlt', hint: 'Shift each letter back by the length of the previous answer.', skill: 'Caesar' },
  { id: 7, title: 'The Mirror Sky', story: 'The stars are written in the language of machines, and the sky is reflected.', direction: 'Each group is eight binary digits, so translate the machine language into text first. The result is still disguised: use the clue about reflection to transform the alphabet.', cipher: '01100111 01110011 01110110 00100000 01101000 01110110 01100101 01110110 01101101 01110011 00100000 01101000 01100111 01111010 01101001 00100000 01110010 01101000 00100000 01101101 01110110 01111001 01100110 01101111 01111010', hint: 'Decode the machine language first. Then reflect the alphabet.', skill: 'Binary + Atbash' },
  { id: 8, title: 'The Double Wrap', story: 'Two layers of packaging protect this message. Unwrap them one by one.', direction: 'The outer text ends with Base64 padding. Decode that result once, inspect the new alphabet, and decode the second wrapper before reading the sentence.', cipher: 'T1JVR0tJREZORlRXUTVESUVCVFdDNURGRUJVWEdJRFVNRldHNjNRPQ==', hint: 'The outside layer ends in ==. What does that suggest?', skill: 'Base64 + Base32' },
  { id: 9, title: 'The Grid', story: 'A 5x5 square guards the final guardian. Its keyword is the creature of the previous gate.', direction: 'This is a letter-pair cipher: split the text into pairs and build a 5x5 alphabet square. Use the previous answer as the keyword, merging I and J into one cell.', cipher: 'AGFBMLLOMPLQIRLTKRKAXRYNLZ', hint: 'Look for a 5x5 grid cipher invented in the 1800s.', skill: 'Playfair' },
  { id: 10, title: 'The Vault', story: 'Nine guardians, nine initials. Together they name this labyrinth, and that name is the vault\'s key.', direction: 'The final payload is hex again. Assemble a key from the first letters of the nine answers, keep its original uppercase form, then use it to unlock the bytes.', cipher: '0f131b0906061f010d1f153915660b17067902150a06070702640b07720624', hint: 'What do the first letters of the guardians spell?', skill: 'Hex + XOR' },
]

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function App() {
  const [path, setPath] = useState(() => window.location.pathname)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('labyrinth-token'))
  const [user, setUser] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', password: '' })
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [activeLevel, setActiveLevel] = useState(1)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const loadUser = async (currentToken: string) => {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    })

    if (!res.ok) {
      localStorage.removeItem('labyrinth-token')
      setToken(null)
      setUser(null)
      return
    }

    const data = await res.json()
    setUser(data.user)
  }

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    void loadUser(token)
  }, [token])

  useEffect(() => {
    if (!token || !user || user.role === 'admin') return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [token, user])

  useEffect(() => {
    if (user?.role === 'admin' && path !== '/leaderboard') {
      window.history.replaceState({}, '', '/leaderboard')
      setPath('/leaderboard')
    }
  }, [path, user])

  async function handleAuthSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setStatusMessage('')

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const contentType = response.headers.get('content-type') ?? ''
      const data = contentType.includes('application/json')
        ? await response.json()
        : { error: 'The API is not connected. Set VITE_API_BASE_URL to your Render backend URL and redeploy Vercel.' }
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.')
      }

      localStorage.setItem('labyrinth-token', data.token)
      setToken(data.token)
      setUser(data.user)
      const destination = data.user.role === 'admin' ? '/leaderboard' : '/'
      window.history.pushState({}, '', destination)
      setPath(destination)
      setForm({ username: '', password: '' })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('labyrinth-token')
    setToken(null)
    setUser(null)
    window.history.pushState({}, '', '/')
    setPath('/')
    setAnswer('')
    setFeedback(null)
    setShowHint(false)
  }

  if (!token || !user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-event">
            <div className="brand auth-brand">
              <span className="brand-mark"><span /></span>
              <span>RUBIX 2026</span>
            </div>
            <p className="auth-presenter">NISB COMPUTER SOCIETY PRESENTS</p>
            <p className="auth-edition">RUBIX <span>2026</span></p>
            <h1>CRYPTIC HUNT <span>&amp;</span><br />VALEDICTORY</h1>
            <p className="auth-subtitle">Decode the trail. Unlock the Labyrinth.</p>
          </div>
          <p className="auth-access-label">TEAM ACCESS</p>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <label>
              Team username
              <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Enter your team username" autoComplete="username" />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" autoComplete="current-password" />
            </label>
            {statusMessage && <p className="auth-error">{statusMessage}</p>}
            <button type="submit" disabled={loading} className="primary-button">
              {loading ? 'Please wait...' : 'Enter the hunt'}
            </button>
          </form>
          <p className="auth-login-note">Use the team credentials provided by the organizers.</p>
        </div>
      </div>
    )
  }

  if (path === '/leaderboard') {
    if (user.role !== 'admin') {
      return (
        <main className="auth-shell">
          <section className="auth-card">
            <h1>Leaderboard access restricted</h1>
            <p>This page is available to event administrators only.</p>
            <a className="primary-button" href="/">Return to your team game</a>
          </section>
        </main>
      )
    }

    return <AdminDashboard token={token} onExit={logout} />
  }

  if (user.role === 'admin') return null

  return <ParticipantGame user={user} token={token} onLogout={logout} />
}

type ParticipantGameProps = {
  user: User
  token: string
  onLogout: () => void
}

function ParticipantGame({ user, token, onLogout }: ParticipantGameProps) {
  const [mobileNav, setMobileNav] = useState(false)
  const [activeLevel, setActiveLevel] = useState(1)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [teamUser, setTeamUser] = useState<User>(user)

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const solvedLevels = teamUser.solvedLevels.map((item) => item.level)
    const maxUnlocked = Math.max(1, Math.min(solvedLevels.length + 1, levels.length))
    if (activeLevel > maxUnlocked) {
      setActiveLevel(maxUnlocked)
    }
  }, [teamUser, activeLevel])

  const current = levels[activeLevel - 1]
  const solvedLevels = teamUser.solvedLevels.map((entry) => entry.level)
  const completed = solvedLevels.includes(activeLevel)
  const progress = Math.round((solvedLevels.length / levels.length) * 100)
  const nextLevel = useMemo(() => Math.min(activeLevel + 1, levels.length), [activeLevel])

  async function fetchUpdatedUser() {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const payload = await res.json()
      setTeamUser(payload.user)
    }
  }

  async function submitAnswer() {
    try {
      const response = await fetch(`${API_BASE}/api/answers/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level: activeLevel, answer }),
      })

      const data = await response.json()
      if (!response.ok) {
        setFeedback('wrong')
        return
      }

      setFeedback('correct')
      setAnswer('')
      await fetchUpdatedUser()
      setShowHint(false)
    } catch {
      setFeedback('wrong')
    }
  }

  function selectLevel(level: number) {
    if (level > solvedLevels.length + 1) return
    setActiveLevel(level)
    setFeedback(null)
    setAnswer('')
    setShowHint(false)
    setMobileNav(false)
  }

  async function copyCipher() {
    await navigator.clipboard.writeText(current.cipher)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Rubix 2026 home"><span className="brand-mark"><span /></span><span>RUBIX 2026</span></a>
        <div className="topbar-meta">
          <span className="team-chip"><span className="online-dot" /> {teamUser.teamName.toUpperCase()}</span>
          <span className="topbar-divider" />
          <span className="nav-timer"><Clock3 size={15} /> {formatTime(elapsed)}</span>
          <button className="text-button" onClick={onLogout}><LogOut size={15} /> LOGOUT</button>
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle levels"><Menu size={19} /></button>
        </div>
      </header>
      <div className={`game-layout ${mobileNav ? 'nav-open' : ''}`}>
        <aside className="level-sidebar">
          <div className="side-heading"><span>THE ASCENT</span><span className="level-count">{solvedLevels.length} / 10</span></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <nav className="level-list" aria-label="Puzzle levels">
            {levels.map((level) => {
              const isSolved = solvedLevels.includes(level.id)
              const isLocked = level.id > solvedLevels.length + 1
              return <button key={level.id} className={`level-item ${activeLevel === level.id ? 'active' : ''} ${isSolved ? 'solved' : ''} ${isLocked ? 'locked' : ''}`} disabled={isLocked} onClick={() => selectLevel(level.id)}><span className="level-number">{isSolved ? <Check size={15} /> : isLocked ? <LockKeyhole size={14} /> : `0${level.id}`}</span><span className="level-name">{level.title}</span><span className="level-state">{isSolved ? 'SOLVED' : isLocked ? 'LOCKED' : 'OPEN'}</span></button>
            })}
          </nav>
          <div className="side-footer"><ShieldCheck size={15} /><span>{teamUser.totalPoints} POINTS</span></div>
        </aside>

        <main className="puzzle-main">
          <div className="puzzle-header">
            <div className="eyebrow">CHAMBER {String(activeLevel).padStart(2, '0')} <span /> {current.skill.toUpperCase()}</div>
            <div className="header-actions"><button className="text-button"><CircleHelp size={15} /> RULES</button><button className="text-button"><Eye size={15} /> {teamUser.username}</button></div>
          </div>

          <section className="puzzle-intro">
            <div className="intro-number">{String(activeLevel).padStart(2, '0')}</div>
            <div>
              <h1>{current.title}</h1>
              <p>{current.story}</p>
              <p className="direction"><span>READ THE PATTERN</span>{current.direction}</p>
            </div>
          </section>

          <section className="cipher-panel">
            <div className="panel-label"><FileKey2 size={16} /> ENCRYPTED FRAGMENT <span>REF. {String(activeLevel).padStart(2, '0')}</span></div>
            <div className={`cipher-text ${activeLevel > 6 ? 'dense' : ''}`}>{current.cipher}</div>
            <div className="panel-footer">
              <span><Sparkles size={14} /> Every answer opens the next chamber.</span>
              <span className="cipher-tools"><span>{current.cipher.length} CHARACTERS</span><button className="copy-button" onClick={copyCipher}><Copy size={13} /> {copied ? 'COPIED' : 'COPY CODE'}</button></span>
            </div>
          </section>

          <section className="answer-section">
            <div className="answer-label"><span>WHAT WORD DO YOU HEAR?</span>{completed && <span className="solved-label"><Check size={14} /> SOLVED</span>}</div>
            <div className={`answer-row ${feedback === 'correct' ? 'is-correct' : feedback === 'wrong' ? 'is-wrong' : ''}`}>
              <input value={answer} onChange={(event) => { setAnswer(event.target.value); setFeedback(null) }} onKeyDown={(event) => event.key === 'Enter' && void submitAnswer()} placeholder="Enter your answer" aria-label="Your answer" />
              <button onClick={() => void submitAnswer()} disabled={!answer.trim() || completed}>{completed ? <><Check size={17} /> Complete</> : <>Submit <ArrowRight size={17} /></>}</button>
            </div>
            {feedback === 'correct' && <p className="feedback success"><Check size={15} /> Correct. The next door is waiting.</p>}
            {feedback === 'wrong' && <p className="feedback error"><X size={15} /> Not quite. Check the clue and try again.</p>}
          </section>

          <div className="lower-actions">
            <button className={`hint-button ${showHint ? 'revealed' : ''}`} onClick={() => setShowHint(!showHint)}><Sparkles size={16} /> {showHint ? 'HIDE HINT' : 'NEED A HINT?'}<ChevronDown size={15} /></button>
            {showHint && <p className="hint-copy">{current.hint}</p>}
            <div className="next-control">{completed && activeLevel < 10 && <button className="next-button" onClick={() => selectLevel(nextLevel)}>Continue to chamber {String(nextLevel).padStart(2, '0')} <ArrowRight size={17} /></button>}</div>
          </div>
          <div className="puzzle-note"><Flag size={14} /><span>Answers are validated by the backend. Your team score is stored on the server.</span></div>
        </main>
      </div>
    </div>
  )
}

type AdminLeaderboardEntry = {
  rank: number
  username: string
  teamName: string
  totalPoints: number
  solvedLevels: { level: number; points: number; solvedAt: string | null }[]
  finishedAt: string | null
}

function AdminDashboard({ token, onExit }: { token: string; onExit: () => void }) {
  const [leaderboard, setLeaderboard] = useState<AdminLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/admin/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.teams || [])
      }
      setLoading(false)
    }

    void fetchLeaderboard()
  }, [token])

  const exportCsv = () => {
    const csvRows = [
      ['rank', 'teamName', 'username', 'totalPoints', 'rounds'],
      ...leaderboard.map((row) => [
        String(row.rank),
        row.teamName,
        row.username,
        String(row.totalPoints),
        row.solvedLevels.map((entry) => `L${entry.level}:${entry.points}`).join('; '),
      ]),
    ]

    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'labyrinth-results.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-shell">
      <header className="topbar admin-topbar">
        <div className="brand" aria-label="Rubix 2026 home"><span className="brand-mark"><span /></span><span>RUBIX 2026</span></div>
        <div className="admin-session">
          <ShieldCheck size={15} /> ADMIN SESSION ACTIVE
          <button className="text-button" onClick={onExit}><LogOut size={15} /> EXIT</button>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <div className="eyebrow">CONTROL ROOM <span /> LIVE OPERATIONS</div>
            <h1>Leaderboard dashboard</h1>
            <p>Protected admin view for team rankings, points, and solved rounds.</p>
          </div>
          <button className="export-button" onClick={exportCsv}><Download size={17} /> Export results</button>
        </div>

        <div className="admin-stats">
          <div><Users size={18} /><span>TEAMS</span><strong>{leaderboard.length}</strong></div>
          <div><Flag size={18} /><span>TOP SCORE</span><strong>{leaderboard[0]?.totalPoints ?? 0}</strong></div>
          <div><Clock3 size={18} /><span>FASTEST FINISH</span><strong>{leaderboard[0]?.finishedAt ? 'LIVE' : '—'}</strong></div>
          <div><RotateCcw size={18} /><span>UPDATE</span><strong>LIVE</strong></div>
        </div>

        <section className="results-table-wrap">
          <div className="table-heading"><span>LIVE STANDINGS</span><span className="private-badge"><ShieldCheck size={13} /> ADMIN ONLY</span></div>
          <table>
            <thead>
              <tr>
                <th>RANK</th>
                <th>TEAM</th>
                <th>USERNAME</th>
                <th>TOTAL POINTS</th>
                <th>ROUND POINTS</th>
                <th>FINISHED</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}>Loading leaderboard...</td></tr>
              ) : leaderboard.length === 0 ? (
                <tr><td colSpan={6}>No teams yet.</td></tr>
              ) : leaderboard.map((row) => (
                <tr key={`${row.teamName}-${row.username}`}>
                  <td><span className={`rank rank-${row.rank}`}>{row.rank}</span></td>
                  <td className="team-name">{row.teamName}</td>
                  <td>{row.username}</td>
                  <td>{row.totalPoints}</td>
                  <td>{row.solvedLevels.length === 0 ? '—' : row.solvedLevels.map((entry) => `L${entry.level}:${entry.points}`).join(', ')}</td>
                  <td>{row.finishedAt ? new Date(row.finishedAt).toLocaleString() : 'Not yet'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}

export default App
