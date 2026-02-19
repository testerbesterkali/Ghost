import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

interface EventChartProps {
    events: Array<{ ingested_at: string }>;
}

export default function EventVolumeChart({ events }: EventChartProps) {
    const chartData = useMemo(() => {
        const bucketMinutes = 15;
        const now = Date.now();
        const buckets: Record<string, number> = {};

        // Create empty buckets for last 24h
        for (let i = 96; i >= 0; i--) {
            const t = new Date(now - i * bucketMinutes * 60000);
            const key = `${t.getHours().toString().padStart(2, '0')}:${(Math.floor(t.getMinutes() / bucketMinutes) * bucketMinutes).toString().padStart(2, '0')}`;
            buckets[key] = 0;
        }

        // Fill with actual data
        events.forEach((evt) => {
            const t = new Date(evt.ingested_at);
            const key = `${t.getHours().toString().padStart(2, '0')}:${(Math.floor(t.getMinutes() / bucketMinutes) * bucketMinutes).toString().padStart(2, '0')}`;
            if (buckets[key] !== undefined) buckets[key]++;
        });

        return Object.entries(buckets).map(([time, count]) => ({ time, count }));
    }, [events]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{
                background: 'rgba(16, 12, 8, 0.95)',
                border: '1px solid rgba(242, 122, 26, 0.25)',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
            }}>
                <div style={{ color: '#a89888', marginBottom: 2 }}>{label}</div>
                <div style={{ color: '#f27a1a', fontWeight: 600 }}>{payload[0].value} events</div>
            </div>
        );
    };

    return (
        <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f27a1a" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#f27a1a" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,140,50,0.06)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        tick={{ fill: '#6b5d50', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,140,50,0.08)' }}
                        tickLine={false}
                        interval={11}
                    />
                    <YAxis
                        tick={{ fill: '#6b5d50', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#f27a1a"
                        strokeWidth={2}
                        fill="url(#eventGradient)"
                        animationDuration={1200}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
