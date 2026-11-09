import { createContext, lazy, Suspense, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import type { VisualizationManifest } from './types'
import sceneIndex from './scene-index.json'
import './scene-entry.css'

/**
 * Device-class illustrations: still images of a generic device class in representative
 * anatomy. The small index ships with the app; each class manifest and its images load from
 * public/scenes only when the viewer opens.
 */
export interface SceneIndexEntry { classId: string; conditionId: string; title: string; linkLabel: string; designs: number; views: number }

const VisualizationViewer = lazy(() => import('./VisualizationViewer'))
const HISTORY_KEY = '__sceneViewer'
const scenes: Record<string, SceneIndexEntry> = Object.fromEntries((sceneIndex as SceneIndexEntry[]).map(entry => [entry.classId, entry]))
const manifests = new Map<string, Promise<VisualizationManifest>>()
const Context = createContext<(classId: string, trigger: HTMLAnchorElement) => void>(() => undefined)
type Origin = { trigger: HTMLElement; scroll: Array<{ element: HTMLElement; left: number; top: number }>; x: number; y: number }
const linkId = (classId: string) => `visualize-${classId}`

export function hasScene(classId: string): boolean { return Boolean(scenes[classId]) }

function loadManifest(classId: string): Promise<VisualizationManifest> {
  let pending = manifests.get(classId)
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}scenes/${encodeURIComponent(classId)}/manifest.json`)
      .then(response => { if (!response.ok) throw new Error(`Illustrations unavailable (${response.status})`); return response.json() as Promise<VisualizationManifest> })
    pending.catch(() => manifests.delete(classId))
    manifests.set(classId, pending)
  }
  return pending
}

const requested = () => {
  const id = new URLSearchParams(window.location.search).get('visualize')
  return id && scenes[id] ? id : null
}

/** A shared ?visualize=<class> link opens Data on the class's condition before the app reads its URL state. */
export function normalizeSceneDeepLink(): void {
  const params = new URLSearchParams(window.location.search)
  const direct = params.get('visualize')
  if (!direct || !scenes[direct] || params.has('mode')) return
  const url = new URL(window.location.href)
  url.searchParams.set('mode', 'data')
  url.searchParams.set('condition', scenes[direct].conditionId)
  url.hash = `data-${direct}`
  window.history.replaceState(window.history.state, '', url)
}

function focusClass(classId: string) {
  const focus = () => {
    const link = document.getElementById(linkId(classId))
    if (!link) return false
    link.scrollIntoView({ block: 'center', behavior: 'instant' })
    link.focus({ preventScroll: true })
    return true
  }
  if (focus()) return () => undefined
  const observer = new MutationObserver(() => { if (focus()) observer.disconnect() })
  observer.observe(document.getElementById('root')!, { childList: true, subtree: true })
  const timeout = window.setTimeout(() => observer.disconnect(), 15000)
  return () => { observer.disconnect(); window.clearTimeout(timeout) }
}

export function VisualizationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<string | null>(requested)
  const [manifest, setManifest] = useState<VisualizationManifest | null>(null)
  const openRef = useRef(open)
  const lastOpen = useRef(open)
  const closing = useRef(false)
  const origin = useRef<Origin | null>(null)
  const token = useRef(`scene-${Date.now()}`)
  const restoreCleanup = useRef<() => void>(() => undefined)

  const restore = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const saved = origin.current
      if (saved?.trigger.isConnected) {
        for (const { element, left, top } of saved.scroll) element.scrollTo(left, top)
        window.scrollTo(saved.x, saved.y)
        saved.trigger.focus({ preventScroll: true })
      } else if (lastOpen.current) restoreCleanup.current = focusClass(lastOpen.current)
    }))
  }

  useEffect(() => {
    if (!open) { setManifest(null); return }
    let current = true
    loadManifest(open).then(value => { if (current) setManifest(value) }).catch(error => {
      console.error(error)
      if (current) { openRef.current = null; setOpen(null) }
    })
    return () => { current = false }
  }, [open])

  useEffect(() => {
    const onPop = () => {
      const next = requested()
      if (openRef.current && !next) restore()
      closing.current = false
      openRef.current = next
      if (next) lastOpen.current = next
      setOpen(next)
    }
    window.addEventListener('popstate', onPop)
    const hashClass = window.location.hash.replace('#data-', '')
    const stopInitial = !requested() && scenes[hashClass] ? focusClass(hashClass) : () => undefined
    return () => { window.removeEventListener('popstate', onPop); stopInitial(); restoreCleanup.current() }
  }, [])

  const show = (classId: string, trigger: HTMLAnchorElement) => {
    if (openRef.current) return
    closing.current = false
    const scroll: Origin['scroll'] = []
    let node: HTMLElement | null = trigger.parentElement
    while (node) {
      if (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth) scroll.push({ element: node, left: node.scrollLeft, top: node.scrollTop })
      node = node.parentElement
    }
    origin.current = { trigger, scroll, x: window.scrollX, y: window.scrollY }
    const url = new URL(window.location.href)
    url.searchParams.set('visualize', classId)
    window.history.pushState({ ...window.history.state, [HISTORY_KEY]: token.current }, '', url)
    openRef.current = classId
    lastOpen.current = classId
    setOpen(classId)
  }
  const close = () => {
    if (!openRef.current || closing.current) return
    closing.current = true
    if (window.history.state?.[HISTORY_KEY] === token.current) window.history.back()
    else {
      const url = new URL(window.location.href)
      url.searchParams.delete('visualize')
      window.history.replaceState(window.history.state, '', url)
      openRef.current = null
      setOpen(null)
      closing.current = false
      restore()
    }
  }
  const ready = open && manifest?.classId === open ? manifest : null
  return <Context.Provider value={show}>
    {children}
    {ready && <Suspense fallback={null}><VisualizationViewer key={ready.classId} manifest={ready} onClose={close} returnLabel={ready.title} returnFocusElement={origin.current?.trigger} /></Suspense>}
  </Context.Provider>
}

export function ClassVisualizationLink({ classId, title }: { classId: string; title: string }) {
  const show = useContext(Context)
  const entry = scenes[classId]
  if (!entry) return null
  const url = new URL(window.location.href)
  url.searchParams.set('visualize', classId)
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    show(classId, event.currentTarget)
  }
  const count = entry.designs > 1 ? `${entry.designs} designs` : `${entry.views} views`
  return <a id={linkId(classId)} className="scene-class-link" href={`${url.pathname}${url.search}${url.hash}`} onClick={click} onMouseEnter={() => { void loadManifest(classId).catch(() => undefined) }} aria-haspopup="dialog" aria-label={`${entry.linkLabel}: ${title}`}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" stroke="currentColor" strokeWidth="1.6" /><path d="m3 8 9 5 9-5M12 13v8" stroke="currentColor" strokeWidth="1.6" /></svg>
    {entry.linkLabel} <small>{count}</small>
  </a>
}
