import { GoogleGenAI } from "@google/genai";
import { City, TravelTimeData } from "../types";
import { PROVINCIAL_CAPITALS } from "../constants";

// Updated version to v2 to invalidate old "estimated" cache
const CACHE_KEY_PREFIX = 'hsr_travel_times_v2_grounded_';

// Reduced batch size slightly to ensure the Search tool doesn't get overwhelmed with too many queries at once
const BATCH_SIZE = 6; 

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to calculate distance-based time (fallback only)
const estimateDistanceTime = (centerName: string, target: City): number => {
  const center = PROVINCIAL_CAPITALS.find(c => c.name === centerName);
  if (!center) return 0;
  if (center.name === target.name) return 0;

  const R = 6371; 
  const dLat = (target.lat - center.lat) * Math.PI / 180;
  const dLon = (target.lng - center.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(center.lat * Math.PI / 180) * Math.cos(target.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distanceKm = R * c;
  
  if (distanceKm < 10) return 0;
  // Fallback estimation: 250km/h + 30 min buffer
  return Math.round((distanceKm / 250) * 60 + 30);
};

// Fallback generator
const simulateTravelTimes = (centerCity: string, cities: City[]): TravelTimeData => {
  const data: TravelTimeData = {};
  cities.forEach(city => {
    data[city.name] = estimateDistanceTime(centerCity, city);
  });
  return data;
};

export const fetchHSRTravelTimes = async (
  centerCity: string,
  targetCities: City[]
): Promise<TravelTimeData> => {
  // 1. Try Cache
  const cacheKey = `${CACHE_KEY_PREFIX}${centerCity}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Object.keys(parsed).length > 0) {
        console.log(`[GeminiService] Loaded ${centerCity} from cache (v2).`);
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Cache read failed", e);
  }

  const client = getClient();
  if (!client) {
    console.warn("Using fallback calculation due to missing API key.");
    return simulateTravelTimes(centerCity, targetCities);
  }

  // 2. Prepare Batches
  const targetsToFetch = targetCities.filter(c => c.name !== centerCity);
  const batches: City[][] = [];
  for (let i = 0; i < targetsToFetch.length; i += BATCH_SIZE) {
    batches.push(targetsToFetch.slice(i, i + BATCH_SIZE));
  }

  console.log(`[GeminiService] Fetching real schedules for ${targetsToFetch.length} cities in ${batches.length} batches...`);

  // 3. Execute Parallel Requests with Search Grounding
  const batchPromises = batches.map(async (batch) => {
    const cityListStr = batch.map(c => c.name).join(", ");
    
    // Prompt specifically asks for search and JSON output
    // Note: When using googleSearch, we cannot strictly enforce responseSchema, so we ask nicely in the prompt.
    const prompt = `
      Task: Find the fastest High-Speed Rail (G-series or D-series) travel time from ${centerCity} to these cities: ${cityListStr}.
      
      Instructions:
      1. Use Google Search to find current train schedules (e.g. 12306, Trip.com).
      2. Find the shortest duration in minutes.
      3. If no direct train exists, estimate the fastest connection time based on search results.
      4. Return ONLY a valid JSON array. No Markdown formatting. No explanations.
      
      Format:
      [{"city": "CityName", "minutes": 120}, {"city": "CityName2", "minutes": 300}]
    `;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }], // Enable Google Search for real data
          temperature: 0.1, // Low temperature for factual data
        }
      });

      // Clean up the text response to ensure it's valid JSON
      let jsonText = response.text;
      if (!jsonText) return [];
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(jsonText) as { city: string, minutes: number }[];
      
      // Basic validation
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      console.error(`[GeminiService] Batch error for ${centerCity} (Batch: ${cityListStr}):`, error);
      // Return empty to trigger fallback for this batch
      return []; 
    }
  });

  const results = await Promise.all(batchPromises);

  // 4. Merge Results
  const finalData: TravelTimeData = { [centerCity]: 0 };
  
  // Flatten results
  const flatResults = results.flat();
  flatResults.forEach(item => {
    if (item && item.city && typeof item.minutes === 'number') {
      finalData[item.city] = item.minutes;
    }
  });

  // 5. Fill missing with Fallback
  targetCities.forEach(city => {
    if (finalData[city.name] === undefined) {
      console.log(`[GeminiService] Missing data for ${city.name}, using fallback.`);
      finalData[city.name] = estimateDistanceTime(centerCity, city);
    }
  });

  // 6. Save to Cache
  try {
    localStorage.setItem(cacheKey, JSON.stringify(finalData));
  } catch (e) {
    console.warn("Cache write failed", e);
  }

  return finalData;
};
