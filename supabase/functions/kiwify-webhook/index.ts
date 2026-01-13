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

// Map Kiwify product IDs to our plan codes
const PRODUCT_TO_PLAN: Record<string, string> = {
  // Configure your Kiwify product IDs here
}

interface KiwifyWebhookPayload {
  order_id?: string
  order_ref?: string
  product_id?: string
  product_name?: string
  subscription_id?: string
  subscription_status?: string
  customer_email?: string
  customer_name?: string
  customer_phone?: string
  payment_method?: string
  payment_status?: string
  price?: number
  installments?: number
  created_at?: string
  approved_date?: string
  refunded_date?: string
  webhook_event_type?: string
  TrackingParameters?: {
    src?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    user_id?: string
    establishment_id?: string
  }
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
      JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
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

    console.log('[KIWIFY] Payload received:', JSON.stringify({
      event: payload.webhook_event_type,
      order_id: payload.order_id,
      product_name: payload.product_name,
      customer_email: payload.customer_email,
    }))

    // Extract event info
    const eventType = payload.webhook_event_type || 'unknown'
    const eventId = payload.order_id || payload.subscription_id || crypto.randomUUID()

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
  const buyerEmail = payload.customer_email?.toLowerCase()
  if (!buyerEmail) {
    throw new Error('No customer email in payload')
  }

  // Try to find user by metadata first, then by email
  let userId: string | null = null
  
  // Priority 1: Check tracking parameters for user_id
  const trackingUserId = payload.TrackingParameters?.user_id
  if (trackingUserId) {
    // Verify user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', trackingUserId)
      .single()
    
    if (profile) {
      userId = profile.id as string
      console.log('Found user by tracking metadata:', userId)
    }
  }

  // Priority 2: Find by email in auth.users (via profiles)
  if (!userId) {
    // We need to search by email - query auth.users through the admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (!authError && authUsers?.users) {
      const matchingUser = authUsers.users.find(
        (u: { email?: string }) => u.email?.toLowerCase() === buyerEmail
      )
      if (matchingUser) {
        userId = matchingUser.id
        console.log('Found user by email:', userId)
      }
    }
  }

  // If no user found, log and create pending record
  if (!userId) {
    console.log('No user found for email:', buyerEmail)
    // We'll still create/update the subscription with null user_id
    // This allows the user to claim it when they sign up with the same email
  }

  // Determine plan from product
  let planCode = 'basic'
  
  // Try to map product to plan
  const productId = payload.product_id
  const productName = payload.product_name?.toLowerCase() || ''
  
  if (productId && PRODUCT_TO_PLAN[productId]) {
    planCode = PRODUCT_TO_PLAN[productId]
  } else if (productName.includes('studio')) {
    planCode = 'studio'
  } else if (productName.includes('essencial') || productName.includes('essential')) {
    planCode = 'essential'
  } else if (productName.includes('básico') || productName.includes('basic')) {
    planCode = 'basic'
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
      console.log('Unknown event type, defaulting to active:', eventType)
      status = 'active'
  }

  // Calculate period dates
  const now = new Date()
  const periodStart = payload.approved_date ? new Date(payload.approved_date) : now
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1) // Add 1 month

  // Upsert subscription
  if (userId) {
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        owner_user_id: userId,
        plan_code: planCode,
        status: status,
        provider: 'kiwify',
        provider_subscription_id: payload.subscription_id || null,
        provider_order_id: payload.order_id || null,
        buyer_email: buyerEmail,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        raw_last_event: payload as unknown,
        updated_at: now.toISOString(),
      }, {
        onConflict: 'owner_user_id',
      })

    if (upsertError) {
      console.error('Error upserting subscription:', upsertError)
      throw upsertError
    }

    console.log(`Subscription ${status} for user ${userId} on plan ${planCode}`)
  } else {
    // Create a pending subscription record that can be claimed
    // Store in billing_webhook_events.payload for later matching
    console.log(`No user found for ${buyerEmail}. Event logged for future matching.`)
  }
}
