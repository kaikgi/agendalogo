import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kiwify-secret, x-kiwify-token',
}

// Kiwify event types we handle
const KIWIFY_EVENTS = {
  ORDER_APPROVED: 'order_approved',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_PAST_DUE: 'subscription_past_due',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed',
  ORDER_REFUNDED: 'order_refunded',
  ORDER_CHARGEDBACK: 'order_chargedback',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
} as const

// Map Kiwify checkout URLs to plan codes
// These are the product IDs from the Kiwify checkouts
const PRODUCT_TO_PLAN: Record<string, string> = {
  // Map by product_id (from Kiwify payload)
  'ee404462-1c75-40a6-a914-651bee84a42f': 'basic', // Update with real Kiwify product IDs
}

// Map plan names/product names to plan codes (fallback)
function detectPlanFromProductName(productName: string): string {
  const name = productName.toLowerCase()
  if (name.includes('studio')) return 'studio'
  if (name.includes('essencial') || name.includes('essential')) return 'essential'
  if (name.includes('básico') || name.includes('basic') || name.includes('basico')) return 'basic'
  return 'basic' // Default to basic
}

// Kiwify Webhook Payload structure (actual from their API)
interface KiwifyWebhookPayload {
  // Root level fields
  order_id?: string
  order_ref?: string
  order_status?: string
  subscription_id?: string
  payment_method?: string
  installments?: number
  card_type?: string
  card_last4digits?: string
  created_at?: string
  updated_at?: string
  approved_date?: string
  refunded_at?: string
  access_url?: string
  store_id?: string
  product_type?: string
  sale_type?: string
  webhook_event_type?: string

  // Nested Customer object (Kiwify uses PascalCase)
  Customer?: {
    email?: string
    full_name?: string
    first_name?: string
    mobile?: string
    ip?: string
    city?: string
    state?: string
    street?: string
    neighborhood?: string
    number?: string
    complement?: string
    zipcode?: string
    cnpj?: string
    instagram?: string
  }

  // Nested Product object
  Product?: {
    product_id?: string
    product_name?: string
  }

  // Nested Subscription object
  Subscription?: {
    id?: string
    status?: string
    start_date?: string
    next_payment?: string
    plan?: {
      id?: string
      name?: string
      frequency?: string
      qty_charges?: number
    }
    charges?: {
      completed?: Array<{
        order_id?: string
        amount?: number
        status?: string
        created_at?: string
        installments?: number
        card_type?: string
        card_first_digits?: string
        card_last_digits?: string
      }>
      future?: Array<{
        charge_date?: string
      }>
    }
  }

  // Nested TrackingParameters (for user_id passthrough)
  TrackingParameters?: {
    src?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    s1?: string
    s2?: string
    s3?: string
    sck?: string
    // Custom params we can add to checkout URL
    user_id?: string
    establishment_id?: string
  }

  // Nested Commissions
  Commissions?: {
    charge_amount?: number
    currency?: string
    product_base_price?: number
    kiwify_fee?: number
    my_commission?: number
    settlement_amount?: number
    commissioned_stores?: Array<{
      id?: string
      email?: string
      type?: string
      value?: number
      custom_name?: string
      affiliate_id?: string
    }>
  }

  // Legacy flat fields (some Kiwify payloads might still use these)
  customer_email?: string
  customer_name?: string
  customer_phone?: string
  product_id?: string
  product_name?: string
  price?: number
}

