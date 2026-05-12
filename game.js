const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const vehicles = [
  { id:'tiv1', name:'TIV-1', cost:0, maxMph:220, anchorBonus:1.2 },
  { id:'tuv2', name:'TUV-2', cost:15000, maxMph:260, anchorBonus:1.3 },
  { id:'dom1', name:'Dominator-1', cost:40000, maxMph:300, anchorBonus:1.5 },
  { id:'dom2', name:'Dominator-2', cost:85000, maxMph:360, anchorBonus:1.8 },
  { id:'dom3', name:'Dominator-3', cost:150000, maxMph:420, anchorBonus:2.0 },
  { id:'titus', name:'TITUS', cost:220000, maxMph:450, anchorBonus:2.2 }
];
let owned = new Set(['tiv1']);
let current = vehicles[0];

const state = {
  money: 5000, speed: 0, x: 200, y: 360, firstPerson: false, anchored: false,
  tornado: spawnTornado(), probes: [], particles: []
};
const keys = {};

function spawnTornado() {
  const size = Math.random() < 0.5 ? 'small' : 'huge';
  const base = size === 'small' ? 120 : 280;
  return {
    x: 800 + Math.random() * 350,
    y: 150 + Math.random() * 430,
    r: size === 'small' ? 40 : 85,
    mph: base + Math.random() * (size === 'small' ? 70 : 180),
    size,
    dir: Math.random() * Math.PI * 2
  };
}

function renderShop() {
  const box = document.getElementById('shop');
  box.innerHTML = '<strong>Магазин перехватчиков</strong>';
  vehicles.forEach(v => {
    const btn = document.createElement('button');
    const own = owned.has(v.id);
    btn.textContent = own ? `Выбрать ${v.name}` : `Купить ${v.name} — $${v.cost}`;
    btn.disabled = !own && state.money < v.cost;
    btn.onclick = () => {
      if (!own) { state.money -= v.cost; owned.add(v.id); }
      current = v;
      updateHud();
      renderShop();
    };
    box.appendChild(btn);
  });
}

function updateHud() {
  document.getElementById('money').textContent = Math.round(state.money);
  document.getElementById('vehicleName').textContent = current.name;
  document.getElementById('vehicleMph').textContent = Math.round(current.maxMph);
  document.getElementById('speed').textContent = Math.round(Math.abs(state.speed));
  document.getElementById('mode').textContent = state.anchored ? 'Якорь (шипы в земле)' : (state.firstPerson ? '1-е лицо' : 'Вождение');
  document.getElementById('torInfo').textContent = `${state.tornado.size === 'small' ? 'EF1-2' : 'EF4-5'} / ${Math.round(state.tornado.mph)} mph`;
}

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'j') state.anchored = !state.anchored;
  if (k === 'f') state.firstPerson = !state.firstPerson;
  if (k === 'e') dropProbe();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function dropProbe() {
  state.probes.push({ x: state.x, y: state.y, t: 0 });
}

function tick() {
  if (!state.anchored) {
    if (keys['d']) state.speed += 0.6;
    if (keys['a']) state.speed -= 0.6;
    state.speed *= 0.95;
    state.speed = Math.max(-current.maxMph / 12, Math.min(current.maxMph / 8, state.speed));
    state.x += state.speed;
    state.x = Math.max(40, Math.min(canvas.width - 40, state.x));
  } else {
    state.speed *= 0.7;
  }

  state.tornado.x += Math.cos(state.tornado.dir) * 0.7;
  state.tornado.y += Math.sin(state.tornado.dir) * 0.4;
  if (state.tornado.x < 120 || state.tornado.x > canvas.width - 120) state.tornado.dir = Math.PI - state.tornado.dir;
  if (state.tornado.y < 100 || state.tornado.y > canvas.height - 100) state.tornado.dir = -state.tornado.dir;

  emitParticles();
  scoreLogic();
  draw();
  updateHud();
  requestAnimationFrame(tick);
}

function scoreLogic() {
  state.probes.forEach(p => p.t++);
  state.probes = state.probes.filter(p => {
    if (p.t < 40) return true;
    const d = Math.hypot(p.x - state.tornado.x, p.y - state.tornado.y);
    if (d < state.tornado.r * 1.4) {
      const gain = (state.tornado.size === 'small' ? 2500 : 12000) * (1 + Math.random() * 0.4);
      state.money += gain;
    }
    return false;
  });

  const dist = Math.hypot(state.x - state.tornado.x, state.y - state.tornado.y);
  if (state.anchored && dist < state.tornado.r * 0.9 && current.maxMph > state.tornado.mph * 0.7) {
    state.money += 40 * current.anchorBonus;
  }

  if (Math.random() < 0.0015) state.tornado = spawnTornado();
}

function emitParticles() {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() * state.tornado.r;
    state.particles.push({
      x: state.tornado.x + Math.cos(a) * rr,
      y: state.tornado.y + Math.sin(a) * rr,
      vx: Math.cos(a + Math.PI/2) * (1 + Math.random()*2),
      vy: Math.sin(a + Math.PI/2) * (1 + Math.random()*2),
      life: 40 + Math.random()*40,
      type: Math.random() < 0.65 ? 'grass' : 'debris'
    });
  }
  state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
  state.particles = state.particles.filter(p => p.life > 0);
}

function drawCity() {
  for (let i = 0; i < 18; i++) {
    const x = i * 75;
    const h = 60 + (i % 5) * 30;
    ctx.fillStyle = '#3d4654';
    ctx.fillRect(x, 90, 56, h);
    ctx.fillStyle = '#2d353f';
    ctx.fillRect(x+8, 90+h, 40, 15);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#456b3d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCity();

  ctx.fillStyle = '#666'; ctx.fillRect(0, 330, canvas.width, 80);
  ctx.strokeStyle = '#ddd'; ctx.setLineDash([18,12]);
  ctx.beginPath(); ctx.moveTo(0, 370); ctx.lineTo(canvas.width, 370); ctx.stroke(); ctx.setLineDash([]);

  ctx.fillStyle = '#9dd3ff';
  ctx.beginPath(); ctx.moveTo(state.x - 30, state.y); ctx.lineTo(state.x + 30, state.y); ctx.lineTo(state.x + 20, state.y + 22); ctx.lineTo(state.x - 20, state.y + 22); ctx.closePath(); ctx.fill();

  if (state.anchored) {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(state.x - 18, state.y + 22); ctx.lineTo(state.x - 25, state.y + 40); ctx.moveTo(state.x + 18, state.y + 22); ctx.lineTo(state.x + 25, state.y + 40); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(180,180,180,0.28)';
  for (let r = state.tornado.r; r > 8; r -= 7) {
    ctx.beginPath();
    ctx.ellipse(state.tornado.x, state.tornado.y - (state.tornado.r-r)*1.1, r*0.7, r, 0, 0, Math.PI*2);
    ctx.fill();
  }

  for (const p of state.particles) {
    ctx.fillStyle = p.type === 'grass' ? '#5f8d4e' : '#8a8272';
    ctx.fillRect(p.x, p.y, 3, 3);
  }

  for (const pr of state.probes) {
    ctx.fillStyle = '#ffda57';
    ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, Math.PI*2); ctx.fill();
  }
}

renderShop();
updateHud();
tick();
