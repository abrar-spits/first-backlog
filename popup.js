const switches = document.querySelectorAll('[data-setting]');
const groups = document.querySelectorAll('.group');

function render(settings) {
  switches.forEach((input) => {
    input.checked = settings[input.dataset.setting];
  });
  groups.forEach((group) => {
    group.classList.toggle('off', !settings.enabled);
    group.querySelectorAll('input').forEach((input) => {
      input.disabled = !settings.enabled;
    });
  });
}

// Switches animate only after the first render, so they open in place
// instead of sliding from off to on.
chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
  render(settings);
  requestAnimationFrame(() => document.body.classList.add('ready'));
});

switches.forEach((input) => {
  input.addEventListener('change', () => {
    chrome.storage.sync.set({ [input.dataset.setting]: input.checked }, () => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, render);
    });
  });
});
