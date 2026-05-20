"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Firestore,
} from "firebase/firestore";
import { simulateSensorData, type SensorReading } from "@/lib/sensor/simulateSensorData";

export type SensorState = {
  reading: SensorReading | null;
  loading: boolean;
  error: string | null;
  source: "firestore" | "simulator";
};

/**
 * Subscribes to latest `sensorData` document for a device; falls back to simulator every 5s.
 */
export function useRealtimeSensor(
  firestore: Firestore | null,
  deviceId: string
): SensorState {
  const [state, setState] = useState<SensorState>({
    reading: null,
    loading: true,
    error: null,
    source: "simulator",
  });

  useEffect(() => {
    if (!firestore) {
      setState({
        reading: simulateSensorData(deviceId),
        loading: false,
        error: null,
        source: "simulator",
      });
      const id = setInterval(() => {
        setState({
          reading: simulateSensorData(deviceId),
          loading: false,
          error: null,
          source: "simulator",
        });
      }, 5000);
      return () => clearInterval(id);
    }

    const q = query(
      collection(firestore, "sensorData"),
      orderBy("timestamp", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const doc = snap.docs[0].data();
          setState({
            reading: {
              deviceId: String(doc.deviceId ?? deviceId),
              moisture: Number(doc.moisture ?? 0),
              temperature: Number(doc.temperature ?? 0),
              humidity: Number(doc.humidity ?? 0),
              timestamp:
                doc.timestamp?.toDate?.() instanceof Date
                  ? doc.timestamp.toDate()
                  : new Date(),
            },
            loading: false,
            error: null,
            source: "firestore",
          });
          return;
        }
        setState({
          reading: simulateSensorData(deviceId),
          loading: false,
          error: null,
          source: "simulator",
        });
      },
      (err) => {
        console.error("[useRealtimeSensor]", err);
        setState({
          reading: simulateSensorData(deviceId),
          loading: false,
          error: err.message,
          source: "simulator",
        });
      }
    );

    const sim = setInterval(() => {
      setState((prev) =>
        prev.source === "simulator"
          ? {
              reading: simulateSensorData(deviceId),
              loading: false,
              error: prev.error,
              source: "simulator",
            }
          : prev
      );
    }, 5000);

    return () => {
      unsub();
      clearInterval(sim);
    };
  }, [firestore, deviceId]);

  return state;
}
