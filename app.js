/* ================= 人格深潜 · 应用逻辑 ================= */
(function () {
  'use strict';

  var Q = window.MBTI_QUESTIONS;
  var DIMS = window.MBTI_DIMS;
  var FUNCS = window.MBTI_FUNCS;
  var TYPES = window.MBTI_TYPES;
  var SCALE = window.MBTI_SCALE;

  var GROUP_META = {
    analyst: { name: '分析家', en: 'ANALYSTS', desc: '理性者的四种偏执 —— 他们要的不是答案，是把事情想透', order: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
    diplomat: { name: '外交家', en: 'DIPLOMATS', desc: '理想主义者的四种温柔 —— 他们先感受，再判断', order: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
    sentinel: { name: '守护者', en: 'SENTINELS', desc: '秩序者的四种坚持 —— 他们让世界不至于散架', order: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
    explorer: { name: '探险家', en: 'EXPLORERS', desc: '体验者的四种锋利 —— 他们先做，再想', order: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] }
  };

  var TYPE_ORDER = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
                    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
  var FUNC_AXES = ['Ni', 'Ne', 'Si', 'Se', 'Ti', 'Te', 'Fi', 'Fe'];

  var state = { answers: new Array(Q.length).fill(null), idx: 0, result: null, rAF: null };

  /* ---------- 工具 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pct(v) { return Math.round(v); }

  /* ---------- 星空 ---------- */
  function initStars() {
    var cv = $('#stars');
    if (!cv) return;
    var ctx = cv.getContext('2d'), stars = [], w, h, dpr = window.devicePixelRatio || 1;
    function resize() {
      w = cv.width = innerWidth * dpr;
      h = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
      stars = [];
      var n = Math.round(innerWidth * innerHeight / 14000);
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: (Math.random() * 1.15 + .25) * dpr,
          a: Math.random() * .55 + .1,
          s: Math.random() * .9 + .25,
          p: Math.random() * Math.PI * 2
        });
      }
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var t = performance.now() / 1000;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var alpha = st.a * (.55 + .45 * Math.sin(t * st.s + st.p));
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(210,224,255,' + alpha.toFixed(3) + ')';
        ctx.fill();
      }
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, w, h);
        for (var j = 0; j < stars.length; j++) {
          ctx.beginPath();
          ctx.arc(stars[j].x, stars[j].y, stars[j].r, 0, 6.2832);
          ctx.fillStyle = 'rgba(210,224,255,' + stars[j].a.toFixed(3) + ')';
          ctx.fill();
        }
      }
    }
    resize();
    addEventListener('resize', resize);
    draw();
  }

  /* ---------- 首页 16 型环 ---------- */
  function initOrbit() {
    var spin = $('#orbitSpin');
    if (!spin) return;
    var R = 43;
    TYPE_ORDER.forEach(function (code, i) {
      var ang = (i / 16) * Math.PI * 2 - Math.PI / 2;
      var el = document.createElement('a');
      el.className = 'orbit-item';
      el.href = '#type/' + code;
      el.style.left = (50 + Math.cos(ang) * R) + '%';
      el.style.top = (50 + Math.sin(ang) * R) + '%';
      el.title = TYPES[code].name;
      el.innerHTML = '<span>' + code + '</span>';
      spin.appendChild(el);
    });
  }

  /* ---------- 计算 ---------- */
  function compute() {
    var dims = {}, facets = {}, extreme = 0, answered = 0;

    Object.keys(DIMS).forEach(function (k) {
      var qs = Q.filter(function (q) { return q.dim === k; });
      var sum = 0;
      qs.forEach(function (q) { sum += (state.answers[q.i - 1] || 0) * q.d; });
      dims[k] = { sum: sum, pct: clamp(50 + sum / 24 * 50, 0, 100) };
      facets[k] = [0, 1, 2].map(function (fi) {
        var fs = qs.filter(function (q) { return q.f === fi; });
        var s2 = 0;
        fs.forEach(function (q) { s2 += (state.answers[q.i - 1] || 0) * q.d; });
        return { sum: s2, pct: clamp(50 + s2 / 8 * 50, 0, 100) };
      });
    });

    state.answers.forEach(function (v) {
      if (v !== null) {
        answered++;
        if (Math.abs(v) === 2) extreme++;
      }
    });

    var code = '';
    code += dims.EI.sum >= 0 ? 'E' : 'I';
    code += dims.SN.sum >= 0 ? 'N' : 'S';
    code += dims.TF.sum >= 0 ? 'F' : 'T';
    code += dims.JP.sum >= 0 ? 'J' : 'P';

    var t = TYPES[code];
    var certainty = answered ? Math.round(52 + (extreme / answered) * 44) : 0;

    // 八维功能得分
    var sc = {};
    var strength = {
      SN: Math.abs(dims.SN.pct - 50) / 50,
      TF: Math.abs(dims.TF.pct - 50) / 50,
      EI: Math.abs(dims.EI.pct - 50) / 50,
      JP: Math.abs(dims.JP.pct - 50) / 50
    };
    var base = [88, 70, 56, 40];
    t.stack.forEach(function (f, i) {
      var d = (f === 'Ni' || f === 'Ne' || f === 'Si' || f === 'Se') ? strength.SN
            : (f === 'Ti' || f === 'Te' || f === 'Fi' || f === 'Fe') ? strength.TF : .4;
      sc[f] = clamp(base[i] + (i === 0 ? d * 9 : i === 1 ? d * 7 : -d * 6), 22, 99);
    });
    var sbase = [24, 17, 11, 6];
    t.shadow.forEach(function (f, i) {
      sc[f] = clamp(sbase[i] + strength.JP * 5 + Math.random() * 2, 4, 40);
    });
    FUNC_AXES.forEach(function (f) { if (sc[f] == null) sc[f] = 10; });

    return { code: code, t: t, dims: dims, facets: facets, funcs: sc, certainty: certainty };
  }

  /* ---------- 雷达图 ---------- */
  function drawRadar(cv, sc) {
    if (!cv) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = cv.clientWidth || 320;
    cv.width = size * dpr;
    cv.height = size * dpr;
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    var cx = size / 2, cy = size / 2, R = size * 0.33;
    var n = FUNC_AXES.length;
    function pt(i, r) {
      var a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    }

    // 网格
    for (var ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var p = pt(i, R * ring / 4);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.closePath();
      ctx.strokeStyle = ring === 4 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 轴线
    for (var k = 0; k < n; k++) {
      var e = pt(k, R);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(e[0], e[1]);
      ctx.strokeStyle = 'rgba(255,255,255,.055)';
      ctx.stroke();
    }

    // 数据多边形
    var vals = FUNC_AXES.map(function (f) { return clamp(sc[f], 0, 100) / 100; });
    var grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    grad.addColorStop(0, 'rgba(111,168,255,.55)');
    grad.addColorStop(.55, 'rgba(169,140,255,.5)');
    grad.addColorStop(1, 'rgba(211,178,132,.45)');
    ctx.beginPath();
    for (var j = 0; j < n; j++) {
      var q = pt(j, R * 1.02 * Math.max(vals[j], .06));
      j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,178,255,.95)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 顶点
    for (var m = 0; m < n; m++) {
      var v = pt(m, R * 1.02 * Math.max(vals[m], .06));
      ctx.beginPath();
      ctx.arc(v[0], v[1], 2.6, 0, 6.2832);
      ctx.fillStyle = '#e6d8ff';
      ctx.fill();
    }

    // 标签
    ctx.font = '500 ' + (size * 0.042) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var x = 0; x < n; x++) {
      var lp = pt(x, R * 1.22);
      ctx.fillStyle = vals[x] > .6 ? 'rgba(240,215,174,.95)' : 'rgba(150,160,180,.8)';
      ctx.fillText(FUNC_AXES[x], lp[0], lp[1]);
    }
  }

  /* ---------- 视图切换 ---------- */
  function show(name) {
    ['home', 'test', 'calc', 'result', 'lib', 'detail'].forEach(function (v) {
      var el = $('#view-' + v);
      if (el) el.classList.toggle('hidden', v !== name);
    });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  /* ---------- 测试 ---------- */
  function renderQuestion() {
    var q = Q[state.idx];
    var d = DIMS[q.dim];
    $('#qnum').textContent = String(state.idx + 1).padStart(2, '0');
    $('#phaseName').textContent = d.title;
    $('#qdim').textContent = 'DIMENSION ' + (Object.keys(DIMS).indexOf(q.dim) + 1) + ' — ' + d.title;
    $('#progbar').style.width = ((state.idx) / Q.length * 100) + '%';
    var qt = $('#qtext');
    qt.style.opacity = 0;
    qt.textContent = q.t;
    requestAnimationFrame(function () { qt.style.transition = 'opacity .35s'; qt.style.opacity = 1; });

    var sc = $('#scale');
    sc.innerHTML = '';
    SCALE.forEach(function (s, i) {
      var b = document.createElement('button');
      b.className = 'scale-btn' + (state.answers[state.idx] === s.v ? ' on' : '');
      b.innerHTML = '<div class="pips"><i></i><i></i><i></i><i></i><i></i></div><span>' + s.t + '</span>';
      b.addEventListener('click', function () { answer(s.v); });
      sc.appendChild(b);
    });
  }

  function answer(v) {
    state.answers[state.idx] = v;
    var btns = $$('#scale .scale-btn');
    var order = [-2, -1, 0, 1, 2];
    btns.forEach(function (b, i) { b.classList.toggle('on', order[i] === v); });
    setTimeout(function () {
      if (state.idx < Q.length - 1) {
        state.idx++;
        renderQuestion();
      } else {
        finish();
      }
    }, 190);
  }

  function finish() {
    var missing = state.answers.filter(function (a) { return a === null; }).length;
    if (missing > 0) {
      for (var i = 0; i < state.answers.length; i++) {
        if (state.answers[i] === null) { state.idx = i; break; }
      }
      show('test'); renderQuestion();
      return;
    }
    show('calc');
    var steps = ['读取维度权重…', '校准八维功能序位…', '匹配 16 型原型…', '生成深度档案…'];
    var el = $('#calcstep');
    steps.forEach(function (s, i) {
      setTimeout(function () { el.textContent = s; }, 320 + i * 420);
    });
    setTimeout(function () {
      state.result = compute();
      try { localStorage.setItem('mbti_last', JSON.stringify(state.result.code)); } catch (e) {}
      renderResult(state.result);
      show('result');
    }, 2200);
  }

  /* ---------- 结果页 ---------- */
  function dimBlock(dims) {
    var order = ['EI', 'SN', 'TF', 'JP'];
    return order.map(function (k) {
      var d = DIMS[k], v = dims[k];
      var aPct = pct(v.pct), left = d.a, right = d.b;
      var main = aPct >= 50 ? d.a : d.b;
      var strong = Math.abs(aPct - 50);
      var eW = Math.round(aPct), iW = 100 - eW;
      var tier = strong > 32 ? '这一维你偏得很明确，几乎没有回旋余地。'
               : strong > 18 ? '这一维倾向清楚，但必要时你能切到另一边。'
               : strong > 8 ? '这一维只是轻微偏好，两边你都用得上。'
               : '这一维几乎落在正中，你随时在两种模式之间切换。';
      return '<div class="dimrow">' +
        '<div class="dimhead"><b>' + d.title + '</b><span class="pct">' + main + ' ' + pct(Math.max(aPct, 100 - aPct)) + '%</span></div>' +
        '<div class="dimbar">' +
          '<i class="l' + (aPct >= 50 ? '' : ' weak') + '" style="width:' + eW + '%"></i>' +
          '<i class="r' + (aPct < 50 ? '' : ' weak') + '" style="width:' + iW + '%"></i>' +
        '</div>' +
        '<div class="dimlabel"><span>' + d.an + ' ' + d.a + '</span><span>' + d.bn + ' ' + d.b + '</span></div>' +
        '<div class="dimnote">' + d.note + '。' + tier + '</div>' +
        '</div>';
    }).join('');
  }

  function facetsBlock(facets) {
    return Object.keys(DIMS).map(function (k) {
      var d = DIMS[k];
      var rows = d.facets.map(function (f, i) {
        var v = pct(facets[k][i].pct);
        var nm = v >= 50 ? f.a : f.b;
        var val = v >= 50 ? v : 100 - v;
        return '<div class="fitem">' +
          '<div class="fline"><span>' + nm + '</span><span>' + val + '%</span></div>' +
          '<div class="fbar"><i style="width:' + val + '%"></i></div>' +
          '<div class="fhint">' + f.hint + '</div>' +
          '</div>';
      }).join('');
      return '<div class="fgroup"><h4>' + d.title + ' · ' + d.an + ' / ' + d.bn + '</h4>' + rows + '</div>';
    }).join('');
  }

  function stackBlock(t) {
    var items = t.stack.map(function (f, i) {
      var cls = i === 0 ? 'lead' : i === 1 ? 'aux' : '';
      var pos = ['主导', '辅助', '第三', '劣势'][i];
      return '<div class="stack-item ' + cls + '"><div class="pos">' + pos + '</div><div class="fn">' + f + '</div><div class="nm">' + FUNCS[f].n + '</div></div>';
    }).join('');
    var sh = t.shadow.map(function (f, i) {
      var pos = ['对立', '批判', '欺骗', '恶魔'][i];
      return '<span class="chip">' + pos + ' · ' + f + '</span>';
    }).join('');
    return '<div class="stack">' + items + '</div>' +
      '<div class="shadowline"><div class="lbl">阴影功能 —— 压力下会接管你的四个位置</div><div class="shadowrow">' + sh + '</div></div>';
  }

  function profileBlocks(t) {
    return '' +
    '<div class="section"><div class="card"><div class="card-title"><h3>核心驱力</h3><em>Drive</em></div>' +
      '<div class="df">' +
        '<div class="box"><div class="k">CORE DESIRE · 核心欲望</div><div class="v">' + esc(t.desire) + '</div></div>' +
        '<div class="box"><div class="k">CORE FEAR · 核心恐惧</div><div class="v">' + esc(t.fear) + '</div></div>' +
      '</div></div></div>' +

    '<div class="grid g2 section">' +
      '<div class="card"><div class="card-title"><h3>天赋</h3><em>Gifts</em></div><ul class="ulist">' +
        t.gifts.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="card"><div class="card-title"><h3>盲点</h3><em>Blind Spots</em></div><ul class="ulist bad">' +
        t.blind.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div>' +
    '</div>' +

    '<div class="section"><div class="card"><div class="card-title"><h3>压力下的你</h3><em>Under Stress</em></div>' +
      '<p class="prose">' + esc(t.stress) + '</p></div></div>' +

    '<div class="section"><div class="card"><div class="card-title"><h3>成长路径</h3><em>Growth Path</em></div>' +
      '<ul class="ulist">' + t.grow.map(function (g, i) {
        return '<li><b style="color:var(--gold);font-family:var(--serif);margin-right:2px">0' + (i + 1) + '</b>' + esc(g) + '</li>';
      }).join('') + '</ul></div></div>' +

    '<div class="section"><div class="card"><div class="card-title"><h3>生活切片</h3><em>In Life</em></div>' +
      '<div class="info3">' +
        '<div class="box"><div class="k">CAREER · 职业倾向</div><div class="v">' + t.jobs.join(' · ') + '</div></div>' +
        '<div class="box"><div class="k">LOVE · 亲密关系</div><div class="v">' + esc(t.love) + '</div></div>' +
        '<div class="box"><div class="k">FRIENDSHIP · 友情</div><div class="v">' + esc(t.friend) + '</div></div>' +
      '</div></div></div>' +

    '<div class="grid g2 section">' +
      '<div class="card"><div class="card-title"><h3>最佳搭档</h3><em>Chemistry</em></div>' +
        '<div class="matchrow">' + t.match.map(function (m) {
          return '<a class="mchip" href="#type/' + m + '">' + m + ' · ' + TYPES[m].name + '</a>';
        }).join('') + '</div>' +
        '<p class="prose" style="font-size:12.5px;margin-top:16px;color:var(--dim2)">功能互补，能在你缺的地方自然地补上，且不需要你开口求助。</p></div>' +
      '<div class="card"><div class="card-title"><h3>摩擦区</h3><em>Friction</em></div>' +
        '<div class="matchrow">' + t.clash.map(function (m) {
          return '<a class="mchip bad" href="#type/' + m + '">' + m + ' · ' + TYPES[m].name + '</a>';
        }).join('') + '</div>' +
        '<p class="prose" style="font-size:12.5px;margin-top:16px;color:var(--dim2)">不是不能相处，是彼此默认的规则相反——需要有人先解释一遍。</p></div>' +
    '</div>' +

    '<div class="section"><div class="card"><div class="card-title"><h3>深层解读</h3><em>Reading</em></div>' +
      '<div class="prose">' + t.deep.split('\n').filter(Boolean).map(function (p) {
        return '<p>' + esc(p.trim()) + '</p>';
      }).join('') + '</div></div></div>';
  }

  function renderResult(r) {
    var t = r.t;
    var gname = GROUP_META[t.g].name;
    var html = '' +
      '<div class="result">' +
      '<div class="r-hero">' +
        '<div class="r-left">' +
          '<div class="r-kicker">YOUR TYPE · 你的类型</div>' +
          '<div class="r-code">' + r.code + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="r-nick">' + esc(t.nick) + '</div>' +
          '<h1 class="r-name">' + esc(t.name) + '</h1>' +
          '<div class="r-tags">' +
            '<span class="tag hot">' + gname + '</span>' +
            '<span class="tag">人群占比 ' + t.rare + '%</span>' +
            '<span class="tag">主导功能 ' + t.stack[0] + '</span>' +
            '<span class="tag">作答确定性 ' + r.certainty + '%</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="section"><div class="card"><div class="card-title"><h3>四维倾向</h3><em>Dimensions</em></div>' +
        dimBlock(r.dims) + '</div></div>' +

      '<div class="grid g2 g2-wide section">' +
        '<div class="card"><div class="card-title"><h3>认知功能图谱</h3><em>Cognitive Functions</em></div>' +
          '<div class="radar-wrap">' +
            '<canvas id="radar"></canvas>' +
            '<div class="radle-list" style="margin-top:14px">' +
              FUNC_AXES.map(function (f) {
                return '<div class="radle"><span class="k">' + f + '</span><div class="b"><i style="width:' + Math.round(r.funcs[f]) + '%"></i></div><span class="v">' + Math.round(r.funcs[f]) + '</span></div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card stackcard"><div class="card-title"><h3>功能序位</h3><em>Function Stack</em></div>' +
          stackBlock(t) +
          '<p class="prose" style="font-size:12.5px;margin-top:auto;padding-top:22px;color:var(--dim2)">' +
          '主导功能是你的默认操作系统，劣势功能是你一生要补的课，阴影功能在压力下会突然接管你。</p>' +
        '</div>' +
      '</div>' +

      '<div class="section"><div class="card"><div class="card-title"><h3>亚维度剖面</h3><em>12 Facets</em></div>' +
        '<div class="facets">' + facetsBlock(r.facets) + '</div></div></div>' +

      profileBlocks(t) +

      '<div class="ractions">' +
        '<button class="btn btn-primary" id="btnAgain">再测一次</button>' +
        '<a class="btn btn-ghost" href="#type/' + r.code + '">查看完整档案</a>' +
        '<button class="btn btn-ghost" id="btnShare">生成分享卡</button>' +
      '</div>' +
      '<div class="footer"><span>人格深潜 · PERSONALITY DEPTH</span><span>结果来自你的 48 项自我报告，是一面镜子，不是判决书</span></div>' +
      '</div>';

    var body = $('#resultBody');
    body.innerHTML = html;

    requestAnimationFrame(function () {
      var cv = $('#radar');
      if (cv) drawRadar(cv, r.funcs);
      $$('#resultBody .dimbar i').forEach(function (el) {
        var w = el.style.width;
        el.style.width = '0';
        requestAnimationFrame(function () { el.style.width = w; });
      });
    });

    $('#btnAgain').addEventListener('click', function () {
      state.answers = new Array(Q.length).fill(null);
      state.idx = 0;
      state.result = null;
      renderQuestion();
      show('test');
    });
    $('#btnShare').addEventListener('click', function () { openShare(r); });

    addEventListener('resize', function () {
      var cv = $('#radar');
      if (cv && state.result) drawRadar(cv, state.result.funcs);
    });
  }

  /* ---------- 资料库 ---------- */
  function renderLib() {
    var html = Object.keys(GROUP_META).map(function (g) {
      var meta = GROUP_META[g];
      return '<div class="group"><h2>' + meta.name + ' <span style="font-size:11px;letter-spacing:.24em;color:var(--dim2);margin-left:8px">' + meta.en + '</span></h2>' +
        '<div class="gdesc">' + meta.desc + '</div>' +
        '<div class="tgrid">' + meta.order.map(function (code) {
          var t = TYPES[code];
          return '<a class="tcard" href="#type/' + code + '">' +
            '<div class="tc-rare">' + t.rare + '%</div>' +
            '<div class="tc-code">' + code + '</div>' +
            '<div class="tc-name">' + t.name + '</div>' +
            '<div class="tc-nick">' + t.nick + '</div></a>';
        }).join('') + '</div></div>';
    }).join('');
    $('#libGroups').innerHTML = html;
  }

  /* ---------- 详情 ---------- */
  function renderDetail(code) {
    var t = TYPES[code];
    if (!t) { location.hash = '#lib'; return; }
    var html = '' +
      '<div class="detail-head"><a class="back" href="#lib">← 返回 16 型档案</a></div>' +
      '<div class="detail-hero">' +
        '<div class="detail-code">' + code + '</div>' +
        '<div class="detail-info">' +
          '<div class="detail-name">' + t.name + '</div>' +
          '<div class="detail-nick">' + t.nick + '</div>' +
          '<div class="r-tags">' +
            '<span class="tag hot">' + GROUP_META[t.g].name + '</span>' +
            '<span class="tag">人群占比 ' + t.rare + '%</span>' +
            '<span class="tag">主导功能 ' + t.stack[0] + '</span>' +
            '<span class="tag">劣势功能 ' + t.stack[3] + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="section"><div class="card"><div class="card-title"><h3>功能序位</h3><em>Function Stack</em></div>' +
        stackBlock(t) + '</div></div>' +
      profileBlocks(t) +
      '<div class="section"><div class="card"><div class="card-title"><h3>知名同类</h3><em>Kindred</em></div>' +
        '<div class="matchrow">' + t.famous.map(function (f) { return '<span class="chip neutral">' + f + '</span>'; }).join('') + '</div>' +
      '</div></div>' +
      '<div class="ractions"><a class="btn btn-primary" href="#test">测测我是不是这一型 →</a></div>';
    $('#detailBody').innerHTML = html;
  }

  /* ---------- 分享卡 ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function openShare(r) {
    var cv = $('#shareCanvas'), ctx = cv.getContext('2d');
    var W = 1080, H = 1440;
    var t = r.t;

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#050810');
    bg.addColorStop(.5, '#0a1020');
    bg.addColorStop(1, '#04060c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var g1 = ctx.createRadialGradient(W * .18, H * .12, 0, W * .18, H * .12, W * .75);
    g1.addColorStop(0, 'rgba(111,168,255,.22)');
    g1.addColorStop(1, 'rgba(111,168,255,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    var g2 = ctx.createRadialGradient(W * .85, H * .3, 0, W * .85, H * .3, W * .7);
    g2.addColorStop(0, 'rgba(169,140,255,.18)');
    g2.addColorStop(1, 'rgba(169,140,255,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // 边框
    ctx.strokeStyle = 'rgba(211,178,132,.28)';
    ctx.lineWidth = 2;
    roundRect(ctx, 40, 40, W - 80, H - 80, 26);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(211,178,132,.85)';
    ctx.font = '500 26px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('人格深潜 · PERSONALITY DEPTH', 92, 132);

    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = '400 22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('JUNGIAN DEPTH ASSESSMENT', 92, 176);

    // 类型
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 168px "Songti SC","SimSun",serif';
    ctx.fillText(r.code, 88, 400);

    ctx.fillStyle = '#d3b284';
    ctx.font = '500 46px "Songti SC","SimSun",serif';
    ctx.fillText(t.nick, 92, 468);

    ctx.fillStyle = 'rgba(210,220,240,.9)';
    ctx.font = '400 34px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(t.name + ' · 人群占比 ' + t.rare + '%', 92, 528);

    // 四维
    var order = ['EI', 'SN', 'TF', 'JP'];
    var y = 620;
    order.forEach(function (k) {
      var d = DIMS[k], v = r.dims[k].pct;
      var main = v >= 50 ? d.a : d.b;
      var val = Math.round(v >= 50 ? v : 100 - v);
      ctx.fillStyle = 'rgba(200,210,230,.72)';
      ctx.font = '400 28px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(d.title, 92, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f0d7ae';
      ctx.font = '500 30px "Songti SC",serif';
      ctx.fillText(main + ' ' + val + '%', W - 92, y);
      ctx.textAlign = 'left';

      ctx.fillStyle = 'rgba(255,255,255,.08)';
      roundRect(ctx, 92, y + 18, W - 184, 8, 4);
      ctx.fill();
      var lw = (W - 184) * (val / 100);
      var lg = ctx.createLinearGradient(92, 0, 92 + lw, 0);
      lg.addColorStop(0, 'rgba(111,168,255,.9)');
      lg.addColorStop(1, 'rgba(211,178,132,.95)');
      ctx.fillStyle = lg;
      roundRect(ctx, 92, y + 18, Math.max(lw, 8), 8, 4);
      ctx.fill();
      y += 104;
    });

    // 功能栈
    y += 10;
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.font = '400 22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('认知功能栈', 92, y);
    y += 52;
    t.stack.forEach(function (f, i) {
      var x = 92 + i * 232;
      ctx.fillStyle = 'rgba(255,255,255,.045)';
      roundRect(ctx, x, y, 208, 128, 14);
      ctx.fill();
      ctx.strokeStyle = i === 0 ? 'rgba(211,178,132,.5)' : 'rgba(255,255,255,.1)';
      ctx.lineWidth = i === 0 ? 2 : 1;
      roundRect(ctx, x, y, 208, 128, 14);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = '400 20px "PingFang SC",sans-serif';
      ctx.fillText(['主导', '辅助', '第三', '劣势'][i], x + 22, y + 40);
      ctx.fillStyle = i === 0 ? '#f0d7ae' : '#e6ecfa';
      ctx.font = '600 46px "Songti SC",serif';
      ctx.fillText(f, x + 22, y + 92);
      ctx.fillStyle = 'rgba(180,190,210,.6)';
      ctx.font = '400 18px "PingFang SC",sans-serif';
      ctx.fillText(FUNCS[f].n, x + 22, y + 118);
    });

    // 核心欲望
    y += 190;
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.font = '400 22px "PingFang SC",sans-serif';
    ctx.fillText('核心欲望', 92, y);
    ctx.fillStyle = 'rgba(230,238,252,.95)';
    ctx.font = '500 34px "Songti SC",serif';
    wrapText(ctx, t.desire, 92, y + 52, W - 184, 48, 2);

    // 底部
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.font = '400 24px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('48 题 · 8 项认知功能 · 12 个亚维度', W / 2, H - 118);
    ctx.fillStyle = 'rgba(211,178,132,.6)';
    ctx.font = '400 22px "PingFang SC",sans-serif';
    ctx.fillText('扫码或搜索「人格深潜」开始你的测评', W / 2, H - 76);
    ctx.textAlign = 'left';

    $('#canvasModal').classList.remove('hidden');
  }

  function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
    var line = '', lines = [];
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = text[i];
        if (maxLines && lines.length >= maxLines) break;
      } else {
        line = test;
      }
    }
    if (line && (!maxLines || lines.length < maxLines)) lines.push(line);
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lineH); });
  }

  /* ---------- 演示模式（用于生成展示图） ---------- */
  function buildDemo(code) {
    var pos = { EI: 'E', SN: 'N', TF: 'F', JP: 'J' };
    var idx = { EI: 0, SN: 1, TF: 2, JP: 3 };
    return Q.map(function (q) {
      var same = code.charAt(idx[q.dim]) === pos[q.dim];
      var h = (q.i * 61 + idx[q.dim] * 37 + q.f * 23 + 11) % 100;
      var mag = h < 20 ? 0 : h < 75 ? 1 : 2;
      return (same ? 1 : -1) * q.d * mag;
    });
  }

  /* ---------- 路由 ---------- */
  function route() {
    var h = location.hash.replace('#', '') || 'home';
    var dm = (location.search || '').match(/demo=([EI][NS][FT][JP])/i);
    if (dm && TYPES[dm[1].toUpperCase()]) {
      state.answers = buildDemo(dm[1].toUpperCase());
      state.result = compute();
      renderResult(state.result);
      show('result');
      return;
    }
    if (h.indexOf('type/') === 0) {
      renderDetail(h.slice(5).toUpperCase());
      show('detail');
    } else if (h === 'lib') {
      show('lib');
    } else if (h === 'test') {
      if (!state.result) { renderQuestion(); show('test'); }
      else show('test');
    } else {
      show('home');
    }
  }

  /* ---------- 启动 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initStars();
    initOrbit();
    renderLib();

    $('#startBtn').addEventListener('click', function () {
      state.answers = new Array(Q.length).fill(null);
      state.idx = 0;
      renderQuestion();
      location.hash = '#test';
      show('test');
    });

    $('#btnPrev').addEventListener('click', function () {
      if (state.idx > 0) { state.idx--; renderQuestion(); }
    });

    $('#navMethod').addEventListener('click', function (e) {
      e.preventDefault();
      location.hash = '#home';
      show('home');
      setTimeout(function () {
        var el = $('#method');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    });

    $('#btnCloseCanvas').addEventListener('click', function () {
      $('#canvasModal').classList.add('hidden');
    });
    $('#btnDownload').addEventListener('click', function () {
      var cv = $('#shareCanvas');
      var a = document.createElement('a');
      a.download = '人格深潜-' + (state.result ? state.result.code : 'result') + '.png';
      a.href = cv.toDataURL('image/png');
      a.click();
    });

    document.addEventListener('keydown', function (e) {
      if ($('#view-test').classList.contains('hidden')) return;
      if (e.key >= '1' && e.key <= '5') {
        var v = [-2, -1, 0, 1, 2][+e.key - 1];
        answer(v);
      } else if (e.key === 'ArrowLeft') {
        if (state.idx > 0) { state.idx--; renderQuestion(); }
      }
    });

    addEventListener('hashchange', route);
    route();

    /* 自检：?measure=1 输出布局宽度 */
    /* 自检：?measure=1 输出布局宽度；?forcew=390 把根宽度压到 390 模拟窄屏 */
    var fw = /[?&]forcew=(\d+)/.exec(location.search);
    if (fw) {
      document.documentElement.style.width = fw[1] + 'px';
      document.documentElement.style.overflowX = 'hidden';
      document.body.style.width = fw[1] + 'px';
    }
    if (/[?&]measure/.test(location.search)) {
      setTimeout(function () {
        var d = document.documentElement;
        var o = document.querySelector('.orbit');
        var w = document.querySelector('.wrap');
        var s = document.querySelector('#scale');
        document.title = 'MEASURE|vw=' + d.clientWidth + '|sw=' + d.scrollWidth +
          '|wrap=' + (w ? Math.round(w.getBoundingClientRect().width) : 0) +
          '|orbit=' + (o ? Math.round(o.getBoundingClientRect().width) : 0) +
          '|scale=' + (s ? Math.round(s.getBoundingClientRect().width) : 0);
      }, 700);
    }

    /* 自检：?selftest=1 自动答完 48 题，验证「答题 → 计分 → 渲染」全链路 */
    if (/[?&]selftest/.test(location.search)) {
      location.hash = '#test';
      show('test'); renderQuestion();
      setTimeout(function () {
        var n = 0;
        function step() {
          if (n >= Q.length) {
            setTimeout(function () {
              var cards = document.querySelectorAll('#resultBody .card').length;
              var bars = document.querySelectorAll('#resultBody .fbar').length;
              var dims = document.querySelectorAll('#resultBody .dimrow').length;
              document.title = 'SELFTEST|code=' + (state.result ? state.result.code : 'NULL') +
                '|sent=' + n +
                '|cards=' + cards + '|facets=' + bars + '|dims=' + dims +
                '|radar=' + (document.querySelector('#radar') ? '1' : '0');
            }, 4000);
            return;
          }
          var btns = document.querySelectorAll('#scale .scale-btn');
          if (!btns.length) { setTimeout(step, 120); return; }
          btns[4].click(); n++;
          setTimeout(step, 240);
        }
        step();
      }, 400);
    }
  });
})();
