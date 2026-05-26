"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import {
  getClimateRiskMapData,
  getClimateRiskMapDataByCoords,
} from "../../services/map/climateService";
import type { MapDataResponse } from "../../services/map/mapTypes";

async function requireSessionEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  return email ?? null;
}

export interface ServerActionResponse<T> {
  success: boolean;
  message: string | null;
  data: T | null;
}

/**
 * Server action to search for a region and retrieve its complete weather and risk mapping assessment.
 */
export async function fetchClimateRiskMapDataAction(
  region: string
): Promise<ServerActionResponse<MapDataResponse>> {
  const email = await requireSessionEmail();
  if (!email) {
    return {
      success: false,
      message: "You must be signed in to access climate risk intelligence.",
      data: null,
    };
  }

  if (!region || !region.trim()) {
    return {
      success: false,
      message: "A valid region search query is required.",
      data: null,
    };
  }

  try {
    const data = await getClimateRiskMapData(region, email);
    return { success: true, message: null, data };
  } catch (error) {
    console.error("[fetchClimateRiskMapDataAction]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected database or AI model error occurred.",
      data: null,
    };
  }
}

/**
 * Server action to process GPS coordinates (latitude and longitude) and retrieve its weather and risk assessment.
 */
export async function fetchClimateRiskMapDataByCoordsAction(
  latitude: number,
  longitude: number
): Promise<ServerActionResponse<MapDataResponse>> {
  const email = await requireSessionEmail();
  if (!email) {
    return {
      success: false,
      message: "You must be signed in to access climate risk intelligence.",
      data: null,
    };
  }

  try {
    const data = await getClimateRiskMapDataByCoords(latitude, longitude, email);
    return { success: true, message: null, data };
  } catch (error) {
    console.error("[fetchClimateRiskMapDataByCoordsAction]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected database or AI model error occurred.",
      data: null,
    };
  }
}
