/**
 * ORBITA — Precision Tracking + All Voices (v5.1)
 * Strict gesture following, handedness labels, safe voice switching
 */

// ===== CONFIG =====
var NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
var TYPES = ["Major","Minor","Maj7","Min7","Dom7","Sus4","Dim","Aug"];
var INTERVALS = {
    Major: [0, 4, 7],
    Minor: [0, 3, 7],
    Maj7:  [0, 4, 7, 11],
    Min7:  [0, 3, 7, 10],
    Dom7:  [0, 4, 7, 10],
    Sus4:  [0, 5, 7],
    Dim:   [0, 3, 6],
    Aug:   [0, 4, 8]
};

// Tracking precision config
var PINCH_RATIO = 0.55;     // Pinch when thumb-index distance < 55% of palm size
var LERP_FACTOR = 0.8;      // High = tight follow (0.8 = very responsive)
var LERP_FAST = 0.95;       // Used during fast movement for near-instant tracking
var FAST_THRESHOLD = 0.04;  // Movement delta above this uses LERP_FAST
var RELEASE_GRACE = 150;    // ms before releasing sound after un-pinch

var VOICE_ACCENTS = {
    aura: [0, 229, 255], nova: [255, 100, 50], orbit: [180, 100, 255],
    pulse: [100, 255, 100], ether: [255, 255, 255], maestro: [255, 220, 100]
};

var PRESETS = {
    aura:    { osc: { type: "triangle" },                              env: { attack: 0.1,  decay: 2.0, sustain: 0.9, release: 4.0 }, filter: { freq: 2000, Q: 1 } },
    nova:    { osc: { type: "fatsawtooth", count: 3, spread: 25 },     env: { attack: 0.05, decay: 1.5, sustain: 0.7, release: 3.5 }, filter: { freq: 2200, Q: 2 } },
    orbit:   { osc: { type: "fatsquare",   count: 2, spread: 10 },     env: { attack: 0.05, decay: 2.5, sustain: 0.6, release: 4.5 }, filter: { freq: 1500, Q: 0.5 } },
    pulse:   { osc: { type: "pwm", modulationFrequency: 4 },           env: { attack: 0.02, decay: 0.8, sustain: 0.8, release: 2.0 }, filter: { freq: 1200, Q: 4 } },
    ether:   { osc: { type: "sine" },                                  env: { attack: 0.5,  decay: 3.0, sustain: 0.9, release: 6.0 }, filter: { freq: 4000, Q: 0.2 } },
    maestro: { osc: { type: "fatsawtooth", count: 8, spread: 30 },     env: { attack: 0.1,  decay: 2.0, sustain: 0.8, release: 5.0 }, filter: { freq: 1500, Q: 1 } }
};

function mapR(v, a, b, c, d) { if (isNaN(v)) return c; return c + (d - c) * ((v - a) / (b - a)); }
function clp(v, lo, hi) { if (isNaN(v)) return lo; return Math.max(lo, Math.min(hi, v)); }
function d2(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }

// ===== STATE =====
var state = {
    rootIndex: 0, qualityIndex: 0, isActive: false, octave: 3,
    intensity: 0.5, ready: false, mode: "mouse", cameraReady: false,
    voice: "aura", lastUpdate: 0, lastActiveTime: 0, isCreepMode: false,
    autoPlayLoop: null, currentStep: 0
};

var CREEP_LYRICS = [
    { text: "When you were here before", chord: "G", type: "Major" },
    { text: "Couldn't look you in the eye", chord: "B", type: "Major" },
    { text: "You're just like an angel", chord: "C", type: "Major" },
    { text: "Your skin makes me cry", chord: "C", type: "Minor" },
    { text: "You float like a feather", chord: "G", type: "Major" },
    { text: "In a beautiful world", chord: "B", type: "Major" },
    { text: "I wish I was special", chord: "C", type: "Major" },
    { text: "You're so very special", chord: "C", type: "Minor" },
    { text: "But I'm a creep", chord: "G", type: "Major" },
    { text: "I'm a weirdo", chord: "B", type: "Major" },
    { text: "What the hell am I doing here?", chord: "C", type: "Major" },
    { text: "I don't belong here", chord: "C", type: "Minor" }
];

