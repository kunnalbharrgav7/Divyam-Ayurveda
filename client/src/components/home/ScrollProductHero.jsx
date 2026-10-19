import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useHeroNav } from "../../context/HeroNavContext";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 300;
const SCROLL_DISTANCE = 2200; // Pinned scroll distance in px
const CONCURRENT_WORKERS = 10; // High-speed parallel image loaders

const HOTSPOTS = [
  {
    id: "seal",
    chapter: "01",
    stage: 1,
    minFrame: 45,
    maxFrame: 125,
    targetFrame: 85,
    title: "Hermetic Golden Seal",
    subtitle: "Airtight cap seals and protects delicate volatile organic compounds against atmospheric degradation.",
    badge: "100% Hermetic",
    positionClasses: "top-[28%] sm:top-[30%] right-[6%] sm:right-[12%] md:right-[18%]",
  },
  {
    id: "resin",
    chapter: "02",
    stage: 2,
    minFrame: 140,
    maxFrame: 220,
    targetFrame: 180,
    title: "Cold-Purified Mineral Pitch",
    subtitle: ">75% bioavailable Fulvic Acid with 80+ ionic trace minerals purified via classical Triphala Shodhana.",
    badge: "Gold Grade Resin",
    positionClasses: "top-[40%] sm:top-[44%] left-[6%] sm:left-[12%] md:left-[16%]",
  },
  {
    id: "glass",
    chapter: "03",
    stage: 3,
    minFrame: 232,
    maxFrame: 295,
    targetFrame: 265,
    title: "UV-Shield Amber Glass",
    subtitle: "Heavy pharmaceutical glass shields photolysis. 100% batch-tested for heavy metals and toxins.",
    badge: "Lab Certified Safe",
    positionClasses: "bottom-[20%] sm:bottom-[22%] right-[6%] sm:right-[12%] md:right-[18%]",
  },
];

const getFrameUrl = (index) => {
  const padded = String(index).padStart(3, "0");
  return `/images/LandingPage/ScrollAnimation/ezgif-frame-${padded}.jpg`;
};

