import { createContext, useContext, useState } from 'react';

import { type Cell, type CellOutput } from '../types/builder';
import { captureCellsAdded, captureCellsDeleted } from '../utils/builderModeUtils';

type AddCellProperties = {
  code?: string;
  output?: CellOutput;
  afterIndex?: number;
  shouldEmitIndividualTelemetry?: boolean;
};

type CellsContext = {
  cells: Cell[];
  cellsOutputHistory: CellOutput;
  addCell: (params: AddCellProperties) => void;
  addCells: (code: string[], outputs?: CellOutput[]) => void;
  updateCell: (id: string, generateNewCell: (oldCell: Cell) => Cell) => void;
  updateCellOutput: (id: string, newOutput: string) => void;
  deleteCell: (id: string) => void;
  selectCell: (id?: string) => void;
  deleteAllCells: () => void;
  moveCell: (oldIndex: number, newIndex: number) => void;
  selectedCellIndex?: number;
  clearTrigger: number;
};

const CellsContext = createContext<CellsContext | undefined>(undefined);

function createCell(code = '', output: CellOutput = []): Cell {
  return {
    id: `cell-${window.crypto.randomUUID()}`,
    code,
    output,
    status: 'idle',
    hasNovaStart: code.includes('nova.start()'),
  };
}

const CellProvider = ({ children }: { children: React.ReactNode }) => {
  const [cells, setCells] = useState<Cell[]>([]);
  const [cellsOutputHistory, setCellsOutputHistory] = useState<CellOutput>([]);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | undefined>(undefined);
  const [clearTrigger, setClearTrigger] = useState(0);

  const clearOutputs = () => {
    setClearTrigger((prev) => prev + 1);
  };

  const selectCell = (id?: string) => {
    setSelectedCellIndex(cells.findIndex((cell) => id === cell.id));
  };

  /**
   * Adds a new cell to the list of cells.
   * @param code The code content of the new cell.
   * @param output The output content of the new cell.
   * @param afterIndex (Optional) The index at which to insert the new cell. If not provided, the cell is added at the end.
   * @param shouldEmitIndividualTelemetry (Optional). Defaults to true. Emits individual telemetry that a cell has been added
   */
  const addCell = ({
    code = '',
    output = [],
    afterIndex,
    shouldEmitIndividualTelemetry = true,
  }: AddCellProperties) => {
    const newCell = createCell(code, output);

    setCells((prevCells) => {
      const newCells = [...prevCells];
      afterIndex !== undefined ? newCells.splice(afterIndex, 0, newCell) : newCells.push(newCell);
      setSelectedCellIndex(afterIndex ?? newCells.length - 1);
      return newCells;
    });

    if (shouldEmitIndividualTelemetry) {
      captureCellsAdded({ count: 1 });
    }
  };

  /**
   * Bulk adds multiple cells to the list of cells.
   * @param code Array of code contents for the new cells.
   * @param output (Optional) Array of output contents for the new cells.
   */
  const addCells = (code: string[] = [], outputs: CellOutput[] = []) => {
    if (code.length === 0) return;

    code.map((c, index) => {
      addCell({ code: c, output: outputs.at(index) ?? [], shouldEmitIndividualTelemetry: false });
    });

    captureCellsAdded({ count: code.length });
  };

  const deleteCell = (cellId: string) => {
    if (selectedCellIndex !== undefined && cells[selectedCellIndex]?.id === cellId) {
      setSelectedCellIndex(undefined);
    }
    setCells((prev) => prev.filter((cell) => cell.id !== cellId));

    captureCellsDeleted({ count: 1 });
  };

  const deleteAllCells = () => {
    setCells((prevCells) => {
      if (prevCells.length > 0) {
        // Emit the cell count using prevCells (using cells could lead to a race due to the setCells)
        captureCellsDeleted({ count: prevCells.length });
        clearOutputs();
      }
      return [];
    });
    setCellsOutputHistory([]);
  };

  const updateCellOutput = (id: string, newOutput: string) => {
    updateCell(id, (oldCell: Cell) => {
      oldCell.output.push(newOutput);
      return oldCell;
    });
    setCellsOutputHistory((oldHistory) => {
      const newHistory = oldHistory;
      newHistory.push(newOutput);
      return newHistory;
    });
  };

  const updateCell = (id: string, generateNewCell: (oldCell: Cell) => Cell) => {
    setCells((prev) =>
      prev.map((cell) => {
        if (cell.id === id) {
          const updated = generateNewCell(cell);
          return updated;
        }
        return cell;
      })
    );
  };

  const moveCell = (oldIndex: number, newIndex: number) => {
    setCells((prev) => {
      const newCells = [...prev];
      const [movedCell] = newCells.splice(oldIndex, 1);
      movedCell && newCells.splice(newIndex, 0, movedCell);
      setSelectedCellIndex(newIndex);
      return newCells;
    });
  };

  const value = {
    cells,
    selectedCellIndex,
    cellsOutputHistory,
    selectCell,
    addCell,
    addCells,
    updateCell,
    updateCellOutput,
    deleteCell,
    deleteAllCells,
    moveCell,
    clearTrigger,
  };

  return <CellsContext.Provider value={value}>{children}</CellsContext.Provider>;
};

const useCells = () => {
  const context = useContext(CellsContext);
  if (context === undefined) {
    throw new Error('useCells must be used within a CellProvider');
  }
  return context;
};

export { CellProvider, useCells };