var hands = {
    left:  { x: 0.22, y: 0.5, pinch: false, visible: false, lerpX: 0.22, lerpY: 0.5 },
    right: { x: 0.78, y: 0.5, pinch: false, visible: false, lerpX: 0.78, lerpY: 0.5 }
};

var synth, subSynth, filter, reverb, analyser, activeNotes = [];

// ===== AUDIO =====
function initAudio() {
    try {
        var p = PRESETS[state.voice];
        reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination();
        filter = new Tone.Filter(p.filter.freq, "lowpass").connect(reverb);
        analyser = new Tone.Analyser("waveform", 128);
        filter.connect(analyser);
        buildSynths(p);
        state.ready = true;
        console.log("[AUDIO] V5.1 Ready — voice: " + state.voice);
    } catch (e) { console.error("Audio init failed:", e); }
}

// Build or rebuild synths for a given preset
function buildSynths(p) {
    // Dispose old synths if they exist
    if (synth) { try { synth.releaseAll(); synth.disconnect(); synth.dispose(); } catch(e){} }
    if (subSynth) { try { subSynth.releaseAll(); subSynth.disconnect(); subSynth.dispose(); } catch(e){} }
    activeNotes = [];

    synth = new Tone.PolySynth(Tone.Synth);
    synth.set({ oscillator: p.osc, envelope: p.env, volume: -8 });
    synth.connect(filter);

    subSynth = new Tone.PolySynth(Tone.Synth);
    subSynth.set({ oscillator: { type: "sine" }, envelope: { attack: 0.1, decay: 1, sustain: 0.8, release: 2.5 }, volume: -10 });
    subSynth.connect(filter);

    console.log("[VOICE] Built: " + state.voice + " | osc: " + p.osc.type);
}

// Switch voice: dispose old synths, build new ones with correct oscillator type
function switchVoice(voiceName) {
    state.voice = voiceName;
    var p = PRESETS[voiceName];
    if (!p || !filter) return;
    state.isActive = false;
    buildSynths(p);
    filter.set({ frequency: p.filter.freq, Q: p.filter.Q });
    console.log("[VOICE] Switched to: " + voiceName);
}

function updateChord() {
    if (!state.ready) return;

    var now = Date.now();
    var isTracking = (state.mode === "mouse" || (now - state.lastUpdate < 1000));
    var isPinched = state.isActive;
    if (isPinched) state.lastActiveTime = now;

    var shouldPlay = isPinched || (now - state.lastActiveTime < RELEASE_GRACE);
    if (!isTracking) shouldPlay = false;

    if (!shouldPlay) {
        if (activeNotes.length > 0) {
            synth.releaseAll("+0.1");
            subSynth.releaseAll("+0.1");
            activeNotes = [];
        }
        var inst = document.getElementById("instruction-text");
        if (inst) inst.textContent = (!isTracking) ? "WAITING FOR HANDS..." : "READY";
        return;
    }

    var inst = document.getElementById("instruction-text");
    if (inst) inst.textContent = "CONDUCTING";

    var vL = hands.left.visible, vR = hands.right.visible;
    var avgY = (vL && vR) ? (hands.left.lerpY + hands.right.lerpY) / 2
             : (vL ? hands.left.lerpY : (vR ? hands.right.lerpY : 0.5));
    if (isNaN(avgY)) avgY = 0.5;
    
    // Smooth octave switching
    var targetOctave = (avgY < 0.3) ? 4 : (avgY > 0.7 ? 2 : 3);
    if (state.octave !== targetOctave) {
        state.octave = targetOctave;
        // Force re-trigger to switch octave smoothly
        activeNotes = []; 
    }

    var root = NOTES[state.rootIndex];
    var type = TYPES[state.qualityIndex];
    var octStr = String(state.octave);
    var subOctStr = String(state.octave - 1);

    // RICH VOICING: Root, 3rd, 5th, and a doubled Root an octave up
    var ivs = INTERVALS[type] || [0, 4, 7];
    var nn = ivs.map(iv => Tone.Frequency(root + octStr).transpose(iv).toNote());
    nn.push(Tone.Frequency(root + String(state.octave + 1)).toNote()); // Doubled root for richness

    // CLEAN BASS: Only the root in the sub-octave to avoid muddiness
    var sn = [Tone.Frequency(root + subOctStr).toNote()];

    var chordKey = nn.join(",");
    if (chordKey !== activeNotes.join(",")) {
        // CROSSFADE: Release old with short tail, trigger new
        synth.releaseAll("+0.05");
        subSynth.releaseAll("+0.05");
        
        // Slight delay for new notes to avoid click
        var time = Tone.now() + 0.02;
        synth.triggerAttack(nn, time);
        subSynth.triggerAttack(sn, time);
        
        activeNotes = nn.slice();
        document.getElementById("current-chord").textContent = root + " " + (type === "Major" ? "" : type);
        
        // Visual feedback for switch
        var cc = document.getElementById("current-chord");
        cc.style.transform = "scale(1.1)";
        setTimeout(() => cc.style.transform = "scale(1)", 200);
    }

    var p = PRESETS[state.voice];
    var finalIntensity = clp(state.intensity, 0, 1);
    
    // Faster, smoother ramps
    filter.frequency.rampTo(mapR(finalIntensity, 0, 1, p.filter.freq * 0.4, p.filter.freq * 4.5), 0.05);
    synth.volume.rampTo(mapR(finalIntensity, 0, 1, -20, -2), 0.05);
    subSynth.volume.rampTo(mapR(finalIntensity, 0, 1, -22, -4), 0.05);
}

