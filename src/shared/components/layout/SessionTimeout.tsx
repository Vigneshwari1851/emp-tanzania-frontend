import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthContext";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
const WARNING_SECONDS = 60;

export function SessionTimeout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

  const idleTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const warningShownRef = useRef(false);
  const secondsLeftRef = useRef(WARNING_SECONDS);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(() => {
    logout();
    navigate("/login?expired=true", { replace: true });
  }, [logout, navigate]);

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      warningShownRef.current = true;
      secondsLeftRef.current = WARNING_SECONDS;
      setSecondsLeft(WARNING_SECONDS);
      setShowWarning(true);
      countdownRef.current = window.setInterval(() => {
        if (secondsLeftRef.current <= 1) {
          if (countdownRef.current !== null) {
            window.clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          warningShownRef.current = false;
          setShowWarning(false);
          handleTimeout();
        } else {
          secondsLeftRef.current -= 1;
          setSecondsLeft(secondsLeftRef.current);
        }
      }, 1000);
    }, IDLE_TIMEOUT_MS);
  }, [handleTimeout]);

  const handleActivity = useCallback(() => {
    if (warningShownRef.current) {
      warningShownRef.current = false;
      if (countdownRef.current !== null) {
        window.clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setShowWarning(false);
    }
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    if (!user) return;

    startIdleTimer();
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      clearTimers();
    };
  }, [user, startIdleTimer, handleActivity, clearTimers]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md border border-border px-8 py-10">
        <h3 className="text-lg font-semibold text-foreground mb-2">Session Expiring</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You have been inactive for a while. Your session will expire in{" "}
          <span className="font-semibold text-foreground">
            {secondsLeft} second{secondsLeft === 1 ? "" : "s"}
          </span>
          . Click Continue to stay logged in.
        </p>
        <button
          onClick={handleActivity}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-sm transition-colors"
        >
          Continue Session
        </button>
      </div>
    </div>
  );
}
