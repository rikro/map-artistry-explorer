import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Crosshair } from 'lucide-react';
import { toast } from 'sonner';

interface LocationSearchProps {
  onLocationFound: (location: google.maps.LatLngLiteral) => void;
}

const LocationSearch = ({ onLocationFound }: LocationSearchProps) => {
  const [address, setAddress] = useState('');

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.promise(
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            onLocationFound(location);
            resolve(location);
          },
          (error) => {
            reject(error);
          }
        );
      }),
      {
        loading: 'Getting your location...',
        success: 'Location found!',
        error: 'Could not get your location',
      }
    );
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement geocoding here
    toast.info('Address search coming soon!');
  };

  return (
    <form onSubmit={handleAddressSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
        <Input
          type="text"
          placeholder="Enter an address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button type="submit" variant="secondary">
        Search
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleGeolocation}
        className="location-button"
      >
        <Crosshair className="h-5 w-5" />
      </Button>
    </form>
  );
};

export default LocationSearch;