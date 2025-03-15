import express from 'express';
import { Level } from 'level';
import WebSocket from 'ws';
import { WSCommand, Game, GameUpdate, WSMessage, Player, ResultMessage, MQTTCommand, Manager, NotifyOptions } from './types';
import crypto from 'crypto';
import child_process from 'child_process';
import { Device, createBluetooth } from "node-ble";
import { exec } from 'child_process';
import path from 'path';
import fsPromises from 'fs/promises';
import fs from 'fs';
import md5 from 'md5';
import axios from 'axios';
import cors from 'cors';

import 'dotenv/config';
import { delay } from './utils';

const PORT = 3001;
const GAME_TIME = 300; /* 5 min */

const STATE_OFF           = 49;
const STATE_TAPIN         = 50;
const STATE_PLAYING       = 51;
const STATE_TIMEOUT       = 52;
const STATE_GOAL          = 53;
const STATE_1UP           = 54;
const STATE_NOGOAL        = 55;
const STATE_GAMEOVER      = 56;

const ISSUE_LOST_CONTROLLER = "ISSUE_LOST_CONTROLLER";
const ISSUE_LOST_HOME_SENSOR = "ISSUE_LOST_HOME_SENSOR";
const ISSUE_LOST_VISITOR_SENSOR = "ISSUE_LOST_VISITOR_SENSOR";

const signature = crypto.randomBytes(16).toString('hex');

const db = new Level('db', { valueEncoding: 'json' });
const players = db.sublevel('players', { valueEncoding: 'json' });
const games = db.sublevel('games', { valueEncoding: 'json' });

const audioPath = path.join(process.cwd(), 'db/audio');

const current: Game = {
    state: STATE_OFF,
    timeRemaining: 0,
    muteSound: false,
    home: {
        player: '',
        name: '',
        score: 0,
        status: ''
    },
    visitor: {
        player: '',
        name: '',
        score: 0,
        status: ''
    },
    issues: {},
}

async function reboot() {
    try {
        child_process.exec('sudo /sbin/shutdown -r now', (msg) => { console.log(msg)});
    } catch (e) {
        console.error(e);
    }
}

async function setIssue(id: string, text: string) {
    current.issues[id] = text;
    await updateGame();
}

async function clearIssue(id: string, text: string) {
    current.issues[id] = undefined;
    await updateGame();
    await delay(500);
    await notify(text, { id });
}

async function notify(text: string, options?: NotifyOptions) {
    try {
        fireEvent("notify", {
            text,
            options
        });
    } catch (e) {
        console.error(e);
    }
}

async function off() {
    try {
        turnOffLight();
        fireEvent("off");
    } catch (e) {
        console.error(e);
    }
}

async function newGame() {
    try {
        current.home.name = '';
        current.visitor.name = '';
        turnOffLight();
        fireEvent("newgame", current);
    } catch (e) {
        console.error(e);
    }
}

async function tapIn(team: 'home'|'visitor', player: string) {
    try {
        const p = await getPlayer(player);
        if (p) {
            current[team].name = p.name;
            fireEvent("1up", current);
        } else {
            console.warn(`Unknown player id: ${player}`);
            current[team].name = '';
            fireEvent("0up");
        }
    } catch (e) {
        console.error(e);
    }
}

async function startGame() {
    try {
        turnOffLight();
        fireEvent("startgame", current);
    } catch (e) {
        console.error(e);
    }
}

async function resumeGame() {
    try {
        turnOffLight();
        fireEvent("resumegame", current);
    } catch (e) {
        console.error(e);
    }
}

async function pauseGame() {
    try {
        turnOffLight();
        fireEvent("pausegame", current);
    } catch (e) {
        console.error(e);
    }
}

async function restartGame () {
    try {
        turnOffLight();
        fireEvent("restartgame", current);
    } catch (e) {
        console.error(e);
    }
}

async function abortGame() {
    try {
        turnOffLight();
        fireEvent("abortgame", current);
    } catch (e) {
        console.error(e);
    }
}

async function setGoal() {
    try {
        fireEvent("setgoal", current);
        turnOnLight();
    } catch (e) {
        console.error(e);
    }
}

