# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, served equally (confirmed by the owner):

- **Listeners** who want to listen to and discover music on their phone, and keep their favourites
  and playlists across devices.
- **Independent musicians** who want to publish their own songs and be heard, without a label.

Both arrive mainly from a phone. Spanish speakers.

## Product Purpose

Aurevix Music is a music streaming platform (app for Android and iPhone, plus a web app at `/app`)
where people listen, build playlists and follow artists, and where independent artists publish their
own music. The public website exists to explain the product and get people to install or open the
app; it also hosts legal pages, rights claims and shareable song/playlist pages.

Success: a visitor understands in seconds what Aurevix is, installs it (APK on Android, web app on
iPhone) or opens it in the browser, and either starts listening or publishes a song.

## Positioning

**Only independent music.** Everything in the catalogue is published directly by the people who made
it, without labels. That is the one claim a mainstream service cannot make.

Supporting facts that are true of the product (use as proof, not as the headline): each upload is
reviewed for rights before publishing; a play only counts after 30 seconds of real listening;
listening is free.

## Operating Context

- Install paths: Android APK from GitHub Releases (beta, temporary signature); iPhone through the web
  app at `/app` added to the home screen in Safari (no App Store/TestFlight yet).
- Sign in with email or Google (Apple on native iOS builds).
- Artists upload from the app's artist studio; staff review in a separate admin panel.

## Capabilities and Constraints

- Web: Next.js 16 + Tailwind 4 (`apps/web`). App: Expo SDK 58 / React Native, one custom design
  language on Android, iOS and web (`apps/mobile`), not per-OS native styling.
- Real catalogue today: demo content only (5 synthesized CC0 tracks by "Aurevix Demo"), labelled
  "Demo" in the app.
- Uploading songs is not available in the web app (`/app`), only in native builds.

## Brand Commitments

- Name: **Aurevix Music** (sister brand of aurevixweb.es). Contact: aurevixweb@gmail.com.
- Binding visual identity from aurevixweb.es (owner requirement: "mismo estilo, mismos colores"):
  lime `#c8f560` on near-black `#0c0c0e`, cream text `#f3f1ea`, violet `#b98cff` secondary;
  Bricolage Grotesque (display), Instrument Sans (text), JetBrains Mono; the tilted "A" logo
  (`assets/brand-source/aurevix-logo-a.png`).
- Owner request: the app icon carries the word "MUSIC" under the A so it is distinguishable from the
  aurevixweb icon.
- Voice: plain, direct Spanish.

## Evidence on Hand

- Real app screenshots: `apps/web/public/screenshots/*` (sign-in, sign-up, home, search, playing).
- Demo covers and audio (CC0, synthesized): `demo-assets` branch.
- No users, artists, testimonials, press, download counts or ratings exist yet. Never invent them.

## Product Principles

1. Independent artists are the product: show their music and names first, never generic stock.
2. Honest by default: no fake numbers, no fake artists; demo content stays labelled.
3. Phone first: every decision is judged on a phone screen.
4. One clear next step: install / open the app, or publish a song.
