/* NC Mail Ballot Cure Tracker (staff and partners) - self-activating embed
   Usage on carolinaforward.org: in the post body, insert a Code Block (CMS "+" menu -> Code Block)
   containing only:
     nc-cure-staff
   Built by github.com/theo-cf/nc-turnout-data (staff/build_widget.py). Do not edit the built file.

   This file contains no voter data. The voter list loads from vault/data.json on the Pages site,
   built from the State Board's public absentee file on each run. */
(function () {
  'use strict';
  var SLUG = 'nc-cure-staff';
  var VAULT = /*__VAULT__*/'vault/';
  var STALE_DAYS = 7;   // highlight voters waiting this long or longer

  var mount = document.querySelector('div.' + SLUG);
  if (!mount) {
    var codeEl = document.querySelector('code.language-' + SLUG);
    var target = codeEl ? (codeEl.closest && codeEl.closest('pre')) || codeEl : null;
    if (!target) {
      var blocks = document.querySelectorAll('pre, code');
      for (var i = 0; i < blocks.length; i++) {
        if ((blocks[i].textContent || '').replace(/\s+/g, '') === SLUG) {
          target = (blocks[i].closest && blocks[i].closest('pre')) || blocks[i];
          break;
        }
      }
    }
    if (!target) return;
    mount = document.createElement('div');
    mount.className = SLUG;
    target.parentNode.replaceChild(mount, target);
  }
  mount.classList.add(SLUG);

  if (!document.getElementById(SLUG + '-fonts')) {
    var link = document.createElement('link');
    link.id = SLUG + '-fonts'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }
  if (!document.getElementById(SLUG + '-style')) {
    var style = document.createElement('style');
    style.id = SLUG + '-style';
    style.textContent = /*__CSS__*/'';
    document.head.appendChild(style);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function pct(a, b) { if (!b || !a) return '0%'; var p = a / b * 100; return p < 0.01 ? '<0.01%' : p.toFixed(p < 10 ? 2 : 1) + '%'; }
  var AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  function apDate(iso) { var p = iso.split('-'); return AP[+p[1] - 1] + ' ' + (+p[2]); }
  function updatedLabel(u, asof) {
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(u || '');
    if (!m) return asof ? 'Data as of ' + apDate(asof) : 'Carolina Forward';
    var h = +m[2], t = (h === 12 && m[3] === '00') ? 'noon' : (h % 12 || 12) + (m[3] === '00' ? '' : ':' + m[3]) + ' ' + (h < 12 ? 'a.m.' : 'p.m.');
    return 'Updated ' + apDate(m[1]) + ', ' + t;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function titleCase(s) { return s.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }).replace(/\bId\b/g, 'ID'); }
  function q(sel) { return mount.querySelector(sel); }

  /* ---------------- loading ---------------- */
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (r.status === 404) { var e = new Error('missing'); e.missing = true; throw e; }
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }
  /* ---------------- the tracker ---------------- */
  var GEO = [['state', 'Statewide'], ['county', 'County'], ['cd', 'Congress'], ['hd', 'NC House'], ['sd', 'NC Senate']];
  var LONG = {
    state: function () { return 'North Carolina'; },
    county: function (x) { return x + ' County'; },
    cd: function (x) { return 'Congressional District ' + x.replace(/\D/g, ''); },
    hd: function (x) { return 'NC House District ' + x.replace(/\D/g, ''); },
    sd: function (x) { return 'NC Senate District ' + x.replace(/\D/g, ''); }
  };
  var PARTY = [['DEM', 'Democratic', 'd'], ['REP', 'Republican', 'r'], ['UNA', 'Unaffiliated', 'u'], ['OTH', 'Other', 'o']];
  // Registered party as the State Board lists it, for each voter's badge.
  var PNAME = { DEM: 'Democrat', REP: 'Republican', UNA: 'Unaffiliated', LIB: 'Libertarian', GRE: 'Green', NLB: 'No Labels', JFA: 'Justice for All', CST: 'Constitution', WTP: 'We the People' };
  // Voting history in the last three November elections (2020, 2022, 2024): 'nv' New Voter, or '0'..'3' elections voted.
  function hkey(x) { return !x.h ? '' : x.nv ? 'nv' : String((x.h.match(/Y/g) || []).length); }
  var HIST = [['low', 'Low propensity (New Voter, 0 or 1 of 3)'], ['nv', 'New Voter'], ['0', 'Voted 0 of 3'], ['1', 'Voted 1 of 3'], ['2', 'Voted 2 of 3'], ['3', 'Voted 3 of 3']];
  function htag(x) {
    var k = hkey(x); if (!k) return '';
    if (k === 'nv') return '<span class="ht hn" title="Not registered in North Carolina, or not old enough, for all of the last three November elections">New Voter</span>';
    var dots = x.h.split('').map(function (c, i) { return '<i' + (c === 'Y' ? ' class="f"' : '') + ' title="' + ['2020', '2022', '2024'][i] + (c === 'Y' ? ': voted' : ': did not vote') + '"></i>'; }).join('');
    return '<span class="ht h' + k + '"><span class="dots" aria-hidden="true">' + dots + '</span>Voted ' + k + ' of 3</span>';
  }
  /* Layered sorting of the voter lists: up to three keys, applied in order. */
  var SORTS = [['county', 'County'], ['precinct', 'Precinct'], ['cd', 'Congressional district'], ['hd', 'NC House district'], ['sd', 'NC Senate district'],
    ['prop', 'Voter propensity (least likely first)'], ['party', 'Party'], ['when', ''], ['name', 'Name']];
  var PORDER = { DEM: 0, REP: 1, UNA: 2 };
  function hrank(x) { var k = hkey(x); return k === '' ? 9 : k === 'nv' ? 0.5 : +k; }   // elections voted, of the last three; New Voters between 0 and 1
  function cmpKey(key, cured) {
    switch (key) {
      case 'county': return function (a, b) { return a.county.localeCompare(b.county); };
      case 'precinct': return function (a, b) { return a.county.localeCompare(b.county) || String(a.precinct).localeCompare(String(b.precinct), undefined, { numeric: true }); };
      case 'cd': case 'hd': case 'sd': return function (a, b) { return (+a[key] || 999) - (+b[key] || 999); };
      case 'prop': return function (a, b) { return hrank(a) - hrank(b); };
      case 'party': return function (a, b) { return (PORDER[a.party] == null ? 3 : PORDER[a.party]) - (PORDER[b.party] == null ? 3 : PORDER[b.party]); };
      case 'name': return function (a, b) { return a.name.localeCompare(b.name); };
      default: return cured ? function (a, b) { return (b.returned || '').localeCompare(a.returned || ''); } : function (a, b) { return (b.days || 0) - (a.days || 0); };
    }
  }
  function sorter(keys, cured) {
    var fs = keys.filter(Boolean).map(function (k) { return cmpKey(k, cured); }).concat([cmpKey('when', cured), cmpKey('name')]);
    return function (a, b) { for (var i = 0; i < fs.length; i++) { var d = fs[i](a, b); if (d) return d; } return 0; };
  }
  function whenLabel(cured) { return cured ? 'Most recent return' : 'Longest waiting'; }
  function sortLabel(k, cured) { return k === 'when' ? whenLabel(cured) : SORTS.filter(function (s) { return s[0] === k; })[0][1]; }
  /* Race and ethnicity as voters list them on their registration (optional). */
  var RACE = [['B', 'Black'], ['W', 'White'], ['A', 'Asian'], ['I', 'American Indian'], ['O', 'Other race'], ['M', 'Two or more races'], ['P', 'Pacific Islander'], ['U', 'Undesignated']];
  var ETH = [['HL', 'Hispanic or Latino'], ['NL', 'Not Hispanic or Latino'], ['UN', 'Left blank']];
  var RNAME = {}; RACE.forEach(function (r) { RNAME[r[0]] = r[1]; });
  var ENAME = { HL: 'Hispanic', NL: 'Not Hispanic', UN: 'Ethnicity blank' };
  function rtag(x) { return x.race ? '<span class="rtag">' + esc(RNAME[x.race] || 'Undesignated') + ' \u00B7 ' + esc(ENAME[x.eth] || 'Ethnicity blank') + '</span>' : ''; }
  function pbadge(x) {
    var code = x.pcode || x.party, cls = { DEM: 'd', REP: 'r', UNA: 'u' }[x.party] || 'o';
    return '<span class="pb ' + cls + '">' + esc(PNAME[code] || code) + '</span>';
  }

  function render(D) {
    var STATUS = {}; D.cure_keys.forEach(function (k) { STATUS[k[0]] = titleCase(k[1]); });
    var asofT = new Date(D.asof + 'T12:00:00');
    D.voters.forEach(function (v) {
      v.days = v.returned ? Math.max(0, Math.round((asofT - new Date(v.returned + 'T12:00:00')) / 864e5)) : '';
      v.hay = [v.name, v.ncid, v.reg, v.county, v.precinct, v.home, v.mail_to].join(' ').toLowerCase();
    });
    var A = D.access || { area: 'all', desc: 'Statewide', label: '' }, all = A.area === 'all';
    var places = { state: [Object.assign({ name: 'North Carolina' }, D.state)] };
    ['county', 'cd', 'hd', 'sd'].forEach(function (k) { places[k] = D.geo[k]; });
    var state = { geo: 'state', sel: { state: 'North Carolina' }, q: '', party: '', status: '', hist: '', all: false, allPl: false, list: 'wait', sorts: ['', '', ''], race: '', eth: '' };
    ['county', 'cd', 'hd', 'sd'].forEach(function (k) {
      state.sel[k] = places[k].reduce(function (a, r) { return r.wait > a.wait ? r : a; }).name;
    });
    if (!all) {   // open on the group's own area
      for (var gi = 1; gi < GEO.length; gi++) {
        var k0 = GEO[gi][0], list = A.area[k0];
        if (list && list.length) {
          var want = String(list[0]).toLowerCase();
          var hit = places[k0].filter(function (r) { return r.name.toLowerCase() === want || r.name.replace(/\D/g, '') === want; })[0];
          if (hit) { state.geo = k0; state.sel[k0] = hit.name; break; }
        }
      }
    }

    var h = '<div class="kick">' + updatedLabel(D.updated, D.asof) + '</div>';
    h += '<div class="warn"><b>Contains voter names and addresses.</b> For cure outreach only. Don’t forward, post or screenshot, and delete exports when you’re done.</div>';
    h += '<div class="tabs" role="group" aria-label="Geography">';
    GEO.forEach(function (g) { h += '<button type="button" data-g="' + g[0] + '" aria-pressed="false">' + g[1] + '</button>'; });
    h += '</div><div class="find"><label class="findl" for="' + SLUG + '-find">Find a county or district</label>' +
      '<input id="' + SLUG + '-find" class="findi" type="search" autocomplete="off" placeholder="Type a county or district, e.g. Orange or House 22" role="combobox" aria-expanded="false" aria-controls="' + SLUG + '-res" aria-autocomplete="list">' +
      '<div id="' + SLUG + '-res" class="res" role="listbox" hidden></div></div>';
    h += '<div class="pick" hidden><button type="button" class="step" data-d="-1" aria-label="Previous">&#8249;</button><select class="sel" aria-label="Choose a place"></select><button type="button" class="step" data-d="1" aria-label="Next">&#8250;</button></div>';
    h += '<div class="view" aria-live="polite"></div>';
    h += '<details class="how"><summary>How this is counted</summary>' +
      '<p>Each voter is counted once. A voter with a returned mail ballot lands in one group: <b>voted in person instead</b> if an early in-person ballot was accepted; otherwise <b>accepted by mail</b> if a mail ballot was accepted; ' +
      'otherwise <b>waiting on the voter</b> if a ballot has a status that needs the voter to act; otherwise <b>not counted</b> if it was rejected. Ballots that were only spoiled, cancelled or duplicated are left out of all four.</p>' +
      '<p>Waiting on the voter covers every State Board status that needs the voter to act: ' + D.cure_keys.map(function (k) { return STATUS[k[0]]; }).join(', ') + '. ' +
      'A voter with more than one such ballot is listed under the most recent one. “Days waiting” counts from the day that ballot was returned to the file date.</p>' +
      '<p>Totals and the voter list cover the whole state. The State Board file doesn’t include phone numbers or say exactly what each “Pending Cure” ballot is missing; the county board’s notice to the voter does. Party is current registration.</p></details>';
    h += '<div class="foot"><span>Source: <a href="https://www.ncsbe.gov/results-data/absentee-data" target="_blank" rel="noopener">NC State Board of Elections</a> absentee file. Analysis: Carolina Forward.</span>' +
      '<button type="button" class="copy">Copy link to this view</button></div>';
    mount.innerHTML = h;

    var pick = q('.pick'), sel = q('.sel'), view = q('.view');

    function sorted(k) {
      var rows = places[k].slice();
      if (k === 'county') rows.sort(function (a, b) { return a.name.localeCompare(b.name); });
      else if (k !== 'state') rows.sort(function (a, b) { return parseInt(a.name.replace(/\D/g, ''), 10) - parseInt(b.name.replace(/\D/g, ''), 10); });
      return rows;
    }
    function current() { var k = state.geo; return places[k].filter(function (x) { return x.name === state.sel[k]; })[0]; }
    function inPlace(v) {
      var k = state.geo, n = state.sel[k];
      if (k === 'state') return true;
      if (k === 'county') return v.county === n;
      return String(v[k]) === n.replace(/\D/g, '');
    }

    function show() {
      var k = state.geo, r = current();
      if (!r) return;
      var V = D.voters.filter(inPlace), partial = V.length < r.wait;
      var v = '<div class="place">' + esc(LONG[k](r.name)) + '</div>';
      v += '<div class="head"><span class="big">' + fmt(r.wait) + '</span><span class="hl">' + (r.wait === 1 ? 'voter needs' : 'voters need') + ' to fix their mail ballot</span></div>';
      var stale = V.filter(function (x) { return x.days !== '' && x.days >= STALE_DAYS; }).length;
      v += '<p class="dek">' + (r.n ? 'That’s ' + pct(r.wait, r.n) + ' of the ' + fmt(r.n) + ' voters here who have returned a mail ballot.' : 'No mail ballots have been returned here yet.') +
        (stale && !partial ? ' ' + fmt(stale) + (stale === 1 ? ' has' : ' have') + ' been waiting ' + STALE_DAYS + ' days or more.' : '') + '</p>';
      v += '<div class="row">' +
        cell('Waiting on the voter', r.wait, 'fix', pct(r.wait, r.n) + ' of returns') +
        cell('Cured', r.acc_cur, 'ok', 'Fixed and accepted') +
        cell('Accepted by mail', r.acc, '', pct(r.acc, r.n) + ' of returns') +
        cell('Voted in person', r.ip, '', 'Instead of by mail') +
        cell('Not counted', r.rej, '', 'Rejected') + '</div>';
      v += statusBlock(r);
      v += listBlock(r);
      v += whereBlock(k, r, V, partial);
      v += partyBlock(r);
      v += raceBlock(r);
      v += flagsBlock(k, r);
      view.innerHTML = v;
      wireList(r);
      var mb = view.querySelector('.more.pl'); if (mb) mb.addEventListener('click', function () { state.allPl = !state.allPl; show(); });
      each(view.querySelectorAll('tr.go'), function (tr) {
        function go() { state.sel.county = tr.getAttribute('data-c'); setGeo('county'); if (mount.scrollIntoView) mount.scrollIntoView(); }
        tr.addEventListener('click', go);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      });
      setHash();
    }
    function cell(label, n, cls, sub) {
      return '<div class="cell"><div class="cl">' + label + '</div><div class="cn ' + (n ? cls : 'zero') + '">' + fmt(n) + '</div><div class="cs">' + sub + '</div></div>';
    }

    function statusBlock(r) {
      if (!r.wait) return '';
      var tot = [0, 0, 0, 0];
      var t = '<div class="sec"><div class="sech">What needs fixing<span>Status as the State Board lists it</span></div><div class="tw"><table class="narrow"><thead><tr><th>Status</th>' +
        PARTY.map(function (p) { return '<th>' + p[0] + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>';
      D.cure_keys.forEach(function (c) {
        var s = (r.sp || {})[c[0]];
        if (!s) return;
        s.forEach(function (x, i) { tot[i] += x; });
        t += '<tr><td>' + esc(STATUS[c[0]]) + '</td>' + s.map(function (x) { return '<td>' + fmt(x) + '</td>'; }).join('') + '<td><b>' + fmt(s[0] + s[1] + s[2] + s[3]) + '</b></td></tr>';
      });
      t += '<tr class="tot"><td>Total</td>' + tot.map(function (x) { return '<td>' + fmt(x) + '</td>'; }).join('') + '<td>' + fmt(r.wait) + '</td></tr>';
      return t + '</tbody></table></div></div>';
    }

    function whereBlock(k, r, V, partial) {
      var rows = [], hasN = true, title, unit;
      if (k === 'state') {
        title = 'Where they are'; unit = 'County';
        rows = places.county.filter(function (c) { return c.wait; }).map(function (c) { return { name: c.name, link: c.name, n: c.n, wait: c.wait, pw: c.pw }; });
      } else if (k === 'county') {
        title = 'By precinct'; unit = 'Precinct';
        var P = D.precincts[r.name] || {};
        rows = Object.keys(P).filter(function (p) { return P[p][1]; }).map(function (p) { return { name: p, n: P[p][0], wait: P[p][1], pw: P[p].slice(2) }; });
      } else {
        title = 'By precinct'; unit = 'Precinct'; hasN = false;   // precincts can cross district lines, so no rate here
        var by = {}, keys = PARTY.map(function (p) { return p[0]; });
        V.forEach(function (x) {
          var key = x.county + '|' + x.precinct;
          if (!by[key]) by[key] = { name: x.county + ' · ' + x.precinct, wait: 0, pw: [0, 0, 0, 0] };
          by[key].wait++; by[key].pw[keys.indexOf(x.party)]++;
        });
        rows = Object.keys(by).map(function (key) { return by[key]; });
      }
      if (!rows.length) return '';
      rows.sort(function (a, b) { return b.wait - a.wait || a.name.localeCompare(b.name); });
      var LIM = 15, total = rows.length, shown = state.allPl ? rows : rows.slice(0, LIM);
      var noun = unit === 'County' ? (total === 1 ? 'county' : 'counties') : (total === 1 ? 'precinct' : 'precincts');
      var t = '<div class="sec"><div class="sech">' + title + '<span>' + fmt(total) + ' ' + noun + ' with voters waiting</span></div>' +
        '<div class="tw"><table class="cards"><thead><tr><th>' + unit + '</th>' + (hasN ? '<th>Returned</th>' : '') + '<th>Waiting</th>' + (hasN ? '<th>Rate</th>' : '') +
        PARTY.slice(0, 3).map(function (p) { return '<th>' + p[0] + '</th>'; }).join('') + '</tr></thead><tbody>';
      shown.forEach(function (o) {
        var hi = hasN && o.n >= 50 && o.wait / o.n >= 0.02;
        t += '<tr' + (o.link ? ' class="go" tabindex="0" data-c="' + esc(o.link) + '"' : '') + '><td>' + esc(o.name) + '</td>' + (hasN ? '<td data-l="Returned">' + fmt(o.n) + '</td>' : '') +
          '<td data-l="Waiting"><b>' + fmt(o.wait) + '</b></td>' + (hasN ? '<td data-l="Rate"' + (hi ? ' class="hi"' : '') + '>' + pct(o.wait, o.n) + '</td>' : '') +
          PARTY.slice(0, 3).map(function (p, i) { return '<td data-l="' + p[0] + '">' + fmt(o.pw[i]) + '</td>'; }).join('') + '</tr>';
      });
      t += '</tbody></table></div>';
      if (total > LIM) t += '<button type="button" class="more pl">' + (state.allPl ? 'Show fewer' : 'Show all ' + total) + '</button>';
      t += '<p class="note">' + (k === 'state' ? 'Select a county to see its precincts and voters. ' : '') +
        (hasN ? 'Rates of 2% or more (places with 50+ returns) in red.' : 'Precincts can cross district lines, so no rate is shown.' + (partial ? ' Only precincts in your area are listed.' : '')) + '</p></div>';
      return t;
    }

    function raceBlock(r) {
      if (!r.rn || !r.n) return '';
      function rows(list, n, w, c) {
        return list.map(function (g, i) {
          if (!n[i] && !w[i] && !c[i]) return '';
          return '<tr><td>' + g[1] + '</td><td>' + fmt(n[i]) + '</td><td>' + fmt(w[i]) + '</td><td>' + pct(w[i], n[i]) + '</td><td>' + fmt(c[i]) + '</td></tr>';
        }).join('');
      }
      var head = function (lab) { return '<thead><tr><th>' + lab + '</th><th>Returned</th><th>Waiting</th><th>Rate</th><th>Cured</th></tr></thead>'; };
      var blank = r.en ? r.en[2] : 0;
      return '<div class="sec"><div class="sech">By race and ethnicity<span>As listed on the voter\u2019s registration</span></div>' +
        '<div class="tw"><table class="narrow">' + head('Race') + '<tbody>' + rows(RACE, r.rn, r.rw, r.rcu) +
        '<tr class="tot"><td>Total</td><td>' + fmt(r.n) + '</td><td>' + fmt(r.wait) + '</td><td>' + pct(r.wait, r.n) + '</td><td>' + fmt(r.acc_cur) + '</td></tr></tbody></table></div>' +
        '<div class="tw" style="margin-top:14px"><table class="narrow">' + head('Ethnicity') + '<tbody>' + rows(ETH, r.en, r.ew, r.ecu) + '</tbody></table></div>' +
        '<p class="note">Rate = voters waiting as a share of that group\u2019s returned mail voters. Race and ethnicity are optional on the registration form; ' + pct(blank, r.n) + ' of returned mail voters here left ethnicity blank, so Hispanic and Latino voters are undercounted. Many Hispanic and Latino voters choose \u201cOther\u201d for race.</p></div>';
    }
    function partyBlock(r) {
      if (!r.n) return '';
      var bar = '', t = '';
      PARTY.forEach(function (p, i) {
        var w = r.pw[i] / (r.wait || 1) * 100;
        if (r.pw[i]) bar += '<span class="ps ' + p[2] + '" style="width:' + w.toFixed(2) + '%"></span>';
        t += '<tr><td><i class="sw ' + p[2] + '"></i>' + p[1] + '</td><td>' + fmt(r.pn[i]) + '</td><td>' + fmt(r.pw[i]) + '</td><td>' + pct(r.pw[i], r.pn[i]) + '</td></tr>';
      });
      return '<div class="sec"><div class="sech">By party registration</div>' + (r.wait ? '<div class="pbar" role="img" aria-label="Voters waiting, by party">' + bar + '</div>' : '') +
        '<div class="tw"><table class="narrow"><thead><tr><th>Party</th><th>Returned</th><th>Waiting</th><th>Rate</th></tr></thead><tbody>' + t +
        '<tr class="tot"><td>Total</td><td>' + fmt(r.n) + '</td><td>' + fmt(r.wait) + '</td><td>' + pct(r.wait, r.n) + '</td></tr></tbody></table></div>' +
        '<p class="note">Bar shows voters waiting. Rate = voters waiting as a share of that party’s returned mail voters here.</p></div>';
    }

    function flagsBlock(k, r) {
      if (k !== 'state' && k !== 'county') return '';
      var F = D.flags.filter(function (f) { return k === 'state' || f[1] === r.name; });
      var t = '<div class="sec"><div class="sech">Data checks<span>Returned mail ballots that look off</span></div>';
      if (!F.length) return t + '<div class="none">No records failed a check' + (k === 'county' ? ' here' : '') + '.</div></div>';
      t += '<div class="tw"><table class="narrow"><thead><tr><th>Check</th><th class="l">County</th><th>Records</th></tr></thead><tbody>';
      F.forEach(function (f) { t += '<tr><td>' + esc(f[0]) + '</td><td class="l">' + esc(f[1]) + '</td><td>' + fmt(f[2]) + '</td></tr>'; });
      return t + '</tbody></table></div><p class="note">Checks: return date after file date, returned before sent, sent before requested, missing dates, ages over 105 or under 18.</p></div>';
    }

    /* The voter list, with tabs for voters who need a fix and voters whose ballot was cured. */
    function listRows() { return (state.list === 'cured' ? (D.cured || []) : D.voters).filter(inPlace); }
    function listBlock(r) {
      var cured = state.list === 'cured', V = listRows(), nw = D.voters.filter(inPlace).length, nc = (D.cured || []).filter(inPlace).length;
      var tab = function (k, label, n) { return '<button type="button" role="tab" data-list="' + k + '" aria-selected="' + (state.list === k) + '"' + (state.list === k ? ' class="on"' : '') + '>' + label + ' <b>' + fmt(n) + '</b></button>'; };
      var opt = function (lvl) {
        var cur = state.sorts[lvl];
        return '<select data-lvl="' + lvl + '" aria-label="' + (lvl ? 'Then by' : 'Sort by') + '"><option value="">' + (lvl ? '—' : whenLabel(cured)) + '</option>' +
          SORTS.filter(function (s) { return lvl || s[0] !== 'when'; }).map(function (s) { return '<option value="' + s[0] + '"' + (cur === s[0] ? ' selected' : '') + '>' + sortLabel(s[0], cured) + '</option>'; }).join('') + '</select>';
      };
      return '<div class="sec"><div class="sech">Voters<span class="vsorth"></span></div>' +
        '<div class="ltabs" role="tablist" aria-label="Which voters">' + tab('wait', 'Need a fix', nw) + tab('cured', 'Cured', nc) + '</div>' +
        (cured ? '<p class="ldek">Voters whose mail ballot was accepted after they fixed it (the State Board lists these as Accepted – Cured).</p>' : '') +
        '<div class="vbar"><label class="sr" for="' + SLUG + '-vq">Search voters</label><input id="' + SLUG + '-vq" type="search" placeholder="Search name, NCID, precinct or address" value="' + esc(state.q) + '">' +
        '<select class="vp" aria-label="Party"><option value="">All parties</option>' + PARTY.map(function (p) { return '<option value="' + p[0] + '"' + (state.party === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select>' +
        (cured ? '' : '<select class="vs" aria-label="Status"><option value="">All statuses</option>' + D.cure_keys.filter(function (c) { return V.some(function (x) { return x.status === c[0]; }); })
          .map(function (c) { return '<option value="' + c[0] + '"' + (state.status === c[0] ? ' selected' : '') + '>' + esc(STATUS[c[0]]) + '</option>'; }).join('') + '</select>') +
        (V.some(function (x) { return x.race; }) ? '<select class="vr" aria-label="Race"><option value="">All races</option>' + RACE.map(function (g) { return '<option value="' + g[0] + '"' + (state.race === g[0] ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('') + '</select>' +
          '<select class="ve" aria-label="Ethnicity"><option value="">All ethnicities</option>' + ETH.map(function (g) { return '<option value="' + g[0] + '"' + (state.eth === g[0] ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('') + '</select>' : '') +
        (V.some(function (x) { return x.h; }) ? '<select class="vh" aria-label="Voting history"><option value="">All voting histories</option>' + HIST.map(function (h) { return '<option value="' + h[0] + '"' + (state.hist === h[0] ? ' selected' : '') + '>' + h[1] + '</option>'; }).join('') + '</select>' : '') +
        '<button type="button" class="exp">Export CSV</button></div>' +
        '<div class="sbar"><span class="sbl">Sort by</span>' + opt(0) + '<span class="sbl">then</span>' + opt(1) + '<span class="sbl">then</span>' + opt(2) + '</div>' +
        '<div class="tw vt"></div><div class="vcount"></div></div>';
    }
    function wireList(r) {
      var cured = state.list === 'cured', V = listRows();
      var qi = view.querySelector('#' + SLUG + '-vq'), vp = view.querySelector('.vp'), vs = view.querySelector('.vs'), box = view.querySelector('.vt'), cnt = view.querySelector('.vcount');
      if (cured || (vs && vs.value !== state.status)) { if (!cured) state.status = ''; }
      function filtered() {
        var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
        return V.filter(function (x) {
          if (state.party && x.party !== state.party) return false;
          if (!cured && state.status && x.status !== state.status) return false;
          if (state.race && x.race !== state.race) return false;
          if (state.eth && x.eth !== state.eth) return false;
          if (state.hist) { var hk = hkey(x); if (state.hist === 'low' ? !(hk === 'nv' || hk === '0' || hk === '1') : hk !== state.hist) return false; }
          if (!words.length) return true;
          var hay = x.hay || (x.hay = [x.name, x.ncid, x.county, x.precinct, x.home, x.mail_to].join(' ').toLowerCase());
          return words.every(function (w) { return hay.indexOf(w) !== -1; });
        }).sort(sorter(state.sorts, cured));
      }
      function heading() {
        var ks = state.sorts.filter(Boolean);
        view.querySelector('.vsorth').textContent = ks.length ? 'By ' + ks.map(function (k) { return sortLabel(k, cured).replace(/ \(least likely first\)/, ''); }).join(', then ').toLowerCase().replace(/\bnc\b/g, 'NC') : (cured ? 'Most recent return first' : 'Longest waiting first');
      }
      function draw() {
        heading();
        var rows = filtered(), LIM = 25, shown = state.all ? rows : rows.slice(0, LIM);
        if (!V.length) { box.innerHTML = '<div class="none">' + (cured ? 'No cured ballots here yet.' : 'No voters to list here.') + '</div>'; cnt.textContent = ''; view.querySelector('.exp').disabled = true; return; }
        var t = '<table class="cards vtab"><thead><tr><th>Voter</th>' + (cured ? '<th>Returned</th>' : '<th class="l">Status</th><th>Waiting</th>') + '<th class="l">Where they vote</th><th class="l">Home address</th><th class="l">Ballot mailed to</th></tr></thead><tbody>';
        shown.forEach(function (x) {
          var old = !cured && x.days !== '' && x.days >= STALE_DAYS;
          t += '<tr><td><span class="vn">' + esc(x.name) + '</span> ' + pbadge(x) + '<span class="vid">' + (x.age ? 'Age ' + esc(x.age) + ' · ' : '') + 'NCID ' + esc(x.ncid) + '</span>' + rtag(x) + (cured && htag(x) ? htag(x) : '') + '</td>' +
            (cured ? '<td data-l="Returned">' + (x.returned ? apDate(x.returned) : '') + '</td>'
              : '<td class="l" data-l="Status"><span class="pill">' + esc(STATUS[x.status]) + '</span>' + (htag(x) ? '<br>' + htag(x) : '') + '</td>' +
                '<td data-l="Waiting"><span' + (old ? ' class="old"' : '') + '>' + (x.days === '' ? '' : x.days + (x.days === 1 ? ' day' : ' days')) + '</span>' + (x.returned ? '<span class="vid">since ' + apDate(x.returned) + '</span>' : '') + '</td>') +
            '<td class="l" data-l="Votes in">' + esc(x.county) + ' · ' + esc(x.precinct) + '<span class="vid">CD ' + esc(x.cd) + ' · HD ' + esc(x.hd) + ' · SD ' + esc(x.sd) + '</span></td>' +
            '<td class="l" data-l="Home">' + esc(x.home) + '</td><td class="l' + (x.mail_to ? '' : ' same') + '" data-l="Mailed to">' + (x.mail_to ? esc(x.mail_to) : '<span style="color:var(--mute)">Home address</span>') +
            (x.delivery && x.delivery !== 'Mail' ? '<span class="vid">Sent by ' + esc(x.delivery.toLowerCase()) + '</span>' : '') + '</td></tr>';
        });
        t += '</tbody></table>';
        if (rows.length > LIM) t += '<button type="button" class="more vm">' + (state.all ? 'Show fewer' : 'Show all ' + fmt(rows.length)) + '</button>';
        box.innerHTML = t;
        var vm = box.querySelector('.vm'); if (vm) vm.addEventListener('click', function () { state.all = !state.all; draw(); });
        var cut = rows.length > LIM && !state.all ? ' Showing the first ' + LIM + '.' : '';
        cnt.textContent = (rows.length === V.length ? fmt(V.length) + (V.length === 1 ? ' voter' : ' voters') + ' listed.' : fmt(rows.length) + ' of ' + fmt(V.length) + ' voters match.') + cut + ' Export includes every voter that matches, in this order.';
      }
      each(view.querySelectorAll('.ltabs button'), function (b) {
        b.addEventListener('click', function () { if (state.list === b.getAttribute('data-list')) return; state.list = b.getAttribute('data-list'); state.all = false; var y = window.scrollY; show(); window.scrollTo(0, y); });
      });
      qi.addEventListener('input', function () { state.q = qi.value; state.all = false; draw(); });
      vp.addEventListener('change', function () { state.party = vp.value; state.all = false; draw(); });
      if (vs) vs.addEventListener('change', function () { state.status = vs.value; state.all = false; draw(); });
      var vh = view.querySelector('.vh'); if (vh) vh.addEventListener('change', function () { state.hist = vh.value; state.all = false; draw(); });
      var vr = view.querySelector('.vr'); if (vr) vr.addEventListener('change', function () { state.race = vr.value; state.all = false; draw(); });
      var ve = view.querySelector('.ve'); if (ve) ve.addEventListener('change', function () { state.eth = ve.value; state.all = false; draw(); });
      each(view.querySelectorAll('.sbar select'), function (s) {
        s.addEventListener('change', function () { state.sorts[+s.getAttribute('data-lvl')] = s.value; state.all = false; draw(); });
      });
      view.querySelector('.exp').addEventListener('click', function () {
        var cols = [['Name', 'name'], ['NCID', 'ncid'], ['Voter reg number', 'reg']].concat(cured ? [['Ballot returned', 'returned']] :
          [['Status', function (x) { return STATUS[x.status]; }], ['Days waiting', 'days'], ['Ballot returned', 'returned']]).concat([
          ['Party', function (x) { return x.pcode || x.party; }], ['Age', 'age'], ['County', 'county'], ['Precinct', 'precinct'], ['Congressional district', 'cd'], ['NC House district', 'hd'], ['NC Senate district', 'sd'],
          ['Home address', 'home'], ['Ballot mailed to', 'mail_to'], ['Delivery', 'delivery'],
          ['Race', function (x) { return x.race ? RNAME[x.race] || '' : ''; }], ['Ethnicity', function (x) { return x.eth ? ({ HL: 'Hispanic or Latino', NL: 'Not Hispanic or Latino', UN: 'Left blank' })[x.eth] : ''; }],
          ['Voted Nov. 2020 / 2022 / 2024', function (x) { return x.h ? x.h.split('').join(' ') : ''; }],
          ['Voting history', function (x) { var k = hkey(x); return k === 'nv' ? 'New Voter' : k ? 'Voted ' + k + ' of 3' : ''; }]]);
        var lines = [cols.map(function (c) { return c[0]; }).join(',')];
        filtered().forEach(function (x) {
          lines.push(cols.map(function (c) {
            var s = String(typeof c[1] === 'function' ? c[1](x) : (x[c[1]] == null ? '' : x[c[1]]));
            if (/^[=+\-@]/.test(s)) s = "'" + s;   // keep spreadsheets from treating a cell as a formula
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          }).join(','));
        });
        var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (cured ? 'cured-voters-' : 'cure-voters-') + LONG[state.geo](r.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + D.asof + '.csv';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 500);
      });
      draw();
    }

    function fill() {
      var k = state.geo;
      pick.hidden = k === 'state';
      if (k !== 'state') {
        sel.innerHTML = sorted(k).map(function (r) { return '<option value="' + esc(r.name) + '">' + esc(LONG[k](r.name)) + (r.wait ? ' (' + fmt(r.wait) + ')' : '') + '</option>'; }).join('');
        sel.value = state.sel[k];
      }
      state.allPl = false; state.all = false;
      show();
    }
    function setGeo(k) {
      state.geo = k;
      each(mount.querySelectorAll('.tabs button'), function (b) { var on = b.getAttribute('data-g') === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      fill();
    }

    /* Links to a view: #cure=county:Orange (or cd:4, hd:22, sd:9). */
    function hashKey() { return state.geo === 'state' ? 'state' : state.geo + ':' + state.sel[state.geo].replace(/^[A-Z]+ /, ''); }
    function setHash() { try { history.replaceState(null, '', '#' + (KEY ? 'key=' + encodeURIComponent(KEY) + '&' : '') + 'cure=' + encodeURIComponent(hashKey()).replace('%3A', ':')); } catch (e) { /* ignore */ } }
    function readHash() {
      var m = /cure=([^&]+)/.exec(location.hash || ''); if (!m) return;
      var p = decodeURIComponent(m[1]).split(':'), k = p[0];
      if (!places[k]) return;
      if (k !== 'state' && p[1]) {
        var want = p[1].toLowerCase();
        var hit = places[k].filter(function (r) { return r.name.toLowerCase() === want || r.name.replace(/\D/g, '') === want; })[0];
        if (hit) state.sel[k] = hit.name;
      }
      state.geo = k;
    }
    var copyBtn = q('.copy');
    copyBtn.addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#cure=' + encodeURIComponent(hashKey()).replace('%3A', ':');
      function done(ok) { copyBtn.textContent = ok ? 'Link copied' : url; setTimeout(function () { copyBtn.textContent = 'Copy link to this view'; }, 2500); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
    });

    each(mount.querySelectorAll('.tabs button'), function (b) { b.addEventListener('click', function () { setGeo(b.getAttribute('data-g')); }); });
    sel.addEventListener('change', function () { state.sel[state.geo] = sel.value; state.allPl = false; state.all = false; show(); });
    each(mount.querySelectorAll('.step'), function (b) {
      b.addEventListener('click', function () {
        var i = sel.selectedIndex + (+b.getAttribute('data-d')), n = sel.options.length;
        sel.selectedIndex = (i + n) % n; state.sel[state.geo] = sel.value; state.allPl = false; state.all = false; show();
      });
    });

    /* one search box across every county and district */
    var INDEX = [];
    ['county', 'cd', 'hd', 'sd'].forEach(function (k) {
      sorted(k).forEach(function (r) {
        var num = r.name.replace(/\D/g, '');
        var alias = k === 'county' ? '' : (k === 'cd' ? 'cd congressional congress district ' : k === 'hd' ? 'hd house nc house district ' : 'sd senate nc senate district ') + num;
        INDEX.push({ k: k, name: r.name, label: LONG[k](r.name), hay: (LONG[k](r.name) + ' ' + alias).toLowerCase(), num: num });
      });
    });
    var find = q('.findi'), res = q('.res'), hits = [], hi = -1;
    function match(s) {
      s = s.trim().toLowerCase(); if (!s) return [];
      var words = s.split(/\s+/);
      var out = INDEX.filter(function (e) { return words.every(function (w) { return /^\d+$/.test(w) ? e.num === w : e.hay.indexOf(w) !== -1; }); });
      out.sort(function (a, b) {
        var as = a.label.toLowerCase().indexOf(s) === 0 ? 0 : 1, bs = b.label.toLowerCase().indexOf(s) === 0 ? 0 : 1;
        return as - bs || (a.k === 'county' ? 0 : 1) - (b.k === 'county' ? 0 : 1);
      });
      return out.slice(0, 8);
    }
    function paint() {
      res.hidden = !hits.length; find.setAttribute('aria-expanded', hits.length ? 'true' : 'false');
      res.innerHTML = hits.map(function (e, i) { return '<div class="ro' + (i === hi ? ' on' : '') + '" role="option" id="' + SLUG + '-o' + i + '" aria-selected="' + (i === hi) + '" data-i="' + i + '">' + esc(e.label) + '</div>'; }).join('');
      if (hi >= 0) find.setAttribute('aria-activedescendant', SLUG + '-o' + hi); else find.removeAttribute('aria-activedescendant');
    }
    function choose(e) { state.sel[e.k] = e.name; find.value = ''; hits = []; hi = -1; paint(); setGeo(e.k); }
    find.addEventListener('input', function () {
      hits = match(find.value); hi = hits.length ? 0 : -1; paint();
      if (find.value.trim() && !hits.length) { res.hidden = false; res.innerHTML = '<div class="ro rnone">No county or district matches</div>'; }
    });
    find.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' && hits.length) { ev.preventDefault(); hi = (hi + 1) % hits.length; paint(); }
      else if (ev.key === 'ArrowUp' && hits.length) { ev.preventDefault(); hi = (hi - 1 + hits.length) % hits.length; paint(); }
      else if (ev.key === 'Enter' && hi >= 0) { ev.preventDefault(); choose(hits[hi]); }
      else if (ev.key === 'Escape') { hits = []; hi = -1; paint(); }
    });
    res.addEventListener('mousedown', function (ev) { var o = ev.target.closest('[data-i]'); if (o && hits[+o.getAttribute('data-i')]) { ev.preventDefault(); choose(hits[+o.getAttribute('data-i')]); } });
    find.addEventListener('blur', function () { setTimeout(function () { hits = []; hi = -1; paint(); }, 150); });

    readHash();
    setGeo(state.geo);
  }

  // No lock: the tracker loads the published data directly. Old links that still carry #key=... open normally.
  var KEY = '';
  mount.innerHTML = '<div class="kick">Carolina Forward · Staff and partners</div><p class="lockp">Opening the cure tracker…</p>';
  getJSON(VAULT + 'data.json').then(render).catch(function () {
    mount.innerHTML = '<div class="kick">Carolina Forward · Staff and partners</div><p class="lockp">The tracker couldn’t load just now. Check your connection and refresh.</p>';
  });
})();
