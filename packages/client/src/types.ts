export type Game = {
    active: boolean,
    home?: string,
    homeName?: string,
    homeScore: number,
    visitor?: string,
    visitorName?: string,
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