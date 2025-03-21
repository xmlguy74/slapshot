import React, { useContext, useEffect, useState } from 'react';
import { AppSection, BodySection, BodyTitle, HeaderSection, StatusbarSection, TaskbarSection } from './App.styled';
import { DateTime, DateTimeMode } from './components/DateTime';
import { ToastContainer, toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import { Leaderboard } from './components/Leaderboard';
import { Player, PlayerMode } from './components/Player';
import { SlapshotContext } from './contexts/SlapshotContext';

import formatDuration from 'format-duration';
import { Game } from './types';
import { Goal } from './components/Goal';

export interface AppProps {
  refreshRate: number;
}

function getPlayerName(game: Game, mode: PlayerMode): string {
  switch (game.state) {
    case 'pending':
      return (mode === PlayerMode.Home ? game.homeName : game.visitorName) ?? "Tap In!"
    
    case 'complete':
    case 'active':
    case 'abort':
    case 'paused':
      return (mode === PlayerMode.Home ? game.homeName : game.visitorName) ?? (mode === PlayerMode.Home ? "Home" : "Visitor");
  }
}

function App(props: AppProps) {
  
  const [config] = useState<Configuration>(window.CONFIG);

  const { ss, currentGame, goal, message } = useContext(SlapshotContext);
    
  useEffect(() => {
    if (ss.ready) {
      toast.clearWaitingQueue();
      toast.dismiss();
      toast("Connected!", { type: 'success'});
    } else if (ss.ready === false) {
      toast("Not Connected! Attempting to restore.", { type: 'error', autoClose: false });
    }
  }, [ss.ready])  

  useEffect(() => {
    if (message) {
      // toast.clearWaitingQueue();
      // toast.dismiss();
      toast(message.text, { type: message.error ? 'error' : 'success', delay: 0 });
    }
  }, [message]);

  return (
    <AppSection className="App">

      <TaskbarSection className="Taskbar">
        <DateTime className="Time" mode={DateTimeMode.Time} style={{visibility: config.showTime ? 'visible' : 'hidden'}}></DateTime>
        <DateTime className="Date" mode={DateTimeMode.Date} style={{visibility: config.showDate ? 'visible' : 'hidden'}}></DateTime>
      </TaskbarSection>
      
      <HeaderSection className="Header">
      </HeaderSection>    

      <BodySection>        
        <Leaderboard></Leaderboard>
      </BodySection>
      
      <StatusbarSection className="Statusbar">
        { currentGame && <>
          <Player mode={PlayerMode.Home} className={currentGame.state === 'pending' && !currentGame.home && "PendingPlayer"} name={getPlayerName(currentGame, PlayerMode.Home)} score={currentGame.homeScore}></Player>
          
          { currentGame.state === 'pending' && <span className="PressStart">PRESS START</span> }
          
          { currentGame.state === 'active' && <span className="PlayClock" data-low={(currentGame?.timeRemaining ?? 0) < 15000 ? true : false}>{formatDuration(currentGame?.timeRemaining ?? 0) }</span> }
          
          { currentGame.state === 'paused' && 
          <div>
            <div className="PlayClock PlayClock--paused" data-low={(currentGame?.timeRemaining ?? 0) < 15000 ? true : false}>{formatDuration(currentGame?.timeRemaining ?? 0) }</div>
            TIMEOUT
          </div>
          }
          
          { currentGame.state === 'complete' && "GAME OVER" }
          
          { currentGame.state === 'abort' && "GAME CANCELED" }
        
          <Player mode={PlayerMode.Visitor} className={currentGame.state === 'pending' && !currentGame.visitor && "PendingPlayer"} name={getPlayerName(currentGame, PlayerMode.Visitor)} score={currentGame.visitorScore}></Player>
        
        </>}

        { !currentGame && <>
          SYSTEM OFF
        </>}
      </StatusbarSection>
      
      <ToastContainer 
        position="bottom-right" 
        autoClose={3000} 
        newestOnTop 
        closeButton={false}
        pauseOnFocusLoss={false} 
        limit={3}
        theme='colored' />

      <Goal text={currentGame?.state === 'active' && goal && "GOAL!"}/>
    
    </AppSection>
  );
}

export default App;
