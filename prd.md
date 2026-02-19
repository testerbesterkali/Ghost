  I'll give you the unfiltered, complete PRD for building Ghost as a production-grade, acquisition-ready platform. No phases, no hand-holding—this is the full architecture of a system that can handle millions of workflows and pass enterprise security reviews.

---

# **GHOST: Autonomous Workflow Intelligence Platform**
## **Production-Grade Product Requirements Document**
**Version:** 2.0-FINAL | **Classification:** Strategic  
**Target:** Series A/B Enterprise SaaS | **Timeline:** 0→Production, 6 months

---

## **1. THE CORE INVENTION**

Ghost is not "AI automation." Ghost is **behavioral cloning infrastructure** that transforms human digital exhaust into self-healing software agents.

**The Technical Breakthrough:**
Traditional RPA records explicit user actions (click here, type this). Ghost records **intent vectors**—the semantic meaning of why the user took an action, generalized across contexts, then reconstructs execution paths dynamically based on runtime environment state.

This allows Ghost to:
- Observe a user copy-paste a customer record from Salesforce to HubSpot 3 times
- Understand the intent as "sync qualified lead to marketing automation"
- Execute the same intent on a UI that changed completely (different Salesforce skin, new HubSpot layout)
- Self-heal when APIs fail by falling back to browser automation, or vice versa

---

## **2. SYSTEM ARCHITECTURE**

### **2.1 Data Flow: The Ghost Pipeline**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 0: OBSERVATION SURFACE                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Browser   │  │   Desktop   │  │   Mobile    │  │   API/Webhook       │ │
│  │  Extension  │  │    Agent    │  │   (RN)      │  │   (Server-side)     │ │
│  │  (Chrome,   │  │  (macOS,    │  │  (iOS,      │  │  (Stripe, Twilio,   │ │
│  │   Edge, FF) │  │   Windows,  │  │   Android)  │  │   internal APIs)    │ │
│  │             │  │   Linux)    │  │             │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────────┘
          │                │                │                    │
          └────────────────┴────────────────┴────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 1: PRIVACY-COMPUTING EDGE                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    SECURE ENCLAVE PROCESSING                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │   Local     │  │   PII       │  │   Intent    │  │   Differential  │ │ │
│  │  │   Embedding │  │   Scrubber  │  │   Encoder   │  │   Privacy       │ │ │
│  │  │   (ONNX)    │  │   (spaCy)   │  │   (TinyBERT)│  │   (Noise inj.)  │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  │                                                                         │ │
│  │  OUTPUT: Anonymized intent vectors + structural fingerprints            │ │
│  │  NO raw screenshots, NO keystrokes, NO credentials leave device         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 2: PATTERN INTELLIGENCE                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    TEMPORAL GRAPH NEURAL NETWORK                        │ │
│  │                                                                         │ │
│  │  Input: Stream of intent vectors (user U, time T, context C)           │ │
│  │  Process:                                                              │ │
│  │    1. Sequence embedding: Transformer encoder for temporal patterns    │ │
│  │    2. Cross-user clustering: Identify org-wide workflows               │ │
│  │    3. Abstraction lifting: Specific → General (parameterization)       │ │
│  │    4. Confidence scoring: Statistical + LLM-based validation           │ │
│  │                                                                         │ │
│  │  Output: Candidate Ghosts (parameterized workflow templates)           │ │
│  │                                                                         │ │
│  │  Example transformation:                                               │ │
│  │  Raw: "Clicked 'Copy Email' on john@example.com at 9:03am"             │ │
│  │  → Intent: "Extract primary contact email from CRM record"             │ │
│  │  → Generalized: "Extract {field} from {CRM} record"                    │ │
│  │  → Ghost Template: Salesforce→HubSpot lead sync with field mapping     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 3: EXECUTION RUNTIME                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    ADAPTIVE EXECUTION ENGINE                            │ │
│  │                                                                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │   Planner   │  │   Selector  │  │   Executor  │  │   Verifier      │ │ │
│  │  │   (LLM)     │  │   (Router)  │  │   (Multi-   │  │   (Assertion    │ │ │
│  │  │             │  │             │  │    modal)   │  │    checker)     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  │                                                                         │ │
│  │  Execution Strategy Selection:                                         │ │
│  │    - API available + stable? → Direct REST/GraphQL                     │ │
│  │    - API rate limited/unstable? → Browser automation with API fallback │ │
│  │    - UI changed? → Computer vision + DOM reconciliation                │ │
│  │    - Complex decision? → LLM reasoning with tool use                   │ │
│  │                                                                         │ │
│  │  Self-Healing Mechanisms:                                              │ │
│  │    - DOM selector failed → Try semantic matching (ARIA labels, text)   │ │
│  │    - Page structure changed → CV-based element location                │ │
│  │    - Flow blocked → LLM replanning with alternative paths              │ │
│  │    - CAPTCHA/2FA → Human-in-the-loop escalation                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 4: GOVERNANCE & MEMORY                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │   Org       │  │   Feedback  │  │   Version   │  │   Compliance    │ │ │
│  │  │   Knowledge │  │   Loop      │  │   Control   │  │   Ledger        │ │ │
│  │  │   Graph     │  │   (RLHF)    │  │   (Git-like)│  │   (Immutable)   │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  │                                                                         │ │
│  │  Continuous Improvement:                                               │ │
│  │    - Every execution enriches the knowledge graph                      │ │
│  │    - User corrections fine-tune the planner model                      │ │
│  │    - A/B testing of execution strategies per Ghost                     │ │
│  │    - Full provenance for audit/compliance                              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## **3. COMPONENT SPECIFICATIONS**

