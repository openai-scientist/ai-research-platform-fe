"use client";

import { useEffect, useState } from "react";

export function useAuthCooldown(initialSeconds = 0) {
  const [deadline, setDeadline] = useState(() => Date.now() + initialSeconds * 1000);
  const [remaining, updateRemaining] = useState(initialSeconds);
  const setRemaining = (seconds: number) => {
    setDeadline(Date.now() + seconds * 1000);
    updateRemaining(seconds);
  };
  useEffect(() => {
    const tick = () => updateRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    if (deadline <= Date.now()) return;
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  return { remaining, setRemaining };
}
