# GitHub Deployment Guide

## 1. Keep secrets out of GitHub

- `.env` is already listed in `.gitignore`.
- Do not commit `.env` to your repository.
- Use `.env.example` as a template for developers.

## 2. What to commit

Commit only:
- source code files: `server.js`, `api/create-task.js`, `public/*`, `package.json`, `README.md`
- configuration files: `.gitignore`, `.env.example`
- no `.env`, no direct private keys, no tokens

## 3. Prepare the repository

```powershell
cd "<your-local-repo-path>/volunteer-portal"
git init            # if not already a git repo
git add .gitignore .env.example package.json server.js api/create-task.js public README.md
git commit -m "Initial secure deploy-ready commit"
```

If you already have a repo and previous commits, just ensure `.env` is not staged:

```powershell
git reset .env
git checkout -- .env
```

## 4. Create the GitHub repo

1. Go to GitHub and create a new repository.
2. Do not initialize with README/license if you already have local files.
3. Copy the remote URL.

```powershell
git remote add origin https://github.com/Women-Devs-SG/volunteer-portal.git
git branch -M main
git push -u origin main
```

## 5. Deploy options

### Option A: GitHub Pages
Not suitable for this project because it has a Node.js backend.

### Option B: Render, Fly.io, Railway, or Heroku
Recommended for Node.js apps.

#### Example: Render
1. Sign in to Render.
2. Create a new Web Service.
3. Connect your GitHub repository.
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add the environment variables in Render settings, matching `.env.example`.

#### Example: Railway
1. Connect GitHub repo.
2. Add service type: `Node.js`.
3. Set env vars in Railway dashboard.

### Option C: GitHub Actions deployment to a cloud provider
- Store secrets in GitHub Actions secrets, not in repo files.
- Use `ACTIONS_SECRET` style values for deployment.

## 6. Local run checklist

```powershell
npm install
cp .env.example .env
# fill .env with your real credentials
npm start
```

## 7. Security checklist

- Never store private keys or tokens in source commits.
- Use `.env.example` only.
- If a secret was accidentally committed, rotate it immediately.
- Use service account permissions scoped to only the required Google APIs.
