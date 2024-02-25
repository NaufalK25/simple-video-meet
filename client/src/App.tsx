import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "peerjs";
import "./App.css";

const socket = io(
  import.meta.env.VITE_SOCKET_SERVER || "http://localhost:5000"
);

function App() {
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [myPeerId, setMyPeerId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [cameraStatus, setCameraStatus] = useState(false);
  const [micStatus, setMicStatus] = useState(false);
  // console.log('env', import.meta.env.VITE_SOCKET_SERVER);

  useEffect(() => {
    const initPeer = () => {
      peerRef.current = new Peer();

      peerRef.current.on("open", (id) => {
        console.log("id", id);
        setMyPeerId(id);
      });

      // console.log("peerRef.current", peerRef.current);

      peerRef.current.on("call", (call) => {
        // console.log("call", call);
        call.answer(stream as MediaStream);
        call.on("stream", (remoteStream) => {
          // console.log("remoteStream", remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
      });

      peerRef.current.on("connection", (conn) => {
        // console.log("conn", conn);

        conn.on("data", (data) => {
          console.log("Data received from peer:", data);
        });
      });
    };

    socket.on("connect", () => {
      console.log("Connected to server");
      initPeer();
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((userStream) => {
        setStream(userStream);

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = userStream;
        }
        // console.log("stream", userStream);

        initPeer();
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
      });

    return () => {
      socket.disconnect();
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const startCall = () => {
    if (!recipientId) {
      alert("Please input the recipient id");
      return;
    }

    if (peerRef.current && stream) {
      // console.log("startCall.recipientId", recipientId);
      // console.log("startCall.stream", stream);
      const call = peerRef.current.call(recipientId, stream);
      // console.log("startCall.call", call);
      call.on("stream", (remoteStream) => {
        // console.log("startCall.stream", remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        // console.log("remoteVideoRef.current", remoteVideoRef.current);
      });
    }
  };

  const leaveCall = () => {
    if (peerRef.current) {
      peerRef.current.disconnect();
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setRecipientId("");
  };

  const switchCamera = () => {
    setCameraStatus((prev) => !prev);

    if (stream) {
      const tracks = stream.getVideoTracks();
      tracks.forEach((track) => {
        track.enabled = cameraStatus;
      });
    }
  };

  const switchMic = () => {
    setMicStatus((prev) => !prev);

    if (stream) {
      const tracks = stream.getAudioTracks();
      tracks.forEach((track) => {
        track.enabled = micStatus;
      });
    }
  };

  return (
    <div className="container">
      <h1>Simple Video Meet</h1>
      <p>Your Peer Id: {myPeerId}</p>
      {!remoteVideoRef.current?.srcObject ? (
        <div className="form-container">
          <input
            type="text"
            placeholder="Enter Recipient Id"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          />
          <img
            className="icon"
            onClick={startCall}
            src="phone.svg"
            alt=""
            title="Start Call"
          />
        </div>
      ) : null}

      <div className="video-container">
        <video ref={myVideoRef} autoPlay playsInline muted={micStatus} />
        <video
          ref={remoteVideoRef}
          className="remote-video"
          autoPlay
          playsInline
        />
      </div>
      <div className="button-action-container">
        <img
          className="icon"
          onClick={switchCamera}
          src={cameraStatus ? "video-off.svg" : "video.svg"}
          alt=""
          title={`Turn Camera ${cameraStatus ? "On" : "Off"}`}
        />
        <img
          className="icon"
          onClick={switchMic}
          src={micStatus ? "mic-off.svg" : "mic.svg"}
          alt=""
          title={`Turn Mic ${micStatus ? "On" : "Off"}`}
        />
        {remoteVideoRef.current?.srcObject ? (
          <img
            className="icon leave-icon"
            onClick={leaveCall}
            src="phone.svg"
            alt=""
            title="Leave Call"
          />
        ) : null}
      </div>
    </div>
  );
}

export default App;
