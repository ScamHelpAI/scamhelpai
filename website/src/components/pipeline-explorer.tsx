"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  PIPELINE_EDGES,
  PIPELINE_STEPS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  STEP_POSITIONS,
  type StepId,
  type StepKind,
} from "@/lib/pipeline-steps";
import { cn } from "@/lib/utils";

const DRAG_THRESHOLD_PX = 5;
/** Part of the board that always stays inside the frame while panning. */
const PAN_MARGIN_PX = 160;
const PAN_KEY_STEP_PX = 48;
const TRACE_LINE_MS = 330;

const kindTagClass: Record<StepKind, string> = {
  ui: "bg-[#ece8e1] text-[#56534b]",
  det: "bg-[#eef1fc] text-[#2e3f99]",
  ai: "bg-[#fff3df] text-[#8a4b00]",
  agent: "bg-[#fbe9e7] text-[#8e1f17]",
};

const kindLogClass: Record<StepKind, string> = {
  ui: "text-[#a39e93]",
  det: "text-[#9db0f2]",
  ai: "text-[#ffc366]",
  agent: "text-[#f0a08f]",
};

type TraceLine = { at: number; tag: string; kind: StepKind; text: string };

type Pan = { x: number; y: number };

type PanDrag = { startX: number; startY: number; origin: Pan; moved: boolean };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function edgePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { d: string; tx: number; ty: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy) * 1.2) {
    const sx = dx > 0 ? a.x + NODE_WIDTH : a.x;
    const sy = a.y + NODE_HEIGHT / 2;
    const tx = dx > 0 ? b.x : b.x + NODE_WIDTH;
    const ty = b.y + NODE_HEIGHT / 2;
    const mx = (sx + tx) / 2;
    return { d: `M${sx} ${sy} C${mx} ${sy} ${mx} ${ty} ${tx} ${ty}`, tx, ty };
  }
  const sx = a.x + NODE_WIDTH / 2;
  const sy = dy > 0 ? a.y + NODE_HEIGHT : a.y;
  const tx = b.x + NODE_WIDTH / 2;
  const ty = dy > 0 ? b.y : b.y + NODE_HEIGHT;
  const my = (sy + ty) / 2;
  return { d: `M${sx} ${sy} C${sx} ${my} ${tx} ${my} ${tx} ${ty}`, tx, ty };
}

function KindTag({ kind, label }: { kind: StepKind; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-extrabold tracking-[0.06em]",
        kindTagClass[kind],
      )}
    >
      {label}
    </span>
  );
}

