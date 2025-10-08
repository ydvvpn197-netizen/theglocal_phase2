import {
  createOrder,
  createSubscription,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  getPayment,
  createPlan,
  getPlans,
} from './razorpay'

// Mock Razorpay
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      fetch: jest.fn(),
      cancel: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    },
    payments: {
      fetch: jest.fn(),
    },
    plans: {
      create: jest.fn(),
      all: jest.fn(),
    },
  }))
})

// Mock crypto
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-signature'),
  })),
}))

describe('Razorpay Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RAZORPAY_KEY_ID = 'test-key-id'
    process.env.RAZORPAY_KEY_SECRET = 'test-key-secret'
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret'
  })

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const mockOrder = {
        id: 'order_123',
        amount: 50000,
        currency: 'INR',
        receipt: 'receipt_123',
        status: 'created',
        created_at: Date.now(),
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        orders: {
          create: jest.fn().mockResolvedValue(mockOrder),
        },
      }))

      const result = await createOrder({
        amount: 50000,
        currency: 'INR',
        receipt: 'receipt_123',
        notes: { test: 'value' },
      })

      expect(result).toEqual(mockOrder)
    })

    it('should handle order creation errors', async () => {
      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        orders: {
          create: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      }))

      await expect(
        createOrder({
          amount: 50000,
          currency: 'INR',
          receipt: 'receipt_123',
        })
      ).rejects.toThrow('Failed to create payment order')
    })
  })

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        plan_id: 'plan_123',
        status: 'created',
        current_start: Date.now(),
        current_end: Date.now() + 30 * 24 * 60 * 60 * 1000,
        created_at: Date.now(),
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        subscriptions: {
          create: jest.fn().mockResolvedValue(mockSubscription),
        },
      }))

      const result = await createSubscription({
        plan_id: 'plan_123',
        customer_notify: true,
        quantity: 1,
        total_count: 12,
        start_at: Date.now(),
        expire_by: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })

      expect(result).toEqual(mockSubscription)
    })

    it('should handle subscription creation errors', async () => {
      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        subscriptions: {
          create: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      }))

      await expect(
        createSubscription({
          plan_id: 'plan_123',
          customer_notify: true,
          quantity: 1,
          total_count: 12,
          start_at: Date.now(),
          expire_by: Date.now() + 30 * 24 * 60 * 60 * 1000,
        })
      ).rejects.toThrow('Failed to create subscription')
    })
  })

  describe('verifyPaymentSignature', () => {
    it('should verify valid payment signature', () => {
      const result = verifyPaymentSignature('order_123', 'payment_123', 'mocked-signature')

      expect(result).toBe(true)
    })

    it('should reject invalid payment signature', () => {
      const result = verifyPaymentSignature('order_123', 'payment_123', 'invalid-signature')

      expect(result).toBe(false)
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const result = verifyWebhookSignature('test-body', 'mocked-signature')

      expect(result).toBe(true)
    })

    it('should reject invalid webhook signature', () => {
      const result = verifyWebhookSignature('test-body', 'invalid-signature')

      expect(result).toBe(false)
    })
  })

  describe('getSubscription', () => {
    it('should fetch subscription details', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        current_start: Date.now(),
        current_end: Date.now() + 30 * 24 * 60 * 60 * 1000,
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        subscriptions: {
          fetch: jest.fn().mockResolvedValue(mockSubscription),
        },
      }))

      const result = await getSubscription('sub_123')

      expect(result).toEqual(mockSubscription)
    })

    it('should handle subscription fetch errors', async () => {
      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        subscriptions: {
          fetch: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      }))

      await expect(getSubscription('sub_123')).rejects.toThrow(
        'Failed to fetch subscription details'
      )
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'cancelled',
        ended_at: Date.now(),
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        subscriptions: {
          cancel: jest.fn().mockResolvedValue(mockSubscription),
        },
      }))

      const result = await cancelSubscription('sub_123')

      expect(result).toEqual(mockSubscription)
    })

    it('should handle cancellation errors', async () => {
      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        subscriptions: {
          cancel: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      }))

      await expect(cancelSubscription('sub_123')).rejects.toThrow('Failed to cancel subscription')
    })
  })

  describe('pauseSubscription', () => {
    it('should pause subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'paused',
        paused_at: Date.now(),
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        subscriptions: {
          pause: jest.fn().mockResolvedValue(mockSubscription),
        },
      }))

      const result = await pauseSubscription('sub_123', Date.now())

      expect(result).toEqual(mockSubscription)
    })
  })

  describe('resumeSubscription', () => {
    it('should resume subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        resumed_at: Date.now(),
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        subscriptions: {
          resume: jest.fn().mockResolvedValue(mockSubscription),
        },
      }))

      const result = await resumeSubscription('sub_123')

      expect(result).toEqual(mockSubscription)
    })
  })

  describe('getPayment', () => {
    it('should fetch payment details', async () => {
      const mockPayment = {
        id: 'payment_123',
        amount: 50000,
        currency: 'INR',
        status: 'captured',
        method: 'card',
        created_at: Date.now(),
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        payments: {
          fetch: jest.fn().mockResolvedValue(mockPayment),
        },
      }))

      const result = await getPayment('payment_123')

      expect(result).toEqual(mockPayment)
    })
  })

  describe('createPlan', () => {
    it('should create a new plan', async () => {
      const mockPlan = {
        id: 'plan_123',
        period: 'monthly',
        interval: 1,
        item: {
          name: 'Artist Subscription - monthly',
          amount: 50000,
          currency: 'INR',
        },
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        plans: {
          create: jest.fn().mockResolvedValue(mockPlan),
        },
      }))

      const result = await createPlan('monthly', 50000, 'INR')

      expect(result).toEqual(mockPlan)
    })
  })

  describe('getPlans', () => {
    it('should fetch all plans', async () => {
      const mockPlans = {
        items: [
          { id: 'plan_1', period: 'monthly' },
          { id: 'plan_2', period: 'yearly' },
        ],
      }

      const mockRazorpay = jest.requireMock('razorpay')
      mockRazorpay.mockImplementation(() => ({
        plans: {
          all: jest.fn().mockResolvedValue(mockPlans),
        },
      }))

      const result = await getPlans()

      expect(result).toEqual(mockPlans.items)
    })
  })
})
