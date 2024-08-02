const socket = io('https://dronecamera.onrender.com');

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;

        socket.emit('ready');
    })
    .catch(error => console.error('Error accessing media devices.', error));

socket.on('offer', (data) => {
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
        remoteStream = event.streams[0];
    };

    peerConnection.addStream(localStream);

    peerConnection.setRemoteDescription(new RTCSessionDescription(data));

    peerConnection.createAnswer()
        .then(answer => {
            peerConnection.setLocalDescription(answer);
            socket.emit('answer', answer);
        })
        .catch(error => console.error('Error creating answer.', error));
});

socket.on('answer', (data) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(data));
});

socket.on('candidate', (data) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(data));
});

socket.on('ready', () => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(servers);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate);
            }
        };

        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
            remoteStream = event.streams[0];
        };

        peerConnection.addStream(localStream);

        peerConnection.createOffer()
            .then(offer => {
                peerConnection.setLocalDescription(offer);
                socket.emit('offer', offer);
            })
            .catch(error => console.error('Error creating offer.', error));
    }
});