async function clearGoal() {
    try {
        fireEvent("cleargoal", current);
        turnOffLight();
    } catch (e) {
        console.error(e);
    }
}

async function updateGame() {
    try {
        fireEvent("updategame", current);
    } catch (e) {
        console.error(e);
    }
}

async function endGame() {
    try {        
        const home = await getPlayer(current.home.player);
        const visitor = await getPlayer(current.visitor.player);

        if (home && visitor) {
            home.matches += 1;
            home.points += current.home.score;
            home.wins += (current.home.score > current.visitor.score) ? 1 : 0;
            home.loses += (current.home.score < current.visitor.score) ? 1 : 0;
            home.ties += (current.home.score == current.visitor.score) ? 1 : 0;
            await players.put(home.id, home, null);
            fireEvent("stats", home);

            visitor.matches += 1;
            visitor.points += current.visitor.score;
            visitor.wins += (current.home.score < current.visitor.score) ? 1 : 0;
            visitor.loses += (current.home.score > current.visitor.score) ? 1 : 0;
            visitor.ties += (current.home.score == current.visitor.score) ? 1 : 0;
            await players.put(visitor.id, visitor, null);
            fireEvent("stats", visitor);
        }
        turnOffLight();        
        fireEvent("gameover", current);
    } catch (e) {
        console.error(e);
    }
}

const app = express();
app.use(cors());
app.use('/api', express.json());
app.use('/www', express.static('./dist/www'));

app.get('/api/players', async (req, res) => {
    try {
        const results = await players.values().all();
        res.send(results);
    } catch (e) {
        res.status(500).send(e);
    }
});

app.post('/api/players', async (req, res) => {
    try {
        const added = req.body as Player;
        added.matches = 0;
        added.wins = 0;
        added.loses = 0;
        added.ties = 0;
        added.points = 0;
        const existing = await getPlayer(added.id);
        const player = {...existing, ...added};
        await players.put(player.id, player, null);
        fireEvent("newplayer", player);
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.status(500).send(e);
    }
});

app.delete('/api/players', async (req, res) => {
    try {
        await players.clear();
        fireEvent("clearplayers");
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.status(500).send(e);
    }
});

app.delete('/api/players/:id', async (req, res) => {
    try {
        await players.del(req.params.id);
        fireEvent("removeplayer", {id: req.params.id});
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.status(500).send(e);
    }
});

app.put('/api/players/:id', async (req, res) => {
    try {
        const player = await getPlayer(req.params.id);
        player.matches = req.body.matches ?? player.matches ?? 0;
        player.wins = req.body.wins ?? player.wins ?? 0;
        player.loses = req.body.loses ?? player.loses ?? 0;
        player.ties = req.body.ties ?? player.ties ?? 0;
        player.points = req.body.points ?? req.body.points ?? 0;
        await players.put(player.id, player, null);
        fireEvent("stats", player);
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.status(500).send(e);
    }
});

app.delete('/api/stats', async (req, res) => {
    try {
        const all = await players.values<string, Player>(null).all()
        for (let i = 0; i < all.length; i++) {
            const p = all[i];
            p.matches = 0;
            p.points = 0;
            p.wins = 0;
            p.loses = 0;
            p.ties = 0;
            await players.put(p.id, p, null);
        }
        fireEvent("clearstats", all);
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.status(500).send(e);
    }
});

app.get('/api/games/current', async(req, res) => {
    try {
        res.send(current);
    } catch (e) {
        res.status(500).send(e);
    }
});

app.get('/api/say', async(req, res) => {
    const text = req.query.text as string;
    let speed = 1;
    if (req.query.speed) {
        speed = parseFloat(req.query.speed as string);
        if (isNaN(speed) || speed < 0.25 || speed > 4) {
            res.status(400).send("Invalid speed. Must be between 0.25 and 4.");
            return;
        }
    }
    const audio = await generateAudioClip(text, speed);
    if (audio) {
        res.status(200)
            .setHeader('Content-Type', 'audio/wav')
            .sendFile(audio);
    } else {
        res.status(500).send("Failed to generate audio clip.");
    }
});

