import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initializeTheme } from './theme'
import './index.css'
import { normalizeSceneDeepLink, VisualizationProvider } from './components/scenes/SceneEntry'

normalizeSceneDeepLink()
initializeTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VisualizationProvider>
      <App />
    </VisualizationProvider>
  </React.StrictMode>,
)
