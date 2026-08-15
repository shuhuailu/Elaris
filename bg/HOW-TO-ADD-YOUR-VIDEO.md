# Putting your own video behind the ELARIS loading screen

There is already a working video in place (`elaris-loading.mp4` / `.webm`),
generated from the painted vault plate. Replace it whenever you like.

---

## Option 1 — Overwrite the files (no code changes)

Put your own video in this `bg/` folder using **exactly these names**:

```
bg/elaris-loading.mp4      <- your video (H.264 mp4)
bg/elaris-loading.webm     <- optional, better compression
bg/elaris-loading-poster.jpg  <- first frame, shown before playback starts
```

That is all. The game picks them up on refresh.

---

## Option 2 — Point at a different filename

In `index.html`, find this block near the top of `<body>`:

```html
<video id="bgVideo" muted loop playsinline preload="auto" poster="bg/elaris-loading-poster.jpg">
  <source src="bg/elaris-loading.webm" type="video/webm">
  <source src="bg/elaris-loading.mp4" type="video/mp4">
</video>
```

Change the `src` paths to your file. Keep `muted loop playsinline` — browsers
refuse to autoplay video that is not muted.

---

## Option 3 — Use a hosted URL

If your video is online (S3, Cloudflare R2, your own server), just point at it:

```html
<source src="https://your-host.com/elaris-loading.mp4" type="video/mp4">
```

Note: it must be served over **https** and allow cross-origin requests.
YouTube and Vimeo page links will **not** work here — you need a direct file URL
ending in `.mp4` or `.webm`.

---

## What makes a good loading video for this UI

| | |
|---|---|
| Length | 8–15s, **seamlessly looping** (first and last frame identical) |
| Resolution | 1280×540 or 1920×810 is plenty — it sits behind a dark veil |
| Bitrate | Keep it under ~1.5 MB. It must load *fast*, it is the loading screen |
| Brightness | **Dark.** The centre must stay near-black or the UI text stops reading |
| Motion | Very slow. Drifting smoke, embers, dust. No fast cuts, no camera whips |
| Audio | None. Strip the audio track entirely (`-an` in ffmpeg) |

### Compressing with ffmpeg

```bash
ffmpeg -i yourvideo.mov -t 12 -vf "scale=1280:-2" \
  -c:v libx264 -pix_fmt yuv420p -crf 28 -movflags +faststart -an \
  elaris-loading.mp4

ffmpeg -i yourvideo.mov -t 12 -vf "scale=1280:-2" \
  -c:v libvpx-vp9 -b:v 700k -crf 38 -an \
  elaris-loading.webm
```

### If your video is too bright

Darken it so the loading UI stays legible:

```bash
ffmpeg -i in.mp4 -vf "eq=brightness=-0.10:saturation=0.85" -an out.mp4
```

---

## Behaviour already wired in

- Plays **only during the loading screen**, then cross-fades into the still plate
- Disabled automatically when "Still the world" (reduce motion) is on
- If autoplay is blocked by the browser, it silently falls back to the still
  painting — the loading screen never breaks
- The poster image shows instantly while the video buffers
