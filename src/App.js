import React from 'react';
import { Provider, useSelector } from 'react-redux';
import { createSlice, configureStore } from '@reduxjs/toolkit';
import fiveLetterDictionary from './words_five.js';
import wordleDictionary from './wordle_dictionary.js';
import './App.css';

const allWords = new Set(fiveLetterDictionary.map(w => w.toUpperCase()));
const wordleWords = wordleDictionary.map(w => w.toUpperCase());
const alphaSet = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

function range(n) {
    return [...Array(n).keys()];
}

function todayGameIndex() {
    return parseInt((new Date()).getTime() / 86400000) - 18795;
}

function currentHistory({ hits, guesses, gameWon, gameLost }) {
    return { hits, guesses, gameWon, gameLost };
}

const persistedHistory = localStorage.getItem('history') ? JSON.parse(localStorage.getItem('history')) : [];

const gameSlice = createSlice({
    name: 'game',
    initialState: {
        gameIndex: null,
        targetWord: null,
        targetSet: null,
        hits: null,
        guessedLetters: null,
        guesses: null,
        currentGuess: null,
        history: persistedHistory,
    },
    reducers: {
        newGame: (state, action) => {
            const gameIndex = action.payload.gameIndex;
            state.gameIndex = gameIndex;
            state.targetWord = wordleWords[gameIndex];
            state.hits = [];
            state.guesses = [];
            state.currentGuess = '';
            state.wrongGuess = false;
            state.gameWon = false;
            state.gameLost = false;
            if (state.history.length > gameIndex) {
                const current = state.history[gameIndex];
                if (current) {
                    state.hits = current.hits;
                    state.guesses = current.guesses;
                    state.gameWon = current.gameWon;
                    state.gameLost = current.gameLost;
                }
            }
        },
        handleKey: (state, action) => {
            if (state.gameWon || state.gameLost) {
                return;
            }
            state.wrongGuess = false;
            const letter = action.payload.key;
            if (alphaSet.has(letter) && state.currentGuess.length < 5) {
                state.currentGuess += letter;
            } else if ((letter === 'BACKSPACE') || (letter === 'DELETE')) {
                state.currentGuess = state.currentGuess.slice(0, -1);
            } else if (letter === 'ENTER') {
                if (allWords.has(state.currentGuess)) {
                    state.guesses.push(state.currentGuess);
                    for (let i=0; i < 5; i++) {
                        if (state.targetWord[i] === state.currentGuess[i]) {
                            state.hits.push(state.currentGuess[i]);
                        }
                    }
                    if (state.currentGuess === state.targetWord) {
                        state.gameWon = true;
                    } else if (state.guesses.length === 6) {
                        state.gameLost = true;
                    }
                    if (state.gameWon || state.gameLost) {
                        state.history[state.gameIndex] = currentHistory(state);
                    }
                    state.currentGuess = '';
                } else {
                    state.wrongGuess = true;
                }
            }
        },
    },
});

const { newGame, handleKey } = gameSlice.actions;
const store = configureStore({
    reducer: gameSlice.reducer,
});

const selectGameIndex = state => state.gameIndex;
const selectTargetWord = state => state.targetWord;
const selectGuesses = state => state.guesses;
const selectCurrentGuess = state => state.currentGuess;
const selectWrongGuess = state => state.wrongGuess;
const selectGameWon = state => state.gameWon;
const selectGameLost = state => state.gameLost;
const selectGameOver = state => {
    return state.gameWon || state.gameLost;
};
const selectHistory = state => state.history;

const selectIsHit = letter => state => {
    const hits = new Set(state.hits);
    return hits.has(letter);
};

const selectIsPartial = letter => state => {
    const hits = new Set(state.hits);
    const guessed = new Set(state.guesses.join('').split(''));
    const target = new Set(state.targetWord.split(''));
    return !hits.has(letter) && guessed.has(letter) && target.has(letter);
};

const selectIsPartialIndex = (letter, index) => state => {
    const target = new Set(state.targetWord);
    return target.has(letter) && target[index] !== letter;
}

const selectIsMiss = letter => state => {
    const hits = new Set(state.hits);
    const guessed = new Set(state.guesses.join('').split(''));
    const target = new Set(state.targetWord.split(''));
    return !hits.has(letter) && guessed.has(letter) && !target.has(letter);
};

store.subscribe(() => {
    const state = store.getState();
    let history = state.history.slice();
    history[state.gameIndex] = currentHistory(state);
    localStorage.setItem('history', JSON.stringify(history));
});

