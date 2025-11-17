# Mobile UX Audit Checklist

## Testing Devices

- [ ] iOS Safari - iPhone 12
- [ ] iOS Safari - iPhone 13
- [ ] iOS Safari - iPhone 14
- [ ] Android Chrome - Pixel 5
- [ ] Android Chrome - Samsung Galaxy

## Touch Target Audit

- [ ] All buttons meet 44x44px minimum
- [ ] All links meet 44x44px minimum
- [ ] All form inputs meet 44px minimum height
- [ ] All interactive elements have proper spacing (8px minimum between targets)
- [ ] Navigation items meet touch target requirements
- [ ] Modal close buttons meet touch target requirements

## Responsive Issues

- [ ] No horizontal scrolling on any page
- [ ] All content fits within viewport width
- [ ] Images scale properly on mobile
- [ ] Text is readable without zooming
- [ ] Forms are usable on mobile screens
- [ ] Modals work properly on mobile

## Modal Testing

- [ ] Modals are scrollable on mobile
- [ ] Modals don't overflow viewport
- [ ] Close buttons are accessible
- [ ] Modals prevent body scroll
- [ ] Safe area insets respected on notched devices

## Form Testing

- [ ] Inputs are 44px minimum height
- [ ] Font size is 16px to prevent iOS zoom
- [ ] Proper keyboard types appear (email, tel, numeric)
- [ ] Forms are scrollable when keyboard is open
- [ ] Error messages are visible
- [ ] Submit buttons are accessible

## Navigation Testing

- [ ] Mobile nav is accessible
- [ ] Touch feedback is visible
- [ ] Navigation items are properly spaced
- [ ] Active states are clear

## Performance Testing

- [ ] Test on 3G connection (target <5s load)
- [ ] Test on 4G connection (target <3s load)
- [ ] Lighthouse mobile score >90
- [ ] No layout shifts (CLS <0.1)
- [ ] Images load efficiently
- [ ] Bundle size is optimized

## Scroll Behavior

- [ ] Smooth scrolling works
- [ ] No horizontal scroll
- [ ] iOS bounce behavior handled
- [ ] Pull-to-refresh works where applicable
- [ ] Scroll containers work properly

## Touch Interactions

- [ ] Touch feedback on all interactive elements
- [ ] No accidental taps
- [ ] Gestures work properly
- [ ] Swipe gestures work where implemented

## Keyboard Testing

- [ ] Keyboard doesn't cover inputs
- [ ] Forms scroll when keyboard opens
- [ ] Proper input types trigger correct keyboards
- [ ] Dismiss keyboard works properly
