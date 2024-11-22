import { useState, useCallback } from 'react';
import { GoogleMap, DrawingManager } from '@react-google-maps/api';
import { toast } from 'sonner';
import { polygonToSVGPath, downloadSVG, getStreetsInPolygon } from '@/lib/map-utils';
import MapControls from './MapControls';

interface MapContainerProps {
  center: google.maps.LatLngLiteral;
  onMapLoad: (map: google.maps.Map) => void;
}

const MapContainer = ({ center, onMapLoad }: MapContainerProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<google.maps.Polygon | null>(null);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    onMapLoad(map);
  }, [onMapLoad]);

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

  const exportSVG = useCallback(async () => {
    if (!currentPolygon || !map) {
      toast.error('Please define an area first');
      return;
    }

    setIsExporting(true);
    try {
      const svgPath = polygonToSVGPath(currentPolygon);
      const streets = await getStreetsInPolygon(currentPolygon, map);
      await downloadSVG(svgPath, 'map-design.svg', streets);
      toast.success('Design exported successfully!');
    } catch (error) {
      toast.error('Failed to export design');
    } finally {
      setIsExporting(false);
    }
  }, [currentPolygon, map]);

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
        onLoad={handleMapLoad}
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
        isExporting={isExporting}
        onStartDrawing={startDrawing}
        onStopDrawing={stopDrawing}
        onExport={exportSVG}
      />
    </div>
  );
};

export default MapContainer;