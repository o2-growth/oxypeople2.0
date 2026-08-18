import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getPipefyToken(): Promise<string> {
  // Mesmo secret do pipefy-timeoff-sync; OAuth abaixo é fallback.
  const direct = Deno.env.get('PIPEFY_TOKEN');
  if (direct) return direct;

  const clientId = Deno.env.get('PIPEFY_CLIENT_ID');
  const clientSecret = Deno.env.get('PIPEFY_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('Pipefy credentials not configured');
  }

  const response = await fetch('https://app.pipefy.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Pipefy token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchPipefyOrganizations(token: string) {
  // Query organizations that this service account has access to
  const query = `
    query {
      organizations {
        id
        name
      }
    }
  `;

  const response = await fetch('https://api.pipefy.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data?.organizations || [];
}

async function fetchPipefyTables(token: string, organizationId: string) {
  // Fetch tables from the organization
  const tablesQuery = `
    query($orgId: ID!) {
      organization(id: $orgId) {
        id
        name
        tables {
          edges {
            node {
              id
              name
              public
              table_fields {
                id
                label
                type
                required
              }
            }
          }
        }
      }
    }
  `;

  const tablesResponse = await fetch('https://api.pipefy.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      query: tablesQuery,
      variables: { orgId: organizationId }
    }),
  });

  const tablesData = await tablesResponse.json();
  
  if (tablesData.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(tablesData.errors)}`);
  }

  const tables = tablesData.data?.organization?.tables?.edges?.map((edge: any) => edge.node) || [];

  return {
    organization: tablesData.data?.organization,
    tables,
  };
}

async function fetchTableById(token: string, tableId: string) {
  const query = `
    query($tableId: ID!) {
      table(id: $tableId) {
        id
        name
        table_fields {
          id
          label
          type
          required
        }
      }
    }
  `;

  const response = await fetch('https://api.pipefy.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { tableId } }),
  });

  const data = await response.json();
  if (data.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data?.table || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, tableId } = await req.json().catch(() => ({}));
    
    const token = await getPipefyToken();

    // If a specific tableId is provided, fetch just that table's fields
    if (tableId) {
      const table = await fetchTableById(token, tableId);
      if (!table) {
        return new Response(JSON.stringify({ error: 'Table not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        organizations: [],
        currentOrganization: null,
        tables: [table],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // First get organizations
    const organizations = await fetchPipefyOrganizations(token);
    
    if (!organizations || organizations.length === 0) {
      return new Response(JSON.stringify({ 
        organizations: [], 
        tables: [],
        message: 'No organizations found for this service account'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Use provided org ID or first organization
    const orgId = organizationId || organizations[0]?.id;
    
    // Fetch tables from the organization
    const { organization, tables } = await fetchPipefyTables(token, orgId);

    return new Response(JSON.stringify({
      organizations,
      currentOrganization: organization,
      tables,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
