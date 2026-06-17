<p align="center">
  <img src="./icons/icon.png" alt="Light Off Logo" width="128" />
</p>

<h1 align="center">Light Off</h1>

> Dim the web. Save your eyes. Brightness control for any website.

Light Off is a minimalist Chrome extension that lets you instantly adjust the brightness of any webpage. Whether you're browsing late at night, working in a dark room, or just prefer a dimmer screen — one slider does it all.

<br/>

## ✨ Features

- 🎚️ Single Slider Control — Adjust brightness from 100% down to 10% with a simple range input

- 🔄 Quick Reset — Instantly restore full brightness with one click, no need to drag the slider back

- ⚡ Instant Preview — See changes in real-time as you drag the slider

- 💾 Per-Site Memory — Remembers your brightness setting for each website automatically

- 🎨 Zero Performance Impact — Pure CSS overlay, no DOM manipulation or page reflows

- 🌙 Eye-Friendly — Reduce eye strain during late-night browsing sessions

- 📦 Lightweight — Under 50KB, no dependencies, no tracking, no data collection

<br/>

## 🚀 Installation

1. Clone the repository:
   git clone https://github.com/MahdiFayyaziMoghaddam/light-off.git

2. Open Chrome and navigate to:
   chrome://extensions

3. Enable Developer Mode by toggling the switch in the top-right corner of the page.

4. Click the "Load unpacked" button that appears after enabling Developer Mode.

5. Select the project directory "light-off".

6. Pin the extension by clicking the puzzle icon in the Chrome toolbar, finding "Light Off" in the dropdown, and clicking the pin icon next to it.

<br/>

## 🎮 Usage

- Adjust brightness: Click the extension icon in the toolbar and drag the slider

- Reset to 100%: Click the reset button next to the slider or slide all the way to max

- Per-site settings: Each website remembers its own brightness level automatically

<br/>

## 🧠 How It Works

Light Off injects a semi-transparent black overlay on the current tab. The overlay's opacity is controlled by the slider position:

- 100% brightness → overlay opacity: 0 (fully transparent)

- 75% brightness → overlay opacity: 0.25

- 50% brightness → overlay opacity: 0.5

- 25% brightness → overlay opacity: 0.75

- 10% brightness → overlay opacity: 0.9

The overlay sits above the page content but below any modals or popups, ensuring full functionality of the website while dimming the background.

<br/>

## 🤝 Contributing

Contributions are welcome and appreciated. Here is the process:

1. Fork the repository on GitHub

2. Create a feature branch: git checkout -b feature/amazing-feature

3. Make your changes and commit: git commit -m 'Add amazing feature'

4. Push to your fork: git push origin feature/amazing-feature

5. Open a Pull Request on the main repository

<br/>

## 🐛 Bug Reports

Found a bug? Please open an issue on GitHub with the following information:

- Chrome version (find it at chrome://version)

- Extension version

- Steps to reproduce the issue

- Expected behavior vs what actually happened

- Screenshots if applicable

<br/>

## 📄 License

This project is distributed under the MIT License. See the LICENSE file for complete details.

<br/>

---

_Made with love for late-night browsers and tired eyes. If this extension helps you, consider giving it a star on GitHub._

**Mahdi Fayyazi Moghaddam**