### **3.1 Layer 0: Observation Surface**

#### **3.1.1 Browser Extension: "Ghost Shadow"**

**Technical Requirements:**
- **Manifest V3 compliant** (Chrome Web Store requirement)
- **Content Script Injection:** Shadow DOM isolation to prevent site detection/conflict
- **Event Capture:**
  - DOM mutations (MutationObserver with subtree monitoring)
  - User interactions (click, input, scroll, focus) with target element serialization
  - Network interception (declarativeNetRequest for API call observation)
  - Console/error logging for failure analysis
- **Performance:** <5% CPU overhead, <50MB RAM, throttled to 2fps during idle

**Data Structure (Per Event):**
```typescript
interface RawEvent {
  timestamp: number;           // High-precision, monotonic clock
  sessionId: string;           // Ephemeral, rotated every 15min
  eventType: 'dom_mut' | 'user_int' | 'network' | 'error';
  payload: {
    // For user_int:
    action: 'click' | 'input' | 'scroll' | 'navigate';
    target: ElementFingerprint; // Semantic + structural ID
    value?: string;             // Hashed, encrypted if sensitive
    
    // For dom_mut:
    mutations: MutationRecord[];
    snapshotHash: string;       // For integrity verification
    
    // For network:
    url: string;                // Sanitized (query params hashed)
    method: string;
    statusCode: number;
    responseType: string;
  };
  context: {
    url: string;                // Current page, normalized
    viewport: { width, height };
    userAgent: string;          // Browser fingerprint
    tabId: string;
  };
}
```

**Element Fingerprinting (The "Semantic ID"):**
Instead of brittle CSS selectors, Ghost uses multi-factor identification:
1. **ARIA attributes** (accessibility tree)
2. **Text content** (fuzzy hashed)
3. **Visual position** (relative to viewport, responsive-aware)
4. **DOM path** (tag hierarchy, not specific IDs)
5. **Surrounding context** (sibling elements, parent structure)

This allows reconstruction even when:
- CSS classes change (Tailwind-style utility classes)
- Element IDs are randomized (React production builds)
- Page is responsive (mobile vs desktop)

#### **3.1.2 Desktop Agent: "Ghost Core"**

**Platform:** Electron with native modules (macOS/Windows/Linux)

