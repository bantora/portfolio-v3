# Portfolio Projects

This is a personal portfolio website built with [Astro](https://astro.build/), showcasing interactive web applications and tools.

## 🚀 Projects

### [Battleship PVP](/battleship)
A real-time, peer-to-peer multiplayer naval combat game.
- **Tech:** React, WebRTC (PeerJS), Tailwind CSS.
- **Features:** Direct browser-to-browser connectivity, no backend required, responsive grid-based gameplay.

### [Beyblade Tournament Tracker](/beyblade-tracker)
A specialized tool for managing Beyblade competitions.
- **Tech:** Astro, Vanilla JavaScript, CSS.
- **Features:** Swiss round tracking, 3G Deck format support, top-cut management.

## 🛠️ Tech Stack

- **Framework:** [Astro 6](https://astro.build/)
- **UI:** React 19 (for interactive components)
- **Styling:** Tailwind CSS & Vanilla CSS
- **Networking:** PeerJS (WebRTC) for P2P functionality
- **Language:** TypeScript

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro check`     | Run type checking and diagnostics                |

## 🚢 Deployment

This project is ready to be deployed to platforms like Vercel, Netlify, or GitHub Pages. Because it uses WebRTC for multiplayer, the Battleship game works out-of-the-box once hosted on a public URL.
