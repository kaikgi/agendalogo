import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the Authorization header to identify the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to verify they are admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callerUser) {
      console.error('Error getting caller user:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is admin
    const { data: isAdmin, error: adminError } = await adminClient.rpc('is_admin', {
      p_user_id: callerUser.id
    });

    if (adminError || !isAdmin) {
      console.error('Admin check failed:', adminError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem executar esta ação.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email }: RequestBody = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-add-user] Admin ${callerUser.email} adding new admin: ${email}`);

    // Find user by email using admin API
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar usuários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado. O usuário precisa ter uma conta no sistema primeiro.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already admin
    const { data: existingAdmin } = await adminClient
      .from('admin_users')
      .select('id')
      .eq('user_id', targetUser.id)
      .single();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: 'Este usuário já é administrador' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add to admin_users table
    const { error: insertError } = await adminClient
      .from('admin_users')
      .insert({
        user_id: targetUser.id,
        created_by: callerUser.id,
      });

    if (insertError) {
      console.error('Error inserting admin user:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao adicionar administrador' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-add-user] Successfully added ${email} as admin`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${email} adicionado como administrador`,
        user_id: targetUser.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in admin-add-user:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
