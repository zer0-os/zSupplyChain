import { configureStore } from '@reduxjs/toolkit'

const initialState = {
  toggledState: false, // Initial state: false
};

const toggleReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'TOGGLE_STATE':
      return { ...state, toggledState: !state.toggledState };
    default:
      return state;
  }
};

export const store = configureStore({
  reducer: {
    toggleReducer: toggleReducer
  }
})

export default store;