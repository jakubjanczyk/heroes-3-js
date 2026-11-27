export const OPENING = '#2b2420'
export const OUTLINE = 'stroke="#2a221c" stroke-width="0.8" stroke-linejoin="round"'

export function rect(x, y, width, height, fill, extra = '') {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" ${extra}/>`
}

export function polygon(points, fill, extra = '') {
  return `<polygon points="${points}" fill="${fill}" ${extra}/>`
}

export function archedOpening(x, y, width, height, fill = OPENING) {
  const radius = width / 2
  return `<path d="M${x} ${y + height}V${y + radius}a${radius} ${radius} 0 0 1 ${width} 0V${y + height}z" fill="${fill}"/>`
}

export function cloud(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="white" opacity="0.85"><ellipse cx="0" cy="0" rx="34" ry="10"/><ellipse cx="-18" cy="-6" rx="16" ry="10"/><ellipse cx="10" cy="-10" rx="20" ry="13"/></g>`
}

export function smoke(x, y) {
  return `<g fill="#9a958d" opacity="0.6"><circle cx="${x}" cy="${y}" r="4"/><circle cx="${x + 4}" cy="${y - 7}" r="5"/><circle cx="${x + 9}" cy="${y - 15}" r="6"/></g>`
}
