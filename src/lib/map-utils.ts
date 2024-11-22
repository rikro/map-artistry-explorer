export const getStreetsInPolygon = async (polygon: google.maps.Polygon, map: google.maps.Map): Promise<Array<{path: string, name: string}>> => {
  const bounds = new google.maps.LatLngBounds();
  polygon.getPath().forEach(point => bounds.extend(point));
  
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  
  // Create an even denser grid of points for better street detection
  const gridSize = 100; // Increased for better coverage
  const latStep = (ne.lat() - sw.lat()) / gridSize;
  const lngStep = (ne.lng() - sw.lng()) / gridSize;
  
  const points: google.maps.LatLng[] = [];
  for (let lat = sw.lat(); lat <= ne.lat(); lat += latStep) {
    for (let lng = sw.lng(); lng <= ne.lng(); lng += lngStep) {
      const point = new google.maps.LatLng(lat, lng);
      if (google.maps.geometry.poly.containsLocation(point, polygon)) {
        points.push(point);
      }
    }
  }
  
  const service = new google.maps.places.PlacesService(map);
  const roadSegments = new Map<string, Array<{lat: number, lng: number, name: string}>>();
  
  for (const point of points) {
    const request = {
      location: point,
      radius: 20, // Reduced radius for more precise detection
      types: ['route']
    };

    try {
      const results = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
        service.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });

      if (results.length > 0) {
        const place = results[0];
        if (place.place_id) {
          const segments = roadSegments.get(place.place_id) || [];
          segments.push({
            lat: point.lat(),
            lng: point.lng(),
            name: place.name || 'Unknown Street'
          });
          roadSegments.set(place.place_id, segments);
        }
      }
    } catch (error) {
      console.warn('Error fetching street data:', error);
    }
  }

  // Convert road segments to SVG paths using the map's projection
  const width = 800;
  const height = 600;
  const streets: Array<{path: string, name: string}> = [];

  const projection = map.getProjection();
  if (!projection) return streets;

  for (const segments of roadSegments.values()) {
    if (segments.length < 2) continue;

    // Sort points to create continuous paths
    const sortedSegments = [segments[0]];
    let remaining = segments.slice(1);

    while (remaining.length > 0) {
      const current = sortedSegments[sortedSegments.length - 1];
      let closest = remaining[0];
      let closestIndex = 0;
      let minDist = Number.MAX_VALUE;

      remaining.forEach((point, index) => {
        const dist = Math.pow(point.lat - current.lat, 2) + Math.pow(point.lng - current.lng, 2);
        if (dist < minDist) {
          minDist = dist;
          closest = point;
          closestIndex = index;
        }
      });

      sortedSegments.push(closest);
      remaining.splice(closestIndex, 1);
    }

    let svgPath = '';
    const bounds = map.getBounds();
    if (!bounds) continue;

    sortedSegments.forEach(({ lat, lng }, i) => {
      const point = new google.maps.LatLng(lat, lng);
      const worldPoint = projection.fromLatLngToPoint(point);
      const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
      const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
      
      const scale = Math.pow(2, map.getZoom() || 0);
      const x = (worldPoint.x - bottomLeft.x) * scale;
      const y = (worldPoint.y - topRight.y) * scale;
      
      // Normalize coordinates to SVG viewport
      const normalizedX = (x / (topRight.x - bottomLeft.x) / scale) * width;
      const normalizedY = (y / (bottomLeft.y - topRight.y) / scale) * height;
      
      svgPath += `${i === 0 ? 'M' : 'L'} ${normalizedX.toFixed(2)} ${normalizedY.toFixed(2)} `;
    });

    if (svgPath) {
      streets.push({
        path: svgPath,
        name: segments[0].name
      });
    }
  }

  return streets;
};

export const downloadSVG = async (
  boundaryPath: string,
  filename: string,
  streets: Array<{path: string, name: string}>
) => {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <style>
        .boundary { fill: none; stroke: #000000; stroke-width: 2; }
        .street-path { stroke: #000000; stroke-width: 1.5; fill: none; }
        .street-name { font-family: Arial; font-size: 10px; fill: #000000; }
      </style>
      <path class="boundary" d="${boundaryPath}"/>
      ${streets.map((street, i) => `
        <g class="street">
          <path class="street-path" d="${street.path}"/>
          <text class="street-name">
            <textPath href="#street-path-${i}" startOffset="50%">
              ${street.name}
            </textPath>
          </text>
          <path id="street-path-${i}" d="${street.path}" style="display: none;"/>
        </g>
      `).join('')}
    </svg>`;
  
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const polygonToSVGPath = (polygon: google.maps.Polygon): string => {
  const path = polygon.getPath();
  const map = polygon.getMap();
  if (!map) return '';
  
  const projection = map.getProjection();
  if (!projection) return '';
  
  const bounds = map.getBounds();
  if (!bounds) return '';
  
  const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
  const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
  const scale = Math.pow(2, map.getZoom() || 0);
  const width = 800;
  const height = 600;
  
  let svgPoints = '';
  path.forEach((point, i) => {
    const worldPoint = projection.fromLatLngToPoint(point);
    const x = (worldPoint.x - bottomLeft.x) * scale;
    const y = (worldPoint.y - topRight.y) * scale;
    
    // Normalize coordinates to SVG viewport
    const normalizedX = (x / (topRight.x - bottomLeft.x) / scale) * width;
    const normalizedY = (y / (bottomLeft.y - topRight.y) / scale) * height;
    
    svgPoints += `${i === 0 ? 'M' : 'L'} ${normalizedX.toFixed(2)} ${normalizedY.toFixed(2)} `;
  });
  
  return svgPoints + 'Z';
};