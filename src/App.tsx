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
  answer: string
  hint: string
  skill: string
}

type Solve = { level: number; time: string }

const levels: Level[] = [
  { id: 1, title: 'The Entrance', story: 'Every labyrinth begins with a whisper. Read it.', direction: 'This fragment uses a familiar alphabet of letters, numbers, and symbols, with padding at the end. Decode the wrapper first, then read the sentence inside.', cipher: 'VGhlIGdhdGUgb3BlbnMgZm9yIHRob3NlIHdobyBzYXk6IGxhbnRlcm4=', answer: 'lantern', hint: 'The padding and alphabet point to a common encoding.', skill: 'Base64' },
  { id: 2, title: 'The Second Door', story: 'The light you just found is the key to this door.', direction: 'The spaces and word lengths have survived, but the letters have shifted unevenly. Use your previous answer as a repeating key to reverse the shifts.', cipher: 'ehr litbyd qhsi nysjxvj gz azuii', answer: 'amber', hint: 'Use the answer from the previous level as the key.', skill: 'Vigenere' },
  { id: 3, title: 'The Lock', story: 'This lock opens only for the fossilised resin from the previous door.', direction: 'The payload contains only hexadecimal characters. Convert those pairs into bytes first; if CyberChef reports a raw byte array or displays random symbols, that is expected. Add XOR as the second step, use your previous answer as the repeating UTF-8 key, and read the new text.', cipher: '150507450609041001520d02010e52081e420713120c0e11', answer: 'basalt', hint: 'CyberChef recipe: From Hex (delimiter None), then XOR with key amber and key type UTF8. The readable sentence appears only after both steps.', skill: 'Hex + XOR' },
  { id: 4, title: 'The Seal', story: 'The stone you found has a number of letters. Let that many rails carry the message up and down.', direction: 'Nothing has been substituted: the letters have only been rearranged. Count the letters in your previous answer and use that number for a zig-zag rail transposition.', cipher: 'TERHSAAREHLYOFTRSWOREDUA', answer: 'yarrow', hint: 'The previous answer tells you how many rails to use.', skill: 'Rail Fence' },
  { id: 5, title: 'The Signal', story: 'A guardian speaks in dots and dashes, wrapped in an old wrapper of 32 symbols.', direction: 'The uppercase alphabet and trailing padding identify the outer layer. After removing it, preserve the separators: dots and dashes form letters, while slashes separate words.', cipher: 'FUQC4LROFYQC4IBPEAXC4LJOEAXC4IBOFYWS4IBNEAXC4LROEAXSALJNFYQC4LRNEAXC2IBOFUXCALJOFYQC4LRAFYWSALJOEAXSALROEAXC4LRAF4QC4LJOEAXC2IBOFYXC2IBOEAWS4===', answer: 'raven', hint: 'Unwrap the 32-symbol layer, then listen to the dots and dashes.', skill: 'Base32 + Morse' },
  { id: 6, title: 'The Shifting Path', story: 'Count the letters of the guardian you just met. Walk the alphabet that many steps.', direction: 'The spaces remain in place and every letter has moved by the same amount. Use the length of the previous answer to walk backward through the alphabet.', cipher: 'ymj xncym ufym qjfix yt nsinlt', answer: 'indigo', hint: 'Shift each letter back by the length of the previous answer.', skill: 'Caesar' },
  { id: 7, title: 'The Mirror Sky', story: 'The stars are written in the language of machines, and the sky is reflected.', direction: 'Each group is eight binary digits, so translate the machine language into text first. The result is still disguised: use the clue about reflection to transform the alphabet.', cipher: '01100111 01110011 01110110 00100000 01101000 01110110 01100101 01110110 01101101 01110011 00100000 01101000 01100111 01111010 01101001 00100000 01110010 01101000 00100000 01101101 01110110 01111001 01100110 01101111 01111010', answer: 'nebula', hint: 'Decode the machine language first. Then reflect the alphabet.', skill: 'Binary + Atbash' },
  { id: 8, title: 'The Double Wrap', story: 'Two layers of packaging protect this message. Unwrap them one by one.', direction: 'The outer text ends with Base64 padding. Decode that result once, inspect the new alphabet, and decode the second wrapper before reading the sentence.', cipher: 'T1JVR0tJREZORlRXUTVESUVCVFdDNURGRUJVWEdJRFVNRldHNjNRPQ==', answer: 'talon', hint: 'The outside layer ends in ==. What does that suggest?', skill: 'Base64 + Base32' },
  { id: 9, title: 'The Grid', story: 'A 5x5 square guards the final guardian. Its keyword is the creature of the previous gate.', direction: 'This is a letter-pair cipher: split the text into pairs and build a 5x5 alphabet square. Use the previous answer as the keyword, merging I and J into one cell.', cipher: 'AGFBMLLOMPLQIRLTKRKAXRYNLZ', answer: 'horizon', hint: 'Look for a 5x5 grid cipher invented in the 1800s.', skill: 'Playfair' },
  { id: 10, title: 'The Vault', story: 'Nine guardians, nine initials. Together they name this labyrinth, and that name is the vault\'s key.', direction: 'The final payload is hex again. Assemble a key from the first letters of the nine answers, keep its original uppercase form, then use it to unlock the bytes.', cipher: '0f131b0906061f010d1f153915660b17067902150a06070702640b07720624', answer: 'CRYPTOQUEST{L4BYR1NTH_UNL0CK3D}', hint: 'What do the first letters of the guardians spell?', skill: 'Hex + XOR' },
]

