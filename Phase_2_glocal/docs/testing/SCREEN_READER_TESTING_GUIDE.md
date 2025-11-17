# 📱 Screen Reader Testing Guide

## Comprehensive Accessibility Testing for TheGlocal Platform

**Last Updated:** January 14, 2025  
**Status:** Testing procedures documented, ready for implementation  
**Tools:** NVDA (Windows), JAWS (Windows), VoiceOver (Mac/iOS), TalkBack (Android)

---

## 🎯 Purpose

This guide provides comprehensive procedures for testing TheGlocal platform with screen readers to ensure WCAG 2.1 AA compliance and excellent accessibility for all users.

---

## 🛠️ Setup Instructions

### Windows - NVDA (Free)

1. Download from https://www.nvaccess.org/download/
2. Install and launch
3. Use **Caps Lock** as NVDA modifier key
4. Basic commands:
   - `NVDA + Space` = Browse/Focus mode toggle
   - `NVDA + Down Arrow` = Read next item
   - `NVDA + Up Arrow` = Read previous item
   - `NVDA + T` = Read page title
   - `NVDA + Ctrl + C` = Stop reading

### Mac - VoiceOver (Built-in)

1. Enable: `Cmd + F5` or System Preferences → Accessibility
2. Use **Control + Option (VO)** as modifier
3. Basic commands:
   - `VO + A` = Read all
   - `VO + Right Arrow` = Next item
   - `VO + Left Arrow` = Previous item
   - `VO + H` = Next heading
   - `Control` = Stop reading

### Testing Environment

- **Browsers:** Chrome, Firefox, Safari (test all three)
- **Devices:** Desktop, tablet, mobile (test responsive behavior)
- **Connection:** Test on fast and slow (3G) connections

---

## ✅ Pre-Testing Checklist

Before starting screen reader tests, verify:

### Code-Level Checks

- [ ] All images have `alt` attributes (or `alt=""` if decorative)
- [ ] All form inputs have associated labels
- [ ] All buttons have descriptive text or `aria-label`
- [ ] Heading hierarchy is logical (h1 → h2 → h3)
- [ ] ARIA attributes are correctly implemented
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA (4.5:1)

### Technical Validation

- [ ] Run axe DevTools (browser extension)
- [ ] Run Lighthouse Accessibility audit
- [ ] Check HTML validation
- [ ] Verify keyboard navigation works

---

## 🧪 Testing Procedures

### 1. Navigation & Structure

**Test:** Page structure and landmark navigation

**Procedure:**

1. Enable screen reader
2. Navigate to homepage
3. Use heading navigation (H key in NVDA, VO+H in VoiceOver)
4. Use landmark navigation (D key in NVDA, VO+U in VoiceOver)
5. Verify all major page sections are announced

**Expected Results:**

- [ ] Page title is announced correctly
- [ ] Main landmarks exist: `<header>`, `<nav>`, `<main>`, `<footer>`
- [ ] Headings follow logical hierarchy (h1 → h2 → h3)
- [ ] Navigation menus are clearly labeled
- [ ] Current page/location is indicated

**Common Issues:**

- ❌ Skipped heading levels (h1 → h3)
- ❌ Multiple h1 headings
- ❌ Generic landmark labels ("navigation", "navigation")
- ❌ Missing main landmark

---

### 2. Authentication Flow

**Test:** Login and signup processes

**Procedure:**

1. Navigate to /auth/login
2. Tab through form fields
3. Verify each field is announced with its label
4. Attempt login with screen reader only
5. Verify error messages are announced
6. Repeat for signup flow

**Expected Results:**

- [ ] Each form field has a clear label
- [ ] Required fields are indicated
- [ ] Validation errors are announced immediately
- [ ] Success messages are announced
- [ ] Password field is identified as such
- [ ] Submit buttons are clearly labeled

**Test Cases:**

```
✅ Email field: "Email, edit text, required"
✅ Password field: "Password, password edit, required"
✅ Login button: "Login, button"
✅ Error: "Error: Invalid email or password"
✅ Success: "Success: Logged in"
```

---

### 3. Feed & Content Discovery

**Test:** Main feed navigation and content consumption

**Procedure:**

1. Navigate to main feed (/)
2. Use screen reader to read posts
3. Verify post metadata is announced
4. Test voting, commenting, sharing actions
5. Verify media content has descriptions

**Expected Results:**

- [ ] Each post is contained in article element
- [ ] Post author and timestamp announced
- [ ] Post title/content is readable
- [ ] Vote buttons have clear labels ("Upvote", "Downvote")
- [ ] Vote count is announced ("42 upvotes")
- [ ] Action buttons labeled ("Comment", "Share", "Save")
- [ ] Images have meaningful alt text
- [ ] Links have descriptive text

