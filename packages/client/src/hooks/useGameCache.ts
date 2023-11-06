import { useEffect, useRef, useState } from "react";
import { GetCurrentGameCommand, GetCurrentGameMessage, GetPlayersCommand, GetPlayersMessage, Message, Slapshot } from "./useSlapshot";
import { Game, Player } from "../types";
import useSound from 'use-sound';

export interface GameCache {
    players: Player[],
    currentGame?: Game,
    message?: {
        error: boolean,
        text: string,
    }
}

export function useGameCache(ss: Slapshot): GameCache {
    
    const [players, setPlayers] = useState<Player[]>([]);    
    const playersRef = useRef<Player[]>();
    playersRef.current = players;

    const [currentGame, setCurrentGame] = useState<Game>();    
    const currentGameRef = useRef<Game>();
    currentGameRef.current = currentGame;

    const [message, setMessage] = useState<{error: boolean, text: string}>(null);
    const messageRef = useRef(message);
    messageRef.current = message;

    const ssRef = useRef<Slapshot>();
    ssRef.current = ss;

    const [cheerSound, {stop: stopCheerSound}] = useSound('../../www/cheer.mp3', { id: "cheer"});
    const [buzzerSound, {stop: stopBuzzerSound}] = useSound('../../www/buzzer.wav', { id: "buzzer"});
    const [chargeSound, {stop: stopChargeSound}] = useSound('../../www/organcharge.mp3', {id: "charge"});
    const [notifySound, {stop: stopNotifySound}] = useSound('../../www/notification.wav', {id: "notify"});
    const [wahwahwahSound, {stop: stopWahWahWahSound}] = useSound('../../www/wahwahwah.mp3', {id: "wahwahwah"});
    const [whistleSound, {stop: stopWhistleSound}] = useSound('../../www/whistle.mp3', {id: "whistle"});
    const [errorSound, {stop: stopErrorSound}] = useSound('../../www/error.mp3', {id: "error"});
   
    useEffect(() => {
        const stopAllSounds = () => {
            stopCheerSound();
            stopChargeSound();
            stopNotifySound();
            stopBuzzerSound();
            stopWahWahWahSound();
            stopWhistleSound();
            stopErrorSound();
        }

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
                stopAllSounds();
                chargeSound();
            });

            ssRef.current.on<Game>("restartgame", (event) => {
                console.log("Restart game!");
                setCurrentGame(event.event.data);
                stopAllSounds();
                buzzerSound();
            });

            ssRef.current.on<Game>("startgame", (event) => {
                console.log("Start game!");
                const wasPaused = currentGameRef.current?.state === 'paused';
                setCurrentGame(event.event.data);
                
                stopAllSounds();
                if (wasPaused) {
                    whistleSound();
                } else {                    
                    buzzerSound();
                }
            });

            ssRef.current.on<Game>("gameover", (event) => {
                console.log("Game Over!");
                setCurrentGame(event.event.data);
                stopAllSounds();
                buzzerSound();
            });

            ssRef.current.on<Game>("1up", (event) => {
                console.log("Player Up!");
                setCurrentGame(event.event.data);
                stopAllSounds();
                notifySound();
            });

            ssRef.current.on("0up", (event) => {
                console.log("Unknown Player!");
                stopAllSounds();
                errorSound();
                setMessage({ error: true, text: "Unknown player. Please register and try again."});
            });

            ssRef.current.on<Game>("updategame", (event) => {
                console.log("Game Update!");
                setCurrentGame(event.event.data);
            });

            ssRef.current.on<Game>("abortgame", (event) => {
                console.log("Game Aborted!");
                setCurrentGame(event.event.data);
                stopAllSounds();
                wahwahwahSound();
            });

            ssRef.current.on<Game>("pausegame", (event) => {
                console.log("Game Paused!");
                setCurrentGame(event.event.data);
                stopAllSounds();
                whistleSound();
            });

            ssRef.current.on<Game>("score", (event) => {
                console.log("Score!");
                setCurrentGame(event.event.data);
                stopAllSounds();
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

            ssRef.current.on("clearplayers", (event) => {
                setPlayers([]);
            });

            ssRef.current.on<Player[]>("clearstats", (event) => {                
                setPlayers(event.event.data);
            });
        }        
    }, [
        ss.ready, 
        cheerSound, 
        buzzerSound, 
        chargeSound, 
        notifySound, 
        wahwahwahSound, 
        whistleSound, 
        errorSound,
        stopChargeSound, 
        stopBuzzerSound, 
        stopCheerSound, 
        stopNotifySound, 
        stopWahWahWahSound, 
        stopWhistleSound,
        stopErrorSound])

    return {
        players,
        currentGame,
        message
    }

}