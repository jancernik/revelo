export interface GalleryHandle {
  isAutoScrollActive?: () => boolean
  isScrollPaused: () => boolean
  onSettle: (callback: () => void) => void
  pauseScrolling: () => void
  queueAutoScrollResume?: () => void
  resumeScrolling: () => void
  startAutoScroll: () => void
  stopAutoScroll: () => void
}
