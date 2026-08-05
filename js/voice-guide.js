/**
 * A+ Active Services — "Quinn" Guide Orb.
 * Docked glass-orb launcher that opens a voice-first panel wired to a public
 * ElevenLabs Conversational AI agent: live orb + audio-reactive waveform,
 * one big mic button, typed fallback. No chat-bubble history UI.
 * Built per CLAUDE-VOICE-GUIDE-WIDGET-BUILD.md.
 */
(function () {
  "use strict";

  const CONFIG = {
    agentName: "Quinn",
    logoUrl: "assets/logo-icon.png",
    slackUrl:
      "https://join.slack.com/t/aplusactiveservices/shared_invite/zt-45duywuls-ENY0PVBiQBgYmh7tW69D7g",
    promptClinicUrl: "https://thepromptclinic.com",
    bookingUrl: "https://cal.com/a-activeservces",
    elevenLabsAgentId: "agent_7801kz4eq34qf84sdkqwkzyqr4nn",
    // TODO: replace with a dedicated Slack Incoming Webhook for Quinn email captures
    // (kept separate from the Prompt Clinic repo's ops-alert webhook on purpose).
    slackWebhookUrl: "REPLACE_ME_SLACK_WEBHOOK_URL",
  };

  const GUIDE_TARGETS = {
    services: "#services",
    healthcare: "#healthcare",
    story: "#story",
    community: "#community",
    team: "#team",
  };

  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WAVE_BARS = 9;

  const host = document.createElement("div");
  host.id = "aplus-guide-host";
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483000;";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
    <style>
      :host {
        --g-primary: #2E7CFF;
        --g-secondary: #FF3B3B;
        --g-core: #F8F7FF;
        --g-panel: rgba(8, 14, 30, 0.94);
        --g-border: rgba(180, 205, 255, 0.22);
        --g-text: #F5F7FB;
        --g-muted: #AAB5CA;
      }
      * { box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; }

      /* ---- Docked launcher orb (52px desktop / 56px mobile). No cursor-follow mode. ---- */
      .g-launcher {
        position: fixed; right: 22px; bottom: 22px; z-index: 2147483001;
        width: 52px; height: 52px; border-radius: 999px; padding: 0; border: none;
        cursor: pointer; pointer-events: auto; isolation: isolate;
        transform: translateZ(0);
        transition: transform .18s ease, width .2s ease, height .2s ease, filter .3s ease;
        filter:
          drop-shadow(0 7px 14px rgba(0,8,28,.4))
          drop-shadow(0 0 16px rgba(46,124,255,.35));
        animation: g-pulse-glow 2.6s ease-in-out infinite;
      }
      .g-launcher:hover, .g-launcher:focus-visible { transform: scale(1.1); }
      .g-launcher:active { transform: scale(.9); }
      @media (max-width: 640px) { .g-launcher { width: 56px; height: 56px; right: 18px; bottom: 18px; } }
      @keyframes g-pulse-glow {
        0%, 100% { filter: drop-shadow(0 7px 14px rgba(0,8,28,.4)) drop-shadow(0 0 12px rgba(46,124,255,.3)); }
        50% { filter: drop-shadow(0 7px 18px rgba(0,8,28,.45)) drop-shadow(0 0 26px rgba(46,124,255,.65)); }
      }

      /* Clean glass-sphere orb: soft white highlight, deep blue glass body,
         a thin warm rim for brand identity. Noticeable breathing pulse,
         not a multi-hue swirl. */
      .g-orb { position: absolute; inset: 0; overflow: hidden; border-radius: 999px; background: #060c1e; }
      .g-panel-orb { position: relative; overflow: hidden; border-radius: 999px; background: #060c1e; }
      .g-orb__base {
        position: absolute; inset: 0; border-radius: inherit;
        background:
          radial-gradient(circle at 32% 26%, rgba(255,255,255,.85) 0 4%, rgba(255,255,255,.22) 12%, transparent 30%),
          radial-gradient(circle at 55% 60%, #3f7bff 0%, #14265c 58%, #060c1e 88%),
          conic-gradient(from 200deg, rgba(255,59,59,.35), transparent 30%, transparent 70%, rgba(255,59,59,.2));
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.4),
          inset 6px 6px 12px rgba(255,255,255,.12),
          inset -8px -10px 18px rgba(2,6,20,.55);
        animation: g-orb-breathe 2.6s ease-in-out infinite;
      }
      .g-orb__core {
        position: absolute; inset: 42%; border-radius: inherit; background: var(--g-core);
        box-shadow: 0 0 4px #fff, 0 0 12px #bcd0ff, 0 0 20px rgba(46,124,255,.8);
        transition: box-shadow .3s ease; z-index: 2;
        animation: g-core-pulse 2.6s ease-in-out infinite;
      }
      .g-orb__highlight {
        position: absolute; inset: 8% 42% 58% 16%; border-radius: 60% 45% 55% 38%;
        background: linear-gradient(145deg, rgba(255,255,255,.6), rgba(255,255,255,0));
        transform: rotate(-18deg); z-index: 2; pointer-events: none;
      }
      @keyframes g-orb-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }
      @keyframes g-core-pulse {
        0%, 100% { box-shadow: 0 0 4px #fff, 0 0 10px #bcd0ff, 0 0 16px rgba(46,124,255,.65); }
        50% { box-shadow: 0 0 6px #fff, 0 0 16px #bcd0ff, 0 0 28px rgba(46,124,255,.9); }
      }
      .g-launcher[data-state="listening"] .g-orb__core { box-shadow: 0 0 6px #fff, 0 0 16px var(--g-secondary), 0 0 26px rgba(255,59,59,.8); }
      .g-launcher[data-state="speaking"] .g-orb__core { box-shadow: 0 0 6px #fff, 0 0 18px var(--g-primary), 0 0 30px rgba(46,124,255,.9); }
      .g-launcher[data-state="thinking"] .g-orb__base { animation: g-orb-breathe 1s ease-in-out infinite; }
      .g-launcher[data-state="connecting"] .g-orb__base { animation: g-orb-breathe .8s ease-in-out infinite; }
      .g-launcher[data-state="muted"] .g-orb { opacity: .5; }
      .g-launcher[data-state="muted"] .g-orb__base, .g-launcher[data-state="muted"] .g-orb__core { animation-play-state: paused; }
      @media (prefers-reduced-motion: reduce) {
        .g-launcher, .g-orb__base, .g-orb__core { animation: none !important; }
      }

      .g-invite {
        position: fixed; right: 22px; bottom: 84px; z-index: 2147483001; pointer-events: none;
        background: var(--g-panel); border: 1px solid var(--g-border); color: var(--g-text);
        padding: 8px 16px; border-radius: 100px; font-size: .82rem; font-weight: 600;
        opacity: 0; transform: translateY(6px); transition: opacity .3s ease, transform .3s ease;
        box-shadow: 0 10px 24px -8px rgba(0,0,0,.5); white-space: nowrap;
      }
      .g-invite.show { opacity: 1; transform: translateY(0); }

      /* ---- Panel ---- */
      .g-panel {
        position: fixed; right: 22px; bottom: 88px; z-index: 2147483001;
        width: 340px; max-width: calc(100vw - 32px);
        max-height: min(640px, calc(100vh - 40px));
        display: flex; flex-direction: column;
        background: var(--g-panel); backdrop-filter: blur(14px);
        border: 1px solid var(--g-border); border-radius: 26px;
        box-shadow: 0 30px 70px -24px rgba(0,0,0,.65);
        pointer-events: auto; opacity: 0; transform: translateY(12px) scale(.98);
        transition: opacity .22s ease, transform .22s ease;
      }
      .g-panel.g-open { opacity: 1; transform: translateY(0) scale(1); }
      .g-panel[hidden] { display: none; }
      @media (max-width: 640px) {
        .g-panel {
          right: 0; left: 0; bottom: 0; width: 100%; max-width: 100%;
          border-radius: 24px 24px 0 0; max-height: min(84vh, 640px);
          padding-bottom: env(safe-area-inset-bottom);
        }
      }

      .g-panel-head { display: flex; align-items: center; gap: 12px; padding: 16px 16px 8px; }
      .g-panel-orb { width: 32px; height: 32px; border-radius: 999px; position: relative; flex-shrink: 0; }
      .g-panel-title { font-weight: 700; color: var(--g-text); font-size: .9rem; }
      .g-panel-status { font-size: .74rem; color: var(--g-muted); margin-top: 1px; }
      .g-panel-controls { margin-left: auto; display: flex; gap: 6px; }
      .g-icon-btn {
        width: 30px; height: 30px; min-width: 40px; min-height: 40px; margin: -5px;
        border-radius: 50%; border: 1px solid var(--g-border); background: transparent;
        color: var(--g-muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: .95rem;
      }
      .g-icon-btn:hover, .g-icon-btn:focus-visible { color: #fff; border-color: var(--g-primary); }

      .g-panel-body { padding: 6px 18px 18px; overflow-y: auto; flex: 1; min-height: 0; }

      /* ---- Stage: the voice-first centerpiece ---- */
      .g-stage { display: flex; flex-direction: column; align-items: center; padding: 10px 0 18px; }
      .g-stage-visual { display: flex; align-items: center; justify-content: center; gap: 16px; height: 84px; }
      .g-stage-orb { position: relative; width: 84px; height: 84px; border-radius: 999px; flex-shrink: 0; }
      .g-wave { display: flex; align-items: center; gap: 4px; height: 56px; }
      .g-wave span {
        width: 4px; border-radius: 3px; height: 10px;
        background: linear-gradient(180deg, var(--g-primary), var(--g-secondary));
        transition: height .12s ease;
        animation: g-wave-idle 2.2s ease-in-out infinite;
      }
      .g-wave span:nth-child(1) { animation-delay: 0s; }
      .g-wave span:nth-child(2) { animation-delay: .1s; }
      .g-wave span:nth-child(3) { animation-delay: .2s; }
      .g-wave span:nth-child(4) { animation-delay: .3s; }
      .g-wave span:nth-child(5) { animation-delay: .4s; }
      .g-wave span:nth-child(6) { animation-delay: .3s; }
      .g-wave span:nth-child(7) { animation-delay: .2s; }
      .g-wave span:nth-child(8) { animation-delay: .1s; }
      .g-wave span:nth-child(9) { animation-delay: 0s; }
      @keyframes g-wave-idle { 0%, 100% { height: 8px; } 50% { height: 26px; } }
      .g-wave.g-wave-live span { animation: none; }
      @media (prefers-reduced-motion: reduce) { .g-wave span { animation: none; height: 14px; } }

      .g-stage-label { margin-top: 14px; font-weight: 700; color: var(--g-text); font-size: .95rem; min-height: 1.3em; }
      .g-stage-caption { margin-top: 4px; font-size: .82rem; color: var(--g-muted); text-align: center; line-height: 1.4; min-height: 1.2em; max-width: 280px; }

      .g-stage-controls { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 18px; }
      .g-mic-btn {
        width: 62px; height: 62px; border-radius: 50%; border: none; cursor: pointer;
        background: linear-gradient(135deg, var(--g-primary), #1a4fc9); color: #fff; font-size: 1.5rem;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 10px 24px -8px rgba(46,124,255,.6);
        transition: transform .15s ease, background .2s ease;
      }
      .g-mic-btn:hover, .g-mic-btn:focus-visible { transform: scale(1.06); }
      .g-mic-btn[data-active="true"] { background: linear-gradient(135deg, var(--g-secondary), #b91c1c); box-shadow: 0 10px 24px -8px rgba(255,59,59,.6); }
      .g-mic-btn[data-muted="true"] { background: linear-gradient(135deg, #3a4256, #232838); box-shadow: none; }
      .g-end-btn-round {
        width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,59,59,.4); cursor: pointer;
        background: rgba(255,59,59,.1); color: var(--g-secondary); font-size: 1.1rem;
        display: flex; align-items: center; justify-content: center;
      }
      .g-end-btn-round:hover { background: rgba(255,59,59,.2); }
      .g-end-btn-round[hidden] { display: none; }

      .g-stage-hint { margin-top: 14px; font-size: .74rem; color: var(--g-muted); text-align: center; }

      .g-inputrow { display: flex; gap: 8px; padding-top: 14px; margin-top: 8px; border-top: 1px solid var(--g-border); }
      .g-inputrow input {
        flex: 1; min-width: 0; background: rgba(255,255,255,.05); border: 1px solid var(--g-border);
        border-radius: 100px; padding: 10px 16px; color: var(--g-text); font-size: .85rem; outline: none;
      }
      .g-inputrow input:focus { border-color: var(--g-primary); }
      .g-inputrow button {
        width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--g-border); background: var(--g-primary);
        color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }

      .g-quicklinks { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
      .g-quicklinks a {
        flex: 1; min-width: 100px; text-align: center; font-size: .76rem; font-weight: 700;
        padding: 9px 10px; border-radius: 100px; border: 1px solid var(--g-border); color: var(--g-text);
        background: rgba(255,255,255,.03); text-decoration: none;
      }
      .g-quicklinks a:hover { border-color: var(--g-primary); color: #fff; }
      .g-quicklinks a.g-link-accent { background: rgba(255,59,59,.12); border-color: rgba(255,59,59,.35); }

      .g-foot { font-size: .66rem; color: #5b6577; line-height: 1.4; margin-top: 12px; }

      .g-ring {
        position: fixed; border: 2px solid var(--g-primary); border-radius: 14px; pointer-events: none;
        box-shadow: 0 0 0 4px rgba(46,124,255,.18), 0 0 30px rgba(46,124,255,.4);
        z-index: 2147482999; transition: top .3s ease, left .3s ease, width .3s ease, height .3s ease;
      }
      .g-ring[hidden] { display: none; }
    </style>

    <button class="g-launcher" type="button" data-state="idle" aria-haspopup="dialog" aria-expanded="false" aria-label="Talk to Quinn, the A+ Active Services guide">
      <span class="g-orb"><span class="g-orb__base"></span><span class="g-orb__core"></span><span class="g-orb__highlight"></span></span>
    </button>
    <div class="g-invite" role="status"></div>

    <div class="g-panel" hidden role="dialog" aria-modal="false" aria-label="Quinn, the A+ Active Services guide">
      <div class="g-panel-head">
        <span class="g-panel-orb"><span class="g-orb__base"></span><span class="g-orb__core"></span></span>
        <div>
          <div class="g-panel-title">${CONFIG.agentName}</div>
          <div class="g-panel-status" aria-live="off">Ask your guide</div>
        </div>
        <div class="g-panel-controls">
          <button class="g-icon-btn g-minimize" type="button" aria-label="Minimize">&#8722;</button>
          <button class="g-icon-btn g-close" type="button" aria-label="Close">&times;</button>
        </div>
      </div>
      <div class="g-panel-body">
        <div class="g-stage">
          <div class="g-stage-visual">
            <span class="g-stage-orb"><span class="g-orb__base"></span><span class="g-orb__core"></span><span class="g-orb__highlight"></span></span>
            <div class="g-wave" aria-hidden="true">${"<span></span>".repeat(WAVE_BARS)}</div>
          </div>
          <div class="g-stage-label" aria-live="polite">Ask your guide</div>
          <div class="g-stage-caption" aria-live="polite"></div>
          <div class="g-stage-controls">
            <button class="g-mic-btn" type="button" data-active="false" data-muted="false" aria-label="Start voice with Quinn">&#127908;</button>
            <button class="g-end-btn-round" type="button" hidden aria-label="End voice session" title="End">&#9209;</button>
          </div>
          <p class="g-stage-hint">Tap to talk out loud, mic access starts only then.</p>
        </div>
        <div class="g-inputrow">
          <input type="text" placeholder="Or type a question…" aria-label="Type a question for Quinn">
          <button class="g-send" type="button" aria-label="Send">&#8594;</button>
        </div>
        <div class="g-quicklinks">
          <a href="${CONFIG.slackUrl}" target="_blank" rel="noopener">Join Slack</a>
          <a href="${CONFIG.promptClinicUrl}" target="_blank" rel="noopener" class="g-link-accent">Prompt Clinic</a>
          <a href="${CONFIG.bookingUrl}" target="_blank" rel="noopener">Book a Consult</a>
        </div>
        <p class="g-foot">Voice is never required, you can type instead. Nothing is recorded beyond this session. ${CONFIG.agentName} only knows about A+, not a general AI.</p>
      </div>
    </div>
    <div class="g-ring" hidden></div>
  `;

  const launcher = root.querySelector(".g-launcher");
  const invite = root.querySelector(".g-invite");
  const panel = root.querySelector(".g-panel");
  const panelStatus = root.querySelector(".g-panel-status");
  const stageLabel = root.querySelector(".g-stage-label");
  const stageCaption = root.querySelector(".g-stage-caption");
  const closeBtn = root.querySelector(".g-close");
  const minimizeBtn = root.querySelector(".g-minimize");
  const micBtn = root.querySelector(".g-mic-btn");
  const endBtn = root.querySelector(".g-end-btn-round");
  const stageHint = root.querySelector(".g-stage-hint");
  const wave = root.querySelector(".g-wave");
  const waveBars = Array.from(root.querySelectorAll(".g-wave span"));
  const input = root.querySelector(".g-inputrow input");
  const sendBtn = root.querySelector(".g-send");
  const ring = root.querySelector(".g-ring");

  let panelOpen = false;
  let conversation = null;
  let wavePollId = null;

  function setLauncherState(s) {
    launcher.dataset.state = s;
  }
  function setStatus(text) {
    panelStatus.textContent = text;
    stageLabel.textContent = text;
  }

  // ---- First-visit invite (docked launcher only, no cursor-follow mode by design) ----
  if (!sessionStorage.getItem("guide_invited")) {
    setTimeout(() => {
      if (panelOpen) return;
      invite.textContent = "Need a quick tour?";
      invite.classList.add("show");
      setTimeout(() => invite.classList.remove("show"), 5000);
      sessionStorage.setItem("guide_invited", "1");
    }, 2200);
  }

  function openPanel() {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("g-open"));
    panelOpen = true;
    launcher.setAttribute("aria-expanded", "true");
    invite.classList.remove("show");
    input.focus();
  }
  function closePanel() {
    endVoiceIfActive();
    panel.classList.remove("g-open");
    setTimeout(() => { panel.hidden = true; }, 200);
    panelOpen = false;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
    clearHighlight();
    setLauncherState("idle");
    setStatus("Ask your guide");
  }

  launcher.addEventListener("click", () => {
    if (panelOpen) {
      closePanel();
      return;
    }
    openPanel();
    startVoice();
  });
  closeBtn.addEventListener("click", closePanel);
  minimizeBtn.addEventListener("click", () => {
    panel.classList.remove("g-open");
    setTimeout(() => { panel.hidden = true; }, 200);
    panelOpen = false;
    launcher.setAttribute("aria-expanded", "false");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!ring.hidden) { clearHighlight(); return; }
    if (panelOpen) closePanel();
  });

  function showCaption(role, text) {
    stageCaption.textContent = (role === "user" ? "You: " : "") + text;
  }

  // ---- Live waveform, real audio volume once connected, gentle idle breathing otherwise ----
  function startWavePoll() {
    wave.classList.add("g-wave-live");
    stopWavePoll();
    const phases = waveBars.map((_, i) => i * 0.6);
    let t = 0;
    function tick() {
      if (!conversation) return;
      t += 0.12;
      let vol = 0;
      try {
        vol = Math.max(conversation.getInputVolume ? conversation.getInputVolume() : 0, conversation.getOutputVolume ? conversation.getOutputVolume() : 0);
      } catch (e) {}
      waveBars.forEach((bar, i) => {
        const wobble = (Math.sin(t + phases[i]) + 1) / 2;
        const h = 8 + vol * 46 * (0.5 + wobble * 0.5) + wobble * 4;
        bar.style.height = Math.max(6, Math.min(56, h)) + "px";
      });
      wavePollId = requestAnimationFrame(tick);
    }
    tick();
  }
  function stopWavePoll() {
    if (wavePollId) cancelAnimationFrame(wavePollId);
    wavePollId = null;
    wave.classList.remove("g-wave-live");
    waveBars.forEach((bar) => { bar.style.height = ""; });
  }

  // ---- ElevenLabs conversation lifecycle ----
  function makeClientTools() {
    return {
      highlight_website_section: async ({ targetId }) => {
        highlight(GUIDE_TARGETS[targetId]);
        return targetId in GUIDE_TARGETS ? "highlighted" : "unknown target";
      },
      collect_email: async ({ email, track }) => {
        await submitEmailCapture(email, track);
        return "captured";
      },
    };
  }

  let connecting = false;
  async function startVoice() {
    if (conversation || connecting) return;
    connecting = true;
    setLauncherState("connecting");
    setStatus("Connecting…");
    micBtn.dataset.active = "true";
    try {
      const ElevenLabs = window.ElevenLabsClient;
      if (!ElevenLabs) throw new Error("SDK unavailable");
      conversation = await ElevenLabs.Conversation.startSession({
        agentId: CONFIG.elevenLabsAgentId,
        textOnly: false,
        clientTools: makeClientTools(),
        onConnect: () => {
          endBtn.hidden = false;
          setLauncherState("listening");
          setStatus("Listening…");
          startWavePoll();
          stageHint.textContent = "Tap the mic to mute, or the red button to end.";
        },
        onDisconnect: () => {
          conversation = null;
          micBtn.dataset.active = "false";
          micBtn.dataset.muted = "false";
          endBtn.hidden = true;
          stopWavePoll();
          stageHint.textContent = "Tap to talk out loud, mic access starts only then.";
          setLauncherState("idle");
          setStatus("Ask your guide");
        },
        onModeChange: ({ mode }) => {
          const s = mode === "speaking" ? "speaking" : "listening";
          setLauncherState(s);
          setStatus(s === "speaking" ? "Speaking…" : "Listening…");
        },
        onMessage: ({ message, role }) => showCaption(role === "user" ? "user" : "agent", message),
        onError: () => {
          setLauncherState("error");
          setStatus("Voice unavailable, you can still type.");
          micBtn.dataset.active = "false";
        },
      });
    } catch (e) {
      setLauncherState("error");
      setStatus("Voice unavailable right now. You can still type.");
      micBtn.dataset.active = "false";
      conversation = null;
    } finally {
      connecting = false;
    }
  }

  async function ensureTextSession() {
    if (conversation) return conversation;
    const ElevenLabs = window.ElevenLabsClient;
    if (!ElevenLabs) {
      setStatus("Quinn is unavailable right now.");
      return null;
    }
    try {
      conversation = await ElevenLabs.Conversation.startSession({
        agentId: CONFIG.elevenLabsAgentId,
        textOnly: true,
        clientTools: makeClientTools(),
        onConnect: () => setStatus("Ask your guide"),
        onDisconnect: () => { conversation = null; setStatus("Ask your guide"); },
        onMessage: ({ message, role }) => showCaption(role === "user" ? "user" : "agent", message),
        onError: () => setStatus("Quinn is unavailable right now."),
      });
      return conversation;
    } catch (e) {
      setStatus("Quinn is unavailable right now.");
      return null;
    }
  }

  function endVoiceIfActive() {
    if (conversation) {
      conversation.endSession();
      conversation = null;
    }
    micBtn.dataset.active = "false";
    micBtn.dataset.muted = "false";
    endBtn.hidden = true;
    stopWavePoll();
  }

  micBtn.addEventListener("click", () => {
    if (!conversation) {
      startVoice();
      return;
    }
    const muted = micBtn.dataset.muted !== "true";
    conversation.setMicMuted(muted);
    micBtn.dataset.muted = String(muted);
    setLauncherState(muted ? "muted" : "listening");
  });
  endBtn.addEventListener("click", () => {
    endVoiceIfActive();
    setLauncherState("idle");
    setStatus("Ask your guide");
  });

  async function sendTyped() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    showCaption("user", text);
    const convo = await ensureTextSession();
    if (convo) convo.sendUserMessage(text);
  }
  sendBtn.addEventListener("click", sendTyped);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendTyped();
    else if (conversation) conversation.sendUserActivity();
  });

  async function submitEmailCapture(email, track) {
    if (!CONFIG.slackWebhookUrl || CONFIG.slackWebhookUrl.startsWith("REPLACE_ME")) {
      console.warn("[Quinn] Slack webhook not configured yet, email captured locally only:", email, track);
      return;
    }
    try {
      await fetch(CONFIG.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `New Quinn email capture (${track}): ${email}` }),
      });
    } catch (e) {
      console.warn("[Quinn] Slack webhook post failed", e);
    }
  }

  // ---- Tour / highlight (allowlisted targets only) ----
  let highlightTimer = null;
  function highlight(selector) {
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    setLauncherState("guiding");
    el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
    clearTimeout(highlightTimer);
    setTimeout(() => positionRing(el), prefersReduced ? 0 : 380);
    highlightTimer = setTimeout(clearHighlight, 5000);
  }
  function positionRing(el) {
    const r = el.getBoundingClientRect();
    ring.hidden = false;
    ring.style.top = r.top - 6 + "px";
    ring.style.left = r.left - 6 + "px";
    ring.style.width = r.width + 12 + "px";
    ring.style.height = r.height + 12 + "px";
  }
  function clearHighlight() {
    ring.hidden = true;
    if (launcher.dataset.state === "guiding") setLauncherState(conversation ? "listening" : "idle");
  }

  // ---- "Here's our story" CTA opens the panel with a suggested prompt ----
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest && e.target.closest("[data-ace-story-trigger]");
    if (!trigger) return;
    e.preventDefault();
    openPanel();
    input.value = "Tell me the A+ story";
    input.focus();
  });

  setLauncherState("idle");
})();
