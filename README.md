# REPAIRGRID: Autonomous Community Maintenance Network

> **AWS / Devpost "Agents for Humans" Hackathon Submission**  
> **Track**: Good Neighbor Agents  
> **Primary AI Model**: Amazon Nova 2 Lite (`us.amazon.nova-2-lite-v1:0` via Amazon Bedrock)  
> **Agent Runtime**: Strands Agents SDK & Amazon Bedrock AgentCore Runtime  
> **License**: MIT  

---

## 1. Problem Statement
Civic and campus maintenance operations are bogged down by administrative gridlock. When streetlights break, potholes appear, or storm drains flood, residents submit repetitive reports that enter opaque email chains or conversational chatbots that merely chat about problems without doing actual work. Operations teams spend hours manually deduplicating complaints, assessing severity, finding qualified technicians, and tracking work to completion.

## 2. Target Users & Product Vision
RepairGrid is an autonomous operations network connecting:
- **Residents**: Effortless photo/location reporting with real-time tracking and post-repair quality confirmation.
- **Field Technicians**: Skill-matched assignments, mobile route summaries, and completion attestations.
- **Community Operators**: Central command control, living GIS maps, transparent Community Health scoring, and a Human-In-The-Loop (HITL) Decision Inbox.

### MVP Scope (Strictly Enforced)
1. **Streetlights** (Electrical Department)
2. **Potholes** (Roads Department)
3. **Blocked Drains** (Plumbing & Drainage Department)

---

## 3. Why Agents?
Maintenance operations require multi-step reasoning under uncertainty: understanding messy multimodal citizen reports, clustering spatial duplicates, checking physical asset registries, evaluating risk formulas, finding available specialists, and verifying before/after evidence. 

Rather than brittle static scripts, the **Strands Agents SDK (Graph Pattern)** provides bounded loops, deterministic calculation nodes, conditional branching, and first-class Human-In-The-Loop interruption when safety thresholds are triggered.

---

## 4. Key Capabilities
- **Autonomous Deduplication**: Clusters incoming reports within 25–50m and merges high-confidence duplicates (>=95%) into canonical missions.
- **Deterministic 6-Factor Risk Policy Engine**: Calculates severity from Safety (35%), Exposure (20%), Infrastructure (15%), Sensitive Locations (10%), Duration (10%), and Evidence (10%).
- **Multi-Attribute Worker Dispatch**: Matches technicians based on verified trade skills, shift availability, and travel distance via Amazon Location Routes.
- **First-Class Proof-of-Repair**: Multimodal Bedrock Nova 2 Lite image analysis comparing before and after evidence.
- **Guardian Safety Gating**: Prevents autonomous closure on `CRITICAL` risk band missions (`safety_critical_auto_close: NEVER`).
- **Dynamic Re-planning**: If a technician selects `Requires Another Specialist` (e.g. underground excavation), the mission autonomously re-enters the Strands graph to spawn sub-missions.
- **Chaos Simulator**: Injects `NORMAL_DAY`, `HEAVY_RAIN`, and `ELECTRICAL_FAILURE` to visibly demonstrate duplicate collapse and operator escalation in real time.

---

## 5. System Architecture

```
                         REPAIRGRID
                 Autonomous Maintenance OS

                            USERS
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
      Residents         Field Workers          Operators
      (/resident)         (/worker)          (/operations)
          │                   │                    │
          └───────────────────┼────────────────────┘
                              │
                              ▼
                     Next.js 15+ Web / PWA
                              │
                    Amazon Cognito Authentication
                    (resident, field_worker, operator, admin)
                              │
             ┌────────────────┼──────────────────┐
             │                                   │
             ▼                                   ▼
      API Gateway HTTP                   API Gateway WebSocket
             │                                   ▲
             ▼                                   │
         AWS Lambda (Python 3.12)                │
             │                                   │
             ├───────────────┐                   │
             ▼               ▼                   │
         DynamoDB            S3                  │
        (5 Tables)    (Private Evidence)         │
             │               │                   │
             └───────┬───────┘                   │
                     ▼                           │
          Bedrock AgentCore Runtime              │
          Strands Agent Graph                    │
                     │                           │
                     ▼                           │
             Amazon Bedrock                      │
       (Amazon Nova 2 Lite)                      │
                     │                           │
                     ▼                           │
             AgentCore Gateway                   │
         (19 Validated MCP Tools)                │
                     │                           │
       ┌─────────────┼─────────────┐             │
       ▼             ▼             ▼             │
 Mission Tools  Location Tools Worker Tools      │
       │             │             │             │
       └─────────────┼─────────────┘             │
                     │                           │
         ┌───────────┴───────────┐               │
         ▼                       ▼               ▼
    EventBridge           Amazon Location    DynamoDB Streams
     Scheduler           (Maps, Places,       + Broadcaster
   (SLA Monitoring)          Routes)             Lambda
```

