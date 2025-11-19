// socket.io 인스턴스 생성
// 백엔드 시그널링 서버에 연결합니다.
// 여기서는 localtunnel 도메인을 사용합니다.
const socket = io("https://wet-cases-roll.loca.lt");

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
document.getElementById("startButton").addEventListener("click", async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.srcObject = localStream;
});

// "call" 버튼 클릭 시 PeerConnection 생성 및 offer 전달
document.getElementById("callButton").addEventListener("click", async () => {
  createPeerConnection();

  // 내 미디어를 PeerConnection에 추가
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // offer를 시그널링 서버를 통해 상대에게 전달
  socket.emit("offer", offer);
});

/**
 * @description PeerConnection 생성 함수
 */
function createPeerConnection() {
  peerConnection = new RTCPeerConnection();

  // 상대 영상 표시
  peerConnection.addEventListener("track", (event) => {
    remoteVideo.srcObject = event.streams[0];
  });

  // ICE Candidate 발생 시 전송
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  });
}

// ---- Socket.io 이벤트 처리 ----

// offer 수신 시 Peer 답장 생성(Answer)
socket.on("offer", async (offer) => {
  createPeerConnection();

  await peerConnection.setRemoteDescription(offer);

  // 내 미디어를 PeerConnection에 추가
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", answer);
});

// answer 수신 시
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
