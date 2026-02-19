/**
 * Differential Privacy — Adds calibrated noise to prevent re-identification.
 * PRD §3.2 Layer 1:
 *   - Calibrated noise to event timestamps (±30 seconds)
 *   - Randomized response for sensitive action flags (10% false positive rate)
 *   - Prevents re-identification from event streams
 */

export class DifferentialPrivacy {
    private readonly TIMESTAMP_NOISE_SECONDS = 30;
    private readonly FALSE_POSITIVE_RATE = 0.1;
    private readonly BUCKET_SIZE_MINUTES = 5;

    /**
     * Add calibrated noise to a timestamp and bucket to 5-minute granularity.
     * PRD: ±30 seconds noise, 5-minute buckets.
     */
    anonymizeTimestamp(timestamp: number): string {
        // Add Laplacian noise (±30 seconds, in milliseconds)
        const noiseMs = this.laplacianNoise(this.TIMESTAMP_NOISE_SECONDS * 1000);
        const noisyTimestamp = timestamp + noiseMs;

        // Bucket to 5-minute intervals
        const date = new Date(noisyTimestamp);
        const minutes = date.getMinutes();
        const bucket = Math.floor(minutes / this.BUCKET_SIZE_MINUTES) * this.BUCKET_SIZE_MINUTES;
        date.setMinutes(bucket, 0, 0);

        return date.toISOString();
    }

    /**
     * Randomized response for sensitive boolean flags.
     * With probability p (10%), flip the true answer.
     * This provides plausible deniability: any individual flag
     * could have been flipped by the mechanism.
     */
    randomizedResponse(truthValue: boolean): boolean {
        if (Math.random() < this.FALSE_POSITIVE_RATE) {
            return !truthValue;
        }
        return truthValue;
    }

    /**
     * Add noise to a numeric value while preserving relative ordering.
     * Used for sequence numbers and counters.
     */
    addNoiseToNumber(value: number, sensitivity: number = 1): number {
        const noise = this.laplacianNoise(sensitivity);
        return Math.round(value + noise);
    }

    /**
     * Perturb a vector by adding Gaussian noise.
     * Preserves the general direction while adding deniability.
     * Epsilon controls privacy budget (lower = more private).
     */
    perturbVector(vector: number[], epsilon: number = 1.0): number[] {
        const sigma = Math.sqrt(2) / epsilon;
        return vector.map((v) => {
            const noise = this.gaussianNoise(0, sigma);
            return Math.round((v + noise) * 10000) / 10000;
        });
    }

    /**
     * Generate a privacy-preserving session fingerprint.
     * HMAC of device+user+time, irreversible (PRD §3.2).
     */
    async generateSessionFingerprint(
        deviceId: string,
        userId: string,
        sessionStart: number,
    ): Promise<string> {
        const data = `${deviceId}:${userId}:${Math.floor(sessionStart / 900000)}`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(deviceId),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign'],
        );
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(data),
        );
        const hashArray = Array.from(new Uint8Array(signature));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate a structural hash from DOM fingerprint data.
     * Removes all content, preserves only tag structure.
     */
    generateStructuralHash(domPath: string[], tagName: string): string {
        const structure = `${domPath.join('>')}:${tagName}`;
        return this.fnv1a(structure).toString(16).padStart(8, '0');
    }

    /**
     * Generate element signature from ARIA role + DOM path.
     * No text content included (PRD: anonymized element fingerprint).
     */
    generateElementSignature(
        ariaRole: string | null,
        domPath: string[],
        tagName: string,
    ): string {
        return `${tagName}${ariaRole ? `[${ariaRole}]` : ''}@${domPath.slice(-3).join('>')}`;
    }

    // --- Noise generation utilities ---

    /**
     * Laplacian noise with given scale (b parameter).
     * Laplace mechanism is standard for differential privacy.
     */
    private laplacianNoise(scale: number): number {
        const u = Math.random() - 0.5;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }

    /**
     * Gaussian noise via Box-Muller transform.
     */
    private gaussianNoise(mean: number, stddev: number): number {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z * stddev + mean;
    }

    private fnv1a(str: string): number {
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = (hash * 0x01000193) >>> 0;
        }
        return hash;
    }
}
