export function mirrorMove(moveUci: string): string {
  const isPromotion = moveUci.length > 4;
  const startSquare = moveUci.substring(0, 2);
  const endSquare = moveUci.substring(2, 4);
  const promotionPiece = isPromotion ? moveUci.substring(4) : "";

  return mirrorSquare(startSquare) + mirrorSquare(endSquare) + promotionPiece;
}

export function mirrorSquare(square: string): string {
  const file = square.charAt(0);
  const rank = (9 - parseInt(square.charAt(1), 10)).toString();
  return file + rank;
}

export function mirrorFEN(fen: string): string {
  const [position, activeColor, castling, enPassant, halfmove, fullmove] =
    fen.split(" ");
  const ranks = position.split("/");
  const mirroredRanks = ranks
    .slice()
    .reverse()
    .map((rank) => swapColorsInRank(rank));
  const mirroredPosition = mirroredRanks.join("/");
  const mirroredActiveColor = activeColor === "w" ? "b" : "w";
  const mirroredCastling = swapCastlingRights(castling);
  const mirroredEnPassant =
    enPassant !== "-" ? mirrorEnPassant(enPassant) : "-";

  return `${mirroredPosition} ${mirroredActiveColor} ${mirroredCastling} ${mirroredEnPassant} ${halfmove} ${fullmove}`;
}

function swapColorsInRank(rank: string): string {
  let swappedRank = "";
  for (const char of rank) {
    if (/[A-Z]/.test(char)) swappedRank += char.toLowerCase();
    else if (/[a-z]/.test(char)) swappedRank += char.toUpperCase();
    else swappedRank += char;
  }
  return swappedRank;
}

function swapCastlingRights(castling: string): string {
  if (castling === "-") return castling;
  let swapped = "";
  for (const char of castling) {
    if (/[A-Z]/.test(char)) swapped += char.toLowerCase();
    else if (/[a-z]/.test(char)) swapped += char.toUpperCase();
    else swapped += char;
  }
  return swapped;
}

function mirrorEnPassant(square: string): string {
  const file = square[0];
  const rank = square[1];
  const mirroredRank = (9 - parseInt(rank, 10)).toString();
  return `${file}${mirroredRank}`;
}
