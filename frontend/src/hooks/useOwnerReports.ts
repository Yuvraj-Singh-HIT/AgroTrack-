"use client";

import { useCallback, useEffect, useState } from "react";
import type { Report, ReportType } from "@/lib/reports";

type ApiReport = {
  id: string;
  ownerId: string;
  ownerEmail: string;
  title: string;
  type: ReportType;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: Report["status"];
  createdAt: string;
  updatedAt?: string;
};

function toClientReport(row: ApiReport): Report {
  const created = new Date(row.createdAt);
  const updated = row.updatedAt ? new Date(row.updatedAt) : created;
  const ts = {
    toDate: () => created,
    toMillis: () => created.getTime(),
  };
  return {
    id: row.id,
    ownerId: row.ownerId,
    ownerEmail: row.ownerEmail,
    title: row.title,
    type: row.type,
    content: row.content,
    metadata: row.metadata,
    status: row.status,
    createdAt: ts as Report["createdAt"],
    updatedAt: { toDate: () => updated } as Report["updatedAt"],
  };
}

export function useOwnerReports(ownerEmail: string) {
  const [data, setData] = useState<Report[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!ownerEmail) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load reports (${res.status})`);
      }
      const body = (await res.json()) as { reports: ApiReport[] };
      setData((body.reports ?? []).map(toClientReport));
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load reports"));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [ownerEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
