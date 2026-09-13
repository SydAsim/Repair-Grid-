import MissionDetailClient from "./MissionDetailClient";

export function generateStaticParams() {
  return [
    { id: "default" },
    { id: "RG-2841" },
    { id: "RG-3011" },
    { id: "RG-2953" },
    { id: "RG-M-201" },
    { id: "DEC-RAIN-001" },
  ];
}

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MissionDetailClient id={id} />;
}
