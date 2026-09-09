# RepairGrid: 5-Minute Hackathon Video Demo Script

**Track**: Good Neighbor Agents  
**Category**: AWS / Devpost "Agents for Humans" Hackathon  
**Target Duration**: 4 minutes 50 seconds (Under the strict 5-minute limit)

---

### [0:00 - 0:45] The Problem & The Operations OS Vision
- **Visual**: Show the RepairGrid hero landing page (`/`).
- **Narrative**:
  > "Municipalities and university campuses face thousands of broken streetlights, potholes, and blocked storm drains every week. Today, reporting systems are broken: citizens send emails that disappear into ticketing voids, or talk to chatbots that do nothing. But chatbots don't fix potholes.
  > 
  > Welcome to **RepairGrid** — an autonomous community maintenance network. Rather than a conversational bot, RepairGrid is an autonomous operations operating system built with the **Strands Agents SDK**, **Amazon Bedrock (Amazon Nova 2 Lite)**, and **AgentCore Runtime**. It takes citizen reports, deduplicates, determines risk, dispatches qualified technicians, verifies proof-of-repair, and only asks humans to intervene when consequential decisions actually require judgment."

---

### [0:45 - 1:45] Resident Reporting & Autonomous Ingestion
- **Visual**: Navigate to `/report`.
- **Narrative**:
  > "Let's look at the resident experience. A resident at North Gate 2 spots a broken streetlight that's been dark for three nights.
  > 
  > In just three quick steps: they take a photo, tap 'Streetlight', and Amazon Location Service automatically pinpoints their coordinates with 94% confidence.
  > 
  > Notice the prompt: *'Don't know which department handles this? That's our job.'*
  > 
  > The resident clicks Submit and can leave. Immediately, our Strands Graph triggers in Bedrock AgentCore Runtime. It extracts physical asset features, runs duplicate detection within a 25-meter radius, and calculates a preliminary risk score of 85 using our deterministic 6-factor policy engine.
  > 
  > On the resident tracking timeline (`/resident/reports/RG-R-101`), the resident sees real-time milestones: Reported, Verified, Assigned, and Dispatched — with zero internal model thoughts exposed."

---

### [1:45 - 2:45] Technician Journey & Proof-of-Repair
- **Visual**: Switch to the Field Worker portal (`/worker`).
- **Narrative**:
  > "Now let's see how technicians experience RepairGrid. Here is Ahmed Khan, an electrical specialist.
  > 
  > Strands' ResourceAgent matched Ahmed with a 96% fit score based on skills, availability, and shortest travel distance via Amazon Location Routes.
  > 
  > Ahmed opens the mission, taps 'Navigate', and arrives on-site. He marks the mission in progress, replaces the failed LED module, and takes an after-repair photo.
  > 
  > Notice the crucial terminology: *Technicians provide an attestation, not final verification.*
  > 
  > Furthermore, if Ahmed discovered a cracked underground pipe and selected *'Requires Another Specialist'*, RepairGrid dynamically re-enters the agent graph to spawn an excavation sub-mission. But here, the repair is complete. Ahmed submits his work."

---

### [2:45 - 3:45] Operator Mission Control & Human-In-The-Loop
- **Visual**: Open Mission Control (`/operations`).
- **Narrative**:
  > "Now let's enter the Operator Command Center.
  > 
  > At the center is our transparent **Community Health Index**: currently 84/100, calculated deterministically from open critical issues, unresolved severities, and verified recoveries.
  > 
  > On the Living Map (`/operations/map`), operators can inspect real-time color-coded missions, filtered by lighting, drainage, or roads.
  > 
  > In the **Proof of Repair Queue** (`/operations/verification`), our CompletionVerifierAgent runs multimodal Bedrock Nova 2 Lite image analysis comparing before and after evidence, confirming asset continuity, GPS coordinates, and visible illumination.
  > 
  > Now, let's open the **Decision Required Inbox** (`/operations/decisions`). This is real **Strands Human-in-the-Loop**. When an overflowing drain was detected adjacent to a primary school, our GuardianAgent intercepted: policy dictates that safety-critical escalations require human sign-off. The graph paused safely. With one click, the operator approves escalation, and the graph unpauses and dispatches emergency crews."

---

### [3:45 - 4:30] The Hackathon Chaos Simulator
- **Visual**: Navigate to `/operations/simulate`.
- **Narrative**:
  > "To prove RepairGrid's autonomous resilience, we built the Chaos Simulator.
  > 
  > Let's click **'Simulate Heavy Rain'**.
  > 
  > Watch the live backend execution: 4 raw citizen reports are injected at once. DuplicateAgent instantly recognizes that 3 reports are the same flooded school drain within 25 meters, and merges them into a single canonical mission.
  > 
  > It computes a CRITICAL risk score, routes to Plumbing & Drainage, matches Marcus, and pauses at the Guardian for human approval. We just compressed 4 raw reports into 2 actionable missions with zero human triage overhead."

---

### [4:30 - 5:00] AWS Architecture & Conclusion
- **Visual**: Show the Architecture diagram (`docs/architecture.mermaid`) and Trust Center (`/operations/trust`).
- **Narrative**:
  > "RepairGrid is deployed in `us-east-1` using 7 AWS CDK TypeScript stacks, 100% serverless on DynamoDB, S3, Cognito, API Gateway, and Amazon Bedrock Nova 2 Lite.
  > 
  > All 45 unit and evaluation scenarios pass with 100% success.
  > 
  > RepairGrid: genuine autonomous operations that do real work for real people, building safer, cleaner, and more responsive communities. Thank you!"
