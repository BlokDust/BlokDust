---
title: "Privacy"
description: "What BlokDust records about how it is used, and how to turn it off."
route: "privacy"
artwork: blokdust.html
---

*Updated 20 November 2026*

BlokDust records a few anonymous facts about how it is used, so we can see what people make with it and what breaks. It never records who you are, what your patches contain, what you search for, or your files. There are no adverts and no tracking across other sites. You don't need an account; if you make one, it holds as little as it can (below). The only cookie is the one that keeps you signed in.

## On the website

- Counts of things you do: starting a session, starting audio, adding a block (by type), loading a sample (by where it came from: Freesound, your own file, a default), opening, saving or sharing a patch, using MIDI or the computer keyboard, and a rough frame rate.
- With each: the BlokDust version, your country (from the connection), your operating system and browser name (not the full user agent), and the site that linked to BlokDust or embeds it.
- To count visitors without cookies, our server combines your IP address and browser with a random value that is replaced every day and then deleted, and keeps only the result. It can't be linked to you or to another day. Your IP address is never stored.
- Errors in the website are reported to Sentry (Functional Software, Inc.), stored in the EU: the error, the page address without anything after "?", your browser and operating system. No IP address, no cookies, no recordings of the screen. File names and patch links are removed first.

## In the plugins and the app

- Once a day when BlokDust runs, it sends: the BlokDust version, the plugin format (VST3, Audio Unit, the iPad's AUv3 or the app), instrument or effect, the name and version of the program it runs in (your DAW), your operating system and processor type, and a random number made when it was installed, so each installation counts once. The random number is stored only as a one-way hash.

## Turning it off

Open **Settings › About** and press **Anonymous usage stats: on** beside the version number in the bottom corner. On the website this is remembered by your browser and also stops error reports; in the plugins and the app it is remembered for every project on your computer. If your browser sends the Global Privacy Control signal, the website records nothing.

## Where it goes and for how long

Usage counts are stored by Cloudflare (our host) for three months and then deleted. Error reports are kept by Sentry for up to 90 days. Nothing is sold or shared with anyone else.

## Patches and samples

A patch you share is stored so its link works; it holds only what you put in it. Samples stay on your computer or on Freesound: BlokDust never uploads audio. Saving and sharing pass a Cloudflare Turnstile check, which tells people from bots without a puzzle.

## Accounts

An account is optional. It lets you keep your patches on every device, add them to the gallery and like others'. It holds:

- The name you choose (your @handle), shown on patches you add to the gallery.
- How you sign in. With Google or Apple, only the ID they give BlokDust for your account: BlokDust doesn't ask for, and never gets, your name, email address or picture. With a passkey, only its public key (the private part never leaves your device).
- A cookie that keeps you signed in. The server keeps only a one-way hash of it.
- Your patches, what you've added to the gallery, and which patches you've liked.
- The numbers on Settings › Account (play time, blocks added, particles, laser turns), which your browser sends with your saves and when you close the page.

To limit how many accounts can be made from one network in a day, the server keeps a hash of your network address mixed with a value that changes every day, for that day only.

**Deleting your account** (Settings › Account) removes it, how you signed in, your patches, your gallery entries and your likes, at once. Links to your patches stop working.

## Feedback and reports

What you send from the FEEDBACK tab (a suggestion, a bug or a report about a patch) is kept so we can read and answer it: your message, an email address if you give one, the BlokDust version and your system (operating system, browser or DAW, audio settings), and the patch you had open. The system details and the patch are deleted after 90 days, the rest after a year. It isn't linked to your account.

## Questions

Email [support@funputs.com](mailto:support@funputs.com).
