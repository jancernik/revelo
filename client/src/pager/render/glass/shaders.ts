export const glassVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`

/*
 * Composes both items in one pass. Positions are CSS pixels from the top left.
 * "Along" is the swipe axis and "across" the other one, so vertical and
 * horizontal steps share the same maths. An elastic front sweeps across the
 * screen with a thick refracting lip and a bulge under the thumb.
 */
export const glassFragment = (points: number) => /* glsl */ `
  #define FRONT_POINTS ${points}

  uniform vec2 uResolution;
  uniform sampler2D uFromTex;
  uniform sampler2D uToTex;
  uniform vec4 uFromRect;
  uniform vec4 uToRect;
  uniform vec4 uFromClip;
  uniform vec4 uToClip;
  uniform float uClipTravel;
  uniform float uDrift;
  uniform float uBackdrop;
  uniform float uFromReady;
  uniform float uToReady;
  uniform float uProgress;
  uniform float uDirection;
  uniform float uAxis;
  uniform float uBend;
  uniform vec2 uTouch;
  uniform float uGlassBulge;
  uniform float uGlassDispersion;
  uniform float uGlassFrost;
  uniform float uGlassLens;
  uniform float uGlassRefraction;
  uniform float uGlassShine;
  uniform float uGlassThickness;
  uniform float uFront[FRONT_POINTS];
  uniform float uFrontAmount;
  uniform float uFrontShape;
  uniform float uRadius;
  uniform vec3 uBackground;
  varying vec2 vUv;

  const float PI = 3.14159265;

  vec2 swapAxis(vec2 p) {
    return mix(p.yx, p, uAxis);
  }

  // How far the elastic front trails the finger at a point across the screen,
  // read from the simulated points with a Catmull-Rom curve.
  float frontLag(float across) {
    float x = clamp(across, 0.0, 1.0) * float(FRONT_POINTS - 1);
    int i = int(floor(x));
    float t = x - float(i);
    float a = uFront[max(i - 1, 0)];
    float b = uFront[i];
    float c = uFront[min(i + 1, FRONT_POINTS - 1)];
    float d = uFront[min(i + 2, FRONT_POINTS - 1)];
    return b + 0.5 * t * (c - a + t * (2.0 * a - 5.0 * b + 4.0 * c - d + t * (3.0 * (b - c) + d - a)));
  }

  float roundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  }

  // Where a screen point lands on an image once the image is moved along the
  // axis, scaled and bent. xy is the texture coordinate, z the coverage of the
  // clip, and w the signed distance to the clip's edge. The clip moves with the
  // image, or stays put while the image moves inside it when uClipTravel is 0.
  vec4 photoCoord(vec4 rect, vec4 clip, vec2 point, float travel, float scale) {
    vec2 center = rect.xy + rect.zw * 0.5;
    vec2 local = swapAxis(point - center);
    local.x -= travel;
    local /= mix(1.0, scale, uDrift);

    vec2 halfSize = swapAxis(rect.zw) * 0.5;
    float across = clamp(local.y / max(halfSize.y, 1.0), -1.0, 1.0);
    float bend = uBend * (1.0 - across * across);
    local.x -= bend;

    vec2 p = swapAxis(local);
    vec2 uv = p / rect.zw + 0.5;
    // A fixed clip mirrors the image past its edges, so nudged content never shows an edge.
    if (uClipTravel < 0.5) {
      vec2 folded = mod(uv, 2.0);
      uv = mix(folded, 2.0 - folded, step(1.0, folded));
    }

    vec2 clipLocal = swapAxis(point - (clip.xy + clip.zw * 0.5));
    clipLocal.x -= (travel + bend) * uClipTravel;
    clipLocal /= mix(1.0, scale, uClipTravel);
    float edge = roundedBox(swapAxis(clipLocal), clip.zw * 0.5, uRadius);
    return vec4(uv.x, 1.0 - uv.y, 1.0 - smoothstep(-0.75, 0.75, edge), edge);
  }

  // A dim, heavily blurred copy of the image, enlarged to cover the screen,
  // read from a small mip level of the texture.
  vec3 backdrop(sampler2D tex, vec4 rect, vec2 uv, bool soft) {
    float cover = max(uResolution.x / rect.z, uResolution.y / rect.w);
    vec2 q = 0.5 + (uv - 0.5) / cover * 0.85;
    float lod = log2(max(float(textureSize(tex, 0).x), 1.0) / 24.0);
    vec2 texel = 1.0 / 24.0 * vec2(1.0, float(textureSize(tex, 0).x) / max(float(textureSize(tex, 0).y), 1.0));
    if (!soft) return textureLod(tex, q, lod).rgb * 0.45;
    vec3 color = textureLod(tex, q, lod).rgb * 0.4;
    color += textureLod(tex, q + texel * vec2(0.7, 0.7), lod).rgb * 0.15;
    color += textureLod(tex, q + texel * vec2(-0.7, 0.7), lod).rgb * 0.15;
    color += textureLod(tex, q + texel * vec2(0.7, -0.7), lod).rgb * 0.15;
    color += textureLod(tex, q + texel * vec2(-0.7, -0.7), lod).rgb * 0.15;
    return color * 0.45;
  }

  // Composes the sharp image inside its clip over the backdrop. With the
  // backdrop on, the layer covers the whole screen; the image casts a soft
  // shadow onto it. Content moved past its own edge inside a clip shows the
  // backdrop too.
  vec4 compose(sampler2D tex, vec4 rect, vec4 coord, float ready, vec3 sharp, bool soft) {
    if (rect.z <= 0.0 || rect.w <= 0.0) return vec4(0.0);
    float inside = step(0.0, coord.x) * step(coord.x, 1.0) * step(0.0, coord.y) * step(coord.y, 1.0);
    vec3 placeholder = uBackground + 0.04;
    bool exposed = coord.z > 0.0 && inside < 0.5;
    vec3 blurred = uBackdrop > 0.0 || exposed ? backdrop(tex, rect, coord.xy, soft) : placeholder;
    blurred = mix(placeholder, blurred, ready);
    vec3 content = mix(blurred, mix(placeholder, sharp, ready), inside);
    if (uBackdrop <= 0.0) return vec4(content, 1.0) * coord.z;
    float shadow = 1.0 - 0.45 * exp(-max(coord.w, 0.0) / 24.0) * (1.0 - coord.z);
    return vec4(mix(blurred * shadow, content, coord.z), 1.0);
  }

  // Premultiplied image colour with a smooth backdrop, for a layer sampled once per pixel.
  vec4 photo(sampler2D tex, vec4 rect, vec4 clip, float ready, vec2 point, float travel, float scale) {
    vec4 coord = photoCoord(rect, clip, point, travel, scale);
    return compose(tex, rect, coord, ready, texture2D(tex, coord.xy).rgb, true);
  }

  // Version for effects that take many samples themselves; its backdrop takes one sample too.
  vec4 layer(sampler2D tex, vec4 rect, vec4 clip, float ready, vec2 point, float travel, float scale) {
    vec4 coord = photoCoord(rect, clip, point, travel, scale);
    return compose(tex, rect, coord, ready, texture2D(tex, coord.xy).rgb, false);
  }

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  vec3 over(vec3 base, vec4 top) {
    return base * (1.0 - top.a) + top.rgb;
  }

  void main() {
    vec2 point = vec2(vUv.x, 1.0 - vUv.y) * uResolution;
    vec2 screen = swapAxis(uResolution);
    vec2 axisPoint = swapAxis(point);
    float span = screen.x;

    float p = uProgress;
    float d = uDirection;
    float smoothP = p * p * (3.0 - 2.0 * p);
    // How far images drift along the axis; a fixed morph window keeps it small.
    float drift = span * uDrift;
    float swell = sin(PI * p);

    // 0 on the side the outgoing image leaves through, 1 where the next one enters.
    float along = axisPoint.x / span;
    float depth = d > 0.0 ? along : 1.0 - along;
    float across = axisPoint.y / screen.y;

    // The elastic front's trail, in steps, faded out where a step begins and lands.
    float flow = d * frontLag(across) * swell * uFrontAmount;

    vec3 base = uBackground;

    // The front, with a resting bulge under the thumb.
    float touch = swapAxis(uTouch).y / screen.y;
    float front = 1.0 - p - flow - uFrontShape * swell * uGlassBulge * exp(-pow((across - touch) / 0.3, 2.0));
    float offset = (depth - front) * span;
    float reveal = smoothstep(-1.0, 1.0, offset);
    float beyond = step(0.0, offset);
    float lip = clamp(offset / uGlassThickness, 0.0, 1.0);
    float refraction = (1.0 - lip) * (1.0 - lip) * beyond * swell * uGlassRefraction;
    float pull = exp(-pow(offset / (uGlassThickness * 1.3), 2.0)) * (1.0 - beyond) * swell * uGlassRefraction * 0.48;
    vec4 outgoing = photo(uFromTex, uFromRect, uFromClip, uFromReady, point, -d * (p * drift * 0.3 + pull), 1.0 - smoothP * 0.05);

    // A convex lens magnifies the incoming image around the thumb, most near the front.
    float magnify = uGlassLens * 0.2 * swell * exp(-max(offset, 0.0) / 240.0) * beyond;
    vec2 lensed = uTouch + (point - uTouch) * (1.0 - magnify);

    float travel = d * (1.0 - p) * drift * 0.25;
    float scale = 1.05 - smoothP * 0.05;
    float blur = uGlassFrost * 8.0 * (1.0 - lip * 0.6) * beyond * swell;
    vec3 sum = vec3(0.0);
    float coverage = 0.0;
    float taps = 0.0;
    // Frost scatters taps on a per-pixel random spiral, which reads as grain instead of ghosts.
    float spin = hash(point) * 6.2831;
    for (int tap = 0; tap < 6; tap++) {
      if (tap > 0 && uGlassFrost <= 0.0) break;
      float angle = float(tap) * 2.39996 + spin;
      float reach = tap == 0 ? 0.0 : sqrt(float(tap) / 5.0) * blur;
      vec2 jitter = vec2(cos(angle), sin(angle)) * reach;
      vec2 q = lensed + jitter;
      // Each channel bends a little more than the last, so the lip splits light like a prism.
      vec4 red = layer(uToTex, uToRect, uToClip, uToReady, q, travel + d * refraction, scale);
      vec4 green = layer(uToTex, uToRect, uToClip, uToReady, q, travel + d * refraction * (1.0 + uGlassDispersion), scale);
      vec4 blue = layer(uToTex, uToRect, uToClip, uToReady, q, travel + d * refraction * (1.0 + uGlassDispersion * 2.0), scale);
      sum += vec3(red.r, green.g, blue.b);
      coverage += green.a;
      taps += 1.0;
    }
    vec4 incoming = vec4(sum / taps, coverage / taps);

    vec3 before = over(base, outgoing) * (1.0 - swell * 0.3 * exp(-pow((offset + 30.0) / 70.0, 2.0)));
    vec3 after = over(base, incoming);
    after += uGlassFrost * 0.06 * (1.0 - lip) * beyond * swell;
    after += exp(-pow((offset - 5.0) / 7.0, 2.0)) * swell * uGlassShine;
    vec3 color = mix(before, after, reveal);

    gl_FragColor = vec4(color, 1.0);
  }
`