---

## 6. Strands Graph & Safety Model

```
               REPORT
                 │
                 ▼
              Intake
                 │
         Location / Vision
                 │
                 ▼
             Duplicate?
            /          \
      >= 0.95         < 0.95
        │               │
        ▼               ▼
      Merge        Verification
        │               │
      Notify           Risk
                        │
                    Ownership
                   /         \
              Clear       Ambiguous
                │             │
                ▼             ▼
             Mission      HITL Inbox
                │
             Resource
                │
             Guardian
            /        \
         Safe     Critical / Low Conf
          │           │
          ▼           ▼
       Dispatch   HITL Inbox
```

### Safety Model & Guardian Policy
- **Zero Chain-of-Thought Leaks**: Internal LLM reasoning is never exposed to clients or logged. Telemetry exposes only structured outcome metadata.
- **Deterministic Bounds**: `max_steps = 15`, exponential backoff retries, and bounded node timeouts prevent runaway agent loops.
- **Server-Side RBAC Enforcement**: Role permissions are verified on every Lambda/API Gateway route.

---

## 7. Demo Accounts for Judges

One application and one login system:

| Email | Role | Access / Permissions |
| :--- | :--- | :--- |
| `resident@repairgrid.demo` | `resident` | Submit reports (`/report`), track timeline (`/resident/reports/[id]`), confirm repairs |
| `worker.electric@repairgrid.demo` | `field_worker` | Electrical specialist; start missions, upload completion proof |
| `worker.plumber@repairgrid.demo` | `field_worker` | Plumbing & drainage specialist; triggers excavation re-plans |
| `operator@repairgrid.demo` | `operator` | Full Mission Control, Living Map, Decision Inbox, Simulator |
| `admin@repairgrid.demo` | `admin` | Policy thresholds, seed & reset demo data |

---

## 8. Automated Evaluation Suite (45 Tests)

RepairGrid includes a comprehensive automated evaluation suite running via `pytest evals/`:
- **API & Server-Side RBAC Guards**: 6 tests (Health, 403 blocks for residents/workers, operator access)
- **Strands Graph Core & HITL Interruption**: 7 tests (Intake, duplicate merge, risk escalation, ambiguous ownership pause)
- **32-Scenario Acceptance Suite**: 32 tests (False duplicates, wrong skills excluded, GPS mismatch rejection, critical closure blocks, idempotent duplicate merges)

**Run Tests Locally**:
```bash
pytest evals/
# 45 passed in 2.39s (100% Success)
```

---

## 9. Local Development & Quick Start

### Prerequisites
- Node.js v18+ & npm
- Python 3.12+

### 1. Install & Run Next.js Frontend
```bash
cd apps/web
npm install
npm run dev
# Running on http://localhost:3000
```

### 2. Run Python API & Agent Backend
```bash
pip install -r services/api/requirements.txt
uvicorn services.api.main:app --port 8000 --reload
```

---

## 10. AWS Deployment (AWS CDK)

All infrastructure is codified in TypeScript with AWS CDK across 7 modular stacks:
1. `RepairGridAuthStack`: Cognito User Pool & Groups
2. `RepairGridDataStack`: 5 DynamoDB Tables + Private S3 Bucket
3. `RepairGridLocationStack`: Amazon Location Maps, Places, Routes
4. `RepairGridApiStack`: API Gateway HTTP API v2 + Lambda Handlers
5. `RepairGridRealtimeStack`: WebSocket API Gateway + DynamoDB Streams Broadcaster
6. `RepairGridAgentStack`: Bedrock AgentCore Runtime & Gateway MCP Tools
7. `RepairGridObservabilityStack`: CloudWatch Log Groups, Dashboard, and $20/$30/$40 Budget Alerts

**Deploy with CDK**:
```bash
cd infra/cdk
npm install
npx cdk deploy --all
```

---

## 11. Cost Guardrails ($50 Budget Protection)
- **Pay-Per-Use Serverless Only**: Zero EC2, ECS, EKS, OpenSearch, RDS, or provisioned Bedrock throughput.
- **Compact Pydantic Schemas**: Eliminates conversational token bloat.
- **Deterministic Math**: Calculations (distance, risk, worker scoring) run in deterministic Python without LLM API spend.
- **Budget Alerts**: AWS Budgets triggers email warnings at $20, $30, and $40.

---

## 12. License & Disclosure
- **License**: MIT License
- **Hackathon Disclosure**: Built from scratch for the AWS / Devpost "Agents for Humans" Hackathon during the official hackathon window.
