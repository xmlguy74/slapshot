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

export interface Command {
    id: number,
    type: string,
}

export interface Message {    
    id: number,
    type: string,
}

export interface ResultMessage<T> extends Message {
    success: boolean,
    result: T
}