/**
 * A+ Active Services — Ace, the ambient site guide.
 * The orb itself is the launcher (no separate boxed chat button/header).
 * Glass caption bubble instead of a chat-app panel. CSS-only motion,
 * Shadow DOM isolated, keyboard accessible, respects prefers-reduced-motion,
 * no autoplay audio/mic without direct action.
 * No live LLM backend yet: canned, triage-focused knowledge base + speechSynthesis.
 */
(function () {
  "use strict";

  const CONFIG = {
    companyName: "A+ Active Services",
    agentName: "Ace",
    logoUrl: "assets/logo-icon.png",
    slackUrl:
      "https://join.slack.com/t/aplusactiveservices/shared_invite/zt-45duywuls-ENY0PVBiQBgYmh7tW69D7g",
    promptClinicUrl: "prompt-clinic.html",
    // TODO: replace with a real Slack Incoming Webhook URL to receive email captures from Ace.
    slackWebhookUrl: "REPLACE_ME_SLACK_WEBHOOK_URL",
  };

  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const enableCursor = matchMedia("(pointer: fine)").matches && !prefersReduced;

  const host = document.createElement("div");
  host.id = "aplus-voice-guide-host";
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483000;";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
    <style>
      :host { --vg-primary:#2E7CFF; --vg-secondary:#FF3B3B; --vg-purple:#8B5CF6; --vg-cyan:#6EE7F9; --vg-dark:#0D1830; --vg-border:rgba(255,255,255,.16); }
      * { box-sizing:border-box; font-family:'Inter',system-ui,sans-serif; }

      /* ---- The orb is the launcher. Always alive, always clickable. ---- */
      .vg-orb {
        position:fixed; top:0; left:0; width:40px; height:40px; border-radius:50%;
        pointer-events:auto; cursor:pointer; z-index:2147483001;
        background:
          radial-gradient(circle at 30% 24%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.2) 11%, transparent 26%),
          radial-gradient(circle at 50% 58%, var(--vg-purple) 0%, rgba(139,92,246,.55) 34%, rgba(9,14,28,.94) 74%);
        box-shadow:
          inset 0 0 10px rgba(255,255,255,.3),
          inset 0 -8px 14px rgba(0,0,0,.4),
          0 0 22px rgba(139,92,246,.65), 0 0 36px rgba(46,124,255,.3);
        border: 1px solid rgba(255,255,255,.45);
        transition: width .2s ease, height .2s ease, box-shadow .2s ease, opacity .3s ease;
        will-change: transform;
        animation: vg-breathe 4s ease-in-out infinite;
      }
      .vg-orb.hover, .vg-orb:hover { width:46px; height:46px; box-shadow: inset 0 0 12px rgba(255,255,255,.35), inset 0 -8px 14px rgba(0,0,0,.4), 0 0 30px rgba(139,92,246,.8), 0 0 44px rgba(46,124,255,.4); }
      .vg-orb.down { width:32px; height:32px; }
      .vg-orb.docked { animation: vg-breathe 4s ease-in-out infinite; }
      .vg-orb[data-state="listening"] { box-shadow: inset 0 0 10px rgba(255,255,255,.3), 0 0 30px rgba(255,59,59,.7), 0 0 46px rgba(255,59,59,.35); }
      .vg-orb[data-state="speaking"] { box-shadow: inset 0 0 10px rgba(255,255,255,.3), 0 0 30px rgba(46,124,255,.75), 0 0 46px rgba(46,124,255,.4); }
      @keyframes vg-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }

      .vg-invite {
        position:fixed; pointer-events:none;
        background:var(--vg-dark); border:1px solid var(--vg-border); color:#F5F7FB;
        padding:7px 14px; border-radius:100px; font-size:.8rem; font-weight:600;
        opacity:0; transform:translateY(6px); transition:opacity .3s ease, transform .3s ease;
        box-shadow:0 10px 24px -8px rgba(0,0,0,.5); white-space:nowrap;
      }
      .vg-invite.show { opacity:1; transform:translateY(0); }

      /* ---- Frameless glass caption bubble. No app header, no bordered transcript. ---- */
      .vg-bubble {
        position:fixed; right:22px; bottom:96px; width:336px; max-width:calc(100vw - 32px);
        display:flex; flex-direction:column; gap:12px;
        background:rgba(13,24,48,.86); backdrop-filter:blur(20px);
        border:1px solid var(--vg-border); border-radius:20px; padding:20px 20px 16px;
        box-shadow:0 30px 70px -24px rgba(0,0,0,.65); pointer-events:auto;
        opacity:0; transform:translateY(10px) scale(.98); transition:opacity .25s ease, transform .25s ease;
      }
      .vg-bubble.vg-open { opacity:1; transform:translateY(0) scale(1); }
      .vg-bubble[hidden] { display:none; }

      .vg-close {
        position:absolute; top:12px; right:12px; width:24px; height:24px; border-radius:50%;
        border:1px solid var(--vg-border); background:rgba(255,255,255,.04); color:#B4BDCC;
        cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:.85rem; line-height:1;
      }
      .vg-close:hover { color:#fff; border-color:var(--vg-primary); }
      .vg-voice-toggle {
        position:absolute; top:12px; right:44px; width:24px; height:24px; border-radius:50%;
        border:1px solid var(--vg-border); background:rgba(255,255,255,.04); color:#B4BDCC;
        cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:.8rem;
      }
      .vg-voice-toggle:hover { color:#fff; border-color:var(--vg-primary); }

      .vg-user-line { font-size:.74rem; color:#7C879B; font-style:italic; padding-right:56px; min-height:1em; }
      .vg-agent-line {
        font-size:.98rem; line-height:1.55; color:#F5F7FB; padding-right:16px;
        opacity:0; transform:translateY(4px); transition:opacity .3s ease, transform .3s ease;
      }
      .vg-agent-line.vg-show { opacity:1; transform:translateY(0); }
      .vg-waveform { display:none; align-items:flex-end; gap:2px; height:14px; margin-top:2px; }
      .vg-waveform.active { display:flex; }
      .vg-waveform span { width:3px; border-radius:2px; background:linear-gradient(180deg, var(--vg-cyan), var(--vg-purple)); animation: vg-wave .9s ease-in-out infinite; }
      @keyframes vg-wave { 0%,100% { transform:scaleY(.35); } 50% { transform:scaleY(1); } }

      .vg-chips { display:flex; flex-wrap:wrap; gap:6px; }
      .vg-chip {
        font-size:.76rem; font-weight:600; color:#B4BDCC; background:rgba(255,255,255,.05);
        border:1px solid var(--vg-border); border-radius:100px; padding:7px 12px; cursor:pointer;
      }
      .vg-chip:hover { color:#fff; border-color:var(--vg-primary); }
      .vg-chip.vg-chip-accent { color:#fff; background:rgba(255,59,59,.14); border-color:rgba(255,59,59,.4); }

      .vg-inputrow { display:flex; gap:8px; padding-top:6px; border-top:1px solid var(--vg-border); margin-top:2px; }
      .vg-inputrow input {
        flex:1; min-width:0; background:rgba(255,255,255,.05); border:1px solid var(--vg-border); border-radius:100px;
        padding:9px 14px; color:#F5F7FB; font-size:.85rem; outline:none; margin-top:8px;
      }
      .vg-inputrow input:focus { border-color:var(--vg-primary); }
      .vg-inputrow button {
        width:36px; height:36px; margin-top:8px; border-radius:50%; border:1px solid var(--vg-border); background:transparent;
        color:#B4BDCC; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      .vg-inputrow button:hover { color:#fff; border-color:var(--vg-primary); }
      .vg-inputrow .vg-send { background:var(--vg-primary); border-color:var(--vg-primary); color:#fff; }
      .vg-mic[data-active="true"] { color:var(--vg-secondary); border-color:var(--vg-secondary); }
      .vg-mic:disabled { opacity:.4; cursor:not-allowed; }

      .vg-foot { font-size:.66rem; color:#5b6577; line-height:1.4; }

      .vg-ring {
        position:fixed; border:2px solid var(--vg-primary); border-radius:14px; pointer-events:none;
        box-shadow:0 0 0 4px rgba(46,124,255,.18), 0 0 30px rgba(46,124,255,.4);
        z-index:2147482999; transition: top .3s ease, left .3s ease, width .3s ease, height .3s ease;
      }
      .vg-ring[hidden] { display:none; }

      @media (max-width: 480px) {
        .vg-bubble { right:12px; left:12px; width:auto; bottom:78px; }
        .vg-orb { right:16px; bottom:16px; }
      }
    </style>

    <div class="vg-orb" role="button" tabindex="0" aria-label="Talk to Ace, the A+ Active Services guide" aria-expanded="false" data-state="idle"></div>
    <div class="vg-invite" role="status"></div>

    <div class="vg-bubble" hidden role="dialog" aria-label="Ace, the A+ Active Services guide">
      <button class="vg-voice-toggle" type="button" aria-pressed="true" aria-label="Toggle spoken replies" title="Toggle spoken replies">&#128266;</button>
      <button class="vg-close" type="button" aria-label="Close">&times;</button>
      <div class="vg-user-line" aria-live="off"></div>
      <div>
        <p class="vg-agent-line vg-show" aria-live="polite">Hi, I'm ${CONFIG.agentName}. Ask me about A+, the team, or how to get started &mdash; for you, or for your team.</p>
        <div class="vg-waveform" aria-hidden="true">
          <span style="animation-delay:0ms"></span><span style="animation-delay:90ms"></span><span style="animation-delay:180ms"></span>
          <span style="animation-delay:60ms"></span><span style="animation-delay:150ms"></span><span style="animation-delay:30ms"></span>
          <span style="animation-delay:120ms"></span>
        </div>
      </div>
      <div class="vg-chips">
        <button class="vg-chip" data-q="What does A+ do?">What does A+ do?</button>
        <button class="vg-chip" data-q="I'm exploring AI for myself">Just for me</button>
        <button class="vg-chip" data-q="I'm looking for my team or organization">For my team</button>
        <button class="vg-chip" data-q="How do I book a consult?">Book a consult</button>
      </div>
      <div class="vg-inputrow">
        <button class="vg-mic" type="button" aria-label="Ask by voice" title="Ask by voice">&#127908;</button>
        <input type="text" placeholder="Ask a question…" aria-label="Ask Ace a question">
        <button class="vg-send" type="button" aria-label="Send">&#8594;</button>
      </div>
      <p class="vg-foot">Nothing is recorded or stored. Mic access starts only when you tap it. ${CONFIG.agentName} only knows about A+, not a general AI yet.</p>
    </div>
    <div class="vg-ring" hidden></div>
  `;

  const orb = root.querySelector(".vg-orb");
  const invite = root.querySelector(".vg-invite");
  const bubble = root.querySelector(".vg-bubble");
  const closeBtn = root.querySelector(".vg-close");
  const voiceToggle = root.querySelector(".vg-voice-toggle");
  const userLine = root.querySelector(".vg-user-line");
  const agentLine = root.querySelector(".vg-agent-line");
  const chipsRow = root.querySelector(".vg-chips");
  const input = root.querySelector(".vg-inputrow input");
  const sendBtn = root.querySelector(".vg-send");
  const micBtn = root.querySelector(".vg-mic");
  const ring = root.querySelector(".vg-ring");
  const waveform = root.querySelector(".vg-waveform");

  let docked = !enableCursor;
  let bubbleOpen = false;
  let voiceOn = true;
  let visitorTrack = null; // "self" | "team"

  function setState(s) {
    orb.dataset.state = s;
    waveform.classList.toggle("active", s === "listening");
  }

  // ---- Orb motion: glides with the cursor until the bubble opens, then docks bottom-right ----
  if (enableCursor) {
    let mouseX = innerWidth - 60,
      mouseY = innerHeight - 60,
      orbX = mouseX,
      orbY = mouseY,
      lastMove = Date.now();

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      lastMove = Date.now();
    });
    document.addEventListener("mouseover", (e) => {
      if (docked) return;
      const t = e.target.closest && e.target.closest("a,button,input,textarea,[role='button'],.btn");
      orb.classList.toggle("hover", !!t);
    });
    (function raf() {
      if (!docked) {
        orbX += (mouseX - orbX) * 0.16;
        orbY += (mouseY - orbY) * 0.16;
        orb.style.transform = "translate3d(" + (orbX - 20) + "px," + (orbY - 20) + "px,0)";
      }
      requestAnimationFrame(raf);
    })();
    setInterval(() => {
      if (!docked && !bubbleOpen && Date.now() - lastMove > 6000) showInvite();
    }, 500);
  } else {
    positionOrbDocked();
    if (!sessionStorage.getItem("vg_invited")) setTimeout(showInvite, 2200);
  }

  function positionOrbDocked() {
    orb.style.right = "22px";
    orb.style.bottom = "22px";
    orb.style.top = "auto";
    orb.style.left = "auto";
    orb.style.transform = "none";
    orb.classList.add("docked");
  }

  function dockOrb() {
    if (docked) return;
    docked = true;
    positionOrbDocked();
  }
  function undockOrb() {
    if (!enableCursor) return;
    docked = false;
    orb.style.right = "auto";
    orb.style.bottom = "auto";
    orb.classList.remove("docked");
  }

  function showInvite(text) {
    if (bubbleOpen) return;
    if (sessionStorage.getItem("vg_invited") && !text) return;
    const r = orb.getBoundingClientRect();
    invite.style.left = Math.max(12, r.left - 120) + "px";
    invite.style.top = r.top - 40 + "px";
    invite.textContent = text || "Need a quick tour?";
    invite.classList.add("show");
    setTimeout(() => invite.classList.remove("show"), 4500);
    sessionStorage.setItem("vg_invited", "1");
  }

  function openBubble() {
    dockOrb();
    bubble.hidden = false;
    requestAnimationFrame(() => bubble.classList.add("vg-open"));
    bubbleOpen = true;
    orb.setAttribute("aria-expanded", "true");
    invite.classList.remove("show");
    setState("ready");
    input.focus();
  }
  function closeBubble() {
    bubble.classList.remove("vg-open");
    setTimeout(() => { bubble.hidden = true; }, 200);
    bubbleOpen = false;
    orb.setAttribute("aria-expanded", "false");
    clearHighlight();
    setState("idle");
    if (enableCursor) undockOrb();
  }

  orb.addEventListener("click", () => (bubbleOpen ? closeBubble() : openBubble()));
  orb.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      bubbleOpen ? closeBubble() : openBubble();
    }
  });
  closeBtn.addEventListener("click", closeBubble);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bubbleOpen) closeBubble();
  });

  voiceToggle.addEventListener("click", () => {
    voiceOn = !voiceOn;
    voiceToggle.setAttribute("aria-pressed", String(voiceOn));
    voiceToggle.style.color = voiceOn ? "" : "#5b6577";
    if (!voiceOn && "speechSynthesis" in window) speechSynthesis.cancel();
  });

  // ---- Voice: pick the best available female-sounding system voice ----
  let chosenVoice = null;
  const FEMALE_VOICE_HINTS = [
    "samantha", "victoria", "karen", "moira", "tessa", "female",
    "zira", "susan", "linda", "google us english", "google uk english female",
    "microsoft aria", "microsoft jenny", "ava", "allison", "serena",
  ];
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    const enVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
    const pool = enVoices.length ? enVoices : voices;
    chosenVoice =
      pool.find((v) => FEMALE_VOICE_HINTS.some((hint) => v.name.toLowerCase().includes(hint))) ||
      pool[0];
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    if (!voiceOn || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (chosenVoice) u.voice = chosenVoice;
      u.pitch = 1.05;
      u.rate = 1.0;
      u.onstart = () => setState("speaking");
      u.onend = () => setState("ready");
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function showTurn(userText, agentText, chips) {
    userLine.textContent = userText || "";
    agentLine.classList.remove("vg-show");
    requestAnimationFrame(() => {
      agentLine.textContent = agentText;
      requestAnimationFrame(() => agentLine.classList.add("vg-show"));
    });
    renderChips(chips || []);
    speak(agentText);
  }

  function renderChips(list) {
    chipsRow.innerHTML = "";
    list.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "vg-chip" + (c.accent ? " vg-chip-accent" : "");
      btn.textContent = c.label;
      btn.addEventListener("click", () => c.onClick());
      chipsRow.appendChild(btn);
    });
  }

  // ---- Company-only knowledge base ----
  const DEFAULT_CHIPS = () => [
    { label: "What does A+ do?", onClick: () => handleQuery("What does A+ do?") },
    { label: "Just for me", onClick: () => handleTrack("self") },
    { label: "For my team", onClick: () => handleTrack("team") },
    { label: "Book a consult", onClick: () => handleQuery("How do I book a consult?") },
  ];

  const KB = [
    { test: /tour/i, run: () => startTour() },
    {
      test: /(what.*(do|offer)|services)/i,
      answer:
        "We build voice AI receptionists, workflow automation, healthcare AI, and hands-on AI training for healthcare teams and growing businesses.",
      go: "#services",
    },
    {
      test: /(prompt clinic)/i,
      answer:
        "The Prompt Clinic is our hands-on AI training and community, built for people who want to actually learn how to use AI, not just read about it.",
      go: null,
      chips: () => [{ label: "Enter The Prompt Clinic", accent: true, onClick: () => (location.href = CONFIG.promptClinicUrl) }],
    },
    {
      test: /team|founder|who.*(run|lead)/i,
      answer: "A+ is led by Anthony, Khizar, and Jai. You can meet all three in the Leadership section.",
      go: "#team",
    },
    {
      test: /healthcare/i,
      answer: "Healthcare is where A+ started: privacy-first AI built around patient trust and clinician time.",
      go: "#healthcare",
    },
    {
      test: /(community|slack)/i,
      answer: "Our free Slack community gets you real-time answers and direct access to the team.",
      go: "#community",
      chips: () => [{ label: "Join the Slack Community", accent: true, onClick: () => window.open(CONFIG.slackUrl, "_blank", "noopener") }],
    },
    {
      test: /(price|pricing|cost)/i,
      answer: "There's no public pricing listed yet, it depends on the engagement. The fastest way to get real numbers is a quick consult.",
      go: "#community",
    },
    {
      test: /(contact|book|consult|demo)/i,
      answer: "You can book time with the team directly, or start in the Slack community if you're not ready for a call yet.",
      go: null,
      chips: () => [
        { label: "Book a consult", accent: true, onClick: () => (location.href = "booking.html") },
        { label: "Join Slack instead", onClick: () => window.open(CONFIG.slackUrl, "_blank", "noopener") },
      ],
    },
    {
      test: /(myself|for me|individual|learn ai)/i,
      run: () => handleTrack("self"),
    },
    {
      test: /(my team|organization|org|company|business)/i,
      run: () => handleTrack("team"),
    },
  ];

  function handleTrack(track) {
    visitorTrack = track;
    if (track === "self") {
      showTurn(
        "I'm exploring AI for myself",
        "Then The Prompt Clinic is the best place to start, it's our hands-on training and community for people learning AI for real.",
        [
          { label: "Enter The Prompt Clinic", accent: true, onClick: () => (location.href = CONFIG.promptClinicUrl) },
          { label: "Email me info instead", onClick: () => promptEmailCapture("self") },
        ]
      );
    } else {
      showTurn(
        "I'm looking for my team or organization",
        "Then our Slack community is the fastest path, real-time answers from the team, and we can scope a consult from there.",
        [
          { label: "Join the Slack Community", accent: true, onClick: () => window.open(CONFIG.slackUrl, "_blank", "noopener") },
          { label: "Email me info instead", onClick: () => promptEmailCapture("team") },
        ]
      );
    }
  }

  function promptEmailCapture(track) {
    userLine.textContent = "Email me info instead";
    agentLine.classList.remove("vg-show");
    requestAnimationFrame(() => {
      agentLine.textContent = "Sure, drop your email and we'll follow up.";
      requestAnimationFrame(() => agentLine.classList.add("vg-show"));
    });
    renderChips([]);
    input.type = "email";
    input.placeholder = "you@email.com";
    input.value = "";
    input.focus();
    input.dataset.captureMode = track;
  }

  async function submitEmailCapture(email, track) {
    userLine.textContent = email;
    input.type = "text";
    input.placeholder = "Ask a question…";
    delete input.dataset.captureMode;
    if (!CONFIG.slackWebhookUrl || CONFIG.slackWebhookUrl.startsWith("REPLACE_ME")) {
      console.warn("[Ace] Slack webhook not configured yet — email captured locally only:", email, track);
    } else {
      try {
        await fetch(CONFIG.slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `New Ace email capture (${track === "self" ? "Prompt Clinic" : "Team/Org"}): ${email}`,
          }),
        });
      } catch (e) {
        console.warn("[Ace] Slack webhook post failed", e);
      }
    }
    showTurn(email, "Got it, someone from the team will follow up soon.", DEFAULT_CHIPS());
  }

  function handleQuery(text) {
    if (!text) return;
    if (input.dataset.captureMode) {
      submitEmailCapture(text, input.dataset.captureMode);
      return;
    }
    userLine.textContent = text;
    setState("thinking");
    setTimeout(() => {
      const hit = KB.find((k) => k.test.test(text));
      if (hit && hit.run) {
        hit.run();
        return;
      }
      const answer =
        hit && hit.answer
          ? hit.answer
          : "I only know about A+ right now, not a general AI yet. I can tell you about our services, healthcare work, the Prompt Clinic, or how to get in touch.";
      const chips = hit && hit.chips ? hit.chips() : DEFAULT_CHIPS();
      showTurn(text, answer, chips);
      if (hit && hit.go) highlight(hit.go);
    }, 350);
  }

  sendBtn.addEventListener("click", () => {
    const v = input.value.trim();
    input.value = "";
    if (v) handleQuery(v);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
  chipsRow.querySelectorAll(".vg-chip").forEach((c) => {
    c.addEventListener("click", () => handleQuery(c.dataset.q || c.textContent));
  });

  // ---- Speech recognition (mic), only ever started on direct click ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onstart = () => {
      setState("listening");
      micBtn.dataset.active = "true";
    };
    rec.onresult = (e) => handleQuery(e.results[0][0].transcript);
    rec.onerror = () => {
      setState("error");
      showTurn("", "Voice isn't available right now, but you can still type.", DEFAULT_CHIPS());
      setTimeout(() => setState("ready"), 1500);
    };
    rec.onend = () => {
      micBtn.dataset.active = "false";
      if (orb.dataset.state === "listening") setState("ready");
    };
    micBtn.addEventListener("click", () => {
      try {
        rec.start();
      } catch (e) {}
    });
  } else {
    micBtn.disabled = true;
    micBtn.title = "Voice isn't available in this browser, but you can still type.";
  }

  // ---- Guided tour ----
  const TOUR = [
    { sel: "#services", msg: "Here's what we actually do, voice AI, automation, healthcare AI, and training." },
    { sel: "#healthcare", msg: "Healthcare is where A+ started. This section covers our approach." },
    { sel: "#story", msg: "This is our story, and the leadership team behind A+." },
    { sel: "#community", msg: "And this is how you get in, join Slack or the Prompt Clinic." },
  ];
  function startTour() {
    let step = 0;
    const advance = () => {
      if (step >= TOUR.length) {
        showTurn("", "That's the tour. Want to go deeper on anything?", DEFAULT_CHIPS());
        clearHighlight();
        return;
      }
      const t = TOUR[step];
      setState("guiding");
      highlight(t.sel, true);
      showTurn(step === 0 ? "Give me a quick tour" : "", t.msg, [
        { label: step < TOUR.length - 1 ? "Next" : "Finish", accent: true, onClick: () => { step++; advance(); } },
        { label: "Skip", onClick: () => { clearHighlight(); showTurn("", "No problem, ask me anything.", DEFAULT_CHIPS()); } },
      ]);
    };
    advance();
  }

  // ---- "Here's our story" narrative mode, triggered from the Our Story CTA ----
  const STORY_BEATS = [
    "A+ Active Services started with one observation: talented, dedicated people were buried in administrative work instead of doing what they do best.",
    "Across healthcare, small business, and community organizations, we kept seeing the same pattern, paperwork instead of patients, data entry instead of decisions.",
    "AI became the bridge, not to replace people, but to give them their time back.",
    "That's the whole company in one line: AI with a human touch.",
  ];
  function startStoryMode() {
    openBubble();
    let step = 0;
    const advance = () => {
      if (step >= STORY_BEATS.length) {
        showTurn("", "Want to go deeper, for yourself or for your team?", DEFAULT_CHIPS());
        return;
      }
      showTurn(step === 0 ? "Here's our story" : "", STORY_BEATS[step], [
        { label: step < STORY_BEATS.length - 1 ? "Continue" : "What's next?", accent: true, onClick: () => { step++; advance(); } },
      ]);
    };
    advance();
  }
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest && e.target.closest("[data-ace-story-trigger]");
    if (trigger) {
      e.preventDefault();
      startStoryMode();
    }
  });

  let highlightTimer = null;
  function highlight(selector, persistent) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
    clearTimeout(highlightTimer);
    setTimeout(() => positionRing(el), prefersReduced ? 0 : 380);
    if (!persistent) highlightTimer = setTimeout(clearHighlight, 4000);
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
  }

  setState("idle");
})();
