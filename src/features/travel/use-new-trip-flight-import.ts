import { useState } from 'react';

import { appPrompt } from '@/components/primitives';
import {
    importFlightConfirmation,
    type FlightConfirmationImportSource,
    type ImportedFlightConfirmation,
} from '@/features/travel/flight-confirmation-import';
import { newTripDraftFromFlightConfirmation } from '@/features/travel/new-trip-flight-draft';
import type { TravelPlanMode } from '@/features/travel/types';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

interface DraftSetters {
  setMode: (value: TravelPlanMode) => void;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setError: (value: string | undefined) => void;
}

export function useNewTripFlightImport(setters: DraftSetters) {
  const theme = useTheme();
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string>();
  const [pendingImport, setPendingImport] = useState<
    ImportedFlightConfirmation | undefined
  >();

  const runImport = async (source: FlightConfirmationImportSource) => {
    if (importing) return;
    setters.setError(undefined);
    setImporting(true);
    try {
      const imported = await importFlightConfirmation(undefined, source);
      if (!imported) return;
      const draft = newTripDraftFromFlightConfirmation(imported);
      setters.setMode('flight');
      if (draft.origin) setters.setOrigin(draft.origin);
      if (draft.destination) setters.setDestination(draft.destination);
      if (draft.startDate) setters.setStartDate(draft.startDate);
      if (draft.endDate) setters.setEndDate(draft.endDate);
      setFileName(imported.fileName);
      setPendingImport(imported);
    } catch (error) {
      setters.setError(
        error instanceof Error
          ? error.message
          : 'Couldn’t read this itinerary. Try another file or enter the details manually.',
      );
    } finally {
      setImporting(false);
    }
  };

  const importItinerary = () => {
    appPrompt.alert(
      'Import Flight Itinerary',
      'Choose screenshots from Photos, or select a PDF, text file, or saved email from Files.',
      [
        {
          text: 'Choose Screenshots',
          hideIcon: true,
          testID: AgentUiIds.travel.newTrip.importScreenshots,
          onPress: () => void runImport('screenshots'),
        },
        {
          text: 'Choose File or Email',
          hideIcon: true,
          testID: AgentUiIds.travel.newTrip.importFile,
          onPress: () => void runImport('document'),
        },
      ],
      { cancelable: true, theme },
    );
  };

  const clearPendingImport = () => {
    setFileName(undefined);
    setPendingImport(undefined);
  };

  return {
    fileName,
    importing,
    pendingImport,
    importItinerary,
    clearPendingImport,
  };
}
