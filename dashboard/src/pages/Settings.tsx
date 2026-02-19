import { useState } from 'react';
import { Settings as SettingsIcon, Save, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
    const [config, setConfig] = useState({
        orgId: 'default_org',
        llmProvider: 'openai',
        openaiModel: 'gpt-4o',
        autoApproveThreshold: '0.95',
        maxExecutionsPerMinute: '10',
    });
    const [saved, setSaved] = useState(false);

    function handleSave() {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    return (
        <div>
            <div className="page-header">
                <h1>Settings</h1>
                <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {/* Organization */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Organization</div>
                        <SettingsIcon size={14} className="text-muted" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <SettingField
                            label="Organization ID"
                            value={config.orgId}
                            onChange={(v) => setConfig({ ...config, orgId: v })}
                        />
                        <SettingField
                            label="Auto-Approve Threshold"
                            value={config.autoApproveThreshold}
                            onChange={(v) => setConfig({ ...config, autoApproveThreshold: v })}
                            hint="Patterns above this confidence are auto-suggested"
                        />
                        <SettingField
                            label="Max Executions/Minute"
                            value={config.maxExecutionsPerMinute}
                            onChange={(v) => setConfig({ ...config, maxExecutionsPerMinute: v })}
                        />
                    </div>
                </div>

                {/* LLM Configuration */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">LLM Provider</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Provider</label>
                            <div className="filters" style={{ marginBottom: 0 }}>
                                {['openai', 'llama', 'anthropic'].map((p) => (
                                    <button
                                        key={p}
                                        className={`filter-chip${config.llmProvider === p ? ' active' : ''}`}
                                        onClick={() => setConfig({ ...config, llmProvider: p })}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <SettingField
                            label="Model"
                            value={config.openaiModel}
                            onChange={(v) => setConfig({ ...config, openaiModel: v })}
                        />
                    </div>
                </div>

                {/* Supabase Project */}
                <div className="card card-accent">
                    <div className="card-header">
                        <div className="card-title">Supabase Project</div>
                        <a
                            href="https://supabase.com/dashboard/project/oocvlgwpirjutrfcaxoh"
                            target="_blank"
                            rel="noopener"
                            className="btn btn-secondary btn-sm"
                        >
                            <ExternalLink size={12} /> Dashboard
                        </a>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <InfoRow label="Project" value="Ghost (oocvlgwpirjutrfcaxoh)" />
                        <InfoRow label="Region" value="eu-central-1" />
                        <InfoRow label="URL" value="https://oocvlgwpirjutrfcaxoh.supabase.co" />
                        <InfoRow label="Functions" value="ingest-events · pattern-detector · ghost-executor" />
                    </div>
                </div>

                {/* Extension Config */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Browser Extension</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <InfoRow label="Status" value="✓ Connected" />
                        <InfoRow label="Endpoint" value="…/functions/v1/ingest-events" />
                        <InfoRow label="Rate Limit" value="1000 events/min" />
                        <InfoRow label="Batch Size" value="100 events" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingField({ label, value, onChange, hint }: {
    label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
    return (
        <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                }}
            />
            {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
            <span className="mono" style={{ fontSize: 12 }}>{value}</span>
        </div>
    );
}
