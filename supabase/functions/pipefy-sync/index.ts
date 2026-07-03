import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getPipefyToken(): Promise<string> {
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

async function fetchTableRecords(token: string, tableId: string, cursor?: string) {
  const query = `
    query($tableId: ID!, $after: String) {
      table_records(table_id: $tableId, first: 50, after: $after) {
        edges {
          node {
            id
            title
            record_fields {
              name
              value
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
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
    body: JSON.stringify({ 
      query,
      variables: { tableId, after: cursor }
    }),
  });

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data?.table_records;
}

function extractFieldValue(recordFields: any[], fieldName: string): string | null {
  const field = recordFields.find((f: any) => 
    f.name?.toLowerCase() === fieldName?.toLowerCase()
  );
  return field?.value || null;
}

/**
 * Sanitize email by removing invisible characters (zero-width spaces, etc.)
 */
function sanitizeEmail(email: string | null): string | null {
  if (!email) return null;
  // Remove zero-width characters and other invisible Unicode chars
  return email.replace(/[\u200B-\u200D\uFEFF\u2060\u00A0]/g, '').trim();
}

/**
 * Validate employment type against allowed values
 */
function validateEmploymentType(value: string | null): string | null {
  if (!value) return null;
  const allowedValues = ['CLT', 'PJ', 'Estágio', 'Temporário', 'Terceirizado'];
  // Check if value matches any allowed value (case-insensitive)
  const normalized = allowedValues.find(v => v.toLowerCase() === value.toLowerCase());
  return normalized || null;
}

/**
 * Parse date from Brazilian format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
 */
function parseDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  // Handle DD/MM/YYYY or D/M/YYYY format (Brazilian)
  const brMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD format (already ISO)
  const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) {
    return dateStr;
  }
  
  // Return null for invalid formats
  console.warn(`Invalid date format: ${dateStr}`);
  return null;
}

/**
 * Fetch ALL auth users (paginated). listUsers() returns only the first page
 * (50 users) by default — with 50+ employees that silently drops people,
 * making existing users look "new" and breaking the sync. This walks every page.
 */
async function fetchAllAuthUsers(supabase: any): Promise<Map<string, any>> {
  const byEmail = new Map<string, any>();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list auth users: ${error.message}`);
    const users = data?.users || [];
    for (const u of users) {
      if (u.email) byEmail.set(u.email.toLowerCase().trim(), u);
    }
    if (users.length < perPage) break;
    page++;
  }
  return byEmail;
}

/**
 * Generate a strong random password. The old hardcoded '123456' fails whenever
 * the project enforces a minimum password length/complexity, silently skipping
 * every new user. Users receive access via invite/reset flow, not this password.
 */
function generateStrongPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '');
  return `Aa1!${b64}`;
}

/**
 * Check if hire date is within 30 days (new hire)
 */
