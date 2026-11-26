// ABOUT on a phone: each person's v1 icon, as polygons in grid cells (x right, y up from the
// baseline), each with its palette colour; v1 draws them side by side (bd v1 port-ui skips that).

/** One polygon: its palette index and its corners in grid cells. */
export type IconShape = [palette: number, corners: [number, number][]];
/** A person's icon: its polygons, drawn in order. */
export type PersonIcon = IconShape[];

export const PEOPLE_ICONS: PersonIcon[] = [
  [
    [
      4,
      [
        [0, -3],
        [1, -3],
        [2, -2],
        [1, -1],
      ],
    ],
    [
      4,
      [
        [1, 0],
        [2, -1],
        [2, 0],
      ],
    ],
    [
      3,
      [
        [0, 0],
        [0, -3],
        [1, -2],
        [1, -1],
      ],
    ],
  ],
  [
    [
      5,
      [
        [0, 0],
        [0, -1],
        [1, -2],
        [3, -2],
        [1, 0],
      ],
    ],
    [
      10,
      [
        [0, 0],
        [0, -1],
        [1, -2],
        [1, 0],
      ],
    ],
    [
      10,
      [
        [0, -3],
        [1, -3],
        [0, -2],
      ],
    ],
  ],
  [
    [
      7,
      [
        [0, 0],
        [1, -3],
        [2, -3],
        [2, -1],
        [1, 0],
      ],
    ],
    [
      9,
      [
        [0, 0],
        [0, -2],
        [1, -3],
        [1, -1],
      ],
    ],
    [
      9,
      [
        [2, 0],
        [3, 0],
        [3, -1],
      ],
    ],
  ],
];
