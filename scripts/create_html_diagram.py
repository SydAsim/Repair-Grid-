import os
import subprocess

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RepairGrid End-to-End System Architecture</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #09090b; color: #f4f4f5; width: 2400px; height: 1350px; padding: 32px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; }
    
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #27272a; padding-bottom: 20px; }
    .brand { display: flex; align-items: center; gap: 16px; }
    .logo-badge { background: linear-gradient(135deg, #4f46e5, #9333ea); width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 26px; color: white; box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
    .brand-text h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(to right, #ffffff, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .brand-text p { font-size: 14px; color: #94a3b8; margin-top: 3px; font-weight: 500; }
    .badges { display: flex; gap: 10px; }
    .pill { padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid; }
    .pill-aws { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); color: #fbbf24; }
    .pill-bedrock { background: rgba(244, 63, 94, 0.1); border-color: rgba(244, 63, 94, 0.3); color: #fb7185; }
    .pill-strands { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.3); color: #c084fc; }
    .pill-live { background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: #4ade80; }

    /* Grid Layout */
    .grid-container { display: grid; grid-template-columns: 500px 380px 760px 580px; gap: 20px; flex: 1; margin-top: 24px; }
    
    /* Columns */
    .col { background: #121215; border: 1px solid #27272a; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px; position: relative; }
    .col-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: flex; items-center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid #27272a; }
    .col-title span { display: flex; align-items: center; gap: 8px; }

    /* Cards */
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 14px; transition: all 0.2s; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .card-title { font-size: 14px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px; }
    .card-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .card-desc { font-size: 11.5px; color: #a1a1aa; line-height: 1.5; }
    .bullet-list { margin-top: 6px; padding-left: 16px; font-size: 11px; color: #cbd5e1; line-height: 1.6; }

    /* Color Accents */
    .border-indigo { border-color: rgba(99, 102, 241, 0.4); background: linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(24, 24, 27, 0.8) 100%); }
    .tag-indigo { background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }

    .border-amber { border-color: rgba(245, 158, 11, 0.4); background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(24, 24, 27, 0.8) 100%); }
    .tag-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

    .border-emerald { border-color: rgba(16, 185, 129, 0.4); background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(24, 24, 27, 0.8) 100%); }
    .tag-emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

    .border-purple { border-color: rgba(168, 85, 247, 0.4); background: linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, rgba(24, 24, 27, 0.8) 100%); }
    .tag-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }

    .border-rose { border-color: rgba(244, 63, 94, 0.5); background: linear-gradient(180deg, rgba(244, 63, 94, 0.12) 0%, rgba(24, 24, 27, 0.8) 100%); }
    .tag-rose { background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.4); }

    .border-cyan { border-color: rgba(6, 182, 212, 0.4); background: linear-gradient(180deg, rgba(6, 182, 212, 0.08) 0%, rgba(24, 24, 27, 0.8) 100%); }
    .tag-cyan { background: rgba(6, 182, 212, 0.2); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }

    /* Strands Flow Pipeline */
    .agent-pipeline { display: flex; flex-direction: column; gap: 10px; }
    .agent-node { background: #1c1917; border: 1px solid #44403c; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; position: relative; }
    .node-num { background: #a855f7; color: white; width: 22px; height: 22px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
    .node-text { flex: 1; margin-left: 12px; }
    .node-title { font-size: 12px; font-weight: 700; color: white; }
    .node-sub { font-size: 10.5px; color: #a8a29e; }
    .node-badge { font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    
    .arrow-down { text-align: center; color: #a855f7; font-size: 14px; margin: -5px 0; font-weight: 900; }

    /* Footer */
    .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #27272a; padding-top: 16px; font-size: 12px; color: #71717a; }
    .flow-tag { display: inline-flex; align-items: center; gap: 6px; background: #18181b; border: 1px solid #27272a; padding: 4px 10px; border-radius: 6px; font-size: 11px; color: #a1a1aa; }
  </style>
</head>
<body>

  <!-- Top Banner -->
  <div class="header">
    <div class="brand">
      <div class="logo-badge">RG</div>
      <div class="brand-text">
        <h1>REPAIRGRID: Autonomous Community Maintenance Network</h1>
        <p>AWS & Devpost "Agents for Humans" Hackathon • Good Neighbor Agents Track • Complete System Architecture</p>
      </div>
    </div>
    <div class="badges">
      <div class="pill pill-aws">AWS Bedrock Engine</div>
      <div class="pill pill-bedrock">Amazon Nova 2 Lite & Pro</div>
      <div class="pill pill-strands">Strands Multi-Agent Graph</div>
      <div class="pill pill-live">Live Production Deployed</div>
    </div>
  </div>

  <!-- Main 4-Column Architectural Grid -->
  <div class="grid-container">

    <!-- COLUMN 1: USER CLIENTS -->
    <div class="col">
      <div class="col-title">
        <span>👤 1. Client Experience Layer</span>
        <span class="card-tag tag-indigo">Next.js 15 App Router</span>
      </div>

      <!-- Resident -->
      <div class="card border-indigo">
        <div class="card-header">
          <div class="card-title">📱 Resident Hub</div>
          <span class="card-tag tag-indigo">Mobile-First</span>
        </div>
        <p class="card-desc">Frictionless public citizen interaction with live autonomous tracking:</p>
        <ul class="bullet-list">
          <li><strong>/report</strong>: 3-step wizard with camera snapshot, GPS geocoding & speech-to-text mic.</li>
          <li><strong>/resident</strong>: Live District Health score (84%), active reports history.</li>
          <li><strong>/resident/reports/[id]</strong>: Real-time 5-stage stepper (Submitted → Triaged → Dispatched → Repaired → Verified).</li>
          <li><strong>/resident/verify/[id]</strong>: Citizen confirmation with side-by-side Before & After photo verification.</li>
        </ul>
      </div>

      <!-- Field Worker -->
      <div class="card border-amber">
        <div class="card-header">
          <div class="card-title">🔧 Field Technician Portal</div>
          <span class="card-tag tag-amber">Mobile PWA</span>
        </div>
        <p class="card-desc">Field technician execution inside maintenance service trucks:</p>
        <ul class="bullet-list">
          <li><strong>/worker</strong>: Shift toggle (Available / Off-Shift), trade specialization (Electrical, Plumbing, Roads).</li>
          <li><strong>/worker/map</strong>: Turn-by-turn routing to assigned emergency pins.</li>
          <li><strong>/worker/missions/[id]</strong>: Progressive status (Accept → En Route → On Site → Start Repair).</li>
          <li><strong>/worker/missions/[id]/complete</strong>: Proof-of-Repair photo capture & attestation notes.</li>
        </ul>
      </div>

      <!-- Mission Control -->
      <div class="card border-emerald">
        <div class="card-header">
          <div class="card-title">🎛️ Mission Control Operator</div>
          <span class="card-tag tag-emerald">Hero UI</span>
        </div>
        <p class="card-desc">Central supervisory command dashboard for municipal directors:</p>
        <ul class="bullet-list">
          <li><strong>/operations</strong>: 100-point Community Health formula & real-time telemetry.</li>
          <li><strong>/operations/map</strong>: Living GIS map with category filtering & technician GPS.</li>
          <li><strong>/operations/decisions</strong>: Human-in-the-Loop decision inbox for high-risk hazards.</li>
          <li><strong>/operations/verification</strong>: Multimodal AI vision before/after comparison queue.</li>
        </ul>
      </div>
    </div>

    <!-- COLUMN 2: INGRESS & SERVERLESS CORE -->
    <div class="col">
      <div class="col-title">
        <span>⚡ 2. Ingress & Serverless Core</span>
        <span class="card-tag tag-cyan">AWS Cloud Native</span>
      </div>

      <!-- Hosting -->
      <div class="card border-cyan">
        <div class="card-header">
          <div class="card-title">🌐 AWS Amplify Hosting</div>
          <span class="card-tag tag-cyan">Edge CDN</span>
        </div>
        <p class="card-desc">Global low-latency static web asset delivery and SSL termination. Automated deployment via Amplify S3 pipelines.</p>
      </div>

      <!-- API Gateway -->
      <div class="card border-cyan">
        <div class="card-header">
          <div class="card-title">🚪 Amazon API Gateway v2</div>
          <span class="card-tag tag-cyan">REST + WS</span>
        </div>
        <ul class="bullet-list">
          <li><strong>HTTP API v2</strong>: High-throughput routing for auth, mission creation, and reports.</li>
          <li><strong>WebSocket Gateway</strong>: Real-time bidirectional telemetry streaming ($connect, $disconnect).</li>
        </ul>
      </div>

      <!-- Auth -->
      <div class="card border-cyan">
        <div class="card-header">
          <div class="card-title">🔐 Cognito & RBAC Guard</div>
          <span class="card-tag tag-cyan">Security</span>
        </div>
        <p class="card-desc">Server-side JWT claims verification across 4 canonical roles: <code>resident</code>, <code>field_worker</code>, <code>operator</code>, <code>admin</code>.</p>
      </div>

      <!-- Lambda Core -->
      <div class="card border-emerald">
        <div class="card-header">
          <div class="card-title">🐍 AWS Lambda Backend Core</div>
          <span class="card-tag tag-emerald">Python 3.12</span>
        </div>
        <p class="card-desc">FastAPI serverless backend running under Mangum ASGI adapter. Dispatches Strands graph workflows and handles REST CRUD.</p>
      </div>

      <!-- Location -->
      <div class="card border-emerald">
        <div class="card-header">
          <div class="card-title">📍 Amazon Location Service</div>
          <span class="card-tag tag-emerald">Geospatial</span>
        </div>
        <ul class="bullet-list">
          <li><strong>Places Index</strong>: Reverse geocoding GPS coordinates to campus landmarks.</li>
          <li><strong>Routes</strong>: Multi-stop route matrix & technician distance calculation.</li>
        </ul>
      </div>
    </div>

    <!-- COLUMN 3: STRANDS AGENT GRAPH -->
    <div class="col">
      <div class="col-title">
        <span>🤖 3. Strands Multi-Agent Graph</span>
        <span class="card-tag tag-purple">Deterministic Orchestration</span>
      </div>

      <div class="agent-pipeline">
        <!-- Node 1 -->
        <div class="agent-node border-purple">
          <div class="node-num">1</div>
          <div class="node-text">
            <div class="node-title">Intake & Vision Enrichment Agent</div>
            <div class="node-sub">Ingests photo, GPS coords, and speech transcript</div>
          </div>
          <span class="node-badge tag-purple">report_get</span>
        </div>

        <div class="arrow-down">↓</div>

        <!-- Node 2 -->
        <div class="agent-node border-purple">
          <div class="node-num">2</div>
          <div class="node-text">
            <div class="node-title">Spatial Deduplication Agent</div>
            <div class="node-sub">Haversine clustering (radius &lt; 50m). Merges duplicate reports (≥95% confidence)</div>
          </div>
          <span class="node-badge tag-purple">find_nearby</span>
        </div>

        <div class="arrow-down">↓</div>

        <!-- Node 3 -->
        <div class="agent-node border-purple">
          <div class="node-num">3</div>
          <div class="node-text">
            <div class="node-title">Deterministic 6-Factor Risk Policy Engine</div>
            <div class="node-sub">Safety (35%), Exposure (20%), Infrastructure (15%), Location (10%), Duration (10%), Evidence (10%)</div>
          </div>
          <span class="node-badge tag-purple">policy_eval</span>
        </div>

        <div class="arrow-down">↓</div>

        <!-- Node 4 -->
        <div class="agent-node border-purple">
          <div class="node-num">4</div>
          <div class="node-text">
            <div class="node-title">Department Ownership & Mission Dispatch</div>
            <div class="node-sub">Routes to Electrical, Roads, or Drainage. Assigns strict SLA deadline</div>
          </div>
          <span class="node-badge tag-purple">mission_create</span>
        </div>

        <div class="arrow-down">↓</div>

        <!-- Node 5 -->
        <div class="agent-node border-purple">
          <div class="node-num">5</div>
          <div class="node-text">
            <div class="node-title">Technician Match & Ranking Engine</div>
            <div class="node-sub">Multi-attribute scoring: Skills (40%), Availability (25%), Proximity (15%), Workload (10%)</div>
          </div>
          <span class="node-badge tag-purple">worker_match</span>
        </div>

        <div class="arrow-down">↓</div>

        <!-- Node 6 -->
        <div class="agent-node border-rose">
          <div class="node-num" style="background:#f43f5e;">6</div>
          <div class="node-text">
            <div class="node-title">Guardian Safety Policy & Human-in-the-Loop</div>
            <div class="node-sub">Pre-action gating: Consequential/Critical actions pause for Human Operator sign-off</div>
          </div>
          <span class="node-badge tag-rose">HITL Paused</span>
        </div>

        <div class="arrow-down">↓</div>

        <!-- Node 7 -->
        <div class="agent-node border-emerald">
          <div class="node-num" style="background:#10b981;">7</div>
          <div class="node-text">
            <div class="node-title">Completion Verifier Agent</div>
            <div class="node-sub">Compares Before & After photos via Bedrock Vision. Bounded auto-close policy</div>
          </div>
          <span class="node-badge tag-emerald">vision_verify</span>
        </div>
      </div>
    </div>

    <!-- COLUMN 4: BEDROCK & PERSISTENCE -->
    <div class="col">
      <div class="col-title">
        <span>🧠 4. Foundation Models & Storage</span>
        <span class="card-tag tag-rose">AWS Cloud</span>
      </div>

      <!-- Bedrock -->
      <div class="card border-rose">
        <div class="card-header">
          <div class="card-title">🤖 Amazon Bedrock Engine</div>
          <span class="card-tag tag-rose">AgentCore</span>
        </div>
        <p class="card-desc">Underlying foundation model intelligence for vision, reasoning, and tool execution:</p>
        <ul class="bullet-list">
          <li><strong>Amazon Nova 2 Lite & Pro</strong> (<code>us.amazon.nova-pro-v1:0</code>): Multimodal reasoning.</li>
          <li><strong>Bedrock AgentCore Gateway</strong>: 19 strictly typed MCP tools with bounded parameters.</li>
          <li><strong>Zero CoT Leak</strong>: Chain-of-thought is guarded to protect system security.</li>
        </ul>
      </div>

      <!-- DynamoDB -->
      <div class="card border-amber">
        <div class="card-header">
          <div class="card-title">🗄️ Amazon DynamoDB</div>
          <span class="card-tag tag-amber">5 Tables</span>
        </div>
        <p class="card-desc">Fast, single-digit millisecond latency on-demand persistence:</p>
        <ul class="bullet-list">
          <li><code>RepairGridReports</code>: Ingested civic citizen reports with geohash keys.</li>
          <li><code>RepairGridMissions</code>: Work orders with optimistic concurrency locking.</li>
          <li><code>RepairGridWorkers</code>: Shift status, verified trade skills, live location.</li>
          <li><code>RepairGridDecisions</code>: Human-in-the-Loop paused action queue.</li>
          <li><code>RepairGridEvents</code>: Cryptographically anchored audit trail logs.</li>
        </ul>
      </div>

      <!-- S3 Evidence -->
      <div class="card border-amber">
        <div class="card-header">
          <div class="card-title">🪣 Amazon S3 Evidence Bucket</div>
          <span class="card-tag tag-amber">Encrypted S3</span>
        </div>
        <p class="card-desc">Private SSE-S3 encrypted object storage for initial resident damage photos and technician proof-of-repair evidence. Served via short-lived presigned URLs.</p>
      </div>

      <!-- Realtime & CloudWatch -->
      <div class="card border-emerald">
        <div class="card-header">
          <div class="card-title">📡 Realtime Streaming & Logs</div>
          <span class="card-tag tag-emerald">Live Push</span>
        </div>
        <ul class="bullet-list">
          <li><strong>DynamoDB Streams</strong>: Captures mutation events at database level.</li>
          <li><strong>Broadcaster Lambda</strong>: Pushes updates to connected WebSocket clients.</li>
          <li><strong>Amazon CloudWatch</strong>: Centralized logging, SLAs, and AWS Budgets alerts.</li>
        </ul>
      </div>
    </div>

  </div>

  <!-- Bottom Legend / Data Flow -->
  <div class="footer">
    <div style="display: flex; gap: 12px; align-items: center;">
      <strong>Core Data Flow:</strong>
      <span class="flow-tag">1. Citizen Submits (Photo + GPS)</span>
      <span>➔</span>
      <span class="flow-tag">2. API Gateway & Cognito Auth</span>
      <span>➔</span>
      <span class="flow-tag">3. Strands 10-Node Graph Evaluates</span>
      <span>➔</span>
      <span class="flow-tag">4. Bedrock Nova Multimodal Vision</span>
      <span>➔</span>
      <span class="flow-tag">5. Guardian Safety Check (HITL)</span>
      <span>➔</span>
      <span class="flow-tag">6. Worker Dispatched & Finishes</span>
      <span>➔</span>
      <span class="flow-tag">7. Citizen Confirms Repair</span>
    </div>
    <div>RepairGrid System Architecture • Powered by AWS Bedrock & Strands Agents SDK</div>
  </div>

</body>
</html>
"""

def main():
    html_path = os.path.join("docs", "architecture_diagram.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(HTML_CONTENT)
    print(f"[OK] Wrote HTML: {html_path}")

    # Render with Edge
    edge_bin = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    png_path = os.path.abspath(os.path.join("docs", "repairgrid_architecture_diagram.png"))
    abs_html = os.path.abspath(html_path)

    cmd = [
        edge_bin,
        "--headless",
        "--disable-gpu",
        "--window-size=2400,1350",
        f"--screenshot={png_path}",
        f"file:///{abs_html}"
    ]
    print("Rendering PNG with headless Edge...")
    res = subprocess.run(cmd, capture_output=True)
    if os.path.exists(png_path):
        print(f"[OK] Rendered high-res PNG: {png_path} ({os.path.getsize(png_path)} bytes)")
    else:
        print("[FAIL] Failed to render PNG:", res.stderr.decode(errors="ignore"))

    # Also render PDF (Devpost accepts PDF!)
    pdf_path = os.path.abspath(os.path.join("docs", "repairgrid_architecture_diagram.pdf"))
    pdf_cmd = [
        edge_bin,
        "--headless",
        "--disable-gpu",
        f"--print-to-pdf={pdf_path}",
        f"file:///{abs_html}"
    ]
    print("Rendering PDF with headless Edge...")
    res_pdf = subprocess.run(pdf_cmd, capture_output=True)
    if os.path.exists(pdf_path):
        print(f"[OK] Rendered PDF: {pdf_path} ({os.path.getsize(pdf_path)} bytes)")

if __name__ == "__main__":
    main()
