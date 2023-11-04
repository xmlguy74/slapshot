import React, { CSSProperties } from 'react';
import { Avatar, Container, Label, Score } from './Player.styled';

export enum PlayerMode {
    Home,
    Visitor,
}

export interface PlayerProps {
    className?: string
    style?: CSSProperties,
    mode: PlayerMode,
    name?: string,
    score: number,
}

export function Player(props: PlayerProps) {

    return (
        <Container justify={(props.mode === PlayerMode.Home ? 'left' : 'right')} className={props.className}>
            { props.mode === PlayerMode.Home && <>
                <Score>{props.score}</Score>
                <Avatar src="/www/home.png"></Avatar>            
                <Label>{props.name}</Label>
            </>
            }

            { props.mode === PlayerMode.Visitor && <>
                <Label>{props.name}</Label>
                <Avatar src="/www/visitors.png"></Avatar>            
                <Score>{props.score}</Score>
            </>            
            }
        </Container>
    );
}