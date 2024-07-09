import React, { useState } from 'react';

function Board() {
  const gridSize = 32; // Size of the grid (32x32)
  const initialGrid = Array(gridSize).fill().map(() => 
    Array(gridSize).fill().map(() => Math.random() < 0.5) // Randomly set true or false
  );

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
                className={`tile ${cell ? 'green' : 'blue'}`} // Use 'green' or 'blue' class
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
