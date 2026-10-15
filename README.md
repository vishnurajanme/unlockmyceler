# UnlockMyCeler

![UnlockMyCeler Screenshot](logo.png)

UnlockMyCeler is a lightweight Robotic Process Automation (RPA) Chrome extension designed to streamline the repetitive question-approval workflow on `celerscet.com`. 

Moving beyond hardcoded scripts, this extension features a **Record & Replay Training Engine**. Users manually process a single question to "teach" the bot the exact workflow. The extension saves this sequence as a profile and dynamically loops it until the approval queue is entirely clear.

> **Important:** This extension automatically repeats your trained decisions across all items in the queue without independently evaluating the specific content or correctness of each question. Use it only when authorized and when bulk automatic approval is appropriate.

## Features

- **Draggable Control HUD:** A floating user interface featuring queue counts, progress tracking, and a live terminal log. Drag the handle (⣿) to move it anywhere on your screen.
- **Training Mode:** Records your specific click sequences and dropdown decisions to build a custom automation profile on the fly.
- **Persistent Storage:** Saves your trained workflow locally across browser sessions using `chrome.storage.local`.
- **Smart Table Sweeper:** Intelligently ignores intermediate table dropdowns during training, automatically sweeping and filling them all with "Yes" during playback to save time.
- **Dynamic Warning Bypass:** Automatically anticipates conditional popups (e.g., "Record the decision anyway"). It handles them if they appear and seamlessly skips them if they don't.
- **Queue Synchronization:** Physically pauses the automation loop until the server refreshes and the processed question card is removed from the DOM.
- **Animated Branding:** Features a looping video logo (`logo.mp4`) inside the HUD, with an emoji fallback if the file is missing.

## How It Works

### 1. The Background Script (`background.js`)
- Listens for clicks on the Chrome extension icon in the toolbar.
- Ensures the active tab is `celerscet.com`.
- Dispatches a `START_APPROVAL_AUTOMATION` event to instantly trigger the playback loop if a profile is already trained and saved.

### 2. The Content Script (`content.js`)
- **State Management:** Injects the draggable HUD and uses a `MutationObserver` to constantly watch the page, locking the UI if the page is loading or the queue is empty.
- **Profile Recorder:** When "Train Profile" is clicked, it intercepts DOM events, generates resilient CSS/text-based selectors for the elements you interact with, and logs them.
- **Playback Engine:** When "Run Loop" is clicked, it maps over your saved profile array, utilizing 50ms polling intervals to click buttons the millisecond they render, sweeping dropdowns, and waiting for modal dismounts.

## Project Structure

```text
UnlockMyCeler/
├── manifest.json    # Chrome extension config (Permissions: scripting, activeTab, storage)
├── background.js    # Extension toolbar-click handler
├── content.js       # RPA engine, DOM observers, and draggable UI
├── logo.mp4         # Looping animated video logo
└── README.md        # Project documentation
