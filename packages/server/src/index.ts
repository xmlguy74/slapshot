import express from 'express';
import { Level } from 'level';
import WebSocket from 'ws';
import { Command, Game, GameUpdate, Message, Player, ResultMessage } from './types';

const port = 3001;

const db = new Level('db', { valueEncoding: 'json' });
const players = db.sublevel('players', { valueEncoding: 'json' });
const games = db.sublevel('games', { valueEncoding: 'json' });

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
        const player = req.body as Player;
        await players.put(player.id, player, null);
        fireEvent("newplayer", player);
        res.sendStatus(200);
    } catch (e) {
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

app.post('/api/games/current', async (req, res) => {
    try {
        const game: Game = {
            state: 'pending',
            homeScore: 0,
            visitorScore: 0,
            timeRemaining: 600000 /* 10 min */
        }
        await games.put('current', game, null);
        res.sendStatus(200);

        fireEvent("newgame", game);

    } catch (e) {
        res.status(500).send(e);
    }
});

app.put('/api/games/current/start', async (req, res) => {
    try {
        const game = await getGame('current');
        if (!!game && game.state === 'pending') {
            game.state = 'active';
            await games.put('current', game, null);
            fireEvent("startgame", game);
            res.sendStatus(200);
        } else {
            throw "No game";
        }
    } catch (e) {
        res.status(500).send(e);
    }
});

app.post('/api/games/current/update', async (req, res) => {
    try {
        const game = await getGame('current');
        if (!!game && game.state === 'active') {
            const update = req.body as GameUpdate;        
            game.timeRemaining = update.timeRemaining;
            await games.put('current', game, null);
            fireEvent("updategame", game);
            res.sendStatus(200);
        } else {
            throw "No active game";
        }
    } catch (e) {
        res.status(500).send(e);
    }
});

app.put('/api/games/current/:player/:id', async (req, res) => {
    try {
        const game = await getGame('current');
        if (!!game && game.state === 'pending') {
            if (req.params.player === 'home' || req.params.player === 'visitor') {
                const p = await getPlayer(req.params.id);
                if (p) {
                    game[req.params.player] = p.id;
                    (game as any)[req.params.player + 'Name'] = p.name;
                    await games.put('current', game, null);
                    fireEvent("1up", game);
                    res.sendStatus(200);
                } else {
                    console.log(`Unknown player id: ${req.params.id}`);
                    throw 'Unknown player id'
                }
            } else{
                throw 'Unknown player'
            }
        } else {
            throw 'Invalid already state'
        }
    } catch (e) {
        res.status(500).send(e);
    }
});

app.post('/api/games/current/score/:player', async (req, res) => {
    try {
        const game = await getGame('current');
        if (!!game && game.state === 'active') {
            if (req.params.player === 'home') {
                game.homeScore++;
            } else if (req.params.player === 'visitor') {
                game.visitorScore++;
            }
            await games.put('current', game, null);
            fireEvent("score", game);
            res.sendStatus(200);
        } else {
            throw "No active game"
        }
    } catch (e) {
        res.status(500).send(e);
    }
});

app.delete('/api/games/current', async(req, res) => {
    try {
        const game = await getGame('current');
        const home = await getPlayer(game.home);
        const visitor = await getPlayer(game.visitor);

        if (!!home) {
            home.matches++;
            home.points += game.homeScore;
            home.wins += (game.homeScore > game.visitorScore ? 1 : 0);
            await players.put(home.id, home, null);
            fireEvent("stats", home);
        }

        if (!!visitor) {
            visitor.matches++;
            visitor.points += game.homeScore;
            visitor.wins += (game.homeScore < game.visitorScore ? 1 : 0);
            await players.put(visitor.id, visitor, null);
            fireEvent("stats", visitor);
        }

        game.state = 'complete';
        game.timeRemaining = 0;
        await games.put('current', game, null);
        
        fireEvent("gameover");

        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e);
    }
});

const server = app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
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

server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (websocket) => {
        wss.emit("connection", websocket, req);
    })
});

wss.on("connection", (websocketConnection) => {
    websocketConnection.send(JSON.stringify({type: "connect"}));
    console.log('connected!');

    websocketConnection.on("message", async (data) => {
        const cmd = JSON.parse(data.toString()) as Command;
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

