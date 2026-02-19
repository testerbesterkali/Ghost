import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { theme, colors } from '../theme';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
    const [stats, setStats] = useState({ events: 0, patterns: 0, ghosts: 0, executions: 0 });

    useEffect(() => { loadStats(); }, []);

    async function loadStats() {
        const [e, p, g, x] = await Promise.all([
            supabase.from('secure_events').select('*', { count: 'exact', head: true }),
            supabase.from('detected_patterns').select('*', { count: 'exact', head: true }),
            supabase.from('ghosts').select('*', { count: 'exact', head: true }),
            supabase.from('executions').select('*', { count: 'exact', head: true }),
        ]);
        setStats({
            events: e.count || 0,
            patterns: p.count || 0,
            ghosts: g.count || 0,
            executions: x.count || 0,
        });
    }

    return (
        <View style={theme.container}>
            <ScrollView contentContainerStyle={theme.scrollContent}>
                <Text style={[theme.title, { marginBottom: 20 }]}>Settings</Text>

                {/* Stats Overview */}
                <View style={[theme.card, theme.cardAccent]}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 14 }}>
                        Platform Stats
                    </Text>
                    <StatRow label="Total Events" value={stats.events.toLocaleString()} />
                    <StatRow label="Detected Patterns" value={stats.patterns.toString()} />
                    <StatRow label="Active Ghosts" value={stats.ghosts.toString()} />
                    <StatRow label="Executions" value={stats.executions.toString()} />
                </View>

                {/* Supabase Info */}
                <View style={theme.card}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 14 }}>
                        Supabase Project
                    </Text>
                    <StatRow label="Project" value="Ghost" />
                    <StatRow label="Region" value="eu-central-1" />
                    <StatRow label="Status" value="✓ Connected" />
                </View>

                {/* Toggles */}
                <View style={theme.card}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 14 }}>
                        Preferences
                    </Text>
                    <ToggleRow label="Push Notifications" />
                    <ToggleRow label="Auto-approve high confidence" />
                    <ToggleRow label="Dark Mode" defaultValue={true} />
                </View>
            </ScrollView>
        </View>
    );
}

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={[theme.row, { marginBottom: 8 }]}>
            <Text style={theme.label}>{label}</Text>
            <Text style={{ color: colors.textPrimary, fontWeight: '500', fontSize: 13 }}>{value}</Text>
        </View>
    );
}

function ToggleRow({ label, defaultValue = false }: { label: string; defaultValue?: boolean }) {
    const [on, setOn] = useState(defaultValue);
    return (
        <View style={[theme.row, { marginBottom: 10 }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{label}</Text>
            <Switch
                value={on}
                onValueChange={setOn}
                trackColor={{ false: colors.bgTertiary, true: colors.accent }}
                thumbColor={on ? '#fff' : colors.textMuted}
            />
        </View>
    );
}
