import styled from "@emotion/styled";

export const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;  
    width: 90vw;
    font-size: 28pt;
`
export const Header = styled.div`
font-size: 20pt;
`

export const Row = styled.div`
width: 90vw;
height: 4vh;
padding-bottom: 2vh;
`

export const RowBody = styled.div`
display: flex;
align-items: center;
justify-content: center;
flex-direction: row;  
height: 5vh;
border-radius: 10px;
background-color:#20207688;
box-shadow: rgba(0, 0, 0, 0.22) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
`

export const Column = styled.div`
width: 20vw;
`