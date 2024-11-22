import { Button } from '@/components/ui/button';
import { Pencil, X, Download } from 'lucide-react';

interface MapControlsProps {
  isDrawingMode: boolean;
  isExporting: boolean;
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  onExport: () => void;
}

const MapControls = ({
  isDrawingMode,
  isExporting,
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
        disabled={isExporting}
        className={`rounded-full relative overflow-hidden transition-all ${
          isExporting ? 'animate-pulse' : ''
        }`}
      >
        <span className={`flex items-center ${isExporting ? 'opacity-50' : ''}`}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting Design' : 'Export Design'}
        </span>
        {isExporting && (
          <span className="absolute inset-0 bg-primary/20 animate-[progress_2s_ease-in-out_infinite]" />
        )}
      </Button>
    </div>
  );
};

export default MapControls;