export type Game = {
    state: 'pending'|'active'|'complete'|'abort',
    home?: string,
    homeScore: number,
    visitor?: string,
    visitorScore: number,
    timeRemaining?: number,
}

export type Player = {
    id: string,
    name: string,    
    avatar: string,
    matches?: number,
    points?: number,
    wins?: number,
}

export type GameUpdate = {
    timeRemaining: number;
}

export interface MQTTCommand {
    command: 'new'|'tapin'|'start'|'restart'|'abort'|'score'|'update'|'end',
    [key: string]: any,
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