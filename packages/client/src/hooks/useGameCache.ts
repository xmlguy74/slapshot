import { useEffect, useRef, useState } from "react";
import { GetCurrentGameCommand, GetCurrentGameMessage, GetPlayersCommand, GetPlayersMessage, Message, Slapshot } from "./useSlapshot";
import { Game, Player } from "../types";
import useSound from 'use-sound';

export interface GameCache {
    players: Player[],
    currentGame?: Game,
}

export function useGameCache(ss: Slapshot): GameCache {
    
    const [players, setPlayers] = useState<Player[]>([]);    
    const playersRef = useRef<Player[]>();
    playersRef.current = players;

    const [currentGame, setCurrentGame] = useState<Game>();    
    const currentGameRef = useRef<Game>();
    currentGameRef.current = currentGame;

    const ssRef = useRef<Slapshot>();
    ssRef.current = ss;

    const [cheerSound] = useSound('../../www/cheer.mp3');
    const [buzzerSound] = useSound('../../www/buzzer.wav');
    const [chargeSound] = useSound('../../www/organcharge.mp3');
    const [notifySound] = useSound('../../www/notification.wav');
    const [wahwahwahSound] = useSound('../../www/wahwahwah.mp3');
    const [whistleSound] = useSound('../../www/whistle.mp3');
   
    useEffect(() => {
        if (ss.ready) {
            ssRef.current.send(new GetPlayersCommand(), (msg: Message) => {
                const resp = msg as GetPlayersMessage;
                if (resp.success) {
                    console.log('Initialized player cache.');
                    setPlayers(resp.result);
                }
            });

            ssRef.current.send(new GetCurrentGameCommand(), (msg: Message) => {
                const resp = msg as GetCurrentGameMessage;
                if (resp.success) {
                    console.log('Initialized game cache.');
                    setCurrentGame(resp.result);
                }
            });

            ssRef.current.on<Game>("newgame", (event) => {
                console.log("New game!");
                setCurrentGame(event.event.data);
                chargeSound();
            });

            ssRef.current.on<Game>("restartgame", (event) => {
                console.log("Restart game!");
                setCurrentGame(event.event.data);
                buzzerSound();
            });

            ssRef.current.on<Game>("startgame", (event) => {
                console.log("Start game!");
                const wasPaused = currentGameRef.current?.state === 'paused';
                setCurrentGame(event.event.data);
                
                if (wasPaused) {
                    whistleSound();
                } else {                    
                    buzzerSound();
                }
            });

            ssRef.current.on<Game>("gameover", (event) => {
                console.log("Game Over!");
                setCurrentGame(event.event.data);
                buzzerSound();
            });

            ssRef.current.on<Game>("1up", (event) => {
                console.log("Player Up!");
                setCurrentGame(event.event.data);
                notifySound();
            });

            ssRef.current.on<Game>("updategame", (event) => {
                console.log("Game Update!");
                setCurrentGame(event.event.data);
            });

            ssRef.current.on<Game>("abortgame", (event) => {
                console.log("Game Aborted!");
                setCurrentGame(event.event.data);
                wahwahwahSound();
            });

            ssRef.current.on<Game>("pausegame", (event) => {
                console.log("Game Paused!");
                setCurrentGame(event.event.data);
                whistleSound();
            });

            ssRef.current.on<Game>("score", (event) => {
                console.log("Score!");
                setCurrentGame(event.event.data);
                cheerSound();
            });

            ssRef.current.on<Player>("stats", (event) => {
                console.log("Stats!");
                setPlayers([...playersRef.current.filter(p => p.id !== event.event.data.id), event.event.data]);
            });

            ssRef.current.on<Player>("newplayer", (event) => {
                console.log("New Player!");
                setPlayers([...playersRef.current.filter(p => p.id !== event.event.data.id), event.event.data]);
            });

        }        
    }, [ss.ready, cheerSound, buzzerSound, chargeSound, notifySound, wahwahwahSound, whistleSound])

    return {
        players,
        currentGame
    }

}