# Archived Documentation

This folder contains historical documentation from the Muralla 4.0 → 5.0 migration process.

## Files

### MIGRATION_PLAN.md
**Status:** Historical
**Purpose:** Original migration strategy and plan for moving from Muralla 4.0 (complex monorepo) to Muralla 5.0 (simplified Next.js architecture)

**Key Topics:**
- Migration phases and timeline
- Architecture comparison (NestJS → Next.js API routes)
- Deployment strategy (Railway → Vercel)
- State management simplification (Redux → React Query + Context)

**Note:** Most items in this plan have been completed. Reference for understanding migration decisions.

---

### MIGRATION_COMPARISON.md
**Status:** Historical
**Purpose:** Detailed comparison of what to keep, transform, and abandon from Muralla 4.0

**Key Topics:**
- Code mapping guide (4.0 → 5.0 file structure)
- Dependencies to replace vs keep
- Simplification strategies
- Success metrics comparison

**Note:** Useful reference for understanding why certain architectural decisions were made.

---

## Current Documentation

For up-to-date API and system documentation, see:

- **[API_DOCUMENTATION.md](../../API_DOCUMENTATION.md)** - Complete API reference
- **[AUTHENTICATION_SETUP.md](../../AUTHENTICATION_SETUP.md)** - Authentication guide
- **[README.md](../../README.md)** - Project overview and setup

---

**Last Updated:** January 2025
**Archived:** Migration completed, Muralla 5.0 is now production system
