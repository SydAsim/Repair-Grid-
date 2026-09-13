import ResidentReportClient from "./ResidentReportClient";

export function generateStaticParams() {
  return [
    { id: "default" },
    { id: "RG-R-101" },
    { id: "RG-R-102" },
    { id: "RG-R-103" },
  ];
}

export default async function ResidentReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResidentReportClient id={id} />;
}
