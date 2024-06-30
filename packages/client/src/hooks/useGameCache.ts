import { useEffect, useRef, useState } from "react";
import { GetCurrentGameCommand, GetCurrentGameMessage, GetPlayersCommand, GetPlayersMessage, Message, Slapshot } from "./useSlapshot";
import { DefaultGame, Game, Notify, Player, STATE_TAPIN, STATE_TIMEOUT } from "../types";
import useSound from 'use-sound';
import Howler from 'howler';

export interface GameCache {
    players: Player[],
    currentGame: Game,
    goal: boolean,
    message?: {
        error: boolean,
        text: string,
    }
}

export function useGameCache(ss: Slapshot): GameCache {
    
    const [init, setInit] = useState<boolean>(false);
    const initRef = useRef<boolean>();
    initRef.current = init;

    const [players, setPlayers] = useState<Player[]>([]);    
    const playersRef = useRef<Player[]>();
    playersRef.current = players;

    const [currentGame, setCurrentGame] = useState<Game>(DefaultGame);    
    const currentGameRef = useRef<Game>();
    currentGameRef.current = currentGame;

    const [goal, setGoal] = useState<boolean>(false);
    const goalRef = useRef(goal);
    goalRef.current = goal;

    const [message, setMessage] = useState<{error: boolean, text: string}>(null);
    const messageRef = useRef(message);
    messageRef.current = message;

    const[audio, setAudio] = useState<Function>(null);
    const audioRef = useRef<Function>();
    audioRef.current = audio;    

    const ssRef = useRef<Slapshot>();
    ssRef.current = ss;

    const [cheerSound, {stop: stopCheerSound}] = useSound('../../www/cheer.mp3', { id: "cheer"});
    const [buzzerSound, {stop: stopBuzzerSound}] = useSound('../../www/buzzer.wav', { id: "buzzer"});
    const [chargeSound, {stop: stopChargeSound}] = useSound('../../www/organcharge.mp3', {id: "charge"});
    const [notifySound, {stop: stopNotifySound}] = useSound('../../www/notification.wav', {id: "notify"});
    const [wahwahwahSound, {stop: stopWahWahWahSound}] = useSound('../../www/wahwahwah.mp3', {id: "wahwahwah"});
    const [whistleSound, {stop: stopWhistleSound}] = useSound('../../www/whistle.mp3', {id: "whistle"});
    const [errorSound, {stop: stopErrorSound}] = useSound('../../www/error.mp3', {id: "error"});
    const [min5Sound, {stop: stopMin5Sound}] = useSound('../../www/5minutegame.wav', {id: "min5"});
    const [min10Sound, {stop: stopMin10Sound}] = useSound('../../www/10minutegame.wav', {id: "min10"});
    const [min15Sound, {stop: stopMin15Sound}] = useSound('../../www/15minutegame.wav', {id: "min15"});
   
    useEffect(() => {
        const playSound = (sound: Function, stopSound: Function) => {
            if (audioRef.current) {
                audioRef.current();
            }
            setAudio(stopSound);
            if (sound) {
                sound();
            }
        };

        const stopSound = () => {
            playSound(null, null);
        };

        if (ss.ready) {
            
            if (!initRef.current) {
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

                setInit(true);
            }

            ssRef.current.on<Notify>("notify", (event) => {
                console.log("Notify!");
                setMessage({ error: event.event.data.error, text: event.event.data.text});
            });

            ssRef.current.on<Game>("newgame", (event) => {
                console.log("New game!");
                setCurrentGame(event.event.data);
                if (!event.event.data.muteSound) {
                    playSound(chargeSound, stopChargeSound);
                }
            });

            ssRef.current.on<Game>("restartgame", (event) => {
                console.log("Restart game!");
                setCurrentGame(event.event.data);
                if (!event.event.data.muteSound) {
                    playSound(buzzerSound, stopBuzzerSound);
                }
            });

            ssRef.current.on<Game>("startgame", (event) => {
                console.log("Start game!");
                const wasPaused = currentGameRef.current?.state === STATE_TIMEOUT;
                setCurrentGame(event.event.data);                
                if (!event.event.data.muteSound) {
                    if (wasPaused) {
                        playSound(whistleSound, stopWhistleSound);
                    } else {                    
                        playSound(buzzerSound, buzzerSound);
                    }
                }
            });

            ssRef.current.on<Game>("gameover", (event) => {
                console.log("Game Over!");
                setCurrentGame(event.event.data);
                if (!event.event.data.muteSound) {
                    playSound(buzzerSound, stopBuzzerSound);
                }
            });

            ssRef.current.on<Game>("1up", (event) => {
                console.log("Player Up!");
                setCurrentGame(event.event.data);
                if (!event.event.data.muteSound) {
                    playSound(notifySound, stopNotifySound);
                }
            });

            ssRef.current.on("0up", (event) => {
                console.log("Unknown Player!");
                if (!currentGameRef.current.muteSound) {
                    playSound(errorSound, stopErrorSound);
                }
                setMessage({ error: true, text: "Unknown player. Please register and try again."});
            });

            ssRef.current.on<Game>("updategame", (event) => {
                console.log("Game Update!");
                
                const previous = { ...currentGameRef.current };
                const next = { ...event.event.data };

                setCurrentGame(next);
                
                if (!next.muteSound) {                    
                    if (next.state === STATE_TAPIN && previous.timeRemaining !== next.timeRemaining) {
                        if (next.timeRemaining === 300) {
                            playSound(min5Sound, stopMin5Sound);
                        } else if (next.timeRemaining === 600) {
                            playSound(min10Sound, stopMin10Sound);
                        } else if (next.timeRemaining === 900) {
                            playSound(min15Sound, stopMin15Sound);
                        }
                    }
                }

                if (!previous.muteSound && next.muteSound) {
                    stopSound();
                }
            });

            ssRef.current.on<Game>("abortgame", (event) => {
                console.log("Game Aborted!");
                setCurrentGame(event.event.data);
                if (!event.event.data.muteSound) {
                    playSound(wahwahwahSound, stopWahWahWahSound);
                }
            });

            ssRef.current.on<Game>("pausegame", (event) => {
                console.log("Game Paused!");
                setCurrentGame(event.event.data);
                if (!event.event.data.muteSound) {
                    playSound(whistleSound, stopWhistleSound);
                }
            });

            ssRef.current.on<Game>("resumegame", (event) => {
                console.log("Game Resumed!");
                setCurrentGame(event.event.data);
                if (!event.event.data.muteSound) {
                    playSound(whistleSound, stopWhistleSound);
                }
            });

            ssRef.current.on<Game>("setgoal", (event) => {
                console.log("Set Goal!");
                const prev = currentGameRef.current;
                const next = event.event.data;
                setCurrentGame(next);
                
                if (!event.event.data.muteSound) {
                    let p: string = null;
                    if (prev.home.score !== next.home.score) {
                        p = next.home.player;
                    } else if (prev.visitor.score !== next.visitor.score) {
                        p = next.visitor.player;
                    }
                    const player = playersRef.current.find(i => i.id === p);
                    if (player?.audio?.goal) {
                        (new Howler.Howl({
                            src: player.audio.goal,
                            loop: false,                                
                        })).play();
                    } else {
                        playSound(cheerSound, stopCheerSound);
                    }
                }

                setGoal(true);
            });

            ssRef.current.on<Game>("cleargoal", (event) => {
                console.log("Set Goal!");
                setCurrentGame(event.event.data);
                stopSound();
                setGoal(false);
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

            ssRef.current.on<{id: string}>("removeplayer", (event) => {
                setPlayers([...playersRef.current.filter(p => p.id !== event.event.data.id)]);
            });

            ssRef.current.on<Player[]>("clearstats", (event) => {                
                setPlayers(event.event.data);
            });

            ssRef.current.on("off", (event) => {
                const prev = currentGameRef.current;
                setCurrentGame({...DefaultGame, muteSound: prev.muteSound});
                stopSound();
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
        min5Sound,
        min10Sound,
        min15Sound,
        stopChargeSound, 
        stopBuzzerSound, 
        stopCheerSound, 
        stopNotifySound, 
        stopWahWahWahSound, 
        stopWhistleSound,
        stopErrorSound,
        stopMin5Sound,
        stopMin10Sound,
        stopMin15Sound,        
    ])

    return {
        players,
        currentGame,
        goal,
        message
    }

}