// ===== PRECISION HAND TRACKING =====
var mpHands = null, mpCamera = null;

function initHandTracking() {
    var vid = document.getElementById("camera-feed");
    var oc = document.getElementById("camera-overlay");
    var ctx = oc.getContext("2d", { willReadFrequently: false, desynchronized: true });

    // Size the overlay canvas once (not every frame — that causes glitching)
    function sizeOverlay() {
        oc.width = window.innerWidth;
        oc.height = window.innerHeight;
    }
    sizeOverlay();
    window.addEventListener("resize", sizeOverlay);

    mpHands = new Hands({
        locateFile: function(f) { return "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + f; }
    });

    // PRECISION: modelComplexity 1 = full accuracy model
    // Higher confidence thresholds reject noisy/bad frames
    mpHands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.5
    });

    mpHands.onResults(function(res) {
        ctx.clearRect(0, 0, oc.width, oc.height);

        // Reset visibility each frame
        hands.left.visible = false;
        hands.right.visible = false;

        if (!res.multiHandLandmarks || res.multiHandLandmarks.length === 0) return;

        state.lastUpdate = Date.now();

        for (var i = 0; i < res.multiHandLandmarks.length; i++) {
            var lm = res.multiHandLandmarks[i];

            // === HANDEDNESS: Use MediaPipe's label instead of guessing ===
            // MediaPipe labels are from the camera's perspective (mirrored),
            // so "Right" from MediaPipe = user's RIGHT hand in mirrored view
            var label = "left"; // default
            if (res.multiHandedness && res.multiHandedness[i]) {
                var mpLabel = res.multiHandedness[i].label;
                // MediaPipe "Right" = user's left (mirrored), "Left" = user's right
                label = (mpLabel === "Right") ? "left" : "right";
            }
            var target = hands[label];

            // === PALM SIZE for normalized pinch detection ===
            // Distance from wrist (0) to middle finger MCP (9) = palm reference
            var palmSize = d2(lm[0].x, lm[0].y, lm[9].x, lm[9].y);
            if (palmSize < 0.01) palmSize = 0.1; // safety floor

            // === PINCH DETECTION: normalized to palm size ===
            // Thumb tip (4) to Index tip (8) distance / palm size
            var pinchDist = d2(lm[4].x, lm[4].y, lm[8].x, lm[8].y);
            var pinchRatio = pinchDist / palmSize;
            var isPinching = pinchRatio < PINCH_RATIO;

            // === POSITION: Use pinch midpoint (thumb + index average) ===
            // Tracks exactly where the pinch gesture is happening
            var ctrlX = (lm[4].x + lm[8].x) / 2;
            var ctrlY = (lm[4].y + lm[8].y) / 2;
            var hx = 1 - ctrlX; // mirror for natural control
            var hy = ctrlY;

            // Update target hand
            target.x = hx;
            target.y = hy;
            target.pinch = isPinching;
            target.visible = true;

            // Adaptive LERP: faster when moving quickly, smooth when still
            var dx = target.x - target.lerpX;
            var dy = target.y - target.lerpY;
            var moveDelta = Math.sqrt(dx * dx + dy * dy);
            var lerpVal = moveDelta > FAST_THRESHOLD ? LERP_FAST : LERP_FACTOR;
            target.lerpX += dx * lerpVal;
            target.lerpY += dy * lerpVal;

            // === PINCH-ONLY VISUAL FEEDBACK ===
            var col = isPinching ? "rgba(0, 229, 255, 0.9)" : "rgba(255, 255, 255, 0.25)";

            // Thumb tip (landmark 4)
            var tx = lm[4].x * oc.width, ty = lm[4].y * oc.height;
            // Index tip (landmark 8)
            var ix = lm[8].x * oc.width, iy = lm[8].y * oc.height;

            // Draw thumb tip dot
            ctx.beginPath();
            ctx.arc(tx, ty, isPinching ? 6 : 4, 0, 6.28);
            ctx.fillStyle = col;
            ctx.fill();

            // Draw index tip dot
            ctx.beginPath();
            ctx.arc(ix, iy, isPinching ? 6 : 4, 0, 6.28);
            ctx.fillStyle = col;
            ctx.fill();

            // Pinch line: thumb to index
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(ix, iy);
            ctx.strokeStyle = col;
            ctx.lineWidth = isPinching ? 3 : 1;
            ctx.stroke();

            // Glow at pinch midpoint when pinching
            if (isPinching) {
                var mx = (tx + ix) / 2, my = (ty + iy) / 2;
                ctx.beginPath();
                ctx.arc(mx, my, 14, 0, 6.28);
                ctx.fillStyle = "rgba(0, 229, 255, 0.15)";
                ctx.fill();
                ctx.beginPath();
                ctx.arc(mx, my, 5, 0, 6.28);
                ctx.fillStyle = "rgba(0, 229, 255, 0.9)";
                ctx.fill();
            }
        }
    });

    mpCamera = new Camera(vid, {
        onFrame: async function() { await mpHands.send({ image: vid }); },
        width: 1280,
        height: 720
    });
    mpCamera.start().then(function() { state.cameraReady = true; });
}

