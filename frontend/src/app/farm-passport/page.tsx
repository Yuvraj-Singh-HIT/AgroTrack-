"use client";

import { useActionState, useEffect, useState } from "react";
import { createPassportAction } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useSession } from "next-auth/react";
import Link from "next/link";

type PassportRow = {
  passportId: string;
  crop: string;
  location: string;
  plantDate: string;
  harvestDate: string;
  history?: { action: string; description: string; timestamp: string }[];
};

const initial = { message: null as string | null, passportId: null as string | null };

export default function FarmPassportPage() {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  const [rows, setRows] = useState<PassportRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [state, action, pending] = useActionState(createPassportAction, initial);

  useEffect(() => {
    if (!firestore || !email) {
      setLoadingList(false);
      return;
    }
    const q = query(collection(firestore, "farmPassports"), where("ownerEmail", "==", email));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              passportId: String(data.passportId ?? d.id),
              crop: String(data.crop ?? ""),
              location: String(data.location ?? ""),
              plantDate: String(data.plantDate ?? ""),
              harvestDate: String(data.harvestDate ?? ""),
              history: Array.isArray(data.history) ? data.history : [],
            };
          })
        );
        setLoadingList(false);
      },
      () => setLoadingList(false)
    );
    return () => unsub();
  }, [firestore, email]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Farm digital passport"
        description="Blockchain-ready traceability record for each crop cycle (pilot: Firestore + UUID)."
      />

      <Card>
        <form action={action}>
          <CardHeader>
            <CardTitle>Issue new passport</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="crop">Crop</Label>
              <Input id="crop" name="crop" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plantDate">Plant date</Label>
              <Input id="plantDate" name="plantDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="harvestDate">Harvest date</Label>
              <Input id="harvestDate" name="harvestDate" type="date" required />
            </div>
            {state.message ? <p className="text-sm text-destructive sm:col-span-2">{state.message}</p> : null}
            {state.passportId ? (
              <p className="text-sm text-green-700 sm:col-span-2">
                Created passport <code className="text-xs">{state.passportId}</code>
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create passport
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-headline font-semibold">Your passports</h2>
        {loadingList ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passports yet. Create one above.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((p) => (
              <Card key={p.passportId}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{p.crop}</CardTitle>
                    <p className="text-sm text-muted-foreground">{p.location}</p>
                  </div>
                  <QrCode className="h-8 w-8 text-primary opacity-80" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Badge variant="secondary">{p.passportId.slice(0, 8)}…</Badge>
                  <p>
                    Plant: {p.plantDate} · Harvest: {p.harvestDate}
                  </p>
                  <ul className="mt-2 space-y-1 border-l-2 border-primary/30 pl-3">
                    {(p.history ?? []).slice(-3).map((h, i) => (
                      <li key={i}>
                        <span className="font-medium">{h.action}</span> — {h.description}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/farm-passport/${p.passportId}`}>Details & export</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
