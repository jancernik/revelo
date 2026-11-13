import type { Slide, SlideSource } from "#src/pager"

const ASPECTS = [4 / 5, 3 / 2, 1, 2 / 3, 16 / 9, 3 / 4, 5 / 4, 9 / 16]
const LONG_SIDE = 1024
const GRID = 96

/** Numbered colour blocks of varied aspect ratios, painted on canvases. */
export function makeSlides(count: number): SlideSource {
  const slides: Slide[] = Array.from({ length: count }, (_, index) => {
    const aspect = ASPECTS[index % ASPECTS.length]
    return { aspect, image: paint(index, aspect) }
  })
  return { count, get: (index) => slides[index] }
}

function paint(index: number, aspect: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  const width = aspect >= 1 ? LONG_SIDE : Math.round(LONG_SIDE * aspect)
  const height = aspect >= 1 ? Math.round(LONG_SIDE / aspect) : LONG_SIDE
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) return canvas

  const hue = (index * 137.5) % 360
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, `hsl(${hue} 55% 44%)`)
  gradient.addColorStop(1, `hsl(${(hue + 40) % 360} 60% 20%)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  // A grid makes the lip's refraction and the bend visible.
  context.strokeStyle = "rgb(255 255 255 / 18%)"
  context.lineWidth = 2
  context.beginPath()
  for (let x = GRID; x < width; x += GRID) {
    context.moveTo(x, 0)
    context.lineTo(x, height)
  }
  for (let y = GRID; y < height; y += GRID) {
    context.moveTo(0, y)
    context.lineTo(width, y)
  }
  context.stroke()

  const short = Math.min(width, height)
  context.fillStyle = "rgb(255 255 255 / 92%)"
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.font = `700 ${Math.round(short * 0.5)}px system-ui, sans-serif`
  context.fillText(String(index + 1), width / 2, height / 2)
  context.font = `500 ${Math.round(short * 0.05)}px ui-monospace, monospace`
  context.fillText(`${width} × ${height}`, width / 2, height - short * 0.08)
  return canvas
}