**Test Cases:**

```
✅ Post: "Article: Post by User123 posted 2 hours ago"
✅ Title: "Heading level 2: Best cafes in Mumbai"
✅ Upvote: "Button: Upvote, 42 votes"
✅ Comment: "Link: 15 comments"
✅ Image: "Image: Cafe interior with cozy seating"
```

---

### 4. Post Creation & Editing

**Test:** Creating and editing content

**Procedure:**

1. Navigate to create post page
2. Tab through all form fields
3. Create a post using screen reader only
4. Verify all options are accessible
5. Test image upload flow

**Expected Results:**

- [ ] Title field is labeled
- [ ] Body textarea is labeled
- [ ] Community selector is accessible
- [ ] Tag input is accessible
- [ ] Media upload button has clear label
- [ ] Preview is available and accessible
- [ ] Submit button is clearly labeled
- [ ] Progress indicators are announced

**Test Cases:**

```
✅ Title: "Title, edit text, required"
✅ Body: "Body, multi-line edit text"
✅ Community: "Select community, combo box"
✅ Upload: "Button: Upload image"
✅ Submit: "Button: Create post"
```

---

### 5. Communities

**Test:** Community discovery and management

**Procedure:**

1. Navigate to /communities
2. Browse community list
3. Join a community
4. Access community settings
5. Test moderation features

**Expected Results:**

- [ ] Community cards have clear structure
- [ ] Member count is announced
- [ ] Join/Leave buttons are labeled
- [ ] Community rules are accessible
- [ ] Moderator actions are labeled
- [ ] Settings are keyboard accessible

**Test Cases:**

```
✅ Community: "Article: Mumbai Food Lovers, 1,234 members"
✅ Description: "Community for food enthusiasts in Mumbai"
✅ Join button: "Button: Join community"
✅ Settings: "Link: Community settings"
```

---

### 6. Events & Artists

**Test:** Event discovery and artist profiles

**Procedure:**

1. Navigate to /events
2. Browse event listings
3. View event details
4. Test RSVP flow
5. Browse artist profiles (/artists)
6. Test booking flow

**Expected Results:**

- [ ] Event date/time clearly announced
- [ ] Location is accessible
- [ ] RSVP button is labeled
- [ ] Artist profile sections are structured
- [ ] Booking form is accessible
- [ ] Calendar widget is keyboard accessible

**Test Cases:**

```
✅ Event: "Article: Live Music Night, Saturday January 20, 8 PM"
✅ Location: "Location: Blue Frog, Lower Parel"
✅ RSVP: "Button: RSVP to event, not attending"
✅ Artist: "Heading level 1: DJ Shadow performing artist"
✅ Book: "Button: Book for event"
```

---

### 7. Messages & Notifications

**Test:** Real-time communication features

**Procedure:**

1. Navigate to messages (/messages)
2. Open a conversation
3. Send a message
4. Test notifications
5. Mark as read/unread

**Expected Results:**

- [ ] Unread count is announced
- [ ] Message list is accessible
- [ ] Message input is labeled
- [ ] Send button is accessible
- [ ] New messages are announced
- [ ] Notifications have clear text
- [ ] Dismiss actions are labeled

**Test Cases:**

```
✅ Inbox: "List: 3 conversations, 2 unread"
✅ Message: "From User456: Hey, are you going to the event?"
✅ Input: "Message, edit text"
✅ Send: "Button: Send message"
✅ Notification: "Notification: New message from User456"
```

---

### 8. Forms & Interactions

**Test:** Complex form interactions

**Procedure:**

1. Test all form types (login, post, profile, settings)
2. Verify validation feedback
3. Test autocomplete fields
4. Test multi-step forms
5. Test modal dialogs

**Expected Results:**

- [ ] All form fields have labels
- [ ] Field types are announced correctly
- [ ] Required fields are indicated
- [ ] Validation errors are immediate
- [ ] Helper text is associated with fields
- [ ] Autocomplete suggestions are announced
- [ ] Modal focus is trapped
- [ ] Modal close button is accessible

---

### 9. Modal Dialogs

**Test:** Dialog accessibility

**Procedure:**

1. Open various modals (confirm delete, share, etc.)
2. Verify focus management
3. Test close actions
4. Verify content is accessible

**Expected Results:**

- [ ] Focus moves to modal on open
- [ ] Modal title is announced
- [ ] Content is fully accessible
- [ ] Close button is accessible
- [ ] ESC key closes modal
- [ ] Focus returns to trigger on close

