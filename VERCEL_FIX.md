# Vercel Deployment Fix

## Problem

Vercel was trying to use npm instead of pnpm, causing this error:

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "catalog:": catalog:
```

The issue: Vercel didn't know the project uses pnpm with `catalog:` references, which npm doesn't support.

## Solution

Two files were added to enable Vercel to properly build the project:

### 1. `vercel.json` (Root Directory)

Tells Vercel to:
- Use pnpm for installation
- Use the correct build command for the monorepo
- Output the static build to the correct directory

```json
{
  "buildCommand": "pnpm --filter @workspace/bahamas-land build",
  "outputDirectory": "artifacts/bahamas-land/dist",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

### 2. `pnpm-lock.yaml` (Root Directory)

The lockfile was regenerated to ensure it contains no Replit references and works with pnpm and Vercel.

## Testing

Build was tested locally and succeeds:

```bash
✓ built in 3.24s
dist/index.html                     0.75 kB │ gzip:   0.43 kB
dist/assets/index-BwRFnFQY.css     119.07 kB │ gzip:  19.21 kB
dist/assets/index-Z_kBaPVD.js      537.87 kB │ gzip: 172.88 kB
```

## Next Steps

1. Push these changes to GitHub
2. Redeploy on Vercel
3. The deployment should now succeed

The build command, output directory, and lockfile are all configured correctly for Vercel.