function Block({ rowIndex, blockIndex }) {
    const target = useSelector(selectTargetWord);
    const guesses = useSelector(selectGuesses);
    const currentGuess = useSelector(selectCurrentGuess);
    const wrongGuess = useSelector(selectWrongGuess);
    let letter = '';
    if (rowIndex < guesses.length) {
        letter = guesses[rowIndex][blockIndex];
    }
    const isHit = (target[blockIndex] === letter);
    const isPartial = useSelector(selectIsPartialIndex(letter, blockIndex));
    let currentGuessRow = false;
    if ((rowIndex === guesses.length) && (blockIndex < currentGuess.length)) {
        currentGuessRow = true;
        letter = currentGuess[blockIndex];
    }
    let className = 'block';
    if (currentGuessRow && wrongGuess) {
        className += ' wrong';
    } else if (isHit) {
        className += ' hit';
    } else if (isPartial) {
        className += ' partial';
    } else if ((letter !== '') && (rowIndex < guesses.length)) {
        className += ' miss';
    }
    return (
        <div className={className}>{letter}</div>
    );
}

function Row({ rowIndex }) {
    return (
        <div className="row">
        {range(5).map(i => <Block key={i} rowIndex={rowIndex} blockIndex={i} />)}
        </div>
    );
}

function Grid() {
    return (
        <div className="grid">
        {range(6).map(i => <Row key={i} rowIndex={i} />)}
        </div>
    );
}

function KeyboardKey({ letter }) {
    const isHit = useSelector(selectIsHit(letter));
    const isPartial = useSelector(selectIsPartial(letter));
    const isMiss = useSelector(selectIsMiss(letter));
    let className = 'keyboardKey';
    if (isHit) {
        className += ' hit';
    } else if (isPartial) {
        className += ' partial';
    } else if (isMiss) {
        className += ' miss';
    }
    const handle = () => {
        store.dispatch(handleKey({ key: letter }));
    };
    return (
        <div className={className} onClick={handle}>
            {letter}
        </div>
    );
}

function KeyboardRow({ letters }) {
    return (
        <div className="keyboardRow">
            {letters.split('').map(letter => <KeyboardKey key={letter} letter={letter} />)}
        </div>
    );
}

function KeyboardControlRow() {
    const handleDelete = () => {
        store.dispatch(handleKey({ key: 'BACKSPACE' }));
    };
    const handleEnter = () => {
        store.dispatch(handleKey({ key: 'ENTER' }));
    };
    return (
        <div className="keyboardRow controlRow">
            <div className="keyboardKey controlKey" onClick={handleDelete}>DEL</div>
            <div className="keyboardKey controlKey" onClick={handleEnter}>ENTER</div>
        </div>
    );
}

function Keyboard() {
    const gameOver = useSelector(selectGameOver);
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    const handleKeyUp = (e) => {
        store.dispatch(handleKey({ key: e.key.toUpperCase() }));
    }
    React.useEffect(() => {
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);
    return (
        <div className="keyboard">
            {rows.map(letters => <KeyboardRow key={letters} letters={letters} />)}
            {!gameOver && <KeyboardControlRow />}
        </div>
    );
}

function Title() {
    const gameIndex = useSelector(selectGameIndex);
    return (
        <code>\\execute &lt;wordle[{gameIndex}]&gt;</code>
    );
}

function GameResult() {
    const gameWon = useSelector(selectGameWon);
    const gameLost = useSelector(selectGameLost);
    return (
        <div className="gameResult">
            {gameWon && <code>\\\n0d3_br34ch3d --j4ckingOut</code>}
            {gameLost && <code>\\\em3rgencyShutd0wn --j4ckingOut</code>}
        </div>
    );
}

function HistoryRow({ gameIndex, game }) {
    const onClick = () => {
        store.dispatch(newGame({ gameIndex: gameIndex }));
    };
    return (
        <div className="historyRow" onClick={onClick}>
            <code>{gameIndex}</code>
        {game && game.gameWon && <code>--success: {game.guesses.length}</code>}
        {game && game.gameLost && <code>_x ERROR x_</code>}
        </div>
    );
}

function History() {
    const gameOver = useSelector(selectGameOver);
    const history = useSelector(selectHistory);
    const maxIndex = todayGameIndex();
    return (
        <div className="history">
        {gameOver && range(maxIndex+1).reverse().map(index => <HistoryRow key={index} gameIndex={index} game={history[index]} />)}
        </div>
    );
}

function App() {
    store.dispatch(newGame({ gameIndex: todayGameIndex() }));
    return (
        <Provider store={store}>
            <div className="App">
                <Title />
                <Grid />
                <Keyboard />
                <GameResult />
                <History />
            </div>
        </Provider>
    );
}

export default App;
