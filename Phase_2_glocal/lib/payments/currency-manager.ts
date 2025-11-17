/**
 * Currency Manager
 * Handles multi-currency support and exchange rate management
 */

import { logger } from '@/lib/utils/logger'
import { redisUtils, RedisKeys } from '@/lib/redis/client'

export type SupportedCurrency = 'INR' | 'USD' | 'EUR'

export interface ExchangeRate {
  from: SupportedCurrency
  to: SupportedCurrency
  rate: number
  timestamp: Date
  source: string
}

export interface CurrencyConfig {
  defaultCurrency: SupportedCurrency
  supportedCurrencies: SupportedCurrency[]
  exchangeRateCacheTTL: number // in milliseconds
  fallbackRate: number
}

const DEFAULT_CONFIG: CurrencyConfig = {
  defaultCurrency: 'INR',
  supportedCurrencies: ['INR', 'USD', 'EUR'],
  exchangeRateCacheTTL: 60 * 60 * 1000, // 1 hour
  fallbackRate: 1.0,
}

export class CurrencyManager {
  private config: CurrencyConfig

  constructor(config: Partial<CurrencyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get exchange rate between currencies
   */
  async getExchangeRate(from: SupportedCurrency, to: SupportedCurrency): Promise<number> {
    if (from === to) {
      return 1.0
    }

    try {
      // Check cache first
      const cacheKey = RedisKeys.exchangeRate(from, to)
      const cachedRate = await redisUtils.get(cacheKey)

      if (cachedRate) {
        const rateData = JSON.parse(cachedRate)
        return rateData.rate
      }

      // Fetch from external API
      const rate = await this.fetchExchangeRate(from, to)

      // Cache the rate
      const rateData = {
        rate,
        timestamp: new Date().toISOString(),
        source: 'external_api',
      }

      await redisUtils.setex(
        cacheKey,
        Math.floor(this.config.exchangeRateCacheTTL / 1000),
        JSON.stringify(rateData)
      )

      return rate
    } catch (error) {
      logger.error('Error getting exchange rate:', error)
      return this.config.fallbackRate
    }
  }

  /**
   * Convert amount between currencies
   */
  async convertAmount(
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency
  ): Promise<number> {
    if (from === to) {
      return amount
    }

    const rate = await this.getExchangeRate(from, to)
    return Math.round(amount * rate)
  }

  /**
   * Convert amount to smallest currency unit (paise/cents)
   */
  toSmallestUnit(amount: number, currency: SupportedCurrency): number {
    switch (currency) {
      case 'INR':
        return Math.round(amount * 100) // Convert to paise
      case 'USD':
      case 'EUR':
        return Math.round(amount * 100) // Convert to cents
      default:
        return Math.round(amount * 100)
    }
  }

  /**
   * Convert from smallest currency unit to main unit
   */
  fromSmallestUnit(amount: number, currency: SupportedCurrency): number {
    switch (currency) {
      case 'INR':
        return amount / 100 // Convert from paise
      case 'USD':
      case 'EUR':
        return amount / 100 // Convert from cents
      default:
        return amount / 100
    }
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(amount: number, currency: SupportedCurrency): string {
    const mainAmount = this.fromSmallestUnit(amount, currency)

    switch (currency) {
      case 'INR':
        return `₹${mainAmount.toFixed(2)}`
      case 'USD':
        return `$${mainAmount.toFixed(2)}`
      case 'EUR':
        return `€${mainAmount.toFixed(2)}`
      default:
        return `${currency} ${mainAmount.toFixed(2)}`
    }
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: SupportedCurrency): string {
    switch (currency) {
      case 'INR':
        return '₹'
      case 'USD':
        return '$'
      case 'EUR':
        return '€'
      default:
        return currency
    }
  }

  /**
   * Validate currency code
   */
  isValidCurrency(currency: string): currency is SupportedCurrency {
    return this.config.supportedCurrencies.includes(currency as SupportedCurrency)
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): SupportedCurrency[] {
    return [...this.config.supportedCurrencies]
  }

  /**
   * Get default currency
   */
  getDefaultCurrency(): SupportedCurrency {
    return this.config.defaultCurrency
  }

  /**
   * Fetch exchange rate from external API
   */
  private async fetchExchangeRate(from: SupportedCurrency, to: SupportedCurrency): Promise<number> {
    try {
      // Use a free exchange rate API (e.g., exchangerate-api.com)
      const apiKey = process.env.EXCHANGE_RATE_API_KEY
      if (!apiKey) {
        logger.warn('Exchange rate API key not configured, using fallback rate')
        return this.config.fallbackRate
      }

      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      )

      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.status}`)
      }

      const data = (await response.json()) as {
        result?: string
        conversion_rate?: number
        error?: string
      }

      if (data.result === 'success' && typeof data.conversion_rate === 'number') {
        return data.conversion_rate
      } else {
        throw new Error(`Exchange rate API error: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      logger.error('Error fetching exchange rate:', error)

      // Fallback to hardcoded rates (should be updated regularly)
      return this.getFallbackRate(from, to)
    }
  }

