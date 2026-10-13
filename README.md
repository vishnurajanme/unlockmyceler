# UnlockMyCeler

![UnlockMyCeler Screenshot](images/logo.png)

UnlockMyCeler is a Chrome extension designed to automate the repetitive question-approval workflow on `celerscet.com`.

It adds a floating control panel to the page, detects questions in the approval queue, and processes them one at a time by selecting **Approved**, recording the decision, and waiting for the queue to refresh.

> **Important:** The extension automatically selects “Approved” without evaluating the content or correctness of a question. Use it only when you are authorized to approve the questions and automatic approval is appropriate.

## Features

- Floating control panel with queue count, progress, status messages, and logs.
- Automatically detects questions in the approval queue.
- Opens a question and navigates through the **Scrutiny** and **Decision** steps.
- Selects the **Approved** option.
- Clicks **Record decision** and **Done**.
- Waits for the question dialog to close and the queue to refresh before processing the next question.
- Continues until the queue is empty or an error occurs.
- Provides Start/Pause controls.
- Displays an animated video logo when `logo.mp4` is available, with an emoji fallback.

## How It Works

### 1. Background Script (`background.js`)

- Listens for clicks on the Chrome extension icon.
- Checks whether the active tab URL contains `celerscet.com`.
- Injects a function that dispatches a `START_APPROVAL_AUTOMATION` custom event on the page.

**Note:** The supplied `content.js` does not listen for this custom event. Therefore, clicking the extension icon does not directly start the automation through this event. The floating panel's **Start Automation** button starts the automation directly.

### 2. Content Script (`content.js`)

- Creates the floating control panel.
- Detects the number of questions in the approval queue.
- Monitors page changes to update the queue status.
- Locates and opens each question.
- Navigates through Scrutiny and Decision.
- Selects Approved and records the decision.
- Waits for the queue to refresh before continuing.
- Displays progress, logs, and errors.
- Stops when all questions are processed or an error occurs.

## Project Structure

```text
UnlockMyCeler/
├── manifest.json    # Chrome extension configuration (required)
├── background.js    # Extension toolbar-click handler
├── content.js       # Automation logic and floating UI
├── logo.mp4         # Optional animated video logo
└── README.md        # Project documentation
```

The uploaded files include `background.js` and `content.js`. The `manifest.json` and `logo.mp4` files were not provided.

## Installation

The supplied JavaScript files alone are not a complete installable Chrome extension. A suitable `manifest.json` is also required.

1. Place the extension files in a single folder.
2. Create a Manifest V3 `manifest.json` with the necessary permissions, content-script configuration, and extension action.
3. Add `logo.mp4` if you want to use the video logo.
4. Open Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the extension folder.
8. Open `celerscet.com` and navigate to the question-approval queue.

Ensure that the manifest permissions match the extension's actual requirements.

## Usage

1. Sign in to `celerscet.com` using an account authorized to approve questions.
2. Open the page containing the question-approval queue.
3. Open the extension's floating control panel.
4. Check the displayed queue count.
5. Click **Start Automation**.
6. Monitor the status messages, progress indicator, and logs.
7. Pause the automation if anything unexpected happens.

The extension is designed to stop if required elements cannot be found within the configured timeout periods.

## Technical Details

- **Platform:** Google Chrome
- **Technology:** JavaScript and Chrome Extension APIs
- **Manifest version:** Intended for Manifest V3; the manifest was not supplied.
- **Target website:** `celerscet.com`
- **Question detection:** `.apv-qitem__no`
- **Question dialog:** `.apv-qpop`
- **Element timeout:** 10 seconds by default
- **Queue refresh timeout:** 15 seconds
- **Page monitoring:** `MutationObserver`
- **User interface:** Dynamically injected HTML and CSS

## Limitations

- **Website-specific selectors:** The extension relies on specific CSS classes and button labels. Website updates may break the automation.
- **No question validation:** The extension does not evaluate question quality or correctness before selecting Approved.
- **Toolbar event mismatch:** `background.js` dispatches `START_APPROVAL_AUTOMATION`, but `content.js` does not register a listener for it.
- **Missing configuration:** The uploaded files do not include `manifest.json`.
- **Optional asset:** The video logo requires `logo.mp4`.
- **Timeout errors:** Slow loading or changes in the website interface may cause the automation to stop.
- **Approval verification:** The script waits for the question to disappear from the queue but does not independently verify the saved decision on the server.

## License

No license information was included with the supplied files. Add an appropriate license before redistributing the project if you want to define its reuse terms.
