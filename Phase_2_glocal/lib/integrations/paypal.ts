// PayPal integration - Real REST API v2 implementation
import { logger } from '@/lib/utils/logger'
import crypto from 'crypto'
import { env } from '@/lib/config/env'

// PayPal configuration
const PAYPAL_BASE_URL =
  env.PAYPAL_MODE === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

export interface PayPalSubscription {
  id: string
  status: string
  status_update_time: string
  plan_id: string
  start_time: string
  quantity: string
  shipping_amount: {
    currency_code: string
    value: string
  }
  subscriber: {
    payer_id: string
    email_address: string
    name: {
      given_name: string
      surname: string
    }
  }
  billing_info: {
    outstanding_balance: {
      value: string
      currency_code: string
    }
    failed_payments_count: number
    last_payment: {
      amount: {
        value: string
        currency_code: string
      }
      time: string
    }
    next_billing_time: string
    last_failed_payment: {
      amount: {
        value: string
        currency_code: string
      }
      time: string
    }
  }
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

export interface CreateSubscriptionParams {
  plan_id: string
  subscriber: {
    name: {
      given_name: string
      surname: string
    }
    email_address: string
  }
  application_context: {
    brand_name: string
    locale: string
    shipping_preference: string
    user_action: string
    payment_method: {
      payer_selected: string
      payee_preferred: string
    }
    return_url: string
    cancel_url: string
  }
}

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token')
  }

  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new Error('Failed to get PayPal access token: Missing access_token in response')
  }
  return data.access_token
}

// Create PayPal subscription
export async function createPayPalSubscription(
  params: CreateSubscriptionParams
): Promise<{ id: string; status: string; links: unknown[] }> {
  try {
    const accessToken = await getPayPalAccessToken()

    const subscriptionPayload = {
      plan_id: params.plan_id,
      subscriber: params.subscriber,
      application_context: params.application_context,
    }

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify(subscriptionPayload),
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ message: 'Unknown error' }))) as {
        message?: string
        name?: string
      }
      logger.error('PayPal subscription creation error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      const errorMessage =
        errorData.message || errorData.name || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(`PayPal API error: ${errorMessage}`)
    }

    const subscription = (await response.json()) as {
      id?: string
      status?: string
      links?: unknown[]
    }

    if (!subscription.id) {
      logger.error('PayPal subscription response missing ID:', subscription)
      throw new Error('PayPal subscription creation failed: Invalid response')
    }

    if (!subscription.links || !Array.isArray(subscription.links)) {
      logger.error('PayPal subscription response missing links:', subscription)
      throw new Error('PayPal subscription creation failed: Approval URL not found')
    }

    return {
      id: subscription.id,
      status: subscription.status || 'UNKNOWN',
      links: subscription.links || [],
    }
  } catch (error) {
    logger.error('Error creating PayPal subscription:', error)
    throw new Error('Failed to create PayPal subscription')
  }
}

// Get subscription details
export async function getPayPalSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  try {
    const accessToken = await getPayPalAccessToken()

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string }
      logger.error('PayPal subscription fetch error:', errorData)
      throw new Error(`PayPal API error: ${errorData.message || 'Unknown error'}`)
    }

    return await response.json()
  } catch (error) {
    logger.error('Error fetching PayPal subscription:', error)
    throw new Error('Failed to fetch PayPal subscription')
  }
}

// Cancel subscription
export async function cancelPayPalSubscription(
  subscriptionId: string
): Promise<PayPalSubscription> {
  try {
    const accessToken = await getPayPalAccessToken()

    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'User requested cancellation',
        }),
      }
    )

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string }
      logger.error('PayPal subscription cancellation error:', errorData)
      throw new Error(`PayPal API error: ${errorData.message || 'Unknown error'}`)
    }

    // After cancellation, fetch the updated subscription details
    return await getPayPalSubscription(subscriptionId)
  } catch (error) {
    logger.error('Error cancelling PayPal subscription:', error)
    throw new Error('Failed to cancel PayPal subscription')
  }
}

// Create subscription plan
export async function createPayPalPlan(
  name: string,
  description: string,
  amount: number,
  currency: string = 'USD'
): Promise<{ id: string }> {
  try {
    const accessToken = await getPayPalAccessToken()

    const planPayload = {
      product_id: env.PAYPAL_PRODUCT_ID, // You'll need to create a product first
      name,
      description,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // Infinite billing cycles
          pricing_scheme: {
            fixed_price: {
              value: (amount / 100).toFixed(2), // Convert cents to dollars
              currency_code: currency,
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0.00',
          currency_code: currency,
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
      taxes: {
        percentage: '0.00',
        inclusive: false,
      },
    }

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify(planPayload),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string }
      logger.error('PayPal plan creation error:', errorData)
      throw new Error(`PayPal API error: ${errorData.message || 'Unknown error'}`)
    }

    const plan = (await response.json()) as { id?: string }
    if (!plan.id) {
      throw new Error('PayPal plan creation failed: Missing plan ID in response')
    }
    return { id: plan.id }
  } catch (error) {
    logger.error('Error creating PayPal plan:', error)
    throw new Error('Failed to create PayPal plan')
  }
}

// Verify PayPal webhook signature
export function verifyPayPalWebhookSignature(
  body: string,
  signature: string,
  _webhookId: string
): boolean {
  try {
    // PayPal webhook verification using crypto
    const expectedSignature = crypto
      .createHmac('sha256', env.PAYPAL_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex')

    return signature === expectedSignature
  } catch (error) {
    logger.error('PayPal webhook verification error:', error)
    return false
  }
}

// Initialize PayPal client
export function initializePayPal(): boolean {
  return !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET)
}

// PayPal client configuration
const paypalClient = {
  initialized: initializePayPal(),
  baseUrl: PAYPAL_BASE_URL,
}

export default paypalClient
