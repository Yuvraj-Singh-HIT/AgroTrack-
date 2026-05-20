import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../../.env') });

import './flows/climate-risk-forecast.ts';
import '../services/weather/genkitTool';
import './flows/suggest-profitable-crops.ts';
import './flows/match-with-market-participants.ts';
import './flows/diagnose-plant.ts';
import './flows/text-to-speech.ts';
import './flows/soil-analysis.ts';
