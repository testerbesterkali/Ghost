import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { theme, colors } from '../theme';
import { supabase } from '../lib/supabase';

export default function ApprovalQueueScreen() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const { data } = await supabase
            .from('approval_requests')
            .select('*, ghosts(name, description, confidence)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        setRequests(data || []);
        setLoading(false);
    }

    async function handleAction(id: string, ghostId: string, action: 'approve' | 'reject') {
        const { error } = await supabase.functions.invoke('approve-ghost', {
            body: { ghost_id: ghostId, action, approved_by: 'mobile_user' },
        });
        if (error) {
            Alert.alert('Error', error.message);
            return;
        }
        load();
    }

    return (
        <View style={theme.container}>
            <ScrollView
                contentContainerStyle={theme.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
            >
                <Text style={[theme.title, { marginBottom: 20 }]}>Approvals</Text>

                {requests.length === 0 && !loading ? (
                    <View style={[theme.card, { alignItems: 'center', paddingVertical: 40 }]}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>No pending approvals</Text>
                    </View>
                ) : (
                    requests.map((req) => (
                        <View key={req.id} style={[theme.card, theme.cardAccent]}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
                                {req.ghosts?.name || 'Ghost'}
                            </Text>
                            {req.ghosts?.description && (
                                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
                                    {req.ghosts.description.slice(0, 100)}
                                </Text>
                            )}
                            {req.reason && (
                                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                                    Reason: {req.reason}
                                </Text>
                            )}
                            <View style={theme.divider} />
                            <View style={theme.row}>
                                <Text style={theme.label}>Confidence</Text>
                                <Text style={{ color: colors.accent, fontWeight: '600' }}>
                                    {((req.ghosts?.confidence || 0) * 100).toFixed(0)}%
                                </Text>
                            </View>
                            <View style={[theme.row, { marginTop: 4 }]}>
                                <Text style={theme.label}>Expires</Text>
                                <Text style={theme.mono}>{new Date(req.expires_at).toLocaleString()}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[theme.btnPrimary, { flex: 1 }]}
                                    onPress={() => handleAction(req.id, req.ghost_id, 'approve')}
                                >
                                    <Text style={theme.btnText}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[theme.btnPrimary, { flex: 1, backgroundColor: colors.bgTertiary }]}
                                    onPress={() => handleAction(req.id, req.ghost_id, 'reject')}
                                >
                                    <Text style={[theme.btnText, { color: colors.textSecondary }]}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}
