# Privacy Policy for First Backlog

_Last updated: 1 October 2026_

First Backlog is a Chrome extension that changes how GitLab issue boards look in your browser. It does not collect, send or sell any data.

## What the extension reads

On GitLab issue board pages (`https://gitlab.com/*/-/boards*`), the extension reads the board's list headers (their names and label colors) and what the issue cards already show: their layout, numbers and titles, and whether a card is marked overdue, due soon or confidential. It uses them only to reorder and style the lists and cards on your screen, to keep the issue you opened in view, and, when you click a card's copy button, to put that issue's number and title on your clipboard. It does not read issue descriptions or comments.

On other GitLab pages (`https://gitlab.com/*`), it only adds a stylesheet that gives labels and pills soft corners, when **Redesign** is on. It reads nothing on those pages.

## What the extension stores

- **Your settings** (the switches in the extension's popup) are kept with `chrome.storage.sync`. Chrome syncs them between your own browsers if you have Chrome sync turned on.
- **List IDs of your Backlog lists and a copy of your settings** are kept in the GitLab page's local storage in your browser. That lets the order apply as soon as a board loads.

None of this leaves your browser, apart from Chrome syncing your settings to your own account.

## What the extension does not do

- It sends no network requests and loads no remote code.
- It has no analytics, tracking or ads.
- It shares no data with the developer or anyone else.

## Changes

If this policy changes, the new version will be published at this address, with a new date at the top.

## Contact

Questions about this policy: [your contact email]
