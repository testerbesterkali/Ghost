/**
 * ElementFingerprinter — Creates multi-factor semantic IDs for DOM elements.
 * PRD §3.1.1 Element Fingerprinting: ARIA, text, visual position, DOM path,
 * and surrounding context. Stable across CSS changes, ID randomization,
 * and responsive layouts.
 */

import {
    ElementFingerprint,
    VisualPosition,
    SurroundingContext,
} from '../types/element-fingerprint';

export class ElementFingerprinter {
    /**
     * Create a full fingerprint of a DOM element.
     */
    fingerprint(el: Element): ElementFingerprint {
        return {
            aria: this.extractAria(el),
            textHash: this.simhash(this.getDirectText(el)),
            textPreview: this.getDirectText(el).slice(0, 200),
            position: this.getVisualPosition(el),
            domPath: this.getDomPath(el),
            tagName: el.tagName.toLowerCase(),
            context: this.getSurroundingContext(el),
            inputType: this.getInputType(el),
            formId: this.getFormId(el),
        };
    }

    /** 1. ARIA attributes (accessibility tree) */
    private extractAria(el: Element) {
        return {
            role: el.getAttribute('role') || (el as HTMLElement).role || null,
            label:
                el.getAttribute('aria-label') ||
                el.getAttribute('aria-labelledby') ||
                null,
            describedBy: el.getAttribute('aria-describedby') || null,
            expanded: this.parseBoolAttr(el, 'aria-expanded'),
            checked: this.parseBoolAttr(el, 'aria-checked'),
            selected: this.parseBoolAttr(el, 'aria-selected'),
        };
    }

    /** 2. SimHash for fuzzy text matching */
    private simhash(text: string): string {
        if (!text) return '0'.repeat(32);

        const shingles = this.getShingles(text.toLowerCase().trim(), 3);
        const vector = new Int32Array(128);

        for (const shingle of shingles) {
            const hash = this.fnv1a(shingle);
            for (let i = 0; i < 128; i++) {
                if ((hash >> (i % 32)) & 1) {
                    vector[i]++;
                } else {
                    vector[i]--;
                }
            }
        }

        let result = '';
        for (let i = 0; i < 128; i++) {
            result += vector[i] > 0 ? '1' : '0';
        }
        return this.binaryToHex(result);
    }

    private getShingles(text: string, k: number): string[] {
        const shingles: string[] = [];
        for (let i = 0; i <= text.length - k; i++) {
            shingles.push(text.substring(i, i + k));
        }
        return shingles;
    }

    private fnv1a(str: string): number {
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = (hash * 0x01000193) >>> 0;
        }
        return hash;
    }

    private binaryToHex(binary: string): string {
        let hex = '';
        for (let i = 0; i < binary.length; i += 4) {
            hex += parseInt(binary.substring(i, i + 4), 2).toString(16);
        }
        return hex;
    }

    /** Get direct text content (not children's text) */
    private getDirectText(el: Element): string {
        let text = '';
        for (const node of Array.from(el.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += (node.textContent || '').trim() + ' ';
            }
        }
        // Also check value for inputs
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            text += el.placeholder || '';
        }
        return text.trim();
    }

    /** 3. Visual position relative to viewport */
    private getVisualPosition(el: Element): VisualPosition {
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            viewportWidth: vw,
            viewportHeight: vh,
            relativeX: vw ? Math.round((rect.x / vw) * 1000) / 1000 : 0,
            relativeY: vh ? Math.round((rect.y / vh) * 1000) / 1000 : 0,
        };
    }

    /** 4. DOM path — tag hierarchy, no specific IDs */
    private getDomPath(el: Element): string[] {
        const path: string[] = [];
        let current: Element | null = el;
        while (current && current !== document.documentElement) {
            const tag = current.tagName.toLowerCase();
            const role = current.getAttribute('role');
            const entry = role ? `${tag}[role=${role}]` : tag;
            path.unshift(entry);
            current = current.parentElement;
        }
        return path;
    }

    /** 5. Surrounding context (siblings, parent) */
    private getSurroundingContext(el: Element): SurroundingContext {
        const parent = el.parentElement;
        const siblings = parent ? Array.from(parent.children) : [];
        const index = siblings.indexOf(el);

        return {
            parentTag: parent?.tagName.toLowerCase() || 'none',
            parentRole: parent?.getAttribute('role') || null,
            parentText: parent ? this.getDirectText(parent).slice(0, 100) : null,
            siblingCount: siblings.length,
            siblingIndex: index,
            previousSiblingTag:
                index > 0 ? siblings[index - 1].tagName.toLowerCase() : null,
            nextSiblingTag:
                index < siblings.length - 1
                    ? siblings[index + 1].tagName.toLowerCase()
                    : null,
        };
    }

    private getInputType(el: Element): string | null {
        if (el instanceof HTMLInputElement) return el.type;
        if (el instanceof HTMLSelectElement) return 'select';
        if (el instanceof HTMLTextAreaElement) return 'textarea';
        return null;
    }

    private getFormId(el: Element): string | null {
        const form = el.closest('form');
        if (!form) return null;
        return (
            form.getAttribute('name') ||
            form.getAttribute('action') ||
            'unnamed-form'
        );
    }

    private parseBoolAttr(el: Element, attr: string): boolean | null {
        const val = el.getAttribute(attr);
        if (val === null) return null;
        return val === 'true';
    }
}
