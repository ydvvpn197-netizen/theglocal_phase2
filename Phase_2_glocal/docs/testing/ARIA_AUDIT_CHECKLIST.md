# ARIA Labels Audit Checklist

## Overview

This checklist helps ensure all interactive elements in Theglocal have proper ARIA labels for screen reader accessibility. All interactive elements must be perceivable, operable, and understandable by assistive technologies.

## Quick Reference

### When to Use ARIA Labels

| Element Type              | ARIA Requirement                     | Example                                                  |
| ------------------------- | ------------------------------------ | -------------------------------------------------------- |
| Icon-only buttons         | `aria-label` required                | `<button aria-label="Close">×</button>`                  |
| Buttons with visible text | No ARIA needed                       | `<button>Submit</button>`                                |
| Form inputs               | Associated `<label>` or `aria-label` | `<input aria-label="Search" />`                          |
| Links with context        | No ARIA needed                       | `<a href="/profile">View Profile</a>`                    |
| Icon-only links           | `aria-label` required                | `<a href="/settings" aria-label="Settings"><Icon /></a>` |
| Custom controls           | Multiple ARIA attributes             | See below                                                |

## Component-by-Component Audit

### ✅ Buttons

**Check:**

- [ ] All icon-only buttons have `aria-label`
- [ ] All buttons have clear, descriptive labels
- [ ] Loading/disabled states are announced
- [ ] Button purpose is clear from label alone

**Examples:**

```tsx
// ✅ Good
<button aria-label="Close modal">
  <X className="h-4 w-4" />
</button>

<button aria-label="Like post" aria-pressed={isLiked}>
  <Heart className={isLiked ? 'fill-red-500' : ''} />
</button>

<button disabled aria-disabled="true" aria-label="Submit (loading)">
  <Loader2 className="animate-spin" />
</button>

// ❌ Bad
<button>
  <X className="h-4 w-4" />
</button>

<button onClick={handleLike}>
  <Heart />
</button>
```

### ✅ Form Inputs

**Check:**

- [ ] All inputs have associated labels (via `<label>` or `aria-label`)
- [ ] Required fields are marked with `aria-required="true"`
- [ ] Error states use `aria-invalid` and `aria-describedby`
- [ ] Help text is linked with `aria-describedby`

**Examples:**

```tsx
// ✅ Good
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? 'email-error' : undefined}
  />
  {hasError && (
    <span id="email-error" role="alert">
      Please enter a valid email
    </span>
  )}
</div>

// Search input without visible label
<Input
  type="search"
  placeholder="Search posts..."
  aria-label="Search posts"
/>

// ❌ Bad
<Input type="email" placeholder="Email" /> // No label!

<Input type="password" /> // No label or placeholder!
```

### ✅ Links

**Check:**

- [ ] All links have descriptive text or `aria-label`
- [ ] "Read more" links have context
- [ ] Icon-only links have `aria-label`
- [ ] External links indicate they open new tab

**Examples:**

```tsx
// ✅ Good
<Link href={`/posts/${post.id}`}>
  Read full post: {post.title}
</Link>

<Link href={`/users/${user.id}`} aria-label={`View ${user.name}'s profile`}>
  <Avatar src={user.avatar} />
</Link>

<Link
  href="https://example.com"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="External link: Visit example.com (opens in new tab)"
>
  Learn more
</Link>

// ❌ Bad
<Link href="/post/123">
  Read more // No context!
</Link>

<Link href="/profile">
  <Avatar /> // No label!
</Link>
```

### ✅ Custom Controls

**Check:**

- [ ] Role attribute defines widget type
- [ ] State changes are announced
- [ ] Keyboard interactions work
- [ ] Focus is managed properly

**Examples:**

```tsx
// Toggle button
<button
  role="switch"
  aria-checked={isEnabled}
  aria-label="Enable notifications"
  onClick={toggleNotifications}
>
  {isEnabled ? 'On' : 'Off'}
</button>

// Expandable section
<button
  aria-expanded={isOpen}
  aria-controls="section-content"
  onClick={toggle}
>
  Show details
</button>
<div id="section-content" aria-hidden={!isOpen}>
  {/* Content */}
</div>

// Tabs
<div role="tablist" aria-label="Account settings">
  <button
    role="tab"
    aria-selected={activeTab === 'profile'}
    aria-controls="profile-panel"
    id="profile-tab"
  >
    Profile
  </button>
  <button
    role="tab"
    aria-selected={activeTab === 'security'}
    aria-controls="security-panel"
    id="security-tab"
  >
    Security
  </button>
</div>
```

### ✅ Navigation

**Check:**

- [ ] Main navigation has `role="navigation"` and `aria-label`
- [ ] Current page is marked with `aria-current="page"`
- [ ] Skip to content link is present
- [ ] Breadcrumbs have proper structure

**Examples:**

```tsx
// Main nav
<nav role="navigation" aria-label="Main navigation">
  <Link href="/" aria-current={isHome ? 'page' : undefined}>
    Home
  </Link>
  <Link href="/feed" aria-current={isFeed ? 'page' : undefined}>
    Feed
  </Link>
</nav>

// Skip link (hidden but visible on focus)
<a
  href="#main-content"
  className="skip-link sr-only focus:not-sr-only"
>
  Skip to main content
</a>

// Breadcrumbs
<nav aria-label="Breadcrumb">
  <ol>
    <li><Link href="/">Home</Link></li>
    <li><Link href="/communities">Communities</Link></li>
    <li aria-current="page">Tech Community</li>
  </ol>
