import * as React from "react";
import { Slapshot, useSlapshot } from "../hooks/useSlapshot";
import { Game, Player } from "../types";
import { useGameCache } from "../hooks/useGameCache";

interface SlapshotContextType {
    ss: Slapshot,
    players: Player[],
    currentGame?: Game,
}

export const SlapshotContext = React.createContext<SlapshotContextType>(
  {
    ss: null,
    players: [],
    currentGame: null,
  }
)

export interface SlapshotProviderProps {
    hostname: string,
}

export function SlapshotProvider(props: React.PropsWithChildren<SlapshotProviderProps>) {
    
    const ss = useSlapshot(props.hostname);
    const { players, currentGame } = useGameCache(ss);
    
    return (
        <SlapshotContext.Provider value={{ss, players, currentGame}}>
            {props.children}
        </SlapshotContext.Provider>
    );
}