import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { ghost_id, action, decision_note, approved_by } = await req.json();

        if (!ghost_id || !action) {
            return new Response(
                JSON.stringify({ error: 'ghost_id and action are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!['approve', 'reject', 'pause', 'activate', 'archive'].includes(action)) {
            return new Response(
                JSON.stringify({ error: 'Invalid action. Must be: approve, reject, pause, activate, archive' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get current ghost
        const { data: ghost, error: fetchErr } = await supabase
            .from('ghosts')
            .select('*')
            .eq('id', ghost_id)
            .single();

        if (fetchErr || !ghost) {
            return new Response(
                JSON.stringify({ error: 'Ghost not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const statusMap: Record<string, string> = {
            approve: 'approved',
            reject: 'archived',
            pause: 'paused',
            activate: 'active',
            archive: 'archived',
        };

        const newStatus = statusMap[action];
        const isActive = action === 'approve' || action === 'activate';

        const { error: updateErr } = await supabase
            .from('ghosts')
            .update({
                status: newStatus,
                is_active: isActive,
                version: action === 'approve' ? ghost.version + 1 : ghost.version,
                updated_at: new Date().toISOString(),
            })
            .eq('id', ghost_id);

        if (updateErr) {
            return new Response(
                JSON.stringify({ error: 'Failed to update ghost', details: updateErr.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (action === 'approve') {
            await supabase.from('ghost_versions').insert({
                ghost_id: ghost.id,
                version: ghost.version + 1,
                execution_plan: ghost.execution_plan,
                parameters: ghost.parameters,
                trigger: ghost.trigger,
                change_description: decision_note || 'Approved',
                created_by: approved_by || 'system',
            });
        }

        await supabase
            .from('approval_requests')
            .update({
                status: action === 'approve' ? 'approved' : 'rejected',
                approved_by: approved_by || 'system',
                decision_note,
                resolved_at: new Date().toISOString(),
            })
            .eq('ghost_id', ghost_id)
            .eq('status', 'pending');

        await supabase.from('execution_logs').insert({
            execution_id: null,
            level: 'info',
            message: `Ghost ${action}: ${ghost.name}`,
            metadata: { ghost_id, action, approved_by, decision_note },
        });

        return new Response(
            JSON.stringify({
                success: true,
                ghost_id,
                action,
                new_status: newStatus,
                version: action === 'approve' ? ghost.version + 1 : ghost.version,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: 'Internal error', message: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
