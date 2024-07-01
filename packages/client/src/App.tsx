import React, { useContext, useEffect, useState } from 'react';
import { AppSection, BodySection, HeaderSection, StatusbarSection, TaskbarSection } from './App.styled';
import { DateTime, DateTimeMode } from './components/DateTime';
import { ToastContainer, toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import { Leaderboard } from './components/Leaderboard';
import { Player, PlayerMode } from './components/Player';
import { SlapshotContext } from './contexts/SlapshotContext';

import formatDuration from 'format-duration';
import { Game, STATE_GAMEOVER, STATE_GOAL, STATE_OFF, STATE_PLAYING, STATE_TAPIN, STATE_TIMEOUT } from './types';
import { Goal } from './components/Goal';

export interface AppProps {
  refreshRate: number;
}

function getPlayerName(game: Game, mode: PlayerMode): string {
  switch (game.state) {
    case STATE_TAPIN:
      return (mode === PlayerMode.Home ? formatName(game.home.name) : formatName(game.visitor.name)) ?? "Tap In!"
    
    case STATE_GAMEOVER:
    case STATE_PLAYING:
    case STATE_GOAL:
    case STATE_TIMEOUT:
      return (mode === PlayerMode.Home ? formatName(game.home.name) : formatName(game.visitor.name)) ?? (mode === PlayerMode.Home ? "Home" : "Visitor");
  }
}

function formatName(name: string): string {
  if (name && name.length > 0) {
    return name;
  }
  return null;
}

function formatTime(seconds: number): string {
  return formatDuration(seconds * 1000);
}

function App(props: AppProps) {
  
  const [config] = useState<Configuration>(window.CONFIG);

  const { currentGame, goal, message } = useContext(SlapshotContext);
    
  useEffect(() => {
    if (message) {
      if (message.id) {
        toast.dismiss(message.id);
      }

      toast(message.text, { 
        toastId: message.id,
        type: message.error ? 'error' : 'success', 
        delay: 0, 
        autoClose: message.sticky ? false : 3000
      });
    
    }
  }, [message]);

  return (
    <AppSection className="App">

      <TaskbarSection className="Taskbar">
        <DateTime className="Time" mode={DateTimeMode.Time} style={{visibility: config.showTime ? 'visible' : 'hidden'}}></DateTime>
        <div className="Tray">
          { currentGame.muteSound && <span className="material-icons">volume_off</span> } 
        </div>
        <DateTime className="Date" mode={DateTimeMode.Date} style={{visibility: config.showDate ? 'visible' : 'hidden'}}></DateTime>
      </TaskbarSection>
      
      <HeaderSection className="Header">
      </HeaderSection>    

      <BodySection>        
        <Leaderboard></Leaderboard>
      </BodySection>
      
      <StatusbarSection className="Statusbar">
        { currentGame.state !== STATE_OFF && <>
          <Player mode={PlayerMode.Home} className={currentGame.state === STATE_TAPIN && !currentGame.home.name && "PendingPlayer"} name={getPlayerName(currentGame, PlayerMode.Home)} score={currentGame.home.score}></Player>
          
          { currentGame.state === STATE_TAPIN && 
          <div>
            <div className="PlayClock PlayClock--paused">{formatTime(currentGame?.timeRemaining ?? 0) }</div>
            PRESS START
          </div>
          }

          { (currentGame.state === STATE_PLAYING || currentGame.state === STATE_GOAL) && <span className="PlayClock" data-low={(currentGame?.timeRemaining ?? 0) < 15 ? true : false}>{formatTime(currentGame?.timeRemaining ?? 0) }</span> }
          
          { currentGame.state === STATE_TIMEOUT && 
          <div>
            <div className="PlayClock PlayClock--paused" data-low={(currentGame?.timeRemaining ?? 0) < 15000 ? true : false}>{formatTime(currentGame?.timeRemaining ?? 0) }</div>
            TIMEOUT
          </div>
          }
          
          { currentGame.state === STATE_GAMEOVER && "GAME OVER" }
          
          {/* { currentGame.state === 'abort' && "GAME CANCELED" } */}
        
          <Player mode={PlayerMode.Visitor} className={currentGame.state === STATE_TAPIN && !currentGame.visitor.name && "PendingPlayer"} name={getPlayerName(currentGame, PlayerMode.Visitor)} score={currentGame.visitor.score}></Player>
        
        </>}

        { currentGame.state === STATE_OFF && <>
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

      <Goal text={goal && "GOAL!"}/>
    
    </AppSection>
  );
}

export default App;