// ===== P5.JS VISUALS =====
var sketch = function(p) {
    var cY, wR, rot = 0;
    p.setup = function() {
        var b = document.getElementById("canvas-container");
        p.createCanvas(b.offsetWidth, b.offsetHeight).parent("canvas-container");
        wR = Math.min(p.width * 0.28, p.height * 0.42, 360);
        cY = p.height / 2;
    };
    p.draw = function() {
        if (p.width < 50) return;
        if (state.mode === "mouse") processInteractionMouse(p);
        else processInteractionCam(p);
        var wave = null;
        if (state.ready && analyser) try { wave = analyser.getValue(); } catch (e) {}
        p.clear();
        rot += 0.005;
        var lx = p.width * 0.22, rx = p.width * 0.78;
        drawWheel(p, lx, cY, wR, NOTES, state.rootIndex, 0, rot);
        drawWheel(p, rx, cY, wR * 0.95, TYPES, state.qualityIndex, 1, -rot * 1.5);
        if (state.isActive && wave) {
            drawPulse(p, lx, cY, wave, wR * 0.2);
            drawPulse(p, rx, cY, wave, wR * 0.18);
        }
    };

    function processInteractionCam(p) {
        var any = false;
        var w = p.width, h = p.height, lx = w * 0.22, rx = w * 0.78;
        var cY = h / 2, wR = Math.min(w * 0.28, h * 0.42, 360);

        if (hands.left.visible) {
            var cx = hands.left.lerpX * w, cy = hands.left.lerpY * h;
            var d = d2(cx, cy, lx, cY);
            if (d < wR * 1.5) {
                var angle = (Math.atan2(cy - cY, cx - lx) + p.HALF_PI + p.TWO_PI) % (p.TWO_PI);
                state.rootIndex = Math.floor(mapR(angle, 0, p.TWO_PI, 0, 12)) % 12;
                state.intensity = clp(1 - (d / (wR * 1.5)), 0.05, 1);
                if (hands.left.pinch) any = true;
            }
        }
        if (hands.right.visible) {
            var cx = hands.right.lerpX * w, cy = hands.right.lerpY * h;
            var d = d2(cx, cy, rx, cY);
            if (d < wR * 1.5) {
                var angle = (Math.atan2(cy - cY, cx - rx) + p.HALF_PI + p.TWO_PI) % (p.TWO_PI);
                state.qualityIndex = Math.floor(mapR(angle, 0, p.TWO_PI, 0, TYPES.length)) % TYPES.length;
                state.intensity = clp(1 - (d / (wR * 1.5)), 0.05, 1);
                if (hands.right.pinch) any = true;
            }
        }
        state.isActive = any;
        updateChord();
    }

    function processInteractionMouse(p) {
        var lx = p.width * 0.22, rx = p.width * 0.78;
        var cY = p.height / 2, wR = Math.min(p.width * 0.28, p.height * 0.42, 360);
        var mx = p.mouseX, my = p.mouseY;
        var dL = d2(mx, my, lx, cY), dR = d2(mx, my, rx, cY);
        if (dL < wR * 1.5) {
            var angle = (Math.atan2(my - cY, mx - lx) + p.HALF_PI + p.TWO_PI) % (p.TWO_PI);
            state.rootIndex = Math.floor(mapR(angle, 0, p.TWO_PI, 0, 12)) % 12;
            state.intensity = clp(1 - (dL / (wR * 1.5)), 0.05, 1);
            state.isActive = p.mouseIsPressed;
        } else if (dR < wR * 1.5) {
            var angle = (Math.atan2(my - cY, mx - rx) + p.HALF_PI + p.TWO_PI) % (p.TWO_PI);
            state.qualityIndex = Math.floor(mapR(angle, 0, p.TWO_PI, 0, TYPES.length)) % TYPES.length;
            state.intensity = clp(1 - (dR / (wR * 1.5)), 0.05, 1);
            state.isActive = p.mouseIsPressed;
        } else {
            state.isActive = false;
        }
        updateChord();
    }

    function drawWheel(p, x, y, r, items, idx, wT, rt) {
        p.push(); p.translate(x, y);
        var step = p.TWO_PI / items.length, bc = VOICE_ACCENTS[state.voice];
        p.noFill(); p.stroke(255, 255, 255, state.isActive ? 60 : 25); p.strokeWeight(2); p.ellipse(0, 0, r * 2);
        for (var i = 0; i < items.length; i++) {
            var a = i * step - p.HALF_PI, na = a + step, ma = a + step / 2;
            var sel = (wT === 0 && state.rootIndex === i) || (wT === 1 && state.qualityIndex === i);
            var bo = (sel && state.isActive) ? Math.sin(p.frameCount * 0.2) * 10 : 0;
            if (sel) {
                p.noStroke(); p.fill(bc[0], bc[1], bc[2], state.isActive ? 100 : 40);
                p.beginShape(); p.vertex(0, 0);
                for (var aa = a; aa <= na; aa += 0.05) p.vertex(p.cos(aa) * (r + bo), p.sin(aa) * (r + bo));
                p.vertex(0, 0); p.endShape(p.CLOSE);
            }
            p.noStroke(); p.fill(sel ? 255 : 140); p.textSize(sel ? 18 : 13); p.textAlign(p.CENTER, p.CENTER);
            p.text(items[i], p.cos(ma) * (r * 0.7 + bo), p.sin(ma) * (r * 0.7 + bo));
        }
        p.pop();
    }

    function drawPulse(p, x, y, w, bR) {
        p.push(); p.translate(x, y);
        var c = VOICE_ACCENTS[state.voice];
        p.noFill(); p.stroke(c[0], c[1], c[2], 200); p.strokeWeight(2);
        p.beginShape();
        for (var i = 0; i < w.length; i += 2) {
            var ag = p.map(i, 0, w.length, 0, p.TWO_PI);
            var rd = p.map(w[i], -1, 1, bR * 0.5, bR * (1.5 + state.intensity));
            p.vertex(p.cos(ag) * rd, p.sin(ag) * rd);
        }
        p.endShape(p.CLOSE); p.pop();
    }

    p.windowResized = function() {
        var b = document.getElementById("canvas-container");
        p.resizeCanvas(b.offsetWidth, b.offsetHeight);
        wR = Math.min(p.width * 0.28, p.height * 0.42, 360);
        cY = p.height / 2;
    };
};