export const ScrollProductHero = () => {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const triggerRef = useRef(null);
  const { setHeroNavState } = useHeroNav();

  // Scrollytelling Hotspot State
  const [activeHotspot, setActiveHotspot] = useState(0);
  const activeHotspotRef = useRef(0);

  // Frame Cache & State Refs
  const imagesRef = useRef([]);
  const loadedFramesRef = useRef(new Uint8Array(FRAME_COUNT + 1));
  const currentFrameRef = useRef(1);

  const [initialLoaded, setInitialLoaded] = useState(false);

  // Frame Rendering with Aspect-Ratio Preserving Cover Math & Nearest-Frame Fallback
  const drawFrame = useCallback((targetFrame) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const clamped = Math.min(FRAME_COUNT, Math.max(1, Math.round(targetFrame)));

    // Find the requested frame or closest loaded frame
    let imgToDraw = null;
    if (
      loadedFramesRef.current[clamped] &&
      imagesRef.current[clamped]?.complete &&
      imagesRef.current[clamped]?.naturalWidth > 0
    ) {
      imgToDraw = imagesRef.current[clamped];
    } else {
      // Search backwards first
      for (let i = clamped; i >= 1; i--) {
        if (
          loadedFramesRef.current[i] &&
          imagesRef.current[i]?.complete &&
          imagesRef.current[i]?.naturalWidth > 0
        ) {
          imgToDraw = imagesRef.current[i];
          break;
        }
      }
      // If no earlier frame loaded, search forwards
      if (!imgToDraw) {
        for (let i = clamped + 1; i <= FRAME_COUNT; i++) {
          if (
            loadedFramesRef.current[i] &&
            imagesRef.current[i]?.complete &&
            imagesRef.current[i]?.naturalWidth > 0
          ) {
            imgToDraw = imagesRef.current[i];
            break;
          }
        }
      }
    }

    if (!imgToDraw) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = imgToDraw.naturalWidth || 1920;
    const ih = imgToDraw.naturalHeight || 1080;

    // Center & Cover (maintains 16:9 ratio with zero stretching or distortion)
    const canvasRatio = cw / ch;
    const imgRatio = iw / ih;

    let renderWidth, renderHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      renderWidth = cw;
      renderHeight = cw / imgRatio;
      offsetX = 0;
      offsetY = (ch - renderHeight) / 2;
    } else {
      renderHeight = ch;
      renderWidth = ch * imgRatio;
      offsetX = (cw - renderWidth) / 2;
      offsetY = 0;
    }

    ctx.drawImage(imgToDraw, offsetX, offsetY, renderWidth, renderHeight);
  }, []);

  // Update Canvas Internal Buffer with Retina / HiDPI support (capped at 2x)
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = sectionRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    drawFrame(currentFrameRef.current);
  }, [drawFrame]);

  // Fast Concurrent Preloading Engine (Loads all 300 frames in <300ms across parallel workers)
  useEffect(() => {
    let isMounted = true;
    const images = imagesRef.current;
    const loaded = loadedFramesRef.current;

    const loadSingle = (index) => {
      if (loaded[index]) return Promise.resolve(images[index]);

      return new Promise((resolve) => {
        const img = new Image();
        img.src = getFrameUrl(index);
        img.onload = () => {
          if (!isMounted) return resolve(null);
          images[index] = img;
          loaded[index] = 1;

          // If Frame 1 is ready, draw immediately and remove loading state
          if (index === 1) {
            setInitialLoaded(true);
            drawFrame(1);
          }

          // If user's current scroll position is at/near this frame, re-draw immediately
          if (Math.abs(currentFrameRef.current - index) <= 2) {
            drawFrame(currentFrameRef.current);
          }

          resolve(img);
        };
        img.onerror = () => {
          resolve(null);
        };
      });
    };

    // 1. Immediately load Frame 1 for instant paint
    loadSingle(1);

    // 2. High-speed concurrent worker pool to load all 300 frames rapidly
    let nextIndex = 2;
    const spawnWorker = () => {
      if (!isMounted || nextIndex > FRAME_COUNT) return;
      const targetIndex = nextIndex++;
      loadSingle(targetIndex).then(() => {
        if (isMounted) spawnWorker();
      });
    };

    for (let w = 0; w < CONCURRENT_WORKERS; w++) {
      spawnWorker();
    }

    return () => {
      isMounted = false;
    };
  }, [drawFrame]);

  // Handle Resize and Orientation Changes
  useEffect(() => {
    updateCanvasDimensions();

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateCanvasDimensions();
        ScrollTrigger.refresh();
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [updateCanvasDimensions]);

  // GSAP ScrollTrigger Sequence: Pins the section and scrubs frame 1 to 300 via @gsap/react
  useGSAP(
    () => {
      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: `+=${SCROLL_DISTANCE}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.1, // Ultra-responsive scroll scrub
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onEnter: () => {
          setHeroNavState("hero");
        },
        onLeave: () => {
          setHeroNavState("sticky-full");
        },
        onEnterBack: () => {
          setHeroNavState("hero");
        },
        onLeaveBack: () => {
          setHeroNavState("top");
        },
        onUpdate: (self) => {
          const progress = self.progress;

          if (progress >= 1) {
            setHeroNavState("sticky-full");
          } else if (self.isActive || (progress > 0 && progress < 1)) {
            setHeroNavState("hero");
          } else {
            setHeroNavState("top");
          }

          const frameIndex = Math.min(
            FRAME_COUNT,
            Math.max(1, Math.round(1 + progress * (FRAME_COUNT - 1)))
          );

          if (frameIndex !== currentFrameRef.current) {
            currentFrameRef.current = frameIndex;
            drawFrame(frameIndex);
          }

          // Dynamic Scrollytelling Hotspot Chapter Detection
          let detectedStage = 0;
          if (frameIndex >= 45 && frameIndex <= 125) detectedStage = 1;
          else if (frameIndex >= 140 && frameIndex <= 220) detectedStage = 2;
          else if (frameIndex >= 232 && frameIndex <= 295) detectedStage = 3;

          if (detectedStage !== activeHotspotRef.current) {
            activeHotspotRef.current = detectedStage;
            setActiveHotspot(detectedStage);
          }
        },
      });

      triggerRef.current = trigger;

      // Sync initial state on mount
      if (trigger.progress >= 1) {
        setHeroNavState("sticky-full");
      } else if (trigger.isActive || (trigger.progress > 0 && trigger.progress < 1)) {
        setHeroNavState("hero");
      } else {
        setHeroNavState("top");
      }

      // Synchronize floating overlay fade with initial scroll scrub
      let overlayTween;
      if (overlayRef.current) {
        overlayTween = gsap.to(overlayRef.current, {
          opacity: 0,
          y: -24,
          ease: "power1.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=320",
            scrub: true,
          },
        });
      }

      // Re-calculate trigger offsets once DOM settles
      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
        updateCanvasDimensions();
      }, 100);

      return () => {
        clearTimeout(timer);
        trigger.kill();
        if (overlayTween?.scrollTrigger) overlayTween.scrollTrigger.kill();
        if (overlayTween) overlayTween.kill();
        setHeroNavState("top");
      };
    },
    { scope: sectionRef, dependencies: [drawFrame, updateCanvasDimensions, setHeroNavState] }
  );

  // Smooth scroll to chapter frame position
  const scrollToChapter = (chapterIndex) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const hotspot = HOTSPOTS[chapterIndex];
    if (!hotspot) return;
    const targetProgress = (hotspot.targetFrame - 1) / (FRAME_COUNT - 1);
    const targetScroll = trigger.start + targetProgress * SCROLL_DISTANCE;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  const currentHotspot = HOTSPOTS.find((h) => h.stage === activeHotspot);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[100svh] min-h-[560px] overflow-hidden bg-[#0B2416] flex items-center justify-center select-none"
    >
      {/* HTML5 Canvas for Hardware-Accelerated 60fps Frame Scrubbing */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover block"
      />

      {/* Floating Cinematic UI Overlay (Smoothly fades out on scroll) */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between items-center p-6 sm:p-10"
      >
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-[#D4AF37]/35 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#A9D18E] animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-[#E8D9B5]">
              Pure Himalayan Shilajit • 100% Gold Grade Resin
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-stone-300 text-[11px] font-medium">
            <Sparkles size={12} className="text-[#D4AF37]" />
            <span>&gt;75% Fulvic Acid &bull; 18,000+ ft Sourced</span>
          </div>
        </div>

        {/* Bottom Scroll Prompt & Quick Link */}
        <div className="flex flex-col items-center gap-3 pb-2 sm:pb-4">
          <div className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide shadow-2xl">
            <div className="w-3.5 h-5 border border-white/60 rounded-full flex justify-center pt-0.5">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-1.5 bg-[#A9D18E] rounded-full"
              />
            </div>
            <span>Scroll to Unveil Formulation</span>
            <ChevronDown size={14} className="text-[#A9D18E] animate-bounce" />
          </div>

          <Link
            to="/products/shilajit-pure-himalayan-resin"
            className="pointer-events-auto inline-flex items-center gap-1.5 text-xs text-[#E8D9B5] hover:text-white underline underline-offset-4 font-medium transition-colors drop-shadow-md"
          >
            <span>View Full Lab Report &amp; Product Details</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Scrollytelling Interactive Feature Hotspots (Appears at specific scroll stages) */}
      <AnimatePresence>
        {currentHotspot && (
          <motion.div
            key={currentHotspot.id}
            initial={{ opacity: 0, scale: 0.88, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className={`absolute z-30 pointer-events-auto ${currentHotspot.positionClasses}`}
          >
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-[#D4AF37]/50 shadow-2xl max-w-[280px] sm:max-w-[340px] text-white">
              {/* Pulsing Gold Beacon */}
              <div className="relative shrink-0 mt-1">
                <span className="w-3.5 h-3.5 rounded-full bg-[#D4AF37] block shadow-md" />
                <span className="absolute inset-0 rounded-full bg-[#D4AF37] animate-ping opacity-75" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold">
                    Chapter {currentHotspot.chapter}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#173D2A] text-[#A9D18E] font-medium border border-[#A9D18E]/30">
                    {currentHotspot.badge}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-heading font-bold tracking-tight text-stone-100 leading-snug">
                  {currentHotspot.title}
                </h4>
                <p className="text-[11px] text-stone-300 leading-relaxed font-light">
                  {currentHotspot.subtitle}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Timeline Indicator (Desktop Floating Nav) */}
      <div className="absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col gap-3.5 p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-2xl">
        {HOTSPOTS.map((h, i) => {
          const isActive = activeHotspot === h.stage;
          return (
            <button
              key={h.id}
              onClick={() => scrollToChapter(i)}
              className="group relative flex items-center justify-end focus:outline-hidden"
              aria-label={`Scroll to ${h.title}`}
            >
              {/* Tooltip on hover */}
              <span className="absolute right-8 px-2.5 py-1 rounded-md bg-black/90 text-stone-200 text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-white/10 shadow-lg">
                {h.chapter} &bull; {h.title}
              </span>
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-[#D4AF37] scale-125 ring-4 ring-[#D4AF37]/35 shadow-lg"
                    : "bg-white/30 hover:bg-white/70"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Instant Loading Fallback Spinner (Fades out in ~20ms as Frame 1 renders) */}
      {!initialLoaded && (
        <div className="absolute inset-0 z-40 bg-[#0B2416] flex flex-col items-center justify-center gap-3 text-stone-200">
          <div className="w-10 h-10 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        </div>
      )}
    </section>
  );
};
