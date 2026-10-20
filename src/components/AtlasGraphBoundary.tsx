import { Component, type ReactNode } from 'react'

/** A rejected graph import must not unmount navigation and the other workspaces. */
export default class AtlasGraphBoundary extends Component<{
  children: ReactNode
  onOpenProfiles: () => void
}, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <section className="workspace-loading" role="alert">
      <h2>Atlas couldn’t load</h2>
      <p>Reload to try again, or browse product profiles.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload Atlas</button>
      <button type="button" onClick={this.props.onOpenProfiles}>Open Profiles</button>
    </section>
  }
}
