// Label lists to show before the "Open" list, matched case-insensitively.
const FIRST_LABELS = ['Backlog'];

// Built-in lists get a colored top bar and a title pill, like label lists.
const BUILTIN_COLORS = {
  open: '#2a6fdb',
  closed: '#108548',
};

const wanted = new Set(FIRST_LABELS.map((name) => name.toLowerCase()));

const normalize = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase();

// The column's own title, from its header only: a card dragged out of Backlog
// keeps showing the Backlog label for a moment.
function titlesOf(column) {
  return Array.from(column.querySelectorAll('.board-header .board-title-text, .board-header .gl-label-text'))
    .map((el) => normalize(el.textContent))
    .filter(Boolean);
}

// The order comes from a stylesheet keyed on the list id, so it holds while
// GitLab re-renders a column. The ids are saved so the order applies on load,
// before headers render. A list whose title shows another name is dropped.
const STORAGE_KEY = `first-backlog:v2:list-ids:${[...wanted].sort().join(',')}`;

function loadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []);
  } catch {
    return new Set();
  }
}

function saveIds() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...firstListIds]));
  } catch {
    // Storage blocked: the order still works, it just waits for headers on load.
  }
}

try {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('first-backlog:list-ids:'))
    .forEach((key) => localStorage.removeItem(key));
} catch {
  // Storage blocked: nothing stale to clear.
}

let settings = { ...DEFAULT_SETTINGS };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_MIRROR_KEY)));
} catch {
  // No mirror yet: defaults until chrome.storage answers.
}

const firstListIds = loadIds();
// list id -> { color, builtin }; builtin lists need the bar and pill added.
const listColors = new Map();
const style = document.createElement('style');
document.documentElement.appendChild(style);

// Only the column itself: the issue list inside it carries the same data-list-id.
const byId = (id) => `.board-column[data-list-id="${CSS.escape(id)}"]`;

// The list's color: built-in for Open and Closed, else the label color GitLab
// puts on the header's top border (headerStyle in board_list_header.vue).
function colorOf(column, titles) {
  const builtin = titles.find((title) => BUILTIN_COLORS[title]);
  if (builtin) return { color: BUILTIN_COLORS[builtin], builtin: true };
  const color = column.querySelector('.board-header')?.style.borderTopColor;
  return color ? { color, builtin: false } : null;
}

// Mirrors how GitLab styles label lists: a 4px top border on the header in the
// label color, and the title as a label pill.
function builtinCss(column, color) {
  return `
    ${column} .board-header {
      border-top: 4px solid ${color};
      border-top-left-radius: 0.25rem;
      border-top-right-radius: 0.25rem;
    }
    ${column} .board-header .board-title { margin-top: -0.25rem; }
    ${column} .board-header .board-title-main-text {
      display: inline-block;
      max-width: 100%;
      vertical-align: top;
      box-sizing: border-box;
      height: 20px;
      padding: 2px 6px;
      border-radius: 999px;
      background: ${color};
      color: #fff;
      font-size: 12px;
      font-weight: 400;
      line-height: 16px;
    }`;
}

// Near-black label colors (like Backlog) vanish on a dark board, so the glow
// and card states use a lightened version of them.
function isVeryDark(color) {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  const rgb = hex
    ? [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16))
    : (color.match(/\d+/g) || []).slice(0, 3).map(Number);
  if (rgb.length < 3) return false;
  const [r, g, b] = rgb.map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.12;
}

const accentOf = (color) => (isVeryDark(color) ? `color-mix(in srgb, ${color}, white 55%)` : color);

// A soft glow in the list's color that fades out below the header.
function glowCss(column, color) {
  return `\n${column} > .board > div { background-image: linear-gradient(to bottom,
    color-mix(in srgb, ${accentOf(color)} 14%, transparent), transparent 220px); }`;
}

