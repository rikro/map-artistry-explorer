import { useState, useCallback } from 'react';
import { GoogleMap, LoadScript, DrawingManager } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import LocationSearch from '@/components/LocationSearch';
import MapControls from '@/components/MapControls';
import { libraries } from '@/lib/map-config';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDGzMpB3j0U5b7Mc87-1lNI-f4cQZtszek';

const Index = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const handleLocationFound = useCallback((location: google.maps.LatLngLiteral) => {
    setCenter(location);
    map?.panTo(location);
    toast.success('Location found!');
  }, [map]);

  const handleDrawingComplete = useCallback((polygon: google.maps.Polygon) => {
    // Handle the completed polygon drawing
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
    // Implementation for SVG export will go here
    toast.success('Exporting your design...');
  }, []);

  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Map Art Creator</h1>
          <p className="text-muted-foreground">
            Transform your neighborhood into beautiful artwork
          </p>
        </div>

        <LocationSearch onLocationFound={handleLocationFound} />

        <div className="relative">
          <LoadScript
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
            libraries={libraries}
          >
            <GoogleMap
              mapContainerClassName="map-container"
              center={center}
              zoom={15}
              options={{
                styles: [], // Add custom map styles here
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
          </LoadScript>

          <MapControls
            isDrawingMode={isDrawingMode}
            onStartDrawing={startDrawing}
            onStopDrawing={stopDrawing}
            onExport={exportSVG}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;