// PUBLIC WEBSOCKET SERVER
//
// Deploy the /server folder to Render (or another public WebSocket host),
// then replace the URL below with your service URL.
// Example: wss://video-sync-server-xxxx.onrender.com
//
// IMPORTANT: Use wss:// for a public HTTPS/WSS server.
const SERVER_URL =
    "wss://YOUR-SERVICE-NAME.onrender.com";

let socket = null;
let currentRoom = null;
let currentRole = null;
let reconnectTimer = null;
let intentionallyClosed = false;


// --------------------------------------------------
// SESSION STORAGE
// --------------------------------------------------

async function saveSession() {

    try {

        await chrome.storage.local.set({
            currentRoom: currentRoom,
            currentRole: currentRole
        });

    } catch (error) {

        console.error(
            "Failed saving session:",
            error
        );
    }
}


async function clearSession() {

    currentRoom = null;
    currentRole = null;

    try {

        await chrome.storage.local.remove([
            "currentRoom",
            "currentRole"
        ]);

    } catch (error) {

        console.error(
            "Failed clearing session:",
            error
        );
    }
}


async function loadSession() {

    try {

        const data =
            await chrome.storage.local.get([
                "currentRoom",
                "currentRole"
            ]);

        currentRoom =
            data.currentRoom || null;

        currentRole =
            data.currentRole || null;

        console.log(
            "Loaded session:",
            {
                currentRoom,
                currentRole
            }
        );

    } catch (error) {

        console.error(
            "Failed loading session:",
            error
        );
    }
}


// --------------------------------------------------
// CONNECTION STATE
// --------------------------------------------------

function isConnected() {

    return (
        socket &&
        socket.readyState ===
            WebSocket.OPEN
    );
}


function isConnecting() {

    return (
        socket &&
        socket.readyState ===
            WebSocket.CONNECTING
    );
}


// --------------------------------------------------
// SEND TO POPUP
// --------------------------------------------------

function sendToPopup(message) {

    chrome.runtime
        .sendMessage(message)
        .catch(() => {
            // Popup may be closed.
        });
}


// --------------------------------------------------
// SEND TO ALL VIDEO TABS
// --------------------------------------------------

async function sendToTabs(message) {

    try {

        const tabs =
            await chrome.tabs.query({});

        for (const tab of tabs) {

            if (!tab.id) {
                continue;
            }

            chrome.tabs
                .sendMessage(
                    tab.id,
                    message
                )
                .catch(() => {
                    // Tab may not contain the content script.
                });
        }

    } catch (error) {

        console.error(
            "Tab broadcast error:",
            error
        );
    }
}


// --------------------------------------------------
// RECONNECT
// --------------------------------------------------

function scheduleReconnect() {

    if (reconnectTimer) {
        return;
    }

    reconnectTimer =
        setTimeout(() => {

            reconnectTimer = null;

            connect();

        }, 3000);
}


// --------------------------------------------------
// CONNECT TO SERVER
// --------------------------------------------------

