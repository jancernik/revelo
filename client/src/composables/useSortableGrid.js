import { gsap } from "gsap"
import { Draggable } from "gsap/Draggable"

gsap.registerPlugin(Draggable)

export function useSortableGrid() {
  let containerElement = null
  let sortableItems = []
  let draggables = []
  let colCount = 0
  let cellWidth = 0
  let cellHeight = 0
  let gapX = 0
  let gapY = 0
  let zIndex = 200
  let resizeObserver = null

  const measureGrid = () => {
    if (!containerElement || sortableItems.length === 0) return

    const styles = getComputedStyle(containerElement)
    gapX = parseFloat(styles.columnGap) || 0
    gapY = parseFloat(styles.rowGap) || 0

    const cols = styles.gridTemplateColumns.trim().split(/\s+/)
    colCount = Math.max(1, cols.length)
    cellWidth = parseFloat(cols[0]) || 0
    cellHeight = cellWidth
  }

  const getPos = (index) => ({
    x: (index % colCount) * (cellWidth + gapX),
    y: Math.floor(index / colCount) * (cellHeight + gapY)
  })

  const layoutInvalidated = (partialRow = -1) => {
    const tl = gsap.timeline()
    const partial = partialRow > -1

    sortableItems.forEach((item, i) => {
      item.index = i
      item.row = Math.floor(i / colCount)
      item.col = i % colCount

      if (partial && item.row !== partialRow) return
      if (item.isDragging) return

      const pos = getPos(i)
      item.x = pos.x
      item.y = pos.y
      tl.to(item.el, { duration: 0.25, ease: "power2.out", x: pos.x, y: pos.y }, "swap")
    })
  }

  const changePosition = (from, to) => {
    const fromRow = sortableItems[from].row
    const toRow = sortableItems[to].row
    const rowToUpdate = fromRow === toRow ? fromRow : -1

    const [item] = sortableItems.splice(from, 1)
    sortableItems.splice(to, 0, item)

    layoutInvalidated(rowToUpdate)
  }

  const applyLayout = () => {
    const rowCount = Math.ceil(sortableItems.length / colCount)
    gsap.set(containerElement, { height: rowCount * cellHeight + (rowCount - 1) * gapY })

    sortableItems.forEach((item, i) => {
      item.index = i
      item.row = Math.floor(i / colCount)
      item.col = i % colCount
      const pos = getPos(i)
      item.x = pos.x
      item.y = pos.y

      if (!item.isDragging) {
        gsap.set(item.el, { height: cellHeight, width: cellWidth, x: pos.x, y: pos.y })
      }
    })
  }

  const init = (container, images, onReorder) => {
    containerElement = container
    const itemEls = Array.from(container.querySelectorAll(".image-item"))

    sortableItems = itemEls.map((el, index) => ({
      col: 0,
      el,
      image: images[index],
      index,
      isDragging: false,
      row: 0,
      x: 0,
      y: 0
    }))

    measureGrid()

    gsap.set(containerElement, { position: "relative" })
    sortableItems.forEach((item) => {
      gsap.set(item.el, { left: 0, position: "absolute", top: 0 })
    })
    applyLayout()

    draggables = sortableItems.map((item) => {
      return Draggable.create(item.el, {
        activeCursor: "grabbing",
        cursor: "grab",
        onDrag() {
          for (let i = 0; i < sortableItems.length; i++) {
            const target = sortableItems[i]
            if (target === item || target.isDragging) continue

            const sameRow = item.row === target.row
            const goingRight = this.deltaX >= 0
            const goingLeft = this.deltaX <= 0
            const targetIsRight = item.index < target.index
            const targetIsLeft = item.index > target.index

            const validMove = sameRow
              ? (goingRight && targetIsRight) || (goingLeft && targetIsLeft)
              : true

            if (validMove && this.hitTest(target.el, "50%")) {
              changePosition(item.index, target.index)
              break
            }
          }
        },
        onDragEnd() {
          item.isDragging = false
          const pos = getPos(item.index)
          gsap.to(item.el, {
            duration: 0.2,
            ease: "power2.out",
            onComplete: () => onReorder(sortableItems.map((si) => si.image)),
            scale: 1,
            x: pos.x,
            y: pos.y
          })
        },
        onDragStart() {
          item.isDragging = true
          gsap.to(item.el, {
            duration: 0.2,
            ease: "power2.out",
            zIndex: ++zIndex
          })
        },
        type: "x,y",
        zIndexBoost: false
      })[0]
    })

    resizeObserver = new ResizeObserver(() => {
      if (sortableItems.length === 0) return
      measureGrid()
      applyLayout()
    })
    resizeObserver.observe(containerElement)
  }

  const cleanup = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }

    draggables.forEach((d) => d.kill())
    draggables = []

    if (containerElement) {
      gsap.set(containerElement, { clearProps: "height,position" })
    }

    sortableItems.forEach((item) => {
      gsap.set(item.el, {
        clearProps: "position,left,top,width,height,x,y,transform,zIndex,scale"
      })
    })

    sortableItems = []
    containerElement = null
    colCount = 0
  }

  return { cleanup, init }
}
