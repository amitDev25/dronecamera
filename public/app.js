const socket = io('https://dronecamera.onrender.com');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;
const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
  // Mobile device: capture the video and stream it
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      localStream = stream;
      localVideo.srcObject = stream;
      localVideo.style.display = 'block';  // Show local video on mobile
      setupMobileConnection();
    })
    .catch(error => console.error('Error accessing media devices.', error));
} else {
  // Laptop device: just receive and display the video stream
  setupLaptopConnection();
}

function setupMobileConnection() {
  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  peerConnection.createOffer()
    .then(offer => peerConnection.setLocalDescription(offer))
    .then(() => socket.emit('offer', peerConnection.localDescription))
    .catch(error => console.error('Error creating offer.', error));

  socket.on('answer', answer => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on('candidate', candidate => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });
}

function setupLaptopConnection() {
  peerConnection = new RTCPeerConnection(servers);

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  socket.on('offer', offer => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => peerConnection.createAnswer())
      .then(answer => peerConnection.setLocalDescription(answer))
      .then(() => socket.emit('answer', peerConnection.localDescription));
  });

  socket.on('candidate', candidate => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });
}