function connect() {

    if (isConnected()) {
        return;
    }

    if (isConnecting()) {
        return;
    }

    console.log(
        "Connecting to:",
        SERVER_URL
    );

    intentionallyClosed = false;

    try {

        socket =
            new WebSocket(
                SERVER_URL
            );

    } catch (error) {

        console.error(
            "WebSocket creation failed:",
            error
        );

        scheduleReconnect();

        return;
    }


    // ----------------------------------------------
    // SOCKET OPEN
    // ----------------------------------------------

    socket.onopen = () => {

        console.log(
            "Connected to Video Sync server."
        );

        if (reconnectTimer) {

            clearTimeout(
                reconnectTimer
            );

            reconnectTimer = null;
        }

        sendToPopup({

            type:
                "connection-status",

            connected:
                true
        });


        // ------------------------------------------
        // RESTORE PREVIOUS SESSION
        // ------------------------------------------

        if (
            currentRoom &&
            currentRole
        ) {

            console.log(
                "Restoring room:",
                currentRoom,
                currentRole
            );


            if (
                currentRole ===
                "master"
            ) {

                socket.send(
                    JSON.stringify({

                        type:
                            "create-room",

                        room:
                            currentRoom
                    })
                );

            } else {

                socket.send(
                    JSON.stringify({

                        type:
                            "join-room",

                        room:
                            currentRoom
                    })
                );
            }
        }
    };


    // ----------------------------------------------
    // SERVER MESSAGE
    // ----------------------------------------------

    socket.onmessage =
        async (event) => {

            try {

                const message =
                    JSON.parse(
                        event.data
                    );

                console.log(
                    "Server message:",
                    message
                );


                // ----------------------------------
                // SERVER CONNECTED
                // ----------------------------------

                if (
                    message.type ===
                    "connected"
                ) {

                    sendToPopup({

                        type:
                            "server-connected"
                    });

                    return;
                }


                // ----------------------------------
                // ROOM CREATED
                // ----------------------------------

                if (
                    message.type ===
                    "room-created"
                ) {

                    currentRoom =
                        message.room;

                    currentRole =
                        "master";

                    await saveSession();

                    sendToPopup(
                        message
                    );

                    return;
                }


                // ----------------------------------
                // ROOM JOINED
                // ----------------------------------

                if (
                    message.type ===
                    "room-joined"
                ) {

                    currentRoom =
                        message.room;

                    currentRole =
                        "client";

                    await saveSession();

                    sendToPopup(
                        message
                    );

                    return;
                }


                // ----------------------------------
                // SESSION LEFT
                // ----------------------------------

                if (
                    message.type ===
                    "session-left"
                ) {

                    await clearSession();

                    sendToPopup(
                        message
                    );

                    return;
                }


                // ----------------------------------
                // PEER JOINED
                // ----------------------------------

                if (
                    message.type ===
                    "peer-joined"
                ) {

                    sendToPopup(
                        message
                    );

                    return;
                }


                // ----------------------------------
                // PEER LEFT
                // ----------------------------------

                if (
                    message.type ===
                    "peer-left"
                ) {

                    sendToPopup(
                        message
                    );

                    return;
                }


                // ----------------------------------
                // SERVER ERROR
                // ----------------------------------

                if (
                    message.type ===
                    "error"
                ) {

                    sendToPopup(
                        message
                    );

                    return;
                }


                // ----------------------------------
                // CLOCK PONG
                // ----------------------------------

                if (
                    message.type ===
                    "clock-pong"
                ) {

                    await sendToTabs(
                        message
                    );

                    return;
                }


                // ----------------------------------
                // SYNC
                // ----------------------------------

                if (
                    message.type ===
                    "sync"
                ) {

                    await sendToTabs(
                        message
                    );

                    return;
                }

            } catch (error) {

                console.error(
                    "Message error:",
                    error
                );
            }
        };


    // ----------------------------------------------
    // SOCKET CLOSED
    // ----------------------------------------------

    socket.onclose = () => {

        console.log(
            "Disconnected from server."
        );

        socket = null;

        sendToPopup({

            type:
                "connection-status",

            connected:
                false
        });


        if (
            !intentionallyClosed
        ) {

            scheduleReconnect();
        }
    };


    // ----------------------------------------------
    // SOCKET ERROR
    // ----------------------------------------------

    socket.onerror =
        (error) => {

            console.error(
                "WebSocket error:",
                error
            );
        };
}