**Capabilities Beyond Browser:**
- **Cross-application observation:** Detect when user switches from Salesforce (browser) to Excel (desktop)
- **System-level triggers:** File system events, scheduled tasks, email client integration
- **Credential vault integration:** 1Password, LastPass, macOS Keychain (with explicit permission)
- **Screen recording (optional):** Frame capture at 1fps, processed locally, immediately hashed for CV training

**Security Model:**
- Runs as unprivileged user process (no admin/root)
- All processing in isolated renderer process (Electron sandbox)
- Native modules only for: secure storage, screen capture, network monitoring
- Code signing + notarization (macOS) / EV cert (Windows)

#### **3.1.3 Mobile Agent: "Ghost Mobile" (React Native)**

**Architecture:**
- **Bridge-based:** Native modules for screen recording (iOS ReplayKit, Android MediaProjection)
- **Background processing:** Headless JS for pattern detection when app backgrounded
- **Privacy-first:** On-device ML only, no cloud processing for raw data

**Limitations (v1):**
- iOS: Cannot automate other apps (sandbox restriction). Focus on: keyboard input suggestion, notification handling, app-to-app shortcuts
- Android: AccessibilityService for cross-app automation (requires Play Store approval, "productivity" category)

---

### **3.2 Layer 1: Privacy-Computing Edge**

**The Non-Negotiable Constraint:**
Raw user data (screenshots, keystrokes, URLs) **never** leaves the user's device in unencrypted form. This is the trust foundation.

**Processing Pipeline (On-Device):**

1. **Local Embedding Generation:**
   - Model: `all-MiniLM-L6-v2` quantized to ONNX (20MB)
   - Converts text inputs (form labels, button text, page titles) to 384-dim vectors
   - Enables semantic similarity without exposing content

2. **PII Scrubbing (Presidio):**
   - Entity recognition: Emails, phone numbers, SSNs, credit cards, names
   - Replacement: `[EMAIL_1]`, `[NAME_2]` (consistent hashing for pattern matching)
   - Custom entity training for domain-specific PII (patient IDs, account numbers)

3. **Intent Encoding (TinyBERT):**
   - Model: Distilled BERT for action classification (128-dim)
   - Classes: `data_entry`, `navigation`, `communication`, `research`, `approval`, etc.
   - Output: Intent vector + confidence score

4. **Differential Privacy:**
   - Add calibrated noise to event timestamps (±30 seconds)
   - Randomized response for sensitive action flags (10% false positive rate)
   - Preers re-identification from event streams

**Output to Cloud:**
```typescript
interface SecureEvent {
  sessionFingerprint: string;  // HMAC of device+user+time (irreversible)
  timestampBucket: string;     // 5-minute granularity only
  intentVector: number[128];   // Encoded action semantics
  structuralHash: string;      // DOM structure fingerprint (no content)
  orgId: string;               // For routing only
  // NO raw text, NO URLs, NO screenshots
}
```

---

### **3.3 Layer 2: Pattern Intelligence**

**The Core Algorithm: Temporal Intent Clustering (TIC)**

**Problem:** Given a stream of secure events from thousands of users, identify recurring workflows that can be automated.

**Solution Architecture:**

**Step 1: Sequence Embedding (Transformer Encoder)**
- Input: Sliding window of intent vectors (last 50 events)
- Model: 4-layer Transformer, 256 hidden dim, 8 attention heads
- Output: Contextual embedding capturing "what is the user trying to accomplish right now"
- Training: Contrastive learning—sequences leading to same outcome should be close in embedding space

**Step 2: Online Clustering (HDBSCAN + Temporal Constraints)**
- Density-based clustering in embedding space
- Temporal constraint: Events in same cluster must occur within 30-minute windows
- Minimum cluster size: 3 occurrences (prevents noise)
- Result: Candidate workflow instances

