import { useContext } from "react";
import { SlapshotContext } from "../contexts/SlapshotContext";
import { Column, Container, Header, Row, RowBody } from "./Leaderboard.styled";
import { Player } from "../types";

export interface LeaderboardProps {
}

function calcWeight(p: Player): number {
    return p.points ?? 0;
}

export function Leaderboard(props: LeaderboardProps) {

    const { players } = useContext(SlapshotContext);

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
                    .map((p, i) => 
                        <Row key={p.id}>                            
                            <RowBody>                        
                                <Column>{i + 1}</Column>                
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