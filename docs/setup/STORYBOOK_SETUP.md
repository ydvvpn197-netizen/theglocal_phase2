# Storybook Setup Guide

## Overview

Storybook is now configured for Theglocal! Use it to develop and document UI components in isolation.

## ✅ What's Been Setup

**Configuration Files:**

- ✅ `.storybook/main.ts` - Main Storybook configuration
- ✅ `.storybook/preview.ts` - Preview configuration with TailwindCSS
- ✅ `components/ui/button.stories.tsx` - Example Button component stories

**Features Enabled:**

- ✅ Next.js 15 integration
- ✅ TailwindCSS styling
- ✅ Accessibility testing addon
- ✅ Auto-generated documentation
- ✅ Path alias support (@/)

## 🚀 Installation

```bash
# Install Storybook and dependencies
npm install --save-dev @storybook/nextjs @storybook/addon-links @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-a11y @storybook/react

# Install TypeScript types
npm install --save-dev @types/react @types/react-dom
```

## 📝 Running Storybook

```bash
# Start Storybook development server
npx storybook dev -p 6006

# Build Storybook for deployment
npx storybook build
```

Access at: `http://localhost:6006`

## 📖 Writing Stories

### Basic Story Pattern

```tsx
// components/ui/your-component.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { YourComponent } from './your-component'

const meta = {
  title: 'UI/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary'],
    },
  },
} satisfies Meta<typeof YourComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Content',
    variant: 'default',
  },
}

export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
}
```

### Complex Story with Actions

```tsx
export const WithActions: Story = {
  args: {
    onClick: () => console.log('Clicked!'),
    children: 'Click me',
  },
  play: async ({ canvasElement }) => {
    // Interaction testing
    const button = within(canvasElement).getByRole('button')
    await userEvent.click(button)
  },
}
```

## 📋 Component Documentation Priority

### Phase 1: shadcn/ui Base Components (Essential)

1. ✅ Button - DONE
2. [ ] Input
3. [ ] Label
4. [ ] Textarea
5. [ ] Card
6. [ ] Dialog
7. [ ] DropdownMenu
8. [ ] Avatar
9. [ ] Badge
10. [ ] Separator

**Estimated:** 4-6 hours

### Phase 2: Custom Components (Important)

1. [ ] PostCard
2. [ ] CommentThread
3. [ ] EmptyState
4. [ ] ErrorBoundary fallbacks
5. [ ] UserAvatar (geometric)
6. [ ] VoteButtons
7. [ ] PostActions

**Estimated:** 4-6 hours

### Phase 3: Feature Components (Nice to Have)

1. [ ] CreatePostForm
2. [ ] PollCard
3. [ ] EventCard
4. [ ] ArtistProfile
5. [ ] CommunityCard

**Estimated:** 4-6 hours

## 🎨 Story Categories

Organize stories by category:

```
stories/
├── UI/              # Base UI components (shadcn/ui)
├── Forms/           # Form components
├── Layout/          # Layout components
├── Features/        # Feature-specific components
├── Posts/           # Post-related components
├── Communities/     # Community components
└── Examples/        # Complex example scenarios
```

## 🧪 Accessibility Testing

Storybook includes the a11y addon for automatic accessibility testing:

```tsx
export const AccessibilityTest: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
}
```

## 📦 Add to Scripts

Update `package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

## 🔥 Quick Start Template

Copy this template for new stories:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { ComponentName } from './component-name'

const meta = {
  title: 'Category/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered', // or 'fullscreen' or 'padded'
  },
  tags: ['autodocs'], // Auto-generate docs
} satisfies Meta<typeof ComponentName>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // Component props
  },
}
```

## 🚀 Next Steps

1. ✅ Configuration files created
2. ✅ Example story created (Button)
3. [ ] Install Storybook: `npm install --save-dev @storybook/nextjs @storybook/addon-links @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-a11y`
4. [ ] Run Storybook: `npx storybook dev -p 6006`
5. [ ] Document remaining shadcn/ui components (10 components)
6. [ ] Document custom components (7+ components)
7. [ ] Add to CI/CD pipeline (optional)

## 📚 Resources

- [Storybook Docs](https://storybook.js.org/docs/react/get-started/introduction)
- [Next.js Framework Guide](https://storybook.js.org/docs/react/get-started/nextjs)
- [Accessibility Addon](https://storybook.js.org/addons/@storybook/addon-a11y)

---

**Status:** Infrastructure ready, installation required  
**Time to Complete:** ~12-15 hours for full documentation  
**Priority:** Medium (improves developer experience)
