import { useEffect, useRef, useState } from "react";
import { GetCurrentGameCommand, GetCurrentGameMessage, GetPlayersCommand, GetPlayersMessage, Message, Slapshot } from "./useSlapshot";
import { DefaultGame, Game, GameMessage, Notify, Player, STATE_TAPIN, STATE_TIMEOUT } from "../types";
import useSound from 'use-sound';
import { Howler, Howl } from 'howler';
import { error } from "console";

export interface GameCache {
    players: Player[],
    currentGame: Game,
    goal: boolean,
    message: GameMessage,
}

type NotifyOptions = {
    id?: string,
    error?: boolean,
    sticky?: boolean,
}

export function useGameCache(ss: Slapshot): GameCache {
    
    const [init, setInit] = useState<boolean>(false);
    const initRef = useRef(init);
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

    const [message, setMessage] = useState<GameMessage>(null);
    const messagesRef = useRef(message);
    messagesRef.current = message;

    const ssRef = useRef<Slapshot>();
    ssRef.current = ss;

    const [, {sound: cheerSound}] = useSound('../../www/cheer.mp3', { id: "cheer"});
    const [, {sound: buzzerSound}] = useSound('../../www/buzzer.wav', { id: "buzzer"});
    const [, {sound: chargeSound}] = useSound('../../www/organcharge.mp3', {id: "charge"});
    const [, {sound: notifySound}] = useSound('../../www/notification.wav', {id: "notify"});
    const [, {sound: wahwahwahSound}] = useSound('../../www/wahwahwah.mp3', {id: "wahwahwah"});
    const [, {sound: whistleSound}] = useSound('../../www/whistle.mp3', {id: "whistle"});
    const [, {sound: errorSound}] = useSound('../../www/error.mp3', {id: "error"});
        
    useEffect(() => {            

        if (!errorSound || !notifySound)
            return;

        const notify = (text: string, options?: NotifyOptions) => {
            playAudio(options?.error ? errorSound : notifySound, speak(text));
            setMessage({
                error: options?.error ?? false, 
                text, 
                sticky: options?.sticky ?? false, 
                id: options?.id
            });
        };
    
        const stopAudio = () => {
            Howler.stop();
        }
    
        const speak = (text: string, speed: number = 1): Howl => {
            stopAudio();
            const sound = new Howl({
                src: `http://localhost:3001/api/say?text=${encodeURIComponent(text)}&speed=${speed}`,
                format: 'wav',
                onplayerror: (id, error) => {
                    console.error("Playback error.", error);
                },
                onloaderror: (id, error) => {
                    console.error("Audio load error.", error);
                },
                volume: 1,
                autoplay: true,
                preload: true,
                html5: false,
            });
            return sound;
        }

        const playAudio = (...sounds: Howl[]) => {
            stopAudio();
            if (!currentGameRef.current.muteSound) {                
                let i = 0;
                const play = () => {
                    const s = sounds[i++];
                    s.once("end", () => {
                        if (i < sounds.length) {
                            play();
                        }
                    });
                    s.play();
                };
                play();
            }
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
                
                notify("Connected to service.", {id: "ISSUE_SERVICE_CONNECTION"});
                setInit(true);
            }

            ssRef.current.on<Notify>("notify", async (event) => {
                console.log("Notify!");
                const n = event.event.data;
                notify(n.text, { error: !!n.options?.error, sticky: false, id: n.options?.id});
            });

            ssRef.current.on<Game>("newgame", async (event) => {
                console.log("New game!");
                setCurrentGame(event.event.data);
                playAudio(speak("Welcome to the Morris Family gameroom."), chargeSound);
            });

            ssRef.current.on<Game>("restartgame", async (event) => {
                console.log("Restart game!");
                setCurrentGame(event.event.data);
                playAudio(buzzerSound, speak("Game restarted."));
            });

            ssRef.current.on<Game>("startgame", async (event) => {
                console.log("Start game!");
                const wasPaused = currentGameRef.current?.state === STATE_TIMEOUT;
                setCurrentGame(event.event.data);                
                if (wasPaused) {
                    playAudio(whistleSound);
                } else {                    
                    playAudio(buzzerSound);
                }
            });

            ssRef.current.on<Game>("gameover", async (event) => {
                console.log("Game Over!");
                setCurrentGame(event.event.data);
                playAudio(buzzerSound, speak("Game over."));
            });

            ssRef.current.on<Game>("1up", async (event) => {
                console.log("Player Up!");
                
                const next = event.event.data;
                setCurrentGame(next);
                
                //did we get both players?
                if (next.home.name && next.visitor.name) {
                    playAudio(notifySound, speak(`${next.home.name} versus ${next.visitor.name}. Press start to begin.`, 0.90));
                } else {
                    playAudio(notifySound);
                }
            });

            ssRef.current.on("0up", async (event) => {
                console.log("Unknown Player!");
                notify("Unknown player. Please register and try again.", {error: true, sticky: false});
            });

            ssRef.current.on<Game>("updategame", async (event) => {
                console.log("Game Update!");
                
                const previous = currentGameRef.current;
                const next = event.event.data;
                setCurrentGame(next);

                const newIssues = Object.keys(next.issues).filter(k => !previous.issues[k]);
                newIssues.forEach(k => {
                    const issue = next.issues[k];
                    notify(issue, {error: true, sticky: true, id: k});
                });
                
                if (next.state === STATE_TAPIN && previous.timeRemaining !== next.timeRemaining) {
                    if (next.timeRemaining === 300) {
                        playAudio(speak("Five minute game."));
                    } else if (next.timeRemaining === 600) {
                        playAudio(speak("Ten minute game."));
                    } else if (next.timeRemaining === 900) {
                        playAudio(speak("Fifteen minute game."));
                    }
                }

                if (!previous.muteSound && next.muteSound) {
                    stopAudio();
                }
            });

            ssRef.current.on<Game>("abortgame", async (event) => {
                console.log("Game Aborted!");
                setCurrentGame(event.event.data);
                playAudio(wahwahwahSound, speak("System off. Goodbye."));
            });

            ssRef.current.on<Game>("pausegame", async (event) => {
                console.log("Game Paused!");
                setCurrentGame(event.event.data);
                playAudio(whistleSound, speak("Timeout!"));
            });

            ssRef.current.on<Game>("resumegame", async (event) => {
                console.log("Game Resumed!");
                setCurrentGame(event.event.data);
                playAudio(whistleSound);
            });

            ssRef.current.on<Game>("setgoal", async (event) => {
                console.log("Set Goal!");
                setCurrentGame(event.event.data);
                playAudio(cheerSound);
                setGoal(true);
            });

            ssRef.current.on<Game>("cleargoal", async (event) => {
                console.log("Set Goal!");
                setCurrentGame(event.event.data);
                stopAudio();
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

            ssRef.current.on("off", async (event) => {
                const prev = currentGameRef.current;
                setCurrentGame({...DefaultGame, muteSound: prev.muteSound});                
                playAudio(speak("System off. Goodbye."));
            });
        } else {
            notify("Disconnected from service.", {error: true, sticky: true, id: "ISSUE_SERVICE_CONNECTION"});
            setInit(false);
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
    ])

    return {
        players,
        currentGame,
        goal,
        message
    }

}