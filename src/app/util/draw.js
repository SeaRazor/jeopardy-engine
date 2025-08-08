export const drawTournament = (tournamentDetails, drawPlayers) => {
    switch (tournamentDetails.schema) {
        case 'Double Elimination':
            return drawDoubleEliminationTournament(tournamentDetails, drawPlayers);
        case 'Олимпийская':
            return drawOlympicTournament(tournamentDetails, drawPlayers);
        case 'Playoff':
        // return draw64Tournament(tournamentDetails, drawPlayers);
        default:
            return [];

    }

};

const drawDoubleEliminationTournament = (tournamentDetails, drawPlayers) => {
    const participants = tournamentDetails.participants;
    const numberOfGames = tournamentDetails.participantsNum / 4;
    let games = [];

    let seed1Participants = participants.filter(p => p.basket == 1);
    let seed2Participants = participants.filter(p => p.basket == 2);
    let seed3Participants = participants.filter(p => p.basket == 3);
    let seed4Participants = participants.filter(p => p.basket == 4);

    [...Array(numberOfGames)].map((index, i) => {
        const randomFromBasket1 = getRandomArrayElement(seed1Participants);
        const randomFromBasket2 = getRandomArrayElement(seed2Participants);
        const randomFromBasket3 = getRandomArrayElement(seed3Participants);
        const randomFromBasket4 = getRandomArrayElement(seed4Participants);
        const newGame = {
            id: i + 1,
            number: i + 1,
            isTop: true,
            isFinished: false,
            isDrawCompleted: drawPlayers,
            players: drawPlayers
                ? [
                    {playerId: randomFromBasket1.id},
                    {playerId: randomFromBasket2.id},
                    {playerId: randomFromBasket3.id},
                    {playerId: randomFromBasket4.id},
                ]
                : []
        };
        games.push(newGame);
        seed1Participants = seed1Participants.filter(p => p.id != randomFromBasket1.id);
        seed2Participants = seed2Participants.filter(p => p.id != randomFromBasket2.id);
        seed3Participants = seed3Participants.filter(p => p.id != randomFromBasket3.id);
        seed4Participants = seed4Participants.filter(p => p.id != randomFromBasket4.id);


    });
    return games;
};

const drawOlympicTournament = (tournamentDetails, drawPlayers) => {
    const participants = tournamentDetails.participants;
    const numberOfGames = tournamentDetails.participantsNum / 4;
    let games = [];

    let seed1Participants = participants.filter(p => p.basket == 1);
    let seed2Participants = participants.filter(p => p.basket == 2);
    let seed3Participants = participants.filter(p => p.basket == 3);
    let seed4Participants = participants.filter(p => p.basket == 4);

    // Olympic format - create games for first stage (1/16 финала for 32 participants)
    [...Array(numberOfGames)].map((index, i) => {
        const randomFromBasket1 = getRandomArrayElement(seed1Participants);
        const randomFromBasket2 = getRandomArrayElement(seed2Participants);
        const randomFromBasket3 = getRandomArrayElement(seed3Participants);
        const randomFromBasket4 = getRandomArrayElement(seed4Participants);
        const newGame = {
            id: i + 1,
            number: i + 1,
            isTop: true,
            isFinished: false,
            isDrawCompleted: drawPlayers,
            players: drawPlayers
                ? [
                    {playerId: randomFromBasket1.id},
                    {playerId: randomFromBasket2.id},
                    {playerId: randomFromBasket3.id},
                    {playerId: randomFromBasket4.id},
                ]
                : []
        };
        games.push(newGame);
        seed1Participants = seed1Participants.filter(p => p.id != randomFromBasket1.id);
        seed2Participants = seed2Participants.filter(p => p.id != randomFromBasket2.id);
        seed3Participants = seed3Participants.filter(p => p.id != randomFromBasket3.id);
        seed4Participants = seed4Participants.filter(p => p.id != randomFromBasket4.id);
    });
    return games;
};

export const drawTournamentStage = (stage, nextStage, participants) => {
    let games = [];
    let maxGameId = Math.max.apply(Math, stage.games.map(g => g.id));

    // drawFinal
    if (nextStage.isFinal) {
        const newGameId = maxGameId + 1;
        const finalPlayers = participants.filter(p => p.loses <= 1);

        const newGame = {
            id: newGameId,
            number: newGameId,
            isTop: true,
            isFinished: false,
            players: finalPlayers.map(p => ({playerId: p.id}))

        };
        games.push(newGame);
        return games;
    }


    const topGameParticipantsNum = nextStage.topGameParticipantsNum !== null
        ? nextStage.topGameParticipantsNum
        : 4;

    // draw top
    let topSeedPlayers = participants.filter(p => p.loses == 0);
    const topGamesNum = topGameParticipantsNum > 0
        ? topSeedPlayers.length / topGameParticipantsNum
        : 0;
    if (topGamesNum > 0) {
        [...Array(topGamesNum)].map((index, i) => {
            const topGamePlayers = [];
            [...Array(topGameParticipantsNum)].map((index2, j) => {
                let gamePlayer = getRandomArrayElement(topSeedPlayers);
                topSeedPlayers = topSeedPlayers.filter(p => p.id != gamePlayer.id);
                topGamePlayers.push({playerId: gamePlayer.id});
            });
            const newGameId = maxGameId + 1;
            maxGameId++;

            const newGame = {
                id: newGameId,
                number: newGameId,
                isTop: true,
                isFinished: false,
                players: topGamePlayers
            };
            games.push(newGame);
        });
    }

    // draw bottom
    const bottomGameParticipantsNum = nextStage.bottomGameParticipantsNum != null
        ? nextStage.bottomGameParticipantsNum
        : 4;
    let bottomSeedPlayers = participants.filter(p => p.loses == 1);
    const bottomGamesNum = bottomGameParticipantsNum > 0
        ? bottomSeedPlayers.length / bottomGameParticipantsNum
        : 0;
    if (bottomGamesNum > 0) {
        [...Array(bottomGamesNum)].map((index, i) => {
            const bottomGamePlayers = [];
            [...Array(bottomGameParticipantsNum)].map((index2, j) => {
                let gamePlayer = getRandomArrayElement(bottomSeedPlayers);
                bottomSeedPlayers = bottomSeedPlayers.filter(p => p.id != gamePlayer.id);
                bottomGamePlayers.push({playerId: gamePlayer.id});
            });
            const newGameId = maxGameId + 1;
            maxGameId++;

            const newGame = {
                id: newGameId,
                number: newGameId,
                isTop: false,
                isFinished: false,
                players: bottomGamePlayers
            };
            games.push(newGame);
        });
    }
    return games;
};


export const getRandomArrayElement = (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
};
