import React, { useState, useEffect, useMemo } from 'react';
import { PROVINCIAL_CAPITALS } from './constants';
import { City, TravelTimeData, ViewMode } from './types';
import { fetchHSRTravelTimes } from './services/geminiService';
import { MapViz } from './components/MapViz';
import { Clock, Map as MapIcon, TrainFront, Info } from 'lucide-react';

function App() {
  const [centerCityName, setCenterCityName] = useState<string>('北京');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GEO);
  const [travelTimes, setTravelTimes] = useState<TravelTimeData>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Helper to find city object
  const centerCity = useMemo(() => 
    PROVINCIAL_CAPITALS.find(c => c.name === centerCityName) || PROVINCIAL_CAPITALS[0],
  [centerCityName]);

  // Update window dimensions
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.min(window.innerWidth - 40, 1000),
        height: Math.min(window.innerHeight - 180, 800)
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch data when center city changes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      // Optimization: If we were building a full app, we'd cache these results per center city.
      const times = await fetchHSRTravelTimes(centerCityName, PROVINCIAL_CAPITALS);
      if (isMounted) {
        setTravelTimes(times);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [centerCityName]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 flex flex-col items-center">
      <header className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50">
             <TrainFront size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
              中国高铁等时圈地图
            </h1>
            <p className="text-xs text-slate-500">Real-time HSR Data via Gemini Search Grounding</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-xl border border-slate-800">
          
          {/* City Selector */}
          <div className="flex items-center gap-2 px-2">
            <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider">出发中心</label>
            <select 
              value={centerCityName}
              onChange={(e) => {
                setCenterCityName(e.target.value);
                // Optionally auto-switch to geo to show the change in context first
                setViewMode(ViewMode.GEO);
              }}
              className="bg-slate-800 text-white text-sm rounded border border-slate-700 px-3 py-1 focus:outline-none focus:border-blue-500 transition-colors"
              disabled={loading}
            >
              {PROVINCIAL_CAPITALS.map(city => (
                <option key={city.name} value={city.name}>{city.name}</option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-slate-700"></div>

          {/* View Mode Toggles */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode(ViewMode.GEO)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                viewMode === ViewMode.GEO 
                  ? 'bg-slate-700 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon size={16} />
              地理视图
            </button>
            <button
              onClick={() => setViewMode(ViewMode.TIME)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                viewMode === ViewMode.TIME 
                  ? 'bg-blue-600 text-white shadow shadow-blue-900/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock size={16} />
              时间视图
            </button>
          </div>

        </div>
      </header>

      <main className="relative w-full max-w-5xl flex flex-col items-center">
        {/* Loading Indicator Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sm text-blue-400 font-medium animate-pulse">
                Searching Train Schedules... (Gemini Grounding)
              </div>
            </div>
          </div>
        )}

        <MapViz 
          cities={PROVINCIAL_CAPITALS}
          centerCity={centerCity}
          travelTimes={travelTimes}
          viewMode={viewMode}
          width={dimensions.width}
          height={dimensions.height}
        />

        <div className="w-full mt-4 flex items-start gap-2 text-slate-500 text-xs max-w-2xl">
           <Info size={16} className="shrink-0 mt-0.5" />
           <p>
             <strong>地图说明：</strong><br/>
             1. <strong>地理视图：</strong> 展示城市的真实地理位置（墨卡托投影）。<br/>
             2. <strong>时间视图：</strong> 保持地理方位（角度）不变，将距离替换为从中心城市出发的高铁通行时间。距离中心越近，表示高铁耗时越短。<br/>
             3. 虚线圆环代表时间等值线（1小时、2小时...）。<br/>
             4. <strong>数据来源：</strong> 本次查询使用了 Google Gemini 的搜索功能 (Search Grounding) 实时检索互联网上的列车时刻表（如 12306, Ctrip 等），尽可能获取最新的 G/D 字头最快车次时间。如遇直达车缺失，可能为估算的换乘时间。
           </p>
        </div>
      </main>
    </div>
  );
}

export default App;
