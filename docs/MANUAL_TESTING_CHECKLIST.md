# Manual Testing Checklist

## Onboarding Flow

### Location Selection

- [ ] User can select location from dropdown
- [ ] User can search for location
- [ ] Location validation works correctly
- [ ] Location is saved to user profile
- [ ] Location can be changed later

### Handle Generation

- [ ] Anonymous handle is auto-generated
- [ ] Handle is unique
- [ ] Handle collision is handled gracefully
- [ ] User can see their handle
- [ ] Handle format is correct (e.g., "LocalPeacefulBadger899")

### Profile Setup

- [ ] User can complete profile setup
- [ ] Profile information is saved
- [ ] Profile can be edited later
- [ ] Avatar generation works
- [ ] Default avatar is assigned if no image

## Post Creation

### Text Posts

- [ ] User can create text post
- [ ] Post content is validated
- [ ] Post is published successfully
- [ ] Post appears in feed
- [ ] Post can be edited
- [ ] Post can be deleted

### Image Posts

- [ ] User can upload images
- [ ] Image compression works
- [ ] Multiple images can be uploaded
- [ ] Image gallery displays correctly
- [ ] Images are optimized for web

### Poll Creation

- [ ] User can create poll
- [ ] Multiple options can be added
- [ ] Poll can be anonymous
- [ ] Poll voting works
- [ ] Poll results display correctly

### Community Selection

- [ ] User can select community when creating post
- [ ] Post appears in selected community
- [ ] Community validation works
- [ ] Default community is selected if none chosen

## Event Management

### Event Creation

- [ ] User can create event
- [ ] Event details can be filled
- [ ] Event date/time validation works
- [ ] Event location can be set
- [ ] Event image can be uploaded
- [ ] Event is published successfully

### Event Discovery

- [ ] Events appear in discovery feed
- [ ] Events can be filtered by date
- [ ] Events can be filtered by location
- [ ] Events can be filtered by category
- [ ] Event search works

### Event RSVP

- [ ] User can RSVP to event
- [ ] RSVP status is saved
- [ ] User can cancel RSVP
- [ ] RSVP count updates correctly
- [ ] Event organizer can see RSVPs

## Artist Features

### Artist Registration

- [ ] Artist can register
- [ ] Artist profile can be created
- [ ] Portfolio images can be uploaded
- [ ] Pricing information can be set
- [ ] Artist verification works

### Booking System

- [ ] User can book artist
- [ ] Booking form works correctly
- [ ] Booking dates can be selected
- [ ] Booking confirmation is sent
- [ ] Booking can be cancelled
- [ ] Booking status updates correctly

### Calendar Management

- [ ] Artist can view calendar
- [ ] Available dates are shown
- [ ] Booked dates are marked
- [ ] Calendar can be filtered
- [ ] Calendar sync works

## Subscription Flow

### Plan Selection

- [ ] User can view subscription plans
- [ ] Plan details are displayed
- [ ] User can select plan
- [ ] Plan comparison works

### Payment Processing

- [ ] Payment form works
- [ ] Payment gateway integration works
- [ ] Payment confirmation is received
- [ ] Payment errors are handled
- [ ] Payment receipt is generated

### Subscription Management

- [ ] User can view subscription status
- [ ] User can cancel subscription
- [ ] User can upgrade/downgrade plan
- [ ] Subscription renewal works
- [ ] Subscription expiry is handled

## Moderation

### Content Reporting

- [ ] User can report content
- [ ] Report form works
- [ ] Report reasons are available
- [ ] Report is submitted successfully
- [ ] Report status can be tracked

### Admin Actions

- [ ] Admin can view reports
- [ ] Admin can take action on reports
- [ ] Content can be removed
- [ ] User can be warned/banned
- [ ] Admin actions are logged

### Appeal Process

- [ ] User can appeal moderation action
- [ ] Appeal form works
- [ ] Appeal is reviewed
- [ ] Appeal decision is communicated

## Discovery

### Proximity Search

- [ ] Proximity search works
- [ ] Distance calculation is accurate
- [ ] Results are sorted by distance
- [ ] Search radius can be adjusted
- [ ] Location permissions work

### Community Browsing

