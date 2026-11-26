// Binaural Studio — fraterastrust.github.io/binaural/
// All sound is generated live with the Web Audio API. No audio files,
// no spoken content, no recording, no upload.
//
// Design, as approved:
// - Facilitate, do not simulate. Either the experience happens or it does not.
// - Automatic slow calibration (15/18/20 min), then a low drone holds indefinitely.
// - Binaural: carrier 100 Hz by default, starting at a 10 Hz beat and easing
//   down to a holding beat (default 4.0 Hz theta). The holding beat is NOT 2.5 Hz.
// - Pulse: 2.5 Hz is the PULSE, not the binaural. Thumps per second, grouped as
//   double-beats ("bum-bum"). ON only for listeners who cannot flex their
//   tensor tympani; OFF for those who can (they pulse themselves).
//   When ON it keeps going through the hold, with its own volume slider.
// - Drone: white (default) or pink noise, fading in slowly after calibration.
//   Silence invites sleep; a low drone maintains awareness.
// - Ending: no return normally. Natural return comes first, then the listener
//   stops the audio. Safety stop WITH a return at 2.5 hours only.
// - Volume was reported a little quiet on the first preview (with Spotify also
//   playing). Defaults here are louder: master 85%, drone louder, pulse louder.
//   Close other media and use headphones.

