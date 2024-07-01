import { useEffect, useRef, useState } from "react";
import { GetCurrentGameCommand, GetCurrentGameMessage, GetPlayersCommand, GetPlayersMessage, Message, Slapshot } from "./useSlapshot";
import { DefaultGame, Game, Notify, Player, STATE_TAPIN, STATE_TIMEOUT } from "../types";
import useSound from 'use-sound';
import { Howler, Howl } from 'howler';
import { delay } from "../utils";

export interface GameCache {
    players: Player[],
    currentGame: Game,
    goal: boolean,
    message?: {
        error: boolean,
        text: string,
    }
}

const AudioState = {
    runningAudioPlaylist: false,
    requestStop: false
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

    const [message, setMessage] = useState<{error: boolean, text: string}>(null);
    const messageRef = useRef(message);
    messageRef.current = message;

    const ssRef = useRef<Slapshot>();
    ssRef.current = ss;

    const [, {sound: cheerSound}] = useSound('../../www/cheer.mp3', { id: "cheer"});
    const [, {sound: buzzerSound}] = useSound('../../www/buzzer.wav', { id: "buzzer"});
    const [, {sound: chargeSound}] = useSound('../../www/organcharge.mp3', {id: "charge"});
    const [, {sound: notifySound}] = useSound('../../www/notification.wav', {id: "notify"});
    const [, {sound: wahwahwahSound}] = useSound('../../www/wahwahwah.mp3', {id: "wahwahwah"});
    const [, {sound: whistleSound}] = useSound('../../www/whistle.mp3', {id: "whistle"});
    const [, {sound:errorSound}] = useSound('../../www/error.mp3', {id: "error"});

    useEffect(() => {
                
        const stopAudio = async () => {
            AudioState.requestStop = true;
            try {
                Howler.stop();
                while (AudioState.runningAudioPlaylist) {
                    await delay(250);
                }
                Howler.stop();
            } finally {
                await delay(250);
                AudioState.requestStop = false;
            }
        }
    
        const speak = async (text: string, speed: number = 1): Promise<Howl> => {
            await stopAudio();
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
                html5: true,
            });
            return sound;
        }

        const playAudio = async (sound: Howl) => {
            await stopAudio();
            if (!currentGameRef.current.muteSound) {
                sound.play();
            }
        }

        const playlistAudio = async (sounds: Howl[]) => {
            await stopAudio();
            AudioState.runningAudioPlaylist = true;
            try {
                if (!currentGameRef.current.muteSound) {                
                    for (let i = 0; i < sounds.length; i++) {
                        const s = sounds[i];
                        const id = s.play();
                        await delay(250);
                        while (s.state() !== "loaded") {
                            await delay(100);
                        }
                        while (s.playing(id)) {
                            await delay(100);
                            if (AudioState.requestStop) {
                                s.stop(id);
                                return;
                            }
                        }
                    }
                }
            } finally {
                await delay(250);
                AudioState.runningAudioPlaylist = false;
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

                setInit(true);
            }

            ssRef.current.on<Notify>("notify", async (event) => {
                console.log("Notify!");
                setMessage({ error: event.event.data.error, text: event.event.data.text});
            });

            ssRef.current.on<Game>("newgame", async (event) => {
                console.log("New game!");
                setCurrentGame(event.event.data);
                await playlistAudio([await speak("Welcome to the Morris Family gameroom."), chargeSound]);
            });

            ssRef.current.on<Game>("restartgame", async (event) => {
                console.log("Restart game!");
                setCurrentGame(event.event.data);
                await playlistAudio([buzzerSound, await speak("Game restarted.")]);
            });

            ssRef.current.on<Game>("startgame", async (event) => {
                console.log("Start game!");
                const wasPaused = currentGameRef.current?.state === STATE_TIMEOUT;
                setCurrentGame(event.event.data);                
                if (wasPaused) {
                    await playAudio(whistleSound);
                } else {                    
                    await playAudio(buzzerSound);
                }
            });

            ssRef.current.on<Game>("gameover", async (event) => {
                console.log("Game Over!");
                setCurrentGame(event.event.data);
                await playlistAudio([buzzerSound, await speak("Game over.")]);
            });

            ssRef.current.on<Game>("1up", async (event) => {
                console.log("Player Up!");
                
                const next = event.event.data;
                setCurrentGame(next);
                
                //did we get both players?
                if (next.home.name && next.visitor.name) {
                    await playlistAudio([notifySound, await speak(`${next.home.name} versus ${next.visitor.name}. Press start to begin.`, 0.90)]);
                } else {
                    await playAudio(notifySound);
                }
            });

            ssRef.current.on("0up", async (event) => {
                console.log("Unknown Player!");
                await playAudio(errorSound);
                setMessage({ error: true, text: "Unknown player. Please register and try again."});
            });

            ssRef.current.on<Game>("updategame", async (event) => {
                console.log("Game Update!");
                
                const previous = currentGameRef.current;
                const next = event.event.data;
                setCurrentGame(next);
                
                if (next.state === STATE_TAPIN && previous.timeRemaining !== next.timeRemaining) {
                    if (next.timeRemaining === 300) {
                        await playAudio(await speak("Five minute game."));
                    } else if (next.timeRemaining === 600) {
                        await playAudio(await speak("Ten minute game."));
                    } else if (next.timeRemaining === 900) {
                        await playAudio(await speak("Fifteen minute game."));
                    }
                }

                if (!previous.muteSound && next.muteSound) {
                    await stopAudio();
                }
            });

            ssRef.current.on<Game>("abortgame", async (event) => {
                console.log("Game Aborted!");
                setCurrentGame(event.event.data);
                await playlistAudio([wahwahwahSound, await speak("System off. Goodbye.")]);
            });

            ssRef.current.on<Game>("pausegame", async (event) => {
                console.log("Game Paused!");
                setCurrentGame(event.event.data);
                await playlistAudio([whistleSound, await speak("Timeout.")]);
            });

            ssRef.current.on<Game>("resumegame", async (event) => {
                console.log("Game Resumed!");
                setCurrentGame(event.event.data);
                await playAudio(whistleSound);
            });

            ssRef.current.on<Game>("setgoal", async (event) => {
                console.log("Set Goal!");
                setCurrentGame(event.event.data);
                await playAudio(cheerSound);
                setGoal(true);
            });

            ssRef.current.on<Game>("cleargoal", async (event) => {
                console.log("Set Goal!");
                setCurrentGame(event.event.data);
                await stopAudio();
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
                await playAudio(await speak("System off. Goodbye."));
            });
        } else {
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