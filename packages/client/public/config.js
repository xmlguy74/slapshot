
var CONFIG = {
    slapshot: "localhost:3000",
    homeAssistant: "ha.home",
    secure: true,
    theme: "retro",
    title: 'Morris',
    subtitle: 'Family Gameroom',
    showDate: true,
    showTime: true,
    showFooter: false,

    mediaPlayer: {
        //entity_id: 'sensor.movie_room_roku_state',
        source: (id, entity, context) => {
            
            // const harmony = context.states.find(s => s.entity_id === 'remote.movie_room_harmony');
            // if (harmony) {
            //     switch (harmony.state) {
            //         case 'on': {
            //             if (harmony.attributes.current_activity?.includes('Game') ?? false) {
            //                 return {
            //                     text: "XBox",
            //                 }
            //             }
            //             break;
            //         }
            //         default: {
            //             return null;
            //         }
            //     }
            // }

            // const player = context.states.find(s => s.entity_id === 'media_player.rec_room_roku');
            // if (player) {
            //     return {
            //         text: player.attributes.source, 
            //         image: player.attributes.entity_picture
            //     }
            // }
        },
        state: (id, entity, context) => {
            // const harmony = context.states.find(s => s.entity_id === 'remote.movie_room_harmony');
            // if (harmony) {
            //     switch (harmony.state) {
            //         case 'on': {
            //             if (harmony.attributes.current_activity?.includes('Game') ?? false) {
            //                 return {
            //                     text: null,
            //                     icon: "BsController"
            //                 }
            //             }

            //             if (harmony.attributes.current_activity?.includes('Roku') ?? false) {
            //                 const player = context.states.find(s => s.entity_id === 'media_player.rec_room_roku');
            //                 if (player) {
            //                     switch (player.attributes.source) {
            //                         case 'Roku': {
            //                             return {
            //                                 icon: 'BsDisplay'
            //                             }
            //                         }
            //                         default: {
            //                             const sensor = context.states.find(s => s.entity_id === 'sensor.movie_room_roku_state');
            //                             return ROKU_STATE_MAP[sensor.state];                                        
            //                         }
            //                     }
            //                 }
            //             }
            //             break;
            //         }
            //         default: {
            //             return {
            //                 text: "Off",
            //                 icon: "BsPower"
            //             }
            //         }
            //     }
            // }
        },
    }
}