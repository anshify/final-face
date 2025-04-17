import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [upiID, setUpiID] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);

  // Start webcam
  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => (videoRef.current.srcObject = stream))
      .catch((err) => console.error('Error accessing webcam:', err));
  };

  // Load face-api models
  const loadModels = async () => {
    const MODEL_URL = '/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  };

  // Persist users to localStorage
  const persistUsers = (users) => {
    localStorage.setItem('face-users', JSON.stringify(users));
  };

  // Load users from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('face-users');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert descriptors back to Float32Array
      const converted = parsed.map(user => ({
        upiID: user.upiID,
        descriptor: new Float32Array(user.descriptor)
      }));
      setRegisteredUsers(converted);
    }
  }, []);

  // Face registration logic with duplicate check
  const registerFace = async () => {
    if (!upiID) {
      alert('Please enter your UPI ID');
      return;
    }

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      alert('No face detected. Please try again.');
      return;
    }

    // Check if the same face is already registered
    const existingUser = registeredUsers.find(
      (user) => {
        const distance = faceapi.euclideanDistance(user.descriptor, detections.descriptor);
        return distance < 0.6; // Threshold for matching faces
      }
    );

    if (existingUser) {
      alert(`❌ This face is already registered with UPI ID: ${existingUser.upiID}`);
      return;
    }

    // Register new user
    const newUser = {
      upiID: upiID,
      descriptor: Array.from(detections.descriptor), // Save as array for localStorage
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    persistUsers(updatedUsers);

    alert(`✅ Face registered for ${upiID}`);
    setUpiID('');
  };

  // Face recognition and mock payment
  const recognizeAndPay = async () => {
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      alert('No face detected. Please try again.');
      return;
    }

    const labeledDescriptors = registeredUsers.map(user =>
      new faceapi.LabeledFaceDescriptors(
        user.upiID,
        [new Float32Array(user.descriptor)]
      )
    );

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    const match = faceMatcher.findBestMatch(detection.descriptor);

    if (match.label !== 'unknown') {
      alert(`✅ Payment triggered for ${match.label}`);
    } else {
      alert('❌ Face not recognized.');
    }
  };

  // Clear registered faces
  const clearRegisteredFaces = () => {
    setRegisteredUsers([]);
    localStorage.removeItem('face-users');
    alert('✅ All registered faces have been cleared.');
  };

  useEffect(() => {
    loadModels().then(startVideo);

    videoRef.current && videoRef.current.addEventListener('play', () => {
      const canvas = faceapi.createCanvasFromMedia(videoRef.current);
      canvasRef.current.innerHTML = '';
      canvasRef.current.append(canvas);

      const displaySize = {
        width: videoRef.current.width,
        height: videoRef.current.height,
      };
      faceapi.matchDimensions(canvas, displaySize);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
      }, 100);
    });
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>👤 Register Your Face with UPI ID</h2>
      <input
        type="text"
        value={upiID}
        placeholder="Enter your UPI ID"
        onChange={(e) => setUpiID(e.target.value)}
        style={{ padding: '10px', width: '300px', fontSize: '16px' }}
      />
      <br />
      <button onClick={registerFace} style={{ marginTop: '10px', padding: '10px 20px' }}>
        Register Face
      </button>
      <button onClick={recognizeAndPay} style={{ marginTop: '10px', padding: '10px 20px', marginLeft: '10px' }}>
        Recognize & Pay
      </button>
      <button onClick={clearRegisteredFaces} style={{ marginTop: '10px', padding: '10px 20px', marginLeft: '10px' }}>
        Clear All Registered Faces
      </button>

      <div style={{ marginTop: '20px' }}>
        <video ref={videoRef} width="720" height="560" autoPlay muted />
        <div ref={canvasRef} />
      </div>

      {registeredUsers.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>👥 Registered Users:</h3>
          <ul>
            {registeredUsers.map((user, index) => (
              <li key={index}>{user.upiID}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FaceRecognition;