function fireEvent(name: string, data?: any) {
    wss.clients.forEach(c => c.readyState == c.OPEN && c.send(JSON.stringify({
        type: 'event',
        event: {
            name,
            data
        }
    })));
}

async function getPlayer(id: string): Promise<Player> {
    return (await players.getMany<string, Player>([id ?? ''], null)).at(0);
}

async function getGame(id: string): Promise<Game> {
    return (await games.getMany<string, Game>([id ?? ''], null)).at(0);
}

const wss = new WebSocket.Server({
    noServer: true,
    path: "/websockets"
});

wss.on("connection", (websocketConnection) => {
    websocketConnection.send(JSON.stringify({type: "connect", signature: signature}));
    console.log('connected!');

    websocketConnection.on("message", async (data) => {
        const cmd = JSON.parse(data.toString()) as WSCommand;
        switch (cmd?.type) {
            case "ping": {
                //console.log("ping-pong");
                const msg: ResultMessage<string> = {
                    ...cmd,
                    success: true,
                    result: "pong",
                }
                websocketConnection.send(JSON.stringify(msg));  
                break;  
            }

            case "getplayers": {
                console.log("getplayers");
                const msg: ResultMessage<Player[]> = {
                    ...cmd,
                    success: true,
                    result: await players.values<string, Player>(null).all()
                }
                websocketConnection.send(JSON.stringify(msg));  
                break;  
            }

            case "getcurrentgame": {
                console.log("getcurrentgame");
                const msg: ResultMessage<Game> = {
                    ...cmd,
                    success: true,
                    result: current,
                }
                websocketConnection.send(JSON.stringify(msg));  
                break;
            }         
            
            default: {
                console.warn("Unhandled websocket command. " + cmd?.type);
            }
        }
    });
});