  /**
   * Get fallback exchange rates
   */
  private getFallbackRate(from: SupportedCurrency, to: SupportedCurrency): number {
    // These rates should be updated regularly
    const fallbackRates: Record<string, number> = {
      INR_USD: 0.012, // 1 INR = 0.012 USD
      INR_EUR: 0.011, // 1 INR = 0.011 EUR
      USD_INR: 83.0, // 1 USD = 83 INR
      USD_EUR: 0.92, // 1 USD = 0.92 EUR
      EUR_INR: 90.0, // 1 EUR = 90 INR
      EUR_USD: 1.09, // 1 EUR = 1.09 USD
    }

    const key = `${from}_${to}`
    return fallbackRates[key] || this.config.fallbackRate
  }

  /**
   * Get currency information
   */
  getCurrencyInfo(currency: SupportedCurrency): {
    code: SupportedCurrency
    symbol: string
    name: string
    decimalPlaces: number
  } {
    const info = {
      INR: {
        code: 'INR' as SupportedCurrency,
        symbol: '₹',
        name: 'Indian Rupee',
        decimalPlaces: 2,
      },
      USD: { code: 'USD' as SupportedCurrency, symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
      EUR: { code: 'EUR' as SupportedCurrency, symbol: '€', name: 'Euro', decimalPlaces: 2 },
    }

    return info[currency]
  }

  /**
   * Calculate payment amount in different currencies
   */
  async calculatePaymentAmounts(
    baseAmount: number,
    baseCurrency: SupportedCurrency
  ): Promise<Record<SupportedCurrency, number>> {
    const amounts: Partial<Record<SupportedCurrency, number>> = {}

    for (const currency of this.config.supportedCurrencies) {
      if (currency === baseCurrency) {
        amounts[currency] = baseAmount
      } else {
        const convertedAmount = await this.convertAmount(baseAmount, baseCurrency, currency)
        amounts[currency] = convertedAmount
      }
    }

    return amounts as Record<SupportedCurrency, number>
  }

  /**
   * Get exchange rate history (if available)
   */
  async getExchangeRateHistory(
    _from: SupportedCurrency,
    _to: SupportedCurrency,
    _days: number = 7
  ): Promise<ExchangeRate[]> {
    try {
      // This would typically fetch from a historical data API
      // For now, return empty array
      return []
    } catch (error) {
      logger.error('Error fetching exchange rate history:', error)
      return []
    }
  }

  /**
   * Clear exchange rate cache
   */
  async clearExchangeRateCache(): Promise<void> {
    try {
      const pattern = 'exchange_rate:*'
      await redisUtils.delPattern(pattern)
    } catch (error) {
      logger.error('Error clearing exchange rate cache:', error)
    }
  }

  /**
   * Get cached exchange rates
   */
  async getCachedExchangeRates(): Promise<Record<string, ExchangeRate>> {
    try {
      const pattern = 'exchange_rate:*'
      const keys = await redisUtils.keys(pattern)

      if (keys.length === 0) {
        return {}
      }

      const rates: Record<string, ExchangeRate> = {}

      for (const key of keys) {
        const cachedData = await redisUtils.get(key)
        if (cachedData) {
          const rateData = JSON.parse(cachedData)
          rates[key] = {
            from: rateData.from,
            to: rateData.to,
            rate: rateData.rate,
            timestamp: new Date(rateData.timestamp),
            source: rateData.source,
          }
        }
      }

      return rates
    } catch (error) {
      logger.error('Error getting cached exchange rates:', error)
      return {}
    }
  }
}

// Export singleton instance
export const currencyManager = new CurrencyManager()
