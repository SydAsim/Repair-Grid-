import WorkerMissionClient from "./WorkerMissionClient";

export function generateStaticParams() {
  return [
    { id: "default" },
    { id: "RG-M-DE042E" },
    { id: "RG-M-CB94EA" },
  ];
}

export default async function WorkerMissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkerMissionClient id={id} />;
}
