import { useState } from "react";
import { X } from "lucide-react";
import { registerUser, loginUser, saveUser } from "../api";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (userId: string, username: string) => void;
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let user;
      if (isSignUp) {
        user = await registerUser(formData.username, formData.email, formData.password);
      } else {
        user = await loginUser(formData.email, formData.password);
      }
      saveUser(user);
      onSuccess(user.id, user.username);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div
        className="bg-[#1A1A1A] border-4 border-[#F5F5F5] max-w-md w-full relative"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-[#F5F5F5] hover:text-[#FF3333] transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Header */}
        <div className="bg-[#FF3333] p-4 sm:p-6 border-b-4 border-[#F5F5F5]">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]" style={{ fontWeight: 700 }}>
            {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
          </h2>
          <p className="text-xs sm:text-sm mt-2 text-[#F5F5F5] opacity-90">
            Required to track your progress and compete globally
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-8">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-[#FF3333]/20 border-2 border-[#FF3333] text-[#FF3333] text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4 sm:space-y-6">
            {isSignUp && (
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs sm:text-sm uppercase tracking-wider mb-2 text-[#F5F5F5] opacity-70"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required={isSignUp}
                  className="w-full bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#F5F5F5] px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base focus:border-[#FF3333] focus:outline-none transition-colors placeholder:text-[#999999]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  placeholder="Enter username"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm uppercase tracking-wider mb-2 text-[#F5F5F5] opacity-70"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#F5F5F5] px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base focus:border-[#FF3333] focus:outline-none transition-colors placeholder:text-[#999999]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                placeholder="Enter email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm uppercase tracking-wider mb-2 text-[#F5F5F5] opacity-70"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#F5F5F5] px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base focus:border-[#FF3333] focus:outline-none transition-colors placeholder:text-[#999999]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                placeholder="Enter password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 sm:mt-8 bg-[#FF3333] text-[#F5F5F5] py-3 sm:py-4 text-base sm:text-lg font-bold uppercase tracking-wider hover:bg-[#DD1111] transition-colors disabled:opacity-50"
            style={{ fontWeight: 700 }}
          >
            {isLoading
              ? "LOADING..."
              : isSignUp
                ? "CREATE ACCOUNT & START"
                : "SIGN IN & START"}
          </button>

          {/* Toggle Sign In/Sign Up */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-[#F5F5F5]">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-[#FF3333] font-bold hover:underline"
                style={{ fontWeight: 700 }}
              >
                {isSignUp ? "SIGN IN" : "SIGN UP"}
              </button>
            </p>
          </div>
        </form>

        {/* Footer Note */}
        <div className="border-t-4 border-[#3A3A3A] bg-[#0A0A0A] p-3 sm:p-4">
          <p
            className="text-xs text-[#F5F5F5] opacity-70 text-center"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Your data is stored securely. We never share your information.
          </p>
        </div>
      </div>
    </div>
  );
}