function isNewHire(hireDate: string | null): boolean {
  if (!hireDate) return false;
  const hire = new Date(hireDate);
  const today = new Date();
  const diffDays = Math.floor(
    (today.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays >= 0 && diffDays <= 30;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { companyId, tableId, fieldMapping } = await req.json();
    
    if (!companyId || !tableId || !fieldMapping) {
      throw new Error('Missing required parameters: companyId, tableId, fieldMapping');
    }

    // Create sync log
    const { data: logEntry, error: logError } = await supabase
      .from('pipefy_sync_logs')
      .insert({
        company_id: companyId,
        status: 'running',
      })
      .select()
      .single();

    if (logError) throw logError;

    const logId = logEntry.id;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let recordsSynced = 0;
    const skipReasons: Array<{ email: string | null; reason: string }> = [];

    try {
      const token = await getPipefyToken();

      // Build a complete email -> auth user lookup ONCE (paginated).
      const authUsersByEmail = await fetchAllAuthUsers(supabase);

      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const result = await fetchTableRecords(token, tableId, cursor);
        const records = result?.edges || [];
        
        for (const edge of records) {
          const record = edge.node;
          const fields = record.record_fields;
          
          // Extract mapped fields
          const personalEmail = extractFieldValue(fields, fieldMapping.email);
          const corporateEmail = fieldMapping.corporate_email 
            ? extractFieldValue(fields, fieldMapping.corporate_email) 
            : null;
          const fullName = extractFieldValue(fields, fieldMapping.full_name);
          const position = extractFieldValue(fields, fieldMapping.position);
          const departmentName = extractFieldValue(fields, fieldMapping.department);
          const teamName = extractFieldValue(fields, fieldMapping.team);
          const hireDateStr = extractFieldValue(fields, fieldMapping.hire_date);
          const birthDateStr = extractFieldValue(fields, fieldMapping.birth_date);
          const rawEmploymentType = extractFieldValue(fields, fieldMapping.employment_type);

          // Prefer corporate email, fallback to personal - sanitize to remove invisible chars
          const rawEmail = corporateEmail || personalEmail;
          const email = sanitizeEmail(rawEmail);

          if (!email) {
            console.log(`Skipping record without email (title: ${record.title})`);
            recordsSkipped++;
            skipReasons.push({ email: null, reason: `no email (title: ${record.title})` });
            continue;
          }

          recordsSynced++;
          const normalizedEmail = email.toLowerCase().trim();
          
          // Validate employment type against allowed values
          const employmentType = validateEmploymentType(rawEmploymentType);

          // Parse dates from Brazilian format to ISO
          const hireDate = parseDate(hireDateStr);
          const birthDate = parseDate(birthDateStr);

          // Handle department creation/lookup
          let departmentId: string | null = null;
          if (departmentName) {
            const { data: dept } = await supabase
              .from('departments')
              .select('id')
              .eq('company_id', companyId)
              .eq('name', departmentName)
              .single();

            if (dept) {
              departmentId = dept.id;
            } else {
              // Create department
              const { data: newDept } = await supabase
                .from('departments')
                .insert({
                  company_id: companyId,
                  name: departmentName,
                })
                .select()
                .single();
              
              if (newDept) {
                departmentId = newDept.id;
              }
            }
          }

          // Check if user already exists in auth.users by email (from the
          // pre-built paginated map — no per-record listUsers cap).
          const existingAuthUser = authUsersByEmail.get(normalizedEmail);
          let userId: string | null = existingAuthUser?.id ?? null;

          if (existingAuthUser) {
            // User already exists in auth - update their data
            console.log(`User ${normalizedEmail} already exists, updating...`);
            
            // Update user metadata
            await supabase.auth.admin.updateUserById(userId, {
              user_metadata: {
                full_name: fullName,
              }
            });

            // Update public.users
            const userUpdate: Record<string, any> = {
              updated_at: new Date().toISOString(),
            };
            if (fullName) userUpdate.full_name = fullName;
            if (birthDate) userUpdate.birth_date = birthDate;

            await supabase
              .from('users')
              .update(userUpdate)
              .eq('id', userId);

            // Check/update company membership
            const { data: existingMembership } = await supabase
              .from('company_memberships')
              .select('id')
              .eq('user_id', userId)
              .eq('company_id', companyId)
              .single();

            const membershipData: Record<string, any> = {
              updated_at: new Date().toISOString(),
            };
            if (position) membershipData.position = position;
            if (departmentId) membershipData.department_id = departmentId;
            if (departmentName) membershipData.department = departmentName;
            if (hireDate) {
              membershipData.hire_date = hireDate;
              membershipData.is_new_hire = isNewHire(hireDate);
            }
            if (employmentType) membershipData.employment_type = employmentType;

            if (existingMembership) {
              await supabase
                .from('company_memberships')
                .update(membershipData)
                .eq('id', existingMembership.id);
            } else {
              // Create membership for existing user
              await supabase
                .from('company_memberships')
                .insert({
                  user_id: userId,
                  company_id: companyId,
                  status: 'active',
                  joined_at: new Date().toISOString(),
                  ...membershipData,
                });

              // Create user role
              await supabase
                .from('user_roles')
                .insert({
                  user_id: userId,
                  company_id: companyId,
                  role: 'member',
                });
            }

            recordsUpdated++;
          } else {
            // User does NOT exist - CREATE NEW USER via Admin API
            console.log(`Creating new user: ${normalizedEmail}`);
            
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
              email: normalizedEmail,
              password: generateStrongPassword(),
              email_confirm: true, // Auto-confirm email for immediate access
              user_metadata: {
                full_name: fullName || normalizedEmail.split('@')[0],
              }
            });

            if (authError) {
              console.error(`Error creating auth user ${normalizedEmail}:`, authError);
              recordsSkipped++;
              skipReasons.push({ email: normalizedEmail, reason: `createUser failed: ${authError.message}` });
              continue;
            }

            userId = authUser.user.id;
            // Keep the map in sync so later records for the same email are found.
            authUsersByEmail.set(normalizedEmail, authUser.user);
            console.log(`Created auth user ${normalizedEmail} with ID ${userId}`);

            // The trigger handle_new_user should create public.users automatically
            // But let's ensure the data is complete by updating
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for trigger

            // Update public.users with additional data
            const userUpdate: Record<string, any> = {
              updated_at: new Date().toISOString(),
              primary_company_id: companyId,
            };
            if (fullName) userUpdate.full_name = fullName;
            if (birthDate) userUpdate.birth_date = birthDate;

            const { error: userUpdateError } = await supabase
              .from('users')
              .update(userUpdate)
              .eq('id', userId);

            if (userUpdateError) {
              console.error(`Error updating user profile:`, userUpdateError);
            }

            // Create company_membership - only include valid fields
            const membershipInsert: Record<string, any> = {
              user_id: userId,
              company_id: companyId,
              status: 'active',
              joined_at: new Date().toISOString(),
            };
            if (position) membershipInsert.position = position;
            if (departmentId) membershipInsert.department_id = departmentId;
            if (departmentName) membershipInsert.department = departmentName;
            if (hireDate) {
              membershipInsert.hire_date = hireDate;
              membershipInsert.is_new_hire = isNewHire(hireDate);
            }
            if (employmentType) membershipInsert.employment_type = employmentType;

            const { error: membershipError } = await supabase
              .from('company_memberships')
              .insert(membershipInsert);

            if (membershipError) {
              console.error(`Error creating membership:`, membershipError);
            }

            // Create user_role
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: userId,
                company_id: companyId,
                role: 'member',
              });

            if (roleError) {
              console.error(`Error creating user role:`, roleError);
            }

            recordsCreated++;
          }

          // Handle team if specified
          if (teamName) {
            if (!userId) continue;

            const { data: team } = await supabase
              .from('teams')
              .select('id')
              .eq('company_id', companyId)
              .eq('name', teamName)
              .single();

            let teamId: string | null = null;

            if (team) {
              teamId = team.id;
            } else {
              // Create team
              const { data: newTeam } = await supabase
                .from('teams')
                .insert({
                  company_id: companyId,
                  name: teamName,
                  department_id: departmentId,
                })
                .select()
                .single();
              
              if (newTeam) {
                teamId = newTeam.id;
              }
            }

            if (teamId) {
              // Check if already member
              const { data: existingTeamMember } = await supabase
                .from('team_members')
                .select('id')
                .eq('user_id', userId)
                .eq('team_id', teamId)
                .single();

              if (!existingTeamMember) {
                await supabase
                  .from('team_members')
                  .insert({
                    user_id: userId,
                    team_id: teamId,
                    role: 'member',
                  });
              }
            }
          }
        }

        hasMore = result?.pageInfo?.hasNextPage || false;
        cursor = result?.pageInfo?.endCursor;
      }

      // Update sync config
      await supabase
        .from('pipefy_sync_config')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_status: 'success',
        })
        .eq('company_id', companyId);

      // Complete log
      await supabase
        .from('pipefy_sync_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          records_synced: recordsSynced,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
          records_skipped: recordsSkipped,
          details: { skipReasons },
        })
        .eq('id', logId);

      return new Response(JSON.stringify({
        success: true,
        recordsSynced,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (syncError) {
      // Update log with error
      await supabase
        .from('pipefy_sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: syncError.message,
        })
        .eq('id', logId);

      throw syncError;
    }

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
