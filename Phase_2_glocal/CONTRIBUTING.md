# Contributing to Theglocal

Thank you for your interest in contributing to Theglocal! This document provides guidelines for contributing to the project.

---

## 🎯 Our Mission

Build a privacy-first, hyper-local digital public square that:
- Protects user anonymity and privacy
- Enables meaningful community engagement
- Supports local artists and creators
- Promotes transparent governance
- Remains ad-free and user-focused

---

## 🤝 How to Contribute

### **Types of Contributions**

We welcome:
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ✅ Test coverage improvements
- 🌐 Localization/translations
- ♿ Accessibility improvements

---

## 🔧 Development Setup

### **1. Fork and Clone**

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/theglocal.git
cd theglocal

# Add upstream remote
git remote add upstream https://github.com/original/theglocal.git
```

### **2. Install Dependencies**

```bash
npm install
```

### **3. Set Up Environment**

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

See `ENV_SETUP.md` for detailed configuration.

### **4. Run Development Server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📝 Development Workflow

### **1. Create a Branch**

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch Naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions
- `chore/` - Maintenance tasks

### **2. Make Changes**

Follow our code standards (see below)

### **3. Write Tests**

```bash
# Unit tests for utilities
# Integration tests for API routes
# E2E tests for critical flows

npm test
```

### **4. Run Quality Checks**

```bash
# Lint
npm run lint

# Type check
npm run type-check

# Format
npm run format

# All checks
npm run lint && npm run type-check && npm test
```

### **5. Commit Changes**

Use conventional commit messages:

```bash
git commit -m "feat: add artist search functionality"
git commit -m "fix: resolve booking message timestamp issue"
git commit -m "docs: update API documentation"
```

**Commit Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting)
- `refactor:` - Code refactoring
- `test:` - Test additions
- `chore:` - Maintenance
- `perf:` - Performance improvement

### **6. Push and Create PR**

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## 📏 Code Standards

### **TypeScript**

- ✅ Use TypeScript strictly
- ❌ No `any` types (use `unknown` if necessary)
- ✅ Define interfaces for all data structures
- ✅ Use type inference where obvious

### **React/Next.js**

- ✅ Use functional components with hooks
- ✅ Use App Router patterns
- ✅ Server components by default, client only when needed
- ✅ Implement loading and error states
- ✅ Handle edge cases gracefully

### **Styling**

- ✅ Use TailwindCSS utility classes
- ✅ Use shadcn/ui components
- ✅ Follow mobile-first design
- ✅ Ensure WCAG 2.1 AA compliance
- ✅ Test on mobile devices

### **Security**

- ✅ Validate all inputs with Zod
- ✅ Sanitize user-generated content
- ✅ Use RLS policies for data access
- ✅ Never expose PII in APIs
- ✅ Test for XSS and SQL injection

### **Privacy**

- ✅ Use anonymous handles everywhere
- ✅ Round location coordinates to city-level
- ✅ No tracking without consent
- ✅ Log moderation actions publicly
- ✅ Allow data deletion

### **Testing**

- ✅ Write tests for new features
- ✅ Maintain 80%+ coverage
- ✅ Test happy path and edge cases
- ✅ Include accessibility tests

---

## 🏗️ Project Architecture

### **Directory Structure**

```
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── (auth)/              # Auth-related pages
│   ├── communities/          # Community pages
│   ├── artists/              # Artist pages
│   └── ...
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   ├── auth/                 # Auth components
│   ├── communities/          # Community components
│   └── ...
├── lib/                      # Utilities and libraries
│   ├── supabase/            # Supabase clients
│   ├── integrations/        # External API clients
│   ├── utils/               # Helper functions
│   └── types/               # TypeScript types
├── supabase/                 # Database
│   └── migrations/          # SQL migrations
└── __tests__/               # Tests
    ├── unit/                # Unit tests
    ├── integration/         # Integration tests
    └── e2e/                 # E2E tests
