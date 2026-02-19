/**
 * ElementFingerprint — Multi-factor semantic identification for DOM elements.
 * PRD §3.1.1: Uses ARIA, text, visual position, DOM path, and surrounding
 * context instead of brittle CSS selectors.
 */

/** Positional data relative to viewport, responsive-aware */
export interface VisualPosition {
    x: number;
    y: number;
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
    /** Normalized position (0-1) for responsive comparison */
    relativeX: number;
    relativeY: number;
}

/** Sibling/parent context for structural matching */
export interface SurroundingContext {
    parentTag: string;
    parentRole: string | null;
    parentText: string | null;
    siblingCount: number;
    siblingIndex: number;
    previousSiblingTag: string | null;
    nextSiblingTag: string | null;
}

/**
 * The Semantic ID — stable across CSS class changes, ID randomization,
 * and responsive layouts (PRD §3.1.1 Element Fingerprinting).
 */
export interface ElementFingerprint {
    /** 1. ARIA attributes (accessibility tree) */
    aria: {
        role: string | null;
        label: string | null;
        describedBy: string | null;
        expanded: boolean | null;
        checked: boolean | null;
        selected: boolean | null;
    };
    /** 2. Text content (fuzzy hashed via simhash) */
    textHash: string;
    /** Raw text truncated to 200 chars for debugging — scrubbed of PII before transmission */
    textPreview: string;
    /** 3. Visual position relative to viewport */
    position: VisualPosition;
    /** 4. DOM path (tag hierarchy, no specific IDs) */
    domPath: string[];
    /** Tag name of the element */
    tagName: string;
    /** 5. Surrounding context (sibling elements, parent structure) */
    context: SurroundingContext;
    /** Input type if applicable */
    inputType: string | null;
    /** Form association if inside a <form> */
    formId: string | null;
}
