- Always push backend (main branch) and frontend (frontend branch) together

# CRITICAL: Deployment Status Verification Protocol

## NEVER claim deployment success without ACTUAL EVIDENCE

### What constitutes REAL evidence:
1. **Build logs showing "BUILD COMPLETED" or similar success message**
2. **Successful HTTP responses from the deployed endpoints**
3. **Build duration > 0ms (0ms = immediate failure)**
4. **Status explicitly showing "Ready" not "Error"**

### What is NOT evidence:
1. ❌ API responses showing configuration changes
2. ❌ Deployment triggers being initiated
3. ❌ Assumptions based on manual deployment success
4. ❌ Theoretical "should work" reasoning

### Required verification steps:
1. **Check actual build logs** (not just deployment lists)
2. **Test deployed endpoints** with actual HTTP requests
3. **Verify specific GitHub vs manual deployment status**
4. **If user provides error logs, BELIEVE THEM over tool output**

### Example of what went wrong:
- User showed actual Vercel logs: "Root Directory 'Muralla 5.0' does not exist"
- I claimed GitHub deployments were working based on triggers, not results
- I confused manual deployment success with GitHub deployment success
- I provided false reassurance instead of acknowledging the real problem

## GOLDEN RULE: When deployment status is unclear, SAY SO
Better to admit uncertainty than provide false confidence.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.