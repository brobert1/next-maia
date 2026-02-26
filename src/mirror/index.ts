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

  const mirroredPosition = position
    .split("/")
    .reverse()
    .map(swapColorsInRank)
    .join("/");

  return [
    mirroredPosition,
    activeColor === "w" ? "b" : "w",
    swapCastlingRights(castling),
    enPassant !== "-" ? mirrorSquare(enPassant) : "-",
    halfmove,
    fullmove,
  ].join(" ");
}

function swapColorsInRank(rank: string): string {
  return rank.replace(/[A-Za-z]/g, (c) =>
    c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(),
  );
}

function swapCastlingRights(castling: string): string {
  if (castling === "-") return castling;
  return castling.replace(/[A-Za-z]/g, (c) =>
    c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(),
  );
}