**Step 3: Abstraction Lifting (LLM-based Generalization)**
- Input: 5-10 concrete instances of a cluster
- Model: GPT-4o (cloud) or Llama 3 70B (on-prem for enterprise)
- Prompt engineering:
  ```
  Given these similar user interaction sequences:
  [Instance 1: Clicked "New Lead", typed "John Doe", selected "Qualified"]
  [Instance 2: Clicked "New Lead", typed "Jane Smith", selected "Qualified"]
  
  Generalize to a reusable workflow template:
  - Trigger: User clicks "New Lead" button
  - Parameters: {lead_name}, {lead_status}
  - Actions: Fill form fields, submit
  - Variations: Status may differ (Qualified, Unqualified)
  ```

**Step 4: Confidence Scoring**
- Statistical: Variance in execution time, success rate of similar patterns
- Semantic: LLM-evaluated "automatability" (1-10 scale)
- Organizational: Frequency across users (org-wide vs individual habit)
- Threshold: 0.85 confidence for auto-suggestion, 0.70 for manual review

**Output: Ghost Template**
```typescript
interface GhostTemplate {
  id: string;
  name: string;                    // Auto-generated: "Salesforce Lead Creation"
  description: string;             // LLM-generated natural language
  trigger: {
    type: 'event' | 'schedule' | 'api';
    condition: IntentCondition;    // e.g., "intent == 'create_lead' && app == 'salesforce'"
  };
  parameters: Parameter[];         // Extracted variables with types
  executionPlan: ExecutionNode[];  // DAG of actions
  confidence: number;
  usageStats: {
    observedCount: number;
    userCount: number;
    avgExecutionTime: number;
  };
}
```

---

### **3.4 Layer 3: Execution Runtime**

**The "Ghost Executor" Service**

**Architecture:** Kubernetes-deployed, horizontally scalable pods

**Components:**

1. **Planner (LLM-based):**
   - Input: Ghost template + current environment state
   - Output: Concrete execution plan with fallback branches
   - Model: GPT-4o with function calling
   - Tools available:
     - `navigate_to(url)`
     - `click_element(selector_strategy, value)`
     - `input_text(selector, text)`
     - `api_call(endpoint, method, body)`
     - `extract_data(selector, format)`
     - `human_escalation(reason)`

2. **Selector (Strategy Pattern):**
   - Maintains registry of element selection strategies, ranked by reliability
   - Strategies:
     - `semantic`: ARIA labels, button text (most stable)
     - `structural`: DOM path + sibling context
     - `visual`: Computer vision (element screenshot matching)
     - `coordinate`: Absolute position (last resort, deprecated)
   - Runtime selection: Try semantic → structural → visual → escalate

3. **Executor (Multi-Modal):**
   - **Browser Mode:** Playwright-controlled Chromium/Firefox/WebKit
     - Stealth plugins: Fingerprint masking, bot detection evasion
     - Session persistence: Cookies, localStorage, authentication state
   - **API Mode:** Direct HTTP calls with automatic auth (OAuth refresh, token rotation)
   - **Hybrid Mode:** API primary, browser fallback for UI-only actions

4. **Verifier (Assertion Engine):**
   - Post-execution validation: Did the intended outcome occur?
   - Methods:
     - DOM state check: "Success message visible"
     - API confirmation: "GET /leads/123 returns 200"
     - Side-effect detection: "Email received in inbox"
   - Failure triggers: Retry with alternative strategy → Escalate to human

**Self-Healing Implementation:**

```typescript
class SelfHealingExecutor {
  async execute(node: ExecutionNode, context: ExecutionContext): Promise<Result> {
    const strategies = this.selector.getStrategies(node.target, context);
    
    for (const strategy of strategies) {
      try {
        const result = await this.attempt(node, strategy);
        if (result.success) {
          // Learn: This strategy worked in this context
          await this.feedbackLoop.recordSuccess(node, strategy, context);
          return result;
        }
      } catch (error) {
        // Learn: This strategy failed, try next
        await this.feedbackLoop.recordFailure(node, strategy, error);
      }
    }
    
    // All strategies exhausted: Replan with LLM
    const newPlan = await this.planner.replan(node, context, 'all_strategies_failed');
    return this.execute(newPlan, context);
  }
}
```

