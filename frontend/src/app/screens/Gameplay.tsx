import { useNavigate } from "react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { Circle, RotateCcw } from "lucide-react";
import { getStoredUser, getUserRank, getWsUrl } from "../api";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// MediaPipe Face Mesh landmark indices for eyes
const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];

export default function Gameplay() {
  const navigate = useNavigate();
  const [time, setTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("INITIALIZING...");
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameLoopRef = useRef<number | null>(null);
  const gameActiveRef = useRef(false);
  const gameOverRef = useRef(false);

  const handleGameOver = useCallback((durationMs: number) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setIsTracking(false);
    setIsGameOver(true);
    setTime(durationMs);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }

    // Fetch real rank
    const user = getStoredUser();
    if (user?.id) {
      getUserRank(user.id)
        .then((data) => setGlobalRank(data.rank))
        .catch(() => setGlobalRank(null));
    }
  }, []);

  useEffect(() => {
    let cleanup = false;

    async function init() {
      // 1. Start camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cleanup) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Camera access error:", error);
        navigate("/");
        return;
      }

      // 2. Initialize MediaPipe Face Landmarker
      setStatusText("LOADING FACE DETECTION...");
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        if (cleanup) return;
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
        if (cleanup) return;
        faceLandmarkerRef.current = landmarker;
      } catch (error) {
        console.error("MediaPipe init error:", error);
        setStatusText("FACE DETECTION FAILED");
        return;
      }

      // 3. Connect WebSocket
      setStatusText("CONNECTING...");
      const user = getStoredUser();
      const clientId = user?.id || `anon_${Date.now()}`;
      const wsUrl = getWsUrl(`/ws/staring-contest/${clientId}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cleanup) { ws.close(); return; }
        // Send START_GAME
        ws.send(
          JSON.stringify({
            type: "START_GAME",
            user_id: user?.id || "",
            username: user?.username || `Player_${clientId.slice(0, 6)}`,
          })
        );
      };

      ws.onmessage = (event) => {
        if (cleanup) return;
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "SESSION_READY":
            setStatusText("GET READY...");
            break;

          case "COUNTDOWN":
            setCountdown(data.count);
            setStatusText(`STARTING IN ${data.count}...`);
            break;

          case "GAME_ACTIVE":
            setCountdown(null);
            setStatusText("TRACKING EYES");
            setIsTracking(true);
            gameActiveRef.current = true;
            // Start local timer
            const startTs = Date.now();
            intervalRef.current = window.setInterval(() => {
              setTime(Date.now() - startTs);
            }, 10);
            // Start sending frames
            startFrameLoop();
            break;

          case "EAR_UPDATE":
            // Server sends EAR updates — we can use elapsed_ms for accuracy
            break;

          case "GAME_OVER":
            handleGameOver(data.duration_ms);
            break;

          case "ERROR":
            console.error("WS Error:", data.detail);
            setStatusText("ERROR");
            break;
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setStatusText("CONNECTION ERROR");
      };

      ws.onclose = () => {
        if (!gameOverRef.current && gameActiveRef.current) {
          // Unexpected disconnect during game
          setStatusText("DISCONNECTED");
        }
      };
    }

    function startFrameLoop() {
      const sendFrame = () => {
        if (gameOverRef.current || !gameActiveRef.current) return;

        const video = videoRef.current;
        const landmarker = faceLandmarkerRef.current;
        const ws = wsRef.current;

        if (video && landmarker && ws && ws.readyState === WebSocket.OPEN) {
          try {
            const result = landmarker.detectForVideo(video, performance.now());

            if (result.faceLandmarks && result.faceLandmarks.length > 0) {
              const landmarks = result.faceLandmarks[0];

              const leftEye = LEFT_EYE_INDICES.map((i) => ({
                x: landmarks[i].x,
                y: landmarks[i].y,
                z: landmarks[i].z,
              }));

              const rightEye = RIGHT_EYE_INDICES.map((i) => ({
                x: landmarks[i].x,
                y: landmarks[i].y,
                z: landmarks[i].z,
              }));

              ws.send(
                JSON.stringify({
                  type: "FRAME",
                  timestamp: Date.now(),
                  landmarks: {
                    left_eye: leftEye,
                    right_eye: rightEye,
                  },
                })
              );
            }
          } catch (err) {
            // Silently ignore frame errors
          }
        }

        frameLoopRef.current = requestAnimationFrame(sendFrame);
      };

      frameLoopRef.current = requestAnimationFrame(sendFrame);
    }

    init();

    return () => {
      cleanup = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (frameLoopRef.current) cancelAnimationFrame(frameLoopRef.current);
      if (wsRef.current) wsRef.current.close();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, [navigate, handleGameOver]);

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = Math.floor((milliseconds % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(ms).padStart(2, "0")}`;
  };

  const handleTryAgain = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    if (wsRef.current) wsRef.current.close();
    navigate("/play");
    window.location.reload();
  };

  const handleGoHome = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    if (wsRef.current) wsRef.current.close();
    navigate("/setup");
  };

  const rankDisplay = globalRank ? `#${globalRank.toLocaleString()}` : "Unranked";

  return (
    <div className="min-h-screen bg-[#121212] text-[#F5F5F5] flex flex-col relative">
      {/* HUD - Timer */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <div
          className="text-5xl md:text-7xl font-bold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
        >
          {formatTime(time)}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-8 right-8 z-10 flex items-center gap-3">
        <Circle
          className={`w-4 h-4 fill-[#FF3333] ${isTracking ? "animate-pulse" : ""
            }`}
          style={{ color: "#FF3333" }}
        />
        <span
          className="text-sm uppercase tracking-wider"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
        >
          {statusText}
        </span>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div
            className="text-9xl font-bold animate-pulse"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#FF3333" }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Main Webcam Feed */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className={`relative w-full max-w-6xl aspect-video border-4 border-[#FF3333] transition-all duration-500 ${isGameOver ? "blur-sm" : ""
            }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Game Over Popup */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-[#1A1A1A] border-4 border-[#F5F5F5] max-w-lg w-full"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {/* Header */}
            <div className="bg-[#FF3333] p-6 sm:p-8 border-b-4 border-[#F5F5F5]">
              <h2
                className="text-4xl sm:text-5xl font-bold text-[#F5F5F5] text-center"
                style={{ fontWeight: 700 }}
              >
                YOU BLINKED.
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8">
              {/* Time Display */}
              <div className="text-center mb-8">
                <p
                  className="text-xs sm:text-sm uppercase tracking-wider opacity-70 mb-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
                >
                  YOUR TIME
                </p>
                <div
                  className="text-5xl sm:text-6xl font-bold tabular-nums mb-4"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  {formatTime(time)}
                </div>
                <p
                  className="text-lg opacity-90"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Global Rank:{" "}
                  <span className="text-[#FF3333] font-bold">{rankDisplay}</span>
                </p>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full bg-[#FF3333] text-[#F5F5F5] py-4 text-lg font-bold uppercase tracking-wider hover:bg-[#DD1111] transition-colors flex items-center justify-center gap-3"
                  style={{ fontWeight: 700 }}
                >
                  <RotateCcw className="w-5 h-5" />
                  TRY AGAIN
                </button>
                <button
                  onClick={handleGoHome}
                  className="w-full text-[#F5F5F5] py-3 text-sm font-bold uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity"
                  style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  BACK TO LOBBY
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-4 border-[#3A3A3A] bg-[#0A0A0A] p-3 sm:p-4">
              <p
                className="text-xs text-[#F5F5F5] opacity-70 text-center"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Your score has been recorded on the leaderboard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
