<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="client/public/images/favicon-dark.svg"/>
  <img width="120" height="120" alt="Revelo Logo" src="client/public/images/favicon-light.svg"/>
</picture>

# Revelo

**Photography gallery with smooth animations, intelligent search, and automatic image processing**

</div>

I have too many hobbies, but the only one most people would call _artistic_ is photography. I mostly take pictures for myself, but I wanted a place to collect and showcase them somewhere that felt a bit more special than the usual platforms.

**Revelo** (from _photographic development_ in Spanish) is where I mess with frontend animation, AI integrations, and infrastructure stuff, while also giving my photos a home.

It's still very much a work in progress, but you can check it out live at [revelo.app](https://revelo.app).

> [!NOTE]
> The live instance is hosted on my own _homelab server_. That gives me a lot of freedom to tinker with the stack and the hardware, but it also means uptime might be a bit spotty depending on my ISP's mood.

> [!NOTE]
> I use it mostly on desktop, and that's still the best experience.
>
> On mobile, the UI is intentionally capped to 60fps. This is not really a performance or optimization issue. It has to do with how mobile browsers handle `requestAnimationFrame`: most of them run it at 60Hz while you're not touching the screen, then switch to 120Hz while you are. Since the homepage uses a custom render loop, that constant switching feels worse than just keeping things consistent.

---

## Features

- Infinite, seamless, smooth-scrolling gallery with a custom render loop.
- AI-generated captions in English and Spanish.
- Search by meaning using embeddings, plus regular text search.
- Automatic image processing with thumbnails and multiple sizes.
- EXIF parsing for camera settings, lens info, and shooting details.
- Support for local storage or S3-compatible storage.
- Adaptive theming with smooth transitions.
- Kiosk mode with autoscroll for fullscreen display.
- Custom CI/CD setup for testing, building, and deployment.
- Admin settings UI driven by a YAML config file.

---

## Future improvements

- Better touch and mobile interactions.
- More search filters.
- More complete language support.
- Self-hosting instructions.
