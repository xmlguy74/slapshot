import styled from "@emotion/styled";

export type ContainerProps = {
    justify: string,
}

export const Container = styled('div')<ContainerProps>({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '50vw',
    marginLeft: '2vw',
    marginRight: '2vw'
}, props => ({
    justifyContent: props.justify
}));

export const Avatar = styled.img`
    border: solid 3px #fff;
    border-radius: 10px;
    height: 10vh;
    width: 7vw;
    object-fit: contain;
    padding: 5px;
    background-color:silver;
`

export const Label = styled.div`
    margin-left:2vw;
    margin-right:2vw;
    font-size:36pt;
    text-transform: uppercase;
`

export const Score = styled.div`
    font-family: Scoreboard;
    font-size: 84pt;
    width: 15vw;
    align: center;
    text-align: center;
    color: Aqua;
`