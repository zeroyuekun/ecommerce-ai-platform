# Changes Made by Claude

## Commit: 640a6a9
**Date:** 2026-03-10
**Author:** Claude Haiku 4.5

### Summary
Added admin role authorization, memoized ProductCard component, and created error boundary component.

### Files Changed

#### 1. `app/api/admin/insights/route.ts`
**What Changed:**
- Added import for `currentUser` from "@clerk/nextjs/server"
- Added role-based authorization check that verifies user has "admin" role in publicMetadata
- Returns 403 Forbidden if user doesn't have admin role

**Why:** Security improvement - ensures only admins can access insights API

**How to Revert:**
- Remove the `currentUser` import
- Delete lines 74-77 (the role check):
```typescript
const user = await currentUser();
if (user?.publicMetadata?.role !== "admin") {
  return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
}
```

#### 2. `components/app/ProductCard.tsx`
**What Changed:**
- Added `memo` import from "react"
- Wrapped component export in `memo()` function
- Changed from `export function ProductCard(...)` to `export const ProductCard = memo(function ProductCard(...))`

**Why:** Performance optimization - prevents unnecessary re-renders of ProductCard component

**How to Revert:**
- Remove `memo` from imports
- Change line 20 from:
```typescript
export const ProductCard = memo(function ProductCard({ product, compact = false }: ProductCardProps) {
```
to:
```typescript
export function ProductCard({ product, compact = false }: ProductCardProps) {
```
- Change closing brace on last line from `});` back to `}`

#### 3. `app/(admin)/admin/error.tsx` (NEW FILE)
**What Changed:**
- New error boundary component for admin pages
- Handles errors that occur in admin section

**Why:** Better error handling and user experience for admin pages

**How to Revert:**
- Delete the entire file: `git rm app/(admin)/admin/error.tsx`

## How to Revert All Changes

**Option 1: Revert the entire commit**
```bash
git revert 640a6a9
```

**Option 2: Go back to previous state**
```bash
git reset --hard cb44b54
```

**Option 3: Revert specific files**
```bash
git checkout cb44b54 app/api/admin/insights/route.ts
git checkout cb44b54 components/app/ProductCard.tsx
git rm app/(admin)/admin/error.tsx
```

---

## Commit: 272474d
**Date:** 2026-03-10
**Author:** Claude Opus 4.6

### Summary
Fix webhook silent failure, require chat authentication, and hide admin error details.

### Files Changed

#### 1. `app/api/webhooks/stripe/route.ts`
**What Changed:**
- Line 85-86: Changed `return;` to `throw new Error(...)` when metadata is missing

**Why:** The early `return` caused the POST handler to return 200 to Stripe, so Stripe would never retry. Customer paid but no order was created. Now it throws, the catch re-throws, returning 500 to Stripe which triggers retry.

**How to Revert:**
- Change line 86 from:
```typescript
throw new Error("Missing metadata in checkout session");
```
to:
```typescript
console.error("Missing metadata in checkout session");
return;
```

#### 2. `app/api/chat/route.ts`
**What Changed:**
- Added authentication check — returns 401 if `userId` is null
- Removed comment about userId being null for unauthenticated users

**Why:** The endpoint was fully open. Any anonymous user could spam it and rack up Claude API costs with zero friction.

**How to Revert:**
- Remove lines 11-16 (the userId null check and 401 response)
- Change comment on line 8 back to: `// Get the user's session - userId will be null if not authenticated`
- Add comment before agent creation: `// Create agent with user context (orders tool only available if authenticated)`

#### 3. `app/api/admin/insights/route.ts`
**What Changed:**
- Removed raw `error.message` from the JSON response
- Now returns generic "Failed to generate insights. Please try again later."
- Full error still logged server-side via `console.error`

**Why:** Raw error messages could leak Sanity query syntax, AI gateway config, or internal file paths.

**How to Revert:**
- Replace lines 337-342 with:
```typescript
const message = error instanceof Error ? error.message : "Unknown error";
return Response.json(
  {
    success: false,
    error: `Failed to generate insights: ${message}`,
  },
  { status: 500 }
);
```

## How to Revert This Commit

**Option 1: Revert the entire commit**
```bash
git revert 272474d
```

**Option 2: Go back to previous state**
```bash
git reset --hard 1eeebf3
```

**Option 3: Revert specific files**
```bash
git checkout 1eeebf3 app/api/webhooks/stripe/route.ts
git checkout 1eeebf3 app/api/chat/route.ts
git checkout 1eeebf3 app/api/admin/insights/route.ts
```

---

## Notes
- All changes are backward compatible
- No breaking changes to existing functionality
- Admin authorization requires users to have `publicMetadata.role === "admin"` set in Clerk
- Chat endpoint now requires sign-in — the chat FAB should prompt login for unauthenticated users
