"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";

const STORAGE_KEY = "hideInstructions";

const slides: { title: string; content: React.ReactNode }[] = [
  {
    title: "Welcome to Pairanoia",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Pairanoia is a card-matching memory game. Flip cards to find matching
          pairs before the timer runs out.
        </p>
        <p>
          There are two game modes:{" "}
          <strong className="text-foreground">Freeplay</strong> for casual play
          and <strong className="text-foreground">Survival</strong> for a
          progressively harder challenge.
        </p>
      </div>
    ),
  },
  {
    title: "How to Play",
    content: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <ul className="space-y-2 list-none">
          <li>
            <span className="text-foreground font-medium">Flip two cards</span>{" "}
            — they flip face-up when clicked
          </li>
          <li>
            <span className="text-foreground font-medium">Match them</span> —
            if they match, they disappear
          </li>
          <li>
            <span className="text-foreground font-medium">No match</span> —
            they flip back after a short delay
          </li>
          <li>
            <span className="text-foreground font-medium">Clear the board</span>{" "}
            — match all pairs to complete the level
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Scoring",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Each pair earns points based on how fast you found it:</p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="pb-1 pr-4 font-semibold text-foreground">Speed</th>
              <th className="pb-1 font-semibold text-foreground">Multiplier</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="py-1 pr-4">Very fast</td><td style={{ color: "#facc15" }}>5×</td></tr>
            <tr><td className="py-1 pr-4">Fast</td><td style={{ color: "#a855f7" }}>3×</td></tr>
            <tr><td className="py-1 pr-4">Moderate</td><td style={{ color: "#22d3ee" }}>2×</td></tr>
            <tr><td className="py-1 pr-4">Slow</td><td style={{ color: "#00ff3c" }}>1.5×</td></tr>
            <tr><td className="py-1 pr-4">Very slow</td><td className="text-foreground">1×</td></tr>
          </tbody>
        </table>
        <p>
          Base score per pair is{" "}
          <strong className="text-foreground">100 pts</strong>.
        </p>
      </div>
    ),
  },
  {
    title: "Freeplay Mode",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Choose your grid size — from{" "}
          <strong className="text-foreground">4×4</strong>{" "}up to{" "}
          <strong className="text-foreground">
            <span className="sm:hidden">18×8</span>
            <span className="hidden sm:inline">12×12</span>
          </strong>{" "}— and play at your own pace.
        </p>
        <p>
          The stopwatch counts up so you can track how long you take. No level
          progression, no pressure.
        </p>
        <p>
          Sign in to save your scores to the{" "}
          <strong className="text-foreground">global leaderboard</strong>.
        </p>
      </div>
    ),
  },
  {
    title: "Survival Mode",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Start on a <strong className="text-foreground">4×4</strong> grid and
          survive as long as you can. Each level the grid grows — 4×4, 6×6,
          8×8.
        </p>
        <p>
          A countdown timer adds urgency. Clear the board before time runs out,
          or it&apos;s game over.
        </p>
        <p>
          Finish with time to spare and earn a{" "}
          <strong className="text-foreground">time bonus</strong> — 10 pts per
          second remaining.
        </p>
      </div>
    ),
  },
];

export default function InstructionsModal() {
  const [open, setOpen] = useState(false);
  const [doNotShow, setDoNotShow] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hidden = localStorage.getItem(STORAGE_KEY) === "true";
      if (!hidden) setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && doNotShow) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/*
        No overflow-hidden — CarouselPrevious/Next are position:absolute at
        -left-12/-right-12 (48px) outside the Carousel div. The px-16 wrapper
        (64px) gives them 16px clearance inside the dialog's visual bounds.
      */}
      <DialogContent className="sm:max-w-lg gap-0 p-0" showCloseButton={false}>
        {/* Inner wrapper owns overflow-hidden + rounded corners so content is reliably clipped */}
        <div className="overflow-hidden rounded-xl relative">
          {/* X close button */}
          <button
            onClick={() => handleClose(false)}
            className="absolute top-3 right-3 !p-1.5 !rounded-md !bg-transparent hover:!bg-muted/60 text-muted-foreground hover:text-foreground transition-colors z-10"
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </button>

          {/* Title */}
          <div className="px-5 sm:px-6 pt-5 pb-3 pr-10">
            <h2 className="font-heading font-medium text-base leading-none">
              {slides[current]?.title}
            </h2>
          </div>

          {/*
            Mobile: full-width carousel, no arrows — swipe to navigate.
            sm+: constrained wrapper so Embla measures the right viewport width
            and arrows at -3rem land 1rem inside the dialog edge.
          */}
          <div className="sm:w-[calc(100%-8rem)] sm:mx-auto">
            <Carousel setApi={setApi}>
              <CarouselContent className="h-[260px]">
                {slides.map((slide, i) => (
                  <CarouselItem key={i}>
                    <div className="h-full px-5 sm:px-0 py-4 flex flex-col justify-center">
                      {slide.content}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </Carousel>
          </div>

          {/* Dot indicators — mobile only */}
          <div className="flex justify-center gap-3 pt-1 pb-3 overflow-hidden px-4 sm:hidden">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={`inline-block border transition-all duration-200 !p-2 !rounded-[0.75rem] ${
                  i === current
                    ? "!bg-white !border-white"
                    : "!bg-transparent !border-white/50 hover:!border-white/80"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Don't show again — below dots */}
          <div className="flex px-5 pb-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground">
              <Checkbox
                checked={doNotShow}
                onCheckedChange={(val) => setDoNotShow(val === true)}
              />
              Don&apos;t show again
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
