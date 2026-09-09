# RepairGrid Architecture & System Design

RepairGrid is an autonomous community maintenance operations layer designed for the AWS / Devpost "Agents for Humans" Hackathon (Good Neighbor Agents Track). Rather than acting as a simple conversational chatbot, RepairGrid is an **agentic operations operating system** connecting residents, field technicians, and community operators.

---

## 1. High-Level Topology

1. **Client Experience Layer**:
   - Built on **Next.js 15+ App Router**, TypeScript (strict mode), Tailwind CSS, and MapLibre GL.
   - Distinct UX for each user persona:
     - **Resident Mobile**: Ultra-fast camera/location capture (`/report`), personal mission timeline (`/resident/reports/[id]`), and citizen proof confirmation (`/resident/verify/[id]`).
     - **Field Worker PWA**: Mobile route summary, GPS navigation, mission instructions, and completion attestation (`/worker`).
     - **Operator Command Center**: Living GIS map, real-time Community Health index (0-100), live Strands agent activity stream, Human-In-The-Loop Decision Inbox, and Hackathon Chaos Simulator (`/operations`).
     - **Admin Console**: Demo district seeding, system policies, and test accounts (`/admin/demo`).

2. **Authentication & Authorization**:
   - **Amazon Cognito User Pool** with 4 canonical groups: `resident`, `field_worker`, `operator`, and `admin`.
   - Security enforced server-side: every API Gateway and Lambda handler validates JWT claims, returning `403 Forbidden` if role privileges are insufficient. Hiding frontend buttons is never treated as authorization.

3. **Autonomous Agent Orchestration**:
   - Powered by the **Strands Agents SDK (Graph Pattern)** running in **Amazon Bedrock AgentCore Runtime**.
   - Agent intelligence backed by **Amazon Bedrock (Amazon Nova 2 Lite: `us.amazon.nova-2-lite-v1:0`)**.
   - Model ID is dynamically configurable via environment variables and never hardcoded.
   - **19 AgentCore Gateway MCP Tools** with input validation, policy checks, structured JSON responses, and zero chain-of-thought exposure.

4. **Data Persistence & Private Storage**:
   - 5 **Amazon DynamoDB** on-demand tables:
     - `RepairGridReports`: Citizen submissions, geohash spatial keys, duplicate references.
     - `RepairGridMissions`: Department tasks, risk bands, worker assignments, version counters for optimistic locking.
     - `RepairGridWorkers`: Technician skills, department, zones, and real-time availability.
     - `RepairGridDecisions`: Paused Human-In-The-Loop action records.
     - `RepairGridEvents`: Mission timelines and audit event logs.
   - **Amazon S3 Private Evidence Bucket**: SSE-S3 encrypted evidence storage with time-limited presigned URLs. No public S3 bucket exposure.

5. **Location & Routing**:
   - **Amazon Location Service**:
     - `RepairGridCampusMap`: High-resolution vector map styles.
     - `RepairGridPlaceIndex`: Fast reverse geocoding from GPS coordinates to campus landmarks.
     - `RepairGridRouteCalculator`: Multi-stop route optimization and travel time matrix for field technicians.

6. **Realtime Updates & Observability**:
   - **API Gateway WebSocket API**: `$connect`, `$disconnect`, `$default`.
   - **DynamoDB Streams + Broadcaster Lambda**: Pushes mission state transitions, duplicate merges, and technician arrival events directly to connected clients without browser polling.
   - **Amazon CloudWatch**: Centralized log group with 7-day retention during development.
   - **AWS Budgets**: Automated alert thresholds at $20, $30, and $40 to protect hackathon promotional credits.

---

## 2. Strands Graph Execution Flow

The core graph orchestrates a structured business workflow with deterministic calculation nodes:

1. **`IntakeAgent`**: Parses multimodal image, text, and GPS coordinates.
2. **`EnrichmentAgent`**: Reverse geocodes the point of interest and verifies campus boundaries.
3. **`DuplicateAgent`**: Queries nearby reports within a 50m radius.
   - **Conditional Edge**:
     - If `confidence >= 0.95`: Merges duplicate into canonical report, attaches evidence, notifies reporter, and terminates intake branch.
     - If `confidence < 0.95`: Proceeds to verification.
4. **`VerificationAgent`**: Validates problem authenticity against infrastructure records.
5. **`RiskAgent`**: Executes a transparent deterministic 6-factor policy formula (Safety 35%, Exposure 20%, Infrastructure 15%, Location 10%, Duration 10%, Evidence 10%). Categorizes into `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
6. **`OwnershipAgent`**: Maps category and zone to municipal/campus department (`electrical`, `plumbing_drainage`, `roads`).
   - **Conditional Edge**:
     - If ambiguous: Pauses graph, creates a Decision record, and enters Strands Human-In-The-Loop.
     - If clear: Proceeds to Mission creation.
7. **`MissionAgent`**: Creates a formal maintenance mission with SLA deadline.
8. **`ResourceAgent`**: Scores and ranks technicians using deterministic multi-attribute scoring (Skill 40%, Availability 25%, Haversine Distance 15%, Workload 10%, Zone 5%, Specialization 5%).
9. **`GuardianAgent`**: Pre-action safety check evaluating permissions, risk bands, reversibility, and budget.
   - **Conditional Edge**:
     - If consequential/critical: Pauses for operator approval (HITL).
     - If safe: Executes assignment and dispatches technician.
10. **`CompletionVerifierAgent`**: Evaluates technician attestation, GPS continuity, and multimodal before/after evidence.
    - If `REQUIRES_SPECIALIST`: Dynamically re-enters graph to spawn excavation/civil sub-missions.
    - If valid and routine: Autonomously closes mission.
    - If critical risk band: Strictly requires operator sign-off (`safety_critical_auto_close: NEVER`).
