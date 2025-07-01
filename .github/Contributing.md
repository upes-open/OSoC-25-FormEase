
# 🛠️ Contributing to FormEase

Welcome to **FormEase** — where forms become effortless and learning becomes meaningful.

This guide will walk you through how to contribute to the project, whether you're a first-timer or a seasoned contributor. If you’re excited to contribute but not sure how to start — don’t worry, we’ve got you. 💙

---

## 🌟 Why This Project Exists

FormEase is not just a codebase. It’s a collaborative learning space for:
- Exploring real-world workflows (React, Node, TypeScript)
- Practicing clean, tested code
- Working with a team, like in real companies
- Building features that solve real problems

We want contributors to **build, break, learn, and grow**. Every issue, PR, and code review is a step toward becoming an industry-ready developer.

---

```bash 
| File / Folder                | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| `manifest.json`              | Defines the core extension setup, permissions, and script injection.        |
| `content.js`                 | Injects the FormEase toolbox into webpages with file upload inputs.         |
| `toolbox.html`               | Floating UI containing buttons and sliders for file editing.                |
| `styles.css`                 | Styles the toolbox layout and interaction.                                  |
| `scripts/compress.js`        | Logic to compress large files for size-constrained uploads.                 |
| `scripts/resize.js`          | Allows image resizing to meet dimension requirements (e.g., passport size). |
| `scripts/convert.js`         | Handles format conversion (e.g., JPG ↔ PNG, MP4 ↔ WebM).                    |
| `scripts/ffmpeg.min.js`      | External library used for client-side video/audio conversion.               |
| `scripts/pica.min.js`        | External library for high-quality image resizing.                           |
| `icons/`                     | Store all extension icons like logo.png here.                               |
| `formease.png`               | Logo or branding image used in the README.                                  |
| `.github/Contributing.md`    | This file — learn how to contribute and get started!                        |
| `.github/Code_of_conduct.MD` | Contributor behavior guidelines and communication norms.                    |

```

## Getting Started

### 1. Fork the Repository
Click the **Fork** button on the top-right of the repo page to create your own copy.


### 2. Clone Your Fork
```bash
git clone https://github.com/YOUR-USERNAME/FormEase.git
cd FormEase
```

### 3. Set Up at your environment!
---

## Project Structure

```bash
FormEase/
├── frontend/         # Next.js frontend
├── backend/          # Express + Prisma backend
├── docs/             # Internal docs and guides
├── .github/          # GitHub workflows, PR templates, CODE_OF_CONDUCT
```

---

## Finding Issues

Go to the [Issues tab](https://github.com/YOUR-REPO-HERE/issues) and:
- Look for labels like `good first issue`, `bug`, or `feature`
- Read the issue description fully
- Leave a comment explaining:
  - What you understood
  - How you plan to solve it
  - Your ETA

Wait for a maintainer to assign it to you before starting work 🙌

---

## Branching Strategy

Always branch out from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

Branch naming format:
```
feat/feature-name
fix/bug-name
docs/update-readme
```

---

## Coding Guidelines

- Use **TypeScript** — all files must be typed
- Stick to **ESLint** + **Prettier** rules
- Use **kebab-case** for filenames
- Keep components small and reusable
- Add **comments** where necessary
- Use **clear and descriptive** variable names
- Follow **DRY** (Don't Repeat Yourself) principles

---

## 🔁 Commit Format

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
```bash
feat: add upload preview to form
fix: correct label alignment on mobile
docs: update contributing guide
refactor: clean up file upload handler
```

---

## 📩 Pull Request Guidelines

When you’re ready to contribute:

1. **Make sure your code works**
2. **Test it thoroughly**
3. **Push to your fork**
4. Create a PR to the `main` branch of this repo

**Use the PR template**. Describe:
- What you changed
- Why the change was needed
- How to test it

We'll review it with kindness and detail ❤️

---

## ✅ Pre-Commit Checks

We use Git Hooks with **Husky**:
- TypeScript checks
- Lint + Prettier formatting
- Commit message format

Run this to make sure Husky is working:
```bash
yarn prepare
```

To manually check:
```bash
yarn ts-check
yarn lint
```

---

## Writing Tests

If you’re contributing to backend APIs or frontend components, add tests when possible.

We use:
- `jest` for unit tests
- `supertest` for API routes
- `react-testing-library` for UI

Even small tests are appreciated!

---

## How to Be a Great Contributor

- Be respectful of others’ time and learning curve
- Give credit where due
- Be open to feedback — we all get better together
- Ask for help when stuck (Discord, Issues, Discussions)
- Keep communication clear and constructive

---

## Recognition

We love highlighting passionate contributors!  
Consistent, helpful contributors will be:
- Listed in our README
- Given special roles in our Discord
- Recommended in our network of projects

---

## ❤️ Final Words

Thank you for being here. Every line of code, comment, or question you contribute moves this project forward and helps someone else learn too.

Whether you're submitting your first PR or helping others debug — you're part of FormEase now.

Let’s build, learn, and grow — together.

—

*-Somya Vats, Mentor @ FormEase*
