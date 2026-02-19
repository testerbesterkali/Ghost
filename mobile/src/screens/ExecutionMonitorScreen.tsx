import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { theme, colors } from '../theme';
import { supabase } from '../lib/supabase';

export default function ExecutionMonitorScreen() {
    const [executions, setExecutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const { data } = await supabase
            .from('executions')
            .select('*, ghosts(name)')
            .order('started_at', { ascending: false })
            .limit(30);
        setExecutions(data || []);
        setLoading(false);
    }

    const statusColor = (s: string) => {
        if (s === 'completed') return colors.success;
        if (s === 'failed') return colors.error;
        if (s === 'running') return colors.accent;
        return colors.textMuted;
    };

    return (
        <View style={theme.container}>
            <ScrollView
                contentContainerStyle={theme.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
            >
                <Text style={[theme.title, { marginBottom: 20 }]}>Executions</Text>

                {executions.length === 0 && !loading ? (
                    <View style={[theme.card, { alignItems: 'center', paddingVertical: 40 }]}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>▶️</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>No executions yet</Text>
                    </View>
                ) : (
                    executions.map((ex) => (
                        <View key={ex.id} style={theme.card}>
                            <View style={theme.row}>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, flex: 1 }}>
                                    {ex.ghosts?.name || 'Ghost'}
                                </Text>
                                <View style={[theme.badge, { backgroundColor: `${statusColor(ex.status)}22` }]}>
                                    <Text style={[theme.badgeText, { color: statusColor(ex.status) }]}>
                                        {ex.status}
                                    </Text>
                                </View>
                            </View>
                            <View style={theme.divider} />
                            <View style={theme.row}>
                                <Text style={theme.label}>Steps</Text>
                                <Text style={theme.mono}>{ex.step_count}</Text>
                            </View>
                            <View style={[theme.row, { marginTop: 4 }]}>
                                <Text style={theme.label}>Trigger</Text>
                                <Text style={theme.mono}>{ex.trigger}</Text>
                            </View>
                            <View style={[theme.row, { marginTop: 4 }]}>
                                <Text style={theme.label}>Started</Text>
                                <Text style={theme.mono}>{new Date(ex.started_at).toLocaleString()}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}
