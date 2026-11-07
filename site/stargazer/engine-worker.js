// The engine's background worker. It loads stargazer.wasm (Stargazer,
// compiled to WebAssembly) and answers the page's requests, so the board
// stays responsive while the engine thinks. All the chess rules live in
// the engine; this file only moves text in and out of its memory.
//
// Requests: {id, call, text, millis}; answers: {id, answer} (the engine's
// JSON, parsed) or {id, error}. Calls: version, new_game (text: a FEN or
// ""), play (text: a move such as "e2e4"), think (millis), state.
// The engine's side of this is web/src/lib.rs in the stargazer repo.

"use strict";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// The engine's only import is a clock; it never reads one itself.
const loading = fetch("stargazer.wasm")
  .then((response) => {
    if (!response.ok) throw new Error(`stargazer.wasm: HTTP ${response.status}`);
    return response.arrayBuffer();
  })
  .then((bytes) => WebAssembly.instantiate(bytes, { env: { now: () => performance.now() } }))
  .then(({ instance }) => instance.exports);

// Write text into the engine's memory, make the call, read the answer back.
function call(engine, name, text, ...numbers) {
  const bytes = encoder.encode(text || "");
  new Uint8Array(engine.memory.buffer, engine.input(bytes.length), bytes.length).set(bytes);
  const length = engine[name](...numbers);
  return decoder.decode(new Uint8Array(engine.memory.buffer, engine.output(), length));
}

const CALLS = new Set(["version", "new_game", "play", "think", "state"]);

self.onmessage = async (event) => {
  const { id, call: name, text, millis } = event.data;
  try {
    if (!CALLS.has(name)) throw new Error(`unknown call ${name}`);
    const engine = await loading;
    const reply = name === "think" ? call(engine, name, "", millis) : call(engine, name, text);
    const answer = name === "version" ? reply : JSON.parse(reply);
    self.postMessage({ id, answer });
  } catch (problem) {
    self.postMessage({ id, error: String(problem) });
  }
};
