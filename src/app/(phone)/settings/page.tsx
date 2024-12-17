"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

const fonts = [
  { name: "Comic Sans MS", value: "comic-sans" },
  { name: "Helvetica", value: "helvetica" },
  { name: "Inter", value: "inter" },
  { name: "Righteous", value: "righteous" },
];

const textSizes = [
  { name: "Small", value: "sm" },
  { name: "Medium", value: "md" },
  { name: "Large", value: "lg" },
  { name: "Extra Large", value: "xl" },
];

export default function SettingsPage() {
  const [selectedFont, setSelectedFont] = useState("comic-sans");
  const [selectedSize, setSelectedSize] = useState("md");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "anky-settings",
      JSON.stringify({
        font: selectedFont,
        size: selectedSize,
        sound: soundEnabled,
        vibrate: vibrateEnabled,
      })
    );
  }, [selectedFont, selectedSize, soundEnabled, vibrateEnabled]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("anky-settings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setSelectedFont(settings.font);
      setSelectedSize(settings.size);
      setSoundEnabled(settings.sound);
      setVibrateEnabled(settings.vibrate);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold py-8">Settings</h1>
          <button onClick={() => window.history.back()}>
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="space-y-8">
          {/* Writing Font */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Writing Font</h2>
            <div className="grid grid-cols-2 gap-2">
              {fonts.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setSelectedFont(font.value)}
                  className={`p-4 rounded-lg border ${
                    selectedFont === font.value
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-gray-700"
                  }`}
                >
                  <span className={`font-${font.value}`}>{font.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Size */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Text Size</h2>
            <div className="grid grid-cols-2 gap-2">
              {textSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setSelectedSize(size.value)}
                  className={`p-4 rounded-lg border ${
                    selectedSize === size.value
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-gray-700"
                  }`}
                >
                  <span className={`text-${size.value}`}>{size.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Additional Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Sound Effects</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    soundEnabled ? "bg-purple-500" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${
                      soundEnabled ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>Vibration</span>
                <button
                  onClick={() => setVibrateEnabled(!vibrateEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    vibrateEnabled ? "bg-purple-500" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${
                      vibrateEnabled ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
