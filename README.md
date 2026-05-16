<div align="center">

![ORBITA Header](https://capsule-render.vercel.app/api?type=waving&height=220&color=0:020206,40:00E5FF,100:B464FF&text=ORBITA%20DIGITAL%20MAESTRO&fontColor=ffffff&fontAlignY=40&animation=fadeIn&desc=Conduct%20Your%20Own%20Cinematic%20Universe&descAlignY=62)

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=22&pause=1000&color=00E5FF&center=true&vCenter=true&width=800&lines=Gesture-Controlled+Cinematic+Music+Experience;Tone.js+%2B+p5.js+%2B+MediaPipe+Hands;Mouse+Mode+%7C+Camera+Mode+%7C+CREEP+Mode)](https://github.com/elbotiimrane/ORBITA-DIGITAL-MAESTRO)

![HTML](https://img.shields.io/badge/HTML-5-111111?style=for-the-badge&logo=html5&logoColor=white&labelColor=111111&color=00E5FF)
![CSS](https://img.shields.io/badge/CSS-3-111111?style=for-the-badge&logo=css3&logoColor=white&labelColor=111111&color=B464FF)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-111111?style=for-the-badge&logo=javascript&logoColor=white&labelColor=111111&color=00E5FF)
![Tone.js](https://img.shields.io/badge/Tone.js-Audio%20Engine-111111?style=for-the-badge&logo=musicbrainz&logoColor=white&labelColor=111111&color=B464FF)
![p5.js](https://img.shields.io/badge/p5.js-Visual%20Engine-111111?style=for-the-badge&logo=processingfoundation&logoColor=white&labelColor=111111&color=00E5FF)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand%20Tracking-111111?style=for-the-badge&logo=google&logoColor=white&labelColor=111111&color=B464FF)

</div>

---

## ✨ Overview

**ORBITA DIGITAL MAESTRO** is an immersive browser-based musical instrument where you *conduct* harmony and energy with your hands.

It combines:
- **Real-time synthesis** with Tone.js
- **Cinematic reactive visuals** with p5.js
- **Gesture tracking** with MediaPipe Hands
- **Premium UI/UX styling** with animated overlays and glassmorphism

---

## 🎼 Core Experience

You control two wheels:
- **Left wheel** → Root note selection (12 notes)
- **Right wheel** → Chord type (Major, Minor, Maj7, Min7, Dom7, Sus4, Dim, Aug)

Performance dynamics:
- **Pinch / Mouse hold** to play
- **Distance to wheel center** controls intensity (crescendo/filter/volume bloom)
- **Vertical hand position** controls octave register

---

## 🚀 Modes

### 1) MOUSE MODE
Fast local interaction for desktop prototyping and performance.

### 2) CAMERA MODE
Hand tracking with pinch-based triggering and adaptive smoothing for precise gesture following.

### 3) CREEP MODE
A stylized themed mode featuring:
- lyric teleprompter flow
- chord shortcuts (G, B, C, Cm)
- autoplay loop at performance BPM
- mood-tinted cinematic visual treatment

---

## 🎛️ Voices

Switchable sound personalities:
- **AURA**
- **NOVA**
- **ORBIT**
- **PULSE**
- **ETHER**
- **MAESTRO**

Each voice has custom oscillator, envelope, and filter configuration for distinct tone color.

---

## 🧠 Tech Stack

- **HTML5** – app shell and UI structure  
- **CSS3** – animated design system and cinematic visuals  
- **Vanilla JavaScript** – interaction logic and state management  
- **Tone.js (CDN)** – synth engines, effects, transport/loop timing  
- **p5.js (CDN)** – reactive wheel/pulse rendering  
- **MediaPipe Hands (CDN)** – webcam hand landmark tracking

---

## 🗂️ Project Structure

```text
ORBITA-DIGITAL-MAESTRO/
├── index.html    # App layout, controls, external CDN imports
├── style.css     # Cinematic UI system, overlays, transitions, themed mode styles
├── script.js     # Audio engine, interaction logic, hand tracking, visual orchestration
└── README.md     # Project documentation
```

---

## ⚡ Getting Started

### Option A — Quick Open
1. Clone/download repository.
2. Open `index.html` in your browser.
3. Click **ENTER EXPERIENCE**.
4. Allow camera permissions when prompted (audio is unlocked by the **ENTER EXPERIENCE** click).

### Option B — Local Server (recommended for camera/web APIs)
Use any local static server, for example:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

---

## 🕹️ Controls Cheat Sheet

| Action | Result |
|---|---|
| Drag around left wheel | Change root note |
| Drag around right wheel | Change chord quality |
| Hold mouse button / pinch | Trigger chord playback |
| Move farther/closer to wheel radius | Change intensity and timbre |
| Move hand vertically (camera mode) | Shift octave register |
| Click voice buttons | Swap synth character |
| Activate CREEP mode | Enter themed lyric/chord performance mode |

---

## 🌌 Why It Feels Different

- Real-time audiovisual coupling (sound + motion + glow)
- Performance-first control mapping
- Adaptive gesture smoothing for cleaner tracking
- Expressive voice architecture for rapid sonic identity changes

---

## 📌 Notes

- Best experienced on modern desktop browsers (Chrome/Edge recommended).
- Camera mode requires camera permissions.

---

<div align="center">

### 🎵 ORBITA — Not just played. **Conducted.**

![Footer Wave](https://capsule-render.vercel.app/api?type=waving&height=120&section=footer&color=0:B464FF,100:00E5FF)

</div>
