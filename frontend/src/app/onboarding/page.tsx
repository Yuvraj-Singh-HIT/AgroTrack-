"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveFarmProfileAction, type OnboardingFormState } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const initial: OnboardingFormState = { message: null, ok: false };

export default function OnboardingPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveFarmProfileAction, initial);

  useEffect(() => {
    if (state.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Farm profile"
        description="Tell us about your farm so we can auto-fill tools and recommendations."
      />
      <Card>
        <form action={action}>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="farmName">Farm name</Label>
              <Input id="farmName" name="farmName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="District, State" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acreage">Acreage</Label>
              <Input id="acreage" name="acreage" type="number" step="0.1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cropTypes">Crop types (comma-separated)</Label>
              <Input id="cropTypes" name="cropTypes" placeholder="Wheat, Rice" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredLanguage">Preferred language</Label>
              <Input id="preferredLanguage" name="preferredLanguage" defaultValue="en" required />
            </div>
            {state.message ? (
              <p className="text-sm text-destructive">{state.message}</p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save and continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