**Test Cases:**

```
✅ Open: "Dialog opened: Confirm delete post"
✅ Title: "Heading level 2: Are you sure?"
✅ Close: "Button: Close dialog"
✅ Confirm: "Button: Yes, delete"
✅ Cancel: "Button: Cancel"
```

---

### 10. Keyboard Navigation

**Test:** Complete keyboard accessibility

**Procedure:**

1. Navigate entire app using only keyboard
2. Verify tab order is logical
3. Test all interactive elements
4. Verify skip links work
5. Test keyboard shortcuts

**Expected Keyboard Functions:**

- [ ] `Tab` - Next focusable element
- [ ] `Shift + Tab` - Previous element
- [ ] `Enter` - Activate button/link
- [ ] `Space` - Toggle checkbox/button
- [ ] `Arrow keys` - Navigate menus/lists
- [ ] `Esc` - Close modal/dropdown
- [ ] `Home/End` - Start/end of list

---

## 🐛 Common Issues & Fixes

### Issue: Button not announced

**Fix:** Add `aria-label` or visible text

```tsx
// Before
<Button><X /></Button>

// After
<Button aria-label="Close"><X /></Button>
```

### Issue: Form errors not announced

**Fix:** Associate error with input using `aria-describedby`

```tsx
;<Input id="email" aria-describedby={error ? 'email-error' : undefined} />
{
  error && (
    <span id="email-error" role="alert">
      {error}
    </span>
  )
}
```

### Issue: Dynamic content not announced

**Fix:** Use `role="status"` or `role="alert"`

```tsx
<div role="status" aria-live="polite">
  {loadingMessage}
</div>
```

### Issue: Modal focus not trapped

**Fix:** Use focus trap and restore focus on close

```tsx
import { FocusTrap } from '@/components/ui/focus-trap'
;<Dialog open={open} onOpenChange={onClose}>
  <FocusTrap>{/* modal content */}</FocusTrap>
</Dialog>
```

---

## 📊 Testing Checklist Summary

### Critical Pages

- [ ] Homepage (/)
- [ ] Login (/auth/login)
- [ ] Signup (/auth/signup)
- [ ] Feed (/)
- [ ] Create Post
- [ ] Post Details
- [ ] Communities (/communities)
- [ ] Events (/events)
- [ ] Artists (/artists)
- [ ] Messages (/messages)
- [ ] Profile (/profile)
- [ ] Settings

### Key Interactions

- [ ] Authentication flow
- [ ] Post creation & editing
- [ ] Commenting
- [ ] Voting
- [ ] Joining communities
- [ ] RSVP to events
- [ ] Messaging
- [ ] Notifications
- [ ] Search & filters
- [ ] Moderation actions

---

## 📝 Testing Report Template

```markdown
# Screen Reader Test Report

**Date:** [Date]
**Tester:** [Name]
**Tool:** [NVDA/JAWS/VoiceOver]
**Browser:** [Chrome/Firefox/Safari]
**Version:** [Browser version]

## Summary

- **Pages Tested:** X
- **Issues Found:** Y
- **Critical Issues:** Z
- **Overall Rating:** [Pass/Fail/Needs Improvement]

## Detailed Findings

### [Page Name]

- **Status:** [Pass/Fail]
- **Issues:**
  1. [Description]
  2. [Description]
- **Recommendations:**
  1. [Recommendation]
  2. [Recommendation]

## Priority Issues

1. [Critical issue 1]
2. [Critical issue 2]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
```

---

## 🎯 Success Criteria

### Minimum Requirements (WCAG 2.1 AA)

- ✅ All functionality available via keyboard
- ✅ Focus indicators visible
- ✅ Meaningful text alternatives
- ✅ Logical heading structure
- ✅ Form labels and errors
- ✅ 4.5:1 color contrast ratio
- ✅ No keyboard traps
- ✅ Proper ARIA usage

### Excellent Accessibility

- ✅ Helpful landmark regions
- ✅ Descriptive link text
- ✅ Clear error messages
- ✅ Live region announcements
- ✅ Intuitive navigation
- ✅ Consistent behavior
- ✅ Helpful skip links
- ✅ No auto-playing content

---

## 📚 Additional Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)

---

**Status:** ✅ **Testing guide complete and ready for implementation**  
**Next Step:** Schedule testing session with actual screen reader users  
**Time Estimate:** 2-3 hours for complete testing cycle

---

_Created by: AI Development Assistant_  
_Date: January 14, 2025_  
_For: TheGlocal Platform Accessibility_
