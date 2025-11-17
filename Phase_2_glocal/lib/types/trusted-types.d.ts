/**
 * TypeScript definitions for Trusted Types API
 *
 * These types are based on the W3C Trusted Types specification
 * https://w3c.github.io/webappsec-trusted-types/dist/spec/
 *
 * These types are globally available once imported or referenced
 */
declare global {
  interface TrustedHTML {
    toString(): string
  }

  interface TrustedScript {
    toString(): string
  }

  interface TrustedScriptURL {
    toString(): string
  }

  interface TrustedTypePolicyFactory {
    createPolicy(
      name: string,
      policy: TrustedTypePolicyOptions,
      exposed?: boolean
    ): TrustedTypePolicy | null

    defaultPolicy?: TrustedTypePolicy | null

    isHTML(value: unknown): value is TrustedHTML
    isScript(value: unknown): value is TrustedScript
    isScriptURL(value: unknown): value is TrustedScriptURL

    emptyHTML: TrustedHTML
    emptyScript: TrustedScript
    emptyScriptURL: TrustedScriptURL
  }

  interface TrustedTypePolicy {
    createHTML(input: string): TrustedHTML
    createScript?(input: string): TrustedScript
    createScriptURL?(input: string): TrustedScriptURL
    name: string
  }

  interface TrustedTypePolicyOptions {
    createHTML?: (input: string) => string
    createScript?: (input: string) => string
    createScriptURL?: (input: string) => string
  }

  declare const TrustedTypes: TrustedTypePolicyFactory | undefined

  interface Window {
    TrustedTypes?: TrustedTypePolicyFactory
  }
}

export {}
