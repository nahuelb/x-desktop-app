import { useEffect, useState } from "react";

type Phase = "entering" | "entered" | "exiting";

export function useAnimatedPresence(visible: boolean, duration = 150) {
  const [mounted, setMounted] = useState(visible);
  const [phase, setPhase] = useState<Phase>(visible ? "entered" : "exiting");

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPhase("entering");
      const raf = requestAnimationFrame(() => setPhase("entered"));
      return () => cancelAnimationFrame(raf);
    }
    setPhase("exiting");
    const timer = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [visible, duration]);

  return { mounted, phase };
}
