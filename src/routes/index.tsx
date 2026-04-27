import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Brain,
  CloudRain,
  Cpu,
  Gamepad2,
  Headphones,
  HeartPulse,
  LineChart,
  Megaphone,
  MonitorPlay,
  Network,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
  Waves,
  BadgeAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

const pillars = [
  { label: "Match Engine", value: "22+1", detail: "players, ball, referee" },
  { label: "Modes", value: "9", detail: "career to co-op seasons" },
  { label: "Online", value: "<50ms", detail: "target input response" },
  { label: "MVP", value: "4 teams", detail: "1 stadium, 1 weather" },
];

const featureGroups = [
  {
    title: "Core Gameplay",
    icon: Gamepad2,
    accent: "primary",
    items: [
      "Adaptive AI difficulty that learns common moves mid-match",
      "Manual and assisted controls with clear risk-reward tuning",
      "Contextual physicality: barges, shirt pulls, off-ball jostling",
      "Dynamic weather and pitch degradation affecting speed, control, and visibility",
      "Passing, shooting, dribbling, tackling, goalkeeping, offside, VAR, and set pieces",
    ],
  },
  {
    title: "Career / Manager",
    icon: Trophy,
    accent: "accent",
    items: [
      "Youth academy scouts prospects with traits, personalities, and growth curves",
      "Transfers with loans, buy options, sell-on clauses, swaps, and release clauses",
      "Morale, chemistry, form arrows, player feuds, agents, and leadership council",
      "Press conferences, media battles, board goals, staff, finances, and injuries",
      "Budget split across transfers, youth, medical staff, analytics, wages, and travel",
    ],
  },
  {
    title: "Online & Social",
    icon: Network,
    accent: "tactical",
    items: [
      "Ranked seasons, online friendlies, co-op seasons, spectator mode, and lobbies",
      "Skill matchmaking with region, connection quality, fair play, and leaderboards",
      "Dedicated servers for competitive goals, fouls, offside, and validation",
      "Custom tournament creator with groups, knockout, VAR, extra-time, and invites",
      "Goal-of-the-week voting, club rivalries, shared training ground, and rewards",
    ],
  },
  {
    title: "Immersion",
    icon: MonitorPlay,
    accent: "warning",
    items: [
      "Dynamic commentary tied to previous matches, rumors, records, and competition",
      "Authentic chants, tifos, VAR reactions, crowd tide, and title pitch invasion",
      "Broadcast overlays, selectable packages, replays, cutscenes, and studio show",
      "Time-of-day progression, camera droplets, orange ball in snow, visible referee traits",
      "On-pitch coaching visuals for lanes, defensive shape, heatmaps, and networks",
    ],
  },
  {
    title: "Customization & Access",
    icon: SlidersHorizontal,
    accent: "primary",
    items: [
      "Create-a-club editor for badge, kits, stadium, rivals, budget, and league",
      "Tactical periodization for attacking, defending, set pieces, and match phases",
      "Controller remap, colorblind modes, high-contrast indicators, large UI, visual cues",
      "Custom difficulty sliders by facet: marking, error, pace, keeper, injury, tactics",
      "Scenario mode for famous comebacks, relegation rescues, and historic challenges",
    ],
  },
  {
    title: "Hardcore Systems",
    icon: Brain,
    accent: "accent",
    items: [
      "Set-piece designer with custom runs, import/export, and shareable routines",
      "Injury realism with carryover timelines and rushed-recovery reinjury risk",
      "Stat-driven form from last five ratings rather than random boosts",
      "Diving as a learnable high-risk trait with penalty or yellow-card outcomes",
      "Hardcore toggles for handball, grass length, tax lines, agent fees, and investigations",
    ],
  },
];

const requirements = [
  { icon: Cpu, title: "Engine", body: "Unity DOTS or Unreal Engine 5, 60 FPS gameplay, <50 ms input feel, scalable PC/console/mobile targets." },
  { icon: Activity, title: "Physics", body: "Ball bounce, spin, air resistance, wet-grass friction, collision layers, IK, ragdoll recovery, and motion matching." },
  { icon: Brain, title: "AI", body: "Utility AI or behavior trees, team coordination, goalkeeper FSM, referee strictness, tactical adaptation, and scouting reports." },
  { icon: Waves, title: "Networking", body: "Server authority for critical events, prediction, interpolation, rollback or deterministic lockstep, NAT traversal, anti-cheat." },
  { icon: BarChart3, title: "Data", body: "Local career saves, online accounts, ELO, leaderboards, cloud saves, progression, event triggers, and relational traits." },
  { icon: Headphones, title: "Audio", body: "FMOD/Wwise dynamic mix, commentary banks, whistle cues, chants, VAR audio, spatialized referee and stadium sound." },
  { icon: ShieldCheck, title: "Security", body: "Validated results, client integrity checks, protected accounts, fair-play telemetry, safe user-generated tournaments." },
  { icon: HeartPulse, title: "Accessibility", body: "Remapping, simplified controls, adjustable game speed, visual audio cues, colorblind-safe overlays, large text." },
];