// ===== STARTUP =====
document.addEventListener("DOMContentLoaded", function() {
    var startBtn = document.getElementById("start-audio");
    var testBtn = document.getElementById("test-beep");
    var overlay = document.getElementById("overlay");
    var app = document.getElementById("app");
    var mMouse = document.getElementById("mode-mouse");
    var mCam = document.getElementById("mode-camera");
    var logo = document.querySelector(".logo");

    startBtn.addEventListener("click", function() {
        Tone.start().then(function() {
            initAudio();
            overlay.style.opacity = "0";
            overlay.style.pointerEvents = "none";
            setTimeout(function() {
                overlay.style.display = "none";
                app.classList.remove("hidden");
                app.style.opacity = "1";
                new p5(sketch);
            }, 800);
        });
    });

    if (testBtn) {
        testBtn.addEventListener("click", function() {
            Tone.start().then(function() {
                var osc = new Tone.Oscillator(440, "sine").toDestination().start();
            var osc = new Tone.Oscillator(440, "sine").toDestination().start();
                osc.volume.value = -12;
                osc.stop("+0.5");
                setTimeout(function() { osc.dispose(); }, 600);
            });
        });
    }

    mMouse.addEventListener("click", function() {
        state.mode = "mouse"; mMouse.classList.add("active"); mCam.classList.remove("active");
        if (!state.isCreepMode) {
            document.getElementById("mode-creep").classList.remove("active");
            document.getElementById("creep-lyrics-container").classList.add("hidden");
            document.body.classList.remove("creep-mood");
        }
        if (state.autoPlayLoop) toggleAutoPlay();
        state.isActive = false; updateChord();
    });
    mCam.addEventListener("click", function() {
        state.mode = "camera"; mCam.classList.add("active"); mMouse.classList.remove("active");
        if (!state.isCreepMode) {
            document.getElementById("mode-creep").classList.remove("active");
            document.getElementById("creep-lyrics-container").classList.add("hidden");
            document.body.classList.remove("creep-mood");
        }
        state.isActive = false; updateChord();
        if (!state.cameraReady) initHandTracking();
    });

    var mCreep = document.getElementById("mode-creep");
    mCreep.addEventListener("click", function() {
        if (state.isCreepMode) {
            // Toggle OFF
            state.isCreepMode = false;
            mCreep.classList.remove("active");
            document.getElementById("creep-lyrics-container").classList.add("hidden");
            document.body.classList.remove("creep-mood");
            if (state.autoPlayLoop) toggleAutoPlay();
            return;
        }

        // Toggle ON
        state.isCreepMode = true;
        mCreep.classList.add("active");
        
        document.body.classList.add("creep-mood");
        var container = document.getElementById("creep-lyrics-container");
        container.classList.remove("hidden");
        
        var display = document.getElementById("lyrics-display");
        if (display.children.length === 0) {
            CREEP_LYRICS.forEach(function(l, i) {
                var div = document.createElement("div");
                div.className = "lyric-line" + (i === 0 ? " active" : "");
                div.textContent = l.text;
                div.setAttribute("data-chord", l.chord + (l.type === "Minor" ? "m" : ""));
                div.addEventListener("click", function() {
                    document.querySelectorAll(".lyric-line").forEach(el => el.classList.remove("active"));
                    div.classList.add("active");
                    
                    // Teleprompter Scroll
                    var offset = i * -74; // Match CSS gap/height
                    display.style.transform = "translateY(" + offset + "px)";
                    
                    strumChord(l.chord, l.type);
                    setChordByName(l.chord, l.type);
                    state.currentStep = i;
                });
                display.appendChild(div);
            });
        }

        setChordByName("G", "Major");
        state.isActive = false; 
        updateChord();

        // Play Button Listener
        var playBtn = document.getElementById("creep-play-btn");
        playBtn.onclick = function() {
            toggleAutoPlay();
        };
    });

    function toggleAutoPlay() {
        if (state.autoPlayLoop) {
            Tone.Transport.stop();
            state.autoPlayLoop.dispose();
            state.autoPlayLoop = null;
            document.getElementById("creep-play-btn").textContent = "PLAY";
            document.getElementById("creep-play-btn").classList.remove("playing");
        } else {
            Tone.start();
            Tone.Transport.bpm.value = 92;
            Tone.Transport.start();
            state.currentStep = 0;
            
            state.autoPlayLoop = new Tone.Loop(time => {
                var step = state.currentStep % CREEP_LYRICS.length;
                var lyric = CREEP_LYRICS[step];
                
                Tone.Draw.schedule(() => {
                    var display = document.getElementById("lyrics-display");
                    var lines = document.querySelectorAll(".lyric-line");
                    lines.forEach(l => l.classList.remove("active"));
                    if (lines[step]) {
                        lines[step].classList.add("active");
                        display.style.transform = "translateY(" + (step * -74) + "px)";
                    }
                }, time);

                strumChord(lyric.chord, lyric.type);
                setChordByName(lyric.chord, lyric.type);
                state.currentStep++;
            }, "2m").start(0);

            document.getElementById("creep-play-btn").textContent = "STOP";
            document.getElementById("creep-play-btn").classList.add("playing");
        }
    }

    function strumChord(root, type) {
        if (!state.ready) return;
        var oct = state.octave;
        var ivs = INTERVALS[type] || [0, 4, 7];
        
        // Strumming a rich voicing
        var notes = ivs.map(iv => Tone.Frequency(root + oct).transpose(iv).toNote());
        notes.push(Tone.Frequency(root + (oct + 1)).toNote()); // Add high root
        
        var now = Tone.now();
        notes.forEach((n, i) => {
            synth.triggerAttackRelease(n, "1n", now + (i * 0.06), 0.7);
        });
        
        // Bass foundation
        subSynth.triggerAttackRelease(root + (oct - 1), "1n", now, 0.8);
    }

    document.querySelectorAll(".chord-shortcut").forEach(function(btn) {
        btn.addEventListener("click", function() {
            var root = btn.getAttribute("data-root");
            var type = btn.getAttribute("data-type");
            setChordByName(root, type);
            
            document.querySelectorAll(".chord-shortcut").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    function setChordByName(root, type) {
        var rIdx = NOTES.indexOf(root);
        var tIdx = TYPES.indexOf(type);
        if (rIdx !== -1) state.rootIndex = rIdx;
        if (tIdx !== -1) state.qualityIndex = tIdx;
        updateChord();
    }

    document.querySelectorAll(".voice-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".voice-btn").forEach(function(b) { b.classList.remove("active"); });
            btn.classList.add("active");
            if (state.ready) {
                switchVoice(btn.getAttribute("data-voice"));
            }
        });
    });

    if (logo) {
        logo.addEventListener("click", function() {
            if (synth) synth.releaseAll();
            if (subSynth) subSynth.releaseAll();
            state.isActive = false;
            activeNotes = [];
        });
    }
});
