import WorkerMissionClient from "./WorkerMissionClient";

export function generateStaticParams() {
  return [
    { id: "default" },
    { id: "RG-M-DE042E" },
    { id: "RG-M-CB94EA" },
  ];
}

async function getMission(id: string) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/missions/${id}`, {
      headers: {
        "X-Mock-Role": "field_worker",
        "X-Mock-User-Id": "worker-electric-001",
      },
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("SSR failed to fetch mission:", e);
  }
  return null;
}

export default async function WorkerMissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialMission = await getMission(id);
  return <WorkerMissionClient id={id} initialMission={initialMission} />;
}
