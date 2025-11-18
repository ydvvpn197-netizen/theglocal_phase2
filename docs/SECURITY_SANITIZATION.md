# HTML Sanitization & XSS Protection

## Overview

All `dangerouslySetInnerHTML` usage in the codebase is now protected by **DOMPurify** sanitization to prevent XSS (Cross-Site Scripting) attacks. This is a critical security measure for any user-generated content or external data rendered as HTML.

## Implementation

### Library: DOMPurify

- **Package**: `dompurify` + `@types/dompurify`
- **Purpose**: Industry-standard HTML sanitization library
- **Location**: `lib/security/sanitize.ts`

### Sanitization Functions

#### 1. `sanitizeHTML(html: string, config?: DOMPurify.Config): string`

General-purpose HTML sanitization with safe defaults.

**Use for**: General HTML content from external sources.

```typescript
import { sanitizeHTML } from '@/lib/security/sanitize'

const safeHtml = sanitizeHTML(untrustedHtml)
```

#### 2. `sanitizeSVG(svg: string): string`

Specialized sanitization for SVG content (avatars, icons).

**Use for**: User avatars, dynamically generated SVG graphics.

```typescript
import { createSafeSVG } from '@/lib/security/sanitize'

const avatarSvg = generateGeometricAvatar(seed)
const safeSvg = createSafeSVG(avatarSvg)

<div dangerouslySetInnerHTML={safeSvg} />
```

#### 3. `sanitizeUserContent(html: string): string`

Restrictive sanitization for user-generated content (comments, posts).

**Use for**: Rich text editor output, user comments, post descriptions.

```typescript
import { sanitizeUserContent } from '@/lib/security/sanitize'

const sanitized = sanitizeUserContent(userInput)
<div dangerouslySetInnerHTML={{ __html: sanitized }} />
```

### Helper Functions

#### `createSafeHTML(html: string): { __html: string }`

Type-safe wrapper for general HTML.

#### `createSafeSVG(svg: string): { __html: string }`

Type-safe wrapper for SVG content.

#### `createSafeUserContent(html: string): { __html: string }`

Type-safe wrapper for user-generated content.

## Files Protected

All instances of `dangerouslySetInnerHTML` are now sanitized:

1. **Avatar Rendering** (SVG sanitization):
   - `components/posts/comment-thread.tsx`
   - `components/polls/poll-card.tsx`
   - `components/polls/poll-comment-thread.tsx`

2. **News Article Content** (User content sanitization):
   - `app/news/[id]/page.tsx`

## Security Configuration

### Allowed HTML Tags

**General HTML**: `p`, `br`, `strong`, `em`, `u`, `a`, `ul`, `ol`, `li`, `h1-h6`, `blockquote`, `code`, `pre`, `img`, `span`, `div`

**SVG**: `svg`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `g`, `defs`, `clipPath`, `use`, `text`, `tspan`

### Forbidden Elements

- `<script>` - JavaScript execution
- `<iframe>` - Embedded content
- `<object>`, `<embed>` - Plugins
- `<form>`, `<input>` - Form elements
- Event handlers (`onclick`, `onerror`, `onload`, etc.)

### Dangerous Protocols Blocked

- `javascript:` - JavaScript protocol
- `vbscript:` - VBScript protocol
- `data:text/javascript` - Data URLs with scripts
- `data:text/html` - Data URLs with HTML

## Server-Side Rendering (SSR) Fallback

When running on the server (SSR), DOMPurify is not available (requires DOM). A basic regex-based sanitizer is used as fallback:

- Removes `<script>` tags
- Removes `<iframe>` tags
- Strips event handlers
- Removes dangerous protocols

⚠️ **Note**: The server-side fallback is less robust. Client-side sanitization is the primary defense.

## Best Practices

### 1. Always Use Sanitization

Never use `dangerouslySetInnerHTML` without sanitization:

```typescript
// ❌ BAD - No sanitization
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ GOOD - With sanitization
import { createSafeUserContent } from '@/lib/security/sanitize'
<div dangerouslySetInnerHTML={createSafeUserContent(userInput)} />
```

### 2. Choose the Right Sanitizer

- **SVG avatars/icons**: Use `createSafeSVG()`
- **User comments/posts**: Use `createSafeUserContent()`
- **External HTML**: Use `createSafeHTML()`

### 3. Client-Side Sanitization

Perform sanitization on the client side when possible:

```typescript
const [sanitizedContent, setSanitizedContent] = useState<string>('')

useEffect(() => {
  setSanitizedContent(sanitizeUserContent(content))
}, [content])
```

### 4. Prefer Text Over HTML

When possible, render text content instead of HTML:

```typescript
// Prefer this
<p>{userComment}</p>

// Over this
<div dangerouslySetInnerHTML={createSafeUserContent(userComment)} />
```

## Testing

### Manual Testing

1. Try injecting `<script>alert('XSS')</script>` in user inputs
2. Try `<img src=x onerror=alert('XSS')>`
3. Try `<a href="javascript:alert('XSS')">Click</a>`

All should be safely sanitized and not execute.

### Automated Testing

Add tests for sanitization functions:

```typescript
import { sanitizeHTML, sanitizeSVG, sanitizeUserContent } from '@/lib/security/sanitize'

describe('Sanitization', () => {
  test('removes script tags', () => {
    const dirty = '<p>Hello<script>alert("XSS")</script></p>'
    expect(sanitizeHTML(dirty)).not.toContain('<script>')
  })

  test('removes event handlers', () => {
    const dirty = '<img src="x" onerror="alert(1)">'
    expect(sanitizeHTML(dirty)).not.toContain('onerror')
  })

  test('removes javascript protocol', () => {
    const dirty = '<a href="javascript:alert(1)">Click</a>'
    expect(sanitizeHTML(dirty)).not.toContain('javascript:')
  })
})
```

## Content Security Policy (CSP)

DOMPurify sanitization works **in addition to** CSP headers. Both layers provide defense-in-depth:

1. **DOMPurify**: Removes dangerous HTML before rendering
2. **CSP**: Browser-level protection against script execution

Recommended CSP header (in `next.config.js`):

```javascript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
}
```

## Maintenance

### Adding New dangerouslySetInnerHTML Usage

1. Import appropriate sanitization function
2. Sanitize content before rendering
3. Add comment explaining why HTML rendering is necessary
4. Test with XSS payloads

### Updating DOMPurify

```bash
npm update dompurify @types/dompurify
```

Check [DOMPurify releases](https://github.com/cure53/DOMPurify/releases) for security updates.

## References

- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [React dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Audit Trail

- **2025-11-14**: Implemented DOMPurify sanitization across all `dangerouslySetInnerHTML` usage
- **Files Updated**: 4 component files + 1 utility library
- **Security Risk**: **High → Low** (XSS protection now in place)
