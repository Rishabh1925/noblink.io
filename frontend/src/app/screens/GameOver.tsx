import { useNavigate, useLocation } from "react-router";
import { useEffect, useState, useRef } from "react";
import { Leaderboard } from "../components/Leaderboard";
import { getStoredUser, getUserRank } from "../api";

export default function GameOver() {
  const navigate = useNavigate();
  const location = useLocation();
  const finalTime = (location.state as { finalTime: number })?.finalTime || 0;
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const user = getStoredUser();

  useEffect(() => {
    // Fetch real rank from API
    if (user?.id) {
      getUserRank(user.id)
        .then((data) => setGlobalRank(data.rank))
        .catch(() => setGlobalRank(null));
    }

    // Redirect if no time was recorded
    if (finalTime === 0) {
      navigate("/");
    }

    // Get camera stream for frozen frame
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((error) => {
        console.error("Camera access error:", error);
      });

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [finalTime, navigate]);

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = Math.floor((milliseconds % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(ms).padStart(2, "0")}`;
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });

  const handleTryAgain = () => {
    navigate("/play");
  };

  const handleShareToX = () => {
    const text = `I lasted ${formatTime(finalTime)} without blinking on NoBlink.io! Can you beat my time?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const rankDisplay = globalRank ? `#${globalRank.toLocaleString()}` : "Unranked";

  return (
    <div className="min-h-screen bg-[#121212] text-[#F5F5F5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Header */}
      <header className="border-b-4 border-[#F5F5F5] p-8">
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontWeight: 700 }}>
          NoBlink.io
        </h1>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-16">
          {/* Center Stage */}
          <div className="lg:col-span-2">
            {/* Frozen Webcam Feed */}
            <div className="relative aspect-video bg-[#2A2A2A] border-4 border-[#FF3333]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#FF3333]/30"></div>

              {/* Overlay Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <h2
                  className="text-7xl font-bold mb-8"
                  style={{ fontWeight: 700, color: "#FF3333" }}
                >
                  YOU BLINKED.
                </h2>

                {/* Score Display */}
                <div className="text-center mb-12">
                  <p className="text-lg mb-2 opacity-70 uppercase tracking-wider">YOUR TIME</p>
                  <div
                    className="text-6xl font-bold tabular-nums mb-6"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    {formatTime(finalTime)}
                  </div>
                  <p
                    className="text-2xl opacity-90"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Global Rank: <span className="text-[#FF3333] font-bold">{rankDisplay}</span>
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex gap-4">
                  <button
                    onClick={handleTryAgain}
                    className="bg-[#FF3333] text-[#F5F5F5] px-10 py-4 text-xl font-bold uppercase tracking-wider hover:bg-[#DD1111] transition-colors"
                    style={{ fontWeight: 700 }}
                  >
                    TRY AGAIN
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="mt-8 border-4 border-[#3A3A3A] p-6 bg-[#1A1A1A]">
              <h3 className="text-2xl font-bold mb-4" style={{ fontWeight: 700 }}>
                SESSION STATS
              </h3>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-sm opacity-70 uppercase tracking-wider mb-2">Duration</p>
                  <p
                    className="text-3xl font-bold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    {formatTime(finalTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-70 uppercase tracking-wider mb-2">Global Rank</p>
                  <p
                    className="text-3xl font-bold text-[#FF3333]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    {rankDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-70 uppercase tracking-wider mb-2">Date</p>
                  <p
                    className="text-3xl font-bold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    {todayStr}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Sidebar */}
          <div>
            <Leaderboard title="TOP 10 TODAY" highlightUserId={user?.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