// Issue cards in Material 3 style. Three lines: the title, led by the muted
// issue number ("#33 | title"); a chip row with the milestone (and iteration)
// as outlined chips and the labels; then the copy chip, status, due date and
// estimate on the left and the assignees on the right. Cards with no milestone or
// labels take two. GitLab lets its
// footer wrap and shrinks avatars and text when the issue panel narrows the
// board (container queries in boards.scss), so cards changed shape as issues
// opened and closed. Here nothing wraps and every size is fixed. Markup:
// board_card.vue and board_card_inner.vue.
//
// Spacing is an 8px grid. Type follows M3 sizes: title-small (14/20, set a
// weight heavier so it leads) for the title, body-small and label-medium (12/16) for the rest. Icons match the
// text beside them: GitLab draws them at 16px next to 12px text.
//
// The footer's nested containers are flattened (display: contents), so all
// its items join the card's own flex row and can be ordered into lines. The
// card's ::after breaks the line after the chip row, its ::before is the spring
// between the details and the cluster.
const TAGS = ':is(.issue-milestone-details, [data-testid="issue-iteration"])';
const CARD_CSS = `
  .board-card {
    --fb-gap: 8px;
    --fb-chip-gap: 6px;
    --fb-chip-radius: 6px;
    --fb-chip: 24px;
    --fb-avatar: 24px;
    --fb-icon: 12px;
    --fb-outline: color-mix(in srgb, currentColor 16%, transparent);
    /* No edge: the card stands on its own background. The border stays
       transparent rather than gone, so the card keeps its size. */
    border-color: transparent;
    border-radius: 12px;
    box-shadow: none;
  }
  .board-card .board-card-button { border-radius: 12px; }
  .board-list .board-card:not(:last-child) { margin-bottom: 8px; }
  /* The assignees sit in the bottom right corner (line 3) and the other lines
     keep clear of them: --fb-people is their width plus a gap, from how many
     avatars there are (24px, each further one overlapping by 8px). Lines are
     8px apart; wrapped chips 6px, like the gap beside them. That comes from
     margins: every item but the title has the chip gap above it, the title
     and the chip row the rest below. The line break adds nothing. */
  .board-card > div > div:has(> .board-card-footer) {
    --fb-people: calc((var(--fb-k1, 0) * 2 + var(--fb-k2, 0) + var(--fb-k3, 0) + var(--fb-k4, 0) + var(--fb-kc, 0)) * 16px);
    position: relative;
    flex-flow: row wrap;
    align-items: center;
    gap: 0 var(--fb-chip-gap);
    padding: 12px calc(16px + var(--fb-people)) 12px 16px;
  }
  .board-card .board-card-labels,
  .board-card :is(.board-info-items, .board-card-footer > :last-child) > * {
    margin-top: var(--fb-chip-gap);
  }
  .board-card > div > div:has(> .board-card-footer):has(.board-card-assignee .user-avatar-link) { --fb-k1: 1; }
  .board-card > div > div:has(> .board-card-footer):has(.board-card-assignee .user-avatar-link:nth-of-type(2)) { --fb-k2: 1; }
  .board-card > div > div:has(> .board-card-footer):has(.board-card-assignee .user-avatar-link:nth-of-type(3)) { --fb-k3: 1; }
  .board-card > div > div:has(> .board-card-footer):has(.board-card-assignee .user-avatar-link:nth-of-type(4)) { --fb-k4: 1; }
  .board-card > div > div:has(> .board-card-footer):has(.board-card-assignee .avatar-counter) { --fb-kc: 1; }
  .board-card :is(.board-card-footer, .board-card-number-container, .board-info-items, .board-card-footer > :last-child) {
    display: contents;
  }

  /* Icons at the height of their text. */
  .board-card :is(.board-info-items, .work-item-status, .fb-copy, .fb-confidential) svg {
    width: var(--fb-icon) !important;
    height: var(--fb-icon) !important;
    flex: none;
  }

  /* Line 1: the title. */
  .board-card > div > div > [dir="auto"] {
    order: 0;
    flex-basis: calc(100% + var(--fb-people));
    margin-right: calc(-1 * var(--fb-people));
    margin-bottom: calc(var(--fb-gap) - var(--fb-chip-gap));
  }
  .board-card .board-card-title {
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    letter-spacing: 0.1px;
  }
  .board-card .move-to-position { top: 8px; right: 8px; }

  /* Line 2, the chip row: milestone and iteration as outlined chips, then
     labels. */
  .board-card .board-info-items > ${TAGS} {
    order: 2;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    height: var(--fb-chip);
    margin-bottom: calc(var(--fb-gap) - var(--fb-chip-gap));
    padding: 0 10px 0 8px;
    border: 1px solid var(--fb-outline);
    border-radius: var(--fb-chip-radius, 6px);
    background: transparent;
    font-size: 12px;
    font-weight: 400;
    line-height: 16px;
    white-space: nowrap;
  }
  .board-card .board-info-items > ${TAGS} .milestone-title { max-width: none; }
  .board-card .board-card-labels {
    order: 3;
    flex: 0 1 auto;
    gap: 6px;
    margin-right: calc(-1 * var(--fb-people));
    margin-bottom: calc(var(--fb-gap) - var(--fb-chip-gap));
  }
  /* Every chip, in both rows, is exactly one height, whatever GitLab's own
     padding and sizing rules say. */
  .board-card :is(
    .board-info-items > *,
    .board-card-labels .gl-label,
    .work-item-status,
    .fb-copy,
    .fb-confidential
  ) {
    box-sizing: border-box !important;
    height: var(--fb-chip) !important;
    min-height: 0 !important;
    max-height: none !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
  /* Labels at the chips' height, beside the milestone chip. */
  .board-card .board-card-labels .gl-label { height: var(--fb-chip); }
  .board-card .board-card-labels :is(.gl-label-link, .gl-label-text, .gl-label-text-scoped) {
    display: flex;
    align-items: center;
    height: 100%;
  }
  .board-card .board-card-labels :is(.gl-label-text, .gl-label-text-scoped) {
    padding: 0 10px;
    font-size: 12px;
    line-height: 16px;
  }
  .board-card .board-card-labels .gl-label-text-scoped { padding-left: 6px; }
  .board-card > div > div:has(> .board-card-footer)::after {
    content: "";
    order: 4;
    flex-basis: 100%;
    height: 0;
  }
  .board-card > div > div:has(> .board-card-footer):not(:has(.board-card-labels, .board-info-items > ${TAGS}))::after {
    display: none;
  }

  /* Line 3, left: copy chip (COPY_CSS), status (below), then due date and
     estimate as chips in the status pill's own look (--fb-chip-*, taken from
     it in syncChipLook). */
  .board-card .board-info-items > :not(${TAGS}) {
    order: 8;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: var(--fb-chip);
    padding: 0 10px 0 8px;
    border: var(--fb-chip-border, 0 solid transparent);
    border-radius: var(--fb-chip-radius, 6px);
    background: var(--fb-chip-bg, color-mix(in srgb, currentColor 10%, transparent));
    box-shadow: var(--fb-chip-shadow, none);
    font-size: 12px;
    font-weight: 400;
    line-height: 16px;
    white-space: nowrap;
  }
  /* The text takes the pill's color; icons keep theirs (an overdue date is red). */
  .board-card .board-info-items > :not(${TAGS}) :is(time, span):not(:has(svg)) {
    color: var(--fb-chip-fg, inherit);
  }
  /* Dark mode: GitLab draws the status pill as an outline there, and the other
     chips copy it. Fill them all instead, as in light mode. The date colors
     below still win. */
  .gl-dark .board-card :is(.work-item-status, .board-info-items > :not(${TAGS})) {
    border-color: transparent;
    background: rgb(255 255 255 / 0.08);
    box-shadow: none;
  }

  /* An overdue date (GitLab's calendar-overdue icon, issue_due_date.vue) turns
     its whole chip red: a tint of GitLab's danger text color. GitLab's danger
     badge is solid pink in dark mode, which hides the icon. */
  :root .board-card .board-info-items > :has(svg[data-testid="calendar-overdue-icon"]) {
    --fb-danger: var(--gl-text-color-danger, #dd2b0e);
    border-color: transparent;
    background: color-mix(in srgb, var(--fb-danger) 16%, transparent);
    box-shadow: none;
  }
  .board-card .board-info-items > :has(svg[data-testid="calendar-overdue-icon"]) :is(time, span):not(:has(svg)) {
    color: var(--fb-danger);
  }
  .board-card .board-info-items svg[data-testid="calendar-overdue-icon"] {
    color: var(--fb-danger);
  }

  /* A date due soon (calendar-due icon) does the same in amber: a tint of
     GitLab's warning text color. GitLab's warning badge is solid amber in dark
     mode, which hides the icon. */
  :root .board-card .board-info-items > :has(svg[data-testid="calendar-due-icon"]) {
    --fb-warning: var(--gl-text-color-warning, #c17d10);
    border-color: transparent;
    background: color-mix(in srgb, var(--fb-warning) 16%, transparent);
    box-shadow: none;
  }
  .board-card .board-info-items > :has(svg[data-testid="calendar-due-icon"]) :is(time, span):not(:has(svg)) {
    color: var(--fb-warning);
  }
  .board-card .board-info-items svg[data-testid="calendar-due-icon"] {
    color: var(--fb-warning);
  }

  /* Confidential: GitLab's eye-slash before the title (board_card_inner.vue)
     moves to an icon chip after the status (addConfidentialChips), in the
     due-soon amber. */
  .board-card .board-card-title [data-testid="confidential-icon"] { display: none; }
  .board-card .board-card-footer > :last-child > .fb-confidential { order: 7; }
  /* Above the card's link (board-card-button), so it gets the hover for its
     tooltip; a click still opens the issue. */
  .board-card .fb-confidential {
    --fb-warning: var(--gl-text-color-warning, #c17d10);
    position: relative;
    z-index: 1;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 32px;
    border-radius: var(--fb-chip-radius, 6px);
    background: color-mix(in srgb, var(--fb-warning) 16%, transparent);
    color: var(--fb-warning);
    cursor: help;
  }
  .board-card .fb-confidential svg { margin: 0 !important; fill: currentColor !important; }

  /* The number leads the title instead (fb-ref, set in apply). */
  .board-card .board-info-items > .board-card-number { display: none !important; }
  .board-card .board-card-title[data-fb-ref]::before {
    content: attr(data-fb-ref) " | ";
    white-space: pre;
    color: var(--gl-text-color-subtle, #89888d);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .board-card :is(.board-card-info, .board-card-info-text) { font-size: 12px; }
  .board-card .board-card-info :is(.gl-mr-1, .board-card-info-icon) { margin-right: 0; }
  .board-card > div > div:has(> .board-card-footer)::before {
    content: "";
    order: 9;
    flex: 1 1 0;
  }

  /* Line 3, right: the assignees. */
  .board-card .board-card-footer > :last-child > * { order: 10; flex-shrink: 0; }
  /* The status follows the copy chip on line 3, before the details. */
  .board-card .board-card-footer > :last-child > :has(> .work-item-status:not(.fb-copy)) {
    order: 6;
  }
  .board-card .board-card-footer > :last-child > :empty { display: none; }
  /* As specific as the rule above, so the assignees end the line. */
  .board-card .board-card-footer > :last-child > .board-card-assignee {
    order: 11;
    position: absolute;
    right: 16px;
    bottom: 12px;
    margin: 0 !important;
  }
  /* No assignees: GitLab still renders the box, not quite empty, which would
     keep a gap after the copy chip. */
  .board-card .board-card-footer > :last-child > .board-card-assignee:not(:has(.user-avatar-link, .avatar-counter)) {
    display: none;
  }
  .board-card .work-item-status {
    height: var(--fb-chip);
    padding: 0 10px 0 8px;
    border-radius: var(--fb-chip-radius, 6px);
    font-size: 12px;
    font-weight: 400;
    line-height: 16px;
  }
  .board-card .work-item-status > :not(svg) { margin-left: 6px; }
  /* Chip text stays regular, whatever GitLab sets inside. */
  .board-card :is(.work-item-status, .board-info-items > *) * { font-weight: inherit; }
  .board-card .board-card-assignee .gl-avatar {
    width: var(--fb-avatar) !important;
    height: var(--fb-avatar) !important;
    font-size: 10px !important;
    line-height: var(--fb-avatar) !important;
  }
  .board-card .board-card-assignee .user-avatar-link:not(:last-of-type) {
    margin-right: -8px !important;
  }
  /* Stacked avatars: each one is cut where the next overlaps it, which reads
     as a gap on any card background. */
  .board-card .board-card-assignee :is(
    .user-avatar-link:not(:last-of-type),
    .user-avatar-link:last-of-type:has(~ .avatar-counter)
  ) .gl-avatar {
    -webkit-mask-image: radial-gradient(circle 14px at 28px 50%, transparent 13.5px, #000 14px);
    mask-image: radial-gradient(circle 14px at 28px 50%, transparent 13.5px, #000 14px);
  }
  .board-card .board-card-assignee .avatar-counter {
    min-width: var(--fb-avatar);
    height: var(--fb-avatar);
    margin-left: -8px;
    border-radius: 999px;
    font-size: 10px;
    line-height: var(--fb-avatar);
  }

  /* The move menu shows on hover at every board width, over the title's margin. */
  .board-card:not(:hover, :focus-visible, :focus-within, :active) .move-to-position {
    visibility: hidden;
  }

  /* GitLab hands focus back to the card when the issue drawer closes. After a
     click that shows no ring and none of GitLab's focus background
     (focus-visible:gl-bg-subtle, board_card.vue); keyboard navigation does
     (NAV_KEYS). */
  :root[data-fb-pointer] .board-column .board-card .board-card-button:focus-visible {
    outline: none;
    background-color: transparent !important;
    box-shadow: none !important;
  }

  /* The open issue, until its list color is known (listCardCss): a ring drawn
     inside the card, so nothing moves. */
  .board-card.is-active {
    box-shadow: inset 0 0 0 1px var(--gl-color-blue-500, #1f75cb);
  }`;

