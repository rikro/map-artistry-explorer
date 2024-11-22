import paper from 'paper';

export const getStreetsInPolygon = async (polygon: google.maps.Polygon, map: google.maps.Map): Promise<Array<{path: string, name: string}>> => {
  const bounds = new google.maps.LatLngBounds();
  polygon.getPath().forEach(point => bounds.extend(point));
  
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  
  const gridSize = 100;
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
      radius: 20,
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

  // Initialize Paper.js
  paper.setup(new paper.Size(800, 600));
  
  const streets: Array<{path: string, name: string}> = [];
  const projection = map.getProjection();
  if (!projection) return streets;

  const mapBounds = map.getBounds();
  if (!mapBounds) return streets;

  const scale = Math.pow(2, map.getZoom() || 0);
  const topRight = projection.fromLatLngToPoint(mapBounds.getNorthEast());
  const bottomLeft = projection.fromLatLngToPoint(mapBounds.getSouthWest());

  for (const segments of roadSegments.values()) {
    if (segments.length < 2) continue;

    const path = new paper.Path();
    segments.forEach(({ lat, lng }, i) => {
      const point = new google.maps.LatLng(lat, lng);
      const worldPoint = projection.fromLatLngToPoint(point);
      
      const x = (worldPoint.x - bottomLeft.x) * scale;
      const y = (worldPoint.y - topRight.y) * scale;
      
      const normalizedX = (x / (topRight.x - bottomLeft.x) / scale) * 800;
      const normalizedY = (y / (bottomLeft.y - topRight.y) / scale) * 600;
      
      if (i === 0) {
        path.moveTo(new paper.Point(normalizedX, normalizedY));
      } else {
        path.lineTo(new paper.Point(normalizedX, normalizedY));
      }
    });

    path.smooth();
    streets.push({
      path: path.pathData,
      name: segments[0].name
    });
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
        .street-path { stroke: #000000; stroke-width: 1.5; fill: none; }
        .street-name { font-family: Arial; font-size: 10px; fill: #000000; }
      </style>
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
  
  // Initialize Paper.js for the polygon path
  paper.setup(new paper.Size(800, 600));
  const paperPath = new paper.Path();
  
  const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
  const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
  const scale = Math.pow(2, map.getZoom() || 0);
  
  path.forEach((point, i) => {
    const worldPoint = projection.fromLatLngToPoint(point);
    const x = (worldPoint.x - bottomLeft.x) * scale;
    const y = (worldPoint.y - topRight.y) * scale;
    
    const normalizedX = (x / (topRight.x - bottomLeft.x) / scale) * 800;
    const normalizedY = (y / (bottomLeft.y - topRight.y) / scale) * 600;
    
    if (i === 0) {
      paperPath.moveTo(new paper.Point(normalizedX, normalizedY));
    } else {
      paperPath.lineTo(new paper.Point(normalizedX, normalizedY));
    }
  });
  
  return paperPath.pathData;
};