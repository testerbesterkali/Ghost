/**
 * Popup Script — Controls extension state and displays stats.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const enableToggle = document.getElementById(
        'enableToggle',
    ) as HTMLInputElement;
    const eventsReceived = document.getElementById('eventsReceived')!;
    const eventsProcessed = document.getElementById('eventsProcessed')!;
    const eventsSent = document.getElementById('eventsSent')!;
    const bufferSize = document.getElementById('bufferSize')!;
    const statusBadge = document.getElementById('status')!;
    const saveBtn = document.getElementById('saveConfig')!;
    const flushBtn = document.getElementById('flushBtn')!;
    const endpointInput = document.getElementById('endpoint') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const orgIdInput = document.getElementById('orgId') as HTMLInputElement;

    // Load saved config
    const config = await chrome.storage.local.get([
        'ghost_config',
        'ghost_enabled',
    ]);
    const savedConfig = config.ghost_config || {};

    enableToggle.checked = config.ghost_enabled !== false;
    endpointInput.value = savedConfig.endpoint || '';
    apiKeyInput.value = savedConfig.apiKey || '';
    orgIdInput.value = savedConfig.orgId || '';

    // Update stats every second
    const refreshStats = () => {
        chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
            if (chrome.runtime.lastError || !response) return;

            eventsReceived.textContent = formatNumber(
                response.totalEventsReceived || 0,
            );
            eventsProcessed.textContent = formatNumber(
                response.totalEventsProcessed || 0,
            );
            eventsSent.textContent = formatNumber(
                response.transmitterStats?.totalSent || 0,
            );
            bufferSize.textContent = formatNumber(
                response.transmitterStats?.bufferSize || 0,
            );

            const isActive = response.isEnabled;
            statusBadge.textContent = isActive ? 'Active' : 'Paused';
            statusBadge.className = `stat-value status-badge${isActive ? '' : ' inactive'}`;
        });
    };

    refreshStats();
    setInterval(refreshStats, 1000);

    // Toggle handler
    enableToggle.addEventListener('change', () => {
        chrome.runtime.sendMessage({
            type: 'TOGGLE_ENABLED',
            enabled: enableToggle.checked,
        });
    });

    // Save config
    saveBtn.addEventListener('click', () => {
        const newConfig = {
            endpoint: endpointInput.value.trim(),
            apiKey: apiKeyInput.value.trim(),
            orgId: orgIdInput.value.trim(),
        };

        chrome.runtime.sendMessage({
            type: 'UPDATE_CONFIG',
            config: newConfig,
        });

        // Visual feedback
        saveBtn.textContent = '✓ Saved';
        saveBtn.style.background = '#22c55e';
        setTimeout(() => {
            saveBtn.textContent = 'Save';
            saveBtn.style.background = '';
        }, 1500);
    });

    // Flush button
    flushBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'FORCE_FLUSH' }, () => {
            flushBtn.textContent = '✓ Flushed';
            setTimeout(() => {
                flushBtn.textContent = 'Flush Now';
            }, 1500);
        });
    });
});

function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
}