// The copy chip: icon-only, first on the bottom line, before the status. Its
// look comes from GitLab's status pill classes (see addCopyChips); the tooltip
// shows what it copies. It keeps one size through its states, so nothing
// shifts.
const COPY_CSS = `
  .board-card .board-card-footer > :last-child > .fb-copy { order: 5; }
  .board-card .fb-copy {
    position: relative;
    z-index: 1;
    flex: none;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    transition: filter 120ms ease;
  }
  .board-card .fb-copy.work-item-status,
  .board-card .fb-copy-own {
    display: inline-flex;
    align-items: center;
    width: 32px;
    height: var(--fb-chip, 24px);
    padding: 0;
    border-radius: var(--fb-chip-radius, 6px);
  }
  .board-card .fb-copy-own { background: color-mix(in srgb, currentColor 12%, transparent); }
  .board-card .fb-copy .fb-copy-text {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .board-card .fb-copy svg { flex: none; color: var(--gl-text-color-subtle, #a4a3a8); }
  /* GitLab fills icons inside its status pill; ours are outlines. */
  .board-card .fb-copy svg,
  .board-card .fb-copy svg * { fill: none !important; stroke: currentColor; }
  .board-card .fb-copy:hover { filter: brightness(1.2); }
  .board-card .fb-copy:hover svg { color: currentColor; }
  .board-card .fb-copy:focus-visible {
    outline: 2px solid var(--gl-focus-ring-outer-color, #428fdc);
    outline-offset: 1px;
  }
  .board-card .fb-copy[data-state="copied"] svg { color: var(--gl-color-green-500, #2da160); }
  .board-card .fb-copy[data-state="none"] svg { color: var(--gl-color-red-500, #dd2b0e); opacity: 0.8; }
  @media (prefers-reduced-motion: reduce) {
    .board-card .fb-copy { transition: none; }
  }`;

