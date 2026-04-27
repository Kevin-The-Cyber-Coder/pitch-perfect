import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CloudRain, Gamepad2, RotateCcw, Shield, Target, Trophy, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

type Vec = { x: number; y: number };
type Team = "home" | "away";
type Weather = "clear" | "rain";
type Snapshot = {
  player: Vec;
  cpu: Vec;
  keeperHome: Vec;
  keeperAway: Vec;
  ball: Vec;
  score: { home: number; away: number };
  time: number;
  possession: Team;
  message: string;
  stamina: number;
  aiLevel: number;
  weather: Weather;
  assisted: boolean;
  lastGoal?: Team;
};

type GameState = Snapshot & {
  ballVelocity: Vec;
  target: Vec | null;
  sprintTicks: number;
  shotTicks: number;
  lastCpuKick: number;
  lastTouch: Team;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const moveToward = (from: Vec, to: Vec, amount: number): Vec => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / len) * amount, y: from.y + (dy / len) * amount };
};

const createInitialGame = (): GameState => ({
  player: { x: 28, y: 50 },
  cpu: { x: 72, y: 50 },
  keeperHome: { x: 5, y: 50 },
  keeperAway: { x: 95, y: 50 },
  ball: { x: 50, y: 50 },
  ballVelocity: { x: 0, y: 0 },
  target: null,
  score: { home: 0, away: 0 },
  time: 90,
  possession: "home",
  message: "Kick-off",
  stamina: 100,
  aiLevel: 1,
  weather: "clear",
  assisted: true,
  sprintTicks: 0,
  shotTicks: 0,
  lastCpuKick: 0,
  lastTouch: "home",
});

