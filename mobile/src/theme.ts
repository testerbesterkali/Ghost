import { StyleSheet } from 'react-native';

export const colors = {
    bgPrimary: '#0d0a07',
    bgSecondary: '#1a1410',
    bgTertiary: '#241c14',
    bgCard: 'rgba(30, 22, 14, 0.65)',
    accent: '#f27a1a',
    accentLight: '#ff9b47',
    accentDim: 'rgba(242, 122, 26, 0.10)',
    textPrimary: '#f5efe8',
    textSecondary: '#a89888',
    textMuted: '#6b5d50',
    border: 'rgba(255, 140, 50, 0.08)',
    borderAccent: 'rgba(242, 122, 26, 0.35)',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#42a5f5',
};

export const theme = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    safeArea: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    card: {
        backgroundColor: colors.bgCard,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 14,
    },
    cardAccent: {
        borderColor: colors.borderAccent,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    label: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '500',
    },
    value: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    btnPrimary: {
        backgroundColor: colors.accent,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    btnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
    },
    mono: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: colors.textMuted,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 12,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
});
