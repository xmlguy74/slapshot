export type Game = {
    active: boolean,
    home?: string,
    homeScore: number,
    visitor?: string,
    visitorScore: number,
}

export type Player = {
    id: string,
    name: string,    
    avatar: string,
    matches?: number,
    points?: number,
    wins?: number,
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