```

### **Key Patterns**

**API Routes:**
```typescript
// app/api/resource/route.ts
export async function GET(request: NextRequest) {
  // 1. Authentication check
  // 2. Validation
  // 3. Database query with RLS
  // 4. Return JSON
}
```

**Components:**
```typescript
// components/feature/component.tsx
'use client' // Only if needed

export function Component({ prop }: Props) {
  // 1. State management
  // 2. Data fetching (React Query)
  // 3. Event handlers
  // 4. Render with loading/error states
}
```

**Database Access:**
```typescript
// Always use Supabase client
const supabase = await createClient()
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('column', value)
```

---

## 🐛 Reporting Bugs

### **Before Submitting**

1. Search existing issues
2. Reproduce on latest version
3. Check if it's a known issue

### **Bug Report Template**

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment:**
- Browser: [e.g. Chrome 120]
- Device: [e.g. iPhone 12]
- OS: [e.g. iOS 16]

**Additional context**
Any other relevant information
```

---

## ✨ Feature Requests

### **Feature Request Template**

```markdown
**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should it work?

**Alternatives Considered**
What other approaches did you think about?

**Additional Context**
Mockups, examples, references
```

---

## 🔍 Code Review Process

### **What We Look For**

1. **Functionality:** Does it work as intended?
2. **Tests:** Are there tests? Do they pass?
3. **Code Quality:** Is it readable and maintainable?
4. **Security:** Are there security concerns?
5. **Privacy:** Does it respect user privacy?
6. **Performance:** Is it optimized?
7. **Accessibility:** Is it accessible?
8. **Documentation:** Is it documented?

### **Review Timeline**

- Small PRs (< 200 lines): 1-2 days
- Medium PRs (200-500 lines): 2-4 days
- Large PRs (500+ lines): 4-7 days

**Tip:** Smaller, focused PRs get reviewed faster!

---

## 📖 Documentation Standards

### **Code Comments**

```typescript
/**
 * Brief description of function
 * 
 * @param param1 - Description
 * @param param2 - Description
 * @returns Description of return value
 */
export function myFunction(param1: string, param2: number): Result {
  // Implementation
}
```

### **Component Documentation**

```typescript
/**
 * ComponentName
 * 
 * Description of what the component does
 * 
 * @example
 * <ComponentName prop1="value" />
 */
interface ComponentProps {
  /** Description of prop */
  prop1: string
}
```

### **API Documentation**

Document all endpoints in code comments:

```typescript
/**
 * GET /api/resource
 * 
 * Description
 * 
 * Query params:
 * - param1 (string): Description
 * 
 * Returns:
 * {
 *   success: boolean
 *   data: Resource[]
 * }
 */
```

---

## 🎨 UI/UX Guidelines

### **Design Principles**

1. **Privacy First:** Never show real names/emails
2. **Mobile First:** Design for mobile, enhance for desktop
3. **Accessibility:** WCAG 2.1 AA compliance
4. **Performance:** Optimize for slow connections
5. **Clarity:** Clear labels, helpful error messages

### **Component Checklist**

- [ ] Responsive on all screen sizes
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] Empty states shown
- [ ] Keyboard navigation works
- [ ] Screen reader accessible
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets ≥ 44×44px

---

## 🧪 Testing Guidelines

### **Test Coverage Targets**

- Utilities: 100%
- API routes: 90%+
- Components: 80%+
- E2E: Critical user flows

### **Writing Tests**

```typescript
// Unit test
describe('utilityFunction', () => {
  it('should handle normal case', () => {
    expect(utilityFunction('input')).toBe('output')
  })

  it('should handle edge case', () => {
    expect(utilityFunction('')).toBe('')
  })

  it('should handle error case', () => {
    expect(() => utilityFunction(null)).toThrow()
  })
})
```

---

## ❓ Getting Help

- **Questions:** Open a GitHub Discussion
- **Bugs:** Open a GitHub Issue
- **Chat:** Join our Discord (link TBD)
- **Email:** dev@theglocal.com

---

## 📜 Code of Conduct

### **Our Standards**

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

### **Unacceptable Behavior**

- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information
- Other unprofessional conduct

---

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in the application (if significant contribution)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to Theglocal! Together, we're building something special for local communities.** 🎉

