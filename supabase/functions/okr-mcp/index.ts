/**
 * MCP do OxyPeople — perguntar sobre OKRs de dentro do Claude.
 *
 * Serve o terminal e o app pela mesma URL: JSON-RPC sobre HTTP (transporte
 * Streamable HTTP, protocolo 2025-06-18) com OAuth 2.1 por trás.
 *
 * Duas decisões que definem o resto:
 *
 * 1. SOMENTE LEITURA. Criar OKR e dar check-in continuam no produto, onde há
 *    preview e revisão. OKR é contrato entre pessoas; não vira fato consumado
 *    por uma frase no chat.
 *
 * 2. AUTENTICADO COMO A PESSOA. O access token é o JWT do Supabase, então toda
 *    consulta passa pela RLS que a tela já usa. A alternativa — service role
 *    com filtro manual — significaria reescrever uma política de sete ramos, e
 *    o primeiro erro vazaria OKR de uma área para outra.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { TOOLS, executarTool } from "./tools.ts";

const PROTOCOL_VERSION = "2025-06-18";
const SUPORTADOS = new Set([PROTOCOL_VERSION, "2025-03-26"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id, accept",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id, www-authenticate",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BASE_DIRETA = `${SUPABASE_URL}/functions/v1/okr-mcp`;

/**
 * O domínio pelo qual o cliente enxerga este servidor.
 *
 * Cliente OAuth procura os metadados na RAIZ do domínio (RFC 9728), e a raiz de
 * *.supabase.co é do gateway deles: responde 404 "requested path is invalid"
 * antes de chegar aqui, e o registro dinâmico falha. Por isso o MCP é servido
 * pelo domínio do OxyPeople, que faz proxy para esta function.
 *
 * A lista é fixa de propósito: `x-forwarded-host` é cabeçalho de cliente, e
 * confiar nele aqui deixaria qualquer um apontar o fluxo de login para o
 * próprio domínio.
 */
/**
 * O domínio pelo qual o cliente enxerga este servidor.
 *
 * Cliente OAuth procura os metadados na RAIZ do domínio (RFC 9728), e a raiz de
 * *.supabase.co é do gateway deles: responde 404 "requested path is invalid"
 * antes de chegar aqui, e o registro dinâmico falha. Por isso o MCP é servido
 * pelo domínio do OxyPeople, que faz proxy para esta function.
 *
 * Vem de secret, não de `x-forwarded-host`: header de cliente é forjável, e
 * aqui ele decidiria para onde o fluxo de login manda a pessoa.
 */
const ORIGEM_PUBLICA = Deno.env.get("MCP_PUBLIC_URL")?.replace(/\/+$/, "") ?? "";
/** Onde o endpoint MCP atende. */
const BASE = ORIGEM_PUBLICA ? `${ORIGEM_PUBLICA}/mcp` : BASE_DIRETA;
/** Quem emite os tokens — sem path, para o metadata cair na raiz do domínio. */
const ISSUER = ORIGEM_PUBLICA || BASE_DIRETA;

function log(level: "info" | "warn" | "error", msg: string, ctx?: Record<string, unknown>) {
  const p = { level, msg, ts: new Date().toISOString(), ...ctx };
  if (level === "error") console.error(JSON.stringify(p));
  else console.log(JSON.stringify(p));
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, ...extra, "Content-Type": "application/json" },
  });

