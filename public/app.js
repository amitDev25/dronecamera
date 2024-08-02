const socket = io('https://dronecamera.onrender.com'); // Connect to the server

let localStream;
let peerConnection;
const servers = null; // Use default STUN/TURN servers

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    setupConnection();
  })
  .catch(error => console.error('Error accessing media devices.', error));

function setupConnection() {
  peerConnection = new RTCPeerConnection(servers);

  // Add local stream to the peer connection
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Handle incoming remote stream
  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  // Create offer
  peerConnection.createOffer()
    .then(offer => {
      return peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    })
    .then(() => {
      socket.emit('offer', peerConnection.localDescription);
    })
    .catch(error => console.error('Error creating offer.', error));

  // Handle signaling messages
  socket.on('offer', (offer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => peerConnection.createAnswer())
      .then(answer => peerConnection.setLocalDescription(new RTCSessionDescription(answer)))
      .then(() => socket.emit('answer', peerConnection.localDescription))
      .catch(error => console.error('Error handling offer.', error));
  });

  socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      .catch(error => console.error('Error handling answer.', error));
  });

  socket.on('candidate', (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      .catch(error => console.error('Error adding ICE candidate.', error));
  });
}
