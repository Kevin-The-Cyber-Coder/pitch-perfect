import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CloudRain, Gamepad2, RotateCcw, Shield, Target, Trophy, Users, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

type Team = "home" | "away";
type Weather = "clear" | "rain" | "snow";
type Vec = { x: number; z: number };
type Player = {
  id: number;
  team: Team;
  name: string;
  pos: Vec;
  home: Vec;
  stamina: number;
  hasBall: boolean;
  role: "keeper" | "defender" | "mid" | "forward";
};
type Snapshot = {
  score: { home: number; away: number };
  clock: number;
  message: string;
  stamina: number;
  weather: Weather;
  assisted: boolean;
  aiLevel: number;
  selected: number;
  foul: boolean;
};
type GameState = Snapshot & {
  players: Player[];
  ball: Vec;
  ballHeight: number;
  ballVelocity: Vec;
  ballLift: number;
  possession: Team | null;
  lastTouch: Team;
  keys: Set<string>;
  cpuCooldown: number;
  goalFlash: number;
  tackleCooldown: number;
  learning: { rightLane: number; centerShots: number; sprint: number };
};

type Palette = {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  pitch: string;
  turf: string;
  floodlight: string;
  border: string;
};

const FIELD_X = 52;
const FIELD_Z = 34;
const GOAL_WIDTH = 13;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const moveToward = (from: Vec, to: Vec, amount: number): Vec => {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz) || 1;
  return { x: from.x + (dx / length) * amount, z: from.z + (dz / length) * amount };
};

const formation: Array<Omit<Player, "stamina" | "hasBall" | "pos"> & { home: Vec }> = [
  { id: 0, team: "home", name: "YOU", role: "mid", home: { x: -21, z: 0 } },
  { id: 1, team: "home", name: "H2", role: "defender", home: { x: -36, z: -14 } },
  { id: 2, team: "home", name: "H3", role: "defender", home: { x: -35, z: 14 } },
  { id: 3, team: "home", name: "H4", role: "forward", home: { x: -4, z: -10 } },
  { id: 4, team: "home", name: "H5", role: "forward", home: { x: -2, z: 12 } },
  { id: 5, team: "home", name: "GK", role: "keeper", home: { x: -49, z: 0 } },
  { id: 6, team: "away", name: "A1", role: "mid", home: { x: 21, z: 0 } },
  { id: 7, team: "away", name: "A2", role: "defender", home: { x: 36, z: -14 } },
  { id: 8, team: "away", name: "A3", role: "defender", home: { x: 35, z: 14 } },
  { id: 9, team: "away", name: "A4", role: "forward", home: { x: 4, z: -10 } },
  { id: 10, team: "away", name: "A5", role: "forward", home: { x: 2, z: 12 } },
  { id: 11, team: "away", name: "GK", role: "keeper", home: { x: 49, z: 0 } },
];

const createInitialGame = (): GameState => ({
  players: formation.map((player) => ({ ...player, pos: { ...player.home }, stamina: 100, hasBall: player.id === 0 })),
  ball: { x: -20, z: 0 },
  ballHeight: 0,
  ballVelocity: { x: 0, z: 0 },
  ballLift: 0,
  possession: "home",
  lastTouch: "home",
  score: { home: 0, away: 0 },
  clock: 90,
  message: "Kick-off",
  stamina: 100,
  weather: "clear",
  assisted: true,
  aiLevel: 1,
  selected: 0,
  foul: false,
  keys: new Set(),
  cpuCooldown: 0,
  goalFlash: 0,
  tackleCooldown: 0,
  learning: { rightLane: 0, centerShots: 0, sprint: 0 },
});

