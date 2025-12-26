/**
 * 이 코드는 다음 순서로 동작합니다.
 *
 * 1. Socket.io 서버에 연결합니다.
 * 2. Start 버튼을 누르면 카메라/마이크 스트림을 가져와 화면에 보여줍니다.
 * 3. Call 버튼을 누르면 PeerConnection을 만들고 offer를 생성해 상대에게 전송합니다.
 * 4. 상대는 offer를 받아 PeerConnection을 만들고 Answer로 응답합니다.
 * 5. 두 브라우저는 서로의 ICE 후보를 주고받아 P2P 연결을 완성합니다.
 * 6. 연결되면 각자의 영상이 상대 화면에 표시됩니다.
 */

// socket.io 인스턴스를 생성합니다.
// 백엔드 시그널링 서버에 연결합니다.
// 여기서는 localtunnel 도메인을 사용합니다.
const socket = io("https://wet-cases-roll.loca.lt");

// DOM 요소를 가져옵니다.
// 내 영상/상대 영상을 표시할 HTML <video> 요소를 가져옵니다.
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

/**
 * @description 사용자 카메라/마이크 스트림을 담을 변수
 * @type {MediaStream}
 */
let localStream;

/**
 * @description P2P 연결을 관리할 RTCPeerConnection 객체를 담을 변수
 * @type {RTCPeerConnection}
 */
let peerConnection;

// "Start" 버튼 클릭 시 카메라 & 마이크 권한을 요청한 후 스트림을 가져옵니다.
// 내 화면(localVideo)에 미리보기를 출력하며, 아직 WebRTC 연결을 시작하지 않습니다.
document.getElementById("startButton").addEventListener("click", async () => {
  // 브라우저에 카메라/마이크 사용 권한을 요청하고 스트림을 얻습니다.
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true, // 카메라
    audio: true, // 마이크
  });

  // 얻은 로컬 미디어 스트림을 로컬 <video> 요소의 srcObject로 설정해 화면에 보여줍니다.
  localVideo.srcObject = localStream;
});

// "Call" 버튼 클릭 시 PeerConnection 생성 및 offer SDP (Session Description Protocol) 생성 후 전달합니다.
document.getElementById("callButton").addEventListener("click", async () => {
  createPeerConnection();

  // 내 미디어를 PeerConnection에 추가하여 상대에게 전송 가능하게 합니다.
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // 로컬 SDP offer를 생성하고 저장합니다.
  const offer = await peerConnection.createOffer();

  // 생성한 offer를 로컬 설명으로 설정(로컬 상태에 반영)합니다.
  await peerConnection.setLocalDescription(offer);

  // offer를 시그널링 서버를 통해 상대에게 전달합니다.
  socket.emit("offer", offer);
});

/**
 * @description PeerConnection 생성 함수
 */
function createPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // Google의 공용 STUN 서버
  });

  // 원격 트랙이 수신되면 원격 비디오에 연결합니다.
  // 상대 영상이 들어오면 remoteVideo에 표시합니다.
  peerConnection.addEventListener("track", (event) => {
    remoteVideo.srcObject = event.streams[0];
  });

  // ICE Candidate 발생 시 전송
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      // 생성된 ICE 후보를 시그널링 서버로 전송해 다른 피어가 네트워크 연결을 시도할 수 있게 합니다.
      socket.emit("candidate", event.candidate);
    }
  });
}

// ---- Socket.io 이벤트 처리 ----

// offer 수신 시 answer를 생성해 전송합니다.
socket.on("offer", async (offer) => {
  createPeerConnection();

  await peerConnection.setRemoteDescription(offer);

  // 내 미디어를 PeerConnection에 추가합니다.
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // 수신한 offer에 대한 SDP answer를 생성합니다.
  const answer = await peerConnection.createAnswer();

  // 생성한 answer를 로컬 설명으로 설정합니다.
  await peerConnection.setLocalDescription(answer);

  // 생성한 answer를 시그널링 서버로 전송해 offer를 전송한 쪽이 이를 수신하도록 합니다.
  socket.emit("answer", answer);
});

// answer 수신 시
socket.on("answer", async (answer) => {
  // 수신한 answer를 원격 설명으로 설정해 양쪽의 SDP 교환을 완료합니다.
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