---

### **3.5 Layer 4: Governance & Memory**

**Organization Knowledge Graph:**
- Nodes: Users, Applications, Data Entities (Leads, Invoices), Workflows
- Edges: "creates", "approves", "depends_on", "triggers"
- Purpose: Understand organizational context for better automation suggestions
- Example: "User X always approves invoices >$10K from Vendor Y" → Auto-approval Ghost

**Reinforcement Learning from Human Feedback (RLHF):**
- User corrections (editing Ghost actions) are training signals
- Online learning: Small model updates weekly (LoRA fine-tuning)
- Offline learning: Full model retrain quarterly on accumulated feedback

**Version Control (Git-like for Ghosts):**
- Every Ghost is versioned: v1.0 (initial), v1.1 (user correction), v2.0 (major refactor)
- Branching: A/B testing different execution strategies
- Rollback: Instant revert to previous version if error rate spikes

**Compliance Ledger (Immutable Audit):**
- Blockchain-inspired: Cryptographic chaining of execution logs
- Tamper-evident: Any modification breaks hash chain
- Queryable: SQL interface for compliance reports ("Show all Ghost actions by User X in March")

---

## **4. SECURITY ARCHITECTURE**

### **4.1 Zero-Trust Implementation**

**Principle:** Never trust, always verify, assume breach.

**Layers:**

| Layer | Control | Implementation |
|-------|---------|----------------|
| Identity | MFA + Biometric + Hardware keys | WebAuthn/FIDO2 required for admin |
| Device | Device attestation + EDR integration | CrowdStrike/SentinelOne API checks |
| Network | mTLS everywhere, no VPN required | SPIFFE/SPIRE for service identity |
| Application | RBAC + ABAC + Contextual access | OPA (Open Policy Agent) for decisions |
| Data | Field-level encryption, tokenization | AES-256-GCM, Vault for key management |

### **4.2 Data Protection**

**Classification:**
- **Critical:** Credentials (encrypted with user public key, only decryptable on their device)
- **Sensitive:** Workflow patterns (encrypted at rest, tokenized in logs)
- **Internal:** Usage analytics (anonymized, aggregated)

**Encryption Strategy:**
- **In Transit:** TLS 1.3, certificate pinning in mobile apps
- **At Rest:** AES-256-GCM with per-tenant keys in AWS KMS
- **In Use:** Confidential Computing (AMD SEV-SNP) for LLM inference on sensitive data

### **4.3 Threat Mitigations**

| Threat | Mitigation |
|--------|-----------|
| Prompt Injection | Input sanitization, output validation, sandboxed execution |
| Model Extraction | Rate limiting, query complexity analysis, watermarking outputs |
| Supply Chain | SLSA Level 3, signed artifacts, dependency scanning (Snyk) |
| Insider Threat | Dual-control for admin actions, behavior analytics (UEBA) |
| Ransomware | Immutable backups (WORM storage), 4-hour RTO |

---

## **5. INFRASTRUCTURE & DEPLOYMENT**

### **5.1 Cloud Architecture (AWS Primary, Azure/GCP DR)**

