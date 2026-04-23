export type Breakpoint = {
  threshold: number
  interval: number
}

export const attackSpeedTable: Record<string, Breakpoint[]> = {
  ingrid: [
    { threshold: 0, interval: 3.0 },
    { threshold: 60, interval: 2.8 },
    { threshold: 120, interval: 2.6 },
    { threshold: 180, interval: 2.4 },
    { threshold: 240, interval: 2.2 }
  ],
  count_dracula: [
    { threshold: 0, interval: 10.0 },
    { threshold: 50, interval: 9.5 },
    { threshold: 100, interval: 9.0 },
    { threshold: 150, interval: 8.5 },
    { threshold: 200, interval: 8.0 }
  ],
  silas: [
    { threshold: 0, interval: 2.6 },
    { threshold: 50, interval: 2.5 },
    { threshold: 100, interval: 2.35 },
    { threshold: 150, interval: 2.2 },
    { threshold: 200, interval: 2.0 }
  ],
  hex: [
    { threshold: 0, interval: 2.8 },
    { threshold: 50, interval: 2.65 },
    { threshold: 100, interval: 2.5 },
    { threshold: 150, interval: 2.35 },
    { threshold: 200, interval: 2.2 }
  ]
}