function Index() {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => createInitialGame());
  const gameRef = useRef<GameState>(createInitialGame());
  const keysRef = useRef(new Set<string>());
  const fieldRef = useRef<HTMLDivElement>(null);
  const lastFrameRef = useRef<number | null>(null);
  const runningRef = useRef(true);

  const publish = (game: GameState) => {
    setSnapshot({
      player: game.player,
      cpu: game.cpu,
      keeperHome: game.keeperHome,
      keeperAway: game.keeperAway,
      ball: game.ball,
      score: game.score,
      time: game.time,
      possession: game.possession,
      message: game.message,
      stamina: game.stamina,
      aiLevel: game.aiLevel,
      weather: game.weather,
      assisted: game.assisted,
      lastGoal: game.lastGoal,
    });
  };

  const resetPositions = (kickoff: Team, message: string) => {
    const game = gameRef.current;
    game.player = { x: kickoff === "home" ? 30 : 24, y: 50 };
    game.cpu = { x: kickoff === "away" ? 70 : 76, y: 50 };
    game.keeperHome = { x: 5, y: 50 };
    game.keeperAway = { x: 95, y: 50 };
    game.ball = { x: 50, y: 50 };
    game.ballVelocity = { x: 0, y: 0 };
    game.possession = kickoff;
    game.lastTouch = kickoff;
    game.target = null;
    game.message = message;
    game.lastGoal = kickoff === "home" ? "away" : "home";
  };

  const resetMatch = () => {
    gameRef.current = createInitialGame();
    publish(gameRef.current);
  };

  const kickBall = (team: Team, power: number, aim?: Vec) => {
    const game = gameRef.current;
    const origin = team === "home" ? game.player : game.cpu;
    if (distance(origin, game.ball) > 8) return;

    const target = aim ?? (team === "home" ? { x: 99, y: 50 } : { x: 1, y: 50 });
    const dx = target.x - game.ball.x;
    const dy = target.y - game.ball.y;
    const len = Math.hypot(dx, dy) || 1;
    const assist = game.assisted ? (team === "home" ? 0.28 : 0.18) : 0;
    const goalY = team === "home" ? 50 : 50;
    const guidedY = target.y * (1 - assist) + goalY * assist;
    const gdx = target.x - game.ball.x;
    const gdy = guidedY - game.ball.y;
    const glen = Math.hypot(gdx, gdy) || len;

    game.ballVelocity = { x: (gdx / glen) * power, y: (gdy / glen) * power };
    game.possession = team;
    game.lastTouch = team;
    game.message = team === "home" ? "Shot away" : "Counter attack";
    if (team === "home") game.shotTicks += power > 0.78 ? 1 : 0;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current.add(event.key.toLowerCase());
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
      if (event.key.toLowerCase() === "j") kickBall("home", 0.72, { x: 82, y: gameRef.current.ball.y });
      if (event.key.toLowerCase() === "k" || event.key === " ") kickBall("home", 1.18, { x: 99, y: 50 });
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    runningRef.current = true;
    const step = (timeStamp: number) => {
      const previous = lastFrameRef.current ?? timeStamp;
      const delta = clamp((timeStamp - previous) / 16.67, 0.5, 2);
      lastFrameRef.current = timeStamp;
      const game = gameRef.current;
      if (game.time > 0) updateGame(game, delta);
      publish(game);
      if (runningRef.current) requestAnimationFrame(step);
    };
    const frame = requestAnimationFrame(step);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  const updateGame = (game: GameState, delta: number) => {
    game.time = clamp(game.time - delta / 60, 0, 90);

    const keys = keysRef.current;
    const input = {
      x: (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0),
      y: (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0),
    };
    const sprinting = keys.has("shift") && game.stamina > 4;
    if (sprinting) game.sprintTicks += 1;
    const inputLen = Math.hypot(input.x, input.y) || 1;
    const weatherDrag = game.weather === "rain" ? 0.82 : 1;
    const sprintBoost = sprinting ? 1.58 : 1;
    const playerSpeed = 0.62 * sprintBoost * weatherDrag;

    if (input.x || input.y) {
      game.target = null;
      game.player = {
        x: clamp(game.player.x + (input.x / inputLen) * playerSpeed * delta, 4, 96),
        y: clamp(game.player.y + (input.y / inputLen) * playerSpeed * delta, 7, 93),
      };
    } else if (game.target) {
      if (distance(game.player, game.target) > 1.2) game.player = moveToward(game.player, game.target, 0.5 * delta);
    }

    game.stamina = clamp(game.stamina + (sprinting ? -0.22 : 0.11) * delta, 0, 100);
    game.aiLevel = clamp(1 + game.sprintTicks / 520 + game.shotTicks / 8, 1, 2.4);

    const cpuGoal = game.possession === "away" || game.ball.x > 47 ? game.ball : { x: 62, y: game.ball.y };
    const cpuSpeed = (0.44 + game.aiLevel * 0.12) * weatherDrag;
    game.cpu = moveToward(game.cpu, cpuGoal, cpuSpeed * delta);
    game.cpu.x = clamp(game.cpu.x, 4, 96);
    game.cpu.y = clamp(game.cpu.y, 7, 93);

    game.keeperHome.y = clamp(game.ball.y, 39, 61);
    game.keeperAway.y = clamp(game.ball.y, 39, 61);

    if (distance(game.player, game.ball) < 4.2 && Math.hypot(game.ballVelocity.x, game.ballVelocity.y) < 0.36) {
      game.ball = moveToward(game.ball, { x: game.player.x + 3.8, y: game.player.y }, 0.9 * delta);
      game.possession = "home";
      game.lastTouch = "home";
      game.message = "Home possession";
    }

    if (distance(game.cpu, game.ball) < 4.4 && timeSinceCpuKick(game) > 28) {
      game.possession = "away";
      game.lastTouch = "away";
      game.lastCpuKick = performance.now();
      const closeToGoal = game.ball.x < 36;
      kickBall("away", closeToGoal ? 1.06 : 0.66, closeToGoal ? { x: 1, y: 50 } : { x: 34, y: game.player.y });
    }

    const friction = game.weather === "rain" ? 0.982 : 0.972;
    game.ball.x += game.ballVelocity.x * delta;
    game.ball.y += game.ballVelocity.y * delta;
    game.ballVelocity.x *= Math.pow(friction, delta);
    game.ballVelocity.y *= Math.pow(friction, delta);

    if (game.ball.y < 5 || game.ball.y > 95) {
      game.ball.y = clamp(game.ball.y, 5, 95);
      game.ballVelocity.y *= -0.72;
    }

    if (distance(game.keeperAway, game.ball) < 5.5 && game.ball.x > 91) {
      game.ballVelocity = { x: -0.74, y: (game.ball.y - 50) * 0.035 };
      game.message = "Away keeper save";
    }
    if (distance(game.keeperHome, game.ball) < 5.5 && game.ball.x < 9) {
      game.ballVelocity = { x: 0.74, y: (game.ball.y - 50) * 0.035 };
      game.message = "Home keeper save";
    }

    if (game.ball.x >= 99 && game.ball.y > 38 && game.ball.y < 62) {
      game.score = { ...game.score, home: game.score.home + 1 };
      resetPositions("away", "Goal for Home");
    } else if (game.ball.x <= 1 && game.ball.y > 38 && game.ball.y < 62) {
      game.score = { ...game.score, away: game.score.away + 1 };
      resetPositions("home", "Goal for Away");
    } else if (game.ball.x < 0 || game.ball.x > 100) {
      game.ball.x = clamp(game.ball.x, 2, 98);
      game.ballVelocity.x *= -0.55;
      game.message = "Ball back in play";
    }

    if (game.time <= 0) game.message = game.score.home === game.score.away ? "Full time draw" : game.score.home > game.score.away ? "Home win" : "Away win";
  };

  const timeSinceCpuKick = (game: GameState) => performance.now() - game.lastCpuKick;

  const setPointerTarget = (clientX: number, clientY: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    gameRef.current.target = {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 4, 96),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 7, 93),
    };
  };

  const toggleWeather = () => {
    const game = gameRef.current;
    game.weather = game.weather === "clear" ? "rain" : "clear";
    game.message = game.weather === "rain" ? "Rain on" : "Clear skies";
    publish(game);
  };

  const toggleAssisted = () => {
    const game = gameRef.current;
    game.assisted = !game.assisted;
    game.message = game.assisted ? "Assisted controls" : "Manual controls";
    publish(game);
  };

  const minutes = Math.floor(snapshot.time);
  const seconds = Math.floor((snapshot.time % 1) * 60).toString().padStart(2, "0");
  const matchOver = snapshot.time <= 0;

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-rows-[auto_1fr_auto] gap-3 px-3 py-3 sm:px-5 sm:py-5 lg:grid-cols-[1fr_18rem] lg:grid-rows-[auto_1fr]">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card/80 px-4 py-3 shadow-[var(--shadow-stadium)] backdrop-blur lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center bg-primary text-primary-foreground">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl leading-none text-foreground sm:text-3xl">Touchline Football</h1>
              <p className="text-sm font-semibold text-muted-foreground">Home {snapshot.score.home} — {snapshot.score.away} Away</p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-display text-2xl text-primary tabular-nums">
            {minutes}:{seconds}
          </div>
        </header>

        <section className="relative min-h-[360px] overflow-hidden border border-border bg-pitch shadow-[var(--shadow-stadium)] pitch-lines lg:min-h-0">
          <div
            ref={fieldRef}
            className="relative h-full min-h-[360px] cursor-crosshair overflow-hidden"
            onPointerDown={(event) => setPointerTarget(event.clientX, event.clientY)}
            onPointerMove={(event) => {
              if (event.buttons) setPointerTarget(event.clientX, event.clientY);
            }}
          >
            <div className="absolute inset-4 border-2 border-pitch-foreground/50" />
            <div className="absolute left-1/2 top-4 h-[calc(100%-2rem)] w-px bg-pitch-foreground/50" />
            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pitch-foreground/50 sm:h-36 sm:w-36" />
            <div className="absolute left-4 top-[38%] h-[24%] w-7 border-y-2 border-r-2 border-pitch-foreground/50" />
            <div className="absolute right-4 top-[38%] h-[24%] w-7 border-y-2 border-l-2 border-pitch-foreground/50" />
            <div className="absolute left-0 top-[40%] h-[20%] w-2 bg-floodlight" />
            <div className="absolute right-0 top-[40%] h-[20%] w-2 bg-floodlight" />
            {snapshot.weather === "rain" && <div className="rain-lines pointer-events-none absolute inset-0 opacity-60" />}

            <PlayerMarker label="YOU" point={snapshot.player} variant="home" />
            <PlayerMarker label="CPU" point={snapshot.cpu} variant="away" />
            <PlayerMarker label="GK" point={snapshot.keeperHome} variant="keeper" />
            <PlayerMarker label="GK" point={snapshot.keeperAway} variant="keeper" />
            <div
              className="absolute z-20 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-background bg-floodlight text-[8px] font-black text-accent-foreground shadow-lg transition-transform"
              style={{ left: `${snapshot.ball.x}%`, top: `${snapshot.ball.y}%` }}
            >
              ●
            </div>

            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <StatusChip icon={Zap} label={snapshot.message} />
              <StatusChip icon={Shield} label={`AI ${snapshot.aiLevel.toFixed(1)}x`} />
            </div>

            {matchOver && (
              <div className="absolute inset-0 z-30 grid place-items-center bg-background/70 backdrop-blur-sm">
                <div className="border border-border bg-card p-6 text-center shadow-[var(--shadow-stadium)]">
                  <p className="font-display text-4xl text-primary">Full Time</p>
                  <p className="mt-2 text-xl font-bold text-foreground">{snapshot.score.home} — {snapshot.score.away}</p>
                  <Button className="mt-5" variant="stadium" onClick={resetMatch}>
                    <RotateCcw className="h-4 w-4" /> Rematch
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="grid gap-3 lg:grid-rows-[auto_auto_1fr]">
          <div className="border border-border bg-card/80 p-4 shadow-[var(--shadow-stadium)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold uppercase text-muted-foreground">Stamina</span>
              <span className="font-bold text-primary">{Math.round(snapshot.stamina)}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden bg-secondary">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${snapshot.stamina}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <Button variant={snapshot.weather === "rain" ? "stadium" : "broadcast"} onClick={toggleWeather}>
              <CloudRain className="h-4 w-4" /> {snapshot.weather === "rain" ? "Rain" : "Clear"}
            </Button>
            <Button variant={snapshot.assisted ? "stadium" : "broadcast"} onClick={toggleAssisted}>
              <Gamepad2 className="h-4 w-4" /> {snapshot.assisted ? "Assisted" : "Manual"}
            </Button>
            <Button variant="broadcast" onClick={() => kickBall("home", 0.72, { x: 82, y: gameRef.current.ball.y })}>
              <Target className="h-4 w-4" /> Pass
            </Button>
            <Button variant="stadium" onClick={() => kickBall("home", 1.18, { x: 99, y: 50 })}>
              <Zap className="h-4 w-4" /> Shoot
            </Button>
          </div>

          <div className="border border-border bg-card/80 p-4 text-sm font-semibold text-muted-foreground shadow-[var(--shadow-stadium)] backdrop-blur">
            <div className="grid grid-cols-2 gap-3">
              <ControlKey value="WASD" label="Move" />
              <ControlKey value="Shift" label="Sprint" />
              <ControlKey value="J" label="Pass" />
              <ControlKey value="K" label="Shoot" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function PlayerMarker({ point, label, variant }: { point: Vec; label: string; variant: "home" | "away" | "keeper" }) {
  const className =
    variant === "home"
      ? "bg-primary text-primary-foreground"
      : variant === "away"
        ? "bg-accent text-accent-foreground"
        : "bg-secondary text-secondary-foreground";

  return (
    <div
      className={`absolute z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-pitch-foreground text-[10px] font-black shadow-lg transition-transform sm:h-10 sm:w-10 ${className}`}
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      {label}
    </div>
  );
}

function StatusChip({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-border bg-background/80 px-2 py-1 text-xs font-bold text-foreground backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </span>
  );
}

function ControlKey({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-border bg-background/60 p-3">
      <p className="font-display text-lg text-foreground">{value}</p>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
