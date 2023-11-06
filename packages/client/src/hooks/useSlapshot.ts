import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Game, Player } from "../types";

export enum ConnectionState {
    UNINSTANTIATED,
    CONNECTING,
    CONNECTED,
    BROKEN,
    CLOSING,
    CLOSED,
}

var commandId = 1;

export class Command {
    public id: number;

    constructor(
        public type: string
    ) {
        this.id = commandId++;
    }
}

export class GetCurrentGameCommand extends Command {
    constructor() {
        super('getcurrentgame')
    }
}

export class GetPlayersCommand extends Command {
    constructor() {
        super('getplayers')
    }
}

export class PingCommand extends Command {
    constructor() {
        super('ping')
    }    
}

export interface Message {    
    id: number,
    type: string,
}

export interface ResultMessage<T> extends Message {
    success: boolean,
    result: T
}

export interface GetPlayersMessage extends ResultMessage<Player[]> {    
}

export interface GetCurrentGameMessage extends ResultMessage<Game> {    
}

export interface EventMessage<T = any> extends Message {
    type: 'event',
    event: EventMessageData<T>,
}

export interface EventMessageData<T> {
    name: string,
    data: T
}

export interface Slapshot {
    ready?: boolean,
    connectionState: ConnectionState,
    send: <TCommand extends Command>(command: TCommand, callback?: SendCallback) => void,
    on: <T>(event: string, handler: EventHandler<T>) => void,
    
    //api: (method: string, path: string) => Promise<any>,
}

export type SendCallback = (msg: Message) => boolean | void;
export type EventHandler<T = any> = (event: EventMessage<T>) => void;

export function useSlapshot(hostname: string): Slapshot {
    
    const [connect, setConnect] = useState<boolean>(true);
    const [callbacks] = useState<Map<number, SendCallback>>(new Map<number, SendCallback>());
    const [handlers] = useState<Map<string, EventHandler>>(new Map<string, EventHandler>());
    const [ready, setReady] = useState<boolean>();

    const readyRef = useRef<boolean>();
    readyRef.current = ready;

    const callbacksRef = useRef<Map<number, SendCallback>>();
    callbacksRef.current = callbacks;

    const handlerRef = useRef<Map<string, EventHandler>>();
    handlerRef.current = handlers;

    const { sendMessage, lastMessage, readyState } = useWebSocket('ws://' + hostname + "/websockets", {
        retryOnError: false,
        reconnectAttempts: 2592000000,
        reconnectInterval: 5000,
        shouldReconnect: (e) => true,
    }, connect);

    const connectionState = useMemo<ConnectionState>(() => {
        switch (readyState) {
            case ReadyState.CONNECTING: {
                return ConnectionState.CONNECTING;
            }
            case ReadyState.OPEN: {
                if (!connect) return ConnectionState.BROKEN;                
                return ConnectionState.CONNECTED;
            }
            case ReadyState.CLOSING: {
                return ConnectionState.CLOSING;
            }
            case ReadyState.CLOSED: {
                return ConnectionState.CLOSED;
            }
            default: {
                return ConnectionState.UNINSTANTIATED;
            }
        }        
    }, [readyState, connect]);

    const connectionStateRef = useRef<ConnectionState>();
    connectionStateRef.current = connectionState;

    useEffect(() => {

        function processMessage(msg: MessageEvent<any>) {
            const data = JSON.parse(msg.data);        
            switch (data?.type) {
                case 'connect':
                    console.log('Connected!');
                    setReady(true);
                    break;
                case 'event': {
                    const m = data as EventMessage;
                    const h = handlerRef.current.get(m.event.name);
                    if (h) {
                        h(m);
                    }
                    break;
                }

                default:
                    const m = data as Message;
                    const c = callbacksRef.current.get(m.id);
                    if (c) {
                        if (!c(m)) {
                            callbacksRef.current.delete(m.id);
                        }
                    }
                    break;
                }
        }
        
        if (lastMessage) {
            processMessage(lastMessage);
        }
    }, [sendMessage, lastMessage]);
    
    const send = useCallback(<TCommand extends Command>(command: TCommand, callback?: SendCallback) => {
        if (callback && command.id) {            
            callbacksRef.current.set(command.id, callback);
        }
        sendMessage(JSON.stringify(command), false);
    }, [sendMessage]);
        
    const on = (event: string, handler: EventHandler) => {
        handlerRef.current.set(event, handler);
    }

    const doPing = useCallback(() => {
        try {
            if (readyRef.current) {
                const handle = setTimeout(() => {
                    console.log('Lost ping. You still there?');                    
                    callbacksRef.current.clear();
                    setReady(false);
                    setConnect(false);
                }, 5000);

                send(new PingCommand(), (msg: Message) => {
                    clearTimeout(handle);
                    setConnect(true);
                    return false;
                })
            }
            else {
                setConnect(true);
            }
        } catch (e) {
            console.error(e);
        }
    }, [send]);

    useEffect(() => {
        const handle = setInterval(doPing, 10000);
        return () => clearInterval(handle);
    }, [doPing])

    return {
        ready,
        connectionState,
        send,
        on,
    }
}