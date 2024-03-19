import express from 'express';
import { Level } from 'level';
import WebSocket from 'ws';
import { WSCommand, Game, GameUpdate, WSMessage, Player, ResultMessage, MQTTCommand } from './types';
import * as mqtt from 'mqtt';
import crypto from 'crypto';
import child_process from 'child_process';

const PORT = 3001;
const GAME_TIME = 600000; /* 10 min */
const MQTT_BROKER = "mqtt://192.168.15.50";

const signature = crypto.randomBytes(16).toString('hex');

const db = new Level('db', { valueEncoding: 'json' });
const players = db.sublevel('players', { valueEncoding: 'json' });
const games = db.sublevel('games', { valueEncoding: 'json' });

const broker = mqtt.connect(MQTT_BROKER, {
    username: "slapshot",
    password: "slapshot"
});

broker.on("connect", () => {
    broker.subscribe("slapshot/#", (err) => {
        if (!err) {
            console.log("Connected to MQTT.");
        }
    });
});

broker.on("message", async (topic, message) => {
    if (topic.startsWith("slapshot/games/current")) {
        const cmd = JSON.parse(message.toString()) as MQTTCommand;
        switch (cmd?.command) {
            case 'new':
                await newGame(cmd.time);
                break;
            case "tapin":
                await tapIn(cmd.team, cmd.player);
                break;
            case 'start':
                await startGame(cmd.timeRemaining);
                break;
            case "restart":
                await restartGame(cmd.timeRemaining);
                break;
            case "score":
                await score(cmd.team, cmd.homeScore, cmd.visitorScore);
                break;
            case "abort":
                await abortGame();
                break;
            case "update":
                await updateGame(cmd.timeRemaining, cmd.homeScore, cmd.visitorScore);
                break;
            case "end":
                await endGame(cmd.homeScore, cmd.visitorScore);
                break;
            case "pause":
                await pauseGame(cmd.timeRemaining, cmd.homeScore, cmd.visitorScore);
                break;            
            case "off":
                await off();
                break;
            case "reboot":
                await reboot();
                break;
            default:
                console.warn("Unhandled command:" + cmd?.command);
                break;
        }
    }
});

async function reboot() {
    try {
        child_process.exec('sudo /sbin/shutdown -r now', (msg) => { console.log(msg)});
    } catch (e) {
        console.error(e);
    }
}

async function off() {
    try {
        await games.del('current');
        fireEvent("off");
    } catch (e) {
        console.error(e);
    }
}

async function newGame(time?: number) {
    try {
        const game: Game = {
            state: 'pending',
            homeScore: 0,
            visitorScore: 0,
            timeRemaining: time ?? GAME_TIME
        }
        await games.put('current', game, null);
        fireEvent("newgame", game);
    } catch (e) {
        console.error(e);
    }
}

async function tapIn(team: 'home'|'visitor', player: string) {
    try {
        const game = await getGame('current');
        if (!!game && game.state === 'pending') {
            const p = await getPlayer(player);
            if (p) {
                game[team] = p.id;
                (game as any)[team + 'Name'] = p.name;
                await games.put('current', game, null);
                fireEvent("1up", game);
            } else {
                console.warn(`Unknown player id: ${player}`);
                fireEvent("0up");
            }
        } else {
            throw 'Invalid game state'
        }
    } catch (e) {
        console.error(e);
    }
}

async function startGame(timeRemaining: number) {
    try {
        const game = await getGame('current');
        if (!!game && (game.state === 'pending' || game.state === 'paused')) {
            game.state = 'active';
            game.timeRemaining = timeRemaining;
            await games.put('current', game, null);
            fireEvent("startgame", game);
        } else {
            throw "No game";
        }
    } catch (e) {
        console.error(e);
    }
}