// Card states in the list's own color: the open issue, over GitLab's fixed
// blue (!gl-bg-blue-50 in board_card.vue), the keyboard focus ring, and the
// spot a dragged card will land in (the sortable ghost, board_list.vue). The
// ghost moves between lists as it is dragged, so it takes the target's color.
function listCardCss(column, color) {
  const accent = accentOf(color);
  return `
    ${column} .board-card.is-active,
    ${column} .board-card.is-active:hover {
      background-color: color-mix(in srgb, ${accent} 16%, var(--gl-background-color-section, #28272d)) !important;
      box-shadow: inset 0 0 0 1px ${accent};
    }
    ${column} .board-card .board-card-button:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px ${accent} !important;
    }
    ${column} .board-card.board-card-drag-active {
      background-color: color-mix(in srgb, ${accent} 10%, transparent) !important;
      border-color: transparent;
      box-shadow: none;
      outline: 1px dashed ${accent};
      outline-offset: -1px;
    }
    ${column} .board-card.board-card-drag-active > * { opacity: 0.35; }`;
}

function renderStyle() {
  let css = '';
  if (settings.enabled) {
    if (firstListIds.size) {
      const first = Array.from(firstListIds, byId).join(', ');
      css += `*:has(> :is(${first})) { display: flex !important; }\n:is(${first}) { order: -1; }`;
    }
    // Room for keeping the open issue in view (reveal).
    css += `\n.boards-list::after { content: ""; flex: none; width: var(--fb-reveal, 0); }`;
    if (settings.titleCopy) css += COPY_CSS;
  }
  if (settings.enabled && settings.redesign) {
    css += CARD_CSS;
    listColors.forEach(({ color, builtin }, id) => {
      if (builtin) css += builtinCss(byId(id), color);
      css += glowCss(byId(id), color) + listCardCss(byId(id), color);
    });
  }
  style.textContent = css;
}

