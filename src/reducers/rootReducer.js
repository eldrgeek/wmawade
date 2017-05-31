import { combineReducers } from 'redux';

const commandState = (state = [], action) => {
    switch (action.type) {
        case "test":
            console.log("newer reduction" , action.data, state.length)
            return [...state, action.data]
        default:
            return state
    }
    
}


const rootReducer = combineReducers({
    commandState
});

export default rootReducer;
