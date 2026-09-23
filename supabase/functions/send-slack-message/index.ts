import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLACK_API_URL = 'https://slack.com/api';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
  if (!SLACK_BOT_TOKEN) {
    return new Response(
      JSON.stringify({ success: false, error: 'SLACK_BOT_TOKEN is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET - List channels
    if (req.method === 'GET' && action === 'list-channels') {
      const response = await fetch(`${SLACK_API_URL}/conversations.list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      const channels = data.channels
        ?.filter((ch: { is_member: boolean; is_archived: boolean }) => !ch.is_archived)
        .map((ch: { id: string; name: string; is_member: boolean }) => ({
          id: ch.id,
          name: ch.name,
          is_member: ch.is_member,
        })) || [];

      return new Response(
        JSON.stringify({ success: true, channels }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST ?action=dm — mensagem direta para uma pessoa, pelo e-mail dela.
    //
    // A rota de post existente carimba "📢 Novo post de …" porque nasceu para
    // publicar o mural num canal. Aviso individual precisa chegar como recado,
    // não como anúncio — por isso uma rota própria, sem o cabeçalho.
    //
    // O id do Slack não vive no nosso banco: resolvemos pelo e-mail a cada
    // envio, que é o mesmo e-mail com que a pessoa entra na plataforma.
    if (req.method === 'POST' && action === 'dm') {
      const { email, message } = await req.json();

      if (!email || !message) {
        return new Response(
          JSON.stringify({ success: false, error: 'email e message são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lookup = await fetch(
        `${SLACK_API_URL}/users.lookupByEmail?email=${encodeURIComponent(email)}`,
        { headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` } }
      );
      const achado = await lookup.json();

      if (!achado.ok) {
        // users_not_found = a pessoa não tem conta no Slack com esse e-mail;
        // missing_scope = o app não tem permissão de ler e-mails.
        return new Response(
          JSON.stringify({ success: false, error: `Slack lookup: ${achado.error}` }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const envio = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        // channel com um user id abre (ou reusa) a conversa direta com a pessoa.
        body: JSON.stringify({ channel: achado.user.id, text: message, mrkdwn: true }),
      });
      const resultado = await envio.json();

      if (!resultado.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Slack postMessage: ${resultado.error}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, to: achado.user.name, message_ts: resultado.ts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Send message
    if (req.method === 'POST') {
      const { channel_id, channel_name, message, author_name, images } = await req.json();

      // Support both channel_id and channel_name (channel_name will be prefixed with #)
      const channel = channel_id || (channel_name ? `#${channel_name}` : null);

      if (!channel || !message) {
        return new Response(
          JSON.stringify({ success: false, error: 'channel_id or channel_name, and message are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build message blocks for rich formatting
      const blocks: Array<{
        type: string;
        text?: { type: string; text: string };
        image_url?: string;
        alt_text?: string;
      }> = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📢 *Novo post de ${author_name || 'Usuário'}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${message}`,
          },
        },
      ];

      // Add images if provided
      if (images && images.length > 0) {
        images.forEach((imageUrl: string, index: number) => {
          blocks.push({
            type: "image",
            image_url: imageUrl,
            alt_text: `Imagem ${index + 1}`,
          });
        });
      }

      const response = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          blocks,
          text: `📢 Novo post de ${author_name || 'Usuário'}: ${message}`,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return new Response(
        JSON.stringify({ success: true, message_ts: data.ts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-slack-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