const demoRows = [
  { rank: 1, team: 'Cipher Society', solved: '10 / 10', last: '14:42:08', total: '38:14' },
  { rank: 2, team: 'The Null Set', solved: '9 / 10', last: '14:40:51', total: '41:06' },
  { rank: 3, team: 'Byte Me', solved: '9 / 10', last: '14:35:22', total: '44:18' },
  { rank: 4, team: 'The Fifth Rail', solved: '7 / 10', last: '14:28:47', total: '39:52' },
]

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${remainder}`
}

function App() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.pathname === '/admin')
  const [mobileNav, setMobileNav] = useState(false)
  const [activeLevel, setActiveLevel] = useState(1)
  const [solved, setSolved] = useState<Solve[]>([{ level: 1, time: '14:08:32' }])
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(231)

  useEffect(() => {
    if (isAdmin) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isAdmin])

  const current = levels[activeLevel - 1]
  const completed = solved.some((item) => item.level === activeLevel)
  const progress = Math.round((solved.length / levels.length) * 100)
  const nextLevel = useMemo(() => Math.min(activeLevel + 1, levels.length), [activeLevel])

  function selectLevel(level: number) {
    if (level > solved.length + 1) return
    setActiveLevel(level)
    setFeedback(null)
    setAnswer('')
    setShowHint(false)
    setMobileNav(false)
  }

  function submitAnswer() {
    const isCorrect = answer.trim().toLowerCase() === current.answer.toLowerCase()
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect && !completed) {
      setSolved((items) => [...items, { level: activeLevel, time: formatTime(elapsed) }])
    }
  }

  async function copyCipher() {
    await navigator.clipboard.writeText(current.cipher)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function exportCsv() {
    const csv = ['rank,team,levels solved,last solve time,total time', ...demoRows.map((row) => Object.values(row).join(','))].join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'labyrinth-results.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  if (isAdmin) {
    return <AdminDashboard onExit={() => { window.history.pushState({}, '', '/'); setIsAdmin(false) }} onExport={exportCsv} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="The Labyrinth home"><span className="brand-mark"><span /></span><span>THE LABYRINTH</span></a>
        <div className="topbar-meta"><span className="team-chip"><span className="online-dot" /> TEAM ORBIT</span><span className="topbar-divider" /><span className="nav-timer"><Clock3 size={15} /> {formatTime(elapsed)}</span><button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle levels"><Menu size={19} /></button></div>
      </header>
      <div className={`game-layout ${mobileNav ? 'nav-open' : ''}`}>
        <aside className="level-sidebar">
          <div className="side-heading"><span>THE ASCENT</span><span className="level-count">{solved.length} / 10</span></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <nav className="level-list" aria-label="Puzzle levels">
            {levels.map((level) => {
              const isSolved = solved.some((item) => item.level === level.id)
              const isLocked = level.id > solved.length + 1
              return <button key={level.id} className={`level-item ${activeLevel === level.id ? 'active' : ''} ${isSolved ? 'solved' : ''} ${isLocked ? 'locked' : ''}`} disabled={isLocked} onClick={() => selectLevel(level.id)}><span className="level-number">{isSolved ? <Check size={15} /> : isLocked ? <LockKeyhole size={14} /> : `0${level.id}`}</span><span className="level-name">{level.title}</span><span className="level-state">{isSolved ? 'SOLVED' : isLocked ? 'LOCKED' : 'OPEN'}</span></button>
            })}
          </nav>
          <div className="side-footer"><ShieldCheck size={15} /><span>YOUR PROGRESS IS PRIVATE</span></div>
        </aside>
        <main className="puzzle-main">
          <div className="puzzle-header"><div className="eyebrow">CHAMBER {String(activeLevel).padStart(2, '0')} <span /> {current.skill.toUpperCase()}</div><div className="header-actions"><button className="text-button"><CircleHelp size={15} /> RULES</button><button className="text-button" onClick={() => { window.history.pushState({}, '', '/admin'); setIsAdmin(true) }}><Eye size={15} /> ADMIN</button></div></div>
          <section className="puzzle-intro"><div className="intro-number">{String(activeLevel).padStart(2, '0')}</div><div><h1>{current.title}</h1><p>{current.story}</p><p className="direction"><span>READ THE PATTERN</span>{current.direction}</p></div></section>
          <section className="cipher-panel"><div className="panel-label"><FileKey2 size={16} /> ENCRYPTED FRAGMENT <span>REF. {String(activeLevel).padStart(2, '0')}</span></div><div className={`cipher-text ${activeLevel > 6 ? 'dense' : ''}`}>{current.cipher}</div><div className="panel-footer"><span><Sparkles size={14} /> Every answer opens the next chamber.</span><span className="cipher-tools"><span>{current.cipher.length} CHARACTERS</span><button className="copy-button" onClick={copyCipher}><Copy size={13} /> {copied ? 'COPIED' : 'COPY CODE'}</button></span></div></section>
          <section className="answer-section"><div className="answer-label"><span>WHAT WORD DO YOU HEAR?</span>{completed && <span className="solved-label"><Check size={14} /> SOLVED</span>}</div><div className={`answer-row ${feedback === 'correct' ? 'is-correct' : feedback === 'wrong' ? 'is-wrong' : ''}`}><input value={answer} onChange={(event) => { setAnswer(event.target.value); setFeedback(null) }} onKeyDown={(event) => event.key === 'Enter' && submitAnswer()} placeholder="Enter your answer" aria-label="Your answer" /><button onClick={submitAnswer} disabled={!answer.trim() || completed}>{completed ? <><Check size={17} /> Complete</> : <>Submit <ArrowRight size={17} /></>}</button></div>{feedback === 'correct' && <p className="feedback success"><Check size={15} /> Correct. The next door is waiting.</p>}{feedback === 'wrong' && <p className="feedback error"><X size={15} /> Not quite. Trace the clue back to its first instruction.</p>}</section>
          <div className="lower-actions"><button className={`hint-button ${showHint ? 'revealed' : ''}`} onClick={() => setShowHint(!showHint)}><Sparkles size={16} /> {showHint ? 'HIDE HINT' : 'NEED A HINT?'}<ChevronDown size={15} /></button>{showHint && <p className="hint-copy">{current.hint}</p>}<div className="next-control">{completed && activeLevel < 10 && <button className="next-button" onClick={() => selectLevel(nextLevel)}>Continue to chamber {String(nextLevel).padStart(2, '0')} <ArrowRight size={17} /></button>}</div></div>
          <div className="puzzle-note"><Flag size={14} /><span>Answers are case-insensitive. You can return to any chamber you have opened.</span></div>
        </main>
      </div>
    </div>
  )
}

function AdminDashboard({ onExit, onExport }: { onExit: () => void; onExport: () => void }) {
  return <div className="admin-shell"><header className="topbar admin-topbar"><a className="brand" href="/admin"><span className="brand-mark"><span /></span><span>THE LABYRINTH</span></a><div className="admin-session"><ShieldCheck size={15} /> ADMIN SESSION ACTIVE <button className="text-button" onClick={onExit}><LogOut size={15} /> EXIT</button></div></header><main className="admin-main"><div className="admin-heading"><div><div className="eyebrow">CONTROL ROOM <span /> LIVE OPERATIONS</div><h1>Results dashboard</h1><p>Private view for organisers. Refreshes automatically every 10 seconds.</p></div><button className="export-button" onClick={onExport}><Download size={17} /> Export results as CSV</button></div><div className="admin-stats"><div><Users size={18} /><span>TEAMS ACTIVE</span><strong>18</strong></div><div><Flag size={18} /><span>FINISHED</span><strong>3</strong></div><div><Clock3 size={18} /><span>FASTEST FINISH</span><strong>38:14</strong></div><div><RotateCcw size={18} /><span>LAST REFRESH</span><strong>10 sec</strong></div></div><section className="results-table-wrap"><div className="table-heading"><span>LIVE STANDINGS</span><span className="private-badge"><ShieldCheck size={13} /> ADMIN ONLY</span></div><table><thead><tr><th>RANK</th><th>TEAM NAME</th><th>LEVELS SOLVED</th><th>LAST SOLVE TIME</th><th>TOTAL TIME</th></tr></thead><tbody>{demoRows.map((row) => <tr key={row.rank}><td><span className={`rank rank-${row.rank}`}>{row.rank}</span></td><td className="team-name">{row.team}</td><td><span className="solved-pill"><Check size={13} /> {row.solved}</span></td><td>{row.last}</td><td>{row.total}</td></tr>)}</tbody></table></section><p className="admin-footnote"><ShieldCheck size={14} /> This dashboard and its data must be protected by the admin session on the server. Non-admin requests to <code>/leaderboard</code> and its API return <code>403</code>.</p></main></div>
}

export default App
