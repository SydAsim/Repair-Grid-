import base64
import json
import os
import urllib.request

MERMAID_GRAPH = """
flowchart TD
    classDef clientStyle fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#ffffff;
    classDef edgeStyle fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#ffffff;
    classDef backendStyle fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ffffff;
    classDef agentStyle fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#ffffff;
    classDef bedrockStyle fill:#4c0519,stroke:#fb7185,stroke-width:2px,color:#ffffff;
    classDef dataStyle fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#ffffff;
    classDef hitlStyle fill:#7f1d1d,stroke:#ef4444,stroke-width:3px,color:#ffffff;

    subgraph L1 ["1. USER ACCESS & CLIENT APPLICATIONS (Next.js 15 App Router)"]
        direction LR
        R["📱 RESIDENT HUB<br/>• Mobile Report Capture (/report)<br/>• 5-Stage Mission Stepper (/resident)<br/>• Citizen Proof Confirmation (/verify)"]:::clientStyle
        W["🔧 FIELD TECHNICIAN PWA<br/>• Availability Shift Toggle (/worker)<br/>• Turn-by-Turn GPS Map (/worker/map)<br/>• Work Completion Attestation (/complete)"]:::clientStyle
        O["🎛️ MISSION CONTROL<br/>• District Health Index (0-100)<br/>• Living GIS Risk Map (/operations/map)<br/>• Human-in-the-Loop Inbox (/decisions)<br/>• Realtime Agent Telemetry (/agents)"]:::clientStyle
    end

    subgraph L2 ["2. INGRESS & EDGE SECURITY"]
        direction LR
        AMP["AWS Amplify Hosting<br/>Global Edge CDN Distribution"]:::edgeStyle
        APIGW["Amazon API Gateway v2<br/>HTTP REST API + WebSocket Engine"]:::edgeStyle
        AUTH["Amazon Cognito & JWT RBAC<br/>Role Validation (resident, worker, operator)"]:::edgeStyle
    end

    subgraph L3 ["3. SERVERLESS BACKEND SERVICES"]
        direction LR
        LAMBDA["AWS Lambda Core Backend<br/>FastAPI / Python 3.12 Serverless"]:::backendStyle
        LOC["Amazon Location Service<br/>Reverse Geocoding & Route Optimization"]:::backendStyle
        WS_LAMBDA["WebSocket Broadcaster Lambda<br/>Sub-second State Push to Clients"]:::backendStyle
    end

    subgraph L4 ["4. STRANDS MULTI-AGENT ORCHESTRATION GRAPH"]
        direction TB
        subgraph PIPELINE ["Agent Execution Pipeline"]
            direction LR
            A_INTAKE["1. Intake & Enrichment Agent<br/>GPS, Photo & Speech-to-Text"]:::agentStyle
            A_DEDUP{"2. Deduplication Agent<br/>Spatial Radius < 50m?"}:::agentStyle
            A_RISK["3. Deterministic Risk Engine<br/>6-Factor Severity Scoring"]:::agentStyle
            A_MATCH["4. Worker Match Engine<br/>Skills, Location & SLA Fit"]:::agentStyle
            A_GUARD{"5. Guardian Safety Policy<br/>Safe for Autonomy?"}:::agentStyle
            A_VERIFY["6. Completion Verifier<br/>Before/After Vision Proof"]:::agentStyle
        end
        A_MERGE["Auto-Merge Duplicate Report<br/>Notify Citizen (No Dispatch)"]:::agentStyle
        A_HITL["🚨 Human-in-the-Loop Decision Gate<br/>Execution Paused for Operator Sign-off"]:::hitlStyle
    end

    subgraph L5 ["5. AI & MULTIMODAL INTELLIGENCE"]
        direction LR
        AGENT_CORE["Amazon Bedrock AgentCore<br/>Runtime Graph Orchestration"]:::bedrockStyle
        NOVA["Amazon Nova 2 Lite & Pro<br/>Multimodal Computer Vision"]:::bedrockStyle
        MCP_TOOLS["19 AgentCore Gateway Tools<br/>Strict JSON Schemas & Guardrails"]:::bedrockStyle
    end

    subgraph L6 ["6. PERSISTENCE, EVIDENCE & OBSERVABILITY"]
        direction LR
        DYNAMO[("Amazon DynamoDB<br/>5 Tables: Reports, Missions,<br/>Workers, Decisions, Events")]:::dataStyle
        S3[("Amazon S3 Evidence Bucket<br/>SSE-S3 Encrypted Presigned URLs")]:::dataStyle
        STREAMS["DynamoDB Streams<br/>Change-Data-Capture (CDC)"]:::dataStyle
        CW["Amazon CloudWatch<br/>Centralized Metrics, Logs & Budgets"]:::dataStyle
    end

    %% Connections Downward
    L1 -->|HTTPS Requests| APIGW
    APIGW --> AUTH
    AUTH --> LAMBDA
    LAMBDA <--> LOC

    LAMBDA -->|Invoke Graph| A_INTAKE
    A_INTAKE --> A_DEDUP
    A_DEDUP -->|Match >= 95%| A_MERGE
    A_DEDUP -->|New Incident| A_RISK
    A_RISK --> A_MATCH
    A_MATCH --> A_GUARD
    A_GUARD -->|Consequential / Critical| A_HITL
    A_HITL -->|Operator Decides| O
    A_GUARD -->|Safe Autonomous Dispatch| W
    W -->|Submit Photo Evidence| A_VERIFY
    A_VERIFY -->|Vision Verified| DYNAMO

    %% Strands <--> Bedrock
    L4 <--> AGENT_CORE
    AGENT_CORE <--> NOVA
    AGENT_CORE <--> MCP_TOOLS

    %% Persistence & Realtime
    LAMBDA <--> DYNAMO
    LAMBDA <--> S3
    DYNAMO --> STREAMS --> WS_LAMBDA --> APIGW
    APIGW -.->|WebSocket Telemetry Push| O
    APIGW -.->|Live Progress Push| R
    LAMBDA -.-> CW
"""

def generate_diagrams():
    payload = {
        "code": MERMAID_GRAPH.strip(),
        "mermaid": {
            "theme": "dark",
            "themeVariables": {
                "darkMode": True,
                "background": "#09090b",
                "primaryColor": "#1e1b4b",
                "primaryBorderColor": "#818cf8",
                "primaryTextColor": "#ffffff",
                "lineColor": "#818cf8",
                "fontSize": "14px"
            }
        }
    }

    b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("ascii")

    # 1. Download PNG
    png_url = f"https://mermaid.ink/img/{b64}?type=png"
    print(f"Downloading PNG from {png_url[:60]}...")
    req = urllib.request.Request(png_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        png_bytes = resp.read()
        png_path = os.path.join("docs", "repairgrid_architecture_diagram.png")
        with open(png_path, "wb") as f:
            f.write(png_bytes)
        print(f"[OK] Saved PNG: {png_path} ({len(png_bytes)} bytes)")

    # 2. Download SVG
    svg_url = f"https://mermaid.ink/svg/{b64}"
    print(f"Downloading SVG from {svg_url[:60]}...")
    req_svg = urllib.request.Request(svg_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req_svg, timeout=30) as resp:
        svg_bytes = resp.read()
        svg_path = os.path.join("docs", "repairgrid_architecture_diagram.svg")
        with open(svg_path, "wb") as f:
            f.write(svg_bytes)
        print(f"[OK] Saved SVG: {svg_path} ({len(svg_bytes)} bytes)")

if __name__ == "__main__":
    generate_diagrams()
