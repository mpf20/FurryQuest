<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Furry Escapades: Outsmart the Vet</title>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <div id="screen-loading" class="screen active">
    <div class="loading-wrap">
      <div class="load-title">
        <span class="lt-furry">FURRY</span>
        <span class="lt-escapades">ESCAPADES</span>
        <span class="lt-sub">✦ OUTSMART THE VET ✦</span>
      </div>
      <div class="load-bar-outer">
        <div class="load-bar-inner" id="loadBar"></div>
      </div>
      <div class="load-pct" id="loadPct">0%</div>
      <div class="load-tip blink">LOADING ASSETS...</div>
    </div>
  </div>

  <div id="screen-mainmenu" class="screen">
    <div class="scanlines"></div>
    <div class="mm-wrap">
      <div class="mm-logo">
        <div class="mm-title">FURRY ESCAPADES</div>
        <div class="mm-subtitle">◆ OUTSMART THE VET ◆</div>
      </div>

      <div class="mm-vet">
        <img src="assets/images/Veterinaria.png" alt="The Vet" class="mm-vet-img" id="vetTitleImg" />
        <div class="mm-vet-label blink">⚠ THE VET AWAITS ⚠</div>
      </div>

      <nav class="mm-nav">
        <button class="btn btn-green" id="btnStartGame">▶ START GAME</button>
        <button class="btn btn-cyan"  id="btnHowTo">? HOW TO PLAY</button>
      </nav>
      <div class="mm-footer blink">CLICK ANYWHERE TO LOG AUDIO & BEGIN</div>
    </div>
  </div>

  <div id="screen-howtoplay" class="screen">
    <div class="scanlines"></div>
    <div class="howto-panel">
      <h2 class="panel-title yellow">HOW TO PLAY</h2>
      <div class="controls-grid">
        <div class="ctrl"><span class="key">W A S D</span><span class="kdesc">Move</span></div>
        <div class="ctrl"><span class="key">E</span><span class="kdesc">Hide / Interact</span></div>
        <div class="ctrl"><span class="key">SHIFT</span><span class="kdesc">Sprint</span></div>
        <div class="ctrl"><span class="key">ESC</span><span class="kdesc">Pause</span></div>
      </div>
      <div class="tips">
        <p>🐱 Stay out of <strong>THE VET'S VISION CONE</strong></p>
        <p>🙈 Find <strong>HIDING SPOTS</strong> to vanish from sight</p>
        <p>🏆 Reach the goal for your <strong>REWARD</strong></p>
      </div>
      <button class="btn btn-back" id="btnHowToBack">◀ BACK</button>
    </div>
  </div>

  <div id="screen-charselect" class="screen">
    <div class="scanlines scanlines-light"></div>
    <div class="cs-header-badge"><span>SELECT YOUR HERO</span></div>

    <div class="collage-grid" id="collageGrid">
      <div class="quad quad-molly" data-char="molly">
        <div class="quad-bg"></div>
        <div class="quad-content">
          <div class="quad-index">01</div>
          <div class="avatar-frame frame-molly">
            <img src="assets/images/Molly.png" alt="Molly" class="avatar-img" id="avatarMolly" />
          </div>
          <div class="quad-info">
            <div class="char-name molly-text">MOLLY</div>
            <div class="char-type">🐶 DOG WARRIOR</div>
            <div class="char-map">📍 THE HOUSE</div>
          </div>
          <div class="quad-cta blink">— TAP TO SELECT —</div>
        </div>
      </div>

      <div class="quad quad-agata" data-char="agata">
        <div class="quad-bg"></div>
        <div class="quad-content">
          <div class="quad-index">02</div>
          <div class="avatar-frame frame-agata">
            <img src="assets/images/Agata.png" alt="Agata" class="avatar-img" id="avatarAgata" />
          </div>
          <div class="quad-info">
            <div class="char-name agata-text">AGATA</div>
            <div class="char-type">🐱 FOREST MAGE</div>
            <div class="char-map">📍 THE FOREST</div>
          </div>
          <div class="quad-cta blink">— TAP TO SELECT —</div>
        </div>
      </div>

      <div class="quad quad-martin" data-char="martin">
        <div class="quad-bg"></div>
        <div class="quad-content">
          <div class="quad-index">03</div>
          <div class="avatar-frame frame-martin">
            <img src="assets/images/Martin.png" alt="Martín" class="avatar-img" id="avatarMartin" />
          </div>
          <div class="quad-info">
            <div class="char-name martin-text">MARTÍN</div>
            <div class="char-type">🐱 DESERT KNIGHT</div>
            <div class="char-map">📍 THE DESERT</div>
          </div>
          <div class="quad-cta blink">— TAP TO SELECT —</div>
        </div>
      </div>

      <div class="quad quad-michi" data-char="michi">
        <div class="quad-bg"></div>
        <div class="quad-content">
          <div class="quad-index">04</div>
          <div class="avatar-frame frame-michi">
            <img src="assets/images/Michi.png" alt="Michi" class="avatar-img" id="avatarMichi" />
          </div>
          <div class="quad-info">
            <div class="char-name michi-text">MICHI</div>
            <div class="char-type">🐱 ROGUE ALCHEMIST</div>
            <div class="char-map">📍 THE BATHROOM</div>
          </div>
          <div class="quad-cta blink">— TAP TO SELECT —</div>
        </div>
      </div>
    </div>
    <button class="btn btn-back cs-back-btn" id="btnCSBack">◀ BACK</button>
  </div>

  <div id="screen-confirm" class="screen">
    <div class="scanlines"></div>
    <div class="confirm-panel">
      <div class="confirm-title yellow">READY FOR BATTLE?</div>
      <div class="confirm-display">
        <img src="" alt="" class="confirm-avatar" id="confirmAvatar" />
        <div class="confirm-details">
          <div class="confirm-name"  id="confirmName">—</div>
          <div class="confirm-level" id="confirmLevel">—</div>
          <div class="confirm-obj"   id="confirmObj">—</div>
        </div>
      </div>
      <div class="confirm-btns">
        <button class="btn btn-green" id="btnConfirmYes">▶ LET'S GO!</button>
        <button class="btn btn-back"  id="btnConfirmNo">◀ CHANGE</button>
      </div>
    </div>
  </div>

  <div id="screen-game" class="screen">
    <div id="gameCanvasWrap">
      <canvas id="gameCanvas"></canvas>
    </div>
    <div id="hud">
      <div class="hud-left"><span class="hud-charname" id="hudCharName">—</span></div>
      <div class="hud-center">
        <span class="hud-lbl">VET PROXIMITY</span>
        <div class="hud-prox-bg"><div class="hud-prox-fill" id="hudProxFill"></div></div>
      </div>
      <div class="hud-right"><span class="hud-status" id="hudStatus">EVADING...</span></div>
    </div>
    <button class="btn btn-back hud-pause" id="btnPause">⏸ PAUSE</button>
  </div>

  <script src="script.js"></script>
</body>
</html>
