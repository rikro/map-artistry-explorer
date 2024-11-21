import { Button } from '@/components/ui/button';
import { Pencil, X, Download } from 'lucide-react';

interface MapControlsProps {
  isDrawingMode: boolean;
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  onExport: () => void;
}

const MapControls = ({
  isDrawingMode,
  onStartDrawing,
  onStopDrawing,
  onExport,
}: MapControlsProps) => {
  return (
    <div className="controls-container">
      {!isDrawingMode ? (
        <Button
          variant="outline"
          size="icon"
          onClick={onStartDrawing}
          className="rounded-full"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={onStopDrawing}
          className="rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="default"
        onClick={onExport}
        className="rounded-full"
      >
        <Download className="h-4 w-4 mr-2" />
        Export Design
      </Button>
    </div>
  );
};

export default MapControls;