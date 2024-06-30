import React, { useState } from 'react';

function Board() {
  //const { address, isConnecting, isDisconnected } = useAccount();
  const gridSize = 6; // Size of the grid (6x6)
  const initialGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(false)); // Initial state of the grid

  const [grid, setGrid] = useState(initialGrid);

  const handleClick = (row, col) => {
    const newGrid = grid.map((r, rowIndex) =>
      r.map((cell, colIndex) => (rowIndex === row && colIndex === col ? !cell : cell))
    );
    setGrid(newGrid);
  };
  
  return (
    <div className="MainView">
      <div className="grid">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                className={`tile ${cell ? 'active' : ''}`}
                onClick={() => handleClick(rowIndex, colIndex)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Board;
