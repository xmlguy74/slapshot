import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import App from './App';
import { SlapshotProvider } from './contexts/SlapshotContext';

const urlParams = new URLSearchParams(window.location.search);
const refreshRate = ((urlParams.get('refresh') ?? 30000) as number);

const render = () => {  
  ReactDOM.render(
    <React.StrictMode>
      <SlapshotProvider hostname={window.CONFIG?.slapshot}>    
        <App refreshRate={refreshRate} />
      </SlapshotProvider>
    </React.StrictMode>,
    document.getElementById('root'));
};

//load the theme
if (window.CONFIG?.theme) {
  import(`./themes/${window.CONFIG.theme}.scss`).then(() => {
    render();
  })
} else {
  render();
}