</nav>
```

### ✅ Dialogs & Modals

**Check:**

- [ ] Modal has `role="dialog"` and `aria-labelledby`
- [ ] Focus is trapped within modal
- [ ] Close button is labeled
- [ ] Escape key closes modal

**Examples:**

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
    <DialogHeader>
      <DialogTitle id="dialog-title">Delete Post</DialogTitle>
      <DialogDescription id="dialog-description">
        Are you sure you want to delete this post? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
    <DialogClose aria-label="Close dialog">
      <X className="h-4 w-4" />
    </DialogClose>
  </DialogContent>
</Dialog>
```

### ✅ Status Messages & Alerts

**Check:**

- [ ] Success/error messages use `role="status"` or `role="alert"`
- [ ] Live regions announce changes
- [ ] Loading states are announced

**Examples:**

```tsx
// Success message
<div role="status" aria-live="polite">
  Post published successfully
</div>

// Error message (interrupts user)
<div role="alert" aria-live="assertive">
  Failed to save post. Please try again.
</div>

// Loading state
<div role="status" aria-live="polite" aria-busy="true">
  <Loader2 className="animate-spin" />
  <span className="sr-only">Loading posts...</span>
</div>
```

### ✅ Lists & Grids

**Check:**

- [ ] Lists use semantic HTML (`<ul>`, `<ol>`)
- [ ] Grid layouts have `role="grid"` if interactive
- [ ] List items are properly nested

**Examples:**

```tsx
// Feed list
<ul role="list" aria-label="Posts feed">
  {posts.map((post) => (
    <li key={post.id}>
      <PostCard post={post} />
    </li>
  ))}
</ul>

// Empty state
<div role="status" aria-live="polite">
  <p>No posts found. Try adjusting your filters.</p>
</div>
```

## Common Patterns

### Vote Buttons

```tsx
<div role="group" aria-label="Vote on post">
  <button
    aria-label={`Upvote (${upvotes} upvotes)`}
    aria-pressed={userVote === 'upvote'}
    onClick={handleUpvote}
  >
    <ArrowUp /> {upvotes}
  </button>
  <button
    aria-label={`Downvote (${downvotes} downvotes)`}
    aria-pressed={userVote === 'downvote'}
    onClick={handleDownvote}
  >
    <ArrowDown /> {downvotes}
  </button>
</div>
```

### Image Upload

```tsx
<div>
  <label htmlFor="image-upload">Upload profile picture</label>
  <input id="image-upload" type="file" accept="image/*" aria-describedby="image-help" />
  <span id="image-help" className="text-sm">
    Maximum file size: 5MB. Supported formats: JPG, PNG
  </span>
</div>
```

### Dropdown Menu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger aria-label="Open menu" aria-haspopup="true">
    <MoreVertical />
  </DropdownMenuTrigger>
  <DropdownMenuContent role="menu">
    <DropdownMenuItem role="menuitem" onSelect={handleEdit}>
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem role="menuitem" onSelect={handleDelete}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Screen Reader Testing

### Manual Testing Steps

1. **NVDA (Windows):**

   ```
   - Download: https://www.nvaccess.org/
   - Start: Ctrl + Alt + N
   - Navigate: Arrow keys, Tab
   - Read: Insert + Down Arrow (continuous reading)
   - Stop: Ctrl
   ```

2. **JAWS (Windows):**

   ```
   - Navigate: Arrow keys, Tab
   - Read: Insert + Down Arrow
   - Forms mode: Enter/Space on form field
   ```

3. **VoiceOver (macOS):**
   ```
   - Start: Cmd + F5
   - Navigate: VO + Arrow keys (VO = Ctrl + Option)
   - Read: VO + A (read all)
   - Interact: VO + Shift + Down Arrow
   ```

### Testing Checklist

- [ ] Can navigate entire page with keyboard only
- [ ] All interactive elements are announced
- [ ] Form fields have clear labels
- [ ] Error messages are read aloud
- [ ] Loading states are announced
- [ ] Modal focus is trapped
- [ ] Skip links work
- [ ] Current page is announced in navigation

## Automated Tools

### Browser Extensions

1. **axe DevTools** (Chrome/Firefox)
   - Install from browser store
   - Open DevTools → axe tab
   - Click "Scan ALL of my page"
   - Review violations

2. **WAVE** (Chrome/Firefox/Edge)
   - Install from browser store
   - Click extension icon on any page
   - Review errors and warnings

3. **Lighthouse** (Chrome)
   - Open DevTools → Lighthouse tab
   - Run accessibility audit
   - Review score and suggestions

### CI Integration

Already implemented via jest-axe! See `docs/ACCESSIBILITY_TESTING.md`.

## Priority Fixes

### Critical (Fix Immediately)

- [ ] Icon-only buttons without labels
- [ ] Form inputs without labels
- [ ] Images without alt text
- [ ] Links without context ("click here", "read more")

### High (Fix Soon)

- [ ] Missing error announcements
- [ ] Unlabeled custom controls
- [ ] Missing keyboard navigation
- [ ] Insufficient color contrast

### Medium (Fix Eventually)

- [ ] Redundant ARIA labels
- [ ] Missing landmark roles
- [ ] Overly verbose announcements
- [ ] Missing live regions

## Resources

- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM ARIA Techniques](https://webaim.org/techniques/aria/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)

## Audit Log

| Date       | Audited By | Components Checked | Issues Found | Issues Fixed |
| ---------- | ---------- | ------------------ | ------------ | ------------ |
| 2025-11-14 | System     | All                | Documented   | 0            |

---

**Next Steps:**

1. Review each component type
2. Run automated tools (axe, WAVE, Lighthouse)
3. Manual screen reader testing
4. Fix critical issues first
5. Re-audit and document fixes
