<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="client/public/images/favicon-dark.svg"/>
  <img width="120" height="120" alt="Revelo Logo" src="client/public/images/favicon-light.svg"/>
</picture>

# Revelo

**Photography gallery with smooth animations, intelligent search, and automatic image processing**

</div>

I have too many hobbies, but the only one most people would call _artistic_ is photography. I mostly take pictures for myself, but I wanted a place to collect and showcase them, something that felt a bit more special than the usual platforms out there.

**Revelo** (from _photographic development_ in Spanish) is my playground for experimenting with modern web technologies, AI integrations, and infrastructure. It’s very much a work in progress, but you can check it out live at [revelo.app](https://revelo.app)!

> [!WARNING]
> The live instance is hosted on my own _homelab server_. This gives me flexibility to tinker with the stack, and direct access to the hardware, but it also means uptime might be spotty depending on my ISP's mood (not the best at the moment).

## Features

- **Custom Homepage Render Loop**: Infinite, seamless, smooth-scrolling masonry layout
- **AI-Powered Captions**: Automatic image descriptions in English and Spanish
- **Hybrid Search**: Find images by meaning, using embeddings and Postgres Full Text Search
- **Automatic Image Versions**: Generate optimized thumbnails and multiple resolutions automatically
- **EXIF Metadata**: Extract and parse camera settings, lens info, and shooting details
- **S3 Compatible Storage**: Support for local storage or cloud providers (Cloudflare R2, AWS S3, etc.)
- **Dark/Light Theme**: Adaptive theming with smooth transitions
- **Kiosk Mode**: Configurable autoscroll without a menu for display
- **Custom Full CI/CD**: Automated testing, building, and deployment pipelines
- **YAML Settings Configuration**: Dynamic Admin Settings UI based on a configuration file

## Future Improvements

- **Enhanced Mobile Experience**: More native-like gestures for touch devices
- **Advanced Search Filters**: Filter by date ranges, camera models, and EXIF parameters
- **Batch Operations**: Edit metadata and move images in bulk
- **Multi-language Support**: Full internationalization beyond captions
- **Simplified Self-Hosting**: Self-hosting instructions and removal of hardcoded configuration details
