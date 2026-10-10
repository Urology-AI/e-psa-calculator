import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DemoShowcase from './components/DemoShowcase.jsx'
import ClinicalApp from './clinical/ClinicalApp.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import { installGlobalErrorCapture } from './utils/errorReport.js'
import './i18n/i18n.js'

const path = window.location.pathname.replace(/\/+$/, '')
const isDemo = path === '/demo'
const isClinical = path === '/clinical'

installGlobalErrorCapture()

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      {isClinical ? <ClinicalApp /> : isDemo ? <DemoShowcase /> : <App />}
    </AppErrorBoundary>
  </React.StrictMode>
)
