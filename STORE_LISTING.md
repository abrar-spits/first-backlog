# Chrome Web Store listing

Everything to paste into the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole), in the order the dashboard asks for it.

## Package

Build the upload file with `scripts/package.sh`. It writes `dist/first-backlog-<version>.zip`. Bump `version` in `manifest.json` for every new upload.

## Store listing tab

**Name:** First Backlog

**Summary** (from the manifest, 132 characters at most):
> Puts your Backlog list before Open on GitLab issue boards, and gives Open, Closed and every list a clear color.

**Category:** Workflow & Planning

**Language:** English

**Description:**

> GitLab always shows the Open list first on an issue board, so there's no way to put your Backlog in front of it. First Backlog fixes that, right in your browser.
>
> WHAT IT DOES
> • Moves your Backlog label list before the Open list.
> • Styles the Open and Closed lists like label lists, with a colored top bar and a title pill.
> • Adds a soft color glow below each list header, in the list's own color.
> • Tidier issue cards that keep their size when you open an issue, with the open issue in its list's color.
> • Due dates at a glance: overdue dates turn red, dates due soon amber.
> • Confidential issues get their own amber chip instead of a small icon before the title.
> • Keeps the issue you opened in view, instead of under the issue panel.
> • Optional: copies an issue's number and title ("#33 | Title") from a button on its card.
>
> SETTINGS
> Click the toolbar icon to turn the whole extension on or off, switch the redesign off to keep only the Backlog order, or turn the copy button on or off.
>
> GOOD TO KNOW
> • It only changes what you see. Nothing changes in GitLab, and your teammates see the board as usual.
> • Dragging issues and lists works as usual. The Backlog list itself always stays first.
> • It works on gitlab.com issue boards. Rounded label corners apply on every gitlab.com page.
>
> PRIVACY
> No data is collected or sent anywhere. Your settings stay in your browser.
>
> First Backlog is an independent project. It is not made by, affiliated with or endorsed by GitLab Inc. GitLab is a trademark of GitLab Inc.

**Graphic assets** (all in `store/`, rendered by `scripts/render_store_assets.sh`):

| Field | File | Size |
| --- | --- | --- |
| Store icon | `icons/icon128.png` | 128×128 (96×96 art, 16px padding) |
| Screenshots | `store/screenshot-1.png` to `-4` | 1280×800 |
| Small promo tile | `store/promo-small.png` | 440×280 |
| Marquee promo tile | `store/promo-marquee.png` | 1400×560 |

## Privacy tab

**Single purpose:**
> Improves GitLab issue boards: shows the Backlog list before the Open list, makes lists and issue cards easier to tell apart and read, and adds small board conveniences such as keeping the open issue in view and copying an issue's title.

**Permission justification:**

- **storage:** Saves the user's settings (the switches in the popup) so they persist and sync between the user's browsers.
- **Host permission (`https://gitlab.com/*`, via the content scripts):** On GitLab issue board pages (`https://gitlab.com/*/-/boards*`), a content script reorders and styles the lists and cards. On the other GitLab pages, a second content script only adds a stylesheet that gives labels and pills soft corners, if the user has the redesign on; it reads nothing from those pages. It runs on no sites other than gitlab.com.

**Remote code:** No, I am not using remote code. All JavaScript is in the package.

**Data usage:** Tick none of the data types. The extension collects no user data.

Tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** a public link to `PRIVACY.md`, for example the file's page in a public GitLab repository.

## Distribution tab

- **Visibility:** Public, or Unlisted if only people with the link should find it.
- **Regions:** All regions.
