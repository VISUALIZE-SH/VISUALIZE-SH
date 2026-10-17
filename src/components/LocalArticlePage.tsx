import { useEffect, useRef, useState } from 'react'
import './LocalArticlePage.css'

const ARTICLE_THEME_VARIABLES: Array<[string, string]> = [
  ['--brand', '--brand'], ['--on-brand', '--on-brand'], ['--brand-ink', '--ink'],
  ['--text', '--ink'], ['--text', '--text'], ['--link', '--link'], ['--link-hover', '--link-hover'],
  ['--lilac', '--lilac'], ['--lilac', '--soft'], ['--bg', '--bg'], ['--surface', '--surface'],
  ['--surface-2', '--surface2'], ['--border', '--border'], ['--text-2', '--text2'],
  ['--text-2', '--body'], ['--text-3', '--text3'],
]

interface Props {
  contentPath: string
  darkMode: boolean
}

export default function LocalArticlePage({ contentPath, darkMode }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [articleHtml, setArticleHtml] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setArticleHtml('')
    setLoadError('')
    setLoaded(false)
    fetch(contentPath, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`Article content returned ${response.status}`)
        return response.text()
      })
      .then(html => {
        const baseUrl = new URL(contentPath, window.location.href).href
        const base = `<base href="${baseUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`
        const rootStyle = getComputedStyle(document.documentElement)
        const tokenDeclarations = ARTICLE_THEME_VARIABLES.flatMap(([appVariable, articleVariable]) => {
          const value = rootStyle.getPropertyValue(appVariable).trim()
          return value ? `${articleVariable}:${value} !important;` : ''
        }).join('')
        const token = (name: string) => rootStyle.getPropertyValue(name).trim()
        const themeOverride = `<style id="visualize-theme-override">:root{color-scheme:${darkMode ? 'dark' : 'light'};${tokenDeclarations}}html,body{background:${token('--surface')} !important;color:${token('--text-2')} !important}main{max-width:780px !important;margin-left:auto !important;margin-right:auto !important;background:${token('--surface')} !important}h1,h2,h3{color:${token('--text')} !important}a{color:${token('--link')} !important}body{font-family:${token('--font')} !important}</style>`
        setArticleHtml(html.replace(/<head\b([^>]*)>/i, `<head$1>${base}${themeOverride}`))
      })
      .catch(error => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : String(error))
      })
    return () => controller.abort()
  }, [contentPath, darkMode])

  useEffect(() => {
    const frame = frameRef.current
    const articleDocument = frame?.contentDocument
    if (!frame || !articleDocument?.documentElement || !articleDocument.body || !loaded) return

    const appRootStyle = getComputedStyle(document.documentElement)
    const appBodyStyle = getComputedStyle(document.body)
    const declarations = ARTICLE_THEME_VARIABLES.flatMap(([appVariable, articleVariable]) => {
      const value = appRootStyle.getPropertyValue(appVariable).trim()
      return value ? [`${articleVariable}: ${value} !important`] : []
    })
    const themeStyle = articleDocument.getElementById('visualize-theme-override') ?? articleDocument.createElement('style')
    themeStyle.id = 'visualize-theme-override'
    themeStyle.textContent = `
      :root { color-scheme: ${darkMode ? 'dark' : 'light'}; ${declarations.join('; ')}; }
      html, body { background: var(--surface) !important; color: var(--body) !important; }
      main { max-width: 780px !important; margin-left: auto !important; margin-right: auto !important; background: var(--surface) !important; }
      h1, h2, h3, h4, h5, h6 { color: var(--text) !important; }
      a { color: var(--link) !important; }
    `
    articleDocument.head.appendChild(themeStyle)
    articleDocument.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
    articleDocument.body.style.fontFamily = appBodyStyle.fontFamily

    const fitFrame = () => {
      const doc = frame.contentDocument
      if (!doc) return
      const availableHeight = frame.parentElement?.clientHeight ?? 0
      frame.style.height = `${Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, availableHeight)}px`
    }
    fitFrame()
    const observer = new ResizeObserver(fitFrame)
    observer.observe(articleDocument.documentElement)
    observer.observe(articleDocument.body)
    window.addEventListener('resize', fitFrame)
    const followArticleLink = (event: MouseEvent) => {
      const target = event.target as Element | null
      const anchor = target?.closest('a')
      const href = anchor?.getAttribute('href')
      if (!anchor || !href) return
      if (href.startsWith('#')) {
        event.preventDefault()
        const id = decodeURIComponent(href.slice(1))
        articleDocument.getElementById(id)?.scrollIntoView()
      } else {
        // Workspace routes and source documents belong outside the reader frame.
        if (!anchor.target) anchor.target = '_top'
      }
    }
    articleDocument.addEventListener('click', followArticleLink)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fitFrame)
      articleDocument.removeEventListener('click', followArticleLink)
    }
  }, [articleHtml, contentPath, darkMode, loaded])

  return <main className="workspace-content local-article-page" id="workspace-main">
    {loadError
      ? <p className="local-article-error" role="alert">Unable to load this article: {loadError}</p>
      : !articleHtml ? <p role="status">Loading article…</p> : <iframe
          ref={frameRef}
          className="local-article-frame"
          srcDoc={articleHtml}
          title="Article body"
          onLoad={() => setLoaded(true)}
        />}
  </main>
}
