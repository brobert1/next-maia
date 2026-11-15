export function mirrorMove(moveUci: string): string {
  const from = mirrorSquare(moveUci.slice(0, 2));
  const to = mirrorSquare(moveUci.slice(2, 4));
  const promotion = moveUci.slice(4); // empty string if no promotion
  return from + to + promotion;
}

export function mirrorSquare(square: string): string {
  return square[0] + (9 - parseInt(square[1], 10));
}

export function mirrorFEN(fen: string): string {
  const [position, activeColor, castling, enPassant, halfmove, fullmove] =
    fen.split(" ");

  return [
    position.split("/").reverse().map(swapCase).join("/"),
    activeColor === "w" ? "b" : "w",
    swapCase(castling),
    enPassant !== "-" ? mirrorSquare(enPassant) : "-",
    halfmove,
    fullmove,
  ].join(" ");
}

/** Swaps piece colors in a FEN rank, or sides in a castling field ("-" is unchanged). */
function swapCase(text: string): string {
  return text.replace(/[A-Za-z]/g, (c) =>
    c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(),
  );
}
