const socket = io('https://dronecamera.onrender.com');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;
const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// If this script is running on the mobile device, capture the camera feed
if (localVideo) {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      localStream = stream;
      localVideo.srcObject = stream;
      setupConnection();
    })
    .catch(error => console.error('Error accessing media devices.', error));
}

function setupConnection() {
  peerConnection = new RTCPeerConnection(servers);

  if (localStream) {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  }

  peerConnection.ontrack = event => {
    if (remoteVideo) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  if (localStream) {
    peerConnection.createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => socket.emit('offer', peerConnection.localDescription))
      .catch(error => console.error('Error creating offer.', error));
  }

  socket.on('offer', offer => {
    if (!localStream) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => socket.emit('answer', peerConnection.localDescription))
        .catch(error => console.error('Error handling offer.', error));
    }
  });

  socket.on('answer', answer => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      .catch(error => console.error('Error handling answer.', error));
  });

  socket.on('candidate', candidate => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      .catch(error => console.error('Error adding ICE candidate.', error));
  });
}
