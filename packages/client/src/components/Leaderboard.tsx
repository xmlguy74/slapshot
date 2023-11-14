import { useContext, useEffect, useRef, useState } from "react";
import { SlapshotContext } from "../contexts/SlapshotContext";
import { Column, Container, Header, Row, RowBody } from "./Leaderboard.styled";
import { Player } from "../types";

const PAGE_SIZE = 8;

export interface LeaderboardProps {
}

export function Leaderboard(props: LeaderboardProps) {

    const { players } = useContext(SlapshotContext);    
    
    const [ totalPlayers, setTotalPlayers ] = useState(0);
    const [ currentPage, setCurrentPage ] = useState(1);
    const [ rankings, setRankings ] = useState<{[key: string]: number}>({});
    
    useEffect(() => {
        setTotalPlayers(players.length);

        let totalMatches = 0;
        totalMatches = players
            .map(p => (p.wins ?? 0) + (0.5 * (p.ties ?? 0)))
            .reduce((acc, cv) => acc + cv, totalMatches);

        const rankings: {[key: string]: number} = {};
        players.forEach(p => {
            const r = 
                (0.6 * ((p.wins ?? 0) + (0.5 * (p.ties ?? 0))) / totalMatches) + 
                (0.3 * (p.points ?? 0) / totalMatches) + 
                (0.1 * (p.matches ?? 0) / totalMatches);

            rankings[p.id] = isNaN(r) ? 0 : r;
        });        

        const positions: {[key: string]: number} = {};
        const sortedPlayers = players.sort((a, b) => 
            (rankings[a.id] < rankings[b.id]) ? 1 : 
            (rankings[a.id] > rankings[b.id]) ? -1 :
            a.name.localeCompare(b.name));
        let pos = 0;
        for (let i = 0; i < sortedPlayers.length; i++)
        {
            const currentPlayer = sortedPlayers[i];
            const currentRanking = rankings[currentPlayer.id];

            if (i === 0) {
                positions[currentPlayer.id] = currentRanking === 0 ? Infinity : ++pos;
            } else {
                const prevPlayer = sortedPlayers[i - 1];
                const prevRanking = rankings[prevPlayer.id];

                if (currentRanking === prevRanking) {
                    positions[currentPlayer.id] = positions[prevPlayer.id];
                } else {
                    positions[currentPlayer.id] = currentRanking === 0 ? Infinity : ++pos;
                }                
            }
        }

        setRankings(positions);

    }, [players]);

    useEffect(() => {
        const timer = setInterval(() => {
            const pages = Math.floor(totalPlayers / PAGE_SIZE) + 1;
            const nextPage = (currentPage % pages) + 1;
            setCurrentPage(nextPage);
        }, 7000);
        return () => clearInterval(timer);
    }, [totalPlayers, currentPage]);

    const getRanking = (p: Player) => {
        return rankings[p.id] ?? 0.5;
    }

    return (
        <Container>
            <Header>
                <Row>
                    <RowBody>
                        <Column>Ranking</Column>                
                        <Column>Player</Column>                
                        <Column>Wins</Column>                
                        <Column>Loses</Column>                
                        <Column>Ties</Column>                
                        <Column>Points</Column>                
                    </RowBody>
                </Row>
            </Header>

            {
                players
                    .sort((a, b) => 
                        (rankings[a.id] > rankings[b.id]) ? 1 : 
                        (rankings[a.id] < rankings[b.id]) ? -1 :
                        a.name.localeCompare(b.name))
                    .slice((currentPage - 1) * PAGE_SIZE, ((currentPage - 1) * PAGE_SIZE) + PAGE_SIZE)
                    .map((p, i) => 
                        <Row key={p.id} className="fade-in">
                            <RowBody>                        
                                <Column>{isFinite(getRanking(p)) ? getRanking(p) : '--'}</Column>
                                <Column>{p.name}</Column>                
                                <Column>{p.wins ?? 0}</Column>                                    
                                <Column>{p.loses ?? 0}</Column>                                    
                                <Column>{p.ties ?? 0}</Column>                                    
                                <Column>{p.points ?? 0}</Column>                
                            </RowBody>
                        </Row>)
            }

        </Container>
    );
}