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
        [id: string]: string
    },
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
    audio?: PlayerAudio,
}

export type PlayerAudio = {
    [key: string]: string
}

export interface WSCommand {
    id: number,
    type: string,
}

export interface WSMessage {    
    id: number,
    type: string,
}

export interface ResultMessage<T> extends WSMessage {
    success: boolean,
    result: T
}