export const getStreetsInPolygon = async (polygon: google.maps.Polygon, map: google.maps.Map): Promise<Array<{path: string, name: string}>> => {
  const bounds = new google.maps.LatLngBounds();
  polygon.getPath().forEach(point => bounds.extend(point));
  
  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(map);
    const request = {
      bounds: bounds,
      type: 'route'
    };
    
    service.nearbySearch(request, async (results) => {
      if (!results) return resolve([]);
      
      const streets = await Promise.all(results.map(async (place) => {
        if (!place.geometry?.location || !place.name) return null;
        
        const location = place.geometry.location;
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const width = 800;
        const height = 600;
        
        // Convert location to SVG coordinates
        const x = ((location.lng() - sw.lng()) / (ne.lng() - sw.lng())) * width;
        const y = ((location.lat() - sw.lat()) / (ne.lat() - sw.lat())) * height;
        
        // Create a path that represents the street direction based on viewport
        const heading = place.geometry.viewport ? 
          google.maps.geometry.spherical.computeHeading(
            place.geometry.viewport.getSouthWest(),
            place.geometry.viewport.getNorthEast()
          ) : 0;
        
        // Calculate end points for the street line based on heading
        const length = 200;
        const angle = (heading * Math.PI) / 180;
        const dx = Math.cos(angle) * length;
        const dy = Math.sin(angle) * length;
        
        return {
          path: `M ${x - dx/2} ${y - dy/2} L ${x + dx/2} ${y + dy/2}`,
          name: place.name
        };
      }));
      
      resolve(streets.filter((street): street is {path: string, name: string} => street !== null));
    });
  });
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
