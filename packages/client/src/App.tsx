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
      return (mode === PlayerMode.Home ? game.homeName : game.visitorName) ?? (mode === PlayerMode.Home ? "Home" : "Away");
  }
}

function App(props: AppProps) {
  
  const [config] = useState<Configuration>(window.CONFIG);

  //const { ha, states } = useContext(HomeAssistantContext);
  const { ss, currentGame } = useContext(SlapshotContext);
    
  useEffect(() => {
    if (ss.ready) {
      toast.clearWaitingQueue();
      toast.dismiss();
      toast("Connected!", { type: 'success', delay: 1000 });
    } else if (ss.ready === false) {
      toast("Not Connected! Attempting to restore.", { type: 'error', autoClose: false });
    }
  }, [ss.ready])  

  return (
    <AppSection className="App">
      <TaskbarSection className="Taskbar">
        <DateTime className="Time" mode={DateTimeMode.Time} style={{visibility: config.showTime ? 'visible' : 'hidden'}}></DateTime>
        <DateTime className="Date" mode={DateTimeMode.Date} style={{visibility: config.showDate ? 'visible' : 'hidden'}}></DateTime>
      </TaskbarSection>
      
      <HeaderSection className="Header">
      </HeaderSection>    

      <BodySection>        
        <BodyTitle className="Title">Leaderboard</BodyTitle>
        <Leaderboard></Leaderboard>
      </BodySection>
      
      <StatusbarSection className="Statusbar">
        { currentGame && <>
          <Player mode={PlayerMode.Home} className={currentGame.state === 'pending' && !currentGame.home && "PendingPlayer"} name={getPlayerName(currentGame, PlayerMode.Home)} score={currentGame.homeScore}></Player>
          
          { currentGame.state === 'pending' && <span className="PressStart">PRESS START</span> }
          { currentGame.state === 'active' && <span className="PlayClock">{formatDuration(currentGame?.timeRemaining ?? 0) }</span> }
          { currentGame.state === 'complete' && "GAME OVER" }
          { currentGame.state === 'abort' && "GAME CANCELED" }
        
          <Player mode={PlayerMode.Visitor} className={currentGame.state === 'pending' && !currentGame.visitor && "PendingPlayer"} name={getPlayerName(currentGame, PlayerMode.Visitor)} score={currentGame.visitorScore}></Player>
        
        </>}

        { !currentGame && <>
          <Player mode={PlayerMode.Home} name="" score={0}></Player>
          GAME OVER
          <Player mode={PlayerMode.Visitor} name="" score={0}></Player>        
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
    
    </AppSection>
  );
}

export default App;