function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>(createInitialGame());
  const paletteRef = useRef<Palette | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => createInitialGame());

  const publish = (game: GameState) => {
    const selected = game.players[game.selected];
    setSnapshot({
      score: game.score,
      clock: game.clock,
      message: game.message,
      stamina: selected?.stamina ?? 100,
      weather: game.weather,
      assisted: game.assisted,
      aiLevel: game.aiLevel,
      selected: game.selected,
      foul: game.foul,
    });
  };

  const resetMatch = () => {
    gameRef.current = createInitialGame();
    publish(gameRef.current);
  };

  const cycleWeather = () => {
    const game = gameRef.current;
    game.weather = game.weather === "clear" ? "rain" : game.weather === "rain" ? "snow" : "clear";
    game.message = game.weather === "clear" ? "Clear skies" : game.weather === "rain" ? "Rain slowing the pitch" : "Snow reducing visibility";
    publish(game);
  };

  const toggleAssisted = () => {
    const game = gameRef.current;
    game.assisted = !game.assisted;
    game.message = game.assisted ? "Assisted controls" : "Manual controls";
    publish(game);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      gameRef.current.keys.add(key);
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
      if (key === "q") switchPlayer(gameRef.current);
      if (key === "j") passBall(gameRef.current, "home");
      if (key === "k" || key === " ") shootBall(gameRef.current, "home");
      if (key === "l") tackle(gameRef.current);
    };
    const onKeyUp = (event: KeyboardEvent) => gameRef.current.keys.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const root = getComputedStyle(document.documentElement);
    paletteRef.current = {
      background: root.getPropertyValue("--background").trim(),
      foreground: root.getPropertyValue("--foreground").trim(),
      primary: root.getPropertyValue("--primary").trim(),
      primaryForeground: root.getPropertyValue("--primary-foreground").trim(),
      accent: root.getPropertyValue("--accent").trim(),
      accentForeground: root.getPropertyValue("--accent-foreground").trim(),
      pitch: root.getPropertyValue("--pitch").trim(),
      turf: root.getPropertyValue("--turf").trim(),
      floodlight: root.getPropertyValue("--floodlight").trim(),
      border: root.getPropertyValue("--border").trim(),
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (time: number) => {
      const previous = lastFrameRef.current ?? time;
      const delta = clamp((time - previous) / 16.67, 0.5, 2);
      lastFrameRef.current = time;
      updateGame(gameRef.current, delta);
      drawGame(canvas, gameRef.current, paletteRef.current!);
      publish(gameRef.current);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const minutes = Math.floor(snapshot.clock);
  const seconds = Math.floor((snapshot.clock % 1) * 60).toString().padStart(2, "0");
  const selectedName = gameRef.current.players[snapshot.selected]?.name ?? "YOU";

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-rows-[auto_1fr_auto] gap-3 px-3 py-3 sm:px-5 sm:py-5 lg:grid-cols-[1fr_18rem] lg:grid-rows-[auto_1fr]">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card/80 px-4 py-3 shadow-[var(--shadow-stadium)] backdrop-blur lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center bg-primary text-primary-foreground">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl leading-none text-foreground sm:text-3xl">Touchline Football 3D</h1>
              <p className="text-sm font-semibold text-muted-foreground">
                Home {snapshot.score.home} — {snapshot.score.away} Away · {snapshot.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="font-display text-2xl text-primary tabular-nums">{minutes}:{seconds}</div>
            <Button variant="broadcast" onClick={resetMatch} aria-label="Reset match">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <section className="relative min-h-[360px] overflow-hidden border border-border bg-pitch shadow-[var(--shadow-stadium)] lg:min-h-0">
          <canvas ref={canvasRef} className="block h-full min-h-[360px] w-full" aria-label="Playable 3D football pitch" />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
            <StatusChip icon={Users} label={`Control ${selectedName}`} />
            <StatusChip icon={Shield} label={`AI ${snapshot.aiLevel.toFixed(1)}x`} />
            {snapshot.foul && <StatusChip icon={Zap} label="Advantage" />}
          </div>
          <div className="pointer-events-none absolute right-3 top-3 hidden max-w-[16rem] border border-border bg-background/80 p-3 text-xs font-bold text-foreground shadow-[var(--shadow-stadium)] backdrop-blur sm:block">
            <p className="font-display text-sm text-primary">Manual ball controls</p>
            <p className="mt-1 text-muted-foreground">Aim with WASD/Arrows, then J pass or K/Space shoot. Hold Shift while meeting a loose ball to trap it dead.</p>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 grid gap-2 sm:grid-cols-3">
            <HudMeter label="Stamina" value={snapshot.stamina} />
            <HudMeter label="Weather" value={snapshot.weather === "clear" ? 100 : snapshot.weather === "rain" ? 64 : 42} text={snapshot.weather.toUpperCase()} />
            <HudMeter label="Assist" value={snapshot.assisted ? 100 : 35} text={snapshot.assisted ? "ON" : "MANUAL"} />
          </div>
          {snapshot.clock <= 0 && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-background/75 backdrop-blur-sm">
              <div className="border border-border bg-card p-6 text-center shadow-[var(--shadow-stadium)]">
                <p className="font-display text-4xl text-primary">Full Time</p>
                <p className="mt-2 text-xl font-bold text-foreground">{snapshot.score.home} — {snapshot.score.away}</p>
                <Button className="mt-5" variant="stadium" onClick={resetMatch}>
                  <RotateCcw className="h-4 w-4" /> Rematch
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="grid gap-3 lg:grid-rows-[auto_auto_1fr]">
          <div className="border border-border bg-card/80 p-4 shadow-[var(--shadow-stadium)] backdrop-blur">
            <p className="text-sm font-bold uppercase text-muted-foreground">Keyboard match controls</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-muted-foreground">
              <ControlKey value="WASD" label="Move" />
              <ControlKey value="Shift" label="Sprint / trap" />
              <ControlKey value="Q" label="Switch" />
              <ControlKey value="Aim + J" label="Manual pass" />
              <ControlKey value="Aim + K" label="Manual shot" />
              <ControlKey value="L" label="Tackle" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <Button variant={snapshot.weather === "clear" ? "broadcast" : "stadium"} onClick={cycleWeather}>
              <CloudRain className="h-4 w-4" /> {snapshot.weather}
            </Button>
            <Button variant={snapshot.assisted ? "stadium" : "broadcast"} onClick={toggleAssisted}>
              <Gamepad2 className="h-4 w-4" /> {snapshot.assisted ? "Assisted" : "Manual"}
            </Button>
            <Button variant="broadcast" onClick={() => passBall(gameRef.current, "home")}>
              <Target className="h-4 w-4" /> Pass
            </Button>
            <Button variant="stadium" onClick={() => shootBall(gameRef.current, "home")}>
              <Zap className="h-4 w-4" /> Shoot
            </Button>
          </div>

          <div className="border border-border bg-card/80 p-4 text-sm font-semibold text-muted-foreground shadow-[var(--shadow-stadium)] backdrop-blur">
            <p>5v5 playable 3D prototype with team AI, goalkeepers, fouls, adaptive pressure, weather, assisted/manual shooting, stamina, passing, switching, and scoring.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function updateGame(game: GameState, delta: number) {
  if (game.clock <= 0) return;
  game.clock = clamp(game.clock - delta / 62, 0, 90);
  game.cpuCooldown = Math.max(0, game.cpuCooldown - delta);
  game.goalFlash = Math.max(0, game.goalFlash - delta);
  game.tackleCooldown = Math.max(0, game.tackleCooldown - delta);

  const weatherGrip = game.weather === "clear" ? 1 : game.weather === "rain" ? 0.82 : 0.68;
  const selected = game.players[game.selected];
  const keys = game.keys;
  const input = {
    x: (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
    z: (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0),
  };
  const sprinting = keys.has("shift") && selected.stamina > 2 && (input.x || input.z);
  if (sprinting) game.learning.sprint += 0.004 * delta;
  const inputLength = Math.hypot(input.x, input.z) || 1;
  const speed = (selected.role === "keeper" ? 0.42 : 0.78) * (sprinting ? 1.55 : 1) * weatherGrip;
  if (input.x || input.z) {
    selected.pos.x = clamp(selected.pos.x + (input.x / inputLength) * speed * delta, -FIELD_X + 2, FIELD_X - 2);
    selected.pos.z = clamp(selected.pos.z + (input.z / inputLength) * speed * delta, -FIELD_Z + 2, FIELD_Z - 2);
  }
  selected.stamina = clamp(selected.stamina + (sprinting ? -0.28 : 0.1) * delta, 0, 100);
  game.aiLevel = clamp(1 + game.learning.sprint + game.learning.rightLane + game.learning.centerShots, 1, 3.1);

  for (const player of game.players) {
    if (player.id === selected.id) continue;
    if (player.team === "home") updateHomeSupport(player, game, delta, weatherGrip);
    else updateCpuPlayer(player, game, delta, weatherGrip);
    player.pos.x = clamp(player.pos.x, -FIELD_X + 2, FIELD_X - 2);
    player.pos.z = clamp(player.pos.z, -FIELD_Z + 2, FIELD_Z - 2);
    player.stamina = clamp(player.stamina + 0.06 * delta, 0, 100);
  }

  const carrier = game.players.find((player) => player.hasBall);
  if (carrier) {
    game.ball = { x: carrier.pos.x + (carrier.team === "home" ? 1.7 : -1.7), z: carrier.pos.z };
    game.ballHeight = 0.45;
    game.ballVelocity = { x: 0, z: 0 };
    if (carrier.team === "away" && game.cpuCooldown <= 0) cpuDecision(game, carrier);
  } else {
    game.ball.x += game.ballVelocity.x * delta;
    game.ball.z += game.ballVelocity.z * delta;
    game.ballHeight = Math.max(0, game.ballHeight + game.ballLift * delta);
    game.ballLift -= 0.035 * delta;
    const friction = game.weather === "rain" ? 0.985 : game.weather === "snow" ? 0.975 : 0.968;
    game.ballVelocity.x *= Math.pow(friction, delta);
    game.ballVelocity.z *= Math.pow(friction, delta);
    if (game.ballHeight <= 0) {
      game.ballHeight = 0;
      game.ballLift *= -0.32;
    }
    resolveLooseBall(game);
  }

  keepBallInPlay(game);
  checkGoal(game);
  if (game.clock <= 0) game.message = game.score.home === game.score.away ? "Full time draw" : game.score.home > game.score.away ? "Home win" : "Away win";
}

function updateHomeSupport(player: Player, game: GameState, delta: number, grip: number) {
  const ballSide = game.ball.x > 0 ? 5 : 0;
  const target = player.role === "keeper" ? { x: -49, z: clamp(game.ball.z * 0.45, -8, 8) } : { x: player.home.x + ballSide, z: player.home.z + game.ball.z * 0.12 };
  player.pos = moveToward(player.pos, target, (0.34 + (game.possession === "home" ? 0.14 : 0)) * grip * delta);
}

function updateCpuPlayer(player: Player, game: GameState, delta: number, grip: number) {
  const nearestAway = nearestPlayer(game.players.filter((item) => item.team === "away" && item.role !== "keeper"), game.ball);
  const chaser = nearestAway?.id === player.id || game.possession === "home";
  const laneBias = game.learning.rightLane > 0.18 && game.ball.z > 4 ? -6 : 0;
  const target = player.role === "keeper" ? { x: 49, z: clamp(game.ball.z * 0.5, -8, 8) } : chaser ? { x: game.ball.x - 1.5, z: game.ball.z + laneBias } : { x: player.home.x - 4, z: player.home.z + laneBias };
  player.pos = moveToward(player.pos, target, (0.38 + game.aiLevel * 0.16) * grip * delta);
}

function cpuDecision(game: GameState, carrier: Player) {
  const closeToGoal = carrier.pos.x < -31;
  if (closeToGoal) shootBall(game, "away");
  else passBall(game, "away");
  game.cpuCooldown = 34 / game.aiLevel;
}

function passBall(game: GameState, team: Team) {
  const carrier = controlledCarrier(game, team);
  if (!carrier) return;
  const mates = game.players.filter((player) => player.team === team && player.id !== carrier.id && player.role !== "keeper");
  const forward = team === "home" ? 1 : -1;
  const receiver = mates
    .filter((player) => team === "home" ? player.pos.x > carrier.pos.x - 6 : player.pos.x < carrier.pos.x + 6)
    .sort((a, b) => dist(a.pos, carrier.pos) - dist(b.pos, carrier.pos))[0] ?? mates[0];
  releaseBall(game, carrier, receiver ? receiver.pos : { x: carrier.pos.x + forward * 18, z: carrier.pos.z }, 1.2, 0.18);
  game.message = team === "home" ? "Pass played" : "CPU pass";
}

function shootBall(game: GameState, team: Team) {
  const carrier = controlledCarrier(game, team);
  if (!carrier) return;
  const target = team === "home" ? { x: FIELD_X + 4, z: game.assisted ? 0 : carrier.pos.z * 0.45 } : { x: -FIELD_X - 4, z: 0 };
  if (team === "home") {
    if (Math.abs(carrier.pos.z) < 7) game.learning.centerShots += 0.022;
    if (carrier.pos.z > 7) game.learning.rightLane += 0.016;
  }
  releaseBall(game, carrier, target, team === "home" ? 2.05 : 1.8, 0.52);
  game.message = team === "home" ? "Shot on goal" : "CPU shot";
}

function tackle(game: GameState) {
  if (game.tackleCooldown > 0) return;
  const selected = game.players[game.selected];
  const enemy = nearestPlayer(game.players.filter((player) => player.team === "away"), selected.pos);
  if (!enemy) return;
  game.tackleCooldown = 42;
  if (dist(selected.pos, enemy.pos) < 4.2) {
    const success = Math.random() > 0.28 + game.aiLevel * 0.04;
    if (success) {
      game.players.forEach((player) => (player.hasBall = false));
      selected.hasBall = true;
      game.possession = "home";
      game.lastTouch = "home";
      game.message = "Clean tackle";
      game.foul = false;
    } else {
      game.message = "Foul advantage";
      game.foul = true;
      selected.stamina = clamp(selected.stamina - 8, 0, 100);
    }
  }
}

function switchPlayer(game: GameState) {
  const homeOutfield = game.players.filter((player) => player.team === "home" && player.role !== "keeper");
  const currentIndex = homeOutfield.findIndex((player) => player.id === game.selected);
  const next = homeOutfield[(currentIndex + 1) % homeOutfield.length];
  game.selected = next.id;
  game.message = `Control ${next.name}`;
}

function controlledCarrier(game: GameState, team: Team) {
  const selected = game.players[game.selected];
  if (team === "home" && selected.hasBall) return selected;
  return game.players.find((player) => player.team === team && player.hasBall && player.role !== "keeper") ?? null;
}

function releaseBall(game: GameState, carrier: Player, target: Vec, power: number, lift: number) {
  const dx = target.x - carrier.pos.x;
  const dz = target.z - carrier.pos.z;
  const length = Math.hypot(dx, dz) || 1;
  carrier.hasBall = false;
  game.ball = { x: carrier.pos.x + (dx / length) * 2, z: carrier.pos.z + (dz / length) * 2 };
  game.ballVelocity = { x: (dx / length) * power, z: (dz / length) * power };
  game.ballLift = lift;
  game.ballHeight = 0.5;
  game.possession = null;
  game.lastTouch = carrier.team;
}

function resolveLooseBall(game: GameState) {
  for (const player of game.players) {
    const reach = player.role === "keeper" ? 3.6 : 2.7;
    if (dist(player.pos, game.ball) < reach && game.ballHeight < 1.5) {
      game.players.forEach((item) => (item.hasBall = false));
      player.hasBall = true;
      game.possession = player.team;
      game.lastTouch = player.team;
      game.message = player.team === "home" ? `${player.name} possession` : "CPU possession";
      return;
    }
  }
}

function keepBallInPlay(game: GameState) {
  if (Math.abs(game.ball.z) > FIELD_Z) {
    game.ball.z = clamp(game.ball.z, -FIELD_Z, FIELD_Z);
    game.ballVelocity.z *= -0.58;
    game.message = "Deflection off touchline";
  }
  if (Math.abs(game.ball.x) > FIELD_X + 5) {
    game.ball.x = clamp(game.ball.x, -FIELD_X, FIELD_X);
    game.ballVelocity.x *= -0.48;
  }
}

function checkGoal(game: GameState) {
  if (game.ball.x > FIELD_X && Math.abs(game.ball.z) < GOAL_WIDTH) {
    game.score = { ...game.score, home: game.score.home + 1 };
    resetAfterGoal(game, "away", "Goal for Home");
  } else if (game.ball.x < -FIELD_X && Math.abs(game.ball.z) < GOAL_WIDTH) {
    game.score = { ...game.score, away: game.score.away + 1 };
    resetAfterGoal(game, "home", "Goal for Away");
  }
}

function resetAfterGoal(game: GameState, kickoff: Team, message: string) {
  game.players = formation.map((player) => ({ ...player, pos: { ...player.home }, stamina: 100, hasBall: player.team === kickoff && player.role === "mid" }));
  game.ball = kickoff === "home" ? { x: -20, z: 0 } : { x: 20, z: 0 };
  game.ballVelocity = { x: 0, z: 0 };
  game.ballHeight = 0;
  game.ballLift = 0;
  game.possession = kickoff;
  game.lastTouch = kickoff;
  game.selected = 0;
  game.goalFlash = 60;
  game.message = message;
}

function nearestPlayer(players: Player[], point: Vec) {
  return players.reduce<Player | null>((best, player) => (!best || dist(player.pos, point) < dist(best.pos, point) ? player : best), null);
}

function drawGame(canvas: HTMLCanvasElement, game: GameState, palette: Palette) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const scale = Math.min(width / 132, height / 78);
  const project = (point: Vec, y = 0) => ({
    x: width * 0.5 + point.z * scale * 1.14 + point.x * scale * 0.18,
    y: height * 0.76 + point.z * scale * 0.22 - point.x * scale * 0.56 - y * scale * 1.8,
  });

  const corners = [project({ x: -FIELD_X, z: -FIELD_Z }), project({ x: FIELD_X, z: -FIELD_Z }), project({ x: FIELD_X, z: FIELD_Z }), project({ x: -FIELD_X, z: FIELD_Z })];
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.background);
  sky.addColorStop(1, palette.pitch);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  corners.forEach((corner, index) => (index ? ctx.lineTo(corner.x, corner.y) : ctx.moveTo(corner.x, corner.y)));
  ctx.closePath();
  ctx.fillStyle = palette.pitch;
  ctx.fill();
  ctx.clip();

  for (let i = -4; i <= 4; i++) {
    const a = project({ x: -FIELD_X, z: (i * FIELD_Z) / 4 });
    const b = project({ x: FIELD_X, z: (i * FIELD_Z) / 4 });
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  drawPitchLine(ctx, project, { x: 0, z: -FIELD_Z }, { x: 0, z: FIELD_Z });
  drawPitchLine(ctx, project, { x: -FIELD_X, z: -FIELD_Z }, { x: FIELD_X, z: -FIELD_Z });
  drawPitchLine(ctx, project, { x: FIELD_X, z: -FIELD_Z }, { x: FIELD_X, z: FIELD_Z });
  drawPitchLine(ctx, project, { x: FIELD_X, z: FIELD_Z }, { x: -FIELD_X, z: FIELD_Z });
  drawPitchLine(ctx, project, { x: -FIELD_X, z: FIELD_Z }, { x: -FIELD_X, z: -FIELD_Z });
  drawPitchLine(ctx, project, { x: -FIELD_X, z: -GOAL_WIDTH }, { x: -FIELD_X, z: GOAL_WIDTH }, 5, palette.floodlight);
  drawPitchLine(ctx, project, { x: FIELD_X, z: -GOAL_WIDTH }, { x: FIELD_X, z: GOAL_WIDTH }, 5, palette.floodlight);
  ctx.restore();

  const drawables = [...game.players].sort((a, b) => project(a.pos).y - project(b.pos).y);
  for (const player of drawables) drawPlayer(ctx, project, player, game.selected === player.id, palette);
  drawBall(ctx, project, game, palette);
  drawWeather(ctx, width, height, game.weather, palette);
  if (game.goalFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${game.goalFlash / 110})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawPitchLine(ctx: CanvasRenderingContext2D, project: (point: Vec, y?: number) => { x: number; y: number }, a: Vec, b: Vec, width = 2, color = "rgba(255,255,255,.45)") {
  const pa = project(a);
  const pb = project(b);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
}

function drawPlayer(ctx: CanvasRenderingContext2D, project: (point: Vec, y?: number) => { x: number; y: number }, player: Player, selected: boolean, palette: Palette) {
  const feet = project(player.pos);
  const head = project(player.pos, player.role === "keeper" ? 2.9 : 2.55);
  ctx.fillStyle = "rgba(0,0,0,.32)";
  ctx.beginPath();
  ctx.ellipse(feet.x, feet.y + 3, selected ? 13 : 10, selected ? 6 : 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = selected ? palette.floodlight : "rgba(255,255,255,.36)";
  ctx.lineWidth = selected ? 4 : 2;
  ctx.fillStyle = player.team === "home" ? palette.primary : player.role === "keeper" ? palette.floodlight : palette.accent;
  ctx.beginPath();
  ctx.arc(head.x, head.y, player.role === "keeper" ? 9 : 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = player.team === "home" ? palette.primaryForeground : palette.accentForeground;
  ctx.font = "700 9px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.name, head.x, head.y + 24);
}

function drawBall(ctx: CanvasRenderingContext2D, project: (point: Vec, y?: number) => { x: number; y: number }, game: GameState, palette: Palette) {
  const point = project(game.ball, 0.6 + game.ballHeight);
  ctx.fillStyle = "rgba(0,0,0,.28)";
  const shadow = project(game.ball);
  ctx.beginPath();
  ctx.ellipse(shadow.x, shadow.y + 2, 7, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.floodlight;
  ctx.strokeStyle = palette.background;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawWeather(ctx: CanvasRenderingContext2D, width: number, height: number, weather: Weather, palette: Palette) {
  if (weather === "clear") return;
  ctx.strokeStyle = weather === "rain" ? "rgba(255,255,255,.28)" : palette.foreground;
  ctx.fillStyle = "rgba(255,255,255,.34)";
  for (let i = 0; i < (weather === "rain" ? 70 : 34); i++) {
    const x = (i * 47) % width;
    const y = (i * 83) % height;
    if (weather === "rain") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 9, y + 18);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function StatusChip({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-border bg-background/80 px-2 py-1 text-xs font-bold text-foreground backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </span>
  );
}

function HudMeter({ label, value, text }: { label: string; value: number; text?: string }) {
  return (
    <div className="border border-border bg-background/70 p-2 backdrop-blur">
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-muted-foreground">
        <span>{label}</span>
        <span className="text-primary">{text ?? `${Math.round(value)}%`}</span>
      </div>
      <div className="mt-1 h-2 bg-secondary">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${clamp(value, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function ControlKey({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-border bg-background/60 p-2">
      <p className="font-display text-base text-foreground">{value}</p>
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
