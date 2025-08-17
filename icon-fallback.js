// Simple fallback icon as data URL
const FALLBACK_ICON = 'data:image/svg+xml;base64,' + btoa(`
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="15" r="9" fill="#4a90e2" stroke="#2c5aa0" stroke-width="2"/>
  <path d="M9 42c0-9 6-15 15-15s15 6 15 15" fill="#4a90e2" stroke="#2c5aa0" stroke-width="2"/>
</svg>
`);
