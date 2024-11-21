export const getStreetsInPolygon = async (polygon: google.maps.Polygon, map: google.maps.Map): Promise<Array<{path: string, name: string}>> => {
  const bounds = new google.maps.LatLngBounds();
  polygon.getPath().forEach(point => bounds.extend(point));
  
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latStep = (ne.lat() - sw.lat()) / 5;
  const lngStep = (ne.lng() - sw.lng()) / 5;
  
  const points: google.maps.LatLng[] = [];
  for (let lat = sw.lat(); lat <= ne.lat(); lat += latStep) {
    for (let lng = sw.lng(); lng <= ne.lng(); lng += lngStep) {
      const point = new google.maps.LatLng(lat, lng);
      if (google.maps.geometry.poly.containsLocation(point, polygon)) {
        points.push(point);
      }
    }
  }
  
  try {
    const path = points.map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));

    // Use the standard Places Service instead of Roads API
    const service = new google.maps.places.PlacesService(map);
    const roadSegments = new Map<string, google.maps.LatLng[]>();

    // Process points in chunks to avoid rate limiting
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const request = {
        location: point,
        radius: 50,
        types: ['route']
      };

      const result = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
        service.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });

      if (result.length > 0 && result[0].place_id) {
        const segment = roadSegments.get(result[0].place_id) || [];
        segment.push(point);
        roadSegments.set(result[0].place_id, segment);
      }
    }

    const width = 800;
    const height = 600;
    const streets: Array<{path: string, name: string}> = [];

    for (const [placeId, points] of roadSegments) {
      if (points.length < 2) continue;

      let svgPath = '';
      points.forEach((point, i) => {
        const x = ((point.lng() - sw.lng()) / (ne.lng() - sw.lng())) * width;
        const y = ((point.lat() - sw.lat()) / (ne.lat() - sw.lat())) * height;
        svgPath += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
      });

      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
        geocoder.geocode({ location: points[Math.floor(points.length / 2)] }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      });

      const streetName = result?.address_components?.find(
        component => component.types.includes('route')
      )?.long_name || 'Unknown Street';

      streets.push({
        path: svgPath,
        name: streetName
      });
    }

    return streets;
  } catch (error) {
    console.error('Error processing streets:', error);
    return [];
  }
};

export const downloadSVG = async (
  svgString: string,
  filename: string,
  streets: Array<{path: string, name: string}>
) => {
  const svgContent = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${streets.map((street, i) => `
          <path id="street-path-${i}" d="${street.path}" />
        `).join('')}
      </defs>
      
      ${streets.map((street, i) => `
        <g class="street">
          <use href="#street-path-${i}" stroke="black" stroke-width="2"/>
          <text>
            <textPath href="#street-path-${i}" startOffset="50%" text-anchor="middle" fill="black" font-size="12">
              ${street.name}
            </textPath>
          </text>
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
    const y = ((point.lat() - sw.lat()) / (ne.lat() - sw.lat())) * height;
    svgPoints += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
  });
  
  return svgPoints + 'Z';
};