```
┌─────────────────────────────────────────────────────────────────┐
│                         GLOBAL LAYER                            │
│  CloudFront (CDN) + Route 53 (Geo-routing) + WAF (OWASP rules) │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   US-EAST    │      │   EU-WEST    │      │  APAC-SOUTH  │
│  (Primary)   │      │  (GDPR Hub)  │      │  (Latency)   │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     KUBERNETES CLUSTERS (EKS)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   API       │  │   Worker    │  │   GPU Nodes (LLM)       │ │
│  │   Servers   │  │   Pods      │  │   (g5.2xlarge spot)     │ │
│  │   (t3a.2xl) │  │   (c6i.4xl) │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
│  Namespace isolation: tenant-per-namespace (strong)            │
│  Service mesh: Istio with mTLS, traffic encryption             │
│  Policy: Kyverno for security policies, OPA for authz          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  RDS        │  │  ElastiCache│  │   S3 (Encrypted)        │ │
│  │  Postgres   │  │  Redis      │  │   (Backups, Logs)       │ │
│  │  (Multi-AZ) │  │  (Cluster)  │  │   (Object Lock)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  MSK        │  │  OpenSearch │  │   DynamoDB (Session)    │ │
│  │  (Kafka)    │  │  (Logs)     │  │   (TTL, high write)     │ │
│  │  (Event Bus)│  │             │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **5.2 Supabase Configuration**

**Why Supabase:**
- **Postgres:** Battle-tested, familiar, excellent RLS
- **Realtime:** Built-in WebSocket subscriptions for live UI updates
- **Edge Functions:** Deno runtime, deploy globally, low cold start
- **Storage:** S3-compatible, signed URLs, transformation pipeline

**Production Setup:**
- **Project per region:** us-east-1, eu-west-1, ap-south-1
- **Database:** 16 vCPU, 64GB RAM, 2TB storage (io2 block express)
- **Read replicas:** 2 per region for analytics queries
- **PGBouncer:** Connection pooling (1000 max connections)
- **Backups:** Point-in-time recovery, 35-day retention
- **Monitoring:** Supabase Dashboard + Datadog integration

**Critical RLS Policies:**
```sql
-- Tenant isolation: Users can only access their org's data
CREATE POLICY tenant_isolation ON ALL TABLES
  USING (org_id = current_setting('app.current_org')::uuid);

-- Ghost execution: Only approved Ghosts can be executed
CREATE POLICY ghost_approval ON ghosts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'automation_engineer')
    )
  );

-- Audit immutability: Logs cannot be modified, only appended
CREATE POLICY audit_append_only ON execution_logs
  FOR ALL USING (false) WITH CHECK (true);
```

---

## **6. REACT NATIVE IMPLEMENTATION**

### **6.1 Architecture: The "Ghost Mobile" App**

**Navigation:** React Navigation v6 (Native Stack)

**State Management:**
- **Server State:** TanStack Query (React Query) v5
  - Caching: 5min stale time, background refetch
  - Optimistic updates: Ghost status changes reflect immediately
- **Client State:** Zustand
  - Auth slice: tokens, user, org
  - UI slice: theme, modals, navigation history
  - Offline slice: pending actions, sync queue

**Key Native Modules:**

1. **GhostCaptureModule** (iOS/Android)
   - **iOS:** ReplayKit for screen recording, RPSystemBroadcastPickerView for broadcast
   - **Android:** MediaProjection API, foreground service for persistence
   - **Output:** Raw video frames (1fps) + AccessibilityNodeInfo tree

2. **GhostSecureStorageModule**
   - **iOS:** Keychain (kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
   - **Android:** Keystore + EncryptedSharedPreferences
   - **Purpose:** Auth tokens, encryption keys, biometric state

3. **GhostAutomationModule** (Android only, iOS restricted)
   - **AccessibilityService:** Monitor window changes, perform clicks/swipes
   - **InputMethodService:** Custom keyboard for text injection
   - **Intent handling:** Intercept and automate app-to-app flows

4. **GhostNetworkModule**
   - **VPNService (Android):** Packet capture for API observation (optional, enterprise only)
   - **NetworkExtension (iOS):** Limited to DNS observation

**UI/UX Patterns:**

- **Ghost Feed:** TikTok-style vertical scroll of "Detected Patterns" cards
  - Swipe right: "Create Ghost" (one-tap approval)
  - Swipe left: "Not Useful" (feedback for model)
  - Tap: View detailed execution preview

- **Ghost Studio:** Visual workflow editor (read-only for AI-generated, editable for manual)
  - Nodes: Trigger, Action, Condition, Loop
  - Zoom/pan gesture handling
  - Real-time execution highlighting

- **Ghost Monitor:** Live dashboard
  - Running Ghosts: Progress bars, current step
  - Failed executions: One-tap retry with correction
  - Approval queue: Human-in-the-loop actions

**Performance Targets:**
- Time to Interactive: <2s on iPhone 12 / Pixel 6
- Frame rate: 60fps for all animations
- Bundle size: <40MB (compressed)
- Memory usage: <150MB average

---

## **7. API DESIGN**

### **7.1 Core Endpoints**

**Authentication:**
```
POST /v1/auth/token
  - Grant type: authorization_code (OAuth 2.1)
  - PKCE required for mobile
  - Response: access_token (15min), refresh_token (7days), id_token (JWT)

