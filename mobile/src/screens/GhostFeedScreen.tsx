import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { theme, colors } from '../theme';
import { supabase } from '../lib/supabase';

export default function GhostFeedScreen() {
    const [patterns, setPatterns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const { data } = await supabase
            .from('detected_patterns')
            .select('*')
            .order('confidence', { ascending: false });
        setPatterns(data || []);
        setLoading(false);
    }

    return (
        <View style={theme.container}>
            <ScrollView
                contentContainerStyle={theme.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
            >
                <Text style={[theme.title, { marginBottom: 8 }]}>Ghost Feed</Text>
                <Text style={[theme.subtitle, { marginBottom: 20 }]}>Swipe to approve or dismiss patterns</Text>

                {patterns.length === 0 && !loading ? (
                    <View style={[theme.card, { alignItems: 'center', paddingVertical: 40 }]}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>✨</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>No patterns detected yet</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                            Browse with Ghost Shadow to start
                        </Text>
                    </View>
                ) : (
                    patterns.map((p) => (
                        <View key={p.id} style={[theme.card, theme.cardAccent]}>
                            <View style={theme.row}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, flex: 1 }}>
                                    {p.suggested_name || 'Unnamed Pattern'}
                                </Text>
                                <View style={[theme.badge, { backgroundColor: colors.accentDim }]}>
                                    <Text style={[theme.badgeText, { color: colors.accent }]}>{p.status}</Text>
                                </View>
                            </View>
                            {p.suggested_description && (
                                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 18 }}>
                                    {p.suggested_description}
                                </Text>
                            )}
                            <View style={[theme.divider]} />
                            <View style={theme.row}>
                                <Text style={theme.label}>Confidence</Text>
                                <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 14 }}>
                                    {(p.confidence * 100).toFixed(0)}%
                                </Text>
                            </View>
                            <View style={[theme.row, { marginTop: 6 }]}>
                                <Text style={theme.label}>Occurrences</Text>
                                <Text style={theme.mono}>{p.occurrences}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}
