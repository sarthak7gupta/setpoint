function rgb(hex: string) {
  const text = hex.slice(1)
  return [0, 2, 4].map((i) => parseInt(text.slice(i, i + 2), 16))
}
function luminance(hex: string) {
  const c = rgb(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
export function readableText(background: string) {
  return contrast('#FFFFFF', background) >= contrast('#101010', background) ? '#FFFFFF' : '#101010'
}
export function ensureContrast(color: string, backgrounds: string[], ratio = 4.5) {
  if (backgrounds.every((bg) => contrast(color, bg) >= ratio)) return color
  const target = ['#FFFFFF', '#101010'].sort(
    (a, b) =>
      Math.min(...backgrounds.map((bg) => contrast(b, bg))) -
      Math.min(...backgrounds.map((bg) => contrast(a, bg))),
  )[0]
  const from = rgb(color),
    to = rgb(target)
  for (let step = 1; step <= 100; step++) {
    const next =
      '#' +
      from
        .map((c, i) =>
          Math.round(c + ((to[i] - c) * step) / 100)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    if (backgrounds.every((bg) => contrast(next, bg) >= ratio)) return next
  }
  return target
}
export function readableGradient(start: string, end: string) {
  const text = ['#FFFFFF', '#101010'].sort(
    (a, b) =>
      Math.min(contrast(b, start), contrast(b, end)) -
      Math.min(contrast(a, start), contrast(a, end)),
  )[0]
  return { text, start: ensureContrast(start, [text]), end: ensureContrast(end, [text]) }
}
