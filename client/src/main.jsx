import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { API_BASE_URL } from './config/api'

// Direct all relative /api/ requests to the configured backend URL
if (typeof window !== "undefined" && API_BASE_URL) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      input = `${API_BASE_URL}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith("/api/")) {
      input = new URL(`${API_BASE_URL}${input.pathname}${input.search}`);
    } else if (input instanceof Request && typeof input.url === "string" && input.url.startsWith("/")) {
      input = new Request(`${API_BASE_URL}${input.url}`, init);
    }
    return nativeFetch(input, init);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
