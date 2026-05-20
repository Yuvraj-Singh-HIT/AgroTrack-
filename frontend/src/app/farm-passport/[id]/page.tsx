"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PassportPdfButton } from "@/components/pdf/PassportPdfButton";

export default function FarmPassportDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { firestore } = useFirebase();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !id) return;
    void getDoc(doc(firestore, "farmPassports", id)).then((snap) => {
      setData(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
  }, [firestore, id]);

  if (loading) {
    return <p className="text-muted-foreground">Loading passport…</p>;
  }
  if (!data) {
    return <p className="text-destructive">Passport not found.</p>;
  }

  const history = Array.isArray(data.history)
    ? (data.history as { action: string; description: string; timestamp: string }[])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Passport details" description={String(data.crop ?? "")} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{String(data.passportId)}</CardTitle>
          <PassportPdfButton passport={data} />
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Location: {String(data.location)}</p>
          <p>
            Plant {String(data.plantDate)} → Harvest {String(data.harvestDate)}
          </p>
          <h3 className="font-semibold">Timeline</h3>
          <ul className="space-y-2 border-l-2 pl-4">
            {history.map((h, i) => (
              <li key={i}>
                <span className="font-medium">{h.action}</span> — {h.description}
                <span className="block text-xs text-muted-foreground">{h.timestamp}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" asChild>
            <a href={`/farm-passport`}>Back to list</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