function apply() {
  let changed = false;

  document.querySelectorAll('.board-column[data-list-id]').forEach((column) => {
    const id = column.getAttribute('data-list-id');
    const titles = titlesOf(column);
    if (titles.length === 0) return;

    const found = colorOf(column, titles);
    const known = listColors.get(id);
    if (found && (!known || known.color !== found.color)) {
      listColors.set(id, found);
      changed = true;
    }

    const match = titles.some((title) => wanted.has(title));
    if (match && !firstListIds.has(id)) {
      firstListIds.add(id);
      changed = true;
    } else if (!match && firstListIds.delete(id)) {
      changed = true;
    }
  });

  if (changed) {
    renderStyle();
    saveIds();
  }
  watchActiveCard();
  syncChipLook();
  addCopyChips();
  addConfidentialChips();
  addTitleRefs();
}

// The issue number as GitLab writes it: "#33" for issues, "&33" for epics,
// from the card's reference path.
function refOf(card) {
  const path = card.getAttribute('data-item-path') || '';
  const at = path.search(/[#&]\d+$/);
  return at >= 0 ? path.slice(at) : `#${card.getAttribute('data-item-iid')}`;
}

// The number for the title's prefix (CARD_CSS).
function addTitleRefs() {
  document.querySelectorAll('.board-card[data-item-iid]').forEach((card) => {
    const title = card.querySelector('.board-card-title');
    const ref = refOf(card);
    if (title && title.getAttribute('data-fb-ref') !== ref) title.setAttribute('data-fb-ref', ref);
  });
}

// Keep the open issue in view. The issue panel opens over the right of the
// board, so a card in one of the last columns ends up under it. Once the panel
// has settled, the board scrolls sideways until the card is clear of whatever
// covers it. The panel's markup isn't relied on: the covered part is found by
// hit-testing along the card. A spacer after the last column gives the board
// room to scroll when the card is already in the last one.
let activeId = null;
let settleTimer = 0;

function watchActiveCard() {
  const card = document.querySelector('.board-card.is-active');
  const id = card?.getAttribute('data-item-id') ?? null;
  if (id === activeId) return;
  activeId = id;
  clearTimeout(settleTimer);
  if (!id) {
    document.querySelectorAll('.boards-list').forEach((list) => list.style.removeProperty('--fb-reveal'));
    return;
  }
  if (!settings.enabled) return;
  // Wait until the card stops moving: the panel slides in and the board resizes.
  let last = '';
  let tries = 0;
  const settle = () => {
    const current = document.querySelector('.board-card.is-active');
    if (!current || current.getAttribute('data-item-id') !== id) return;
    const r = current.getBoundingClientRect();
    const key = `${r.left},${r.width},${innerWidth}`;
    if (key === last || ++tries > 12) reveal(current);
    else {
      last = key;
      settleTimer = setTimeout(settle, 100);
    }
  };
  settleTimer = setTimeout(settle, 100);
}

// The x where whatever covers the card's right edge begins, or null if that
// edge shows. The cover is the outermost element at that spot that doesn't
// also hold the card, such as the issue panel.
function coveredFrom(card, rect) {
  const y = Math.min(Math.max(rect.top + 20, 0), innerHeight - 1);
  let cover = document.elementFromPoint(rect.right - 2, y);
  if (!cover || card.contains(cover)) return null;
  while (cover.parentElement && !cover.parentElement.contains(card)) cover = cover.parentElement;
  return cover.getBoundingClientRect().left;
}

function reveal(card) {
  const list = card.closest('.boards-list');
  if (!list) return;
  const rect = card.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > innerHeight) return;
  const board = list.getBoundingClientRect();
  // Only something that starts inside the board is a panel over it: a
  // full-width backdrop or layout wrapper starts at its left, and taking that
  // for the panel scrolled the whole board away.
  const cover = coveredFrom(card, rect);
  const edge = Math.min(cover > board.left ? cover : Infinity, board.right);
  // However far the panel reaches, the card stops at the board's left edge.
  const shift = Math.min(rect.right + 16 - edge, rect.left - board.left - 16);
  if (shift <= 0) return;
  const room = list.scrollWidth - list.clientWidth - list.scrollLeft;
  if (shift > room) list.style.setProperty('--fb-reveal', `${Math.ceil(shift - room)}px`);
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  list.scrollBy({ left: shift, behavior: smooth ? 'smooth' : 'auto' });
}

// The details chips (CARD_CSS) wear the status pill's look. It comes from
// GitLab's utility classes and theme, so it's read off a real status pill.
let chipLook = '';
function syncChipLook() {
  const status = document.querySelector('.board-card .work-item-status:not(.fb-copy)');
  if (!status) return;
  const cs = getComputedStyle(status);
  const look = {
    '--fb-chip-bg': cs.backgroundColor,
    '--fb-chip-fg': cs.color,
    '--fb-chip-border': `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
    '--fb-chip-shadow': cs.boxShadow,
  };
  const key = JSON.stringify(look);
  if (key === chipLook) return;
  chipLook = key;
  Object.entries(look).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
}

// Copy title: a chip at the start of each card's bottom line that copies the
// title as the card shows it, "#33 | Title". Everything comes from the card
// itself, so nothing is requested.
const COPY_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>';
const DASH_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8h8"/></svg>';

// "#33 | Title", with the reference the title shows (refOf).
function titleText(card) {
  const link = card.querySelector('.board-card-title a');
  const title = (link?.getAttribute('title') || link?.textContent || '').trim();
  return title ? `${refOf(card)} | ${title}` : null;
}

// The chip takes the classes of GitLab's own status pill, so it looks the same
// in every theme and follows GitLab if that pill changes. Cards without a
// status (the Closed list) borrow them from another card; with no status pill
// on the board at all, it falls back to a look of its own.
function addCopyChips() {
  if (!settings.enabled || !settings.titleCopy) return;
  const anyStatus = document.querySelector('.board-card .work-item-status:not(.fb-copy)');
  document.querySelectorAll('.board-card[data-item-iid]').forEach((card) => {
    const row = card.querySelector('.board-card-footer > :last-child');
    if (!row) return;
    const template = card.querySelector('.work-item-status:not(.fb-copy)') || anyStatus;
    const classes = `${template ? template.className : 'fb-copy-own'} fb-copy js-no-trigger`;
    let chip = row.querySelector(':scope > .fb-copy');
    if (!chip) {
      chip = document.createElement('span');
      chip.setAttribute('role', 'button');
      chip.tabIndex = 0;
      setCopyState(chip, 'idle');
      row.appendChild(chip);
    }
    if (chip.className !== classes) chip.className = classes;
  });
}

// Confidential chip (CARD_CSS): a copy of the card's own eye-slash icon in a
// chip on the bottom line. It goes when the issue stops being confidential or
// the redesign is off.
function addConfidentialChips() {
  const on = settings.enabled && settings.redesign;
  document.querySelectorAll('.board-card[data-item-iid]').forEach((card) => {
    const row = card.querySelector('.board-card-footer > :last-child');
    if (!row) return;
    const icon = on && card.querySelector('.board-card-title [data-testid="confidential-icon"]');
    let chip = row.querySelector(':scope > .fb-confidential');
    if (!icon) {
      chip?.remove();
      return;
    }
    if (chip) return;
    chip = document.createElement('span');
    chip.className = 'fb-confidential';
    chip.setAttribute('role', 'img');
    chip.setAttribute('aria-label', 'Confidential');
    const svg = icon.cloneNode(true);
    svg.removeAttribute('data-testid');
    svg.setAttribute('aria-hidden', 'true');
    chip.appendChild(svg);
    row.appendChild(chip);
  });
}

const COPY_STATES = {
  idle: { icon: COPY_ICON, text: 'Copy', label: 'Copy title' },
  copied: { icon: CHECK_ICON, text: 'Copied', label: 'Copied' },
  failed: { icon: DASH_ICON, text: 'Not copied', label: 'The browser blocked copying' },
};

// Only a change of state redraws the chip. The tooltip is updated on hover,
// and redrawing then would swap out the icon under the pointer: a click whose
// press landed on a removed icon never fires.
function setCopyState(chip, state, text) {
  const { icon, text: word, label } = COPY_STATES[state];
  if (chip.dataset.state !== state) {
    chip.dataset.state = state;
    chip.innerHTML = `${icon}<span class="fb-copy-text">${word}</span>`;
  }
  const title = text ? `${label}: ${text}` : label;
  if (chip.title !== title) {
    chip.title = title;
    chip.setAttribute('aria-label', title);
  }
}

// The confidential chip's tooltip, in GitLab's own tooltip markup (BootstrapVue's
// b-tooltip, as on the assignee avatars), so it takes GitLab's look in every
// theme: centered below the chip, with the arrow pointing at it.
let confidentialTip = null;
function showConfidentialTip(chip) {
  if (!confidentialTip) {
    confidentialTip = document.createElement('div');
    confidentialTip.className = 'tooltip b-tooltip bs-tooltip-bottom gl-tooltip show';
    confidentialTip.setAttribute('role', 'tooltip');
    confidentialTip.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;';
    confidentialTip.innerHTML = '<div class="arrow"></div><div class="tooltip-inner"><span class="gl-font-bold">Confidential</span><br>Visible to project members only</div>';
  }
  document.body.appendChild(confidentialTip);
  const r = chip.getBoundingClientRect();
  const width = confidentialTip.offsetWidth;
  const center = r.left + r.width / 2;
  const left = Math.min(Math.max(center - width / 2, 8), document.documentElement.clientWidth - width - 8);
  confidentialTip.style.transform = `translate(${Math.round(left + scrollX)}px, ${Math.round(r.bottom + scrollY)}px)`;
  const arrow = confidentialTip.querySelector('.arrow');
  arrow.style.left = `${Math.round(center - left - arrow.offsetWidth / 2)}px`;
}
const hideConfidentialTip = () => confidentialTip?.remove();
document.addEventListener('pointerover', (event) => {
  const chip = event.target.closest?.('.fb-confidential');
  if (chip) showConfidentialTip(chip);
  else hideConfidentialTip();
});
['pointerdown', 'scroll', 'dragstart'].forEach((type) => addEventListener(type, hideConfidentialTip, true));

// The tooltip shows exactly what will be copied.
document.addEventListener('pointerover', (event) => {
  const chip = event.target.closest?.('.fb-copy');
  if (!chip || chip.dataset.state !== 'idle') return;
  const text = titleText(chip.closest('.board-card'));
  if (text) setCopyState(chip, 'idle', text);
});

// Captured, so the card underneath doesn't open or start a drag.
['pointerdown', 'mousedown'].forEach((type) => {
  document.addEventListener(type, (event) => {
    if (event.target.closest?.('.fb-copy')) event.stopPropagation();
  }, true);
});

async function copyTitle(event) {
  const chip = event.target.closest?.('.fb-copy');
  if (!chip) return;
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  event.stopPropagation();
  const text = titleText(chip.closest('.board-card'));
  let state = 'failed';
  if (text) {
    try {
      await navigator.clipboard.writeText(text);
      state = 'copied';
    } catch {
      // Clipboard refused: nothing was copied, so say so.
    }
  }
  setCopyState(chip, state, text);
  clearTimeout(chip.fbTimer);
  chip.fbTimer = setTimeout(() => setCopyState(chip, 'idle', text), 1600);
}
document.addEventListener('click', copyTitle, true);
document.addEventListener('keydown', copyTitle, true);

// Whether the last way around the board was the mouse, for the card focus
// ring. Escape closes the drawer, so it doesn't count as keyboard navigation.
const NAV_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
addEventListener('pointerdown', () => {
  document.documentElement.dataset.fbPointer = '';
}, true);
addEventListener('keydown', (event) => {
  if (NAV_KEYS.has(event.key)) delete document.documentElement.dataset.fbPointer;
}, true);

// Dragging a list: Sortable places it by DOM order (draggable: '.is-draggable',
// board_content.vue), but the first lists only come first through CSS order.
// When one is last in the DOM yet shows first, Sortable takes every spot right
// of it for "past the last list" and the dragged list flips between there and
// the end. For the drag, the first lists stop counting as draggable. The
// dragged list is the one Sortable marks as chosen on press: the drag itself
// often starts on the label link in its header, not on the column.
document.addEventListener('dragstart', () => {
  const dragged = document.querySelector('.board-column.sortable-chosen');
  if (!dragged) return;
  firstListIds.forEach((id) => {
    document.querySelectorAll(byId(id)).forEach((column) => {
      if (column === dragged || !column.classList.contains('is-draggable')) return;
      column.classList.remove('is-draggable');
      column.dataset.fbPinned = '';
    });
  });
}, true);
document.addEventListener('dragend', () => {
  document.querySelectorAll('.board-column[data-fb-pinned]').forEach((column) => {
    column.classList.add('is-draggable');
    delete column.dataset.fbPinned;
  });
}, true);

let scheduled = false;
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    apply();
  });
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
  attributeFilter: ['class'], // is-active on the open issue's card
});

chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => updateSettings(stored));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  updateSettings(Object.fromEntries(Object.entries(changes).map(([key, { newValue }]) => [key, newValue])));
});

function updateSettings(next) {
  settings = { ...settings, ...next };
  try {
    localStorage.setItem(SETTINGS_MIRROR_KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked: settings still apply, just not before load next time.
  }
  renderStyle();
  if (settings.enabled && settings.titleCopy) addCopyChips();
  else document.querySelectorAll('.fb-copy').forEach((pill) => pill.remove());
  addConfidentialChips();
}

renderStyle();
apply();