serve(async (req) => {
  const url = new URL(req.url)
  const method = req.method
  
  console.log(`[KIWIFY] ${method} ${url.pathname}${url.search}`)

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Health check endpoint - GET returns ok
  if (method === 'GET') {
    console.log('[KIWIFY] Health check requested')
    return new Response(
      JSON.stringify({ 
        ok: true, 
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        message: 'Kiwify webhook endpoint is ready'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Only accept POST for webhook
  if (method !== 'POST') {
    console.log(`[KIWIFY] Method not allowed: ${method}`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Validate webhook secret - check header first, then query param
    const headerSecret = req.headers.get('x-kiwify-secret') || req.headers.get('x-kiwify-token')
    const queryToken = url.searchParams.get('token')
    const receivedToken = headerSecret || queryToken
    const expectedSecret = Deno.env.get('KIWIFY_WEBHOOK_SECRET')

    // Log partial token for debugging (last 4 chars only)
    const tokenSuffix = receivedToken ? `...${receivedToken.slice(-4)}` : 'none'
    const expectedSuffix = expectedSecret ? `...${expectedSecret.slice(-4)}` : 'not-set'
    console.log(`[KIWIFY] Token validation - received: ${tokenSuffix}, expected: ${expectedSuffix}`)

    if (!expectedSecret) {
      console.error('[KIWIFY] ERROR: KIWIFY_WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!receivedToken || receivedToken !== expectedSecret) {
      console.error('[KIWIFY] ERROR: Invalid or missing webhook token')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse payload
    let payload: KiwifyWebhookPayload
    try {
      payload = await req.json()
    } catch (parseError) {
      console.error('[KIWIFY] ERROR: Failed to parse JSON body')
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract customer email - try nested Customer object first (Kiwify's actual structure)
    const customerEmail = payload.Customer?.email || payload.customer_email
    const customerName = payload.Customer?.full_name || payload.customer_name
    const productId = payload.Product?.product_id || payload.product_id
    const productName = payload.Product?.product_name || payload.product_name

    console.log('[KIWIFY] Payload received:', JSON.stringify({
      event: payload.webhook_event_type,
      order_id: payload.order_id,
      product_id: productId,
      product_name: productName,
      customer_email: customerEmail,
      customer_name: customerName,
      subscription_id: payload.subscription_id || payload.Subscription?.id,
      subscription_status: payload.Subscription?.status,
    }))

    // Extract event info
    const eventType = payload.webhook_event_type || 'unknown'
    const eventId = payload.order_id || payload.subscription_id || payload.Subscription?.id || crypto.randomUUID()

    // Create Supabase client with service role (bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[KIWIFY] ERROR: Missing Supabase credentials')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Idempotency check - try to insert event
    const { data: insertedEvent, error: insertError } = await supabase
      .from('billing_webhook_events')
      .insert({
        provider: 'kiwify',
        event_id: eventId,
        event_type: eventType,
        payload: payload as unknown,
      })
      .select()
      .single()

    // If event already exists (duplicate), return success without reprocessing
    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        console.log(`[KIWIFY] Duplicate event, skipping: ${eventId}`)
        return new Response(
          JSON.stringify({ ok: true, dedup: true, message: 'Event already processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.error('[KIWIFY] ERROR inserting event:', insertError)
      throw insertError
    }

    // Process the event
    let processingError: string | null = null
    
    try {
      await processKiwifyEvent(supabase, payload, eventType)
      console.log(`[KIWIFY] Event processed successfully: ${eventType} (${eventId})`)
    } catch (err) {
      processingError = err instanceof Error ? err.message : String(err)
      console.error('[KIWIFY] ERROR processing event:', processingError)
    }

    // Update event with processing result
    await supabase
      .from('billing_webhook_events')
      .update({
        processed_at: new Date().toISOString(),
        processing_error: processingError,
      })
      .eq('id', insertedEvent.id)

    // Always return 200 to prevent Kiwify from retrying
    console.log(`[KIWIFY] Response: 200 OK (error: ${processingError || 'none'})`)
    return new Response(
      JSON.stringify({ 
        ok: true, 
        processed: !processingError,
        error: processingError 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[KIWIFY] FATAL ERROR:', error instanceof Error ? error.stack : error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processKiwifyEvent(
  supabase: SupabaseClient,
  payload: KiwifyWebhookPayload,
  eventType: string
) {
  // Extract customer email from nested structure
  const buyerEmail = (payload.Customer?.email || payload.customer_email)?.toLowerCase()
  if (!buyerEmail) {
    throw new Error('No customer email in payload (checked Customer.email and customer_email)')
  }

  // Try to find user by tracking metadata first, then by email
  let userId: string | null = null
  
  // Priority 1: Check tracking parameters for user_id (passed via checkout URL)
  const trackingUserId = payload.TrackingParameters?.user_id || payload.TrackingParameters?.s1
  if (trackingUserId) {
    // Verify user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', trackingUserId)
      .single()
    
    if (profile) {
      userId = profile.id as string
      console.log('[KIWIFY] Found user by tracking metadata:', userId)
    }
  }

  // Priority 2: Find by email in auth.users
  if (!userId) {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (!authError && authUsers?.users) {
      const matchingUser = authUsers.users.find(
        (u: { email?: string }) => u.email?.toLowerCase() === buyerEmail
      )
      if (matchingUser) {
        userId = matchingUser.id
        console.log('[KIWIFY] Found user by email:', userId)
      }
    }
  }

  // If no user found, log warning but continue
  if (!userId) {
    console.log('[KIWIFY] WARNING: No user found for email:', buyerEmail)
    console.log('[KIWIFY] The subscription will be linked when user signs up with this email')
  }

  // Determine plan from product
  const productId = payload.Product?.product_id || payload.product_id
  const productName = payload.Product?.product_name || payload.product_name || ''
  const planName = payload.Subscription?.plan?.name || ''
  
  let planCode = 'basic'
  
  // Try to map product ID first
  if (productId && PRODUCT_TO_PLAN[productId]) {
    planCode = PRODUCT_TO_PLAN[productId]
    console.log('[KIWIFY] Plan detected from product ID:', planCode)
  } else {
    // Fallback to detecting from product name or plan name
    planCode = detectPlanFromProductName(productName || planName)
    console.log('[KIWIFY] Plan detected from name:', planCode, `(product: ${productName}, plan: ${planName})`)
  }

  // Determine subscription status based on event type
  let status: string
  
  switch (eventType) {
    case KIWIFY_EVENTS.ORDER_APPROVED:
    case KIWIFY_EVENTS.SUBSCRIPTION_RENEWED:
      status = 'active'
      break
    case KIWIFY_EVENTS.SUBSCRIPTION_PAST_DUE:
    case KIWIFY_EVENTS.SUBSCRIPTION_PAYMENT_FAILED:
      status = 'past_due'
      break
    case KIWIFY_EVENTS.ORDER_REFUNDED:
    case KIWIFY_EVENTS.ORDER_CHARGEDBACK:
    case KIWIFY_EVENTS.SUBSCRIPTION_CANCELED:
      status = 'canceled'
      break
    default:
      console.log('[KIWIFY] Unknown event type, defaulting to active:', eventType)
      status = 'active'
  }

  // Calculate period dates
  const now = new Date()
  let periodStart = now
  
  // Parse approved_date if available (format: "2026-01-14 18:50")
  if (payload.approved_date) {
    const parsed = new Date(payload.approved_date.replace(' ', 'T'))
    if (!isNaN(parsed.getTime())) {
      periodStart = parsed
    }
  } else if (payload.Subscription?.start_date) {
    const parsed = new Date(payload.Subscription.start_date)
    if (!isNaN(parsed.getTime())) {
      periodStart = parsed
    }
  }
  
  // Calculate period end (next payment date or +1 month)
  let periodEnd = new Date(periodStart)
  if (payload.Subscription?.next_payment) {
    const parsed = new Date(payload.Subscription.next_payment)
    if (!isNaN(parsed.getTime())) {
      periodEnd = parsed
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  const subscriptionId = payload.subscription_id || payload.Subscription?.id

  // Always add to allowed_establishment_signups for new signups
  const orderId = payload.order_id || subscriptionId || crypto.randomUUID()
  
  if (eventType === KIWIFY_EVENTS.ORDER_APPROVED && status === 'active') {
    // Insert into allowed_establishment_signups for new purchases
    const { error: signupError } = await supabase
      .from('allowed_establishment_signups')
      .upsert({
        email: buyerEmail,
        plan_id: planCode,
        kiwify_order_id: orderId,
        paid_at: periodStart.toISOString(),
        used: !!userId, // If user already exists, mark as used
      }, {
        onConflict: 'email',
        ignoreDuplicates: false,
      })
    
    if (signupError && signupError.code !== '23505') {
      console.error('[KIWIFY] Error inserting allowed signup:', signupError)
    } else {
      console.log(`[KIWIFY] Added/updated allowed signup for ${buyerEmail} with plan ${planCode}`)
    }
  }

  // Upsert subscription if we have a user
  if (userId) {
    const subscriptionData = {
      owner_user_id: userId,
      plan_code: planCode,
      status: status,
      provider: 'kiwify',
      provider_subscription_id: subscriptionId || null,
      provider_order_id: payload.order_id || null,
      buyer_email: buyerEmail,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      raw_last_event: payload as unknown,
      updated_at: now.toISOString(),
    }

    console.log('[KIWIFY] Upserting subscription:', JSON.stringify({
      user_id: userId,
      plan_code: planCode,
      status: status,
      period_end: periodEnd.toISOString(),
    }))

    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'owner_user_id',
      })

    if (upsertError) {
      console.error('[KIWIFY] Error upserting subscription:', upsertError)
      throw upsertError
    }

    console.log(`[KIWIFY] Subscription ${status} for user ${userId} on plan ${planCode}`)
    
    // Mark allowed signup as used
    await supabase
      .from('allowed_establishment_signups')
      .update({ used: true })
      .eq('email', buyerEmail)
  } else {
    // Store in billing_webhook_events.payload for later matching when user signs up
    console.log(`[KIWIFY] No user found for ${buyerEmail}. Allowed signup created, event logged for future matching.`)
  }
}
