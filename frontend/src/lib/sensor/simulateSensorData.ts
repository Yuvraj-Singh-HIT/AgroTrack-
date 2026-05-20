/**
 * Pilot fallback when no physical IoT devices write to `sensorData`.
 * Produces realistic moisture/temperature/humidity swings every tick.
 */
export interface SensorReading {
  moisture: number;
  temperature: number;
  humidity: number;
  timestamp: Date;
  deviceId: string;
}

export function simulateSensorData(deviceId: string): SensorReading {
  const t = Date.now() / 1000;
  const wave = Math.sin(t / 12);
  return {
    deviceId,
    moisture: Math.round((62 + wave * 8 + Math.random() * 3) * 10) / 10,
    temperature: Math.round((24 + wave * 2 + Math.random()) * 10) / 10,
    humidity: Math.round((58 + wave * 10 + Math.random() * 4) * 10) / 10,
    timestamp: new Date(),
  };
}
