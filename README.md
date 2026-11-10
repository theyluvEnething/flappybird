# Flappybird

A small browser game used in Philipp Gurndin's Git and GitHub classroom demonstration with Edoardo Kimani Bellotto. This repository keeps the actual lesson history so you can inspect each stage and reproduce the workflow yourself.

**Start here:** [run the game](#get-the-game-running), [see the real commits](#what-happened-in-the-classroom), or [recreate the lesson](#recreate-the-workflow-in-your-own-repository).

## Git and GitHub in one minute

**Git** records snapshots of a project locally. A commit identifies a snapshot, its author, message and parent commits. A branch is a movable name pointing to a commit. Switching branches updates your working files to that branch's version.

**GitHub** hosts Git repositories online. It lets people clone the project, exchange commits, review changes and collaborate through pull requests. A local commit does not appear on GitHub until you push it. Downloading changes with `fetch` does not automatically merge them into your current branch.

```text
edit files -> git add -> git commit -> git push
working tree   staging    local Git    GitHub
```

## Get the game running

Use a terminal with Git and a current Node.js LTS release installed. The commands below use macOS Terminal or another shell with the same basic syntax. This project has no npm dependencies and needs no `npm install`.

```sh
git clone https://github.com/theyluvEnething/flappybird.git
cd flappybird
node server.js
```

Open **http://127.0.0.1:8766/** in your browser. Leave the terminal running while you play. Press `Ctrl+C` in that terminal to stop the server.

| Control | Action |
| --- | --- |
| Space, Arrow Up, click or tap | Start, flap and restart after game over |
| P or the pause button | Pause or resume |
| Sound button | Enable or mute sound |
| Recordings selector and Watch replay | Replay a locally saved run |

The Node server serves the game and saves recordings on your own computer. A static file server can show the game, but cannot provide the recording API. The included server listens on `127.0.0.1` for local use.

To run the published replay test:

```sh
node --test replay.test.js
```

### What the files do

```text
flappybird/
  README.md          This guide, rendered as Markdown on GitHub
  index.html         Page, canvas, controls and links to CSS/JavaScript
  styles.css         Layout, colors and presentation
  script.js          Game settings, physics, drawing, controls and replays
  server.js          Local HTTP server and recording endpoints
  replay.test.js     Automated check of recorded game frames
  .gitignore         Files Git should leave untracked
  recordings/        Created locally when runs are saved; ignored by Git
  .git/              Local Git objects, branches, configuration and history
```

The committed `.gitignore` contains `recordings/*` and `.env`. Recordings and local environment values stay on your computer. `.gitignore` affects untracked files; it does not remove a file that was already committed.

`README.md` is ordinary text written in Markdown. GitHub renders its headings, tables, code blocks and links into the page you are reading. The `.git/` directory is Git's database, not a source file to edit manually.

## What happened in the classroom

The hashes, messages and code changes below come from this repository's actual Git history. The terminal commands later in this guide reproduce those actions; they are not a transcript of every editor or GitHub button clicked during the lesson.

| Step | Commit | What changed |
| --- | --- | --- |
| 1 | [`8e3056f`](https://github.com/theyluvEnething/flappybird/commit/8e3056f) | Created the initial README |
| 2 | [`4d49d10`](https://github.com/theyluvEnething/flappybird/commit/4d49d10) | Added `index.html` |
| 3 | [`dfb9a4f`](https://github.com/theyluvEnething/flappybird/commit/dfb9a4f) | Added `styles.css`, message: `Created Styles.css` |
| 4 | [`d0f53ac`](https://github.com/theyluvEnething/flappybird/commit/d0f53ac) | Added `script.js`; the three-file game became playable |
| 5 | [`620d8a4`](https://github.com/theyluvEnething/flappybird/commit/620d8a4) | Added `.gitignore`, the recording server and replay test; updated the game files for recordings |
| 6 | [`75d691b`](https://github.com/theyluvEnething/flappybird/commit/75d691b) | On `fast-bird`, changed `forwardSpeed` from `120` to `240` |
| 7 | [`d4db583`](https://github.com/theyluvEnething/flappybird/commit/d4db583) | On `fast-bird`, changed `forwardSpeed` from `240` to `5000` |

```text
8e3056f -- 4d49d10 -- dfb9a4f -- d0f53ac -- 620d8a4
                                                |\
                                                | 75d691b -- d4db583  fast-bird
                                                |
                                                + later README guide  main
```

The classroom `main` game uses `forwardSpeed: 120`. The `fast-bird` tip uses `5000`, an extreme speed useful for seeing the difference. The earlier `75d691b` snapshot uses `240`. The shared classroom history contains **no merge of `fast-bird` into `main`**.

The local rehearsal also briefly committed the first speed change on `main`, moved `main` back to `620d8a4`, and then committed the change on `fast-bird`. That local correction is recorded in the presenter's reflog, not as a step on the shared branch graph. The reconstruction below creates the branch before editing, so you can reproduce the published result without moving an existing branch backwards.

### Inspect the history and the checkout

Run these in a fresh clone so your own unfinished edits do not interfere with branch switching:

```sh
git status
git remote -v
git branch -a
git log --all --graph --decorate --oneline
git show 4d49d10
git show 75d691b -- script.js
git diff main..origin/fast-bird -- script.js
```

- `status` shows the current branch and changed or staged files.
- `remote -v` shows where this clone fetches from and pushes to.
- `branch -a` includes local branches and remote-tracking branches such as `origin/fast-bird`.
- `log` shows the connected commit history; `show` displays one commit and its changes.
- `diff` compares the two versions of `script.js`.

To try the branch, keep the server running, switch branches and reload the browser:

```sh
git switch --track origin/fast-bird
git switch main
git switch fast-bird
git switch main
```

Use the first command only once in a new clone, to create the local tracking branch. After it exists, use `git switch fast-bird`. Older tutorials use `git checkout fast-bird` for the same branch-switching action.

To inspect the first playable version, or the more manageable speed setting:

```sh
git switch --detach d0f53ac
git switch --detach 75d691b
git switch main
```

Detached HEAD means you are viewing a commit directly rather than working on a named branch. Return to `main` before starting ordinary work, or create your own branch if you want to keep changes. At `d0f53ac`, `server.js` does not exist yet; open `index.html` to try that earlier game. Switching versions does not remove ignored local recordings.

## Recreate the workflow in your own repository

This section creates a separate practice repository. It copies each historical file snapshot from a reference clone, so you can focus on Git instead of retyping the game. Your new commits will have different hashes because their metadata and history differ.

If you already cloned the project above, run these from its parent directory. Choose unused folder names for the two new folders.

### 1. Create a reference clone and an empty repository

```sh
git clone https://github.com/theyluvEnething/flappybird.git flappybird-reference
mkdir flappybird-practice
cd flappybird-practice
git init -b main
```

If Git has never been configured on your machine, set your own name and email before the first commit:

```sh
git config user.name "Your Name"
git config user.email "your-email@example.com"
```

These two commands configure only this practice repository.

### 2. Commit the README, HTML, CSS and JavaScript separately

```sh
git -C ../flappybird-reference show 8e3056f:README.md > README.md
git add README.md
git commit -m "Created README.md"

git -C ../flappybird-reference show 4d49d10:index.html > index.html
git status
git add index.html
git diff --cached
git commit -m "Create index.html"

git -C ../flappybird-reference show dfb9a4f:styles.css > styles.css
git add styles.css
git commit -m "Created Styles.css"

git -C ../flappybird-reference show d0f53ac:script.js > script.js
node --check script.js
git add script.js
git commit -m "Created script.js"
```

Each `git ... show COMMIT:file > file` command writes that historical file into the empty practice project. `add` selects its current contents for the next commit. `diff --cached` lets you review the staged snapshot. `commit` saves it locally with a message.

The HTML-only and HTML-plus-CSS stages are intentionally incomplete. After the JavaScript commit, open `index.html` in your browser to try the three-file version.

### 3. Create your own GitHub remote and push

If you use GitHub CLI, sign in and create a repository under your own account:

```sh
gh auth login
gh repo create flappybird-practice --public --source=. --remote=origin --push
git remote -v
```

The `--public` option makes this practice project visible to everyone. The command creates `origin` and pushes your existing commits. Use an unused repository name under your own account.

Alternatively, create an empty GitHub repository in your browser, then replace `YOUR-USERNAME` below with your account name:

```sh
git remote add origin https://github.com/YOUR-USERNAME/flappybird-practice.git
git push -u origin main
```

Choose one remote-creation method. `-u` records the upstream, so later pushes on that branch can use `git push`.

### 4. Add recordings and `.gitignore`

Copy the six files changed by the actual recording-feature commit:

```sh
git -C ../flappybird-reference show 620d8a4:.gitignore > .gitignore
git -C ../flappybird-reference show 620d8a4:index.html > index.html
git -C ../flappybird-reference show 620d8a4:styles.css > styles.css
git -C ../flappybird-reference show 620d8a4:script.js > script.js
git -C ../flappybird-reference show 620d8a4:server.js > server.js
git -C ../flappybird-reference show 620d8a4:replay.test.js > replay.test.js
node --check script.js
node --check server.js
node --test replay.test.js
git diff
git add .gitignore index.html styles.css script.js server.js replay.test.js
git diff --cached
git commit -m "Created .gitignore and added recording feature for our games."
git push
node server.js
```

Open http://127.0.0.1:8766/ and play. The server creates `recordings/` when needed. Stop it with `Ctrl+C`, or leave it in a separate terminal while you use Git.

### 5. Make the `fast-bird` branch

```sh
git switch -c fast-bird
```

In `script.js`, change only `forwardSpeed: 120` to `forwardSpeed: 240`, then save the file:

```diff
-    forwardSpeed: 120,
+    forwardSpeed: 240,
```

Review, commit and publish it:

```sh
git diff -- script.js
git add script.js
git diff --cached
git commit -m "Made Bird faster"
git switch main
git switch fast-bird
git push -u origin fast-bird
```

Reload the browser after each switch. `main` still has speed `120`; `fast-bird` now has speed `240`. Git changes the checked-out file when you switch. An already loaded browser page needs a reload to execute the new version.

### 6. Make the second branch commit

While on `fast-bird`, change only `forwardSpeed: 240` to `forwardSpeed: 5000` and save. This deliberately extreme value matches the classroom branch. The original commit-message spelling is preserved below.

```sh
git diff -- script.js
git add script.js
git commit -m "Final commit: Found the perfectr speed for the bird"
git push
git switch main
git log --all --graph --decorate --oneline
```

You now have the same file progression and branch structure as the live lesson. Switching to `main` leaves the experimental commits on `fast-bird`. A push shares a branch; it does not merge it into another branch.

## Commands to keep after the lesson

| Command | Meaning |
| --- | --- |
| `git clone URL` | Download a repository and its history |
| `git status` | Check your branch, working files and staging area |
| `git diff` | Review unstaged changes |
| `git add file` | Stage the current contents of one file |
| `git diff --cached` | Review what the next commit will contain |
| `git commit -m "message"` | Save the staged snapshot locally |
| `git log --all --graph --decorate --oneline` | View commits and branch names |
| `git switch -c name` | Create a branch and switch to it |
| `git switch name` | Switch to an existing branch |
| `git push -u origin name` | Publish a branch and set its upstream |
| `git push` | Send local commits to the configured upstream |
| `git fetch origin` | Download remote commits and update remote-tracking names |
| `git pull --ff-only` | Update your current branch if it can move forward without a merge |
| `git show HASH` | Inspect one commit |
| `git diff main..origin/fast-bird -- script.js` | Compare the two game versions |

**Clone vs fork:** a clone is a local copy. A fork is a separate repository under your GitHub account. For your own changes to this public project, fork it on GitHub and clone your fork. You can push to your fork without write access to Philipp's repository, then open a pull request to propose your changes.

**Merge vs push:** merging combines branch histories locally. Pushing uploads commits to a remote. No merge or pull request was completed in this repository's classroom history, so neither is presented as a completed lesson step.

**ZIP vs clone:** GitHub's Code > Download ZIP gives you the selected branch's files. Use `git clone` when you want the history, commit inspection and branch demonstration described here.

## Official references

- [Git tutorial and reference](https://git-scm.com/docs/gittutorial)
- [Git branch switching](https://git-scm.com/docs/git-switch)
- [Git history and log](https://git-scm.com/docs/git-log)
- [Git ignore rules](https://git-scm.com/docs/gitignore)
- [Cloning a GitHub repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
- [Forking a GitHub repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
- [GitHub CLI repository creation](https://cli.github.com/manual/gh_repo_create)
