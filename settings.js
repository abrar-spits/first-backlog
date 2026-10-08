// Shared by the content script and the popup.
const DEFAULT_SETTINGS = {
  enabled: true, // the whole extension
  redesign: true, // list styling, color glow, the issue card layout and rounded label corners
  titleCopy: true, // chip on each card that copies "#33 | Title"
};

// Mirrored into the page's localStorage so the content script can apply it
// synchronously at document_start, before chrome.storage answers.
const SETTINGS_MIRROR_KEY = 'first-backlog:settings';
