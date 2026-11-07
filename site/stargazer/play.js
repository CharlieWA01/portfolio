// The play page (stargazer.html): draws the board, takes your clicks, and
// asks the engine (engine-worker.js) for legal moves and its replies. The
// page has no chess rules of its own: which moves are legal, check, and
// how the game ends all come from the engine.

"use strict";

// How long the engine thinks per move, in milliseconds (full strength,
// one think time: portfolio DECISIONS.md, 2026-11-07).
const THINK_MS = 1000;

const PIECE_NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const ENDINGS = {
  stalemate: "Stalemate: a draw.",
  repetition: "Draw: the same position three times.",
  "fifty-moves": "Draw: fifty moves without a capture or a pawn move.",
  "insufficient-material": "Draw: neither side can checkmate.",
};

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const movesEl = document.getElementById("moves");
const thoughtEl = document.getElementById("thought");
const promotionEl = document.getElementById("promotion");
const versionEl = document.getElementById("version");
const buttons = {
  white: document.getElementById("new-white"),
  black: document.getElementById("new-black"),
  flip: document.getElementById("flip"),
};

// --- Talking to the engine ---------------------------------------------

const worker = new Worker("stargazer/engine-worker.js");
const waiting = new Map();
let nextId = 1;

worker.onmessage = (event) => {
  const { id, answer, error } = event.data;
  const pending = waiting.get(id);
  waiting.delete(id);
  if (error) pending.reject(new Error(error));
  else pending.resolve(answer);
};

function ask(call, text, millis) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve, reject });
    worker.postMessage({ id, call, text, millis });
  });
}

// --- The game ------------------------------------------------------------

let game = null; // the engine's state: {fen, turn, check, status, legal}
let you = "w"; // the side you play
let whiteAtBottom = true;
let selected = null; // the square of the piece you picked up
let lastMove = null; // e.g. "e2e4"
let sans = []; // the moves so far, in chess notation
let firstMover = "w";
let round = 0; // bumped by each new game, so a late reply from the last one is ignored

// Start a game; `fen` sets up a position instead of the usual start.
async function newGame(side, fen = "") {
  round += 1;
  press = null;
  endDrag();
  const thisRound = round;
  you = side;
  whiteAtBottom = side === "w";
  selected = null;
  lastMove = null;
  sans = [];
  thoughtEl.textContent = "";
  hidePromotion();
  let state = await ask("new_game", fen);
  if (state.error) {
    console.warn(`Not a position I can set up (${state.error}); starting a normal game.`);
    state = await ask("new_game", "");
  }
  if (thisRound !== round) return;
  game = state;
  firstMover = state.turn;
  update(thisRound);
}

// Show the new state; if it's the engine's turn, let it move.
function update(thisRound) {
  render();
  if (game.status !== "playing") {
    statusEl.textContent = endingText();
  } else if (game.turn === you) {
    statusEl.textContent = game.check ? "Check! Your move." : "Your move.";
  } else {
    statusEl.textContent = "Stargazer is thinking…";
    engineMove(thisRound);
  }
}

function endingText() {
  if (game.status === "checkmate") {
    return game.turn === you ? "Checkmate. Stargazer wins." : "Checkmate. You win!";
  }
  return ENDINGS[game.status] || "Game over.";
}

async function engineMove(thisRound) {
  try {
    const thought = await ask("think", "", THINK_MS);
    if (thisRound !== round) return;
    const played = await ask("play", thought.move);
    if (thisRound !== round) return;
    thoughtEl.textContent =
      thought.depth > 0
        ? `Stargazer searched ${thought.depth} half-moves ahead and rates its position ${thought.score} (in pawns).`
        : "Stargazer had only one legal move.";
    record(thought.move, played);
    update(thisRound);
  } catch (problem) {
    showProblem(problem);
  }
}

async function yourMove(move) {
  selected = null;
  hidePromotion();
  try {
    const played = await ask("play", move);
    if (played.error) throw new Error(played.error);
    record(move, played);
    update(round);
  } catch (problem) {
    showProblem(problem);
  }
}

function record(move, played) {
  lastMove = move;
  sans.push(played.san);
  game = played;
}

function showProblem(problem) {
  statusEl.textContent = "Something went wrong with the engine. Start a new game to try again.";
  console.error(problem);
}