async function pauseGame(timeRemaining: number, homeScore: number, visitorScore: number) {
    try {
        const game = await getGame('current');
        if (isActiveGame(game)) {
            game.state = 'paused';
            game.timeRemaining = timeRemaining;
            game.homeScore = homeScore;
            game.visitorScore = visitorScore;
            await games.put('current', game, null);
            fireEvent("pausegame", game);
        } else {
            throw "No game";
        }
    } catch (e) {
        console.error(e);
    }
}

async function restartGame (time? :number) {
    try {
        const game = await getGame('current');
        if (isActiveGame(game)) {
            game.state = 'active';
            game.homeScore = 0;
            game.visitorScore = 0;
            game.timeRemaining = GAME_TIME ?? time;
            await games.put('current', game, null);
            fireEvent("restartgame", game);
        } else {
            throw "No active game";
        }
    } catch (e) {
        console.error(e);
    }
}

async function abortGame() {
    try {
        const game = await getGame('current');
        if (isActiveGame(game)) {
            game.state = 'abort';
            await games.put('current', game, null);
            fireEvent("abortgame", game);
        } else {
            throw "No active game";
        }
    } catch (e) {
        console.error(e);
    }
}

async function score(team: 'home'|'visitor', homeScore: number, visitorScore: number) {
    try {
        const game = await getGame('current');
        if (game?.state == 'active') {
            game.homeScore = homeScore;
            game.visitorScore = visitorScore;
            await games.put('current', game, null);
            fireEvent("score", game);
        } else {
            throw "No active game"
        }
    } catch (e) {
        console.error(e);
    }
}

async function updateGame(timeRemaining: number, homeScore: number, visitorScore: number) {
    try {
        const game = await getGame('current');
        if (isActiveGame(game)) {
            game.timeRemaining = timeRemaining;
            game.homeScore = homeScore;
            game.visitorScore = visitorScore;
            await games.put('current', game, null);
            fireEvent("updategame", game);
        } else {
            throw "No active game";
        }
    } catch (e) {
        console.error(e);
    }
}

async function endGame(homeScore: number, visitorScore: number) {
    try {
        const game = await getGame('current');
        game.homeScore = homeScore;
        game.visitorScore = visitorScore;

        const home = await getPlayer(game.home);
        const visitor = await getPlayer(game.visitor);

        if (home && visitor) {
            home.matches += 1;
            home.points += game.homeScore;
            home.wins += (game.homeScore > game.visitorScore) ? 1 : 0;
            home.loses += (game.homeScore < game.visitorScore) ? 1 : 0;
            home.ties += (game.homeScore == game.visitorScore) ? 1 : 0;
            await players.put(home.id, home, null);
            fireEvent("stats", home);

            visitor.matches += 1;
            visitor.points += game.visitorScore;
            visitor.wins += (game.homeScore < game.visitorScore) ? 1 : 0;
            visitor.loses += (game.homeScore > game.visitorScore) ? 1 : 0;
            visitor.ties += (game.homeScore == game.visitorScore) ? 1 : 0;
            await players.put(visitor.id, visitor, null);
            fireEvent("stats", visitor);
        }

        game.state = 'complete';
        game.timeRemaining = 0;
        await games.put('current', game, null);
        
        fireEvent("gameover", game);
    } catch (e) {
        console.error(e);
    }
}

const app = express();
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
        const game = await games.get('current');
        res.send(game);
    } catch (e) {
        res.status(500).send(e);
    }
});

const server = app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
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

function isActiveGame(game?: Game) {
    return game?.state == 'active' || game?.state == 'paused';
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

server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (websocket) => {
        wss.emit("connection", websocket, req);
    })
});

wss.on("connection", (websocketConnection) => {
    websocketConnection.send(JSON.stringify({type: "connect", signature: signature}));
    console.log('connected!');

    websocketConnection.on("message", async (data) => {
        const cmd = JSON.parse(data.toString()) as WSCommand;
        switch (cmd?.type) {
            case "ping": {
                console.log("ping-pong");
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
                    result: (await games.getMany<string, Game>(['current'], null)).at(0)
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

