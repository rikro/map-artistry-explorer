export const getStreetsInPolygon = async (polygon: google.maps.Polygon, map: google.maps.Map): Promise<Array<{path: string, name: string}>> => {
  const bounds = new google.maps.LatLngBounds();
  polygon.getPath().forEach(point => bounds.extend(point));
  
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  
  // Create a denser grid of points for better street detection
  const gridSize = 10;
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
  const roadSegments = new Map<string, Array<{point: google.maps.LatLng, name: string}>>();
  
  // Process points to get street data
  for (const point of points) {
    const request = {
      location: point,
      radius: 100, // Increased radius for better street detection
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
            point,
            name: place.name || 'Unknown Street'
          });
          roadSegments.set(place.place_id, segments);
        }
      }
    } catch (error) {
      console.warn('Error fetching street data:', error);
    }
  }

  // Convert road segments to SVG paths
  const width = 800;
  const height = 600;
  const streets: Array<{path: string, name: string}> = [];

  for (const segments of roadSegments.values()) {
    if (segments.length < 2) continue;

    // Sort points to create a continuous path
    segments.sort((a, b) => a.point.lng() - b.point.lng());

    let svgPath = '';
    segments.forEach(({ point }, i) => {
      const x = ((point.lng() - sw.lng()) / (ne.lng() - sw.lng())) * width;
      const y = height - ((point.lat() - sw.lat()) / (ne.lat() - sw.lat())) * height;
      svgPath += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
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
  const svgContent = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <style>
        .street-path { stroke: #000000; stroke-width: 2; fill: none; }
        .street-name { font-family: Arial; font-size: 12px; fill: #000000; }
      </style>
      <path d="${boundaryPath}" fill="none" stroke="#000000" stroke-width="2"/>
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
    </svg>
  `;
  
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
  const bounds = new google.maps.LatLngBounds();
  
  path.forEach((point) => bounds.extend(point));
  
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const width = 800;
  const height = 600;
  
  let svgPoints = '';
  path.forEach((point, i) => {
    const x = ((point.lng() - sw.lng()) / (ne.lng() - sw.lng())) * width;
    const y = height - ((point.lat() - sw.lat()) / (ne.lat() - sw.lat())) * height;
    svgPoints += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
  });
  
  return svgPoints + 'Z';
};