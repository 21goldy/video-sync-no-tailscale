console.log("Video Sync popup loaded");

// --------------------------------------------------
// ELEMENTS
// --------------------------------------------------

const connectionStatus =
    document.getElementById("connectionStatus");

const connectionDot =
    document.getElementById("connectionDot");

const roomStatus =
    document.getElementById("roomStatus");

const roomActions =
    document.getElementById("roomActions");

const roomInput =
    document.getElementById("roomInput");

const createRoom =
    document.getElementById("createRoom");

const joinRoom =
    document.getElementById("joinRoom");

const leaveRoom =
    document.getElementById("leaveRoom");

const videoStatus =
    document.getElementById("videoStatus");

const timeDisplay =
    document.getElementById("time");

const restartButton =
    document.getElementById("restart");

const playButton =
    document.getElementById("play");

const pauseButton =
    document.getElementById("pause");

const syncButton =
    document.getElementById("sync");


// --------------------------------------------------
// STATE
// --------------------------------------------------

let connected = false;
let currentRoom = null;
let currentRole = null;


// --------------------------------------------------
// CONNECTION STATUS
// --------------------------------------------------

function updateConnectionUI(isConnected) {

    connected = isConnected;

    if (isConnected) {

        connectionStatus.textContent =
            "Connected to sync server";

        connectionDot.classList.remove(
            "disconnected"
        );

        connectionDot.classList.add(
            "connected"
        );

    } else {

        connectionStatus.textContent =
            "Connecting...";

        connectionDot.classList.remove(
            "connected"
        );

        connectionDot.classList.add(
            "disconnected"
        );
    }
}


// --------------------------------------------------
// ROOM UI
// --------------------------------------------------

function showActiveRoom() {

    if (!currentRoom) {
        return;
    }

    const roleText =
        currentRole === "master"
            ? "Master"
            : "Client";

    roomStatus.textContent =
        `${currentRoom} • ${roleText}`;

    roomActions.style.display =
        "none";

    leaveRoom.style.display =
        "block";
}


function showNoRoom() {

    currentRoom = null;
    currentRole = null;

    roomStatus.textContent =
        "No active session";

    roomActions.style.display =
        "block";

    leaveRoom.style.display =
        "none";
}


// --------------------------------------------------
// TIME FORMAT
// --------------------------------------------------

function formatTime(seconds) {

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        return "00:00";
    }

    seconds =
        Math.floor(seconds);

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}


// --------------------------------------------------
// GET ACTIVE TAB
// --------------------------------------------------

async function getActiveTab() {

    const tabs =
        await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

    if (!tabs.length) {
        return null;
    }

    return tabs[0];
}


// --------------------------------------------------
// GET VIDEO STATE
// --------------------------------------------------

async function getVideoState() {

    const tab =
        await getActiveTab();

    if (!tab || !tab.id) {

        return {
            success: false,
            error: "No active tab"
        };
    }

    try {

        const response =
            await chrome.tabs.sendMessage(
                tab.id,
                {
                    action: "getTime"
                }
            );

        return response;

    } catch (error) {

        return {
            success: false,
            error:
                "No video found on this page"
        };
    }
}


// --------------------------------------------------
// UPDATE VIDEO UI
// --------------------------------------------------

