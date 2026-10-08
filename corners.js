// Rounded corners, part of the redesign, on every GitLab page: every pill
// (labels, status, badges, filter tokens and the board's Open and Closed title
// pills) gets the board chips' 6px corners instead of full rounding. GitLab
// clips a label's parts to its outer shape (gl-overflow-hidden in label.scss),
// so scoped labels follow.
//
// Content scripts share one scope, and board pages also run content.js, so
// everything here stays inside this block.
{
  const CSS = `
    :is(.gl-label, .work-item-status, .gl-badge, .gl-token, .board-header .board-title-main-text) {
      border-radius: 6px !important;
    }`;

  const style = document.createElement('style');
  document.documentElement.appendChild(style);

  let current = { ...DEFAULT_SETTINGS };
  try {
    Object.assign(current, JSON.parse(localStorage.getItem(SETTINGS_MIRROR_KEY)));
  } catch {
    // No mirror yet: defaults until chrome.storage answers.
  }

  const render = () => {
    style.textContent = current.enabled && current.redesign ? CSS : '';
  };

  chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    current = { ...current, ...stored };
    render();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    Object.entries(changes).forEach(([key, { newValue }]) => {
      current[key] = newValue;
    });
    render();
  });

  render();
}
