# Community Join/Leave Analysis for Admins and Moderators

## Issue Analysis

### Current Behavior

1. **Join Route** (`app/api/communities/[slug]/join/route.ts`):
   - ✅ Checks if user is already a member (line 167-182)
   - ✅ Prevents creator from joining (line 188-197)
   - ❌ **ISSUE**: Always sets role to `'member'` when joining (line 208)
   - ❌ **ISSUE**: No role preservation for admins/moderators who left and want to rejoin

2. **Leave Route** (`app/api/communities/[slug]/leave/route.ts`):
   - ✅ Prevents creator from leaving (line 32-39)
   - ✅ Uses regular client with RLS policy `(auth.uid() = user_id)`
   - ✅ Should work for admins/moderators (RLS allows any user to delete their own membership)

### RLS Policies for `community_members` DELETE

From the policies list:

- **"Users can leave communities"**: `qual: "(auth.uid() = user_id)"`
  - ✅ Allows ANY user (including admins/moderators) to delete their own membership
  - ✅ No role-based restrictions

### Identified Issues

#### Issue 1: Role Loss on Rejoin

**Problem**: When an admin or moderator leaves a community and tries to rejoin, they will:

1. Successfully leave (RLS policy allows it)
2. Successfully rejoin (no existing membership)
3. **Lose their admin/moderator role** and become a regular member

**Impact**:

- Admins/moderators who accidentally leave or need to rejoin will lose their elevated privileges
- They would need manual intervention to restore their role

**Location**: `app/api/communities/[slug]/join/route.ts:208`

#### Issue 2: No Role History

**Problem**: There's no mechanism to track previous roles when users leave communities.

**Impact**:

- Cannot automatically restore previous roles
- No audit trail of role changes

### Recommendations

#### Option 1: Prevent Role Loss (Recommended)

Add a check before allowing admins/moderators to leave, warning them that they'll lose their role:

```typescript
// In leave route, add check for admin/moderator role
const { data: membership } = await supabase
  .from('community_members')
  .select('role')
  .eq('community_id', community.id)
  .eq('user_id', user.id)
  .single()

if (membership && ['admin', 'moderator'].includes(membership.role)) {
  return NextResponse.json(
    {
      error:
        'Admins and moderators cannot leave. Please transfer your role first or contact support.',
      code: 'ADMIN_CANNOT_LEAVE',
    },
    { status: 403 }
  )
}
```

#### Option 2: Role Preservation

Track previous roles and restore them on rejoin:

1. Create a `community_member_history` table to track role changes
2. On leave, store the role in history
3. On join, check history and restore previous role if it was admin/moderator

#### Option 3: Explicit Warning

Add a confirmation dialog in the UI that warns admins/moderators about role loss.

### Testing Checklist

- [ ] Test: Regular member can join community ✅
- [ ] Test: Regular member can leave community ✅
- [ ] Test: Admin can leave community (should work via RLS)
- [ ] Test: Admin can rejoin community (should work but lose role) ❌
- [ ] Test: Moderator can leave community (should work via RLS)
- [ ] Test: Moderator can rejoin community (should work but lose role) ❌
- [ ] Test: Creator cannot leave (should be blocked) ✅
- [ ] Test: Creator cannot join (should redirect to reclaim) ✅

### Current Status

**Join Route**: ✅ Works for regular members, but causes role loss for admins/moderators  
**Leave Route**: ✅ Should work for all roles including admins/moderators (needs verification)