async function connectBluetooth() {
    let device: Device;
    const { bluetooth, destroy } = createBluetooth();
    console.log("Created bluetooth");
    try {
        const adapter = await bluetooth.defaultAdapter();
        console.log("Got adapter");
    
        if (!await adapter.isDiscovering()) {
        console.log("Starting discovery");
        await adapter.startDiscovery();
        console.log("Discovery started");
        }

        // find device and connect
        device = await adapter.waitDevice('C8:2E:18:68:A9:E2');
        console.log("Found device, connecting...", await device.getName());
        await device.connect()
        console.log("Connected to device");
        
        console.log("Stopping discovery");
        await adapter.stopDiscovery();
        console.log("Discovery stopped");
        
        // get device services
        console.log("Getting GATT server");
        const gattServer = await device.gatt()
        console.log("Got GATT server");
        
        const gameService = await gattServer.getPrimaryService('1689cb79-5ce5-4485-af61-dc472b3ba097');
        const gameState = await gameService.getCharacteristic('53d0f4b3-c05f-4ff0-bfd4-2097f76bee6a')
        const timeRemaining = await gameService.getCharacteristic('63427eed-5a3c-4ef3-a9f6-cea59992c584')
        const muteSound = await gameService.getCharacteristic('a2b96b99-6298-46f7-a5b6-dea7652380f0')

        const homeService = await gattServer.getPrimaryService('0c88f0aa-6831-4ffa-8684-308e3c476a39');
        const homePlayer = await homeService.getCharacteristic('33acbdbe-026d-47c3-a37b-423999537afc')
        const homeScore = await homeService.getCharacteristic('89c82c4d-e536-4d4c-a165-7afc3dcd0e00')
        const homeStatus = await homeService.getCharacteristic('4efdd30c-4011-455c-83b9-e7d72104c400')
        
        const visitorService = await gattServer.getPrimaryService('e7cbeac4-8d90-44e2-9e05-f44c6e06899b');
        const visitorPlayer = await visitorService.getCharacteristic('9a4e5c0d-51a1-48d5-b279-20a73c017577')
        const visitorScore = await visitorService.getCharacteristic('1b2661f4-f67d-4367-8749-6be6ca05155d')
        const visitorStatus = await visitorService.getCharacteristic('aa11ffc9-aa27-4789-8e62-7dafaa5152d2')

        const controlService = await gattServer.getPrimaryService('912bdc44-14b1-42f3-b0bd-a86eac5c4123');
        const commandState = await controlService.getCharacteristic('3168d31b-2f18-404c-8695-741a4fd400b4')

        //read current state
        current.state = (await gameState.readValue()).readInt32LE();
        current.timeRemaining = (await timeRemaining.readValue()).readInt32LE();
        current.muteSound = (await muteSound.readValue())[0] == 1;
        current.home.player = (await homePlayer.readValue()).toString('utf-8');
        current.home.score = (await homeScore.readValue()).readInt32LE();
        current.home.status = (await homeStatus.readValue()).toString('utf-8');
        current.visitor.player = (await visitorPlayer.readValue()).toString('utf-8');
        current.visitor.score = (await visitorScore.readValue()).readInt32LE();
        current.visitor.status = (await visitorStatus.readValue()).toString('utf-8');

        console.info ("Current game:", current);

        updateGame();

        console.log("Starting notifications")

        await commandState.startNotifications();
        commandState.on('valuechanged', buffer => {
            const command = buffer.toString('utf-8');
            console.log("Command: " + command);
            switch (command) {
                case 'reboot':
                    reboot();
                    break;
                default:
                    console.warn("Unknown command: " + command);
                    break;
            }
        });

        await gameState.startNotifications()
        gameState.on('valuechanged', buffer => {
            const state = buffer.readInt32LE();            
            const oldState = current.state;
            current.state = state;
            console.log("Game State: " + state);
            
            switch (state) {
                case STATE_TAPIN:
                    if (oldState === STATE_PLAYING || oldState === STATE_TIMEOUT || oldState === STATE_GOAL) {
                        restartGame();
                    } else {
                        newGame();
                    }
                    break;

                case STATE_PLAYING:
                    if(oldState === STATE_TAPIN) {
                        startGame();
                    } else if (oldState == STATE_TIMEOUT) { 
                        resumeGame();
                    } else if (oldState == STATE_GOAL) {
                        clearGoal();
                    }
                    break;
    
                case STATE_TIMEOUT:
                    pauseGame();
                    break;
    
                case STATE_GOAL:
                    setGoal();
                    break;

                case STATE_GAMEOVER:
                    endGame();
                    break;
    
                case STATE_OFF:
                    if (oldState == STATE_PLAYING || oldState == STATE_TIMEOUT) {
                        abortGame();
                    } else {
                        off();
                    }
                    break;
            }
        });      

        await timeRemaining.startNotifications()
        timeRemaining.on('valuechanged', buffer => {
            const state = buffer.readInt32LE();
            current.timeRemaining = state;
            console.log("Time Remaining: " + state);
            
            updateGame();
        });      

        await muteSound.startNotifications()
        muteSound.on('valuechanged', buffer => {
            const state = buffer[0] == 1;
            current.muteSound = state;
            console.log("Mute Sound: " + state);
            
            updateGame();
        });      

        await homePlayer.startNotifications()
        homePlayer.on('valuechanged', buffer => {
            const state = buffer.toString('utf-8');
            current.home.player = state;
            current.home.name = '';
            console.log("Home Player: " + state);

            tapIn('home', current.home.player);
        });      
        
        await homeScore.startNotifications()
        homeScore.on('valuechanged', buffer => {
            const state = buffer.readInt32LE();
            current.home.score = state;
            console.log("Home Score: " + state);
        });      

        await homeStatus.startNotifications();
        homeStatus.on('valuechanged', buffer => {
            const state = buffer.toString('utf-8');
            const oldState = current.home.status;
            current.home.status = state;
            console.log("Home Status: " + state);
            
            if (state === "Error" && oldState === "OK") {
                setIssue(ISSUE_LOST_HOME_SENSOR, "Lost connection with home sensor.");
            } else if (state === "OK" && oldState === "Error") {
                clearIssue(ISSUE_LOST_HOME_SENSOR, "Restored connection with home sensor.");
            }
        });

        await visitorPlayer.startNotifications()
        visitorPlayer.on('valuechanged', buffer => {
            const state = buffer.toString('utf-8');
            current.visitor.player = state;
            current.visitor.name = '';
            console.log("Visitor Player: " + state);

            tapIn('visitor', current.visitor.player);
        });      

        await visitorScore.startNotifications()
        visitorScore.on('valuechanged', buffer => {
            const state = buffer.readInt32LE();
            current.visitor.score = state;
            console.log("Visitor Score: " + state);
        });     

        await visitorStatus.startNotifications();
        visitorStatus.on('valuechanged', buffer => {
            const state = buffer.toString('utf-8');
            const oldState = current.visitor.status;
            current.visitor.status = state;   
            console.log("Visitor Status: " + state);

            if (state === "Error" && oldState === "OK") {
                setIssue(ISSUE_LOST_VISITOR_SENSOR, "Lost connection with visitor sensor.");                
            } else if (state === "OK" && oldState === "Error") {
                clearIssue(ISSUE_LOST_VISITOR_SENSOR, "Restored connection with visitor sensor.");                
            }
        });

    } catch (e) {        
        console.warn ("Current game:", current);        
        console.error(e);
        destroy();
        throw e;
    }    

    return { device, destroy };
}

