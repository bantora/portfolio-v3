import { useState, useCallback } from 'react';

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';
export type ShipType = 'carrier' | 'battleship' | 'destroyer' | 'submarine' | 'patrol';

export interface Ship {
  type: ShipType;
  length: number;
  positions: [number, number][];
  hits: number;
}

export const SHIP_CONFIG: Record<ShipType, number> = {
  carrier: 5,
  battleship: 4,
  destroyer: 3,
  submarine: 3,
  patrol: 2,
};

const GRID_SIZE = 10;

export const createEmptyGrid = () => 
  Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty' as CellState));

export function useBattleship() {
  const [myGrid, setMyGrid] = useState<CellState[][]>(createEmptyGrid());
  const [myShips, setMyShips] = useState<Ship[]>([]);
  const [opponentGrid, setOpponentGrid] = useState<CellState[][]>(createEmptyGrid());
  const [isMyTurn, setIsMyTurn] = useState(false);

  const canPlaceShip = useCallback((type: ShipType, x: number, y: number, horizontal: boolean, currentShips: Ship[]) => {
    const length = SHIP_CONFIG[type];
    for (let i = 0; i < length; i++) {
      const cx = horizontal ? x + i : x;
      const cy = horizontal ? y : y + i;

      if (cx >= GRID_SIZE || cy >= GRID_SIZE) return false;
      
      // Check for overlap
      if (currentShips.some(ship => ship.positions.some(pos => pos[0] === cx && pos[1] === cy))) {
        return false;
      }
    }
    return true;
  }, []);

  const placeShip = useCallback((type: ShipType, x: number, y: number, horizontal: boolean) => {
    setMyShips(prev => {
      if (prev.some(s => s.type === type)) return prev; // Already placed
      if (!canPlaceShip(type, x, y, horizontal, prev)) return prev;

      const length = SHIP_CONFIG[type];
      const positions: [number, number][] = [];
      for (let i = 0; i < length; i++) {
        positions.push([horizontal ? x + i : x, horizontal ? y : y + i]);
      }

      const newShip: Ship = { type, length, positions, hits: 0 };
      const newGrid = [...myGrid.map(row => [...row])];
      positions.forEach(([px, py]) => {
        newGrid[py][px] = 'ship';
      });
      setMyGrid(newGrid);

      return [...prev, newShip];
    });
  }, [myGrid, canPlaceShip]);

  const handleIncomingAttack = useCallback((x: number, y: number) => {
    let result: 'hit' | 'miss' | 'sunk' = 'miss';
    let sunkShipType: ShipType | undefined;

    const cell = myGrid[y][x];
    if (cell === 'ship') {
      result = 'hit';
    } else if (cell === 'empty') {
      result = 'miss';
    }

    setMyGrid(prev => {
      const newGrid = [...prev.map(row => [...row])];
      if (cell === 'ship') {
        newGrid[y][x] = 'hit';
      } else if (cell === 'empty') {
        newGrid[y][x] = 'miss';
      }
      return newGrid;
    });

    if (result === 'hit') {

      setMyShips(prev => {
        const newShips = prev.map(ship => {
          if (ship.positions.some(pos => pos[0] === x && pos[1] === y)) {
            const newHits = ship.hits + 1;
            if (newHits === ship.length) {
              result = 'sunk';
              sunkShipType = ship.type;
            }
            return { ...ship, hits: newHits };
          }
          return ship;
        });
        return newShips;
      });
    }

    return { result, sunkShipType };
  }, []);

  const recordAttackResult = useCallback((x: number, y: number, result: 'hit' | 'miss' | 'sunk') => {
    setOpponentGrid(prev => {
      const newGrid = [...prev.map(row => [...row])];
      newGrid[y][x] = result === 'miss' ? 'miss' : 'hit';
      // Note: 'sunk' isn't explicitly a cell state in opponent grid usually, 
      // but we could track it. For now, hit is enough.
      return newGrid;
    });
  }, []);

  return {
    myGrid,
    myShips,
    opponentGrid,
    isMyTurn,
    setIsMyTurn,
    placeShip,
    handleIncomingAttack,
    recordAttackResult,
    reset: () => {
      setMyGrid(createEmptyGrid());
      setMyShips([]);
      setOpponentGrid(createEmptyGrid());
      setIsMyTurn(false);
    }
  };
}
