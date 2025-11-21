import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Plus, Minus } from 'lucide-react';
import { City, TravelTimeData, ViewMode } from '../types';

interface MapVizProps {
  cities: City[];
  centerCity: City;
  travelTimes: TravelTimeData;
  viewMode: ViewMode;
  width: number;
  height: number;
}

// Scaling factor for time view: 1 minute -> how many pixels?
const TIME_SCALE_FACTOR = 0.5; 

export const MapViz: React.FC<MapVizProps> = ({
  cities,
  centerCity,
  travelTimes,
  viewMode,
  width,
  height
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  useEffect(() => {
    if (!svgRef.current || cities.length === 0) return;

    const svg = d3.select(svgRef.current);
    
    // Define Projection (Geo Mercator centered on China)
    // Scale is adjusted by the zoom factor
    const projection = d3.geoMercator()
      .center([105, 38]) // Rough center of China
      .scale(width * 0.8 * zoom)
      .translate([width / 2, height / 2]);

    // Data Preparation: Calculate positions for both modes
    const nodeData = cities.map(city => {
      const geoPos = projection([city.lng, city.lat]);
      const centerPos = projection([centerCity.lng, centerCity.lat]);
      
      if (!geoPos || !centerPos) return null;

      // GEO Mode Coords
      const xGeo = geoPos[0];
      const yGeo = geoPos[1];

      // Calculation for Time Mode
      // 1. Get vector from center to city in projected space (to keep bearing)
      const dx = xGeo - centerPos[0];
      const dy = yGeo - centerPos[1];
      const angle = Math.atan2(dy, dx); // Bearing in radians

      // 2. Get distance based on Time
      // The visual distance representing time also scales with zoom
      const minutes = travelTimes[city.name] || 0;
      const distancePx = minutes * TIME_SCALE_FACTOR * zoom;

      // 3. Calculate new Time coords
      const xTime = centerPos[0] + Math.cos(angle) * distancePx;
      const yTime = centerPos[1] + Math.sin(angle) * distancePx;

      return {
        ...city,
        xGeo,
        yGeo,
        xTime: city.name === centerCity.name ? centerPos[0] : xTime,
        yTime: city.name === centerCity.name ? centerPos[1] : yTime,
        minutes,
        geoDistance: Math.sqrt(dx*dx + dy*dy) // For reference
      };
    }).filter(Boolean) as (City & { xGeo: number, yGeo: number, xTime: number, yTime: number, minutes: number })[];

    const centerNode = nodeData.find(n => n.name === centerCity.name);
    if (!centerNode) return;

    // DRAWING
    
    // 1. Isochrones (Circles) - Only visible in Time Mode
    // We draw concentric circles representing 1h, 2h, 3h... etc.
    const maxTime = d3.max(nodeData, d => d.minutes) || 600;
    const hours = d3.range(1, Math.ceil(maxTime / 60) + 1);
    
    const rings = svg.selectAll('.isochrone')
      .data(hours, (d: any) => d);

    rings.exit().remove();

    rings.enter()
      .append('circle')
      .attr('class', 'isochrone')
      .attr('fill', 'none')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
      .attr('cx', centerNode.xGeo)
      .attr('cy', centerNode.yGeo)
      .attr('r', 0)
      .merge(rings as any)
      .transition().duration(1000)
      .attr('cx', viewMode === ViewMode.TIME ? centerNode.xTime : centerNode.xGeo)
      .attr('cy', viewMode === ViewMode.TIME ? centerNode.yTime : centerNode.yGeo)
      .attr('r', (d: number) => viewMode === ViewMode.TIME ? d * 60 * TIME_SCALE_FACTOR * zoom : 0)
      .style('opacity', viewMode === ViewMode.TIME ? 1 : 0);


    // 2. Links (Lines from Center to Cities)
    const links = svg.selectAll('.link')
      .data(nodeData.filter(d => d.name !== centerCity.name), (d: any) => d.name);

    links.exit().remove();

    const linkEnter = links.enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#475569')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3);

    linkEnter.merge(links as any)
      .transition().duration(1000)
      .attr('x1', viewMode === ViewMode.TIME ? centerNode.xTime : centerNode.xGeo)
      .attr('y1', viewMode === ViewMode.TIME ? centerNode.yTime : centerNode.yGeo)
      .attr('x2', (d: any) => viewMode === ViewMode.TIME ? d.xTime : d.xGeo)
      .attr('y2', (d: any) => viewMode === ViewMode.TIME ? d.yTime : d.yGeo)
      .attr('stroke', viewMode === ViewMode.TIME ? '#60a5fa' : '#475569')
      .attr('opacity', viewMode === ViewMode.TIME ? 0.6 : 0.3);

    // 3. Nodes (Cities)
    const nodes = svg.selectAll('.node')
      .data(nodeData, (d: any) => d.name);

    nodes.exit().remove();

    const nodesEnter = nodes.enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .on('mouseenter', (e, d) => setHoveredCity(d.name))
      .on('mouseleave', () => setHoveredCity(null));

    nodesEnter.append('circle')
      .attr('r', (d) => d.name === centerCity.name ? 6 : 3)
      .attr('fill', (d) => d.name === centerCity.name ? '#ef4444' : '#e2e8f0');

    nodesEnter.append('text')
      .text((d) => d.name)
      .attr('font-size', 10)
      .attr('fill', '#94a3b8')
      .attr('x', 8)
      .attr('y', 3);

    // Update Nodes
    const nodesUpdate = nodesEnter.merge(nodes as any);

    nodesUpdate.transition().duration(1000)
      .attr('transform', (d: any) => `translate(${viewMode === ViewMode.TIME ? d.xTime : d.xGeo}, ${viewMode === ViewMode.TIME ? d.yTime : d.yGeo})`);

    nodesUpdate.select('circle')
      .attr('fill', (d: any) => {
        if (d.name === centerCity.name) return '#ef4444'; // Red for center
        return '#38bdf8'; // Blue for others
      })
      .attr('r', (d: any) => d.name === centerCity.name ? 8 : 4);

    nodesUpdate.select('text')
      .attr('fill', (d: any) => d.name === centerCity.name ? '#fff' : '#cbd5e1')
      .style('opacity', (d: any) => {
        // Hide text if clustered too close unless hovered (simple logic)
        return 1; 
      });

  }, [cities, centerCity, travelTimes, viewMode, width, height, zoom]);

  return (
    <div className="relative">
        <svg ref={svgRef} width={width} height={height} className="block bg-slate-900 rounded-xl shadow-2xl border border-slate-800" />
        
        {/* Zoom Controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
            <button 
                onClick={() => setZoom(z => Math.min(z * 1.2, 5))}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg shadow-lg border border-slate-600 transition-all active:scale-95"
                title="Zoom In"
            >
                <Plus size={20} />
            </button>
            <button 
                onClick={() => setZoom(z => Math.max(z / 1.2, 0.5))}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg shadow-lg border border-slate-600 transition-all active:scale-95"
                title="Zoom Out"
            >
                <Minus size={20} />
            </button>
        </div>

        {hoveredCity && travelTimes[hoveredCity] !== undefined && (
          <div className="absolute top-4 right-4 bg-slate-800/90 p-3 rounded border border-slate-600 text-xs text-slate-200 pointer-events-none backdrop-blur-sm z-20 shadow-xl">
            <div className="font-bold text-sm text-white mb-1">{hoveredCity}</div>
            <div>出发: {centerCity.name}</div>
            {viewMode === ViewMode.TIME ? (
               <div className="text-blue-400 font-mono mt-1">耗时: {Math.floor(travelTimes[hoveredCity] / 60)}h {travelTimes[hoveredCity] % 60}m</div>
            ) : (
               <div className="text-slate-400 italic mt-1">切换到时间视图查看高铁耗时</div>
            )}
          </div>
        )}
    </div>
  );
};
