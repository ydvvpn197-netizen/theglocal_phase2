import { Resend } from 'resend'

// Initialize Resend client
let resend: Resend | null = null

try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
} catch (error) {
  console.warn('Resend client not initialized:', error)
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export interface EmailResponse {
  id: string
  from: string
  to: string[]
  created_at: string
}

/**
 * Send an email using Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResponse> {
  if (!resend) {
    throw new Error('Resend client not initialized. Please check RESEND_API_KEY environment variable.')
  }

  const { to, subject, html, from, replyTo } = params

  try {
    const data = await resend.emails.send({
      from: from || process.env.RESEND_FROM_EMAIL || 'Theglocal <noreply@theglocal.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo,
    })

    return data as unknown as EmailResponse
  } catch (error) {
    console.error('Error sending email:', error)
    throw new Error('Failed to send email')
  }
}

/**
 * Send subscription renewal reminder email
 */
export async function sendSubscriptionRenewalReminder(
  email: string,
  artistName: string,
  renewalDate: string,
  amount: number
): Promise<EmailResponse> {
  const subject = 'Your Theglocal Artist Subscription is Renewing Soon'
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Renewal Reminder</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Theglocal</h1>
    <p style="color: #f0f0f0; margin: 10px 0 0 0;">Your Local Community Platform</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #667eea; margin-top: 0;">Subscription Renewal Reminder</h2>
    
    <p>Hi <strong>${artistName}</strong>,</p>
    
    <p>This is a friendly reminder that your Theglocal Artist subscription will renew soon.</p>
    
    <div style="background: #f9f9f9; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Renewal Date:</strong> ${renewalDate}</p>
      <p style="margin: 10px 0 0 0;"><strong>Amount:</strong> ₹${amount}</p>
    </div>
    
    <p>Your subscription will automatically renew on the date above using your saved payment method.</p>
    
    <h3 style="color: #333; margin-top: 30px;">What's Included:</h3>
    <ul style="padding-left: 20px;">
      <li>Unlimited event creation</li>
      <li>Direct booking requests from clients</li>
      <li>Portfolio showcase with 10 images</li>
      <li>Profile analytics and insights</li>
      <li>Featured in local artist discovery</li>
    </ul>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Need to make changes?</strong><br>
        You can manage your subscription anytime from your <a href="https://theglocal.com/artists/dashboard" style="color: #667eea; text-decoration: none;">artist dashboard</a>.
      </p>
      
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">
        To cancel your subscription, visit your dashboard before the renewal date.
      </p>
    </div>
    
    <div style="margin-top: 30px; text-align: center;">
      <a href="https://theglocal.com/artists/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Manage Subscription
      </a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>
      Theglocal - Privacy-First Local Community Platform<br>
      <a href="https://theglocal.com/privacy" style="color: #999; text-decoration: none;">Privacy Policy</a> | 
      <a href="https://theglocal.com/terms" style="color: #999; text-decoration: none;">Terms of Service</a>
    </p>
    <p style="margin-top: 10px;">
      This is an automated notification. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `

  return sendEmail({
    to: email,
    subject,
    html,
  })
}

/**
 * Send subscription expired notification
 */
export async function sendSubscriptionExpiredNotification(
  email: string,
  artistName: string,
  gracePeriodEndDate: string
): Promise<EmailResponse> {
  const subject = 'Your Theglocal Artist Subscription Has Expired'
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Expired</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Theglocal</h1>
    <p style="color: #f0f0f0; margin: 10px 0 0 0;">Your Local Community Platform</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #e74c3c; margin-top: 0;">Subscription Expired</h2>
    
    <p>Hi <strong>${artistName}</strong>,</p>
    
    <p>Your Theglocal Artist subscription has expired. We noticed there was an issue with your payment method.</p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>⚠️ Grace Period:</strong> You have until <strong>${gracePeriodEndDate}</strong> to renew your subscription.</p>
      <p style="margin: 10px 0 0 0;">After this date, your profile will be hidden from public view.</p>
    </div>
    
    <h3 style="color: #333; margin-top: 30px;">What This Means:</h3>
    <ul style="padding-left: 20px;">
      <li>Your profile is still visible during the 15-day grace period</li>
      <li>You won't be able to create new events</li>
      <li>Existing bookings are not affected</li>
      <li>After the grace period, your profile will be hidden</li>
    </ul>
    
    <div style="margin-top: 30px; text-align: center;">
      <a href="https://theglocal.com/artists/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Renew Subscription
      </a>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Need help?</strong><br>
        Contact us at <a href="mailto:support@theglocal.com" style="color: #667eea; text-decoration: none;">support@theglocal.com</a>
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>
      Theglocal - Privacy-First Local Community Platform<br>
      <a href="https://theglocal.com/privacy" style="color: #999; text-decoration: none;">Privacy Policy</a> | 
      <a href="https://theglocal.com/terms" style="color: #999; text-decoration: none;">Terms of Service</a>
    </p>
  </div>
</body>
</html>
  `

  return sendEmail({
    to: email,
    subject,
    html,
  })
}

export default resend

