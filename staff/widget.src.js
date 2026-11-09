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
    var state = { geo: 'state', sel: { state: 'North Carolina' }, q: '', party: '', status: '', hist: '', all: false, allPl: false, list: 'wait', sorts: ['', '', ''], race: '', eth: '',
      mode: 'mail', pq: '', pgrp: 'act', pwhy: '', pst: '', pparty: '', pwhen: '', psort: '', pall: false };
    /* Provisional ballots (from the State Board's provisional file, once it's posted). */
    var P = D.prov || null, PN = {};
    if (P) {
      P.voters.forEach(function (v) {
        v.g = v.why >= 0 ? P.reasons[v.why][1] : 'rev';
        v.hay = [v.name, v.reg, v.county, v.precinct, v.rpct, v.home, v.phone].join(' ').toLowerCase();
        var need = v.st === 'pend' && (v.g === 'id' || v.g === 'num') ? 1 : 0;
        [['state', 'North Carolina'], ['county', v.county], ['cd', 'CD ' + v.cd], ['hd', 'HD ' + v.hd], ['sd', 'SD ' + v.sd]].forEach(function (kk) {
          var key = kk[0] + '|' + kk[1]; PN[key] = PN[key] || { n: 0, need: 0 }; PN[key].n++; PN[key].need += need;
        });
      });
    }
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
    if (P) h += '<div class="mode" role="group" aria-label="Which ballots"><button type="button" data-m="mail">Mail ballots</button><button type="button" data-m="prov">Provisional ballots</button></div>';
    h += '<div class="tabs" role="group" aria-label="Geography">';
    GEO.forEach(function (g) { h += '<button type="button" data-g="' + g[0] + '" aria-pressed="false">' + g[1] + '</button>'; });
    h += '</div><div class="find"><label class="findl" for="' + SLUG + '-find">Find a county or district</label>' +
      '<input id="' + SLUG + '-find" class="findi" type="search" autocomplete="off" placeholder="Type a county or district, e.g. Orange or House 22" role="combobox" aria-expanded="false" aria-controls="' + SLUG + '-res" aria-autocomplete="list">' +
      '<div id="' + SLUG + '-res" class="res" role="listbox" hidden></div></div>';
    h += '<div class="pick" hidden><button type="button" class="step" data-d="-1" aria-label="Previous">&#8249;</button><select class="sel" aria-label="Choose a place"></select><button type="button" class="step" data-d="1" aria-label="Next">&#8250;</button></div>';
    h += '<div class="view" aria-live="polite"></div>';
    h += '<details class="how mailhow"><summary>How this is counted</summary>' +
      '<p>Each voter is counted once. A voter with a returned mail ballot lands in one group: <b>voted in person instead</b> if an early in-person ballot was accepted; otherwise <b>accepted by mail</b> if a mail ballot was accepted; ' +
      'otherwise <b>waiting on the voter</b> if a ballot has a status that needs the voter to act; otherwise <b>not counted</b> if it was rejected. Ballots that were only spoiled, cancelled or duplicated are left out of all four.</p>' +
      '<p>Waiting on the voter covers every State Board status that needs the voter to act: ' + D.cure_keys.map(function (k) { return STATUS[k[0]]; }).join(', ') + '. ' +
      'A voter with more than one such ballot is listed under the most recent one. “Days waiting” counts from the day that ballot was returned to the file date.</p>' +
      '<p>Totals and the voter list cover the whole state. The State Board file doesn’t include phone numbers or say exactly what each “Pending Cure” ballot is missing; the county board’s notice to the voter does. Party is current registration.</p></details>';
    var SRC_MAIL = 'Source: <a href="https://www.ncsbe.gov/results-data/absentee-data" target="_blank" rel="noopener">NC State Board of Elections</a> absentee file. Analysis: Carolina Forward.';
    var SRC_PROV = 'Source: <a href="https://www.ncsbe.gov/results-data/absentee-and-provisional-data" target="_blank" rel="noopener">NC State Board of Elections</a> provisional file. Analysis: Carolina Forward.';
    h += '<div class="foot"><span class="src">' + SRC_MAIL + '</span>' +
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
      each(mount.querySelectorAll('.mode button'), function (b) { var on = b.getAttribute('data-m') === state.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      q('.mailhow').hidden = state.mode === 'prov'; q('.src').innerHTML = state.mode === 'prov' ? SRC_PROV : SRC_MAIL;
      if (state.mode === 'prov') { provShow(k, r); setHash(); return; }
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


    /* ================= Provisional ballots ================= */
    var PGROUP = [['id', 'Bring a photo ID', 'Must show an acceptable photo ID at the county board of elections office.'],
      ['num', 'May need to send ID information', 'Registration Repair (DL/SSN) and HAVA ID provisionals. Only voters whose number didn’t validate, or who left it out, need to act; the county board contacts them.'],
      ['rev', 'Board checking eligibility', 'The county board is researching registration, removal, a move or the address. The voter isn’t asked to bring anything, but proof of a registration attempt (a DMV or registration receipt) can help.'],
      ['na', 'No action expected', 'Photo ID exception forms, wrong-precinct ballots (counted for the contests the voter could vote in) and extended-hours ballots.']];
    var PGNAME = {}; PGROUP.forEach(function (g) { PGNAME[g[0]] = g[1]; });
    var PST = { pend: 'Pending', ok: 'Counted', part: 'Partly counted', no: 'Not counted' };
    var PSORTS = [['', 'County, precinct, name'], ['name', 'Name'], ['why', 'Reason'], ['party', 'Party'], ['voted', 'Date cast'], ['hd', 'NC House district']];
    function etDate(s) { return new Date(s + ':00-05:00'); }
    function apTime(s) {
      var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(s), h = +m[2];
      var t = h === 12 && m[3] === '00' ? 'noon' : (h % 12 || 12) + (m[3] === '00' ? '' : ':' + m[3]) + ' ' + (h < 12 ? 'a.m.' : 'p.m.');
      return t + ' ' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(m[1] + 'T12:00:00').getDay()] + ', ' + apDate(m[1]);
    }
    function provRows() { return P.voters.filter(inPlace); }
    function pcount(V, f) { var n = 0; V.forEach(function (x) { if (f(x)) n++; }); return n; }

    function provShow(k, r) {
      var V = provRows(), now = Date.now(), open = now < etDate(P.deadline);
      var pend = function (x) { return x.st === 'pend'; };
      var nId = pcount(V, function (x) { return x.g === 'id' && pend(x); }), nNum = pcount(V, function (x) { return x.g === 'num' && pend(x); });
      var nEd = pcount(V, function (x) { return x.voted === P.election_day; });
      var dec = pcount(V, function (x) { return !pend(x); });
      var v = '<div class="place">' + esc(LONG[k](r.name)) + '</div>';
      v += open ? '<div class="dl"><b>Deadline: ' + apTime(P.deadline) + '.</b> Voters who need to show a photo ID, or send a missing ID number, must reach the county board of elections office by then. County boards decide every provisional ballot at the county canvass, ' + apTime(P.canvass) + '.</div>'
        : '<div class="dl past"><b>The ID deadline passed at ' + apTime(P.deadline) + '.</b> County boards decide every provisional ballot at the county canvass, ' + apTime(P.canvass) + '. Statuses update as boards rule.</div>';
      v += '<div class="head"><span class="big">' + fmt(nId) + '</span><span class="hl">' + (nId === 1 ? 'voter needs' : 'voters need') + ' to bring a photo ID to the county board</span></div>';
      v += '<p class="dek">' + (V.length ? 'Another ' + fmt(nNum) + ' cast a Registration Repair or HAVA ID provisional and may need to send ID information by the same deadline. ' +
        fmt(V.length) + ' provisional ' + (V.length === 1 ? 'ballot was' : 'ballots were') + ' cast here in all, ' + fmt(nEd) + ' of them on Election Day.' : 'No provisional ballots were cast here.') + '</p>';
      v += '<div class="row">' + PGROUP.map(function (g, i) {
        var n = pcount(V, function (x) { return x.g === g[0] && pend(x); });
        return cell(g[1], n, i < 2 ? 'fix' : '', i < 2 ? 'Pending, deadline ' + apDate(P.deadline.slice(0, 10)) : 'Pending');
      }).join('') + cell('Decided', dec, dec ? 'ok' : '', dec ? fmt(pcount(V, function (x) { return x.st === 'ok' || x.st === 'part'; })) + ' counted in whole or part' : 'Boards haven’t ruled yet') + '</div>';
      v += provListBlock();
      v += provReasonBlock(V, dec);
      v += provNotCounted(V);
      v += provWhere(k, r, V);
      v += '<details class="how"><summary>How this is counted</summary>' +
        '<p>Each row in the State Board’s provisional file is one ballot. Ballots are grouped by the reason the poll worker recorded. <b>Bring a photo ID</b>: the voter didn’t show an acceptable ID and didn’t fill out an exception form. <b>May need to send ID information</b>: Registration Repair (DL/SSN) and HAVA ID provisionals; under the State Board’s Numbered Memo 2025-02, only voters whose driver’s license or Social Security number didn’t validate, or who left it blank, still need to act, and the file doesn’t say which. All three are due by ' + apTime(P.deadline) + '.</p>' +
        '<p>Districts come from the precinct the voter is registered in, or, for voters with no registration on file, the precinct they voted in. ' + fmt(P.unplaced) + ' statewide couldn’t be placed in a district. Provisional voters with no registration have no NCID or voting history. Party is as recorded on the provisional application. Election Day means the ballot was cast Nov. 3; the rest were cast during early voting.</p>' +
        '<p>Voters can check their ballot with the PIN from their provisional receipt at <a href="https://vt.ncsbe.gov/RegProvPIN/" target="_blank" rel="noopener">the State Board’s provisional search</a>.</p></details>';
      view.innerHTML = v;
      provWire(r);
      var mb = view.querySelector('.more.pl'); if (mb) mb.addEventListener('click', function () { state.allPl = !state.allPl; show(); });
      each(view.querySelectorAll('tr.go'), function (tr) {
        function go() { state.sel.county = tr.getAttribute('data-c'); setGeo('county'); if (mount.scrollIntoView) mount.scrollIntoView(); }
        tr.addEventListener('click', go);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      });
    }

    function provReasonBlock(V, dec) {
      if (!V.length) return '';
      var keys = PARTY.map(function (p) { return p[0]; });
      var t = '<div class="sec"><div class="sech">Why they voted provisionally<span>Reason as the poll worker recorded it</span></div><div class="tw"><table class="narrow"><thead><tr><th>Reason</th>' +
        PARTY.map(function (p) { return '<th>' + p[0] + '</th>'; }).join('') + '<th>Total</th>' + (dec ? '<th>Counted</th><th>Not counted</th>' : '') + '</tr></thead><tbody>';
      PGROUP.forEach(function (g) {
        var rows = P.reasons.map(function (re, i) { return [re, i]; }).filter(function (x) { return x[0][1] === g[0]; });
        var body = '', gt = [0, 0, 0, 0];
        rows.forEach(function (x) {
          var W = V.filter(function (v) { return v.why === x[1]; }); if (!W.length) return;
          var pc = keys.map(function (pk) { return pcount(W, function (v) { return v.party === pk; }); });
          pc.forEach(function (c, i) { gt[i] += c; });
          body += '<tr><td>' + esc(x[0][0]) + '</td>' + pc.map(function (c) { return '<td>' + fmt(c) + '</td>'; }).join('') + '<td><b>' + fmt(W.length) + '</b></td>' +
            (dec ? '<td>' + fmt(pcount(W, function (v) { return v.st === 'ok' || v.st === 'part'; })) + '</td><td>' + fmt(pcount(W, function (v) { return v.st === 'no'; })) + '</td>' : '') + '</tr>';
        });
        if (body) t += '<tr class="grp"><td colspan="' + (dec ? 8 : 6) + '">' + esc(g[1]) + '</td></tr>' + body;
      });
      return t + '<tr class="tot"><td>Total</td>' + keys.map(function (pk) { return '<td>' + fmt(pcount(V, function (v) { return v.party === pk; })) + '</td>'; }).join('') + '<td>' + fmt(V.length) + '</td>' +
        (dec ? '<td>' + fmt(pcount(V, function (v) { return v.st === 'ok' || v.st === 'part'; })) + '</td><td>' + fmt(pcount(V, function (v) { return v.st === 'no'; })) + '</td>' : '') + '</tr></tbody></table></div>' +
        '<p class="note">' + PGROUP.map(function (g) { return '<b>' + g[1] + ':</b> ' + g[2]; }).join(' ') + '</p></div>';
    }

    function provNotCounted(V) {
      var by = {}; V.forEach(function (x) { if (x.st === 'no') by[x.nc || 'No reason given'] = (by[x.nc || 'No reason given'] || 0) + 1; });
      var ks = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
      if (!ks.length) return '';
      return '<div class="sec"><div class="sech">Why ballots weren’t counted<span>As county boards recorded it</span></div><div class="tw"><table class="narrow"><thead><tr><th>Reason</th><th>Ballots</th></tr></thead><tbody>' +
        ks.map(function (k2) { return '<tr><td>' + esc(k2) + '</td><td>' + fmt(by[k2]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }

    function provWhere(k, r, V) {
      var by = {};
      V.forEach(function (x) {
        var key = k === 'state' ? x.county : k === 'county' ? x.precinct : x.county + ' · ' + x.precinct;
        if (!by[key]) by[key] = { name: key, link: k === 'state' ? x.county : '', n: 0, id: 0, num: 0, ed: 0 };
        var o = by[key]; o.n++; if (x.voted === P.election_day) o.ed++;
        if (x.st === 'pend' && x.g === 'id') o.id++; if (x.st === 'pend' && x.g === 'num') o.num++;
      });
      var rows = Object.keys(by).map(function (key) { return by[key]; });
      if (!rows.length) return '';
      rows.sort(function (a, b) { return (b.id + b.num) - (a.id + a.num) || b.n - a.n || a.name.localeCompare(b.name); });
      var LIM = 15, total = rows.length, shown = state.allPl ? rows : rows.slice(0, LIM), unit = k === 'state' ? 'County' : 'Precinct';
      var t = '<div class="sec"><div class="sech">' + (k === 'state' ? 'Where they are' : 'By precinct') + '<span>' + fmt(total) + ' ' + (unit === 'County' ? 'counties' : 'precincts') + ' with provisional ballots</span></div>' +
        '<div class="tw"><table class="cards"><thead><tr><th>' + unit + '</th><th>Provisional</th><th>Election Day</th><th>Photo ID</th><th>ID info</th></tr></thead><tbody>';
      shown.forEach(function (o) {
        t += '<tr' + (o.link ? ' class="go" tabindex="0" data-c="' + esc(o.link) + '"' : '') + '><td>' + esc(o.name) + '</td><td data-l="Provisional">' + fmt(o.n) + '</td><td data-l="Election Day">' + fmt(o.ed) + '</td>' +
          '<td data-l="Photo ID"><b>' + fmt(o.id) + '</b></td><td data-l="ID info">' + fmt(o.num) + '</td></tr>';
      });
      t += '</tbody></table></div>';
      if (total > LIM) t += '<button type="button" class="more pl">' + (state.allPl ? 'Show fewer' : 'Show all ' + total) + '</button>';
      return t + '<p class="note">' + (k === 'state' ? 'Select a county to see its precincts. ' : '') + 'Precinct is where the ballot was cast. Photo ID and ID info count pending ballots only.</p></div>';
    }

    function provListBlock() {
      var opts = function (list, cur) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); };
      var used = {}; provRows().forEach(function (x) { used[x.why] = 1; });
      return '<div class="sec"><div class="sech">Provisional voters<span>Phone numbers as written on the provisional application</span></div>' +
        '<div class="vbar"><label class="sr" for="' + SLUG + '-pq">Search provisional voters</label><input id="' + SLUG + '-pq" type="search" placeholder="Search name, reg number, precinct, address or phone" value="' + esc(state.pq) + '">' +
        '<select class="pg" aria-label="Action">' + opts([['act', 'Needs ID (photo ID or ID info)'], ['', 'All provisional voters']].concat(PGROUP.map(function (g) { return [g[0], g[1]]; })), state.pgrp) + '</select>' +
        '<select class="pw" aria-label="Reason"><option value="">All reasons</option>' + opts(P.reasons.map(function (re, i) { return [String(i), re[0]]; }).filter(function (o) { return used[+o[0]]; }), state.pwhy) + '</select>' +
        '<select class="ps2" aria-label="Status">' + opts([['', 'All statuses'], ['pend', 'Pending'], ['ok', 'Counted'], ['part', 'Partly counted'], ['no', 'Not counted']], state.pst) + '</select>' +
        '<select class="pp" aria-label="Party"><option value="">All parties</option>' + opts(PARTY.map(function (p) { return [p[0], p[1]]; }), state.pparty) + '</select>' +
        '<select class="pv" aria-label="When cast">' + opts([['', 'Election Day and early voting'], ['ed', 'Election Day only'], ['ev', 'Early voting only']], state.pwhen) + '</select>' +
        '<button type="button" class="exp">Export CSV</button></div>' +
        '<div class="sbar"><span class="sbl">Sort by</span><select class="pso" aria-label="Sort by">' + opts(PSORTS, state.psort) + '</select></div>' +
        '<div class="tw vt"></div><div class="vcount"></div></div>';
    }
    function provWire(r) {
      var V = provRows(), box = view.querySelector('.vt'), cnt = view.querySelector('.vcount');
      function filtered() {
        var words = state.pq.toLowerCase().split(/\s+/).filter(Boolean);
        var out = V.filter(function (x) {
          if (state.pgrp === 'act' ? !(x.g === 'id' || x.g === 'num') : state.pgrp && x.g !== state.pgrp) return false;
          if (state.pwhy !== '' && x.why !== +state.pwhy) return false;
          if (state.pst && x.st !== state.pst) return false;
          if (state.pparty && x.party !== state.pparty) return false;
          if (state.pwhen === 'ed' && x.voted !== P.election_day) return false;
          if (state.pwhen === 'ev' && x.voted === P.election_day) return false;
          return words.every(function (w) { return x.hay.indexOf(w) !== -1; });
        });
        var s = state.psort;
        out.sort(function (a, b) {
          var d = 0;
          if (s === 'name') d = a.name.localeCompare(b.name);
          else if (s === 'why') d = a.why - b.why;
          else if (s === 'party') d = (PORDER[a.party] == null ? 3 : PORDER[a.party]) - (PORDER[b.party] == null ? 3 : PORDER[b.party]);
          else if (s === 'voted') d = (b.voted || '').localeCompare(a.voted || '');
          else if (s === 'hd') d = (+a.hd || 999) - (+b.hd || 999);
          return d || ((a.g === 'id' ? 0 : 1) - (b.g === 'id' ? 0 : 1)) || a.county.localeCompare(b.county) || String(a.precinct).localeCompare(String(b.precinct), undefined, { numeric: true }) || a.name.localeCompare(b.name);
        });
        return out;
      }
      function draw() {
        var rows = filtered(), LIM = 25, shown = state.pall ? rows : rows.slice(0, LIM);
        view.querySelector('.exp').disabled = !rows.length;
        if (!rows.length) { box.innerHTML = '<div class="none">' + (V.length ? 'No provisional voters match.' : 'No provisional ballots here.') + '</div>'; cnt.textContent = ''; return; }
        var t = '<table class="cards vtab ptab"><thead><tr><th>Voter</th><th class="l">Reason</th><th class="l">Phone</th><th class="l">Cast</th><th class="l">Home address</th></tr></thead><tbody>';
        shown.forEach(function (x) {
          var re = x.why >= 0 ? P.reasons[x.why][0] : 'Unknown';
          t += '<tr><td><span class="vn">' + esc(x.name) + '</span> ' + pbadge(x) + '<span class="vid">' + (x.reg ? 'Reg no. ' + esc(x.reg) : 'No registration on file') + '</span>' + rtag(x) + '</td>' +
            '<td class="l" data-l="Reason"><span class="pill g' + x.g + '">' + esc(re) + '</span>' + (x.imp ? '<span class="vid">' + esc(x.imp) + '</span>' : '') +
            '<span class="vid pst ' + x.st + '">' + esc(PST[x.st] || x.st) + (x.nc ? ': ' + esc(x.nc.toLowerCase()) : '') + '</span></td>' +
            '<td class="l" data-l="Phone">' + (x.phone ? '<a href="tel:' + esc(x.phone.replace(/\D/g, '')) + '">' + esc(x.phone) + '</a>' : '<span style="color:var(--mute)">None given</span>') + '</td>' +
            '<td class="l" data-l="Cast">' + (x.voted ? (x.voted === P.election_day ? 'Election Day' : 'Early voting, ' + apDate(x.voted)) : 'Date not listed') + (x.curb ? ' (curbside)' : '') +
            '<span class="vid">' + esc(x.county) + ' · ' + esc(x.precinct) + (x.rpct ? ' (registered in ' + esc(x.rpct) + ')' : '') + '</span>' +
            (x.cd ? '<span class="vid">CD ' + esc(x.cd) + ' · HD ' + esc(x.hd) + ' · SD ' + esc(x.sd) + '</span>' : '') + '</td>' +
            '<td class="l" data-l="Home">' + esc(x.home) + '</td></tr>';
        });
        t += '</tbody></table>';
        if (rows.length > LIM) t += '<button type="button" class="more vm">' + (state.pall ? 'Show fewer' : 'Show all ' + fmt(rows.length)) + '</button>';
        box.innerHTML = t;
        var vm = box.querySelector('.vm'); if (vm) vm.addEventListener('click', function () { state.pall = !state.pall; draw(); });
        cnt.textContent = fmt(rows.length) + ' of ' + fmt(V.length) + ' provisional ' + (V.length === 1 ? 'voter' : 'voters') + ' here match.' + (rows.length > LIM && !state.pall ? ' Showing the first ' + LIM + '.' : '') + ' Export includes every voter that matches, in this order.';
      }
      var bind = function (sel, key, num) { var el = view.querySelector(sel); el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', function () { state[key] = el.value; state.pall = false; draw(); }); };
      bind('#' + SLUG + '-pq', 'pq'); bind('.pg', 'pgrp'); bind('.pw', 'pwhy'); bind('.ps2', 'pst'); bind('.pp', 'pparty'); bind('.pv', 'pwhen'); bind('.pso', 'psort');
      view.querySelector('.exp').addEventListener('click', function () {
        var cols = [['Name', 'name'], ['Voter reg number', 'reg'], ['Action', function (x) { return PGNAME[x.g]; }], ['Reason', function (x) { return x.why >= 0 ? P.reasons[x.why][0] : ''; }],
          ['State Board reason', function (x) { return x.why >= 0 ? P.reasons[x.why][2] : ''; }], ['Exception reason', 'imp'], ['Status', function (x) { return PST[x.st] || x.st; }], ['Not counted reason', 'nc'],
          ['Phone', 'phone'], ['Cast', function (x) { return x.voted === P.election_day ? 'Election Day' : x.voted ? 'Early voting' : ''; }], ['Date cast', 'voted'], ['Curbside', function (x) { return x.curb ? 'Yes' : ''; }],
          ['Party', function (x) { return x.pcode || x.party; }], ['County', 'county'], ['Precinct voted in', 'precinct'], ['Precinct registered in', function (x) { return x.rpct || (x.reg ? x.precinct : ''); }],
          ['Congressional district', 'cd'], ['NC House district', 'hd'], ['NC Senate district', 'sd'], ['Home address', 'home'],
          ['Race', function (x) { return x.race ? RNAME[x.race] || '' : ''; }], ['Ethnicity', function (x) { return x.eth ? ({ HL: 'Hispanic or Latino', NL: 'Not Hispanic or Latino', UN: 'Left blank' })[x.eth] : ''; }]];
        var lines = [cols.map(function (c) { return c[0]; }).join(',')];
        filtered().forEach(function (x) {
          lines.push(cols.map(function (c) {
            var s = String(typeof c[1] === 'function' ? c[1](x) : (x[c[1]] == null ? '' : x[c[1]]));
            if (/^[=+\-@]/.test(s)) s = "'" + s;
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          }).join(','));
        });
        var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'provisional-voters-' + LONG[state.geo](r.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + D.asof + '.csv';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 500);
      });
      draw();
    }

    function fill() {
      var k = state.geo;
      pick.hidden = k === 'state';
      if (k !== 'state') {
        sel.innerHTML = sorted(k).map(function (r) {
          var c = state.mode === 'prov' ? ((PN[k + '|' + r.name] || {}).need || 0) : r.wait;
          return '<option value="' + esc(r.name) + '">' + esc(LONG[k](r.name)) + (c ? ' (' + fmt(c) + ')' : '') + '</option>';
        }).join('');
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
    function modeHash() { return state.mode === 'prov' ? '&ballots=provisional' : ''; }
    function setHash() { try { history.replaceState(null, '', '#' + (KEY ? 'key=' + encodeURIComponent(KEY) + '&' : '') + 'cure=' + encodeURIComponent(hashKey()).replace('%3A', ':') + modeHash()); } catch (e) { /* ignore */ } }
    function readHash() {
      if (P && /ballots=prov/.test(location.hash || '')) state.mode = 'prov';
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
      var url = location.href.split('#')[0] + '#cure=' + encodeURIComponent(hashKey()).replace('%3A', ':') + modeHash();
      function done(ok) { copyBtn.textContent = ok ? 'Link copied' : url; setTimeout(function () { copyBtn.textContent = 'Copy link to this view'; }, 2500); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
    });

    each(mount.querySelectorAll('.tabs button'), function (b) { b.addEventListener('click', function () { setGeo(b.getAttribute('data-g')); }); });
    each(mount.querySelectorAll('.mode button'), function (b) { b.addEventListener('click', function () { if (state.mode !== b.getAttribute('data-m')) { state.mode = b.getAttribute('data-m'); fill(); } }); });
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
