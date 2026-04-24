# Fix: pnpm Lockfile Issue

## Problem

You're getting this error:
```
ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC  No catalog entry '@replit/vite-plugin-cartographer' was found for catalog 'default'.
```

## Solution

Your **local `pnpm-lock.yaml`** file still contains the old Replit package references. You need to delete it and regenerate it.

### Step 1: Delete the Lock File

**On Windows PowerShell:**
```powershell
Remove-Item pnpm-lock.yaml -Force
```

**On Windows Command Prompt:**
```cmd
del pnpm-lock.yaml
```

**On Mac/Linux:**
```bash
rm pnpm-lock.yaml
```

### Step 2: Clear pnpm Cache (Optional but Recommended)

```bash
pnpm store prune
```

### Step 3: Reinstall

```bash
pnpm install
```

This will regenerate `pnpm-lock.yaml` with the cleaned configuration (no Replit packages).

### Step 4: Run Development Server

```bash
pnpm dev
```

## Why This Happens

- We removed Replit package references from `pnpm-workspace.yaml` in the v0 project
- Your local copy of the project still has the old `pnpm-lock.yaml`
- When you run `pnpm install`, it tries to find packages listed in the lockfile
- The lockfile references packages that are no longer in the catalog

## Alternative: Start Fresh

If the above doesn't work, start completely fresh:

```bash
# Remove all node_modules and lockfiles
Remove-Item node_modules -Recurse -Force
Remove-Item pnpm-lock.yaml -Force

# Clear pnpm store
pnpm store prune

# Reinstall everything
pnpm install

# Run dev server
pnpm dev
```

---

**After completing these steps, the error should be gone and `pnpm dev` will work normally.**
