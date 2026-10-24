const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const SUN_RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

// Stand-ins for the new day and new week animations: the sun rising over the hills, each week of
// the month under its own sky.
const SKIES = {
  day: { top: '#3b6fa8', bottom: '#f3b86e', sun: '#ffd84a' },
  1: { top: '#1d3a76', bottom: '#f08a4b', sun: '#ffa23a' },
  2: { top: '#2c7dd0', bottom: '#a8dcf2', sun: '#fff27e' },
  3: { top: '#563c88', bottom: '#f27f74', sun: '#ff7a6b' },
  4: { top: '#10204a', bottom: '#c98b3a', sun: '#ffcf5c' }
}

function svgElement(document, name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name)
  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, String(value))
  }
  return element
}

function renderSky(document, skyId, sky) {
  const gradient = svgElement(document, 'linearGradient', { id: skyId, x1: 0, y1: 0, x2: 0, y2: 1 })
  gradient.append(
    svgElement(document, 'stop', { offset: '0%', 'stop-color': sky.top }),
    svgElement(document, 'stop', { offset: '100%', 'stop-color': sky.bottom })
  )
  const definitions = svgElement(document, 'defs')
  definitions.append(gradient)
  return [
    definitions,
    svgElement(document, 'rect', { width: 64, height: 40, fill: `url(#${skyId})` })
  ]
}

function renderSun(document, sky) {
  const sun = svgElement(document, 'g', { class: 'date-box__sun' })
  for (const angle of SUN_RAY_ANGLES) {
    sun.append(
      svgElement(document, 'rect', {
        x: 31,
        y: 3,
        width: 2,
        height: 4,
        fill: sky.sun,
        transform: `rotate(${angle} 32 15)`
      })
    )
  }
  sun.append(svgElement(document, 'circle', { cx: 32, cy: 15, r: 6, fill: sky.sun }))
  return sun
}

function renderHills(document) {
  return [
    svgElement(document, 'polygon', {
      points: '0,30 10,24 22,28 34,22 48,27 58,23 64,25 64,40 0,40',
      fill: '#2f5a2a'
    }),
    svgElement(document, 'polygon', {
      points: '0,34 14,29 28,33 42,30 54,34 64,31 64,40 0,40',
      fill: '#1f3f1c'
    })
  ]
}

function renderSunrise(document, { week }) {
  const sky = SKIES[week ?? 'day']
  const picture = svgElement(document, 'svg', {
    class: 'date-box__picture',
    viewBox: '0 0 64 40',
    'shape-rendering': 'crispEdges',
    role: 'img',
    'aria-label': week ? `Sunrise of week ${week}` : 'Sunrise'
  })
  picture.append(
    ...renderSky(document, `date-box-sky-${week ?? 'day'}`, sky),
    renderSun(document, sky),
    svgElement(document, 'rect', { class: 'date-box__dusk', width: 64, height: 40 }),
    ...renderHills(document)
  )
  return picture
}

// On the first day of a week the box names the week of the month and shows that week's sunrise;
// on the other days it names the day of the week.
export function renderDateBox(container, document, { week, day }) {
  const isNewWeek = day === 1
  const heading = document.createElement('h2')
  heading.className = 'date-box__text'
  heading.textContent = isNewWeek ? `Week ${week}` : `Day ${day}`

  container.classList.remove('hero-box', 'town-box', 'found-box')
  container.classList.add('date-box')
  container.replaceChildren(heading, renderSunrise(document, { week: isNewWeek ? week : null }))
}
