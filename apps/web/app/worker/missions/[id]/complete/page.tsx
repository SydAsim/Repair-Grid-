import WorkerCompleteClient from "./WorkerCompleteClient";

export function generateStaticParams() {
  return [
    { id: "default" },
    { id: "RG-M-DE042E" },
    { id: "RG-M-CB94EA" },
  ];
}

export default async function WorkerCompletionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkerCompleteClient id={id} />;
}
