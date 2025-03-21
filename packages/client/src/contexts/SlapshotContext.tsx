import * as React from "react";
import { Slapshot, useSlapshot } from "../hooks/useSlapshot";
import { Game, Player } from "../types";
import { useGameCache } from "../hooks/useGameCache";

interface SlapshotContextType {
    ss: Slapshot,
    players: Player[],
    currentGame?: Game,
    goal: boolean,
    message?: {
        error: boolean,
        text: string,
    }
}

export const SlapshotContext = React.createContext<SlapshotContextType>(
  {
    ss: null,
    players: [],
    currentGame: null,
    goal: false,
    message: null,
  }
)

export interface SlapshotProviderProps {
    hostname: string,
}

export function SlapshotProvider(props: React.PropsWithChildren<SlapshotProviderProps>) {
    
    const ss = useSlapshot(props.hostname);
    const { players, currentGame, message, goal } = useGameCache(ss);
    
    return (
        <SlapshotContext.Provider value={{ss, players, currentGame, message, goal}}>
            {props.children}
        </SlapshotContext.Provider>
    );
}