import { Hero3D } from "@/components/Hero3D";
import { ScrollySections } from "@/components/home/ScrollySections";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      <Hero3D />
      <ScrollySections />
    </main>
  );
}
