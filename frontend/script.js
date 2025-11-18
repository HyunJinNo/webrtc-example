// socket.io 인스턴스 생성
const socket = io("http://localhost:3000");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

/**
 * @type {MediaStream}
 */
let localStream;

/**
 * @type {RTCPeerConnection}
 */
let peerConnection;

// "Start" 버튼 클릭 시 카메라 가져오기
document.getElementById("startButton").onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  localVideo.srcObject = localStream;
};

document.getElementById("callButton").onclick = async () => {
  createPeerConnection();

  // 로컬 스트림 트랙을 피어 연결에 추가
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", offer);
};

function createPeerConnection() {
  peerConnection = new RTCPeerConnection();

  // 상대 영상 표시
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // ICE Candidate 발생 시 전송
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };
}

// ---- Socket.io 이벤트 처리 ----

// Offer 수신 시 Peer 답장 생성(Answer)
socket.on("offer", async (offer) => {
  createPeerConnection();

  await peerConnection.setRemoteDescription(offer);

  // 로컬 스트림 트랙을 피어 연결에 추가
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", answer);
});

// Answer 수신 시
socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(answer);
});

// ICE Candidate 수신 시
socket.on("candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error(`Error adding ICE candidate: ${error}`);
  }
});
