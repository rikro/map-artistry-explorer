import { useState, useCallback } from 'react';
import { LoadScript } from '@react-google-maps/api';
import { toast } from 'sonner';
import LocationSearch from '@/components/LocationSearch';
import MapContainer from '@/components/MapContainer';
import { libraries, GOOGLE_MAPS_API_KEY } from '@/lib/map-config';

const Index = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const handleLocationFound = useCallback((location: google.maps.LatLngLiteral) => {
    setCenter(location);
    map?.panTo(location);
    toast.success('Location found!');
  }, [map]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-red-600">Configuration Error</h1>
          <p>Google Maps API key is not configured.</p>
        </div>
      </div>
    );
  }

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

        <LoadScript
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          libraries={libraries}
        >
          <MapContainer
            center={center}
            onMapLoad={onMapLoad}
          />
        </LoadScript>
      </div>
    </div>
  );
};

export default Index;