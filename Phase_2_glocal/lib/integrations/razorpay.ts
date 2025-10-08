import Razorpay from 'razorpay'
import crypto from 'crypto'

// Initialize Razorpay client
// Initialize Razorpay client with proper error handling
let razorpay: Razorpay | null = null

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
} catch (error) {
  console.warn('Razorpay client not initialized:', error)
}

export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  receipt: string
  status: string
  created_at: number
}

export interface RazorpayPayment {
  id: string
  order_id: string
  amount: number
  currency: string
  status: string
  method: string
  created_at: number
}

export interface RazorpaySubscription {
  id: string
  plan_id: string
  status: string
  current_start: number
  current_end: number
  ended_at: number | null
  quantity: number
  customer_notify: boolean
  created_at: number
  charge_at: number
  start_at: number
  end_at: number
  auth_attempts: number
  total_count: number
  paid_count: number
  customer_details: {
    id: string
    name: string
    email: string
    contact: string
  }
  short_url: string
  has_scheduled_changes: boolean
  change_scheduled_at: number | null
  remaining_count: number
}

export interface CreateOrderParams {
  amount: number
  currency?: string
  receipt: string
  notes?: Record<string, string>
}

export interface CreateSubscriptionParams {
  plan_id: string
  customer_notify: boolean
  quantity: number
  total_count: number
  start_at: number
  expire_by: number
  notes?: Record<string, string>
}

export interface WebhookEvent {
  event: string
  account_id: string
  created_at: number
  contains: string[]
  payload: {
    payment?: RazorpayPayment
    subscription?: RazorpaySubscription
    order?: RazorpayOrder
  }
}

// Create a new order
export async function createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const order = await razorpay.orders.create({
      amount: params.amount,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes,
    })

    return order as unknown as RazorpayOrder
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    throw new Error('Failed to create payment order')
  }
}

// Create a subscription
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<RazorpaySubscription> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: params.plan_id,
      customer_notify: params.customer_notify,
      quantity: params.quantity,
      total_count: params.total_count,
      start_at: params.start_at,
      expire_by: params.expire_by,
      notes: params.notes,
    })

    return subscription as unknown as RazorpaySubscription
  } catch (error) {
    console.error('Error creating Razorpay subscription:', error)
    throw new Error('Failed to create subscription')
  }
}

// Verify payment signature
export function verifyPaymentSignature(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): boolean {
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest('hex')

  return expectedSignature === razorpay_signature
}

// Verify webhook signature
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

// Get subscription details
export async function getSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const subscription = await razorpay.subscriptions.fetch(subscriptionId)
    return subscription as unknown as RazorpaySubscription
  } catch (error) {
    console.error('Error fetching subscription:', error)
    throw new Error('Failed to fetch subscription details')
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const subscription = await razorpay.subscriptions.cancel(subscriptionId)
    return subscription as unknown as RazorpaySubscription
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

// Pause subscription
export async function pauseSubscription(
  subscriptionId: string,
  pauseAt: number
): Promise<RazorpaySubscription> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const subscription = await razorpay.subscriptions.pause(subscriptionId, {
      pause_at: pauseAt === 0 ? 'now' : 'now', // Razorpay only supports 'now' for pause_at
    })
    return subscription as unknown as RazorpaySubscription
  } catch (error) {
    console.error('Error pausing subscription:', error)
    throw new Error('Failed to pause subscription')
  }
}

// Resume subscription
export async function resumeSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const subscription = await razorpay.subscriptions.resume(subscriptionId)
    return subscription as unknown as RazorpaySubscription
  } catch (error) {
    console.error('Error resuming subscription:', error)
    throw new Error('Failed to resume subscription')
  }
}

// Get payment details
export async function getPayment(paymentId: string): Promise<RazorpayPayment> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId)
    return payment as RazorpayPayment
  } catch (error) {
    console.error('Error fetching payment:', error)
    throw new Error('Failed to fetch payment details')
  }
}

// Create a plan (for initial setup)
export async function createPlan(
  period: 'monthly' | 'yearly',
  amount: number,
  currency: string = 'INR'
): Promise<{
  id: string
  period: string
  interval: number
  item: { name: string; amount: number; currency: string }
}> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const plan = await razorpay.plans.create({
      period,
      interval: period === 'monthly' ? 1 : 12,
      item: {
        name: `Artist Subscription - ${period}`,
        amount: amount,
        currency: currency,
        description: `Monthly subscription for artists - ₹${amount}`,
      },
    })

    return plan as unknown as {
      id: string
      period: string
      interval: number
      item: { name: string; amount: number; currency: string }
    }
  } catch (error) {
    console.error('Error creating plan:', error)
    throw new Error('Failed to create subscription plan')
  }
}

// Get all plans
export async function getPlans(): Promise<
  {
    id: string
    period: string
    interval: number
    item: { name: string; amount: number; currency: string }
  }[]
> {
  if (!razorpay) {
    throw new Error('Razorpay client not initialized. Please check your environment variables.')
  }

  try {
    const plans = await razorpay.plans.all()
    return plans.items as unknown as {
      id: string
      period: string
      interval: number
      item: { name: string; amount: number; currency: string }
    }[]
  } catch (error) {
    console.error('Error fetching plans:', error)
    throw new Error('Failed to fetch subscription plans')
  }
}

export default razorpay
