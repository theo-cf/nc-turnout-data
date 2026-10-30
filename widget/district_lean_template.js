/* NC District Lean - self-activating embed for carolinaforward.org
   Shows, for every NC House, NC Senate and congressional district, how the early and mail vote so far compares with the
   district's district lean (COS-No-Gov), with its registration, and with the same point in 2022.
   Usage: add a fenced code block with language "nc-district-lean" in the post body (CMS "+" menu -> Code Block):
     ```nc-district-lean
     ```
   Data (public, updated daily by theo-cf/nc-turnout-data): data.json (votes so far), lean.json (district lean,
   candidates, 2022 on today's lines), district_map.json (district outlines). */
(function () {
  var SLUG = 'nc-district-lean';
  var BASE = (window.NC_LEAN_BASE || 'https://theo-cf.github.io/nc-turnout-data/');
  var CF_URL = 'carolinaforward.org', PAGE_URL = '';   // PAGE_URL: the widget's own page, once it's live
  var CF_LOGO = '__CF_LOGO__';

  var mount = document.querySelector('.' + SLUG);
  if (!mount) {
    var codeEl = document.querySelector('code.language-' + SLUG);
    var target = codeEl ? (codeEl.closest ? codeEl.closest('pre') : codeEl.parentNode) || codeEl : null;
    if (!target) {
      var blocks = document.querySelectorAll('pre, code');
      for (var i = 0; i < blocks.length; i++) {
        if ((blocks[i].textContent || '').replace(/\s+/g, '') === SLUG) { target = blocks[i].closest && blocks[i].closest('pre') ? blocks[i].closest('pre') : blocks[i]; break; }
      }
    }
    if (!target) return;
    mount = document.createElement('div');
    target.parentNode.replaceChild(mount, target);
  }
  mount.classList.add(SLUG);

  if (!document.getElementById(SLUG + '-fonts')) {
    var link = document.createElement('link'); link.id = SLUG + '-fonts'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }
  var S = '.' + SLUG;
  if (!document.getElementById(SLUG + '-style')) {
    var st = document.createElement('style'); st.id = SLUG + '-style';
    st.textContent = [
      S + '{--navy:#253551;--parch:#E8E0D0;--parch-l:#F4EFE5;--ink:#1a1a1a;--soft:#3a3a3a;--mute:#6b6b6b;--rule:#d8d2c4;--d:#2E6DB4;--r:#B83A32;--mid:#F2F0EB;--off:#E4E1DA;' +
        'font:15px/1.5 Inter,-apple-system,BlinkMacSystemFont,sans-serif;color:var(--ink);background:#fff;margin:24px 0;display:grid;gap:14px}',
      S + ' *{box-sizing:border-box}',
      S + ' button{font-family:inherit}',
      S + ' .dl-crow{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}',
      S + ' .dl-lab{font:700 11px Inter,sans-serif;letter-spacing:1px;text-transform:uppercase;color:var(--mute);min-width:92px}',
      S + ' .dl-seg{display:inline-flex;flex-wrap:wrap;gap:4px}',
      S + ' .dl-seg button{border:1px solid var(--navy);background:#fff;color:var(--navy);border-radius:2px;padding:7px 11px;font:600 12px Inter,sans-serif;letter-spacing:.6px;text-transform:uppercase;cursor:pointer;min-height:34px}',
      S + ' .dl-seg button[aria-pressed="true"]{background:var(--navy);color:#fff}',
      S + ' .dl-seg button:disabled{opacity:.4;cursor:not-allowed}',
      S + ' .dl-hx{pointer-events:none}' + S + ' .dl-leg .chip i.hx,' + S + ' .dl-hxs{background:repeating-linear-gradient(135deg,rgba(37,53,81,.55) 0 1.5px,#fff 1.5px 4px)!important}',
      S + ' .dl-hxs{display:inline-block;width:12px;height:12px;border:1px solid var(--rule);border-radius:1px;vertical-align:-2px;margin-right:5px}' + S + ' .dl-flip{font-size:12.5px;line-height:1.4;background:var(--parch-l);padding:7px 9px;margin:8px 0 0;border-radius:2px}' + S + ' .dl-ch{font:700 10px Inter,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--mute);margin:12px 0 2px}' + S + ' .dl-kv .dl-sub{display:block;font-size:11.5px;color:var(--mute);font-weight:400}',
      S + ' .dl-off{font:400 12px/1.4 Inter,sans-serif;color:#6b6b6b}',
      S + ' button:focus-visible,' + S + ' path:focus-visible,' + S + ' tr:focus-visible{outline:2px solid #2D7DB8;outline-offset:1px}',
      S + ' .dl-q{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-left:6px;border-radius:50%;border:1px solid var(--navy);background:#fff;color:var(--navy);font:700 11px/1 Inter,sans-serif;cursor:pointer;vertical-align:middle;padding:0;min-height:0;letter-spacing:0;text-transform:none}',
      S + ' .dl-qpop,.dl-qpop{position:absolute;z-index:30;max-width:300px;background:#fff;border:1px solid #d8d2c4;border-radius:2px;padding:10px 12px;font:400 13px/1.45 Inter,sans-serif;color:#1a1a1a;box-shadow:0 6px 20px rgba(0,0,0,.15)}',
      S + ' .dl-layer{display:grid;gap:4px}',
      S + ' .dl-lname{font:700 22px/1.2 "Zilla Slab",Georgia,serif;color:var(--navy);margin:0}',
      S + ' .dl-ldef{font-size:14px;color:var(--soft);margin:0;max-width:72ch}',
      S + ' .dl-mapw{position:relative;border:1px solid var(--rule);border-radius:3px;overflow:visible;background:#fff;touch-action:pan-y}',
      S + ' .dl-mapw.pan{cursor:grab;touch-action:none}',
      S + ' .dl-mapw svg{display:block;width:100%;height:auto}',
      S + ' path.dl-dist{stroke:rgba(37,53,81,.6);stroke-width:.8px;vector-effect:non-scaling-stroke;cursor:pointer}',
      S + ' path.dl-dist.on{stroke:#111;stroke-width:2.4px}',
      S + ' path.dl-cl{fill:none;stroke:#8a8a8a;stroke-width:.4px;opacity:.4;pointer-events:none;vector-effect:non-scaling-stroke}',
      S + ' .dl-zc{position:absolute;left:8px;top:8px;display:flex;gap:4px;z-index:3}',
      S + ' .dl-zc button{min-width:34px;height:34px;padding:0 9px;border:1px solid var(--navy);background:#fff;color:var(--navy);font:700 18px/1 Inter,sans-serif;border-radius:2px;cursor:pointer}',
      S + ' .dl-zc .t{font-size:12px}',
      S + ' .dl-mark{position:absolute;left:8px;bottom:8px;display:flex;align-items:center;gap:7px;padding:4px 8px 4px 4px;background:rgba(255,255,255,.88);border-radius:2px;text-decoration:none;color:var(--navy);z-index:3}',
      S + ' .dl-mark img{width:26px;height:26px;border-radius:2px;display:block}',
      S + ' .dl-mark b{display:block;font:700 13px/1.1 "Zilla Slab",Georgia,serif}',
      S + ' .dl-mark span{display:block;font:500 10px/1.2 Inter,sans-serif;color:var(--mute)}',
      S + ' .dl-leg{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--soft)}',
      S + ' .dl-leg .ramp{height:10px;flex:1 1 160px;min-width:100px;border-radius:1px}',
      S + ' .dl-leg .chip{display:inline-flex;align-items:center;gap:5px}',
      S + ' .dl-leg .chip i{width:12px;height:12px;border-radius:1px;background:var(--off);display:inline-block;border:1px solid var(--rule)}',
      S + ' .dl-hint{font-size:12px;color:var(--mute);margin:0}',
      S + '{grid-template-columns:minmax(0,1fr)}',   // keeps the column at the page's width when the table breaks out of it
      '@media (min-width:1000px){' + S + ' .dl-wide{position:relative;left:50%;transform:translateX(-50%);width:min(92vw,1180px);max-width:none}}',   // the table breaks out of the article column on wide screens, like the site\'s wide embeds
      S + ' .dl-dls{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px}',
      S + ' .dl-dll{font:700 11px Inter,sans-serif;letter-spacing:1px;text-transform:uppercase;color:var(--mute)}',
      S + ' .dl-dlg{display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
      S + ' .dl-dlk{font-size:12px;color:var(--soft);font-weight:600;margin-right:2px}',
      S + ' .dl-dlb{border:1px solid var(--navy);background:var(--navy);color:#fff;border-radius:2px;padding:6px 11px;font:600 12px Inter,sans-serif;cursor:pointer;min-height:34px}',
      S + ' .dl-dlb small{font-weight:400;opacity:.8;margin-left:4px}',
      S + ' .dl-dlb:hover{background:#1a2740}',
      '@media (max-width:600px){' + S + ' .dl-dls{flex-direction:column;align-items:stretch}' + S + ' .dl-dlg{display:grid;grid-template-columns:1fr 1fr}' + S + ' .dl-dlk{grid-column:1/-1}}',
      S + ' .dl-tip{position:absolute;pointer-events:none;background:#fff;border:1px solid var(--rule);border-radius:2px;padding:6px 9px;font-size:13px;line-height:1.35;box-shadow:0 4px 14px rgba(0,0,0,.14);max-width:220px;z-index:5}',
      S + ' .dl-card{position:absolute;top:8px;right:8px;width:min(360px,calc(100% - 16px));background:#fff;border:1px solid var(--rule);border-radius:3px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:14px 14px 12px;z-index:20}',
      S + ' .dl-card.wide{position:static;width:auto;max-height:none;box-shadow:none;margin-top:8px}',
      S + ' .dl-cx{position:absolute;top:6px;right:8px;border:0;background:none;font:400 22px/1 Inter,sans-serif;color:var(--mute);cursor:pointer;padding:2px 6px}',
      S + ' .dl-card h3{font:700 19px/1.2 "Zilla Slab",Georgia,serif;color:var(--navy);margin:0 26px 2px 0}',
      S + ' .dl-cty{font-size:12px;color:var(--mute);margin:0 0 8px}',
      S + ' .dl-cand{display:grid;gap:3px;margin:0 0 10px;padding:0;list-style:none;font-size:13px}',
      S + ' .dl-cand li{display:flex;gap:6px;align-items:baseline}',
      S + ' .dl-pty{display:inline-block;min-width:18px;text-align:center;font:700 10px/16px Inter,sans-serif;color:#fff;border-radius:2px;padding:0 3px}',
      S + ' .dl-inc{font-size:11px;color:var(--mute)}',
      S + ' .dl-kv{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:5px 0;border-top:1px solid var(--rule)}',
      S + ' .dl-kv b{font-variant-numeric:tabular-nums}',
      S + ' table.dl-t{border-collapse:collapse;width:100%;font-size:12.5px;font-variant-numeric:tabular-nums;margin-top:4px}',
      S + ' table.dl-t th{font:700 10px Inter,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mute);text-align:right;padding:5px 4px;border-bottom:1px solid var(--rule)}',
      S + ' table.dl-t th:first-child,' + S + ' table.dl-t td:first-child{text-align:left}',
      S + ' table.dl-t td{padding:5px 4px;border-bottom:1px solid var(--rule);text-align:right}',
      S + ' .dl-sec{display:grid;gap:8px;margin-top:6px}',
      S + ' .dl-sech{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}',
      S + ' .dl-sech h3{font:700 20px/1.2 "Zilla Slab",Georgia,serif;color:var(--navy);margin:0}',
      S + ' .dl-tw{overflow:auto;max-height:620px;border:1px solid var(--rule);border-radius:4px;background:#fff}',
      S + ' table.dl-big{border-collapse:separate;border-spacing:0;width:100%;font-size:13.5px;font-variant-numeric:tabular-nums}',
      S + ' table.dl-big thead th{position:sticky;background:#fff;z-index:2;padding:0;vertical-align:bottom}',
      S + ' table.dl-big thead tr.dl-grp th{top:0;height:30px;box-sizing:border-box;padding:9px 10px 5px;font:700 10px Inter,sans-serif;letter-spacing:.9px;text-transform:uppercase;color:var(--navy);text-align:center;border-bottom:2px solid var(--navy)}',
      S + ' table.dl-big thead tr.dl-grp th.nog{border-bottom-color:transparent}',
      S + ' table.dl-big thead tr.dl-cols th{top:30px;border-bottom:1px solid var(--rule)}',
      S + ' table.dl-big .dl-thw{display:flex;align-items:flex-end;justify-content:flex-end;gap:2px;padding:7px 8px 8px 10px}' + S + ' table.dl-big th.l .dl-thw{justify-content:flex-start}',
      S + ' table.dl-big th .sb{all:unset;cursor:pointer;font:600 12px/1.25 Inter,sans-serif;color:var(--soft);text-align:right}' + S + ' table.dl-big th.l .sb{text-align:left}',
      S + ' table.dl-big th.on .sb{color:var(--navy);font-weight:700}' + S + ' table.dl-big th .sb:focus-visible{outline:2px solid var(--navy);outline-offset:2px}',
      S + ' table.dl-big th .dl-q{margin:0 0 0 3px;flex:none}',
      S + ' table.dl-big td{padding:9px 10px;border-bottom:1px solid #EFEAE0;text-align:right;white-space:nowrap;vertical-align:middle}',
      S + ' table.dl-big td.l{text-align:left}' + S + ' table.dl-big .dl-g{border-left:1px solid var(--rule)}',
      S + ' table.dl-big tbody tr{cursor:pointer}' + S + ' table.dl-big tbody tr:last-child td{border-bottom:0}',
      S + ' table.dl-big tbody tr:hover td{background:var(--parch-l)}',
      S + ' table.dl-big tbody tr.me td{background:#EEF1F6}' + S + ' table.dl-big tbody tr.me td:first-child{box-shadow:inset 3px 0 0 var(--navy)}',
      S + ' table.dl-big tbody td:first-child,' + S + ' table.dl-big tr.dl-cols th:first-child{position:sticky;left:0;background:#fff;z-index:1;box-shadow:inset -1px 0 0 #EFEAE0}' + S + ' table.dl-big tr.dl-cols th:first-child{z-index:3}' + S + ' table.dl-big tr.dl-grp th:first-child{left:0;z-index:3}',
      S + ' .dl-dn{font-weight:700;color:var(--navy)}' + S + ' .dl-dc{display:block;font-size:11.5px;color:var(--mute);font-weight:400;margin-top:1px}',
      S + ' .dl-race{white-space:normal;min-width:190px;line-height:1.3}' + S + ' .dl-race div{margin:1px 0}' + S + ' .dl-race .dl-inc{margin-left:4px}' + S + ' .dl-race .dl-oth{font-size:11.5px;color:var(--mute)}',
      S + ' .dl-pill{display:inline-block;min-width:58px;box-sizing:border-box;text-align:center;padding:3px 9px;border-radius:999px;font-weight:600;font-size:12.5px;line-height:1.35}',
      S + ' .dl-na{color:#b3ab9b}',
      S + ' .dl-held{display:inline-block;font:700 10px/16px Inter,sans-serif;color:#fff;border-radius:2px;padding:0 5px}',
      S + ' .dl-foot{font-size:12px;color:var(--mute);margin:0;max-width:80ch}',
      S + ' .dl-load{padding:40px 0;text-align:center;color:var(--mute)}',
      '@media (max-width:600px){' + S + ' .dl-lab{min-width:0;flex:1 0 100%}' + S + ' table.dl-big tr.dl-grp{display:none}' + S + ' table.dl-big thead tr.dl-cols th{top:0}' + S + ' table.dl-big td{padding:8px 6px}' + S + ' .dl-pill{min-width:0;padding:3px 7px}' + S + ' .dl-lname{font-size:19px}' + S + ' .dl-mark span{display:none}' + S + ' .hide-s{display:none}' + S + ' table.dl-big td,' + S + ' table.dl-big th .sb{padding-left:5px;padding-right:5px}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---- definitions (approved wording) ---- */
  var DEF = {
    lean: 'How much more Democratic or Republican this district voted than North Carolina as a whole, averaged across the nine 2024 Council of State races other than governor. R+5 means 5 points more Republican than the state.',
    split: 'Democrats minus Republicans among people who have voted early or by mail so far, by party registration (not vote choice). Measured as a share of all voters, including unaffiliated.',
    pres: 'Harris’s 2024 margin over Trump in this district: Harris’s share minus Trump’s, using the two-party vote (third-party votes left out). Trump +5 means Trump won the district by 5 points.',
    pp: 'This district’s early-vote party split minus Harris’s 2024 margin over Trump. Positive means Democrats’ lead among people who have voted is bigger than Harris’s margin was; negative, smaller.',
    lp: 'Democrats minus Republicans, but only for low-propensity voters who have already cast ballots. This includes people who voted in 0 or 1 of the last 3 federal elections, or who voted in 2020 and 2024 but skipped 2022.',
    rg: 'Democrats minus Republicans among all registered voters in the district.',
    vr: 'The party split of people who have voted minus the party split of registered voters. A positive number means Democrats’ lead over Republicans is bigger among people who have voted than among registered voters.',
    y22: 'How far a district has moved toward or away from Democrats since the same point in 2022, relative to the rest of the state.'
  };
  var DLAB = { lean: 'District Lean', split: 'Party Split', pres: '2024 Presidential', pp: 'Performance vs. Presidential', lp: 'Low-propensity margin', rg: 'Registration', vr: '2026 Results vs. Registration', y22: 'Compared to 2022' };
  var LAYERS = [   // no22: no Compared to 2022 view; the 2022 change lives on Party Split and Registration. max: points at which the color is fullest
    { k: 'sp', name: 'Party Split', defs: ['split'], max: 30 },
    { k: 'pres', name: '2024 Presidential', defs: ['pres'], max: 30, no22: 'The 2024 presidential vote is fixed, so it has no 2022 comparison.' },
    { k: 'pp', name: 'Performance vs. Presidential', defs: ['split', 'pres', 'pp'], max: 30, no22: 'Switch to Party Split to compare with 2022.' },
    { k: 'lean', name: 'District Lean', defs: ['lean'], max: 12, no22: 'District lean is fixed, so it has no 2022 comparison.' },
    { k: 'rg', name: 'Registration', defs: ['rg'], max: 30 }
  ];
  var PRES = {"cd":{"1":44.14,"2":67.2,"3":43.13,"4":73.02,"5":41.04,"6":41.32,"7":42.99,"8":40.25,"9":41.99,"10":41.06,"11":45.17,"12":73.52,"13":41.65,"14":42.39},"hd":{"1":34.99,"2":55.14,"3":39.84,"4":37.75,"5":46.63,"6":38.74,"7":43.68,"8":63.57,"9":45.05,"10":41.76,"11":66.66,"12":44.16,"13":29.57,"14":34.08,"15":33.1,"16":30.17,"17":38.33,"18":60.8,"19":39.41,"20":44.8,"21":63.49,"22":36.47,"23":56.32,"24":49.16,"25":49.95,"26":44.1,"27":58.58,"28":32.74,"29":84.89,"30":86.22,"31":80.69,"32":50.23,"33":71.06,"34":65.69,"35":49.05,"36":55.98,"37":48.53,"38":81.6,"39":62.78,"40":64.07,"41":67.47,"42":73.62,"43":43.66,"44":60.37,"45":57.61,"46":32.49,"47":37.91,"48":50.45,"49":70.58,"50":57.64,"51":37.02,"52":40.46,"53":36.99,"54":54.25,"55":36.98,"56":86.45,"57":67.96,"58":75.34,"59":44.99,"60":62.4,"61":78.55,"62":46.94,"63":46.11,"64":45.64,"65":31.91,"66":64.03,"67":26.08,"68":39.85,"69":37.38,"70":23.28,"71":69.49,"72":74.88,"73":46.78,"74":46.23,"75":43.97,"76":37.82,"77":23.05,"78":25.03,"79":36.21,"80":24.46,"81":27.9,"82":45.68,"83":34.21,"84":31.93,"85":26.32,"86":29.24,"87":25.16,"88":69.35,"89":25.21,"90":21.53,"91":32.64,"92":69.86,"93":41.8,"94":20.9,"95":36.22,"96":36.5,"97":26.97,"98":51.34,"99":82.95,"100":62.91,"101":69.07,"102":74.78,"103":57.39,"104":59.75,"105":50.32,"106":76.04,"107":80.5,"108":34.88,"109":42.43,"110":33.74,"111":25.96,"112":76.82,"113":34.13,"114":58.88,"115":48.53,"116":80.99,"117":43.8,"118":37.51,"119":43.63,"120":25.38},"sd":{"1":42.52,"2":41.46,"3":40.11,"4":44.95,"5":54.86,"6":31.84,"7":47.18,"8":40.46,"9":35.23,"10":39.11,"11":48.24,"12":38.04,"13":52.36,"14":73.83,"15":68.82,"16":67.78,"17":64.98,"18":49.75,"19":64.38,"20":72.37,"21":38.54,"22":79.94,"23":65.2,"24":42.45,"25":40.16,"26":38.94,"27":60.17,"28":76.45,"29":30.91,"30":26.28,"31":38.38,"32":70.27,"33":29.42,"34":45.85,"35":37.73,"36":20.74,"37":36.5,"38":68.59,"39":66.98,"40":75.09,"41":76.27,"42":53.33,"43":38.84,"44":28.8,"45":28.71,"46":33.91,"47":35.47,"48":37.0,"49":68.38,"50":35.17}};   // Harris share of the 2024 two-party presidential vote, by district
  var PRE = { hd: 'HD', sd: 'SD', cd: 'CD' }, LONG = { hd: 'NC House District', sd: 'NC Senate District', cd: 'Congressional District' };
  var PCOL = { D: '#2E6DB4', R: '#B83A32', L: '#8a7a3a', G: '#3f7d4a', I: '#6b6b6b' };
  var ST = { c: 'cd', layer: 'sp', y: 'now', u: 'pts', s: 'bg', pick: null, vb: null, sort: { k: 'sp', d: -1 } };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dr(x, dec) { dec = dec || 0; if (x === null || x === undefined || isNaN(x)) return '—'; return Math.abs(x) < 0.5 * Math.pow(10, -dec) ? 'even' : (x > 0 ? 'D+' : 'R+') + Math.abs(x).toFixed(dec); }
  function gp(x) { if (x === null || x === undefined || isNaN(x)) return '—'; return Math.abs(x) < 0.05 ? '0.0' : (x > 0 ? '+' : '−') + Math.abs(x).toFixed(1); }
  function hmTxt(m) { return m === null || m === undefined || isNaN(m) ? '\u2014' : Math.abs(m) < 0.05 ? 'Even' : (m > 0 ? 'Harris +' : 'Trump +') + Math.abs(m).toFixed(1); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function margin(d, r, n) { return n > 0 ? (d - r) / n * 100 : null; }
  function fit(xs, ys) {   // least-squares line y = a + b x
    var n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < xs.length; i++) { if (ys[i] === null || isNaN(ys[i])) continue; n++; sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
    var b = n > 1 ? (n * sxy - sx * sy) / (n * sxx - sx * sx) : 0; return [n ? (sy - b * sx) / n : 0, b];
  }
  function mix(a, b, t) { var p = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }, A = p(a), B = p(b); return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')'; }
  function color(v, max) { if (v === null || isNaN(v)) return '#E4E1DA'; var t = Math.max(-1, Math.min(1, v / max)); return t >= 0 ? mix('#F2F0EB', '#2E6DB4', t) : mix('#F2F0EB', '#B83A32', -t); }

  mount.innerHTML = '<div class="dl-load">Loading district data…</div>';
  var D, L, MAP, K, ROWS = {};
  Promise.all(['data.json', 'lean.json', 'district_map.json'].map(function (f) { return fetch(BASE + f).then(function (x) { if (!x.ok) throw new Error(f); return x.json(); }); }))
    .then(function (a) { D = a[0]; L = a[1]; MAP = a[2]; prep(); render(); })
    .catch(function () { mount.innerHTML = '<div class="dl-load">The district data didn’t load. Refresh the page to try again.</div>'; });

  /* ---- the numbers ---- */
  function prep() {
    // the last full day of votes, and the same day of early voting in 2022
    var full = D.days.filter(function (d) { return d < D.asof; }).slice(-1)[0] || D.days[D.days.length - 1];
    var k = Math.round((Date.parse(full + 'T12:00:00Z') - Date.parse(L.ev['2026'] + 'T12:00:00Z')) / 864e5);
    var i22 = Math.max(0, Math.min(L.st22.p[0].length - 1, k - L.k0));
    K = { full: full, day: k + 1, i22: i22 };
    var s26 = D.state, S22 = L.st22;
    var st = {
      sp: margin(s26.pty[0], s26.pty[1], sum(s26.pty)), lp: margin(s26.lp[0], s26.lp[1], sum(s26.lp)), rg: margin(s26.rpty[0], s26.rpty[1], sum(s26.rpty)),
      sp22: margin(S22.p[0][i22], S22.p[1][i22], S22.p[2][i22]), lp22: margin(S22.lp[0][i22], S22.lp[1][i22], S22.lp[2][i22]), rg22: margin(S22.rp[0], S22.rp[1], S22.rp[2])
    };
    st.vr = st.sp - st.rg; st.vr22 = st.sp22 - st.rg22; K.st = st;
    ['hd', 'sd', 'cd'].forEach(function (g) {
      var cur = {}; (D.geo[g] || []).forEach(function (x) { cur[x.name] = x; });
      var rows = [];
      Object.keys(L.ch[g]).forEach(function (d) {
        var z = L.ch[g][d], q = cur[PRE[g] + ' ' + d]; if (!q) return;
        var r = { d: +d, lean: z.lean, cty: z.cty, cand: z.cand, votes: q.vc, reg: q.reg, lpn: sum(q.lp) };
        r.sp = margin(q.pty[0], q.pty[1], sum(q.pty)); r.lp = sum(q.lp) >= 50 ? margin(q.lp[0], q.lp[1], sum(q.lp)) : null; r.rg = margin(q.rpty[0], q.rpty[1], sum(q.rpty)); r.vr = r.sp - r.rg;
        var nP = sum(q.pty);   // the same numbers as net votes (Democrats minus Republicans); vr in votes = how far the net is from the registration split
        r.np = nP; r.nv = { sp: q.pty[0] - q.pty[1], rg: q.rpty[0] - q.rpty[1], lp: r.lp === null ? null : q.lp[0] - q.lp[1], vr: r.vr / 100 * nP };
        r.sp22 = margin(z.p[0][i22], z.p[1][i22], z.p[2][i22]); r.lp22 = z.lp[2][i22] >= 50 ? margin(z.lp[0][i22], z.lp[1][i22], z.lp[2][i22]) : null; r.rg22 = margin(z.rp[0], z.rp[1], z.rp[2]); r.vr22 = r.sp22 - r.rg22;
        // compared to 2022: the district vs. the state now, minus the district vs. the state then
        r.nv22 = { sp: z.p[0][i22] - z.p[1][i22], rg: z.rp[0] - z.rp[1], lp: r.lp22 === null ? null : z.lp[0][i22] - z.lp[1][i22], vr: r.vr22 / 100 * z.p[2][i22] };
        ['sp', 'lp', 'rg', 'vr'].forEach(function (m) { r[m + 'o'] = r[m] === null || r[m + '22'] === null ? null : (r[m] - st[m]) - (r[m + '22'] - st[m + '22']); });
        rows.push(r);
      });
      // 2024 presidential: Harris minus Trump (two-party), on its own, not relative to the state; performance vs. presidential = early-vote split minus that margin
      rows.forEach(function (r) {
        r.h2 = PRES[g][String(r.d)]; r.hm = r.h2 === undefined ? null : 2 * r.h2 - 100;
        r.spp = r.hm === null || r.sp === null ? null : r.sp - r.hm;
        r.nv.pp = r.spp === null ? null : r.spp / 100 * r.np;
      });
      rows.sort(function (a, b) { return a.d - b.d; });
      ROWS[g] = rows;
    });
  }
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function layerOf(k) { for (var i = 0; i < LAYERS.length; i++) if (LAYERS[i].k === k) return LAYERS[i]; }
  function value(r, k) {   // what a layer or column shows for a district, given the 2022 switch
    var y = ST.y === '22';
    if (k === 'lean') return r.lean; if (k === 'pres') return r.hm;
    if (k === 'sp') return y ? r.spo : r.sp;   // compared to 2022: the change in party split relative to the state
    if (k === 'pp') return r.spp;
    if (k === 'lp') return y ? r.lpo : r.lp; if (k === 'rg') return y ? r.rgo : r.rg; if (k === 'vr') return y ? r.vro : r.vr;
    return null;
  }
  function scaleMax(k) { return layerOf(k) ? layerOf(k).max : 12; }
  function isBg(r) { return r.lean >= -10 && r.lean <= 5; }
  function shown(r) { return ST.s === 'all' || isBg(r); }

  /* ---- page ---- */
  function qBtn(key) { return '<button type="button" class="dl-q" data-q="' + key + '" aria-label="What does this mean?">?</button>'; }
  function seg(attr, opts, cur, label, off) {
    return '<span class="dl-seg" role="group" aria-label="' + label + '">' + opts.map(function (o) { return '<button type="button" ' + attr + '="' + o[0] + '" aria-pressed="' + (!off && o[0] === cur) + '"' + (off ? ' disabled' : '') + '>' + o[1] + '</button>'; }).join('') + '</span>';
  }
  function render() {
    var Lr = layerOf(ST.layer);
    var h = '<div class="dl-crow"><span class="dl-lab">Districts</span>' + seg('data-c', [['cd', 'Congress'], ['hd', 'NC House'], ['sd', 'NC Senate']], ST.c, 'Districts') + '</div>' +
      '<div class="dl-crow"><span class="dl-lab">Map shows</span>' + seg('data-l', LAYERS.map(function (x) { return [x.k, x.name]; }), ST.layer, 'Map layer') + '</div>' +
      '<div class="dl-crow"><span class="dl-lab">Compare</span>' + seg('data-y', [['now', 'As of now'], ['22', 'Compared to 2022']], ST.y, 'Compare', !!Lr.no22) + qBtn('y22') + (Lr.no22 ? '<span class="dl-off">' + Lr.no22 + '</span>' : '') + '</div>' +
      '<div class="dl-crow"><span class="dl-lab">Show</span>' + seg('data-s', [['bg', 'Battleground (R+10 to D+5)'], ['all', 'All districts']], ST.s, 'Which districts') + '</div>' +
      '<div class="dl-layer"><p class="dl-lname">' + esc(Lr.name) + (ST.y === '22' && !Lr.no22 ? ', compared to 2022' : '') + (ST.y === '22' && !Lr.no22 ? qBtn(Lr.defs.concat(['y22']).join('+')) : qBtn(Lr.defs.join('+'))) + '</p><p class="dl-ldef">' + esc(layerSub()) + '</p></div>' +
      '<div class="dl-mapw" id="' + SLUG + '-mw"><div class="dl-zc"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="re" class="t" hidden>Reset</button></div>' +
      '<a class="dl-mark"' + (PAGE_URL ? ' href="' + PAGE_URL + '"' : '') + ' target="_blank" rel="noopener"><img src="' + CF_LOGO + '" alt=""><span style="display:block"><b>Carolina Forward</b><span>' + CF_URL + '</span></span></a>' +
      '<div class="dl-tip" hidden></div></div>' +
      '<div class="dl-leg" id="' + SLUG + '-leg"></div>' +
      '<p class="dl-hint">Click or tap a district for its numbers. Use + and − to zoom, and drag to move once zoomed in.</p>' +
      '<div class="dl-dls"><span class="dl-dll">Download</span><div class="dl-dlg"><span class="dl-dlk">Map image</span><button type="button" class="dl-dlb" data-png="wide">Wide <small>X, Facebook</small></button><button type="button" class="dl-dlb" data-png="tall">Tall <small>Instagram</small></button></div>' +
      '<div class="dl-dlg"><span class="dl-dlk">Map data</span><button type="button" class="dl-dlb" data-csv="map">CSV</button></div></div>' +
      '<div class="dl-sec dl-wide"><div class="dl-sech"><h3>District by district' + (ST.y === '22' ? ' compared to 2022' : '') + '</h3>' + seg('data-c', [['cd', 'Congress'], ['hd', 'NC House'], ['sd', 'NC Senate']], ST.c, 'Districts in the table') + '</div><div class="dl-crow"><span class="dl-lab">Show</span>' + seg('data-u', [['pts', 'Points'], ['votes', 'Votes']], ST.u, 'Points or votes') + '</div><p class="dl-foot" id="' + SLUG + '-tnote"></p><div class="dl-tw"><table class="dl-big" id="' + SLUG + '-tab"></table></div><div class="dl-dls"><span class="dl-dll">Download</span><div class="dl-dlg"><span class="dl-dlk">Table</span><button type="button" class="dl-dlb" data-csv="table">CSV</button></div></div></div>' +
      '<p class="dl-foot">Votes through ' + longDay(K.full) + ' (day ' + K.day + ' of early voting), compared with the same day of early voting in 2022, with 2022 voters placed on today’s district lines. Party is registration, not vote choice. Source: NC State Board of Elections. District lean: Carolina Forward analysis of 2024 Council of State results. 2024 presidential: Harris and Trump’s share of the two-party vote.</p>';
    mount.innerHTML = h;
    wire(); drawMap(); legend(); table();
  }
  function layerSub() {
    var k = ST.layer;
    if (k === 'lean') return 'Blue districts vote more Democratic than North Carolina as a whole; red districts, more Republican.';
    if (k === 'pres') return 'Blue districts voted for Harris in 2024; red districts, for Trump. Darker means a bigger margin.';
    if (ST.y === '22') return 'Blue districts have moved toward Democrats since the same point in 2022, relative to the rest of the state; red districts, toward Republicans.';
    if (k === 'sp') return 'Blue districts have more registered Democrats than Republicans among people who have voted so far; red districts, more Republicans.';
    if (k === 'rg') return 'Blue districts have more registered Democrats than Republicans; red districts, more Republicans.';
    return 'Blue indicates an early vote more Democratic than the district’s 2024 presidential vote; red indicates an early vote more Republican than its presidential vote.';
  }
  function longDay(iso) { var d = new Date(iso + 'T12:00:00Z'); return ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'][d.getUTCDay()] + ', ' + ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'][d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function legend() {
    var k = ST.layer, mx = scaleMax(k), el = mount.querySelector('#' + SLUG + '-leg');
    var lo, hi;
    if (ST.y === '22' && !layerOf(k).no22) { lo = 'Toward R by ' + mx + '+ pts'; hi = 'Toward D by ' + mx + '+ pts'; }
    else if (k === 'pp') { lo = 'Redder by ' + mx + '+ pts'; hi = 'Bluer by ' + mx + '+ pts'; }
    else if (k === 'pres') { lo = 'Trump +' + mx + ' or more'; hi = 'Harris +' + mx + ' or more'; }
    else { lo = 'R+' + mx + ' or more'; hi = 'D+' + mx + ' or more'; }
    el.innerHTML = '<span>' + lo + '</span><span class="ramp" style="background:linear-gradient(90deg,#B83A32,#F2F0EB,#2E6DB4)"></span><span>' + hi + '</span>' + (ST.s === 'bg' ? '<span class="chip"><i></i>Outside R+10 to D+5</span>' : '') ;
  }

  /* ---- map ---- */
  var NS = 'http://www.w3.org/2000/svg', svg, gEl, paths = {}, drag = null, dragged = false;
  function fullVB() { return [0, 0, MAP.w, MAP.h]; }
  function drawMap() {
    var mw = mount.querySelector('#' + SLUG + '-mw');
    svg = document.createElementNS(NS, 'svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Map of ' + LONG[ST.c] + 's');
    mw.insertBefore(svg, mw.firstChild);
    svg.insertAdjacentHTML('afterbegin', '<defs><pattern id="' + SLUG + '-hx" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="none"/><line x1="0" y1="0" x2="0" y2="6" stroke="#253551" stroke-width="1.6" stroke-opacity=".55"/></pattern></defs>');
    gEl = document.createElementNS(NS, 'g'); svg.appendChild(gEl); paths = {};
    ROWS[ST.c].forEach(function (r) {
      var p = document.createElementNS(NS, 'path'); p.setAttribute('d', MAP[ST.c][String(r.d)]); p.setAttribute('class', 'dl-dist'); p.setAttribute('tabindex', '0'); p.setAttribute('aria-label', PRE[ST.c] + ' ' + r.d);
      p.addEventListener('mousemove', function (e) { tipShow(e, r); }); p.addEventListener('mouseleave', function () { tipEl().hidden = true; });
      p.addEventListener('click', function () { if (!dragged) pick(r.d); }); p.addEventListener('keydown', function (e) { if (e.key === 'Enter') pick(r.d); });
      gEl.appendChild(p); paths[r.d] = p;
    });
    if (ST.c !== 'cd') { var cl = document.createElementNS(NS, 'path'); cl.setAttribute('class', 'dl-cl'); cl.setAttribute('d', MAP.lines); gEl.appendChild(cl); }
    setVB(ST.vb || fullVB()); paint();
    // zoom and drag
    mw.querySelector('[data-z="in"]').onclick = function () { zoom(0.6); };
    mw.querySelector('[data-z="out"]').onclick = function () { zoom(1 / 0.6); };
    mw.querySelector('[data-z="re"]').onclick = function () { setVB(fullVB()); };
    svg.addEventListener('pointerdown', function (e) { if (!mw.classList.contains('pan') || e.button) return; drag = { x: e.clientX, y: e.clientY, v: ST.vb.slice(), w: svg.clientWidth, id: e.pointerId }; dragged = false; });
    svg.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!dragged && Math.abs(dx) + Math.abs(dy) < 5) return;
      if (!dragged) { dragged = true; try { svg.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
      var s = drag.v[2] / drag.w; setVB(clamp([drag.v[0] - dx * s, drag.v[1] - dy * s, drag.v[2], drag.v[3]])); tipEl().hidden = true; e.preventDefault();
    });
    function end() { drag = null; setTimeout(function () { dragged = false; }, 0); }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('dblclick', function (e) { var rc = svg.getBoundingClientRect(), v = ST.vb; zoom(0.6, v[0] + (e.clientX - rc.left) / rc.width * v[2], v[1] + (e.clientY - rc.top) / rc.height * v[3]); e.preventDefault(); });
    if (ST.pick !== null) openCard();
  }
  function setVB(v) {
    ST.vb = v; svg.setAttribute('viewBox', v.map(function (x) { return x.toFixed(1); }).join(' '));
    var z = v[2] < MAP.w * 0.98, mw = mount.querySelector('#' + SLUG + '-mw'); mw.classList.toggle('pan', z); mw.querySelector('[data-z="re"]').hidden = !z;
  }
  function clamp(v) { var w = Math.min(v[2], MAP.w), h = w * MAP.h / MAP.w; return [Math.max(-w * .25, Math.min(MAP.w - w * .75, v[0])), Math.max(-h * .25, Math.min(MAP.h - h * .75, v[1])), w, h]; }
  function zoom(f, cx, cy) {
    var v = ST.vb; cx = cx === undefined ? v[0] + v[2] / 2 : cx; cy = cy === undefined ? v[1] + v[3] / 2 : cy;
    var w = v[2] * f; if (w >= MAP.w * 0.98) return setVB(fullVB()); if (w < MAP.w / 30) return;
    var h = w * MAP.h / MAP.w; setVB(clamp([cx - (cx - v[0]) * w / v[2], cy - (cy - v[1]) * h / v[3], w, h]));
  }
  function paint() {
    var k = ST.layer, mx = scaleMax(k);
    ROWS[ST.c].forEach(function (r) { var p = paths[r.d]; p.setAttribute('fill', shown(r) ? color(value(r, k), mx) : '#E4E1DA'); p.classList.toggle('on', ST.pick === r.d); });
    var on = paths[ST.pick]; if (on) on.parentNode.insertBefore(on, gEl.querySelector('.dl-cl'));
  }
  function tipEl() { return mount.querySelector('.dl-tip'); }
  function tipShow(e, r) {
    var t = tipEl(), mw = mount.querySelector('#' + SLUG + '-mw'), rc = mw.getBoundingClientRect(), v = value(r, ST.layer), k = ST.layer;
    var vs = k === 'lean' ? dr(v, 1) + ' district lean' : k === 'pres' ? hmTxt(v) + ' in 2024' : ST.y === '22' && !layerOf(k).no22 ? gp(v) + ' since 2022' : k === 'sp' ? dr(v) + ' party split' : k === 'rg' ? dr(v) + ' registration' : gp(v) + ' vs. Harris’s margin';
    t.innerHTML = '<b>' + PRE[ST.c] + ' ' + r.d + '</b> ' + esc(vs); t.hidden = false;
    t.style.left = Math.min(e.clientX - rc.left + 12, mw.clientWidth - t.offsetWidth - 4) + 'px'; t.style.top = (e.clientY - rc.top + 14) + 'px';
  }

  /* ---- click card ---- */
  function pick(d) { ST.pick = d; paint(); openCard(); table(); }
  function openCard() {
    var mw = mount.querySelector('#' + SLUG + '-mw'), old = mount.querySelector('.dl-card'); if (old) old.parentNode.removeChild(old);
    var r = ROWS[ST.c].filter(function (x) { return x.d === ST.pick; })[0]; if (!r) return;
    var cand = r.cand.slice().sort(function (a, b) { return 'DRLGI'.indexOf(a[1]) - 'DRLGI'.indexOf(b[1]); });
    var col = function (v) { return v === null || v === undefined || isNaN(v) ? '' : v > 0.5 ? 'color:#2E6DB4' : v < -0.5 ? 'color:#B83A32' : ''; };
    var kv = function (lab, val, st) { return '<div class="dl-kv"><span>' + lab + '</span><b style="' + (st || '') + '">' + val + '</b></div>'; };
    var hm = r.hm;
    var h = '<button type="button" class="dl-cx" aria-label="Close">×</button><h3>' + LONG[ST.c] + ' ' + r.d + '</h3>' +
      (r.cty.length ? '<p class="dl-cty">' + esc(r.cty.join(', ')) + (r.cty.length > 1 ? ' (largest parts)' : '') + '</p>' : '') +
      (cand.length ? '<ul class="dl-cand">' + cand.map(function (c) { return '<li><span class="dl-pty" style="background:' + (PCOL[c[1]] || '#6b6b6b') + '">' + esc(c[1]) + '</span>' + esc(c[0]) + (c[2] ? ' <span class="dl-inc">(incumbent)</span>' : '') + '</li>'; }).join('') + (cand.every(function (c) { return !c[2]; }) ? '<li class="dl-inc">Open seat</li>' : '') + '</ul>' : '') +
      kv('District lean (COS-No-Gov)' + qBtn('lean'), dr(r.lean, 1)) +
      (hm === null ? '' : kv('2024 president' + qBtn('pres') + '<span class="dl-sub">Harris ' + r.h2.toFixed(1) + '% · Trump ' + (100 - r.h2).toFixed(1) + '% (two-party)</span>', hmTxt(hm))) +
      kv('Votes so far', fmt(r.votes) + ' · ' + (r.reg ? (r.votes / r.reg * 100).toFixed(1) + '% of registered' : '')) +
      '<p class="dl-ch">2026 early vote</p>' +
      kv('Party split' + qBtn('split'), dr(r.sp)) + kv('Low-propensity margin' + qBtn('lp'), dr(r.lp)) + kv('Registration' + qBtn('rg'), dr(r.rg)) + kv('2026 Results vs. Registration' + qBtn('vr'), dr(r.vr)) +
      '<p class="dl-ch">Compared with 2024 and 2022 (points)</p>' +
      kv('Performance vs. Presidential' + qBtn('pp'), gp(r.spp), col(r.spp)) +
      kv('Party split compared to 2022' + qBtn('y22'), gp(r.spo), col(r.spo));
    var card = document.createElement('div'); card.className = 'dl-card' + (mw.clientWidth < 620 ? ' wide' : ''); card.innerHTML = h;
    if (mw.clientWidth < 620) mw.parentNode.insertBefore(card, mw.nextSibling); else mw.appendChild(card);
    card.querySelector('.dl-cx').onclick = function () { ST.pick = null; card.parentNode.removeChild(card); paint(); table(); };
  }

  /* ---- table ---- */
  var OTH_NAME = { L: 'Libertarian', G: 'Green', I: 'independent' };
  function tVal(r, k) {   // a table cell's number, in points or votes; district lean and 2024 presidential are always points
    if (ST.u !== 'votes' || k === 'lean' || k === 'pres') return value(r, k);
    if (ST.y === '22') return r.nv[k] === null || r.nv[k] === undefined || r.nv22[k] === null || r.nv22[k] === undefined ? null : r.nv[k] - r.nv22[k];
    return r.nv[k] === undefined ? null : r.nv[k];
  }
  function tTxt(v, k) {
    if (v === null || v === undefined || isNaN(v)) return null;
    if (k === 'pres') return hmTxt(v);
    if (ST.u === 'votes' && k !== 'lean') { var n = Math.round(v); return !n ? 'even' : (n > 0 ? 'D+' : 'R+') + fmt(Math.abs(n)); }
    return dr(v, k === 'lean' || k === 'pp' || ST.y === '22' ? 1 : 0);
  }
  function tCols() {   // [key, label, ? definition, group]
    var y22 = ST.y === '22';
    return [['d', 'District', null, ''], ['race', 'Candidates', null, '']].concat(y22
      ? [['lean', 'District lean', 'lean', 'Baseline'], ['sp', 'Party split', 'y22', 'Change since 2022'], ['rg', 'Registration', 'rg', 'Change since 2022'], ['vr', 'Vs. registration', 'vr', 'Change since 2022'], ['lp', 'Low-prop. margin', 'lp', 'Change since 2022']]
      : [['lean', 'District lean', 'lean', 'Baseline'], ['rg', 'Registration', 'rg', 'Baseline'], ['pres', '2024 president', 'pres', 'Baseline'],
         ['sp', 'Party split', 'split', '2026 early vote'], ['vr', 'Vs. registration', 'vr', '2026 early vote'], ['lp', 'Low-prop. margin', 'lp', '2026 early vote'], ['pp', 'Performance vs. presidential', 'pp', '2026 early vote']]);
  }
  function table() {
    var tab = mount.querySelector('#' + SLUG + '-tab'); if (!tab) return;
    var y22 = ST.y === '22', V = ST.u === 'votes', cols = tCols();
    var HIDE = { race: 1, rg: 1, pres: 1, vr: 1, lp: 1 };   // phones: district, lean, party split and vs. Harris (or the 2022 change)
    var get = function (r, k) { return k === 'd' ? r.d : k === 'race' ? (incOf(r) ? incOf(r)[1] + incOf(r)[0] : 'Z') : tVal(r, k); };
    if (cols.every(function (c) { return c[0] !== ST.sort.k; })) ST.sort.k = 'lean';
    var rows = ROWS[ST.c].filter(shown).slice().sort(function (a, b) {
      var x = get(a, ST.sort.k), y = get(b, ST.sort.k);
      if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * ST.sort.d || a.d - b.d;
    });
    lastRows = rows;
    mount.querySelector('#' + SLUG + '-tnote').textContent = rows.length + (ST.s === 'all' ? ' districts. ' : ' battleground districts (R+10 to D+5). ') +
      (V ? (y22 ? 'Numbers are the change in net votes (Democrats minus Republicans) since the same day of early voting in 2022. ' : 'Numbers are net votes: Democrats minus Republicans. ') + 'Registration is net registered voters; district lean and 2024 president stay in points. '
        : y22 ? 'Numbers are the change since the same point in 2022, relative to the state, in points. ' : '') + 'Click a column to sort, or a row to show it on the map.';
    var mx = {};   // the color's full strength: the biggest value in each column, so shading compares districts within a column
    cols.forEach(function (c) { if (c[3]) mx[c[0]] = Math.max(V && c[0] !== 'lean' && c[0] !== 'pres' ? 50 : 3, rows.reduce(function (m, r) { var v = tVal(r, c[0]); return v === null || isNaN(v) ? m : Math.max(m, Math.abs(v)); }, 0)); });
    var pill = function (v, k) {
      var s = tTxt(v, k); if (s === null) return '<span class="dl-na">—</span>';
      var z = V && k !== 'lean' && k !== 'pres' ? Math.abs(v) < 0.5 : Math.abs(v) < 0.05, f = Math.min(1, Math.abs(v) / mx[k]);
      var bg = z ? '#F2F0EB' : mix('#FFFFFF', v > 0 ? '#2E6DB4' : '#B83A32', 0.1 + 0.32 * f), fg = z ? '#1a1a1a' : v > 0 ? '#1d4a85' : '#8f2e28';
      return '<span class="dl-pill" style="background:' + bg + ';color:' + fg + '">' + s + '</span>';
    };
    var groups = []; cols.forEach(function (c) { var g = groups[groups.length - 1]; if (g && g[0] === c[3]) g[1]++; else groups.push([c[3], 1, c]); });
    var hs = function (k) { return HIDE[k] ? ' hide-s' : ''; }, first = {}; groups.forEach(function (g) { if (g[0]) first[g[2][0]] = 1; });
    tab.innerHTML = '<thead><tr class="dl-grp">' + groups.map(function (g) {
      var ks = cols.filter(function (c) { return c[3] === g[0]; }), vis = ks.filter(function (c) { return !HIDE[c[0]]; }).length;
      return '<th colspan="' + g[1] + '" class="' + (g[0] ? 'dl-g' : 'nog') + (vis ? '' : ' hide-s') + '" data-vis="' + vis + '">' + esc(g[0]) + '</th>'; }).join('') + '</tr><tr class="dl-cols">' +
      cols.map(function (c) {
        var on = ST.sort.k === c[0], cls = (on ? 'on' : '') + (c[3] ? '' : ' l') + (first[c[0]] ? ' dl-g' : '') + hs(c[0]);
        return '<th class="' + cls + '"' + (on ? ' aria-sort="' + (ST.sort.d > 0 ? 'ascending' : 'descending') + '"' : '') + '><div class="dl-thw"><button type="button" class="sb" data-ts="' + c[0] + '">' + c[1] + (on ? (ST.sort.d > 0 ? ' ▲' : ' ▼') : '') + '</button>' + (c[2] ? qBtn(c[2]) : '') + '</div></th>';
      }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
        var cand = r.cand.filter(function (c) { return c[1] === 'D' || c[1] === 'R'; }).sort(function (a, b) { return b[2] - a[2] || (a[1] < b[1] ? -1 : 1); }), oth = r.cand.filter(function (c) { return c[1] !== 'D' && c[1] !== 'R'; });
        return '<tr data-d="' + r.d + '" tabindex="0"' + (ST.pick === r.d ? ' class="me"' : '') + '><td class="l"><span class="dl-dn">' + PRE[ST.c] + ' ' + r.d + '</span>' + (r.cty.length ? '<span class="dl-dc">' + esc(r.cty[0]) + '</span>' : '') + '</td>' +
          '<td class="l dl-race hide-s">' + cand.map(function (c) { return '<div><span class="dl-held" style="background:' + (PCOL[c[1]] || '#6b6b6b') + '">' + esc(c[1]) + '</span> ' + esc(c[0]) + (c[2] ? '<span class="dl-inc">incumbent</span>' : '') + '</div>'; }).join('') +
            (cand.every(function (c) { return !c[2]; }) ? '<div class="dl-oth">Open seat</div>' : '') +
            (oth.length ? '<div class="dl-oth">Also: ' + oth.map(function (c) { return esc(c[0]) + ' (' + (OTH_NAME[c[1]] || c[1]) + ')'; }).join(', ') + '</div>' : '') + '</td>' +
          cols.slice(2).map(function (c) { return '<td class="' + (first[c[0]] ? 'dl-g' : '') + hs(c[0]) + '">' + pill(tVal(r, c[0]), c[0]) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody>';
    Array.prototype.forEach.call(tab.querySelectorAll('[data-ts]'), function (b) { b.onclick = function () { var k = b.getAttribute('data-ts'); if (ST.sort.k === k) ST.sort.d = -ST.sort.d; else { ST.sort.k = k; ST.sort.d = k === 'd' || k === 'race' ? 1 : -1; } table(); }; });
    Array.prototype.forEach.call(tab.querySelectorAll('tbody tr'), function (tr) {
      var go = function () { pick(+tr.getAttribute('data-d')); var mw = mount.querySelector('#' + SLUG + '-mw'); if (mw.getBoundingClientRect().top < 0) mw.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      tr.onclick = go; tr.onkeydown = function (e) { if (e.key === 'Enter') go(); };
    });
  }

  /* ---- controls and ? pop-ups ---- */
  /* ---- downloads: the map as a PNG (wide for X/Facebook, tall for Instagram), the numbers as CSV ---- */
  var CH_SLUG = { cd: 'congress', hd: 'nc-house', sd: 'nc-senate' }, CH_NAME = { cd: 'Congressional districts', hd: 'NC House districts', sd: 'NC Senate districts' };
  function fname(kind, ext) { return 'carolina-forward-district-lean-' + CH_SLUG[ST.c] + '-' + kind + (ST.y === '22' && !(kind === 'lean') ? '-vs2022' : '') + '-' + K.full + '.' + ext; }
  function save(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000); }
  function csvCell(v) { v = v === null || v === undefined || (typeof v === 'number' && isNaN(v)) ? '' : typeof v === 'number' ? String(Math.round(v * 10) / 10) : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function csv(head, rows, name) { save(new Blob(['﻿' + [head].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), name); }
  function incOf(r) { return r.cand.filter(function (c) { return c[2]; })[0] || null; }
  function chalOf(r) { var i = incOf(r); return r.cand.filter(function (c) { return (c[1] === 'D' || c[1] === 'R') && !c[2] && (!i || c[1] !== i[1]); }).sort(function (a, b) { return a[1] < b[1] ? -1 : 1; }); }   // the major-party candidates other than the incumbent (both, for an open seat)
  function othOf(r) { return r.cand.some(function (c) { return c[1] !== 'D' && c[1] !== 'R'; }) ? 'Y' : 'N'; }
  function mapCsv() {   // every district in the chamber, all the numbers; points, positive = more Democratic
    var P = ' (pts, + = D)';
    csv(['District', 'Counties', 'Incumbent', 'Incumbent party', 'Challenger', 'Other candidates?', 'Battleground (R+10 to D+5)', 'District lean' + P, 'Harris 2024 two-party %', 'Harris minus Trump 2024' + P, 'Votes so far', 'Registered voters',
      'Party split' + P, 'Performance vs. presidential' + P,
      'Low-prop. margin' + P, 'Registration' + P, '2026 results vs. registration' + P, 'Party split, compared to 2022' + P, 'Low-prop. margin, compared to 2022' + P, 'Registration, compared to 2022' + P, '2026 results vs. registration, compared to 2022' + P],
      ROWS[ST.c].map(function (r) { var i = incOf(r); return [PRE[ST.c] + ' ' + r.d, r.cty.join('; '), i ? i[0] : 'Open seat', i ? i[1] : '', chalOf(r).map(function (c) { return c[0] + ' (' + c[1] + ')'; }).join('; '), othOf(r), isBg(r) ? 'Yes' : 'No', r.lean, r.h2, r.hm, r.votes, r.reg,
        r.sp, r.spp, r.lp, r.rg, r.vr, r.spo, r.lpo, r.rgo, r.vro]; }), fname('data', 'csv'));
  }
  function tableCsv(rows) {   // the table as shown: its districts, columns, sort, units and As of now / Compared to 2022 setting
    var y22 = ST.y === '22', V = ST.u === 'votes', ks = tCols().slice(2);
    var unit = function (k) { return k === 'pres' ? ' (Harris minus Trump, pts, two-party)' : V && k !== 'lean' ? (k === 'rg' ? (y22 ? ' (change in net registered voters since 2022, + = D)' : ' (net registered voters, + = D)') : y22 ? ' (change in net votes since 2022, + = D)' : ' (net votes, + = D)') : (y22 && k !== 'lean' ? ' (change since 2022, pts, + = D)' : ' (pts, + = D)'); };
    csv(['District', 'Incumbent', 'Incumbent party', 'Challenger', 'Other candidates?'].concat(ks.map(function (k) { return k[1] + unit(k[0]); })),
      rows.map(function (r) { var i = incOf(r); return [PRE[ST.c] + ' ' + r.d, i ? i[0] : 'Open seat', i ? i[1] : '', chalOf(r).map(function (c) { return c[0] + ' (' + c[1] + ')'; }).join('; '), othOf(r)]
        .concat(ks.map(function (k) { var v = tVal(r, k[0]); return v === null || v === undefined ? null : V && k[0] !== 'lean' && k[0] !== 'pres' ? Math.round(v) : v; })); }), fname('table' + (V ? '-votes' : ''), 'csv'));
  }
  function wrap(ctx, text, w) { var out = [], line = ''; text.split(' ').forEach(function (word) { var t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; }); if (line) out.push(line); return out; }
  function mapPng(fmt) {
    var tall = fmt === 'tall', W = tall ? 1080 : 1200, H = tall ? 1350 : 675, P = tall ? 60 : 44, Lr = layerOf(ST.layer), y22 = ST.y === '22' && !Lr.no22;
    var go = function (logo) {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.fillStyle = '#253551'; c.fillRect(0, 0, W, 8);
      var y = P + 10;
      c.font = '700 ' + (tall ? 17 : 14) + 'px Inter, sans-serif'; c.fillStyle = '#6b6b6b'; c.textBaseline = 'alphabetic';
      var kick = (CH_NAME[ST.c] + (ST.s === 'bg' ? ' · battleground' : '') + ' · early vote through ' + longDay(K.full)).toUpperCase();
      if (c.letterSpacing !== undefined) c.letterSpacing = '1px'; c.fillText(kick, P, y); if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
      y += tall ? 54 : 42; c.font = '700 ' + (tall ? 46 : 36) + 'px "Zilla Slab", Georgia, serif'; c.fillStyle = '#253551';
      wrap(c, Lr.name + (y22 ? ', compared to 2022' : ''), W - 2 * P).forEach(function (l, i) { if (i) y += tall ? 52 : 40; c.fillText(l, P, y); });
      y += tall ? 40 : 30; c.font = '400 ' + (tall ? 22 : 18) + 'px Inter, sans-serif'; c.fillStyle = '#3a3a3a';
      wrap(c, layerSub(), W - 2 * P).forEach(function (l, i) { if (i) y += tall ? 30 : 25; c.fillText(l, P, y); });
      // map box: what's on screen, fitted between the subtitle and the legend
      var foot = tall ? 230 : 150, top = y + (tall ? 36 : 22), bw = W - 2 * P, bh = H - foot - top, v = ST.vb || fullVB();
      var s = Math.min(bw / v[2], bh / v[3]), ox = P + (bw - v[2] * s) / 2 - v[0] * s, oy = top + (bh - v[3] * s) / 2 - v[1] * s;
      c.save(); c.beginPath(); c.rect(P, top, bw, bh); c.clip(); c.setTransform(s, 0, 0, s, ox, oy);
      var k = ST.layer, mx = scaleMax(k), P2 = {};
      ROWS[ST.c].forEach(function (r) { var p = new Path2D(MAP[ST.c][String(r.d)]); P2[r.d] = p; c.fillStyle = shown(r) ? color(value(r, k), mx) : '#E4E1DA'; c.fill(p); c.strokeStyle = 'rgba(37,53,81,.6)'; c.lineWidth = 1 / s; c.stroke(p); });
      if (ST.c !== 'cd') { c.strokeStyle = 'rgba(138,138,138,.45)'; c.lineWidth = 0.6 / s; c.stroke(new Path2D(MAP.lines)); }
      if (ST.pick !== null && P2[ST.pick]) { c.strokeStyle = '#253551'; c.lineWidth = 3.5 / s; c.stroke(P2[ST.pick]); }
      c.setTransform(1, 0, 0, 1, 0, 0);
      // district numbers, when few enough are in view to read; skipped where a number won't fit inside its district or would overlap another
      var vis = ROWS[ST.c].filter(function (r) { var b = paths[r.d].getBBox(); return b.x < v[0] + v[2] && b.x + b.width > v[0] && b.y < v[1] + v[3] && b.y + b.height > v[1]; });
      if (vis.length <= 20) {
        var taken = [], fs = tall ? 18 : 15; c.font = '700 ' + fs + 'px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        vis.forEach(function (r) {
          var b = paths[r.d].getBBox(), x = ox + (b.x + b.width / 2) * s, yy = oy + (b.y + b.height / 2) * s, t = String(r.d), tw = c.measureText(t).width + 6;
          c.setTransform(s, 0, 0, s, ox, oy); var inside = c.isPointInPath(P2[r.d], x, yy); c.setTransform(1, 0, 0, 1, 0, 0);
          if (!inside || x < P || x > W - P || yy < top || yy > top + bh) return;
          var box = [x - tw / 2, yy - fs / 2 - 2, tw, fs + 4];
          if (taken.some(function (q) { return box[0] < q[0] + q[2] && q[0] < box[0] + box[2] && box[1] < q[1] + q[3] && q[1] < box[1] + box[3]; })) return;
          taken.push(box); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.strokeText(t, x, yy); c.fillStyle = '#1a1a1a'; c.fillText(t, x, yy);
        });
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      }
      c.restore();
      // legend
      var ly = H - foot + (tall ? 40 : 30), lo, hi;
      if (y22) { lo = 'Toward R by ' + mx + '+ pts'; hi = 'Toward D by ' + mx + '+ pts'; } else if (k === 'pp') { lo = 'Redder by ' + mx + '+ pts'; hi = 'Bluer by ' + mx + '+ pts'; } else if (k === 'pres') { lo = 'Trump +' + mx + ' or more'; hi = 'Harris +' + mx + ' or more'; } else { lo = 'R+' + mx + ' or more'; hi = 'D+' + mx + ' or more'; }
      c.font = '500 ' + (tall ? 18 : 15) + 'px Inter, sans-serif'; c.fillStyle = '#3a3a3a';
      var lw = c.measureText(lo).width, rw = tall ? 300 : 260, gx = P + lw + 12; c.fillText(lo, P, ly + 6);
      var g = c.createLinearGradient(gx, 0, gx + rw, 0); g.addColorStop(0, '#B83A32'); g.addColorStop(0.5, '#F2F0EB'); g.addColorStop(1, '#2E6DB4'); c.fillStyle = g; c.fillRect(gx, ly - 6, rw, 14);
      c.fillStyle = '#3a3a3a'; c.fillText(hi, gx + rw + 12, ly + 6);
      var cx = gx + rw + 24 + c.measureText(hi).width; if (tall) { cx = P; ly += 34; }
      if (ST.s === 'bg') { c.fillStyle = '#E4E1DA'; c.fillRect(cx, ly - 6, 14, 14); c.fillStyle = '#3a3a3a'; c.fillText('Outside R+10 to D+5', cx + 22, ly + 6); cx += 22 + c.measureText('Outside R+10 to D+5').width + 24; }
      // source and name
      var sy = H - (tall ? 100 : 66); c.strokeStyle = '#d8d2c4'; c.lineWidth = 1; c.beginPath(); c.moveTo(P, sy - (tall ? 24 : 18)); c.lineTo(W - P, sy - (tall ? 24 : 18)); c.stroke();
      var lg = tall ? 48 : 38; if (logo) c.drawImage(logo, P, sy - 4, lg, lg);
      c.font = '700 ' + (tall ? 20 : 16) + 'px "Zilla Slab", Georgia, serif'; c.fillStyle = '#253551'; c.fillText('Carolina Forward', P + lg + 10, sy + (tall ? 16 : 12));
      c.font = '400 ' + (tall ? 15 : 13) + 'px Inter, sans-serif'; c.fillStyle = '#6b6b6b'; c.fillText(PAGE_URL ? PAGE_URL.replace(/^https?:\/\/(www\.)?/, '') : CF_URL, P + lg + 10, sy + (tall ? 38 : 30));
      var src = 'Early and mail votes through ' + longDay(K.full) + ' (day ' + K.day + ' of early voting)' + (y22 ? ', compared with the same day in 2022 on today’s lines' : '') + '. Party is registration, not vote choice. ' + (k === 'pres' || k === 'pp' ? 'Presidential: 2024 Harris vs. Trump, two-party vote. ' : k === 'lean' ? 'District lean: 2024 Council of State races other than governor. ' : '') + 'Source: NC State Board of Elections.';
      var sx = P + lg + (tall ? 230 : 200); c.font = '400 ' + (tall ? 14 : 12) + 'px Inter, sans-serif'; c.fillStyle = '#6b6b6b';
      wrap(c, src, W - P - sx).forEach(function (l, i) { c.fillText(l, sx, sy + 8 + i * (tall ? 19 : 16)); });
      cv.toBlob(function (b) { save(b, fname(k, 'png').replace('.png', '-' + fmt + '.png')); }, 'image/png');
    };
    var f = document.fonts && document.fonts.load ? Promise.all(['700 36px "Zilla Slab"', '400 18px Inter', '700 15px Inter']. map(function (x) { return document.fonts.load(x); })) : Promise.resolve();
    f.catch(function () {}).then(function () { var im = new Image(); im.onload = function () { go(im); }; im.onerror = function () { go(null); }; im.src = CF_LOGO; });
  }

  var lastRows = [];
  function wire() {
    Array.prototype.forEach.call(mount.querySelectorAll('[data-png]'), function (b) { b.onclick = function () { mapPng(b.getAttribute('data-png')); }; });
    Array.prototype.forEach.call(mount.querySelectorAll('[data-csv]'), function (b) { b.onclick = function () { if (b.getAttribute('data-csv') === 'map') mapCsv(); else tableCsv(lastRows); }; });
    Array.prototype.forEach.call(mount.querySelectorAll('[data-c]'), function (b) { b.onclick = function () { if (ST.c === b.getAttribute('data-c')) return; ST.c = b.getAttribute('data-c'); ST.pick = null; ST.vb = null; render(); }; });
    Array.prototype.forEach.call(mount.querySelectorAll('[data-l]'), function (b) { b.onclick = function () { ST.layer = b.getAttribute('data-l'); if (layerOf(ST.layer).no22) ST.y = 'now'; ST.sort.k = ST.layer; render(); }; });
    Array.prototype.forEach.call(mount.querySelectorAll('[data-y]'), function (b) { b.onclick = function () { ST.y = b.getAttribute('data-y'); render(); }; });
    Array.prototype.forEach.call(mount.querySelectorAll('[data-u]'), function (b) { b.onclick = function () { ST.u = b.getAttribute('data-u'); Array.prototype.forEach.call(mount.querySelectorAll('[data-u]'), function (x) { x.setAttribute('aria-pressed', x === b); }); table(); }; });
    Array.prototype.forEach.call(mount.querySelectorAll('[data-s]'), function (b) { b.onclick = function () { ST.s = b.getAttribute('data-s'); render(); }; });
  }
  var qOpen = null;
  function qClose() { var o = document.querySelector('.dl-qpop'); if (o) o.parentNode.removeChild(o); qOpen = null; }
  mount.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.dl-q');
    if (!b) { qClose(); return; }
    e.stopPropagation(); e.preventDefault();
    var same = qOpen === b; qClose(); if (same) return;
    var pop = document.createElement('div'); pop.className = 'dl-qpop'; pop.setAttribute('role', 'note'); pop.innerHTML = b.getAttribute('data-q').split('+').map(function (k) { return '<p style="margin:0 0 6px"><b>' + esc(DLAB[k]) + ':</b> ' + esc(DEF[k] || '') + '</p>'; }).join(''); document.body.appendChild(pop);
    var rc = b.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.left = (window.scrollX + Math.max(8, Math.min(document.documentElement.clientWidth - w - 8, rc.left + rc.width / 2 - w / 2))) + 'px';
    pop.style.top = (window.scrollY + rc.bottom + 6) + 'px'; qOpen = b;
  }, true);
  document.addEventListener('click', function (e) { if (qOpen && !(e.target.closest && e.target.closest('.dl-qpop'))) qClose(); });
})();
