import { afterEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'

enableAutoUnmount(afterEach)

// jsdom has no element scrolling; Quasar's filtered list schedules it in RAF.
Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  configurable: true,
  value(this: HTMLElement, left: number | ScrollToOptions, top?: number) {
    if (typeof left === 'object') {
      this.scrollLeft = left.left ?? this.scrollLeft
      this.scrollTop = left.top ?? this.scrollTop
    } else { this.scrollLeft = left; this.scrollTop = top ?? this.scrollTop }
  },
})
