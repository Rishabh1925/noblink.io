import { useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import { Leaderboard } from "../components/Leaderboard";
import { AuthModal } from "../components/AuthModal";
import { getStoredUser, clearStoredUser } from "../api";

export default function PreGame() {
  const navigate = useNavigate();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);

    // Check for existing logged-in user
    const user = getStoredUser();
    if (user) {
      setIsAuthenticated(true);
      setUsername(user.username);
      setUserId(user.id);
    }
  }, []);

  useEffect(() => {
    // Check if user already has camera permission
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const hasCamera = devices.some((device) => device.kind === "videoinput");
      if (hasCamera) {
        // Try to get preview stream
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
            setHasPermission(true);
          })
          .catch(() => {
            setHasPermission(false);
          });
      }
    });
  }, []);

  const handleGrantCamera = async () => {
    // Check if authenticated first
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setTimeout(() => {
        navigate("/play");
      }, 500);
    } catch (error) {
      console.error("Camera permission denied:", error);
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = (newUserId: string, newUsername: string) => {
    setIsAuthenticated(true);
    setUsername(newUsername);
    setUserId(newUserId);
    setShowAuthModal(false);
  };

  const handleSignUpClick = () => {
    if (isAuthenticated) {
      // Log out
      clearStoredUser();
      setIsAuthenticated(false);
      setUsername(null);
      setUserId(null);
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <div className={`min-h-screen bg-[#121212] text-[#F5F5F5] ${showAuthModal ? 'blur-sm' : ''}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {/* Header */}
        <header className="border-b-4 border-[#F5F5F5] p-4 md:p-8 flex items-center justify-between">
          <h1
            onClick={() => navigate("/")}
            className="text-3xl md:text-6xl font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
            style={{ fontWeight: 700 }}
          >
            NoBlink.io
          </h1>
          <div className="flex items-center gap-4">
            {isAuthenticated && username && (
              <span
                className="text-sm md:text-base opacity-70"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {username}
              </span>
            )}
            <button
              onClick={handleSignUpClick}
              className="bg-[#FF3333] text-[#F5F5F5] px-4 py-2 md:px-8 md:py-3 text-sm md:text-lg font-bold uppercase tracking-wider hover:bg-[#DD1111] transition-colors"
              style={{ fontWeight: 700 }}
            >
              {isAuthenticated ? "LOG OUT" : "SIGN UP"}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-4 md:px-8 py-8 md:py-16 max-w-7xl">
          {/* Camera Section */}
          <div className="mb-8 md:mb-16">
            <div className="relative aspect-video bg-[#2A2A2A] border-2 md:border-4 border-[#3A3A3A]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover grayscale"
              />

              {/* Overlay Button */}
              {!hasPermission && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                  <button
                    onClick={handleGrantCamera}
                    disabled={isLoading}
                    className="bg-[#FF3333] text-[#F5F5F5] px-6 py-3 md:px-12 md:py-6 text-base md:text-2xl font-bold uppercase tracking-wider hover:bg-[#DD1111] transition-colors disabled:opacity-50"
                    style={{ fontWeight: 700 }}
                  >
                    {isLoading ? "INITIALIZING..." : "GRANT CAMERA & PLAY"}
                  </button>
                  <p
                    className="mt-4 md:mt-6 text-xs md:text-sm opacity-70 px-4 text-center"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    System: Awaiting ocular input...
                  </p>
                </div>
              )}

              {hasPermission && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handleGrantCamera}
                    className="bg-[#FF3333] text-[#F5F5F5] px-6 py-3 md:px-12 md:py-6 text-base md:text-2xl font-bold uppercase tracking-wider hover:bg-[#DD1111] transition-colors"
                    style={{ fontWeight: 700 }}
                  >
                    START GAME
                  </button>
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="mt-4 md:mt-8 border-2 md:border-4 border-[#3A3A3A] bg-[#1A1A1A] p-4 md:p-6">
              <div className="grid grid-cols-2 gap-4 md:gap-8">
                <div>
                  <p className="text-xs md:text-sm opacity-70 uppercase tracking-wider mb-1 md:mb-2">Camera Status</p>
                  <p
                    className={`text-lg md:text-2xl font-bold ${hasPermission ? "text-[#00FF00]" : "text-[#FF3333]"}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    {hasPermission ? "READY" : "NOT DETECTED"}
                  </p>
                </div>
                <div>
                  <p className="text-xs md:text-sm opacity-70 uppercase tracking-wider mb-1 md:mb-2">Tracking System</p>
                  <p
                    className="text-lg md:text-2xl font-bold text-[#00FF00]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    ONLINE
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div>
            <Leaderboard title="GLOBAL TOP 10" highlightUserId={userId || undefined} />
          </div>

          {/* How to Play Section */}
          <div className="mt-8 md:mt-16">
            <div className="border-2 md:border-4 border-[#3A3A3A] bg-[#1A1A1A] p-6 md:p-12">
              <h2
                className="text-2xl md:text-5xl font-bold mb-6 md:mb-12 pb-4 md:pb-6 border-b-2 md:border-b-4 border-[#3A3A3A]"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
              >
                HOW TO PLAY
              </h2>

              <div className="space-y-4 md:space-y-8 text-sm md:text-xl">
                <div className="flex gap-3 md:gap-6">
                  <span
                    className="text-xl md:text-3xl font-bold text-[#FF3333] w-8 md:w-12 flex-shrink-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    01
                  </span>
                  <p>Grant camera access to enable eye tracking</p>
                </div>

                <div className="flex gap-3 md:gap-6">
                  <span
                    className="text-xl md:text-3xl font-bold text-[#FF3333] w-8 md:w-12 flex-shrink-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    02
                  </span>
                  <p>Stare at the screen without blinking</p>
                </div>

                <div className="flex gap-3 md:gap-6">
                  <span
                    className="text-xl md:text-3xl font-bold text-[#FF3333] w-8 md:w-12 flex-shrink-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    03
                  </span>
                  <p>Computer vision tracks your eyes in real-time</p>
                </div>

                <div className="flex gap-3 md:gap-6">
                  <span
                    className="text-xl md:text-3xl font-bold text-[#FF3333] w-8 md:w-12 flex-shrink-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    04
                  </span>
                  <p>The moment you blink, the game ends</p>
                </div>

                <div className="flex gap-3 md:gap-6">
                  <span
                    className="text-xl md:text-3xl font-bold text-[#FF3333] w-8 md:w-12 flex-shrink-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  >
                    05
                  </span>
                  <p>Compete for the longest time globally</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}