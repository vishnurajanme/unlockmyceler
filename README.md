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

## How It Works

### 1. The Background Script (`background.js`)
- Listens for clicks on the Chrome extension icon in the toolbar.
- Ensures the active tab is `celerscet.com`.
- Dispatches a `START_APPROVAL_AUTOMATION` event to instantly trigger the playback loop if a profile is already trained and saved.

### 2. The Content Script (`content.js`)
- **State Management:** Injects the draggable HUD and uses a `MutationObserver` to constantly watch the page, locking the UI if the page is loading or the queue is empty.
- **Profile Recorder:** When "Train Profile" is clicked, it intercepts DOM events, generates resilient CSS/text-based selectors for the elements you interact with, and logs them.
- **Playback Engine:** When "Run Loop" is clicked, it maps over your saved profile array, utilizing 50ms polling intervals to click buttons the millisecond they render, sweeping dropdowns, and waiting for modal dismounts.

### 3. Installation

Since this is a custom, unpackaged Chrome extension, it must be loaded in Developer Mode:

1. **Download the Files:** Download or clone this repository so all project files (`manifest.json`, `content.js`, `background.js`, `logo.mp4`, `README.md`) are located in a single folder on your computer.
2. **Open Extensions Page:** Open Google Chrome and type `chrome://extensions/` in the URL bar, then press Enter.
3. **Enable Developer Mode:** Toggle the **Developer mode** switch in the top-right corner of the Extensions page.
4. **Load the Extension:** Click the **Load unpacked** button that appears in the top-left corner.
5. **Select the Folder:** Browse to and select the folder containing your `UnlockMyCeler` files.
6. **Activate:** The extension is now installed! Open `sahrdaya.celerscet.com` and navigate to your approvals dashboard to see the HUD inject automatically.

## Project Structure

```text
UnlockMyCeler/
├── manifest.json    # Chrome extension config (Permissions: scripting, activeTab, storage)
├── background.js    # Extension toolbar-click handler
├── content.js       # RPA engine, DOM observers, and draggable UI
├── logo.mp4         # Looping animated video logo
└── README.md        # Project documentation
