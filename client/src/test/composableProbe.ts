import type { Component, ComponentOptions } from "vue"

import { defineComponent } from "vue"

// Builds a host component without an options literal so Vue property-order and
// object-sort lint rules cannot conflict in the test files that mount it.
export const composableProbe = <S extends object>(
  useComposable: () => S,
  onSnapshot?: (state: S) => void
): Component => {
  const options: ComponentOptions = {}
  options.setup = () => {
    const state = useComposable()
    onSnapshot?.(state)
    return { ...state }
  }
  options.render = () => null
  return defineComponent(options)
}