const roadmap = [
  ["MVP", "Kick-off, local PvP or basic AI, 4 teams, 1 stadium, simple weather, core pass/shoot/tackle."],
  ["High-impact", "Heatmaps, assistant coach tips, sliders, scenario mode, set-piece designer, career morale."],
  ["Franchise", "Deep career, co-op seasons, custom tournaments, commentary context, youth academy, live events."],
  ["Stretch", "Full VAR review, licensed stadiums, cross-platform progression, voice substitutions, advanced social loops."],
];

const pitchSignals: Array<[string, string, LucideIcon]> = [
  ["Adaptive AI", "top-[15%] left-[16%]", Brain],
  ["Weather", "top-[24%] right-[16%]", CloudRain],
  ["Career", "top-[47%] left-[10%]", Trophy],
  ["Co-op", "top-[44%] right-[12%]", Users],
  ["Ref logic", "bottom-[22%] left-[27%]", BadgeAlert],
  ["Analytics", "bottom-[15%] right-[22%]", LineChart],
];

function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="stadium-grid absolute inset-0 opacity-60" />
      <div className="spotlight-sweep pointer-events-none absolute left-1/2 top-0 h-80 w-[42rem] -translate-x-1/2 bg-floodlight/20 blur-3xl" />

      <section className="relative mx-auto grid min-h-[92vh] max-w-7xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
        <div className="space-y-8">
          <nav className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-normal text-muted-foreground">
            <span className="rounded-sm border border-border bg-card/60 px-3 py-1.5">Game Design Bible</span>
            <span>Football simulation scope</span>
          </nav>

          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
              <Sparkles className="h-4 w-4" /> Full features + requirements
            </p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-normal text-foreground sm:text-7xl lg:text-8xl">
              Total football game blueprint.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              A production-ready feature map for a modern football game: on-pitch systems,
              career depth, online play, broadcast presentation, accessibility, and technical requirements.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="stadium" size="lg" asChild>
              <a href="#features">View features</a>
            </Button>
            <Button variant="broadcast" size="lg" asChild>
              <a href="#requirements">Technical requirements</a>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {pillars.map((pillar) => (
              <div key={pillar.label} className="border border-border bg-card/70 p-4 shadow-[var(--shadow-stadium)] backdrop-blur">
                <p className="text-xs font-bold uppercase text-muted-foreground">{pillar.label}</p>
                <p className="mt-2 font-display text-2xl text-primary">{pillar.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{pillar.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden border border-border bg-pitch/70 p-4 shadow-[var(--shadow-stadium)] backdrop-blur pitch-lines">
          <div className="absolute inset-6 border-2 border-pitch-foreground/35" />
          <div className="absolute left-1/2 top-6 h-[calc(100%-3rem)] w-px bg-pitch-foreground/35" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pitch-foreground/35" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-floodlight" />

          {pitchSignals.map(([label, position, TacticalIcon]) => {
            return (
              <div
                key={label}
                className={`absolute ${position} group flex max-w-36 items-center gap-2 border border-border bg-background/80 px-3 py-2 text-sm font-bold text-foreground shadow-lg backdrop-blur transition-transform hover:-translate-y-1`}
              >
                <TacticalIcon className="h-4 w-4 text-primary" />
                <span>{label}</span>
              </div>
            );
          })}

          <div className="absolute bottom-6 left-6 right-6 border border-border bg-background/85 p-5 backdrop-blur">
            <p className="text-xs font-bold uppercase text-accent">Recommended priority</p>
            <p className="mt-2 text-2xl font-bold text-foreground">Start with feel: ball, input, AI, and readable tactics.</p>
          </div>
        </div>
      </section>

      <section id="features" className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Full feature set</p>
            <h2 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">Systems by game area</h2>
          </div>
          <p className="max-w-xl text-muted-foreground">Everything is grouped by implementation domain so the scope can be trimmed for indie, mobile, or franchise production.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {featureGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.title} className="border border-border bg-card/80 p-5 shadow-[var(--shadow-stadium)] backdrop-blur transition-transform hover:-translate-y-1">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center bg-secondary text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-bold text-card-foreground">{group.title}</h3>
                  </div>
                  <span className="h-2 w-12 bg-primary" />
                </div>
                <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section id="requirements" className="relative border-y border-border bg-card/40 py-16 backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-bold uppercase text-accent">Needed requirements</p>
            <h2 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">Technical foundation</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {requirements.map((requirement) => {
              const Icon = requirement.icon;
              return (
                <article key={requirement.title} className="border border-border bg-background/60 p-5 transition-colors hover:bg-secondary/70">
                  <Icon className="mb-5 h-7 w-7 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">{requirement.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{requirement.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Priority order</p>
            <h2 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">Build in waves</h2>
            <p className="mt-4 text-muted-foreground">This roadmap keeps the project playable early, then adds depth, social retention, and expensive presentation last.</p>
          </div>
          <div className="space-y-3">
            {roadmap.map(([phase, body], index) => (
              <article key={phase} className="grid gap-4 border border-border bg-card/75 p-5 backdrop-blur sm:grid-cols-[9rem_1fr]">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center bg-primary font-bold text-primary-foreground">{index + 1}</span>
                  <h3 className="font-bold text-foreground">{phase}</h3>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}