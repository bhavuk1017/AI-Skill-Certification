import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function ProctoredTest() {
  const [isSharing, setIsSharing] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [warning, setWarning] = useState("");
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [screenStream, setScreenStream] = useState(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const question = "Explain the significance of AI in modern computing.";

  // ✅ Log violations when detected
  const logViolation = async (type) => {
    if (testStarted && !testSubmitted) {
      alert(`⚠️ Violation Detected: ${type}`);
      setWarning(`⚠️ ${type}`);
      try {
        await axios.post("http://localhost:5000/log-violation", { type });
      } catch (error) {
        console.error("Error logging violation:", error);
      }
    }
  };

  // ✅ Start camera when test begins
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };
    if (testStarted) {
      startCamera();
    }
  }, [testStarted]);

  // ✅ Capture & send frames every second
  useEffect(() => {
    const sendFrame = async () => {
      if (!videoRef.current || testSubmitted) return;
  
      // Create an offscreen canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
  
      // Convert canvas to Blob and send the image
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error("Failed to create image Blob");
          return;
        }
  
        const formData = new FormData();
        formData.append("image", blob, "frame.jpg"); // Ensure Blob type is correct
  
        try {
          const response = await axios.post("http://localhost:5001/detect_faces", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
  
          if (response.data.violation) {
            logViolation(response.data.violation);
          }
        } catch (error) {
          console.error("Error sending frame:", error);
        }
      }, "image/jpeg");
    };
  
    if (testStarted && !testSubmitted) {
      const interval = setInterval(sendFrame, 1000);
      return () => clearInterval(interval);
    }
  }, [testStarted, testSubmitted]);
  

  // ✅ Detect tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (testStarted && !testSubmitted && document.hidden) {
        logViolation("Tab Switch Detected");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [testStarted, testSubmitted]);

  // ✅ Start screen sharing
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setIsSharing(true);
      setTestStarted(true);
      setWarning("");

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (!testSubmitted) {
          logViolation("Screen Sharing Stopped");
        }
      });
    } catch (err) {
      logViolation("Screen Sharing Denied");
    }
  };

  // ✅ Stop screen sharing
  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsSharing(false);
    }
  };
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop()); // Stop all camera tracks
      videoRef.current.srcObject = null; // Remove video source
    }
  };

  
  // ✅ Submit test (stop violations & screen sharing)
  const submitTest = () => {
    setTestSubmitted(true);
    stopScreenShare();
    stopCamera();
    alert("✅ Test Submitted Successfully!");
    setTimeout(() => navigate("/"), 2000);
  };

  // ✅ Format timer display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-3xl text-center">
        <h1 className="text-2xl font-bold mb-4 text-blue-600">Proctored Test</h1>

        {!testStarted ? (
          <button
            onClick={startScreenShare}
            className="bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg shadow hover:bg-blue-600 transition"
          >
            Start Test
          </button>
        ) : (
          <div>
            <video ref={videoRef} autoPlay playsInline className="hidden" />
            <p className="text-lg font-semibold text-gray-700">{question}</p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="border rounded-lg p-4 mt-4 w-full h-32 resize-none shadow"
              placeholder="Type your answer here..."
              disabled={testSubmitted}
            />
            <div className="flex justify-between items-center mt-4">
              <span className="text-red-600 font-semibold text-lg">
                ⏳ Time Left: {formatTime(timeLeft)}
              </span>
              <button
                onClick={submitTest}
                className="py-2 px-6 font-semibold rounded-lg shadow bg-green-500 text-white hover:bg-green-600 transition"
                disabled={testSubmitted}
              >
                {testSubmitted ? "Test Submitted" : "Submit Test"}
              </button>
            </div>
          </div>
        )}

        {warning && <p className="mt-4 text-red-600 font-semibold">{warning}</p>}
      </div>
    </div>
  );
}

export default ProctoredTest;