export function PipelineExplorer() {
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [flipped, setFlipped] = useState<Partial<Record<StepId, boolean>>>({});
  const [selected, setSelected] = useState<StepId>("input");
  const [active, setActive] = useState<StepId | null>(null);
  const [done, setDone] = useState<Partial<Record<StepId, boolean>>>({});
  const [logs, setLogs] = useState<TraceLine[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const panRef = useRef<PanDrag | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  function panTo(x: number, y: number) {
    const frame = frameRef.current;
    const width = frame?.clientWidth ?? STAGE_WIDTH;
    const height = frame?.clientHeight ?? STAGE_HEIGHT;
    setPan({
      x: clamp(x, PAN_MARGIN_PX - STAGE_WIDTH, width - PAN_MARGIN_PX),
      y: clamp(y, PAN_MARGIN_PX - STAGE_HEIGHT, height - PAN_MARGIN_PX),
    });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: pan,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = panRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      // Capturing only after real movement retargets the click to the frame, so a pan never flips a block.
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    panTo(drag.origin.x + dx, drag.origin.y + dy);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = {
      ArrowLeft: [PAN_KEY_STEP_PX, 0],
      ArrowRight: [-PAN_KEY_STEP_PX, 0],
      ArrowUp: [0, PAN_KEY_STEP_PX],
      ArrowDown: [0, -PAN_KEY_STEP_PX],
    }[event.key];
    if (!step) return;
    event.preventDefault();
    panTo(pan.x + step[0], pan.y + step[1]);
  }

  function flip(id: StepId) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
    setSelected(id);
  }

  function runTrace() {
    // Clear in place: the unmount cleanup holds this same array.
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current.length = 0;
    setRunning(true);
    setFinished(false);
    setLogs([]);
    setDone({});
    setActive(null);

    let delay = 0;
    PIPELINE_STEPS.forEach((step, i) => {
      timersRef.current.push(
        window.setTimeout(() => {
          setActive(step.id);
          setSelected(step.id);
          if (i > 0) {
            const prev = PIPELINE_STEPS[i - 1].id;
            setDone((d) => ({ ...d, [prev]: true }));
          }
        }, delay),
      );
      step.trace.forEach(([at, text], j) => {
        timersRef.current.push(
          window.setTimeout(
            () =>
              setLogs((l) => [
                ...l,
                { at, tag: step.logTag, kind: step.kind, text },
              ]),
            delay + 250 + j * TRACE_LINE_MS,
          ),
        );
      });
      delay += 450 + step.trace.length * TRACE_LINE_MS;
    });
    timersRef.current.push(
      window.setTimeout(() => {
        setActive(null);
        setDone(Object.fromEntries(PIPELINE_STEPS.map((s) => [s.id, true])));
        setRunning(false);
        setFinished(true);
      }, delay),
    );
  }

  const selectedIndex = PIPELINE_STEPS.findIndex((s) => s.id === selected);
  const current = PIPELINE_STEPS[selectedIndex];

  function selectOffset(offset: number) {
    const n = PIPELINE_STEPS.length;
    setSelected(PIPELINE_STEPS[(selectedIndex + offset + n) % n].id);
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-8 pt-12 pb-9">
        <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3.5">
          <p className="text-lg font-extrabold tracking-[0.12em] text-[#b8650a]">
            TRANSPARENT AI
          </p>
          <h2 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
            Want to learn how it&apos;s made?
          </h2>
          <p className="max-w-3xl text-xl leading-relaxed text-[#56534b]">
            Every check runs through the same pipeline. Drag the board to look
            around, click a block to flip it over, then run a trace to watch
            what each model and tool does.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex h-14 items-center gap-2.5 rounded-full bg-foreground px-6 text-lg text-background transition-colors hover:bg-black focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-trust disabled:bg-[#8a867c]"
            onClick={runTrace}
            disabled={running}
          >
            <PlayIcon className="size-5 fill-current" aria-hidden />
            {running
              ? "Running…"
              : finished
                ? "Run it again"
                : "Run a sample trace"}
          </button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="border-2"
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setFlipped({});
            }}
          >
            <RotateCcwIcon aria-hidden />
            Reset view
          </Button>
        </div>
      </div>

      <div
        ref={frameRef}
        className="relative cursor-grab touch-none overflow-hidden rounded-3xl border border-border bg-[#fbfaf7] select-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-trust active:cursor-grabbing"
        style={{ height: STAGE_HEIGHT }}
        tabIndex={0}
        role="group"
        aria-label="Pipeline diagram. Drag the board or use the arrow keys to pan."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          panRef.current = null;
        }}
        onPointerCancel={() => {
          panRef.current = null;
        }}
        onKeyDown={onKeyDown}
      >
        <div
          className="absolute top-0 left-0 bg-[radial-gradient(#e4e0d8_1.4px,transparent_1.4px)] bg-size-[24px_24px]"
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <div className="pointer-events-none absolute top-4 left-5 flex items-center gap-4 text-sm font-semibold text-[#56534b]">
            <KindTag kind="ui" label="INPUT · UI" />
            <KindTag kind="det" label="DETERMINISTIC" />
            <KindTag kind="ai" label="AI MODEL" />
            <KindTag kind="agent" label="AGENT" />
            <span>Drag to pan · Click to flip</span>
          </div>
          <div className="pointer-events-none absolute top-14 left-[280px] h-[600px] w-[808px] rounded-3xl border-2 border-dashed border-brand-light bg-brand/5" />
          <p className="pointer-events-none absolute top-[66px] left-[300px] text-sm font-extrabold text-[#b8650a]">
            API server · Bun + Hono
          </p>

          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
          >
            {PIPELINE_EDGES.map(([from, to, dashed]) => {
              const { d, tx, ty } = edgePath(
                STEP_POSITIONS[from],
                STEP_POSITIONS[to],
              );
              const on = active === to || (running && done[from] && done[to]);
              return (
                <g key={`${from}-${to}`}>
                  <path
                    d={d}
                    fill="none"
                    strokeWidth={2.5}
                    className={cn(
                      "transition-[stroke] duration-300",
                      on
                        ? "animate-edge-flow stroke-[#b8650a] [stroke-dasharray:8_8]"
                        : "stroke-[#cfc9be]",
                      !on && dashed && "[stroke-dasharray:6_6]",
                    )}
                  />
                  <circle
                    cx={tx}
                    cy={ty}
                    r={5}
                    className={on ? "fill-[#b8650a]" : "fill-[#cfc9be]"}
                  />
                </g>
              );
            })}
          </svg>

          {PIPELINE_STEPS.map((step) => {
            const pos = STEP_POSITIONS[step.id];
            const isFlipped = !!flipped[step.id];
            const isActive = active === step.id;
            return (
              <button
                key={step.id}
                type="button"
                className="group absolute cursor-pointer text-left perspective-[1100px] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-trust"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
                aria-pressed={isFlipped}
                aria-label={`Step ${step.num}, ${step.title}. ${isFlipped ? `In: ${step.in}. Does: ${step.does}. Out: ${step.out}.` : step.sub}. Press to flip and inspect.`}
                onClick={() => flip(step.id)}
              >
                <span
                  className={cn(
                    "absolute inset-0 transition-transform duration-600 ease-(--ease-senior) transform-3d motion-reduce:transition-none",
                    isFlipped && "rotate-y-180",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-0 flex flex-col rounded-[18px] border-2 bg-card px-4 py-3.5 shadow-[0_8px_20px_rgba(28,28,28,.06)] backface-hidden transition-[border-color,box-shadow] duration-300",
                      isActive
                        ? "border-brand shadow-[0_0_0_6px_rgba(255,173,44,.35),0_12px_28px_rgba(184,101,10,.18)]"
                        : selected === step.id
                          ? "border-foreground"
                          : "border-[#e4e0d8]",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <KindTag kind={step.kind} label={step.kindLabel} />
                      <span className="flex items-center gap-2 text-[13px] font-extrabold text-[#8a867c]">
                        <span
                          className={cn(
                            "size-2.5 shrink-0 rounded-full",
                            isActive
                              ? "animate-pulse bg-brand motion-reduce:animate-none"
                              : done[step.id]
                                ? "bg-risk-low"
                                : "bg-[#e4e0d8]",
                          )}
                        />
                        {step.num}
                      </span>
                    </span>
                    <span className="mt-3 block text-[21px] leading-[26px] font-extrabold">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-[15px] leading-5 text-[#56534b]">
                      {step.sub}
                    </span>
                    <span className="mt-auto flex items-center gap-1.5 text-xs font-bold text-[#8a867c]">
                      <RotateCcwIcon className="size-3.5" aria-hidden />
                      Click to flip
                    </span>
                  </span>
                  <span
                    className={cn(
                      "absolute inset-0 flex rotate-y-180 flex-col gap-1.5 rounded-[18px] bg-foreground px-4 py-3.5 text-white backface-hidden",
                      isActive && "shadow-[0_0_0_6px_rgba(255,173,44,.35)]",
                    )}
                  >
                    <span className="text-xs font-extrabold tracking-[0.08em] text-brand-light">
                      {step.title}
                    </span>
                    {(
                      [
                        ["In", step.in],
                        ["Does", step.does],
                        ["Out", step.out],
                      ] as const
                    ).map(([label, text]) => (
                      <span key={label} className="text-sm leading-[19px]">
                        <b className="text-brand-light">{label}</b> {text}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-7 pb-14">
        <section
          aria-label="Inspector"
          className="flex min-w-0 flex-[999_1_640px] flex-col gap-4.5 rounded-3xl border border-border bg-card px-6 py-7 sm:px-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-extrabold tracking-widest text-[#8a867c]">
                INSPECTOR · STEP {current.num}
              </span>
              <h3 className="text-[34px] leading-10 font-extrabold">
                {current.title}
              </h3>
            </div>
            <KindTag kind={current.kind} label={current.kindLabel} />
          </div>
          <p className="text-[19px] leading-[29px] text-[#3a3832]">
            {current.why}
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {(
              [
                ["WHAT GOES IN", current.inCode],
                ["WHAT COMES OUT", current.outCode],
              ] as const
            ).map(([label, code]) => (
              <div key={label} className="flex min-w-0 flex-col gap-2">
                <span className="text-[15px] font-extrabold tracking-[0.06em] text-[#56534b]">
                  {label}
                </span>
                <pre className="overflow-x-auto rounded-xl bg-foreground px-4 py-3.5 font-mono text-sm leading-[21px] whitespace-pre text-background">
                  {code}
                </pre>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-[15px] font-extrabold tracking-[0.06em] text-[#56534b]">
              WHAT HAPPENS, STEP BY STEP
            </span>
            <ol className="flex list-decimal flex-col gap-1.5 pl-6 text-lg leading-[27px]">
              {current.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          {current.tools.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <span className="text-[15px] font-extrabold tracking-[0.06em] text-[#56534b]">
                TOOLS IT CAN CALL
              </span>
              <div className="flex flex-wrap gap-2">
                {current.tools.map((t) => (
                  <code
                    key={t}
                    className="inline-flex h-8 items-center rounded-lg bg-[#fff3df] px-3 font-mono text-sm font-medium"
                  >
                    {t}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-11 border-2 px-5 text-base"
              onClick={() => selectOffset(-1)}
            >
              <ArrowLeftIcon aria-hidden />
              Previous step
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 border-2 px-5 text-base"
              onClick={() => selectOffset(1)}
            >
              Next step
              <ArrowRightIcon aria-hidden />
            </Button>
          </div>
        </section>

        <section
          aria-label="Sample trace"
          className="flex min-w-0 flex-[1_1_400px] flex-col overflow-hidden rounded-3xl bg-foreground text-background"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#34322d] px-6 py-5">
            <span className="flex items-center gap-2.5 font-extrabold tracking-[0.08em]">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  running
                    ? "bg-brand"
                    : finished
                      ? "bg-[#4caf6e]"
                      : "bg-[#6f6b62]",
                )}
              />
              SAMPLE TRACE
            </span>
            <span className="font-mono text-sm text-[#a39e93]">
              {running
                ? "running"
                : finished
                  ? `complete · ${PIPELINE_STEPS.length} steps`
                  : "idle"}
            </span>
          </div>
          <div
            role="log"
            aria-live="polite"
            className="flex max-h-[640px] min-h-[420px] grow flex-col gap-2.5 overflow-y-auto px-6 pt-4 pb-6 font-mono text-sm leading-[21px]"
          >
            {logs.length === 0 ? (
              <p className="text-[#a39e93]">
                Press “Run a sample trace” to send an example phishing email
                through the pipeline. Lines use our real field and tool names;
                the values and timings are illustrative, not a recorded run.
              </p>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="animate-stagger-in flex gap-3">
                  <span className="shrink-0 text-[#8a867c]">
                    {line.at.toFixed(2)}s
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-bold",
                      kindLogClass[line.kind],
                    )}
                  >
                    {line.tag}
                  </span>
                  <span>{line.text}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
