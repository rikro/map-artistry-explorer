import { useState, useCallback } from 'react';
import { GoogleMap, DrawingManager } from '@react-google-maps/api';
import { toast } from 'sonner';
import { polygonToSVGPath, downloadSVG } from '@/lib/map-utils';
import MapControls from './MapControls';

interface MapContainerProps {
  center: google.maps.LatLngLiteral;
  onMapLoad: (map: google.maps.Map) => void;
}

const MapContainer = ({ center, onMapLoad }: MapContainerProps) => {
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<google.maps.Polygon | null>(null);

  const handleDrawingComplete = useCallback((polygon: google.maps.Polygon) => {
    setCurrentPolygon(polygon);
    setIsDrawingMode(false);
    toast.success('Area selected! You can now export your design.');
  }, []);

  const startDrawing = useCallback(() => {
    setIsDrawingMode(true);
    drawingManager?.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  }, [drawingManager]);

  const stopDrawing = useCallback(() => {
    setIsDrawingMode(false);
    drawingManager?.setDrawingMode(null);
  }, [drawingManager]);

  const exportSVG = useCallback(() => {
    if (!currentPolygon) {
      toast.error('Please define an area first');
      return;
    }

    const svgPath = polygonToSVGPath(currentPolygon);
    const svgContent = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <path d="${svgPath}" fill="none" stroke="black" stroke-width="2"/>
      </svg>
    `;
    
    downloadSVG(svgContent, 'map-design.svg');
    toast.success('Design exported successfully!');
  }, [currentPolygon]);

  return (
    <div className="relative">
      <GoogleMap
        mapContainerClassName="map-container"
        center={center}
        zoom={15}
        options={{
          styles: [],
          disableDefaultUI: true,
          zoomControl: true,
          scrollwheel: true,
        }}
        onLoad={onMapLoad}
      >
        <DrawingManager
          onLoad={setDrawingManager}
          onPolygonComplete={handleDrawingComplete}
          options={{
            drawingMode: isDrawingMode ? google.maps.drawing.OverlayType.POLYGON : null,
            drawingControl: false,
            polygonOptions: {
              fillColor: '#000000',
              fillOpacity: 0.2,
              strokeWeight: 2,
              strokeColor: '#000000',
              editable: true,
              draggable: true,
            },
          }}
        />
      </GoogleMap>

      <MapControls
        isDrawingMode={isDrawingMode}
        onStartDrawing={startDrawing}
        onStopDrawing={stopDrawing}
        onExport={exportSVG}
      />
    </div>
  );
};

export default MapContainer;