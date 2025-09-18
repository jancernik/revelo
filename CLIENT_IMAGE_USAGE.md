# Multi-Format Image Usage Guide

## Overview

The API now generates multiple image formats (AVIF, WebP, JPG) for `regular` and `thumbnail` sizes to optimize performance and bandwidth usage.

## Format Strategy

- **original**: JPG only (preserves source)
- **tiny**: JPG only (minimal size already)
- **thumbnail**: AVIF, WebP, JPG (multiple formats)
- **regular**: AVIF, WebP, JPG (multiple formats)

## Client Implementation

### 1. Processing API Response

Transform the versions array into a format-grouped structure:

```javascript
function groupVersionsByFormat(versions) {
  return versions.reduce((acc, version) => {
    if (!acc[version.type]) acc[version.type] = {};
    acc[version.type][version.format] = {
      path: version.path,
      width: version.width,
      height: version.height,
      size: version.size
    };
    return acc;
  }, {});
}

// Usage
const grouped = groupVersionsByFormat(image.versions);
// Result: { regular: { avif: {...}, webp: {...}, jpg: {...} }, ... }
```

### 2. HTML Picture Element

Use the HTML `<picture>` element for automatic format selection:

```html
<!-- Regular size image -->
<picture>
  <source
    srcset="/api/images/123/regular.avif"
    type="image/avif"
    width="2000"
    height="1333">
  <source
    srcset="/api/images/123/regular.webp"
    type="image/webp"
    width="2000"
    height="1333">
  <img
    src="/api/images/123/regular.jpg"
    alt="Image description"
    width="2000"
    height="1333"
    loading="lazy">
</picture>

<!-- Thumbnail size image -->
<picture>
  <source
    srcset="/api/images/123/thumbnail.avif"
    type="image/avif"
    width="800"
    height="533">
  <source
    srcset="/api/images/123/thumbnail.webp"
    type="image/webp"
    width="800"
    height="533">
  <img
    src="/api/images/123/thumbnail.jpg"
    alt="Image description"
    width="800"
    height="533"
    loading="lazy">
</picture>
```

### 3. Vue.js Component Example

```vue
<template>
  <picture>
    <source
      v-if="versions.regular?.avif"
      :srcset="versions.regular.avif.path"
      type="image/avif"
      :width="versions.regular.avif.width"
      :height="versions.regular.avif.height">
    <source
      v-if="versions.regular?.webp"
      :srcset="versions.regular.webp.path"
      type="image/webp"
      :width="versions.regular.webp.width"
      :height="versions.regular.webp.height">
    <img
      :src="versions.regular?.jpg?.path || versions.tiny?.jpg?.path"
      :alt="image.caption || 'Image'"
      :width="versions.regular?.jpg?.width || versions.tiny?.jpg?.width"
      :height="versions.regular?.jpg?.height || versions.tiny?.jpg?.height"
      loading="lazy">
  </picture>
</template>

<script>
export default {
  props: {
    image: Object
  },
  computed: {
    versions() {
      return this.groupVersionsByFormat(this.image.versions);
    }
  },
  methods: {
    groupVersionsByFormat(versions) {
      return versions.reduce((acc, version) => {
        if (!acc[version.type]) acc[version.type] = {};
        acc[version.type][version.format] = version;
        return acc;
      }, {});
    }
  }
}
</script>
```

### 4. Responsive Images with Srcset

For responsive layouts, combine multiple sizes:

```html
<picture>
  <!-- AVIF sources -->
  <source
    media="(min-width: 1200px)"
    srcset="/api/images/123/regular.avif"
    type="image/avif">
  <source
    srcset="/api/images/123/thumbnail.avif"
    type="image/avif">

  <!-- WebP sources -->
  <source
    media="(min-width: 1200px)"
    srcset="/api/images/123/regular.webp"
    type="image/webp">
  <source
    srcset="/api/images/123/thumbnail.webp"
    type="image/webp">

  <!-- JPG fallback -->
  <img
    src="/api/images/123/thumbnail.jpg"
    srcset="/api/images/123/thumbnail.jpg 800w, /api/images/123/regular.jpg 2000w"
    sizes="(min-width: 1200px) 2000px, 800px"
    alt="Image description"
    loading="lazy">
</picture>
```

## Browser Support

- **AVIF**: Chrome 85+, Firefox 93+, Safari 16.1+
- **WebP**: Chrome 23+, Firefox 65+, Safari 14+
- **JPG**: Universal fallback

The `<picture>` element automatically selects the best supported format.

## Performance Benefits

- **AVIF**: ~50% smaller than JPG
- **WebP**: ~25-30% smaller than JPG
- Automatic format selection means optimal bandwidth usage
- Graceful degradation to JPG for older browsers