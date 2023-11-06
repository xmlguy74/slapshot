import { useContext, useEffect, useRef, useState } from "react";
import { SlapshotContext } from "../contexts/SlapshotContext";
import { Column, Container, Header, Row, RowBody } from "./Leaderboard.styled";
import { Player } from "../types";

const PAGE_SIZE = 7;

export interface LeaderboardProps {
}

function calcWeight(p: Player): number {
    return p.points ?? 0;
}

export function Leaderboard(props: LeaderboardProps) {

    const { players } = useContext(SlapshotContext);
    
    const [ totalPlayers, setTotalPlayers ] = useState(0);
    const [ currentPage, setCurrentPage ] = useState(1);
    
    useEffect(() => {
        setTotalPlayers(players.length);
    }, [players]);

    useEffect(() => {
        const timer = setInterval(() => {
            const pages = Math.floor(totalPlayers / PAGE_SIZE) + 1;
            const nextPage = (currentPage % pages) + 1;
            setCurrentPage(nextPage);
        }, 7000);
        return () => clearInterval(timer);
    }, [totalPlayers, currentPage]);

    return (
        <Container>
            <Header>
                <Row>
                    <RowBody>
                        <Column>Ranking</Column>                
                        <Column>Player</Column>                
                        <Column>Matches</Column>                
                        <Column>Points</Column>                
                        <Column>Wins</Column>                
                    </RowBody>
                </Row>
            </Header>

            {
                players
                    .sort((a, b) => calcWeight(a) < calcWeight(b) ? 1 : -1)
                    .slice((currentPage - 1) * PAGE_SIZE, ((currentPage - 1) * PAGE_SIZE) + PAGE_SIZE)
                    .map((p, i) => 
                        <Row key={p.id}>                            
                            <RowBody>                        
                                <Column>{((currentPage - 1) * PAGE_SIZE) + i + 1}</Column>
                                <Column>{p.name}</Column>                
                                <Column>{p.matches ?? 0}</Column>                
                                <Column>{p.points ?? 0}</Column>                
                                <Column>{p.wins ?? 0}</Column>                                    
                            </RowBody>
                        </Row>)
            }

        </Container>
    );
}