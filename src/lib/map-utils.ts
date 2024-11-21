export const getStreetsInPolygon = async (polygon: google.maps.Polygon, map: google.maps.Map): Promise<Array<{path: string, name: string}>> => {
  const bounds = new google.maps.LatLngBounds();
  polygon.getPath().forEach(point => bounds.extend(point));
  
  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(map);
    const request = {
      bounds: bounds,
      type: ['route']
    };
    
    service.nearbySearch(request, (results) => {
      if (!results) return resolve([]);
      
      const streets = results.map(place => {
        const location = place.geometry?.location;
        if (!location) return null;
        
        // Convert to SVG coordinates
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const width = 800;
        const height = 600;
        
        const x = ((location.lng() - sw.lng()) / (ne.lng() - sw.lng())) * width;
        const y = ((location.lat() - sw.lat()) / (ne.lat() - sw.lat())) * height;
        
        return {
          path: `M ${x-50} ${y} L ${x+50} ${y}`,
          name: place.name || ''
        };
      }).filter((street): street is {path: string, name: string} => street !== null);
      
      resolve(streets);
    });
  });
};

export const polygonToSVGPath = (polygon: google.maps.Polygon): string => {
  const path = polygon.getPath();
  const bounds = new google.maps.LatLngBounds();
  
  // Get bounds
  path.forEach((point) => bounds.extend(point));
  
  // Calculate SVG viewport
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const width = 800;
  const height = 600;
  
  // Convert coordinates to SVG points
  let svgPoints = '';
  path.forEach((point, i) => {
    const x = ((point.lng() - sw.lng()) / (ne.lng() - sw.lng())) * width;
    const y = ((point.lat() - sw.lat()) / (ne.lat() - sw.lat())) * height;
    svgPoints += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
  });
  
  return svgPoints + 'Z';
};

export const downloadSVG = async (
  svgString: string,
  filename: string,
  streets: Array<{path: string, name: string}>
) => {
  const svgContent = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <path d="${svgString}" fill="none" stroke="black" stroke-width="2"/>
      ${streets.map(street => `
        <path d="${street.path}" stroke="gray" stroke-width="1"/>
        <text>
          <textPath href="#${street.name.replace(/\s+/g, '-')}" startOffset="50%">
            ${street.name}
          </textPath>
        </text>
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