POST /v1/auth/refresh
  - Rotate refresh tokens (detect reuse = revoke all)
```

**Sessions (Observation Data):**
```
POST /v1/sessions/batch
  - Body: Array of SecureEvent (max 100/batch)
  - Response: 202 Accepted, processed async
  - Rate limit: 1000 events/minute per device

GET /v1/sessions/:id/patterns
  - Returns detected patterns from this session
  - Real-time: Server-sent events for new detections
```

**Ghosts (Automation):**
```
GET /v1/ghosts
  - Query: status, org_id, created_by
  - Response: Paginated list with execution stats

POST /v1/ghosts
  - Body: GhostTemplate (from pattern or manual)
  - Validation: Schema check, security scan, quota check
  - Response: 201 with Ghost ID, status: 'pending_approval'

POST /v1/ghosts/:id/execute
  - Trigger immediate execution
  - Async: Returns execution_id for polling
  - Webhook option: Callback URL on completion

PATCH /v1/ghosts/:id
  - Update: name, description, is_active
  - Versioning: Creates new version, doesn't mutate running
```

**Executions:**
```
GET /v1/executions/:id
  - Full trace: Plan → Actions → Results → Verifications
  - Streaming: WebSocket for real-time updates

POST /v1/executions/:id/feedback
  - Correction data for RLHF
  - Body: {correctedActions, satisfactionScore, notes}
```

**Admin/Enterprise:**
```
GET /v1/admin/audit-logs
  - Compliance export (CSV/JSON)
  - Filters: date range, user, ghost, action type

POST /v1/admin/policies
  - Org-wide automation policies
  - Example: Block all ghosts involving payments >$10K without approval
