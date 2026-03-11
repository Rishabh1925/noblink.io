import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronDown } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const [isChecked, setIsChecked] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Check if user has already acknowledged the disclaimer
    const hasAcknowledged = localStorage.getItem("noblink-acknowledged") === "true";
    setIsChecked(hasAcknowledged);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollHint(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsChecked(checked);
    // Persist to localStorage
    localStorage.setItem("noblink-acknowledged", checked ? "true" : "false");
  };

  const handleProceed = () => {
    if (isChecked) {
      window.scrollTo(0, 0);
      navigate("/setup");
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#F5F5F5]">
      {/* Hero Section */}
      <section className="h-screen flex flex-col items-center justify-center relative">
        <h1
          className="text-[12rem] font-bold tracking-tighter leading-none"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
        >
          NoBlink.io
        </h1>
        <p
          className="text-xl mt-6 opacity-70 uppercase tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          The Global Staring Contest
        </p>

        {/* Scroll Hint */}
        {showScrollHint && (
          <div className="absolute bottom-12 flex flex-col items-center animate-bounce">
            <p
              className="text-sm uppercase tracking-wider mb-2 opacity-50"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Scroll to Continue
            </p>
            <ChevronDown className="w-8 h-8 opacity-50" />
          </div>
        )}
      </section>

      {/* How to Play Section */}
      <section className="min-h-screen flex items-center justify-center px-8 py-32">
        <div className="max-w-4xl w-full">
          <div className="border-4 border-[#3A3A3A] bg-[#1A1A1A] p-12">
            <h2
              className="text-5xl font-bold mb-12 pb-6 border-b-4 border-[#3A3A3A]"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
            >
              HOW TO PLAY
            </h2>

            <div className="space-y-8 text-xl mb-16">
              <div className="flex gap-6">
                <span
                  className="text-3xl font-bold text-[#FF3333] w-12"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  01
                </span>
                <p>Grant camera access to enable eye tracking</p>
              </div>

              <div className="flex gap-6">
                <span
                  className="text-3xl font-bold text-[#FF3333] w-12"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  02
                </span>
                <p>Stare at the screen without blinking</p>
              </div>

              <div className="flex gap-6">
                <span
                  className="text-3xl font-bold text-[#FF3333] w-12"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  03
                </span>
                <p>Computer vision tracks your eyes in real-time</p>
              </div>

              <div className="flex gap-6">
                <span
                  className="text-3xl font-bold text-[#FF3333] w-12"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  04
                </span>
                <p>The moment you blink, the game ends</p>
              </div>

              <div className="flex gap-6">
                <span
                  className="text-3xl font-bold text-[#FF3333] w-12"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  05
                </span>
                <p>Compete for the longest time globally</p>
              </div>
            </div>

            {/* Warning Section */}
            <div className="border-4 border-[#FF3333] bg-[#FF3333]/10 p-8 mb-8">
              <h3
                className="text-3xl font-bold mb-6 text-[#FF3333]"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
              >
                ⚠ WARNING
              </h3>
              <p className="text-lg leading-relaxed mb-4">
                This game involves prolonged staring and may cause eye strain, discomfort, or fatigue. 
                Extended sessions without blinking can lead to dry eyes and temporary vision issues.
              </p>
              <p className="text-lg leading-relaxed">
                Take regular breaks. If you experience discomfort, stop immediately. 
                Not recommended for individuals with pre-existing eye conditions.
              </p>
            </div>

            {/* Disclaimer Checkbox */}
            <div className="border-4 border-[#F5F5F5] p-6">
              <label className="flex items-start gap-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={handleCheckboxChange}
                  className="mt-1 w-6 h-6 accent-[#FF3333] cursor-pointer"
                />
                <span className="text-lg flex-1">
                  <strong className="font-bold">I ACKNOWLEDGE THE RISKS.</strong> I understand that this game may cause eye strain and discomfort. I am fully responsible for any consequences of participating in this activity and voluntarily choose to proceed.
                </span>
              </label>
            </div>

            {/* Proceed Button */}
            <button
              onClick={handleProceed}
              disabled={!isChecked}
              className={`w-full mt-8 py-6 text-2xl font-bold uppercase tracking-wider transition-all ${
                isChecked
                  ? "bg-[#FF3333] text-[#F5F5F5] hover:bg-[#DD1111] cursor-pointer"
                  : "bg-[#3A3A3A] text-[#666666] cursor-not-allowed"
              }`}
              style={{ fontWeight: 700 }}
            >
              {isChecked ? "PROCEED TO GAME" : "ACCEPT TO CONTINUE"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}