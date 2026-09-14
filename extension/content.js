console.log("Video Sync content script loaded");

let remoteSyncInProgress = false;
let serverClockOffset = 0;
let videoListenersAttached = false;

// --------------------------------------------------
// FIND VIDEO
// --------------------------------------------------

function getVideo() {
    return document.querySelector("video");
}


// --------------------------------------------------
// GET VIDEO STATE
// --------------------------------------------------

function getVideoState() {

    const video = getVideo();

    if (!video) {
        return null;
    }

    return {
        time: video.currentTime,
        duration: video.duration,
        playing: !video.paused,
        playbackRate: video.playbackRate
    };
}


// --------------------------------------------------
// ESTIMATED SERVER TIME
// --------------------------------------------------

function getEstimatedServerTime() {

    return Date.now() + serverClockOffset;
}


// --------------------------------------------------
// CLOCK SYNC
// --------------------------------------------------

async function sendClockPing() {

    try {

        const clientTime =
            Date.now();

        await chrome.runtime.sendMessage({

            type: "clock-ping",

            clientTime: clientTime
        });

    } catch (error) {

        // Background service worker may not be available.
    }
}


// --------------------------------------------------
// APPLY REMOTE SYNC
// --------------------------------------------------

async function applyRemoteSync(message) {

    const video = getVideo();

    if (!video) {
        return;
    }

    if (
        message.time === undefined
    ) {
        return;
    }

    remoteSyncInProgress = true;

    try {

        const originalTargetTime =
            Number(message.time);

        let targetTime =
            originalTargetTime;


        // ------------------------------------------
        // LATENCY COMPENSATION
        // ------------------------------------------

        if (
            message.serverTime !== undefined
        ) {

            const nowServerTime =
                getEstimatedServerTime();

            const elapsed =
                (
                    nowServerTime -
                    Number(message.serverTime)
                ) / 1000;

            if (elapsed > 0) {

                targetTime =
                    originalTargetTime +
                    elapsed;
            }

            console.log(
                "Sync timing:",
                {
                    originalTargetTime,
                    serverTime:
                        message.serverTime,
                    nowServerTime,
                    networkElapsed:
                        elapsed,
                    compensatedTarget:
                        targetTime
                }
            );
        }


        // ------------------------------------------
        // KEEP WITHIN VIDEO DURATION
        // ------------------------------------------

        if (
            Number.isFinite(
                video.duration
            )
        ) {

            targetTime =
                Math.min(
                    targetTime,
                    Math.max(
                        0,
                        video.duration - 0.05
                    )
                );
        }

        targetTime =
            Math.max(
                0,
                targetTime
            );


        // ------------------------------------------
        // CHECK DRIFT
        // ------------------------------------------

        const currentTime =
            video.currentTime;

        const difference =
            targetTime -
            currentTime;

        console.log(
            "Remote sync:",
            {
                currentTime,
                targetTime,
                difference
            }
        );


        // ------------------------------------------
        // CORRECT POSITION
        // ------------------------------------------

        // Only seek when the difference is
        // significant enough.

        if (
            Math.abs(difference) >
            0.15
        ) {

            video.currentTime =
                targetTime;
        }


        // ------------------------------------------
        // PLAY / PAUSE
        // ------------------------------------------

        if (message.playing) {

            if (video.paused) {

                try {

                    await video.play();

                } catch (error) {

                    console.warn(
                        "Unable to autoplay:",
                        error
                    );
                }
            }

        } else {

            if (!video.paused) {

                video.pause();
            }
        }


        // ------------------------------------------
        // PLAYBACK RATE
        // ------------------------------------------

        if (
            typeof message.playbackRate ===
            "number"
        ) {

            video.playbackRate =
                message.playbackRate;
        }

    } finally {

        // Prevent the resulting play/pause/seek
        // events from being treated as local actions.

        setTimeout(() => {

            remoteSyncInProgress =
                false;

        }, 200);
    }
}


