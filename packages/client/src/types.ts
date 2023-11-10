export type Game = {
    state: 'pending'|'active'|'complete'|'abort'|'paused',
    home?: string,
    homeName?: string,
    homeScore: number,
    visitor?: string,
    visitorName?: string,
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
    loses?: number,
    ties?: number,
}
