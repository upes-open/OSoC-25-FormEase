# Contributing to FormEase

Welcome to **FormEase** — a lightweight Chrome Extension that makes file uploads smarter and simpler.

This project is part of **OSOC 2025**, designed to help contributors explore browser scripting, DOM manipulation, UI design, and file handling — all within a real-world extension context.

Whether this is your first contribution or your 100th — we’re glad you’re here.

---

## 📂 Project Structure

```bash

| File / Folder                | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| `manifest.json`              | Defines the core extension setup, permissions, and script injection.        |
| `content.js`                 | Injects the FormEase toolbox into webpages with file upload inputs.         |
| `toolbox.html`               | Floating UI containing buttons and sliders for file editing.                |
| `styles.css`                 | Styles the toolbox layout and interaction.                                  |
| `scripts/compress.js`        | Logic to compress large files for size-constrained uploads.                 |
| `scripts/resize.js`          | Allows image resizing to meet dimension requirements.                       |
| `scripts/convert.js`         | Handles format conversion (e.g., JPG ↔ PNG, MP4 ↔ WebM).                    |
| `scripts/ffmpeg.min.js`      | External library used for client-side video/audio conversion.               |
| `scripts/pica.min.js`        | External library for high-quality image resizing.                           |
| `icons/`                     | Stores all extension icons.                                                 |
| `.github/CONTRIBUTING.md`    | This file — how to contribute and get started!                              |
| `.github/CODE_OF_CONDUCT.md` | Guidelines for respectful communication.                                    |

```
---

##  Getting Started

### 1. Fork the Repository

Click the **Fork** button at the top right of the repo to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/OSOC-25-FORMEASE.git
cd OSOC-25-FORMEASE
````

---

## Testing the Extension Locally

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked** and select the `OSOC-25-FORMEASE/` folder
5. Visit a site with a file input (e.g., a job portal or form site) to see how FormEase works

> **Note:** Some features may not function until certain issues are completed (e.g., `manifest.json` setup or file-handling logic)

---

##  Choosing Issues

1. Go to the [Issues tab](https://github.com/YOUR-REPO-HERE/issues)
2. Look for labels like:

   * `good first issue`
   * `UI/Design`
   * `file-handling`
   * `frontend`
3. Read the issue description carefully
4. If you're interested:

   * Comment `/claim` or explain your intent
   * **Wait for assignment before starting work**

> We follow a **first-comment-first-assign** policy to keep things fair

---


## What Makes a Good Contribution Request

**❌ Avoid Generic Requests Like...**

* "Please assign me something."
* "I'll make the UI better."
* "Can I get any issue?"

These messages show **no effort** or understanding of the project, and likely won’t be considered for issue assignment.

---

**✅ Instead, Try This...**

* "I checked out the input handler bug in the form component and noticed a type mismatch on async calls. I’d love to fix this and can submit a PR in 2 days."

* "I noticed the PDF output isn't consistent across different languages. I’ve explored pdf-lib as an alternative and would like to give it a try with proper testing."

* "The mobile view for the upload screen has layout issues. Here's a mockup of my fix — I'd like to implement it this weekend."

These responses show:

* You’ve engaged with the codebase or the issue
* You’re proposing a clear solution
* You’re taking responsibility

---

⚠️ A Few Don'ts

* ❌ Don’t spam multiple issues with “assign me”
* ❌ Don’t use AI to write PRs you don’t understand
* ❌ Don’t ignore project guidelines or commit formats
* ❌ Don’t push untested, unsafe, or broken code

We use automated checks and templates to maintain quality — not for show.

---

## 🌱 How to Contribute

Once assigned:

1. Create a new branch:

```bash
git checkout -b your-username/feature-name
```

2. Make your changes
3. Test the extension locally
4. Commit your changes:

```bash
git add .
git commit -m "feat: add basic structure to toolbox.html"
git push origin your-username/feature-name
```

5. Open a Pull Request to the `main` branch
6. Fill in the PR template and describe your changes clearly

---

## 🔁 PR & Review Guidelines

* Stay within the scope of your issue
* Keep PRs focused and small
* Be open to feedback and requested changes
* Avoid pushing unrelated code

> Once reviewed, your PR will be merged and deployed as part of the extension build

---

## Collaboration & Communication

* Respect the first-come-first-serve rule, and also the code of conduct.
* Be kind and constructive in comments
* Ask questions on Discord or GitHub if you're stuck — help will come
* If you can’t finish an issue, let us know — someone else can take it up


---

## ❤️ Final Words

Every icon you add, every line of JavaScript, and every suggestion helps make FormEase better.

We’re building a tool that’s lightweight, useful, and open — and you're now a part of that mission.

Thanks for being here — happy contributing.

— *Somya Vats, Mentor @ FormEase*