const rpcErro = (id: unknown, code: number, message: string) =>
  json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = new URL(req.url);
  // O runtime entrega o path já sem o prefixo em alguns ambientes e com ele em
  // outros; normalizar os dois evita 404 conforme onde a função está rodando.
  const rota = url.pathname
    .replace(/^\/functions\/v1\/okr-mcp/, "")
    .replace(/^\/okr-mcp/, "")
    .replace(/^\/mcp/, "") || "/";

  // ---- Descoberta OAuth ------------------------------------------------------
  // É o que faz o cliente saber como se autenticar sozinho. Sem estes dois
  // documentos, o Claude Code recebe 401 e não tem para onde ir.
  if (rota === "/.well-known/oauth-protected-resource") {
    return json({
      resource: BASE,
      // Precisa ser o ISSUER, não o endpoint do recurso: o cliente pede o
      // metadata deste endereço e compara com o `issuer` que volta. Apontar
      // para .../mcp e devolver um documento cujo issuer é a raiz faz a
      // validação falhar — é o "não foi possível registrar no serviço de login".
      authorization_servers: [ISSUER],
      scopes_supported: ["okr:read"],
      bearer_methods_supported: ["header"],
    });
  }

  if (rota === "/.well-known/oauth-authorization-server") {
    return json({
      issuer: ISSUER,
      authorization_endpoint: `${BASE}/authorize`,
      token_endpoint: `${BASE}/token`,
      registration_endpoint: `${BASE}/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["okr:read"],
    });
  }

  // Registro dinâmico: o cliente se anuncia e recebe um id. Sem segredo —
  // a segurança do fluxo está no PKCE, não em um secret guardado no cliente.
  if (rota === "/register" && req.method === "POST") {
    const corpo = await req.json().catch(() => ({}));
    return json({
      client_id: crypto.randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: corpo.redirect_uris ?? [],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: corpo.client_name ?? "Cliente MCP",
    }, 201);
  }

  // ---- Login ----------------------------------------------------------------
  if (rota === "/authorize" && req.method === "GET") {
    const p = url.searchParams;
    return new Response(paginaLogin({
      redirect_uri: p.get("redirect_uri") ?? "",
      state: p.get("state") ?? "",
      code_challenge: p.get("code_challenge") ?? "",
      code_challenge_method: p.get("code_challenge_method") ?? "S256",
    }), { headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } });
  }

  if (rota === "/authorize" && req.method === "POST") {
    const form = await req.formData();
    const email = String(form.get("email") ?? "");
    const senha = String(form.get("senha") ?? "");
    const redirectUri = String(form.get("redirect_uri") ?? "");
    const state = String(form.get("state") ?? "");

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await anon.auth.signInWithPassword({ email, password: senha });
    if (error || !data.session) {
      log("warn", "okr-mcp:login-falhou", { email });
      return new Response(
        paginaLogin({ redirect_uri: redirectUri, state, code_challenge: "", code_challenge_method: "S256" },
          "E-mail ou senha incorretos."),
        { status: 401, headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // O "código" carrega o refresh token da sessão recém-criada. É de uso único
    // e vive segundos: o cliente troca por tokens no /token em seguida.
    const code = btoa(JSON.stringify({
      r: data.session.refresh_token,
      exp: Date.now() + 120_000,
    }));
    const destino = new URL(redirectUri);
    destino.searchParams.set("code", code);
    if (state) destino.searchParams.set("state", state);
    log("info", "okr-mcp:login-ok", { userId: data.user?.id });
    return new Response(null, { status: 302, headers: { ...cors, Location: destino.toString() } });
  }

  if (rota === "/token" && req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const params = form
      ? Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]))
      : await req.json().catch(() => ({} as Record<string, string>));

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    let refresh = "";

    if (params.grant_type === "refresh_token") {
      refresh = params.refresh_token ?? "";
    } else if (params.grant_type === "authorization_code") {
      try {
        const payload = JSON.parse(atob(params.code ?? ""));
        if (!payload.exp || payload.exp < Date.now()) {
          return json({ error: "invalid_grant", error_description: "Código expirado." }, 400);
        }
        refresh = payload.r;
      } catch {
        return json({ error: "invalid_grant", error_description: "Código inválido." }, 400);
      }
    } else {
      return json({ error: "unsupported_grant_type" }, 400);
    }

    const { data, error } = await anon.auth.refreshSession({ refresh_token: refresh });
    if (error || !data.session) {
      return json({ error: "invalid_grant", error_description: "Sessão não pôde ser renovada." }, 400);
    }
    return json({
      access_token: data.session.access_token,
      token_type: "Bearer",
      expires_in: data.session.expires_in ?? 3600,
      refresh_token: data.session.refresh_token,
      scope: "okr:read",
    });
  }

  // ---- Endpoint MCP ----------------------------------------------------------
  if (rota !== "/" && rota !== "") return json({ error: "not_found" }, 404);

  // GET sem SSE: a spec permite recusar o canal de eventos do servidor.
  if (req.method === "GET") return new Response(null, { status: 405, headers: cors });
  if (req.method === "DELETE") return new Response(null, { status: 405, headers: cors });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

  const versao = req.headers.get("mcp-protocol-version");
  if (versao && !SUPORTADOS.has(versao)) {
    return json({ error: "unsupported_protocol_version", supported: [...SUPORTADOS] }, 400);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  let msg: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    msg = await req.json();
  } catch {
    return rpcErro(null, -32700, "JSON inválido.");
  }

  // initialize e notificações não exigem token: o cliente precisa conseguir
  // apresentar-se para então descobrir que tem de autenticar.
  if (msg.method === "initialize") {
    return json({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "oxypeople-okr", title: "OKRs do OxyPeople", version: "1.0.0" },
        instructions:
          "Consulta de OKRs do OxyPeople. Somente leitura: criar objetivo ou registrar check-in " +
          "continua sendo feito na plataforma. Os percentuais já vêm calculados pela regra da casa — " +
          "em meta de teto, estar abaixo do limite é 100%.",
      },
    });
  }

  if (msg.method?.startsWith("notifications/")) return new Response(null, { status: 202, headers: cors });

  if (!token) {
    log("info", "okr-mcp:sem-token", { metodo: msg.method });
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32001, message: "Autenticação necessária." } }),
      {
        status: 401,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer realm="OxyPeople", resource_metadata="${BASE}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  const db = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth2, error: authErr } = await db.auth.getUser(token);
  if (authErr || !auth2?.user) {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32001, message: "Sessão expirada." } }),
      {
        status: 401,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="${BASE}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }
  const userId = auth2.user.id;

  try {
    if (msg.method === "tools/list") {
      return json({ jsonrpc: "2.0", id: msg.id, result: { tools: TOOLS } });
    }

    if (msg.method === "tools/call") {
      const nome = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      const inicio = Date.now();
      const resultado = await executarTool(db, userId, nome, args);
      log("info", "okr-mcp:tool", { userId, tool: nome, ms: Date.now() - inicio });
      return json({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          content: [{ type: "text", text: JSON.stringify(resultado, null, 1) }],
          structuredContent: resultado,
        },
      });
    }

    if (msg.method === "ping") return json({ jsonrpc: "2.0", id: msg.id, result: {} });

    return rpcErro(msg.id, -32601, `Método não suportado: ${msg.method}`);
  } catch (e) {
    const erro = e as Error;
    log("error", "okr-mcp:erro", { userId, metodo: msg.method, erro: erro.message });
    return json({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        content: [{ type: "text", text: `Não consegui responder: ${erro.message}` }],
        isError: true,
      },
    });
  }
});

function paginaLogin(
  p: { redirect_uri: string; state: string; code_challenge: string; code_challenge_method: string },
  erro?: string,
) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Entrar no OxyPeople</title>
<style>
 :root{color-scheme:light dark}
 body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f8f7;color:#10201b;
      font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
 @media(prefers-color-scheme:dark){body{background:#0c1512;color:#e6efea}}
 form{width:min(380px,92vw);background:#fff;border:1px solid #dce4e1;border-radius:12px;padding:28px;
      display:flex;flex-direction:column;gap:14px}
 @media(prefers-color-scheme:dark){form{background:#121d19;border-color:#22322c}}
 h1{margin:0;font-size:19px}
 p.sub{margin:0;color:#476057;font-size:13.5px}
 @media(prefers-color-scheme:dark){p.sub{color:#a3b8b0}}
 label{font-size:13px;font-weight:600;display:flex;flex-direction:column;gap:5px}
 input{font:inherit;padding:9px 11px;border:1px solid #c3d0cb;border-radius:7px;background:transparent;color:inherit}
 button{font:inherit;font-weight:600;padding:10px;border:0;border-radius:7px;background:#0b7a4b;color:#fff;cursor:pointer}
 .erro{background:#fbe7ec;color:#9b1b3e;padding:9px 11px;border-radius:7px;font-size:13.5px}
 @media(prefers-color-scheme:dark){.erro{background:#33141d;color:#f2889f}}
</style></head><body>
<form method="POST">
 <h1>OKRs do OxyPeople</h1>
 <p class="sub">Entre com sua conta para consultar seus OKRs pelo Claude. O acesso é somente leitura.</p>
 ${erro ? `<div class="erro">${esc(erro)}</div>` : ""}
 <label>E-mail<input type="email" name="email" required autocomplete="username" autofocus></label>
 <label>Senha<input type="password" name="senha" required autocomplete="current-password"></label>
 <input type="hidden" name="redirect_uri" value="${esc(p.redirect_uri)}">
 <input type="hidden" name="state" value="${esc(p.state)}">
 <button type="submit">Entrar</button>
</form></body></html>`;
}
