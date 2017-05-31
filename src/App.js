import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { Provider } from 'react-redux';
import Tester from "./Components/Tester"
import CodeEditor from "./Components/CodeEditor"
import DevTools from './Containers/DevTools';
import configureStore from './store/configureStore';
const store = configureStore();
let Contents = (props) => {
  return <div>  <Tester />
    <CodeEditor className="gdtCode" />
    <DevTools />
  </div>
}
class App extends Component {

  render() {
    console.log("XSSX")
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome me </h2>
          <Provider store={store}>
            <Contents/>
          </Provider>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}



export default App;

