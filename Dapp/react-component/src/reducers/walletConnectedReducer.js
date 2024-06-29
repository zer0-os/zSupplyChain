const initialState = false;

const walletConnectedReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'TOGGLE_STATE':
      return !state; // Invert the current state
    default:
      return state; // Return unchanged state for other actions
  }
};

export default walletConnectedReducer;
