import { useEffect, useRef } from 'react'

interface Props {
  onClose: () => void
}

// Signup is an outbound link only; reject malformed or credential-bearing
// deployment values before they can become a link in the public UI.
function safeSignupUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value)
    const zohoHostedForm =
      url.hostname === 'zc.vg' ||
      url.hostname === 'maillist-manage.com' ||
      url.hostname.endsWith('.maillist-manage.com')
    return url.protocol === 'https:' && zohoHostedForm && url.pathname !== '/' && !url.username && !url.password
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

const signupUrl = safeSignupUrl(import.meta.env.VITE_NEWSLETTER_SIGNUP_URL)

export default function NewsletterSignup({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )

    const initialFocus = focusable()[0]
    initialFocus?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (elements.length === 0) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div className="modal-backdrop newsletter-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal newsletter-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-title"
        aria-describedby="newsletter-description"
      >
        <div className="modal-head">
          <h2 id="newsletter-title">Newsletter signup</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close newsletter signup">
            ✕
          </button>
        </div>
        <div className="modal-body newsletter-body">
          <p id="newsletter-description">
            Subscribe for structural heart approvals,
            trial readouts, and emerging ideas.
          </p>
          {signupUrl ? (
            <a
              className="newsletter-link"
              href={signupUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Subscribe to the newsletter <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <p className="newsletter-config-note" role="status">
              Signup is being configured. Check back soon.
            </p>
          )}
          <p className="newsletter-note">
            The signup form is hosted by Zoho Campaigns. Your details go directly to Zoho; this site
            does not store them. Read our{' '}
            <a
              href={`${import.meta.env.BASE_URL}privacy.html`}
              target="_blank"
              rel="noopener noreferrer"
            >
              privacy notice
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
