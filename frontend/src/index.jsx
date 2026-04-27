import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DemoShowcase from './components/DemoShowcase.jsx'
import './i18n/i18n.js'

const isDemo = window.location.pathname === '/demo'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    {isDemo ? <DemoShowcase /> : <App />}
  </React.StrictMode>
)
