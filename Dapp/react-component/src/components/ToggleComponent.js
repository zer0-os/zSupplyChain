import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

function ToggleComponent() {
  const dispatch = useDispatch();
  const isToggled = useSelector((state) => state.toggledState);

  const handleToggle = () => {
    dispatch({ type: 'TOGGLE_STATE' });
  };

  return (
    <div>
      <p>Current state: {isToggled ? 'On' : 'Off'}</p>
    </div>
  );
}

export default ToggleComponent;