```

### **7.2 WebSocket Events**

**Client → Server:**
```
subscribe:ghosts:{org_id}     # Real-time ghost status updates
subscribe:executions:{user_id} # Personal execution feed
```

**Server → Client:**
```
ghost.detected {pattern, confidence}
ghost.approved {ghost_id, approved_by}
execution.started {execution_id, ghost_id}
execution.step {execution_id, step_number, total_steps, description}
execution.completed {execution_id, status, duration}
execution.failed {execution_id, error, retryable}
approval.required {execution_id, reason, timeout}
```

---

## **8. MONITORING & OBSERVABILITY**

### **8.1 The "Ghost Watch" Internal Tool**

**Purpose:** Dogfood Ghost by using it to monitor Ghost.

**Implementation:**
- Ghosts monitor our own infrastructure:
  - "Check Datadog for error spikes, post to #incidents if >100/min"
  - "Scan S3 for unencrypted buckets, email security team"
  - "Monitor competitor pricing pages, alert product team of changes"

**Metrics:**

| Category | Metric | Target | Alert |
|----------|--------|--------|-------|
| **Reliability** | Ghost success rate | >99.5% | PagerDuty if <99% for 5min |
| | Self-healing rate | >80% of failures | Slack notify if <70% |
| **Performance** | P95 execution time | <30s | Auto-scale if >45s |
| | LLM latency | <2s | Fallback to cache if >5s |
| **Cost** | Cost per execution | <$0.05 | Freeze new deployments if >$0.10 |
| | LLM token usage | <1000/exec | Optimize prompt if >2000 |
| **Security** | Failed auth attempts | <10/min | Auto-block IP if >100/min |
| | Data access anomalies | 0 | Immediate SEV-1 |

### **8.2 Logging Strategy**

**Structured JSON Logs:**
```json
{
  "timestamp": "2025-02-19T10:23:45Z",
  "service": "ghost-executor",
  "level": "info",
  "trace_id": "abc123",
  "span_id": "def456",
  "org_id": "org_789",
  "ghost_id": "ghost_abc",
  "execution_id": "exec_def",
  "event": "step_completed",
  "data": {
    "step_number": 3,
    "strategy": "semantic",
    "duration_ms": 450,
    "cache_hit": true
  }
}
```

**Retention:**
- Hot (Elasticsearch): 7 days
- Warm (S3): 90 days
- Cold (Glacier): 7 years (compliance)

---

## **9. COMPLIANCE & CERTIFICATIONS**

### **9.1 SOC 2 Type II**

**Controls:**
- **CC6.1:** Logical access security (RBAC, MFA)
- **CC6.2:** Access removal (automated offboarding)
- **CC7.1:** Security operations (monitoring, incident response)
- **CC7.2:** Vulnerability management (weekly scans, 30-day SLA)
- **CC8.1:** Change management (peer review, automated testing)

**Audit:** Annual, Big 4 firm

### **9.2 GDPR**

**Technical Measures:**
- Pseudonymization by default (user_id → hash)
- Data minimization (only collect necessary intent vectors)
- Right to erasure: API endpoint + 30-day automated deletion
- Data portability: Export all user data as JSON

**Organizational Measures:**
- DPO appointment (required >250 employees)
- Records of processing activities (ROPA)
- DPIA for high-risk processing (AI model training)

### **9.3 ISO 27001**

**Scope:** All Ghost infrastructure, personnel, processes

**Key Documents:**
- Information Security Policy (board-approved)
- Risk Assessment (annual, quantitative scoring)
- Statement of Applicability (114 controls mapped)

---

## **10. BUSINESS MODEL INTEGRATION**

### **10.1 Pricing Mechanics**

**Metering:**
- **Observation Events:** Free (required for value creation)
- **Ghost Executions:** $0.10/execution (bulk discounts at 10K+/mo)
- **Advanced Features:** $0.50/execution (API-only, CV-required, multi-step)

**Enterprise Contracts:**
- Minimum commitment: $50K/year
- Includes: Dedicated support, custom models, on-prem option
- Upsell: Professional services for complex workflow migration ($300/hr)

### **10.2 Acquisition Readiness**

**Technical DD Checklist:**
- [ ] Clean IP (no GPL contamination, all licenses documented)
- [ ] Scalable architecture (load test: 10K concurrent executions)
- [ ] Security certifications (SOC 2, ISO 27001)
- [ ] Financial model: 80%+ gross margins at scale
- [ ] Team: 2 senior engineers minimum (bus factor >1)

**Strategic Value to Acquirers:**

| Acquirer | Strategic Fit | Valuation Multiple |
|----------|--------------|-------------------|
| **Salesforce** | "Einstein" needs autonomous layer | 15-20x ARR |
| **ServiceNow** | Next-gen RPA replacement | 12-15x ARR |
| **Microsoft** | Copilot integration, Azure anchor | 10-12x ARR |
| **UiPath** | Technical talent + modern architecture | 8-10x ARR |
| **OpenAI** | Enterprise distribution channel | 20x+ ARR (strategic) |

---

## **11. THE UNFAIR ADVANTAGE**

**Why You Win:**

1. **Data Flywheel:** Every execution makes all Ghosts smarter (cross-customer learning, anonymized)
2. **Switching Cost:** Once 50+ Ghosts run, migration is 6-month project
3. **Network Effects:** More users in org = better pattern detection = more value
4. **Technical Moat:** Self-healing execution requires 3 hard things: CV, LLM planning, and robust infra—each takes 12+ months to replicate

**The Real Secret:**
You're not selling automation. You're selling **organizational memory**. When your best ops person leaves, their Ghosts stay. This is irreplaceable.

---

