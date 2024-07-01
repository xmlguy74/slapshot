export const STATE_OFF           = 49;
export const STATE_TAPIN         = 50;
export const STATE_PLAYING       = 51;
export const STATE_TIMEOUT       = 52;
export const STATE_GOAL          = 53;
export const STATE_1UP           = 54;
export const STATE_NOGOAL        = 55;
export const STATE_GAMEOVER      = 56;

export type GameMessage = {
    id?: string,
    error: boolean, 
    text: string,
    sticky: boolean,
}

export type Notify = {
    text: string,
    options?: NotifyOptions,
}

export type NotifyOptions = {
    id?: string,
    error?: boolean,
}

export type Manager = {
    player: string,
    name: string,
    score: number,
    status: string,
}

export type Game = {
    state: number,
    timeRemaining: number,
    muteSound: boolean,
    home: Manager,
    visitor: Manager,
    issues: {
        [id: string]: string,
    }
}

export type Player = {
    id: string,
    name: string,    
    avatar: string,
    matches?: number,
    points?: number,
    wins?: number,
    loses?: number,
    ties?: number,
}

export const DefaultGame = {
    state: STATE_OFF,
    timeRemaining: 0,
    muteSound: false,
    home: {
        player: "",
        name: "",
        score: 0,
        status: "",
    },
    visitor: { 
        player: "",
        name: "",
        score: 0,
        status: "",
    },
    issues: {},
};