import ResidentVerifyClient from "./ResidentVerifyClient";

export function generateStaticParams() {
  return [
    { id: "default" },
    { id: "RG-R-101" },
    { id: "RG-R-102" },
    { id: "RG-R-103" },
  ];
}

export default async function ResidentVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResidentVerifyClient id={id} />;
}
