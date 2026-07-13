// ponytail: 内联 SVG 图标，单色 currentColor，无第三方依赖
const P = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
}

export function Icon ({ name, size = 14, className = '' }) {
  const s = { width: size, height: size, className: `ico-svg ${className}`, ...P, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' }
  switch (name) {
    case 'search':
      return <svg {...s}><circle cx='11' cy='11' r='7' /><path d='m21 21-4.3-4.3' /></svg>
    case 'back':
      return <svg {...s}><path d='M19 12H5' /><path d='m12 19-7-7 7-7' /></svg>
    case 'copy':
      return <svg {...s}><rect x='9' y='9' width='13' height='13' rx='2' /><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' /></svg>
    case 'pin':
      return <svg {...s}><path d='M12 17v5' /><path d='M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z' /></svg>
    case 'check':
      return <svg {...s}><path d='M20 6 9 17l-5-5' /></svg>
    case 'x':
      return <svg {...s}><path d='M18 6 6 18' /><path d='m6 6 12 12' /></svg>
    case 'brain':
      return <svg {...s}><path d='M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z' /><path d='M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z' /><path d='M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4' /></svg>
    case 'tool':
      return <svg {...s}><path d='M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4Z' /></svg>
    case 'image':
      return <svg {...s}><rect x='3' y='3' width='18' height='18' rx='2' /><circle cx='9' cy='9' r='2' /><path d='m21 15-5-5L5 21' /></svg>
    case 'download':
      return <svg {...s}><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' /><path d='M7 10l5 5 5-5' /><path d='M12 15V3' /></svg>
    case 'link':
      return <svg {...s}><path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' /><path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' /></svg>
    case 'doc':
      return <svg {...s}><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' /><path d='M14 2v6h6' /></svg>
    case 'code':
      return <svg {...s}><path d='m16 18 6-6-6-6' /><path d='m8 6-6 6 6 6' /></svg>
    case 'key':
      return <svg {...s}><path d='M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3' /></svg>
    case 'api':
      return <svg {...s}><path d='m4 17 6-6-6-6' /><path d='M12 19h8' /></svg>
    case 'clock':
      return <svg {...s}><circle cx='12' cy='12' r='9' /><path d='M12 7v5l3 2' /></svg>
    case 'hash':
      return <svg {...s}><path d='M4 9h16M4 15h16M10 3 8 21M16 3l-2 18' /></svg>
    case 'box':
      return <svg {...s}><path d='M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' /><path d='m3.3 7 8.7 5 8.7-5M12 22V12' /></svg>
    case 'sliders':
      return <svg {...s}><path d='M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6' /></svg>
    case 'scale':
      return <svg {...s}><path d='m16 16 3-8 3 8c-2 1.5-4 1.5-6 0' /><path d='m2 16 3-8 3 8c-2 1.5-4 1.5-6 0' /><path d='M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2' /></svg>
    default:
      return null
  }
}
