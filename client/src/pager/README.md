# Pager

The swipe interaction shell: one item on screen, a swipe steps to a neighbour
through a transition that follows the finger. It knows nothing about photos,
galleries or collections. Consumers supply slides and decide where a step
leads.

## Layers

Each layer is plain TypeScript with no DOM except where noted, and each can be
tested on its own.

| Module             | Responsibility                                                                 |
| ------------------ | ------------------------------------------------------------------------------ |
| `config.ts`        | Every tunable of the interaction, with its defaults, and `mergeConfig`.        |
| `gesture.ts`       | DOM input: one pointer at a time into a drag along a locked axis; keys; wheel. |
| `follow.ts`        | How the front moves with the finger during a drag: `catch` or `offset`.        |
| `model.ts`         | The swipe state machine: index, signed progress, landing, release, settling.   |
| `flow.ts`          | The elastic front and the bulge under the finger, as a `FlowState`.            |
| `haptics.ts`       | A `Haptics` interface with vibration, iOS switch and silent implementations.   |
| `engine.ts`        | Wires gesture, model, flow and a renderer on a canvas; runs the frame loop.    |
| `render/types.ts`  | The `Renderer` and `SlideSource` contracts.                                    |
| `render/layout.ts` | Frame maths: fit, cover, and the `framed` and `morph` layouts.                 |
| `render/glass/`    | The glass transition: its config, shaders and three.js renderer.               |
| `Pager.vue`        | The Vue component over the engine: props, events and exposed methods.          |

Data flows one way per frame: gesture → model → flow → `PagerFrame` → renderer.
A renderer only ever sees a `PagerFrame` and the slides, so another transition
is a new `Renderer`, and a DOM renderer is possible without touching the
interaction.

## Conventions

- Direction `1` is toward the next item: swiping up or left. The next item
  enters from the bottom or the right.
- Progress is signed in the model and absolute in the frame, with `direction`
  alongside. A step spans the screen along its axis.
- `Neighbor` answers where a step leads. Returning `null` makes that direction
  an edge, which rubber bands. Jumping several indices at once is how a
  "collection" step is expressed.
- A finger can land several steps in one drag. A grab during a transition
  holds it where it is and moves it one to one with the finger.
- A flick or key during a transition goes one item past where it was heading,
  so quick repeated swipes reach one item each. Targets count steps, and the
  settle lands each item it passes.
- The settle starts at the speed the content was moving, which is the front's
  speed in catch mode and the rubber band's share at an edge. A return to the
  current item stops there and never swings past it.
- Input on another axis during a transition is ignored and the step carries
  on; nothing is queued, so every move happens when it is made.

## Using it

```vue
<Pager
  v-model:index="index"
  :slides="slides"
  :axes="['y']"
  :neighbor="neighbor"
  :config="{ follow: { mode: 'catch' } }"
  :renderer="(canvas) => new GlassRenderer(canvas, { layout: { mode: 'morph' } })"
  @phase="onPhase"
>
  overlays go here
</Pager>
```

`slides` is a `SlideSource`: a `count` and `get(index)` returning `{ aspect,
image }`. Give a new `image` object when better pixels arrive and call the
exposed `redraw()`. Replacing the source, or changing a reactive source's
`count`, clamps the current index and drops steps that no longer lead anywhere;
for a plain object, call `redraw()` after changing its count. An empty source
has index `-1`, and content arriving later shows index `0`.

The initial `index` is clamped to the source. Later changes to `index`, and
`goTo`, request a transition; out-of-range or non-integer indices are ignored,
as are requests while dragging or settling. `update:index` and the item
description follow the item actually shown.

## Tuning

The interaction defaults live in `PAGER_DEFAULTS` and the glass look, layout
and backdrop in `GLASS_DEFAULTS`. Both accept deep partial overrides.

- `motion.omega` is the speed of a released or triggered step and
  `motion.damping` its shape: the settle is a damped spring, so there is no
  duration or easing curve. 1 lands without overshoot; lower bounces.
- `motion.smoothing` eases the speed that bends the content and grows the
  bulge, since the measured speed changes in steps with each pointer sample.
- `swipe.flick` and `swipe.rubber` set what counts as a flick and how far an
  edge gives.
- `follow` picks catch or offset and tunes the catch.
- `flow` shapes the elastic front and the bulge.
- `REDUCED_MOTION` is applied on top when the system asks for reduced motion
  and `reducedMotion` is on.

Array-valued settings, including the glass background colour, are replaced as
whole arrays, not merged by element.

## Accessibility

The component is a focusable region with a carousel role description; arrow
and page keys step it while it or anything inside it has focus. The canvas is
an image labelled with the current item, and a polite live region announces
it on change. `label` names the region and `describe` provides the item text.
Mouse drags work like touch. A wheel gesture, one mouse notch or one trackpad
flick, steps once along its dominant axis, and Shift turns a vertical wheel
sideways.

A demo with numbered colour blocks runs at `/dev/pager` in development.
