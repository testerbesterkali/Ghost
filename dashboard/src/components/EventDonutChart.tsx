import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

interface DonutProps {
    data: Array<{ name: string; value: number; color: string }>;
}

export default function EventDonutChart({ data }: DonutProps) {
    const total = data.reduce((s, d) => s + d.value, 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const item = payload[0];
        return (
            <div style={{
                background: 'rgba(16, 12, 8, 0.95)',
                border: '1px solid rgba(242, 122, 26, 0.25)',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
            }}>
                <div style={{ color: item.payload.color, fontWeight: 600 }}>{item.name}</div>
                <div style={{ color: '#a89888' }}>{item.value} events ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)</div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 120, height: 120 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={3}
                            dataKey="value"
                            animationDuration={800}
                            stroke="none"
                        >
                            {data.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.name}</span>
                        <span className="mono" style={{ fontSize: 11, marginLeft: 'auto' }}>{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