async function updateVideoStatus() {

    const state =
        await getVideoState();

    if (!state || !state.success) {

        videoStatus.textContent =
            "No video detected";

        timeDisplay.textContent =
            "00:00 / 00:00";

        return;
    }

    videoStatus.textContent =
        "Video detected";

    timeDisplay.textContent =
        `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
}


// --------------------------------------------------
// SEND MESSAGE TO ACTIVE VIDEO TAB
// --------------------------------------------------

async function sendToVideo(message) {

    const tab =
        await getActiveTab();

    if (!tab || !tab.id) {

        return {
            success: false,
            error: "No active tab"
        };
    }

    try {

        return await chrome.tabs.sendMessage(
            tab.id,
            message
        );

    } catch (error) {

        console.error(
            "Video message error:",
            error
        );

        return {
            success: false,
            error:
                "Could not communicate with video"
        };
    }
}


// --------------------------------------------------
// SEND SYNC STATE
// --------------------------------------------------

async function sendSyncState() {

    if (!currentRoom) {

        alert(
            "Create or join a session first."
        );

        return;
    }

    const state =
        await getVideoState();

    if (!state || !state.success) {

        alert(
            "No video found on this page."
        );

        return;
    }

    try {

        const response =
            await chrome.runtime.sendMessage({

                type: "socket",

                data: {

                    type: "sync",

                    action: "state",

                    time:
                        state.currentTime,

                    playing:
                        !state.paused,

                    playbackRate:
                        state.playbackRate
                }
            });

        if (
            response &&
            response.success === false
        ) {

            alert(
                response.error ||
                "Unable to send sync."
            );

            return;
        }

        console.log(
            "Sync sent:",
            state
        );

    } catch (error) {

        console.error(
            "Sync error:",
            error
        );
    }
}


// --------------------------------------------------
// CREATE ROOM
// --------------------------------------------------

createRoom.addEventListener(
    "click",
    async () => {

        if (!connected) {

            alert(
                "Still connecting to the sync server. Please wait a moment."
            );

            return;
        }

        // Generate a simple 6-character room code
        const room =
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

        console.log(
            "Creating room:",
            room
        );

        try {

            const response =
                await chrome.runtime.sendMessage({

                    type: "create-room",

                    room: room
                });

            if (
                response &&
                response.success === false
            ) {

                alert(
                    response.error ||
                    "Unable to create room."
                );

                return;
            }

            // The server will send room-created.
            console.log(
                "Create room request sent."
            );

        } catch (error) {

            console.error(
                "Create room error:",
                error
            );

            alert(
                "Could not create the session."
            );
        }
    }
);


// --------------------------------------------------
// JOIN ROOM
// --------------------------------------------------

joinRoom.addEventListener(
    "click",
    async () => {

        if (!connected) {

            alert(
                "Still connecting to the sync server. Please wait a moment."
            );

            return;
        }

        const room =
            roomInput.value
                .trim()
                .toUpperCase();

        if (!room) {

            alert(
                "Enter a room code."
            );

            roomInput.focus();

            return;
        }

        console.log(
            "Joining room:",
            room
        );

        try {

            const response =
                await chrome.runtime.sendMessage({

                    type: "join-room",

                    room: room
                });

            if (
                response &&
                response.success === false
            ) {

                alert(
                    response.error ||
                    "Unable to join room."
                );

                return;
            }

            console.log(
                "Join room request sent."
            );

        } catch (error) {

            console.error(
                "Join room error:",
                error
            );

            alert(
                "Could not join the session."
            );
        }
    }
);


// --------------------------------------------------
// ENTER KEY IN ROOM INPUT
// --------------------------------------------------

roomInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            joinRoom.click();
        }
    }
);


// --------------------------------------------------
// LEAVE ROOM
// --------------------------------------------------

leaveRoom.addEventListener(
    "click",
    async () => {

        try {

            const response =
                await chrome.runtime.sendMessage({

                    type: "leave-room"
                });

            if (
                response &&
                response.success === false
            ) {

                alert(
                    response.error ||
                    "Unable to leave session."
                );

                return;
            }

            showNoRoom();

        } catch (error) {

            console.error(
                "Leave room error:",
                error
            );

            showNoRoom();
        }
    }
);


// --------------------------------------------------
// PLAY
// --------------------------------------------------

playButton.addEventListener(
    "click",
    async () => {

        if (!currentRoom) {

            alert(
                "Create or join a session first."
            );

            return;
        }

        const result =
            await sendToVideo({
                action: "play"
            });

        if (
            !result ||
            result.success === false
        ) {

            alert(
                result?.error ||
                "Could not play the video."
            );

            return;
        }

        await sendSyncState();

        updateVideoStatus();
    }
);


// --------------------------------------------------
// PAUSE
// --------------------------------------------------

pauseButton.addEventListener(
    "click",
    async () => {

        if (!currentRoom) {

            alert(
                "Create or join a session first."
            );

            return;
        }

        const result =
            await sendToVideo({
                action: "pause"
            });

        if (
            !result ||
            result.success === false
        ) {

            alert(
                result?.error ||
                "Could not pause the video."
            );

            return;
        }

        await sendSyncState();

        updateVideoStatus();
    }
);


// --------------------------------------------------
// RESTART
// --------------------------------------------------

restartButton.addEventListener(
    "click",
    async () => {

        if (!currentRoom) {

            alert(
                "Create or join a session first."
            );

            return;
        }

        const result =
            await sendToVideo({
                action: "restart"
            });

        if (
            !result ||
            result.success === false
        ) {

            alert(
                result?.error ||
                "Could not restart the video."
            );

            return;
        }

        await sendSyncState();

        updateVideoStatus();
    }
);


// --------------------------------------------------
// SYNC NOW
// --------------------------------------------------

syncButton.addEventListener(
    "click",
    async () => {

        if (!currentRoom) {

            alert(
                "Create or join a session first."
            );

            return;
        }

        syncButton.disabled =
            true;

        const originalText =
            syncButton.innerHTML;

        syncButton.innerHTML =
            "<span>⟳</span> Syncing...";

        try {

            await sendSyncState();

            await updateVideoStatus();

        } finally {

            setTimeout(() => {

                syncButton.disabled =
                    false;

                syncButton.innerHTML =
                    originalText;

            }, 500);
        }
    }
);


// --------------------------------------------------
// MESSAGES FROM BACKGROUND
// --------------------------------------------------

chrome.runtime.onMessage.addListener(
    (message) => {

        console.log(
            "Popup received:",
            message
        );


        // ------------------------------
        // CONNECTION
        // ------------------------------

        if (
            message.type ===
            "connection-status"
        ) {

            updateConnectionUI(
                message.connected
            );

            return;
        }


        // ------------------------------
        // SERVER CONNECTED
        // ------------------------------

        if (
            message.type ===
            "server-connected"
        ) {

            updateConnectionUI(
                true
            );

            return;
        }


        // ------------------------------
        // ROOM CREATED
        // ------------------------------

        if (
            message.type ===
            "room-created"
        ) {

            currentRoom =
                message.room;

            currentRole =
                "master";

            console.log(
                "Room created:",
                currentRoom
            );

            showActiveRoom();

            return;
        }


        // ------------------------------
        // ROOM JOINED
        // ------------------------------

        if (
            message.type ===
            "room-joined"
        ) {

            currentRoom =
                message.room;

            currentRole =
                "client";

            console.log(
                "Room joined:",
                currentRoom
            );

            showActiveRoom();

            return;
        }


        // ------------------------------
        // PEER JOINED
        // ------------------------------

        if (
            message.type ===
            "peer-joined"
        ) {

            console.log(
                "Other computer joined the session."
            );

            roomStatus.textContent =
                `${currentRoom} • ${currentRole === "master" ? "Master" : "Client"} • Connected`;

            return;
        }


        // ------------------------------
        // PEER LEFT
        // ------------------------------

        if (
            message.type ===
            "peer-left"
        ) {

            console.log(
                "Other computer left the session."
            );

            if (currentRoom) {

                roomStatus.textContent =
                    `${currentRoom} • ${currentRole === "master" ? "Master" : "Client"} • Waiting for computer`;
            }

            return;
        }


        // ------------------------------
        // SESSION LEFT
        // ------------------------------

        if (
            message.type ===
            "session-left"
        ) {

            console.log(
                "Session ended."
            );

            showNoRoom();

            return;
        }


        // ------------------------------
        // SERVER ERROR
        // ------------------------------

        if (
            message.type ===
            "error"
        ) {

            console.error(
                "Server error:",
                message.message
            );

            alert(
                message.message ||
                "Server error."
            );

            return;
        }
    }
);


// --------------------------------------------------
// INITIALIZE POPUP
// --------------------------------------------------

async function initialize() {

    console.log(
        "Initializing popup..."
    );

    try {

        // Get connection + saved session
        const session =
            await chrome.runtime.sendMessage({

                type: "get-session"
            });

        console.log(
            "Current session:",
            session
        );

        if (session) {

            currentRoom =
                session.room ||
                null;

            currentRole =
                session.role ||
                null;
        }


        // Get connection status
        const connection =
            await chrome.runtime.sendMessage({

                type:
                    "get-connection-status"
            });

        if (connection) {

            updateConnectionUI(
                connection.connected
            );
        }


        // Restore room UI
        if (
            currentRoom &&
            currentRole
        ) {

            showActiveRoom();

        } else {

            showNoRoom();
        }


        // Check video
        await updateVideoStatus();


    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );
    }
}


// Start
initialize();


// --------------------------------------------------
// REFRESH VIDEO TIME WHILE POPUP IS OPEN
// --------------------------------------------------

setInterval(
    () => {

        updateVideoStatus();

    },
    500
);