// --- Clicking on the board ---------------------------------------------

function yourTurn() {
  return game && game.status === "playing" && game.turn === you;
}

function onSquare(square) {
  if (!yourTurn()) return;
  const piece = pieceOn(square);
  if (selected) {
    const moves = game.legal.filter((m) => m.slice(0, 2) === selected && m.slice(2, 4) === square);
    if (moves.length === 1) return yourMove(moves[0]);
    if (moves.length > 1) return showPromotion(moves);
  }
  // Pick up one of your own pieces (if it can move), or put it down.
  const yours = piece && (piece === piece.toUpperCase() ? "w" : "b") === you;
  selected = yours && square !== selected && movesFrom(square).length ? square : null;
  render();
}

function movesFrom(square) {
  return game.legal.filter((m) => m.slice(0, 2) === square);
}

// --- Dragging a piece ----------------------------------------------------
// Press on one of your pieces and move: it follows the pointer (mouse,
// finger or pen) and drops on the square you let go over. A press that
// doesn't move is an ordinary click, so click-then-click still works.

const DRAG_START_PX = 5; // how far the pointer moves before it's a drag
let press = null; // {square, x, y, pointerId} while the button is down
let dragFrom = null; // the square being dragged from, once dragging
let ghost = null; // the piece image following the pointer
let swallowClick = false; // set for a moment after a drop

boardEl.addEventListener("pointerdown", (event) => {
  const cell = event.target.closest(".square");
  if (!cell || event.button !== 0 || !yourTurn()) return;
  const square = cell.dataset.square;
  if (!movesFrom(square).length) return;
  press = { square, x: event.clientX, y: event.clientY, pointerId: event.pointerId, size: cell.offsetWidth };
});

boardEl.addEventListener("pointermove", (event) => {
  if (!press || event.pointerId !== press.pointerId) return;
  if (!dragFrom) {
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_START_PX) return;
    dragFrom = press.square;
    // The board redraws during a drag; it, not the square, keeps the
    // pointer (only once dragging, so a plain click still reaches its square).
    boardEl.setPointerCapture(event.pointerId);
    selected = dragFrom;
    ghost = pieceImage(pieceOn(dragFrom));
    ghost.className = "drag-ghost";
    ghost.width = ghost.height = press.size;
    document.body.append(ghost);
    render();
  }
  ghost.style.transform = `translate(${event.clientX - press.size / 2}px, ${event.clientY - press.size / 2}px)`;
});

boardEl.addEventListener("pointerup", (event) => {
  if (!press || event.pointerId !== press.pointerId) return;
  press = null;
  if (!dragFrom) return; // no drag: the click that follows does the work
  const from = dragFrom;
  endDrag();
  // The click that ends a drag isn't a click (it may never reach a
  // square at all, so the flag clears itself straight after).
  swallowClick = true;
  setTimeout(() => (swallowClick = false));
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".square");
  const to = target && boardEl.contains(target) ? target.dataset.square : null;
  const moves = to ? movesFrom(from).filter((m) => m.slice(2, 4) === to) : [];
  if (moves.length === 1) return yourMove(moves[0]);
  if (moves.length > 1) return showPromotion(moves);
  // Dropped somewhere it can't go: the piece goes back, still picked up.
  render();
});

boardEl.addEventListener("pointercancel", () => {
  press = null;
  if (dragFrom) {
    endDrag();
    render();
  }
});

function endDrag() {
  dragFrom = null;
  ghost?.remove();
  ghost = null;
}

// A pawn reaching the last rank: choose what it becomes.
function showPromotion(moves) {
  promotionEl.replaceChildren();
  for (const letter of ["q", "r", "b", "n"]) {
    const move = moves.find((m) => m[4] === letter);
    if (!move) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "promote";
    button.setAttribute("aria-label", `Promote to a ${PIECE_NAMES[letter]}`);
    button.append(pieceImage(you === "w" ? letter.toUpperCase() : letter));
    button.addEventListener("click", () => yourMove(move));
    promotionEl.append(button);
  }
  promotionEl.hidden = false;
  promotionEl.querySelector("button").focus();
}

function hidePromotion() {
  promotionEl.hidden = true;
  promotionEl.replaceChildren();
}

