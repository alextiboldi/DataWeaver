"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { Renderer, JSONUIProvider } from "@json-render/react";
import { chatRegistry } from "@/lib/render/registry";
import { SHOWCASES } from "@/lib/render/showcase-data";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CARD_WIDTH = 640;
const CARD_GAP = 24;
const TOTAL = SHOWCASES.length;

export function ComponentCarousel() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const x = useMotionValue(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const dragConstraintLeft = -(TOTAL - 1) * (CARD_WIDTH + CARD_GAP);

  function snapTo(index: number) {
    const clamped = Math.max(0, Math.min(index, TOTAL - 1));
    setActiveIndex(clamped);
    animate(x, -(clamped * (CARD_WIDTH + CARD_GAP)), {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (Math.abs(velocity) > 500) {
      snapTo(activeIndex + (velocity < 0 ? 1 : -1));
    } else if (Math.abs(offset) > CARD_WIDTH / 4) {
      snapTo(activeIndex + (offset < 0 ? 1 : -1));
    } else {
      snapTo(activeIndex);
    }
  }

  return (
    <section className="border-b-2 border-black bg-white py-16 overflow-hidden relative">
      {/* Section Header */}
      <div className="px-6 max-w-7xl mx-auto mb-10">
        <div className="flex items-end justify-between gap-8">
          <div>
            <div className="inline-block border-2 border-black bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-widest mb-4">
              Visual Toolkit
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-balance">
              AI-Composed<br />
              <span className="text-neutral-400">Components</span>
            </h2>
          </div>
          <div className="hidden md:flex gap-2 pb-1">
            <button
              onClick={() => snapTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous component"
              className="w-12 h-12 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-black"
            >
              <ChevronLeft aria-hidden="true" className="w-5 h-5" strokeWidth={3} />
            </button>
            <button
              onClick={() => snapTo(activeIndex + 1)}
              disabled={activeIndex === TOTAL - 1}
              aria-label="Next component"
              className="w-12 h-12 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-black"
            >
              <ChevronRight aria-hidden="true" className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Track */}
      <div ref={containerRef} className="relative px-6 cursor-grab active:cursor-grabbing">
        <motion.div
          className="flex"
          style={{ x, gap: CARD_GAP }}
          drag="x"
          dragConstraints={{ left: dragConstraintLeft, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
        >
          {SHOWCASES.map((item, i) => (
            <CarouselCard
              key={item.name}
              item={item}
              index={i}
              activeIndex={activeIndex}
              motionX={x}
            />
          ))}
        </motion.div>
      </div>

      {/* Index Indicator */}
      <div className="px-6 max-w-7xl mx-auto mt-8 flex items-center gap-4">
        <div className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400">
          {String(activeIndex + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
        </div>
        <div className="flex-1 h-[2px] bg-neutral-200 relative">
          <motion.div
            className="absolute top-0 left-0 h-full bg-black"
            style={{ width: `${((activeIndex + 1) / TOTAL) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            layout
          />
        </div>
        <div className="flex gap-1.5">
          {SHOWCASES.map((_, i) => (
            <button
              key={i}
              onClick={() => snapTo(i)}
              aria-label={`Go to component ${i + 1}`}
              className={`w-2 h-2 border border-black transition-colors ${i === activeIndex ? "bg-black" : "bg-transparent hover:bg-neutral-300"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CarouselCard({
  item,
  index,
  activeIndex,
  motionX,
}: {
  item: (typeof SHOWCASES)[number];
  index: number;
  activeIndex: number;
  motionX: ReturnType<typeof useMotionValue<number>>;
}) {
  const isActive = index === activeIndex;

  const cardCenter = index * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
  const rotateY = useTransform(motionX, (latest: number) => {
    const viewCenter = -latest + CARD_WIDTH / 2 + 24;
    const distance = cardCenter - viewCenter;
    return -(distance / (CARD_WIDTH * 2)) * 8;
  });

  const scale = useTransform(motionX, (latest: number) => {
    const viewCenter = -latest + CARD_WIDTH / 2 + 24;
    const distance = Math.abs(cardCenter - viewCenter);
    return Math.max(0.92, 1 - distance / (CARD_WIDTH * 6));
  });

  return (
    <motion.div
      className="flex-shrink-0 select-none"
      style={{
        width: CARD_WIDTH,
        rotateY,
        scale,
        perspective: 1200,
      }}
    >
      <div
        className={`border-2 border-black bg-white transition-shadow duration-300 ${
          isActive
            ? "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            : "shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]"
        }`}
      >
        {/* Card Header */}
        <div className="border-b-2 border-black px-5 py-3 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="font-black text-sm uppercase tracking-wider">{item.name}</div>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 border border-black bg-neutral-300" />
            <div className="w-2.5 h-2.5 border border-black bg-neutral-200" />
            <div className="w-2.5 h-2.5 border border-black bg-neutral-100" />
          </div>
        </div>

        {/* Card Body — rendered component */}
        <div className="p-5 h-[380px] overflow-hidden">
          <div className="pointer-events-none">
            <JSONUIProvider registry={chatRegistry}>
              <Renderer spec={item.spec} registry={chatRegistry} />
            </JSONUIProvider>
          </div>
        </div>

        {/* Card Footer */}
        <div className="border-t-2 border-black px-5 py-3 bg-neutral-50">
          <p className="text-xs font-mono text-neutral-500 leading-relaxed">{item.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
