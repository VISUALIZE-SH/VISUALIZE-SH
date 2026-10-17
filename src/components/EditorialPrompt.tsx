import { useEffect, useState } from 'react'
import type { NewsItem } from '../types/entities'
import { EDITORIAL_DISMISS_KEY, editorialInvitation } from '../editorial/promotion'
import './EditorialPrompt.css'

export default function EditorialPrompt({ news }: { news: NewsItem[] }) {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(EDITORIAL_DISMISS_KEY) === '1'
    } catch { return false }
  })
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const delay = window.setTimeout(() => setReady(true), 8000)
    const clock = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => { window.clearTimeout(delay); window.clearInterval(clock) }
  }, [])
  const article = editorialInvitation(news, now)
  if (!ready || dismissed || !article) return null
  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(EDITORIAL_DISMISS_KEY, '1')
    } catch { /* Dismissal still works without storage. */ }
  }
  return <aside className="editorial-invitation" aria-label="New editorial">
    <button type="button" className="editorial-invitation-close" aria-label="Dismiss editorial invitation" onClick={dismiss}>×</button>
    <span className="editorial-invitation-label">Editorial · Part 1</span>
    <p>How LAAO devices deliver, seal, hold, and heal.</p>
    <a href={article.sourceUrl} onClick={dismiss}>Read the design review <span aria-hidden="true">→</span></a>
  </aside>
}