// --------------------------------------------------
// EXTENSION MESSAGES
// --------------------------------------------------

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {


        // ------------------------------------------
        // GET CONNECTION STATUS
        // ------------------------------------------

        if (
            message.type ===
            "get-connection-status"
        ) {

            sendResponse({

                connected:
                    isConnected(),

                serverUrl:
                    SERVER_URL,

                room:
                    currentRoom,

                role:
                    currentRole
            });

            return true;
        }


        // ------------------------------------------
        // GET SESSION
        // ------------------------------------------

        if (
            message.type ===
            "get-session"
        ) {

            sendResponse({

                room:
                    currentRoom,

                role:
                    currentRole,

                serverUrl:
                    SERVER_URL
            });

            return true;
        }


        // ------------------------------------------
        // CREATE ROOM
        // ------------------------------------------

        if (
            message.type ===
            "create-room"
        ) {

            if (!isConnected()) {

                sendResponse({

                    success:
                        false,

                    error:
                        "Server not connected"
                });

                return true;
            }

            const room =
                String(
                    message.room || ""
                )
                .trim()
                .toUpperCase();


            if (!room) {

                sendResponse({

                    success:
                        false,

                    error:
                        "Invalid room code"
                });

                return true;
            }


            currentRoom =
                room;

            currentRole =
                "master";


            saveSession();


            socket.send(
                JSON.stringify({

                    type:
                        "create-room",

                    room:
                        room
                })
            );


            sendResponse({

                success:
                    true
            });

            return true;
        }


        // ------------------------------------------
        // JOIN ROOM
        // ------------------------------------------

        if (
            message.type ===
            "join-room"
        ) {

            if (!isConnected()) {

                sendResponse({

                    success:
                        false,

                    error:
                        "Server not connected"
                });

                return true;
            }

            const room =
                String(
                    message.room || ""
                )
                .trim()
                .toUpperCase();


            if (!room) {

                sendResponse({

                    success:
                        false,

                    error:
                        "Invalid room code"
                });

                return true;
            }


            currentRoom =
                room;

            currentRole =
                "client";


            saveSession();


            socket.send(
                JSON.stringify({

                    type:
                        "join-room",

                    room:
                        room
                })
            );


            sendResponse({

                success:
                    true
            });

            return true;
        }


        // ------------------------------------------
        // LEAVE ROOM
        // ------------------------------------------

        if (
            message.type ===
            "leave-room"
        ) {

            intentionallyClosed =
                true;


            // Tell server to remove this
            // computer from the room.

            if (
                socket &&
                isConnected()
            ) {

                try {

                    socket.send(
                        JSON.stringify({

                            type:
                                "leave-room"
                        })
                    );

                } catch (error) {

                    console.error(
                        "Leave room send error:",
                        error
                    );
                }
            }


            // IMPORTANT:
            // Do NOT use await here.
            //
            // chrome.runtime.onMessage listener
            // is not an async function.
            //
            // This fixes:
            //
            // "await is only valid in async functions..."

            clearSession()
                .then(() => {

                    sendToPopup({

                        type:
                            "session-left"
                    });

                })
                .catch(error => {

                    console.error(
                        "Clear session error:",
                        error
                    );

                    sendToPopup({

                        type:
                            "session-left"
                    });
                });


            sendResponse({

                success:
                    true
            });

            return true;
        }


        // ------------------------------------------
        // SEND SOCKET MESSAGE
        // ------------------------------------------

        if (
            message.type ===
            "socket"
        ) {

            if (!isConnected()) {

                sendResponse({

                    success:
                        false,

                    error:
                        "Server not connected"
                });

                return true;
            }


            try {

                socket.send(
                    JSON.stringify(
                        message.data
                    )
                );


                sendResponse({

                    success:
                        true
                });

            } catch (error) {

                console.error(
                    "Socket send error:",
                    error
                );


                sendResponse({

                    success:
                        false,

                    error:
                        "Send failed"
                });
            }

            return true;
        }


        // ------------------------------------------
        // CLOCK PING
        // ------------------------------------------

        if (
            message.type ===
            "clock-ping"
        ) {

            if (!isConnected()) {

                sendResponse({

                    success:
                        false
                });

                return true;
            }


            try {

                socket.send(
                    JSON.stringify({

                        type:
                            "clock-ping",

                        clientTime:
                            message.clientTime
                    })
                );


                sendResponse({

                    success:
                        true
                });

            } catch (error) {

                console.error(
                    "Clock ping error:",
                    error
                );


                sendResponse({

                    success:
                        false
                });
            }

            return true;
        }


        return true;
    }
);


// --------------------------------------------------
// START
// --------------------------------------------------

(async () => {

    await loadSession();

    connect();

})();
