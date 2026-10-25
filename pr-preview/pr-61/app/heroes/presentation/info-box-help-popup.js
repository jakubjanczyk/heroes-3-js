const TITLE = 'Status Window'
const TEXT =
  'This window provides information on the status of your hero or kingdom, and shows the date. Left click here to cycle through these windows.'

// Shown in the middle of the screen, not at the pointer as the map's popup is.
export function openInfoBoxHelpPopup(document, host) {
  const popup = document.createElement('div')
  popup.className = 'info-popup info-popup--help message-box'
  popup.setAttribute('role', 'tooltip')
  popup.setAttribute('aria-label', TITLE)

  const title = document.createElement('h2')
  title.className = 'info-popup__title'
  title.textContent = TITLE
  const text = document.createElement('p')
  text.className = 'info-popup__line'
  text.textContent = TEXT
  popup.append(title, text)

  host.appendChild(popup)
  const window = document.defaultView
  const { width, height } = popup.getBoundingClientRect()
  popup.style.left = `${(window.innerWidth - width) / 2}px`
  popup.style.top = `${(window.innerHeight - height) / 2}px`
  return popup
}