(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    var setupView = $('setup-view');
    var sessionView = $('session-view');
    var beginBtn = $('begin-btn');
    var stopBtn = $('stop-btn');
    var dimBtn = $('dim-btn');
    var intentionInput = $('intention');
    var sessionIntention = $('session-intention');
    var sessionPhase = $('session-phase');
    var sessionElapsed = $('session-elapsed');
    var sessionDetail = $('session-detail');
    var endedNote = $('session-ended-note');

    var calibrationInput = $('calibration');
    var carrierInput = $('carrier');
    var holdBeatInput = $('hold-beat');
    var noiseChoice = $('noise-choice');
    var masterVolume = $('master-volume');
    var binauralVolume = $('binaural-volume');
    var noiseVolume = $('noise-volume');
    var pulseVolume = $('pulse-volume');
    var pulseToggle = $('pulse-toggle');
    var pulseToggleLabel = $('pulse-toggle-label');
    var pulseRateInput = $('pulse-rate');

    var masterVolumeValue = $('master-volume-value');
    var binauralVolumeValue = $('binaural-volume-value');
    var noiseVolumeValue = $('noise-volume-value');
    var pulseVolumeValue = $('pulse-volume-value');

    // --- state -------------------------------------------------------------
    var ctx = null;
    var masterGain = null, binauralGain = null, noiseGain = null, pulseGain = null;
    var oscL = null, oscR = null, oscL2 = null, oscR2 = null;
    var noiseSource = null;
    var pulseTimer = null, elapsedTimer = null, safetyTimer = null, returnTimer = null;
    var nextPulseTime = 0;
    var startTime = 0;
    var calibrationMs = 18 * 60 * 1000;
    var inSafetyReturn = false;
    var stopped = false;

    var START_BEAT = 10; // Hz, eases down to the holding beat

    function fmtTime(ms) {
        var s = Math.floor(ms / 1000);
        var m = Math.floor(s / 60);
        var r = s % 60;
        return (m < 10 ? '0' + m : '' + m) + ':' + (r < 10 ? '0' + r : '' + r);
    }

    function updateVolumeLabels() {
        masterVolumeValue.textContent = masterVolume.value + '%';
        binauralVolumeValue.textContent = binauralVolume.value + '%';
        noiseVolumeValue.textContent = noiseVolume.value + '%';
        pulseVolumeValue.textContent = pulseVolume.value + '%';
        pulseToggleLabel.textContent = pulseToggle.checked ? 'On' : 'Off';
        if (masterGain) masterGain.gain.setTargetAtTime((masterVolume.value / 100) * 0.9, ctx.currentTime, 0.05);
        if (binauralGain) binauralGain.gain.setTargetAtTime((binauralVolume.value / 100) * 0.85, ctx.currentTime, 0.05);
        if (noiseGain && startTime && Date.now() - startTime > calibrationMs + 300000) {
            // After the 5-minute fade-in, the drone slider controls the level live,
            // so a listener can mix the studio down under other media.
            noiseGain.gain.setTargetAtTime((noiseVolume.value / 100) * 0.55, ctx.currentTime, 0.1);
        }
        if (pulseGain) pulseGain.gain.setTargetAtTime((pulseVolume.value / 100) * 0.9, ctx.currentTime, 0.05);
    }

    masterVolume.addEventListener('input', updateVolumeLabels);
    binauralVolume.addEventListener('input', updateVolumeLabels);
    noiseVolume.addEventListener('input', updateVolumeLabels);
    pulseVolume.addEventListener('input', updateVolumeLabels);
    pulseToggle.addEventListener('change', updateVolumeLabels);

    // --- noise buffers ------------------------------------------------------
    function makeWhiteBuffer(context, seconds) {
        var len = Math.floor(context.sampleRate * seconds);
        var buf = context.createBuffer(1, len, context.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    function makePinkBuffer(context, seconds) {
        // Paul Kellet pink-noise approximation.
        var len = Math.floor(context.sampleRate * seconds);
        var buf = context.createBuffer(1, len, context.sampleRate);
        var d = buf.getChannelData(0);
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (var i = 0; i < len; i++) {
            var w = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520;
            b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522;
            b5 = -0.7616 * b5 - w * 0.0168980;
            var out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
            b6 = w * 0.115926;
            d[i] = out * 0.11;
        }
        return buf;
    }

    // --- binaural ------------------------------------------------------------
    function setBeat(beat, when, rampSeconds) {
        var carrier = parseFloat(carrierInput.value) || 100;
        var t = when;
        var targets = [
            [oscL, carrier - beat / 2],
            [oscR, carrier + beat / 2],
            [oscL2, 2 * carrier - beat / 2],
            [oscR2, 2 * carrier + beat / 2]
        ];
        targets.forEach(function (pair) {
            var osc = pair[0], freq = pair[1];
            if (!osc) return;
            if (rampSeconds && rampSeconds > 0) {
                osc.frequency.setValueAtTime(osc.frequency.value, t);
                osc.frequency.linearRampToValueAtTime(freq, t + rampSeconds);
            } else {
                osc.frequency.setValueAtTime(freq, t);
            }
        });
    }

    function startBinaural() {
        var carrier = parseFloat(carrierInput.value) || 100;
        var holdBeat = parseFloat(holdBeatInput.value) || 4.0;
        var now = ctx.currentTime;

        binauralGain = ctx.createGain();
        binauralGain.gain.value = (binauralVolume.value / 100) * 0.85; // per-layer volume, for mixing with other media
        binauralGain.connect(masterGain);

        var panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        var panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        var octaveGain = ctx.createGain();
        octaveGain.gain.value = 0.18;
        octaveGain.connect(binauralGain);

        function makeOsc(freq, pan, dest, octave) {
            var o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.value = freq;
            if (pan) {
                pan.pan.value = octave ? 0 : (freq < carrier ? -1 : 1);
                // For the octave pair, pan follows the same side as its base.
                o.connect(pan);
                pan.connect(octave ? octaveGain : binauralGain);
            } else {
                o.connect(octave ? octaveGain : binauralGain);
            }
            o.start(now);
            return o;
        }

        // Left / right panners: left osc goes left, right osc goes right.
        // createStereoPanner is supported in all modern browsers.
        if (panL && panR) {
            panL.pan.value = -1;
            panR.pan.value = 1;
            oscL = ctx.createOscillator(); oscL.type = 'sine'; oscL.frequency.value = carrier - START_BEAT / 2;
            oscR = ctx.createOscillator(); oscR.type = 'sine'; oscR.frequency.value = carrier + START_BEAT / 2;
            oscL2 = ctx.createOscillator(); oscL2.type = 'sine'; oscL2.frequency.value = 2 * carrier - START_BEAT / 2;
            oscR2 = ctx.createOscillator(); oscR2.type = 'sine'; oscR2.frequency.value = 2 * carrier + START_BEAT / 2;
            oscL.connect(panL); panL.connect(binauralGain);
            oscR.connect(panR); panR.connect(binauralGain);
            oscL2.connect(panL); oscL2.connect(octaveGain); octaveGain.connect(binauralGain);
            oscR2.connect(panR); oscR2.connect(octaveGain);
            oscL.start(now); oscR.start(now); oscL2.start(now); oscR2.start(now);
        } else {
            // Fallback: no panner, still two tones (binaural effect needs headphones + panner, so this is degraded).
            oscL = makeOsc(carrier - START_BEAT / 2, null, binauralGain, false);
            oscR = makeOsc(carrier + START_BEAT / 2, null, binauralGain, false);
            oscL2 = makeOsc(2 * carrier - START_BEAT / 2, null, octaveGain, true);
            oscR2 = makeOsc(2 * carrier + START_BEAT / 2, null, octaveGain, true);
        }

        // Ease the beat down from 10 Hz to the holding beat over calibration.
        var rampSeconds = calibrationMs / 1000;
        setBeat(holdBeat, now, rampSeconds);
    }

    function startNoise() {
        var kind = noiseChoice.value;
        var buf = kind === 'pink' ? makePinkBuffer(ctx, 4) : makeWhiteBuffer(ctx, 4);
        noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buf;
        noiseSource.loop = true;
        noiseGain = ctx.createGain();
        noiseGain.gain.value = 0;
        // A gentle low-pass keeps white noise from hissing harshly.
        var filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = kind === 'pink' ? 1200 : 3200;
        noiseSource.connect(filt);
        filt.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseSource.start();
        // Fade in slowly over 5 minutes, starting when calibration ends.
        var target = (noiseVolume.value / 100) * 0.55;
        var t0 = ctx.currentTime + calibrationMs / 1000;
        noiseGain.gain.setValueAtTime(0, t0);
        noiseGain.gain.linearRampToValueAtTime(target, t0 + 300);
    }

    // --- pulse: 2.5 Hz thumps, grouped as double-beats -----------------------
    // Pulse rate = thumps per second. At 2.5 Hz, a double-beat ("bum-bum")
    // repeats every 0.8 s (two thumps 0.18 s apart), about 75 double-beats/min.
    // At 2.0 Hz it is 60 double-beats/min, matching the original heartbeat.
    function schedulePulseThump(when, loud) {
        var o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 58;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(loud ? 0.9 : 0.65, when + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
        o.connect(g);
        g.connect(pulseGain);
        o.start(when);
        o.stop(when + 0.2);
    }

    function pulseTick() {
        if (!ctx || stopped || !pulseToggle.checked) return;
        var rate = parseFloat(pulseRateInput.value) || 2.5;
        var pairInterval = 2 / rate; // seconds per double-beat
        var now = ctx.currentTime;
        if (nextPulseTime < now) nextPulseTime = now + 0.05;
        while (nextPulseTime < now + 0.35) {
            schedulePulseThump(nextPulseTime, true);
            schedulePulseThump(nextPulseTime + 0.18, false);
            nextPulseTime += pairInterval;
        }
    }

    // --- session control -------------------------------------------------------
    function showSetup(note) {
        setupView.hidden = false;
        sessionView.hidden = true;
        document.body.classList.remove('dimmed');
        dimBtn.textContent = 'Dim screen';
        if (note) {
            endedNote.textContent = note;
            endedNote.hidden = false;
        }
    }

    function showSession() {
        setupView.hidden = true;
        sessionView.hidden = false;
        var text = intentionInput.value.trim();
        sessionIntention.textContent = text ? '“' + text + '”' : 'Held silently.';
    }

    function stopAll(fadeSeconds, note) {
        if (stopped) return;
        stopped = true;
        if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = null; }
        if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
        if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
        if (!ctx) { showSetup(note); return; }
        var now = ctx.currentTime;
        var fade = fadeSeconds || 3;
        if (masterGain) {
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);
            masterGain.gain.linearRampToValueAtTime(0, now + fade);
        }
        setTimeout(function () {
            try {
                if (oscL) oscL.stop(); if (oscR) oscR.stop();
                if (oscL2) oscL2.stop(); if (oscR2) oscR2.stop();
                if (noiseSource) noiseSource.stop();
                if (ctx) ctx.close();
            } catch (e) { /* already stopped */ }
            ctx = null;
            showSetup(note);
        }, (fade + 0.3) * 1000);
    }

    function safetyReturn() {
        if (stopped || inSafetyReturn) return;
        inSafetyReturn = true;
        sessionPhase.textContent = 'Safety return — 2½ hours';
        sessionDetail.textContent = 'Gently returning. You will be able to stop the audio when you are back.';
        var now = ctx.currentTime;
        // Ease the beat back up, fade the drone and binaural out over 5 minutes.
        setBeat(12, now, 300);
        if (noiseGain) {
            noiseGain.gain.setValueAtTime(noiseGain.gain.value, now);
            noiseGain.gain.linearRampToValueAtTime(0, now + 300);
        }
        if (binauralGain) {
            binauralGain.gain.setValueAtTime(binauralGain.gain.value, now);
            binauralGain.gain.linearRampToValueAtTime(0, now + 300);
        }
        if (pulseGain) {
            pulseGain.gain.setValueAtTime(pulseGain.gain.value, now);
            pulseGain.gain.linearRampToValueAtTime(0, now + 60);
        }
        returnTimer = setTimeout(function () {
            stopAll(2, 'Safety return complete. The session ended after 2½ hours.');
        }, 5 * 60 * 1000);
    }

    beginBtn.addEventListener('click', function () {
        if (ctx) return;
        stopped = false;
        inSafetyReturn = false;
        calibrationMs = (parseInt(calibrationInput.value, 10) || 18) * 60 * 1000;

        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
            endedNote.textContent = 'This browser does not support Web Audio. Please use a modern browser with headphones.';
            endedNote.hidden = false;
            return;
        }
        ctx = new AC();
        if (ctx.resume) ctx.resume();

        masterGain = ctx.createGain();
        masterGain.gain.value = (masterVolume.value / 100) * 0.9;
        masterGain.connect(ctx.destination);

        pulseGain = ctx.createGain();
        pulseGain.gain.value = (pulseVolume.value / 100) * 0.9;
        pulseGain.connect(masterGain);

        startBinaural();
        startNoise();

        nextPulseTime = ctx.currentTime + 0.1;
        if (pulseToggle.checked) {
            pulseTimer = setInterval(pulseTick, 100);
        }
        // If the toggle is switched on mid-session, start the scheduler then.
        pulseToggle.addEventListener('change', function onPulseChange() {
            if (!ctx || stopped) return;
            if (pulseToggle.checked && !pulseTimer) {
                nextPulseTime = ctx.currentTime + 0.1;
                pulseTimer = setInterval(pulseTick, 100);
            } else if (!pulseToggle.checked && pulseTimer) {
                clearInterval(pulseTimer);
                pulseTimer = null;
            }
        });

        startTime = Date.now();
        showSession();
        sessionPhase.textContent = 'Calibrating';
        sessionDetail.textContent = 'Tones easing down slowly. Keep your awareness at the third-eye area.';

        elapsedTimer = setInterval(function () {
            var elapsed = Date.now() - startTime;
            sessionElapsed.textContent = fmtTime(elapsed);
            if (inSafetyReturn) return;
            if (elapsed < calibrationMs) {
                sessionPhase.textContent = 'Calibrating';
                sessionDetail.textContent = 'Tones easing down slowly. Keep your awareness at the third-eye area.';
            } else {
                sessionPhase.textContent = 'Holding';
                sessionDetail.textContent = 'The drone holds indefinitely. Return first, then stop.';
            }
        }, 1000);

        // Safety stop with a return at 2.5 hours.
        safetyTimer = setTimeout(safetyReturn, 2.5 * 60 * 60 * 1000);
        updateVolumeLabels();
    });

    stopBtn.addEventListener('click', function () {
        // For use after natural return. A short fade only — no return ramp.
        stopAll(3, 'Session ended. You stopped the audio after return.');
    });

    dimBtn.addEventListener('click', function () {
        var dimmed = document.body.classList.toggle('dimmed');
        dimBtn.textContent = dimmed ? 'Undim screen' : 'Dim screen';
    });

    updateVolumeLabels();
})();
