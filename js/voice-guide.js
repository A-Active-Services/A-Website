/**
 * A+ Active Services — "Ace" Guide Orb.
 * Docked glass-orb launcher (brand blue/red) that opens a voice-first panel
 * wired to a public ElevenLabs Conversational AI agent, with a typed
 * text-only fallback. No canned chat-bubble UI, no chips.
 * Built per CLAUDE-VOICE-GUIDE-WIDGET-BUILD.md.
 */
(function () {
  "use strict";

  const CONFIG = {
    agentName: "Ace",
    logoUrl: "assets/logo-icon.png",
    slackUrl:
      "https://join.slack.com/t/aplusactiveservices/shared_invite/zt-45duywuls-ENY0PVBiQBgYmh7tW69D7g",
    promptClinicUrl: "https://thepromptclinic.com",
    bookingUrl: "https://cal.com/a-activeservces",
    elevenLabsAgentId: "agent_7801kz4eq34qf84sdkqwkzyqr4nn",
    // TODO: replace with a dedicated Slack Incoming Webhook for Ace email captures
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
  const isMobile = matchMedia("(max-width: 640px)").matches;

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
        filter:
          drop-shadow(0 7px 14px rgba(0,8,28,.38))
          drop-shadow(0 0 14px rgba(46,124,255,.22));
        transition: transform .18s ease, width .2s ease, height .2s ease;
      }
      .g-launcher:hover, .g-launcher:focus-visible { transform: scale(1.08); }
      .g-launcher:active { transform: scale(.9); }
      @media (max-width: 640px) { .g-launcher { width: 56px; height: 56px; right: 18px; bottom: 18px; } }

      .g-orb { position: absolute; inset: 0; border-radius: inherit; }
      .g-orb__shell {
        position: absolute; inset: 0; border-radius: inherit;
        background:
          radial-gradient(circle at 31% 23%, rgba(255,255,255,.78) 0 5%, rgba(255,255,255,.16) 12%, transparent 28%),
          radial-gradient(circle at 50% 58%, rgba(18,31,70,.5) 0 50%, rgba(4,10,28,.82) 76%),
          conic-gradient(from 210deg, var(--g-secondary), rgba(255,255,255,.8), var(--g-primary), #101c3f, var(--g-secondary));
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.5),
          inset 5px 4px 10px rgba(255,255,255,.10),
          inset -7px -8px 14px rgba(6,10,30,.4);
      }
      .g-orb__lens {
        position: absolute; inset: 24%; border-radius: inherit;
        background:
          radial-gradient(circle at 45% 42%, rgba(255,255,255,.6) 0 4%, transparent 14%),
          radial-gradient(circle at 50% 55%, #cdddff 0 5%, var(--g-primary) 20%, #14265c 56%, rgba(10,14,34,.92) 78%);
        box-shadow: inset 0 0 0 1px rgba(224,234,255,.5), 0 0 12px rgba(46,124,255,.32);
      }
      .g-orb__core {
        position: absolute; inset: 43%; border-radius: inherit; background: var(--g-core);
        box-shadow: 0 0 4px #fff, 0 0 10px #9db8ff, 0 0 16px rgba(46,124,255,.7);
        transition: box-shadow .3s ease;
      }
      .g-orb__highlight {
        position: absolute; inset: 9% 38% 54% 15%; border-radius: 60% 45% 55% 38%;
        background: linear-gradient(145deg, rgba(255,255,255,.66), rgba(255,255,255,0));
        transform: rotate(-18deg);
      }
      .g-launcher[data-state="idle"] .g-orb { animation: g-breathe 4.2s ease-in-out infinite; }
      .g-launcher[data-state="listening"] .g-orb__core { box-shadow: 0 0 6px #fff, 0 0 14px var(--g-secondary), 0 0 22px rgba(255,59,59,.7); }
      .g-launcher[data-state="speaking"] .g-orb__core { box-shadow: 0 0 6px #fff, 0 0 16px var(--g-primary), 0 0 26px rgba(46,124,255,.8); }
      .g-launcher[data-state="thinking"] .g-orb { animation: g-pulse-soft 1.4s ease-in-out infinite; }
      .g-launcher[data-state="connecting"] .g-orb { animation: g-spin-soft 1.8s linear infinite; }
      .g-launcher[data-state="muted"] .g-orb { opacity: .5; }
      @keyframes g-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      @keyframes g-pulse-soft { 0%,100% { opacity: 1; } 50% { opacity: .7; } }
      @keyframes g-spin-soft { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        .g-launcher[data-state] .g-orb { animation: none; }
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
        max-height: min(620px, calc(100vh - 40px));
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
          border-radius: 24px 24px 0 0; max-height: min(78vh, 620px);
          padding-bottom: env(safe-area-inset-bottom);
        }
      }

      .g-panel-head { display: flex; align-items: center; gap: 12px; padding: 18px 18px 10px; }
      .g-panel-orb { width: 40px; height: 40px; border-radius: 999px; position: relative; flex-shrink: 0; }
      .g-panel-title { font-weight: 700; color: var(--g-text); font-size: .95rem; }
      .g-panel-status { font-size: .78rem; color: var(--g-muted); margin-top: 1px; }
      .g-panel-controls { margin-left: auto; display: flex; gap: 6px; }
      .g-icon-btn {
        width: 30px; height: 30px; min-width: 44px; min-height: 44px; margin: -7px;
        border-radius: 50%; border: 1px solid var(--g-border); background: transparent;
        color: var(--g-muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: .95rem;
      }
      .g-icon-btn:hover, .g-icon-btn:focus-visible { color: #fff; border-color: var(--g-primary); }
      @media (max-width: 640px) { .g-icon-btn { width: 44px; height: 44px; margin: 0; } }

      .g-panel-body { padding: 4px 18px 18px; overflow-y: auto; flex: 1; min-height: 0; }

      .g-start-voice {
        width: 100%; display: flex; flex-direction: column; align-items: center; gap: 10px;
        padding: 22px 16px; border-radius: 18px; border: 1px solid var(--g-border);
        background: rgba(46,124,255,.08); cursor: pointer; margin-bottom: 14px;
      }
      .g-start-voice:hover, .g-start-voice:focus-visible { border-color: var(--g-primary); background: rgba(46,124,255,.14); }
      .g-start-voice-icon {
        width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, var(--g-primary), #1a4fc9); color: #fff; font-size: 1.3rem;
      }
      .g-start-voice-label { font-weight: 700; color: var(--g-text); font-size: .92rem; }
      .g-start-voice-sub { font-size: .76rem; color: var(--g-muted); text-align: center; }

      .g-transcript { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; max-height: 220px; overflow-y: auto; }
      .g-transcript[hidden] { display: none; }
      .g-msg { max-width: 88%; padding: 8px 12px; border-radius: 12px; font-size: .85rem; line-height: 1.45; }
      .g-msg-agent { align-self: flex-start; background: rgba(255,255,255,.06); color: var(--g-text); }
      .g-msg-user { align-self: flex-end; background: var(--g-primary); color: #fff; }

      .g-live-controls { display: none; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px; }
      .g-live-controls.show { display: flex; }
      .g-live-controls button {
        width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--g-border);
        background: rgba(255,255,255,.04); color: var(--g-muted); cursor: pointer;
        display: flex; align-items: center; justify-content: center; font-size: 1rem;
      }
      .g-live-controls button:hover { color: #fff; }
      .g-live-controls .g-end-btn { color: var(--g-secondary); border-color: rgba(255,59,59,.4); }
      .g-live-controls .g-mute-btn[data-muted="true"] { color: var(--g-secondary); border-color: rgba(255,59,59,.4); }

      .g-inputrow { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--g-border); }
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

    <button class="g-launcher" type="button" data-state="idle" aria-haspopup="dialog" aria-expanded="false" aria-label="Talk to Ace, the A+ Active Services guide">
      <span class="g-orb"><span class="g-orb__shell"></span><span class="g-orb__lens"></span><span class="g-orb__core"></span><span class="g-orb__highlight"></span></span>
    </button>
    <div class="g-invite" role="status"></div>

    <div class="g-panel" hidden role="dialog" aria-modal="false" aria-label="Ace, the A+ Active Services guide">
      <div class="g-panel-head">
        <span class="g-panel-orb"><span class="g-orb__shell"></span><span class="g-orb__lens"></span><span class="g-orb__core"></span></span>
        <div>
          <div class="g-panel-title">${CONFIG.agentName}</div>
          <div class="g-panel-status" aria-live="polite">Ask your guide</div>
        </div>
        <div class="g-panel-controls">
          <button class="g-icon-btn g-minimize" type="button" aria-label="Minimize">&#8722;</button>
          <button class="g-icon-btn g-close" type="button" aria-label="Close">&times;</button>
        </div>
      </div>
      <div class="g-panel-body">
        <button class="g-start-voice" type="button">
          <span class="g-start-voice-icon">&#127908;</span>
          <span class="g-start-voice-label">Start Voice</span>
          <span class="g-start-voice-sub">Talk to Ace out loud. Mic access starts only when you tap this.</span>
        </button>
        <div class="g-transcript" hidden></div>
        <div class="g-live-controls">
          <button class="g-mute-btn" type="button" data-muted="false" aria-label="Mute microphone" title="Mute">&#127908;</button>
          <button class="g-end-btn" type="button" aria-label="End voice session" title="End">&#9209;</button>
        </div>
        <div class="g-inputrow">
          <input type="text" placeholder="Or type a question…" aria-label="Type a question for Ace">
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
  const closeBtn = root.querySelector(".g-close");
  const minimizeBtn = root.querySelector(".g-minimize");
  const startVoiceBtn = root.querySelector(".g-start-voice");
  const transcript = root.querySelector(".g-transcript");
  const liveControls = root.querySelector(".g-live-controls");
  const muteBtn = root.querySelector(".g-mute-btn");
  const endBtn = root.querySelector(".g-end-btn");
  const input = root.querySelector(".g-inputrow input");
  const sendBtn = root.querySelector(".g-send");
  const ring = root.querySelector(".g-ring");

  let panelOpen = false;
  let conversation = null;
  let textOnlySession = false;

  function setLauncherState(s) {
    launcher.dataset.state = s;
  }
  function setStatus(text) {
    panelStatus.textContent = text;
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

  launcher.addEventListener("click", () => (panelOpen ? closePanel() : openPanel()));
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

  function addMessage(role, text) {
    transcript.hidden = false;
    const div = document.createElement("div");
    div.className = "g-msg g-msg-" + role;
    div.textContent = text;
    transcript.appendChild(div);
    transcript.scrollTop = transcript.scrollHeight;
  }

  // ---- ElevenLabs conversation lifecycle ----
  async function startVoice() {
    if (conversation) return;
    setLauncherState("connecting");
    setStatus("Connecting…");
    try {
      const ElevenLabs = window.ElevenLabsClient;
      if (!ElevenLabs) throw new Error("SDK unavailable");
      conversation = await ElevenLabs.Conversation.startSession({
        agentId: CONFIG.elevenLabsAgentId,
        textOnly: false,
        clientTools: {
          highlight_website_section: async ({ targetId }) => {
            highlight(GUIDE_TARGETS[targetId]);
            return targetId in GUIDE_TARGETS ? "highlighted" : "unknown target";
          },
          collect_email: async ({ email, track }) => {
            await submitEmailCapture(email, track);
            return "captured";
          },
        },
        onConnect: () => {
          textOnlySession = false;
          startVoiceBtn.hidden = true;
          liveControls.classList.add("show");
          setLauncherState("listening");
          setStatus("Listening…");
        },
        onDisconnect: () => {
          conversation = null;
          startVoiceBtn.hidden = false;
          liveControls.classList.remove("show");
          setLauncherState(panelOpen ? "idle" : "idle");
          setStatus("Ask your guide");
        },
        onModeChange: ({ mode }) => {
          const s = mode === "speaking" ? "speaking" : "listening";
          setLauncherState(s);
          setStatus(s === "speaking" ? "Speaking…" : "Listening…");
        },
        onMessage: ({ message, role }) => addMessage(role === "user" ? "user" : "agent", message),
        onError: () => {
          setLauncherState("error");
          setStatus("Voice unavailable, you can still type.");
        },
      });
    } catch (e) {
      setLauncherState("error");
      setStatus("Voice unavailable right now. You can still type.");
      conversation = null;
    }
  }

  async function ensureTextSession() {
    if (conversation) return conversation;
    const ElevenLabs = window.ElevenLabsClient;
    if (!ElevenLabs) {
      setStatus("Ace is unavailable right now.");
      return null;
    }
    try {
      conversation = await ElevenLabs.Conversation.startSession({
        agentId: CONFIG.elevenLabsAgentId,
        textOnly: true,
        clientTools: {
          highlight_website_section: async ({ targetId }) => {
            highlight(GUIDE_TARGETS[targetId]);
            return targetId in GUIDE_TARGETS ? "highlighted" : "unknown target";
          },
          collect_email: async ({ email, track }) => {
            await submitEmailCapture(email, track);
            return "captured";
          },
        },
        onConnect: () => { textOnlySession = true; setStatus("Ask your guide"); },
        onDisconnect: () => { conversation = null; setStatus("Ask your guide"); },
        onMessage: ({ message, role }) => addMessage(role === "user" ? "user" : "agent", message),
        onError: () => setStatus("Ace is unavailable right now."),
      });
      return conversation;
    } catch (e) {
      setStatus("Ace is unavailable right now.");
      return null;
    }
  }

  function endVoiceIfActive() {
    if (conversation) {
      conversation.endSession();
      conversation = null;
    }
    startVoiceBtn.hidden = false;
    liveControls.classList.remove("show");
  }

  startVoiceBtn.addEventListener("click", startVoice);
  endBtn.addEventListener("click", () => {
    endVoiceIfActive();
    setLauncherState("idle");
    setStatus("Ask your guide");
  });
  muteBtn.addEventListener("click", () => {
    if (!conversation) return;
    const muted = muteBtn.dataset.muted !== "true";
    conversation.setMicMuted(muted);
    muteBtn.dataset.muted = String(muted);
    setLauncherState(muted ? "muted" : "listening");
  });

  async function sendTyped() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage("user", text);
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
      console.warn("[Ace] Slack webhook not configured yet, email captured locally only:", email, track);
      return;
    }
    try {
      await fetch(CONFIG.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `New Ace email capture (${track}): ${email}` }),
      });
    } catch (e) {
      console.warn("[Ace] Slack webhook post failed", e);
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
  if (isMobile) { /* mobile uses the same docked launcher + bottom-sheet panel via CSS breakpoint above */ }
})();
