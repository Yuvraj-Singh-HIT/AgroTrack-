
'use client';

import type { Firestore } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type ReportType = 'Climate Risk' | 'Soil Analysis' | 'Profit Planner' | 'Plant Diagnosis' | 'Irrigation' | 'Crop Management';

export interface Report {
  id: string;
  ownerId: string;
  ownerEmail: string;
  title: string;
  type: ReportType;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: { toDate: () => Date; toMillis?: () => number };
  updatedAt?: { toDate: () => Date };
}

export interface CreateReportData {
  ownerEmail: string;
  title: string;
  type: ReportType;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: Report['status'];
}

/**
 * Saves a report via the authenticated API (NextAuth session).
 * Does not require Firebase client auth — avoids Firestore permission errors.
 */
export async function createReport(
  _firestore: Firestore | null | undefined,
  reportData: CreateReportData
): Promise<string> {
  const ownerEmail = reportData.ownerEmail.trim().toLowerCase();
  if (!ownerEmail) {
    throw new Error('ownerEmail is required to save a report.');
  }
  if (!reportData.title?.trim()) {
    throw new Error('Report title is required.');
  }
  if (!reportData.type) {
    throw new Error('Report type is required.');
  }

  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: reportData.title.trim(),
        type: reportData.type,
        content: reportData.content ?? {},
        metadata: reportData.metadata ?? {},
        status: reportData.status ?? 'completed',
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        throw new Error('Sign in to save reports.');
      }
      throw new Error(body.error ?? `Failed to save report (${res.status})`);
    }

    const body = (await res.json()) as { id: string };
    return body.id;
  } catch (error: unknown) {
    console.error('Error creating report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('permission') || message.includes('Permission')) {
      const permissionError = new FirestorePermissionError({
        path: 'reports',
        operation: 'create',
        requestResourceData: reportData,
      });
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
    }

    throw new Error(`Failed to create report: ${message}`);
  }
}
