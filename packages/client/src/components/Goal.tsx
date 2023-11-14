import { CSSProperties } from 'react';
import { Container } from './Goal.styled';

export interface GoalProps {
    text?: string,
    className?: string
    style?: CSSProperties,
}

export function Goal(props: GoalProps) {
    return (
        <>
            {props.text &&
                <Container>
                    {props.text}
                    <div className="firework" />
                    <div className="firework" />
                    <div className="firework" />
                </Container>
            }
        </>
    );
}