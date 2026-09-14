# Building RepairGrid: Autonomous Civic Infrastructure Dispatch with Amazon Nova, Bedrock Multi-Agent Graphs, and AWS Serverless

Municipal infrastructure maintenance is notoriously slow and opaque. When a streetlight burns out, a pothole opens on an arterial road, or a storm drain clogs before a heavy rain, citizen complaints often languish in siloed municipal ticket queues for weeks. Dispatchers lack visual verification, duplicate reports overwhelm operations, field technicians lack real-time context, and citizens receive zero feedback on whether their issue was ever resolved.

To solve this, we built **RepairGrid**: an autonomous community maintenance and dispatch network powered by **Amazon Bedrock**, **Amazon Nova Multimodal Vision**, and a **Strands Multi-Agent Graph**. RepairGrid autonomously validates citizen photo reports, deduplicates spatial clusters, dispatches local technicians, and verifies physical repairs using side-by-side computer vision before closing cases.

In this article, we'll walk through the architectural blueprint, multi-agent orchestration, key AWS serverless integration patterns, and the technical challenges we solved to achieve sub-second live updates in production.

---

## 🏗️ High-Level System Architecture

RepairGrid is designed as a cloud-native, event-driven serverless system on AWS:

![RepairGrid Architecture](https://raw.githubusercontent.com/SydAsim/Repair-Grid-/main/docs/repairgrid_architecture_diagram.png)

### Key AWS Services Used

- **Amazon Bedrock & Amazon Nova**: Multimodal visual analysis for defect triage and before/after repair verification (`us.amazon.nova-2-lite-v1:0` and `us.amazon.nova-pro-v1:0`).
- **AWS Lambda & Mangum**: FastAPI backend handling agent graph execution, API routing, and S3 event processing.
- **Amazon DynamoDB**: Low-latency persistence across five decoupled tables: `Reports`, `Missions`, `Workers`, `Decisions`, and `Events`.
- **Amazon S3**: Secure evidence storage with automated seven-day presigned GET URLs and lifecycle policies.
- **Amazon Location Service & MapLibre GL**: Real-time reverse geocoding, spatial clustering, and vector-tile telemetry mapping.
- **AWS Amplify**: Hosting the Next.js 15 App Router frontend with automated CI/CD deployments.

---

## 🤖 The Strands Multi-Agent Orchestration Graph

Rather than relying on a single monolithic prompt, RepairGrid orchestrates a deterministic, bounded state machine where specialized agents collaborate sequentially:

```text
[ Citizen Report + Photo ]
            │
            ▼
┌─────────────────────┐
│     Intake Agent    │
└─────────────────────┘
            │
            └──► Enriches incident category, metadata,
                 location data, and GPS geohash
            │
            ▼
┌─────────────────────┐
│   Duplicate Agent   │
└─────────────────────┘
            │
            └──► Performs spatial-radius comparison
                 and semantic similarity clustering
            │
            ├──► Duplicate Confidence ≥ 95%
            │        │
            │        └──► Merge report into the
            │             canonical active incident
            │
            ▼
       [ New Incident ]
            │
            ▼
┌─────────────────────┐
│    Verify Agent     │
└─────────────────────┘
            │
            └──► Amazon Nova 2 Lite multimodal
                 visual defect audit
            │
            ▼
┌─────────────────────┐
│      Risk Agent     │
└─────────────────────┘
            │
            └──► Calculates a safety and urgency score
                 using school proximity, traffic exposure,
                 infrastructure severity, and public risk
            │
            ▼
┌─────────────────────┐
│   Dispatch Agent    │
└─────────────────────┘
            │
            └──► Selects the best available technician
                 based on skills, location, workload,
                 and ETA
            │
            ▼
┌──────────────────────────────┐
│ Mission Created & Dispatched │
└──────────────────────────────┘
            │
            └──► Creates and dispatches the mission
                 to the Technician Mobile Workflow
            │
            ▼
[ Technician Mobile Workflow ]
```

### 1. Multimodal Intake with Amazon Nova 2 Lite

When a citizen submits a photo of damaged infrastructure, the `VerificationAgent` invokes Amazon Nova 2 Lite through the Bedrock Converse API to confirm physical validity:

```python
response = boto3.client(
    "bedrock-runtime",
    region_name="us-east-1"
).converse(
    modelId="us.amazon.nova-2-lite-v1:0",
    system=[
        {
            "text": (
                "You are RepairGrid's bounded evidence analyst. "
                "Return only valid JSON matching the requested schema."
            )
        }
    ],
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "text": (
                        f"Review the report evidence. "
                        f"The resident selected category '{category}' "
                        f"and wrote: '{description}'. Return valid JSON: "
                        '{"isValidIssue": boolean, "assetIdentified": boolean, '
                        '"descriptionVisualMatch": boolean, '
                        '"confidence": number, "summary": string}'
                    )
                },
                {
                    "image": {
                        "format": "jpeg",
                        "source": {
                            "bytes": image_bytes
                        }
                    }
                }
            ]
        }
    ],
    inferenceConfig={
        "maxTokens": 400,
        "temperature": 0.0,
        "topP": 0.8
    }
)
```

This bounded JSON response lets the agent graph consume model output deterministically rather than passing free-form text between agents.

---

## 🔄 End-to-End Operational Lifecycle

### 1. Citizen Mobile Reporting

Citizens submit issues via [`/report`](https://main.dpd7m9jmuhh6w.amplifyapp.com/report/) with real-time camera capture, automatic canvas downscaling, voice-to-text dictation, and GPS geolocation.

Reports immediately appear in the Citizen Hub with a **`PENDING`** status badge.

### 2. Technician Mobile Workflow

Dispatched technicians log into [`/worker`](https://main.dpd7m9jmuhh6w.amplifyapp.com/worker/) where they can see:

- The exact citizen complaint and verified reporter name
- Intake photo and GPS route
- Amazon Nova diagnostic triage and required parts list
- Decision controls: **Accept Case** or **Decline**

### 3. Repair Proof Capture & Speech-to-Text

After completing the physical repair, the technician captures photographic proof using the device camera and records a spoken description of the completed work through the Web Speech API.

The mission transitions to **`READY_FOR_REVIEW`** and the repair image is uploaded automatically to Amazon S3.

### 4. Admission Controller Side-by-Side Review

The Mission Controller at [`/operations/verification`](https://main.dpd7m9jmuhh6w.amplifyapp.com/operations/verification/) inspects:

1. **Before Photo** — citizen intake defect
2. **After Photo** — technician repair proof
3. Technician voice transcript and parts utilized
4. Amazon Nova multimodal comparison confidence, such as a 96% match with illumination restoration confirmed

Clicking **Approve Case ✓** synchronously closes the mission, marks the linked citizen report as **`APPROVED`**, and plots an interactive pin on the live geospatial map.

---

## ⚡ Engineering Challenges & Production Learnings

### Challenge 1: API Gateway Timeout and Amazon Nova Model Selection

During production testing, synchronous report submissions occasionally approached API Gateway integration timeout limits and surfaced as `HTTP 503 Service Unavailable` errors.

**Root cause:** Heavy model cold starts combined with network latency while fetching image references.

**Solution:**

1. **Model optimization**  
   We selected **Amazon Nova 2 Lite** for low-latency multimodal inference while retaining strong visual understanding.

2. **Direct S3 IAM ingestion**  
   Instead of streaming evidence images through public HTTP endpoints, the Lambda adapter retrieves image bytes directly with IAM-authorized S3 access:

   ```python
   image_object = s3.get_object(
       Bucket=bucket_name,
       Key=file_key
   )

   image_bytes = image_object["Body"].read()
   ```

3. **Resilient fallback policy**  
   If Bedrock inference exceeds the configured latency budget, the pipeline falls back to deterministic rule-based processing so the user-facing request can still complete gracefully.

---

### Challenge 2: Zero-Trust Private Evidence Viewing

To follow AWS Well-Architected security practices, the S3 evidence bucket enforces `BlockPublicAccess: True`.

Saving raw S3 object URLs therefore results in `403 Access Denied` when a browser attempts to open private evidence directly.

**Solution:** Lambda generates temporary S3 presigned GET URLs:

```python
evidence_url = s3.generate_presigned_url(
    "get_object",
    Params={
        "Bucket": bucket_name,
        "Key": file_key
    },
    ExpiresIn=604800
)
```

The seven-day expiration (`604800` seconds) enables temporary evidence viewing across Mission Control and citizen-facing dashboards without making the S3 bucket public.

---

## 📊 Live Verification & Results

We validated the complete production system with automated testing suites and live AWS probes:

- **Pytest Evaluation Suite**: 46/46 tests passed across authentication, Bedrock agents, and Strands graph logic.
- **End-to-End API Latency**: Report submission, S3 upload, and Nova visual triage complete in approximately **3.2 seconds** under the tested workflow.
- **Amplify Global Delivery**: 38 pre-rendered Next.js routes distributed through the application's AWS-hosted delivery stack.

These measurements provide a repeatable baseline for validating the production workflow as the system evolves.

---

## 🔐 Security & Reliability Design

RepairGrid treats citizen evidence, technician identity, and operational decisions as security-sensitive data.

Key design principles include:

- Private S3 buckets with public access blocked
- Temporary presigned URLs instead of public evidence links
- IAM-scoped Lambda permissions
- Deterministic structured outputs from multimodal agents
- Decoupled DynamoDB entities for reports, missions, workers, decisions, and event history
- Explicit mission-state transitions instead of implicit UI-only state
- Audit-friendly decision records for verification and dispatch
- Serverless components that can scale independently

This makes the platform easier to inspect, test, and extend without turning the multi-agent workflow into a black box.

---

## 🧠 Why a Multi-Agent Graph Instead of One Large Prompt?

A single large model prompt could theoretically classify an issue, inspect its image, assess risk, find a technician, and recommend dispatch.

That design, however, would be difficult to audit and difficult to constrain.

RepairGrid instead decomposes the workflow into bounded responsibilities:

| Agent | Primary Responsibility | Output |
|---|---|---|
| Intake Agent | Normalize report data and location metadata | Enriched report |
| Duplicate Agent | Detect spatial or semantic duplicates | Merge or continue decision |
| Verify Agent | Confirm visual evidence | Verification confidence and summary |
| Risk Agent | Estimate safety and urgency | Risk score and priority |
| Dispatch Agent | Match the best available technician | Technician assignment |
| Verification Controller | Compare before/after repair evidence | Approve or reject completion |

Each agent receives only the context required for its task and produces a constrained result that the next stage can validate.

This improves:

- Explainability
- Failure isolation
- Testability
- Auditability
- Model replaceability
- Operational observability

---

## 🗺️ Geospatial Deduplication

Duplicate civic reports are common. Multiple citizens may photograph the same pothole, broken light, or blocked drain from different angles.

RepairGrid reduces duplicate missions by combining:

- GPS coordinates
- Geohash-based locality grouping
- Spatial-radius comparison
- Issue category
- Semantic similarity
- Active mission state

When duplicate confidence reaches the configured threshold, the new report is attached to the canonical active incident instead of creating a second repair mission.

This prevents dispatch duplication while preserving evidence from multiple citizens.

---

## 🚚 Autonomous Technician Dispatch

The Dispatch Agent evaluates available technicians using operational context such as:

- Required repair skill
- Technician capabilities
- Current availability
- Distance from the incident
- Estimated travel time
- Existing workload
- Mission urgency
- Required equipment or parts

The selected technician receives the incident as a mission in the mobile worker workflow.

Importantly, dispatch is treated as a persisted system decision rather than a temporary LLM recommendation.

---

## 📷 Before/After Repair Verification

One of RepairGrid's key design goals is to avoid closing a civic maintenance ticket simply because a technician presses **Complete**.

Instead, completion creates a verification step.

The system compares:

- Original citizen evidence
- Technician completion evidence
- Original defect description
- Technician repair notes
- Visual state change
- Model confidence

This creates a stronger chain of evidence:

```text
Citizen Report
      ↓
Visual Defect Verification
      ↓
Mission Dispatch
      ↓
Physical Repair
      ↓
Technician Proof
      ↓
Before/After AI Comparison
      ↓
Human Approval
      ↓
Case Closed
```

The workflow therefore keeps the final closure decision auditable and evidence-backed.

---

## 🌐 Frontend Experience

RepairGrid uses a Next.js 15 application to expose specialized interfaces for each stakeholder.

### Citizen Experience

Citizens can:

- Submit infrastructure defects
- Capture photos directly from mobile devices
- Use speech-to-text for descriptions
- Share their current incident location
- Track report status
- See when their issue reaches approval

### Technician Experience

Technicians can:

- Review assigned missions
- Inspect citizen evidence
- Navigate to the issue location
- View AI-generated diagnostics
- Accept or decline missions
- Upload repair proof
- Record spoken completion notes

### Operations Experience

Mission controllers can:

- View active incidents
- Monitor technician assignments
- Inspect agent decisions
- Review before/after evidence
- Approve or reject repairs
- Observe incidents on a geospatial operations map

---

## 🧩 Example Mission State Machine

A simplified mission lifecycle can be represented as:

```text
PENDING
   ↓
VALIDATED
   ↓
DISPATCHED
   ↓
ACCEPTED
   ↓
IN_PROGRESS
   ↓
READY_FOR_REVIEW
   ↓
APPROVED
```

Alternative transitions can include:

```text
PENDING → DUPLICATE
DISPATCHED → DECLINED → REASSIGNMENT
READY_FOR_REVIEW → REJECTED → REWORK_REQUIRED
```

Persisting these state transitions makes the system much easier to reason about than deriving mission state from UI behavior alone.

---

## 🧪 Testing Strategy

RepairGrid's backend testing focuses on the boundaries between deterministic application logic and probabilistic AI behavior.

The test suite covers areas such as:

- Authentication
- Report creation
- Image ingestion
- Agent graph routing
- Bedrock response parsing
- Duplicate detection
- Risk scoring
- Dispatch decisions
- Mission transitions
- Technician actions
- Before/after verification
- S3 evidence handling

For AI-dependent tests, deterministic fixtures and mocked Bedrock responses help prevent model variability from making ordinary CI tests unstable.

---

## 🚀 Deployment Architecture

The production deployment follows a serverless architecture:

```text
Next.js Frontend
      │
      ▼
AWS Amplify
      │
      ▼
API Gateway
      │
      ▼
AWS Lambda + Mangum
      │
      ├──► Amazon Bedrock / Amazon Nova
      ├──► Amazon DynamoDB
      ├──► Amazon S3
      └──► Amazon Location Service
```

This architecture avoids maintaining always-on application servers while allowing the AI, storage, geospatial, and API layers to scale independently.

---

## 🔗 Try It Live

- **Live Application**: [RepairGrid Production on AWS Amplify](https://main.dpd7m9jmuhh6w.amplifyapp.com/)
- **Citizen Report Portal**: [Report an Issue](https://main.dpd7m9jmuhh6w.amplifyapp.com/report/)
- **Mission Controller Hub**: [Operations Center](https://main.dpd7m9jmuhh6w.amplifyapp.com/operations/)
- **Verification Center**: [Repair Verification](https://main.dpd7m9jmuhh6w.amplifyapp.com/operations/verification/)
- **Open-Source Codebase**: [GitHub Repository: SydAsim/Repair-Grid-](https://github.com/SydAsim/Repair-Grid-)

---

## 💡 Conclusion

RepairGrid demonstrates how **Amazon Nova**, **Amazon Bedrock**, multi-agent orchestration, and AWS serverless services can transform municipal and campus infrastructure maintenance from a slow, paper-ticket process into a real-time, self-orchestrating network.

The key idea is not simply to add an LLM to a ticketing system. It is to combine multimodal reasoning with deterministic workflow controls, geospatial context, persistent mission state, human approval, and verifiable before/after evidence.

By combining these components, civic maintenance can become more transparent, auditable, responsive, and operationally efficient.

RepairGrid turns a simple citizen photo into a structured chain of action:

**Report → Validate → Deduplicate → Assess Risk → Dispatch → Repair → Verify → Close.**