- [ ] Communities are listed
- [ ] Community details are shown
- [ ] User can join community
- [ ] User can leave community
- [ ] Community posts are filtered

### Feed Filtering

- [ ] Feed can be filtered by type
- [ ] Feed can be filtered by community
- [ ] Feed can be sorted
- [ ] Feed pagination works
- [ ] Feed refresh works

## Browser Compatibility

### Chrome (Latest)

- [ ] All features work
- [ ] UI renders correctly
- [ ] Performance is acceptable
- [ ] No console errors

### Firefox (Latest)

- [ ] All features work
- [ ] UI renders correctly
- [ ] Performance is acceptable
- [ ] No console errors

### Safari (Latest)

- [ ] All features work
- [ ] UI renders correctly
- [ ] Performance is acceptable
- [ ] No console errors

### Edge (Latest)

- [ ] All features work
- [ ] UI renders correctly
- [ ] Performance is acceptable
- [ ] No console errors

### Mobile Browsers

- [ ] Chrome Mobile works
- [ ] Safari Mobile works
- [ ] Responsive design works
- [ ] Touch interactions work

## Mobile Device Testing

### iOS Devices

- [ ] iPhone 12 - All features work
- [ ] iPhone 13 - All features work
- [ ] iPad - All features work
- [ ] Touch gestures work
- [ ] Orientation changes work

### Android Devices

- [ ] Pixel 5 - All features work
- [ ] Samsung Galaxy - All features work
- [ ] Touch gestures work
- [ ] Orientation changes work

### Responsive Breakpoints

- [ ] 320px - Mobile layout works
- [ ] 768px - Tablet layout works
- [ ] 1024px - Desktop layout works
- [ ] 1280px+ - Large desktop layout works

## Edge Cases Manual Testing

### Network Failures

- [ ] Offline mode works
- [ ] Error messages are shown
- [ ] Retry mechanism works
- [ ] Data is cached appropriately

### Slow Network Conditions

- [ ] Loading states are shown
- [ ] Timeout handling works
- [ ] Progressive loading works
- [ ] User feedback is provided

### Large File Uploads

- [ ] File size validation works
- [ ] Upload progress is shown
- [ ] Upload can be cancelled
- [ ] Error handling works

### Concurrent User Actions

- [ ] Multiple tabs work correctly
- [ ] Real-time updates work
- [ ] Conflict resolution works
- [ ] Data consistency is maintained

### Session Expiration

- [ ] Session expiry is detected
- [ ] User is logged out gracefully
- [ ] Session can be renewed
- [ ] Data is preserved

### Payment Failures

- [ ] Payment errors are handled
- [ ] User is notified
- [ ] Retry mechanism works
- [ ] Transaction is rolled back

### API Rate Limiting

- [ ] Rate limits are enforced
- [ ] Error messages are clear
- [ ] Retry after delay works
- [ ] User experience is not degraded

## Performance Testing

### Page Load Times

- [ ] Homepage loads < 3s
- [ ] Post feed loads < 2s
- [ ] Profile page loads < 2s
- [ ] Event page loads < 2s

### Interaction Response

- [ ] Button clicks respond < 100ms
- [ ] Form submissions work smoothly
- [ ] Navigation is instant
- [ ] Search results appear quickly

### Image Loading

- [ ] Images load progressively
- [ ] Lazy loading works
- [ ] Image optimization works
- [ ] No layout shift on image load

## Accessibility Testing

### Keyboard Navigation

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Keyboard shortcuts work

### Screen Reader

- [ ] Screen reader announces content correctly
- [ ] ARIA labels are present
- [ ] Semantic HTML is used
- [ ] Form labels are associated

### Color Contrast

- [ ] Text meets WCAG AA standards
- [ ] Interactive elements have sufficient contrast
- [ ] Color is not the only indicator
- [ ] High contrast mode works

## Security Testing

### Authentication

- [ ] Login works securely
- [ ] Session management is secure
- [ ] Password requirements are enforced
- [ ] OTP verification works

### Authorization

- [ ] Users can only access their data
- [ ] Admin functions are protected
- [ ] API endpoints are secured
- [ ] RLS policies work correctly

### Data Protection

- [ ] Sensitive data is encrypted
- [ ] PII is handled correctly
- [ ] Data deletion works
- [ ] Privacy settings work