// --------------------------------------------------
// MESSAGE HANDLER
// --------------------------------------------------

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {


        // ------------------------------------------
        // GET VIDEO TIME
        // ------------------------------------------

        if (
            message.action ===
            "getTime"
        ) {

            const state =
                getVideoState();

            if (!state) {

                sendResponse({

                    success: false,

                    error:
                        "No video found"
                });

                return true;
            }

            sendResponse({

                success: true,

                currentTime:
                    state.time,

                duration:
                    state.duration,

                paused:
                    !state.playing,

                playbackRate:
                    state.playbackRate
            });

            return true;
        }


        // ------------------------------------------
        // PLAY
        // ------------------------------------------

        if (
            message.action ===
            "play"
        ) {

            const video =
                getVideo();

            if (!video) {

                sendResponse({

                    success: false,

                    error:
                        "No video found"
                });

                return true;
            }

            video.play()
                .catch(error => {

                    console.warn(
                        "Play failed:",
                        error
                    );
                });

            sendResponse({

                success: true
            });

            return true;
        }


        // ------------------------------------------
        // PAUSE
        // ------------------------------------------

        if (
            message.action ===
            "pause"
        ) {

            const video =
                getVideo();

            if (!video) {

                sendResponse({

                    success: false,

                    error:
                        "No video found"
                });

                return true;
            }

            video.pause();

            sendResponse({

                success: true
            });

            return true;
        }


        // ------------------------------------------
        // RESTART
        // ------------------------------------------

        if (
            message.action ===
            "restart"
        ) {

            const video =
                getVideo();

            if (!video) {

                sendResponse({

                    success: false,

                    error:
                        "No video found"
                });

                return true;
            }

            video.currentTime = 0;

            sendResponse({

                success: true
            });

            return true;
        }


        // ------------------------------------------
        // CLOCK PONG
        // ------------------------------------------

        if (
            message.type ===
            "clock-pong"
        ) {

            const receiveTime =
                Date.now();

            const sentTime =
                Number(
                    message.clientTime
                );

            const serverTime =
                Number(
                    message.serverTime
                );

            if (
                Number.isFinite(
                    sentTime
                ) &&
                Number.isFinite(
                    serverTime
                )
            ) {

                // Estimate the moment at which
                // the server responded.

                const midpoint =
                    (
                        sentTime +
                        receiveTime
                    ) / 2;

                serverClockOffset =
                    serverTime -
                    midpoint;

                console.log(
                    "Clock synchronized:",
                    {
                        sentTime,
                        receiveTime,
                        serverTime,
                        serverClockOffset
                    }
                );
            }

            return true;
        }


        // ------------------------------------------
        // REMOTE SYNC
        // ------------------------------------------

        if (
            message.type ===
            "sync"
        ) {

            applyRemoteSync(
                message
            );

            sendResponse({

                success: true
            });

            return true;
        }


        return true;
    }
);


// --------------------------------------------------
// VIDEO EVENT LISTENERS
// --------------------------------------------------

function attachVideoListeners() {

    const video =
        getVideo();

    if (!video) {
        return;
    }

    if (videoListenersAttached) {
        return;
    }

    videoListenersAttached =
        true;

    console.log(
        "Video found!"
    );

    console.log(
        "Duration:",
        video.duration
    );


    // ------------------------------------------
    // PLAY
    // ------------------------------------------

    video.addEventListener(
        "play",
        () => {

            if (
                !remoteSyncInProgress
            ) {

                console.log(
                    "Local PLAY"
                );
            }
        }
    );


    // ------------------------------------------
    // PAUSE
    // ------------------------------------------

    video.addEventListener(
        "pause",
        () => {

            if (
                !remoteSyncInProgress
            ) {

                console.log(
                    "Local PAUSE"
                );
            }
        }
    );


    // ------------------------------------------
    // SEEK
    // ------------------------------------------

    video.addEventListener(
        "seeked",
        () => {

            if (
                !remoteSyncInProgress
            ) {

                console.log(
                    "Local SEEK:",
                    video.currentTime
                );
            }
        }
    );
}


// --------------------------------------------------
// WAIT FOR VIDEO
// --------------------------------------------------

function waitForVideo() {

    const video =
        getVideo();

    if (!video) {

        console.log(
            "Waiting for video..."
        );

        return;
    }

    attachVideoListeners();
}


// Try immediately.
waitForVideo();


// --------------------------------------------------
// WATCH FOR DYNAMICALLY LOADED VIDEO
// --------------------------------------------------

const observer =
    new MutationObserver(() => {

        if (getVideo()) {

            attachVideoListeners();
        }
    });


observer.observe(
    document.documentElement,
    {
        childList: true,
        subtree: true
    }
);


// --------------------------------------------------
// INITIAL CLOCK SYNC
// --------------------------------------------------

sendClockPing();


// Re-sync the clocks every 5 seconds.
setInterval(
    sendClockPing,
    5000
);
