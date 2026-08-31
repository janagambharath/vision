"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const FaceScannerModal = dynamic(
  () => import("@/components/face-scanner/FaceScannerModal"),
  { ssr: false }
);

export default function MeasurePage() {
  const router = useRouter();

  return (
    <main>
      <FaceScannerModal onClose={() => router.push("/frames")} />
    </main>
  );
}
