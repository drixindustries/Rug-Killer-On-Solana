# Branch Protection Rules

This document outlines the recommended branch protection rules for the `main` branch of the Rug-Killer-On-Solana repository.

## How to Apply These Rules

1. Go to your repository on GitHub: https://github.com/drixindustries/Rug-Killer-On-Solana
2. Click **Settings** (top menu)
3. Click **Branches** (left sidebar under "Code and automation")
4. Under "Branch protection rules", click **Add rule** or **Add branch protection rule**
5. Enter `main` as the branch name pattern
6. Configure the settings below

---

## Recommended Protection Rules for `main` Branch

### ✅ Required Settings (Highly Recommended)

- **Require a pull request before merging**
  - ✅ Require approvals: **1** (or more for team projects)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (if you have a CODEOWNERS file)

- **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Add required status checks:
    - `build` (if you have CI/CD)
    - `test` (if you have automated tests)
    - `lint` (if you have linting checks)

- **Require conversation resolution before merging**
  - ✅ All conversations on code must be resolved before merging

- **Require signed commits** (Optional but recommended for security)
  - ✅ Commits must be signed with a verified signature

- **Require linear history**
  - ✅ Prevent merge commits, require rebase or squash

- **Do not allow bypassing the above settings**
  - ⚠️ Leave unchecked if you need admin override capability
  - ✅ Check if you want strict enforcement for everyone

### 🔐 Additional Protection (Optional)

- **Lock branch**
  - ⚠️ Only enable if you want to make the branch read-only temporarily

- **Restrict who can push to matching branches**
  - Add specific teams or users who can push directly
  - Good for limiting direct pushes to senior developers only

- **Allow force pushes**
  - ❌ **Do not enable** - Force pushes can destroy history

- **Allow deletions**
  - ❌ **Do not enable** - Prevents accidental branch deletion

---

## Quick Setup (Minimal Protection)

If you want basic protection right now, enable these at minimum:

1. ✅ **Require a pull request before merging** (1 approval)
2. ✅ **Require conversation resolution before merging**
3. ❌ **Do not allow force pushes**
4. ❌ **Do not allow deletions**

---

## For Advanced Projects

If you have CI/CD and automated testing:

1. Set up GitHub Actions workflows (`.github/workflows/`)
2. Enable **Require status checks to pass**
3. Add your workflow checks as required status checks
4. Consider **Require signed commits** for security

---

## Current Repository Status

⚠️ **Main branch is currently unprotected**

Branch protection helps prevent:
- Accidental force pushes that destroy history
- Direct commits without code review
- Merging broken code
- Unauthorized changes to critical branches

---

## Next Steps

1. Visit: https://github.com/drixindustries/Rug-Killer-On-Solana/settings/branches
2. Click "Add rule" or "Add branch protection rule"
3. Enter branch name: `main`
4. Enable the recommended settings above
5. Click "Create" or "Save changes"

---

## Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Managing Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)

---

**Note**: These settings require admin access to the repository. If you're the repository owner, you have these permissions by default.
