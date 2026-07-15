// ============================================================
// constants.ts — Konstanta visual dan ukuran global
// ============================================================

export const GAME_W = 1280;
export const GAME_H = 720;

export const C = {
  // Casino Theme Backgrounds
  BG:           0x0a1024, // Very dark blue
  TABLE_CENTER: 0x1a3375, // Rich blue
  TABLE_EDGE:   0x0f1b40, // Darker blue rim
  TABLE_GLOW:   0x2e66ff, // Neon blue rim glow
  
  // HUD Elements
  SURFACE:      0x16284a,
  SURFACE2:     0x1e3863,
  
  // Accents & Typography
  YELLOW:       0xffd700, // Gold
  BLUE:         0x00d4ff, // Cyan/Neon Blue
  POSITIVE:     0x00e676,
  NEGATIVE:     0xff3b30,
  BLACK:        0x000000,
  WHITE:        0xffffff,
  GRAY:         0x778ca3,
  
  // Specific Icons
  GEM:          0xff33aa, // Pink gem
  ALARM:        0xff3333, // Red alarm indicator
  
  // Tile
  TILE_BG:      0xffffff,
  TILE_BORDER:  0xcccccc,
  TILE_PIP:     0xd31b1b,  // Red pips
  TILE_HL:      0xffd700,  // highlight kartu yang bisa dimainkan
  TILE_DIM:     0x999999,  // kartu yang tidak bisa dimainkan
};

/** Ukuran tile di papan (horizontal, 2:1 ratio) */
export const BOARD_TILE = { W: 72, H: 36, R: 4, PIP: 3, BORDER: 2 };

/** Ukuran tile BALAK di papan (vertikal, tegak 90°, 1:2 ratio) */
export const BALAK_TILE = { W: 36, H: 72, R: 4, PIP: 3, BORDER: 2 };

/** Ukuran tile di tangan pemain (vertikal, 1:2 ratio) */
export const HAND_TILE = { W: 52, H: 104, R: 4, PIP: 3, BORDER: 2 };

/** Ukuran tile lawan (vertikal, kecil, tertutup) */
export const OPP_TILE = { W: 28, H: 56, R: 3 };

/** Posisi pip untuk setiap nilai (relatif terhadap area half-tile 0.0–1.0) */
export const PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[0.5, 0.5]],
  2: [[0.3, 0.3], [0.7, 0.7]],
  3: [[0.3, 0.3], [0.5, 0.5], [0.7, 0.7]],
  4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
  5: [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]],
  6: [[0.3, 0.22], [0.3, 0.5], [0.3, 0.78], [0.7, 0.22], [0.7, 0.5], [0.7, 0.78]],
};

/** Posisi HUD pemain/bot (Casino Style) */
export const POSITIONS = {
  PLAYER:    { x: 180, y: GAME_H - 120 }, // Pojok kiri bawah (Avatar & Info)
  HAND:      { x: GAME_W / 2, y: GAME_H - 65 }, // Tengah bawah (Kartu)
  BOT_LEFT:  { x: 120, y: GAME_H / 2 },    // Kiri tengah
  BOT_TOP:   { x: GAME_W / 2, y: 100 },    // Atas tengah
  BOT_RIGHT: { x: GAME_W - 120, y: GAME_H / 2 }, // Kanan tengah
  BOARD:     { x: GAME_W / 2, y: 350 },     // Tengah
};