// --- Drawing -------------------------------------------------------------

// The pieces from the FEN's first field: "e4" -> "N", or undefined.
function placement() {
  const squares = {};
  game.fen.split(" ")[0].split("/").forEach((row, index) => {
    const rank = 8 - index;
    let file = 0;
    for (const letter of row) {
      if (/\d/.test(letter)) file += Number(letter);
      else squares["abcdefgh"[file++] + rank] = letter;
    }
  });
  return squares;
}

let pieces = {};
function pieceOn(square) {
  return pieces[square];
}

function pieceImage(letter) {
  const image = document.createElement("img");
  const colour = letter === letter.toUpperCase() ? "w" : "b";
  image.src = `stargazer/pieces/${colour}${letter.toUpperCase()}.svg`;
  image.alt = "";
  image.draggable = false;
  return image;
}

function render() {
  pieces = placement();
  const targets = selected ? movesFrom(selected).map((m) => m.slice(2, 4)) : [];
  const kingInCheck = game.check ? (game.turn === "w" ? "K" : "k") : null;
  const ranks = whiteAtBottom ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = whiteAtBottom ? "abcdefgh" : "hgfedcba";
  const cells = [];
  for (const rank of ranks) {
    for (const file of files) {
      const square = file + rank;
      const piece = pieces[square];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "square";
      cell.dataset.square = square;
      // a1 is a dark square.
      const dark = ("abcdefgh".indexOf(file) + rank) % 2 === 1;
      cell.classList.add(dark ? "dark" : "light");
      if (square === selected) cell.classList.add("selected");
      if (square === dragFrom) cell.classList.add("drag-from");
      if (targets.includes(square)) cell.classList.add(piece ? "capture" : "target");
      if (lastMove && (lastMove.slice(0, 2) === square || lastMove.slice(2, 4) === square)) {
        cell.classList.add("last");
      }
      if (piece && piece === kingInCheck) cell.classList.add("check");
      const colour = piece && (piece === piece.toUpperCase() ? "white" : "black");
      cell.setAttribute(
        "aria-label",
        piece ? `${square}, ${colour} ${PIECE_NAMES[piece.toLowerCase()]}` : square,
      );
      if (piece) cell.append(pieceImage(piece));
      if (file === files[0]) cell.append(label("rank", rank));
      if (rank === ranks[7]) cell.append(label("file", file));
      cell.addEventListener("click", () => {
        if (swallowClick) swallowClick = false;
        else onSquare(square);
      });
      cells.push(cell);
    }
  }
  boardEl.replaceChildren(...cells);
  renderMoves();
}

function label(kind, text) {
  const span = document.createElement("span");
  span.className = `coord ${kind}`;
  span.setAttribute("aria-hidden", "true");
  span.textContent = text;
  return span;
}

// Numbered pairs: "1. e4 e5". If Black moved first, the first pair is "1. … e5".
function renderMoves() {
  const list = firstMover === "b" ? ["…", ...sans] : sans;
  movesEl.replaceChildren();
  for (let i = 0; i < list.length; i += 2) {
    const item = document.createElement("li");
    item.textContent = list.slice(i, i + 2).join(" ");
    movesEl.append(item);
  }
}

// --- Start ---------------------------------------------------------------

buttons.white.addEventListener("click", () => newGame("w"));
buttons.black.addEventListener("click", () => newGame("b"));
buttons.flip.addEventListener("click", () => {
  whiteAtBottom = !whiteAtBottom;
  if (game) render();
});

ask("version")
  .then((version) => {
    // "Stargazer 0.2.0": link to that release (its source and the file).
    versionEl.textContent = version;
    versionEl.href = `https://github.com/CharlieWA01/stargazer/releases/tag/v${version.split(" ")[1]}`;
    // A link can set up a position: stargazer.html#fen=<FEN> (you play the
    // side to move).
    const fen = location.hash.startsWith("#fen=") ? decodeURIComponent(location.hash.slice(5)) : "";
    const side = fen.split(" ")[1] === "b" ? "b" : "w";
    return newGame(side, fen);
  })
  .catch((problem) => {
    statusEl.textContent = "Sorry, the engine couldn't start in this browser.";
    console.error(problem);
  });
