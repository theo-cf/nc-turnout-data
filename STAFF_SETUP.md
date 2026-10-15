# Staff cure tracker: setup

The staff cure tracker lists the voters whose mail ballot needs a fix, with names and addresses, so staff and partner groups can reach them. It updates with every scheduled run, three times a day.

## How the lock works

- Each run builds the voter list, then locks a copy for each access group with that group's password (AES-256-GCM encryption; the key comes from the password through 600,000 rounds of PBKDF2-SHA256).
- Only the locked files are published, at `https://theo-cf.github.io/nc-turnout-data/vault/`. Without a password they are unreadable.
- Passwords live in one GitHub secret, never in this repository and never in the run log.
- Each group's file holds the statewide totals plus **only the voters in that group's area**, so partners can't see each other's lists.
- The tracker page asks for a password and unlocks the list in the reader's browser. The password never leaves their device.
- Published files keep no history. Each run replaces the last, and changing a password locks out the old one from the next run on.

Things to know:

- Everyone in a group shares one password. To cut off one person, give their group a new password and send it to everyone else in the group.
- There's no record of who opened it.
- Anyone with a group's password can see that group's list, so share passwords one-to-one (Signal, a phone call, in person), not by group email or in a document.

## One-time setup

### 1. Switch GitHub Pages to publish from the workflow

In the `theo-cf/nc-turnout-data` repo:

1. Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Go to **Settings → Secrets and variables → Actions → Variables** and add a repository variable `PAGES_FROM_ACTIONS` set to `true`.
3. Go to **Actions → Update turnout data → Run workflow**.
4. When it finishes, check that https://theo-cf.github.io/nc-turnout-data/data.json still loads and the Turnout Tracker on the site still works.

Do steps 1 and 2 together. With the source switched but the variable missing, the public data would stop updating.

### 2. Create the access groups

Make a list of groups like this. Partner names stay private because this goes in a secret.

```json
[
  {"label": "Carolina Forward staff", "password": "PASTE A LONG PASSPHRASE", "area": "all"},
  {"label": "Orange County volunteers", "password": "PASTE A DIFFERENT ONE", "area": {"county": ["Orange"]}},
  {"label": "Triangle partners", "password": "AND ANOTHER", "area": {"county": ["Durham", "Wake"], "hd": [22, 35]}}
]
```

- **label**: shown to that group after they unlock, e.g. "Orange County volunteers".
- **password**: at least 16 characters, different for each group.
  - Use a password manager's passphrase generator with 4–5 random words, e.g. `cobalt-meadow-ferry-quartz-nine`.
  - Long random passphrases are what make the lock strong. A short or guessable one is not safe, because anyone can download the locked files and try passwords offline.
- **area**: `"all"` for the full statewide list, or any mix of:
  - `"county": ["Orange", "Durham"]`
  - `"cd": [4]` (congressional districts)
  - `"hd": [22]` (NC House)
  - `"sd": [9]` (NC Senate)

  A voter is included if they fall in any of the listed places.

### 3. Save it as a secret and run

1. Go to **Settings → Secrets and variables → Actions → Secrets → New repository secret**.
2. Name it `STAFF_GROUPS` and paste the whole list.
3. Run the workflow again (**Actions → Update turnout data → Run workflow**).
4. Open https://theo-cf.github.io/nc-turnout-data/staff/ and try each password.

If the list has a mistake (bad formatting, a short or repeated password, a county name that doesn't exist), the run still publishes the public tracker. The staff step fails and GitHub emails you; the log says which group number to fix, never its name or password.

## Putting it on carolinaforward.org (optional)

The tracker also works as a widget on the site:

1. Upload `nc-cure-staff.js` as a post's Custom Widget Script. Download the current copy from https://theo-cf.github.io/nc-turnout-data/staff/nc-cure-staff.js.
2. In the post body, add a Code Block containing only `nc-cure-staff`.

The post itself can be public. It shows only the password screen to anyone without a password. You may still prefer to keep it unlisted or unpublished and share the preview link.

## Changing access later

- **Add or remove a group, or change an area**: edit the `STAFF_GROUPS` secret. GitHub doesn't show the old value, so keep the master copy in your password manager. The change takes effect on the next run, or right away if you run the workflow by hand.
- **Lock someone out**: change their group's password, run the workflow, and send the new password to everyone who should still have it.