async function generateAudioClip(text: string, speed: number = 1): Promise<string> {
    try {
        const audioRequest = {
            model: 'tts-1',
            voice: 'echo',
            speed,
            input: text,
            response_format: 'wav',
        };

        const clipFilename = `${audioRequest.voice}-${audioRequest.speed}-${md5(text)}.${audioRequest.response_format ?? 'mp3'}`;
        
        //do we already have the clip?
        const clipPath = path.join(audioPath, clipFilename);
        if (!fs.existsSync(clipPath)) {
            
            //generate the clip
            const resp = await axios.post('https://api.openai.com/v1/audio/speech',
                audioRequest, {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    responseType: 'arraybuffer'
                }
            );

            if (resp.status == 200) {
                const file = await fsPromises.open(clipPath, 'wx');
                try {
                    file.write(resp.data);
                } finally {
                    file.close();
                }
            } else {
                console.error("Failed to generate audio clip. " + resp.statusText);
                return null;
            }
        }

        return clipPath;
    } catch (e) {
        console.error(e);
        return null;    
    }
}

function turnOnLight() {
    exec('gpio write 6 1', (error, stdout, stderr) => {
        if (error) {
            console.error(error);
        }
    });
}

function turnOffLight() {
    exec('gpio write 6 0', (error, stdout, stderr) => {
        if (error) {
            console.error(error);
        }
    });
}

async function main() {    
    
    let controller: Device
    let destroy: () => void;
    
    const healthCheck = async () => {
        //check health
        if (controller) {
            if (!await controller.isConnected()) {
                console.error('Lost connection with controller.');
                setIssue(ISSUE_LOST_CONTROLLER, "Lost connection with controller.")
                destroy();
                controller = undefined;
                destroy = undefined;

            }
        }

        //connect?
        if (!controller) {
            try {
                const data = await connectBluetooth();
                controller = data.device;
                destroy = data.destroy;
                clearIssue(ISSUE_LOST_CONTROLLER, "Restored connection with controller.");
            } catch (e) {
                setIssue(ISSUE_LOST_CONTROLLER, "Failed to connect to controller.");
            }
        }

        setTimeout(healthCheck, 10000);
    };

    setTimeout(healthCheck, 10000);

    const shutdown = () => {
        console.log("Caught interrupt signal");

        if (destroy) {
            destroy();
        }
        process.exit();    
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    //setup the cache directory for audio files
    if (!fs.existsSync(audioPath)) {
        await fsPromises.mkdir(audioPath);
    }
    
    //setup GPIO pin for the goal light
    exec('gpio mode 6 out', (error, stdout, stderr) => {
        if (error) {
            console.error('Failed to configure GPIO 6 for output. ', error);
        } else {
            console.log('Configured GPIO 6 for output.');
        }
    });

    const server = app.listen(PORT, () => {
        console.log(`[server]: Server is running at http://localhost:${PORT}`);
    });
    
    server.on("upgrade", (req, socket, head) => {
        wss.handleUpgrade(req, socket, head, (websocket) => {
            wss.emit("connection", websocket, req);
        })
    });    
}

main();

