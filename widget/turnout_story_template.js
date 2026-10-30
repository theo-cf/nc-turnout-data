/* NC Turnout Tracker - self-activating embed for carolinaforward.org
   Usage: in the post body, insert a Code Block (CMS "+" menu -> Code Block) containing only:
     nc-turnout-tracker
   Data: aggregates only (no voter names, addresses or IDs), built daily from the NCSBE absentee file
   by github.com/theo-cf/nc-turnout-data. Falls back to the embedded copy if the live file can't load.
   Links to a place: add #nc-turnout=county:Orange (or cd:4, hd:22, sd:9) to the post URL. */
(function () {
  var SLUG = 'nc-turnout-tracker';
  var DATA_URL = /*__URL__*/null;
  var EMBEDDED = /*__DATA__*/null;
  var BASE = /*__BASE__*/null;
  var BASED = /*__BASED__*/null;
  var DMAP = /*__DMAP__*/null;   // today's district shapes (district_map.json, loaded next to data.json for district views)   // past years for today's districts (baseline_districts.json, loaded next to data.json when a district is picked)
  var XT = /*__XT__*/null, XT18 = /*__XT18__*/null, XT20 = /*__XT20__*/null, XT24 = /*__XT24__*/null;   // 2022 comparison for the shareable graphics (xtab2022.json, loaded next to data.json when needed)   // 2022 and 2024 comparison baselines (baseline.json, loaded next to data.json)
  var EV_START = '2026-10-15';
  var LOOKUP = 'https://vt.ncsbe.gov/RegLkup/';
  var SITE_MIN = 25;   // a single site's party and age breakdown appears once it has this many early votes
  var PROP_MIN = 100, LP_MIN = 50;   // votes in a party before its low-propensity share shows; low-propensity voters (now and then) before a comparison shows
  var RACE_MIN = 25, RACE_SPLIT = 0.05;   // fewer votes than this and a group shows a dash; smaller groups get their own row at 5% of registered voters
  var CF_LOGO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAB4AHgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5nooor3jzQoqa3tLq7cpaW0s7AZKxIWIH0FTnR9XHXSr7/vw3+FZyrU4u0pJP1NoYerNc0INryTKVFWn03UYxmTT7tf8AehYf0qu0cif6yN0/3lI/nTjUhL4WmTKjUh8UWvkNooHPTmirMwooooAv6Ja/bfENpbkZUyBm+g5P8q9T6nNcP4Htd+o3N4RxFGEB92P+AruK+oyely0efuz43Pq3PiFBfZQUUUV6x4YUUUUAeO0UUV8Cfpw+KWWCZZoZHjkU5V0Ygg+xFeieFfHrTSpp2uyAO3yx3fQE+j/4/n615xRXn5hltDHU+Sqtej6o9fKM6xWVVVUw8tOq6P1/z3PofLf3j+dNZVcYdQw/2hmuM8AeIn1CwbSbyTdc2y5jdjy8fT8x/LFdpX5PjsJUwVeVGpuvx8z98yzMKOZYWGJpbS6dn1RnXWg6LeDFzpVnJ7+UAfzGKw734daBcgm1NxZsenlvvX8m/wAa62iqoZliqH8Oo189PuJxWS4DFL99Ri/kr/fueU6l8O9atA0li8V/GOyfI/8A3yev4GuTnt57adoLmGSGVeqSKVI/A19BVT1HStP1W28jULSOdexYfMv0PUV9HguL60PdxUeZd1o/8vyPjMz8PcPUTngZuD7PVffuvxOJ8IWv2fw0kpGGncyH6dB/Kt6rZ0dbO0SKz5iiUKEY8gAeveqasroHRgykZDKcg1+05JmmEx+Gi8JPmstV1Xqj+dOJckzDKsXKOPpuLk3Z7pryezFooor2D54KKKKAPHaKKK+BP04KKKKANHQdQbSvElnfKSFSQB/dTww/I17r9Dmvnhvun6V7/YSNLpNrK3JeFGJ9yor4PjOik6VZbu6+7b9T9V8N8TJxr4d7KzXzun+SLFFFU9Vvl0zRLrUHAYQRF9p7nsPzxXxVOEqklCO70P0urVjSg6k3ZJXfyI9T1zStGQNqN7HCWGVT7zt9FHNZNt4+8NXM3lm6lgycBp4iqn8RnH415Ld3dzfXsl5dytLNK252J6//AFvaoa/QaHB+HVO1WbcvLRfkfkWK8RMY6zeHpxUOzu2/V3PQfHPi1ZEOi6VOGRh/pE8ZyGB/gUjt6n8PWqnw10vX9d8TrpmmSbbJf3l08oJjiT1H+0egA6/QGuPtLW4vr6Gys4WmuJ3EcUSDlmJwAK+tPAvhC28G+EIdLj2PdPiW7nUf62Ujn8B0Ht9aMyzGHDODjTwj/ey2f5yf+X/BODDYSrxbjpVscv3S3XRLpFfq9/wPPdb8O6joVxtuo98LHCTpyrf4H2NZNe9TQQ3Nu8FxEksTjDI4yCPpXmHivwi+ju19YBpLEn5geWhPofVff86+h4Q8QaeZyjg8faNXo+kv8n+D6dj4/jLw6qZXGWNwF5UVut3H/Nee669zlKKKK/TT8tPHaKKK+BP04KKKKADaW+Vep4FfQNtF5FjBB/zzjVPyAFeKeGbA6l4ssbXblPNDv/ur8x/lXuGcnPrXwXGdZOdKkuib+/8A4Y/V/DjDNU6+IezaS+Wr/NBWJ4wiebwNqSRgkiLdgegIJ/QGtumuiSRNHIoZGBVlPcHgivjsNV9jVhV7NP7j9ExmH+s4epQvbmTX3qx890VteJPD1z4f1ZoWRmtXJME3Zl9D/tD0rFr9ow9eGIpqrTd0z+bMXhauFrSoVlaSdmei/C3RfE6X7eMtB0e11RbGQ25tZpRG77k5aNjwGAI/76r2qHxrrJAW5+HHiiN+4jWGQD8d4zXlfws+KGj+F9FHh7WrSSC3Mzyi+i+cAtj769cDA5GfpXvGm6rpesWa3WlX9tewsMh4JA/546fjX5ZxVOssXKWJw947Rlrt6p2/U/T+FYUXhIxw2ItLeUdN/Rq/6GLH4n1ucgQ+AddXPe4lt4h+slRaj4h160s2e+8OabZwsCP9N1VTv9tqRsTUnijxbDoitZ2ipNfkfdP3Yh6t6n2/OvMLu8ur+7a6vLh5pW6u5z+A9B7Cva4W4HqZrGOLxFNUqW6+LmfmtdF5/cjwOLOPKWUyeEw83Vq9fh5Y+T01fkvmyOaQS3csiW0VuhclIopGkVR7FgD+YoplFfvNGmqVONNNuytrq/mz+fq9V1akqjSV3ey0XyR47RRRXwp+khRRV3SotNk1JDq1y0FovzPsQsz/AOyMdM+tRUnyRcmr27amlGk6s1BNK/fRfNne/DjRWgtJdbnTDTDyoM/3AeW/EjH4V3lclB488P7UtrC01CVUAVI4LbIAHQAZrXtdd+1AFdF1lAe8lrgfzr8pzali8RXliK0Gr7X6LofvWQVsvwmFhhMPVUrbtdX1ZrUU1H3oG2uuezjB/KnV4jVj6VO6uiG6tba9tWtruCOeF/vJIuQa8k8baNp+i67Db6crokkPmMjPuCncRx3xxXsNeWfEtSPFNsx6G1GPwZq+o4UrVFjFTUnytPTofD8e4ek8udZwXOmlfqlfucZWjoVpLe67DbwyyRbjukeNipCjk8j8vxrOrrPAsIN5eXJHKoqA/U5/pX6rhKKrVo05LRn4TjsRLD0JVI7r9dDtQMADnjjk5NLRRX2iSSsj89bcndhRRRTEeO1JBbz3U6wW0Mk0jdEjUsT+Ars9F+HN7clZ9ZlNpF18lMGQ/U9F/U16Fpmk6do9t5GnWqQr/Ew5Zvq3U1+NZjxRhsNeFH35fh9/+R/QuT8DY3GWqYn93Dz+J/Lp8/uPN9L+HWr3e2TUJI7CM/wn55PyHA/E12On+BfDtgFZ7VryQfx3Lbhn/dHFdJRXxmM4gxuK0c+Vdlp/wfxP0jLuEsswNnGnzS7y1/4H4DIYYbeMR28UcSDosahR+lPoorxm23dn0kYqKtFWQUUUUhhXB/EzTml0+z1NFz5LGGTHYNyD+Yx+Nd5UF7aQX+nTWV0m6GZCjj29vfvXflmMeDxMK/Z6+mzPKzvLlmOCqYXrJaeq1X4ngFdt4FA+w3p7+av/AKCa5rW9GutC1d7K6BI+9HJjiRexH9R2Nb3gWUCW+gzyQjgfQkf1FfuOTVoVa0KkHdPb7j+YuIMNUo0KlKqrSjuvmjs6KKK+yPz8KKKKAOkooor+TT+8gooooAKKKKACiiigAooooAz9Z0Wx1zTjaX0eQOUkXhoz6g/071wun+GNV8OeKVd0+0WUitH9pjHA7jcP4TkfSvSqbIgkiZD0YYr6HIM/rZXXg73p3V1+dj5HirhPDZ3hp6Wq2dmu9tE+6/I52ilZSjlG6g4NJX9HxkppSjsz+PZwlCThJWaCiiiqJOkooor+TT+8gooooAKKKKACiiigAooooAKKKKAMjU4tl0JAOHGfxqlRRX9GcHYidfJ6E6j1s18k2l+CP5A8QsLTw3EGKhSVk2n85JSf4thRRRX0x8Yf/9k=';   // Carolina Forward cardinal, used in the brand strip, section credits, map and graphics
  var CF_URL = 'carolinaforward.org';
  var TRACK_URL = 'carolinaforward.org/news/the-carolina-forward-turnout-tracker';   // printed on every downloaded image

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

  if (!document.getElementById(SLUG + '-fonts')) {
    var link = document.createElement('link');
    link.id = SLUG + '-fonts'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  /* Styling follows carolinaforward.org itself: white page, Zilla Slab display type, Inter text,
     red uppercase kickers, navy, hairline rules. The site has no dark mode, so neither does this. */
  var S = '.' + SLUG;
  if (!document.getElementById(SLUG + '-style')) {
    var style = document.createElement('style');
    style.id = SLUG + '-style';
    style.textContent = [
      S + '{--navy:#253551;--ink:#1a1a1a;--soft:#3a3a3a;--mute:#6b6b6b;--rule:#d8d2c4;--red:#A50000;--parch:#F4EFE5;--up:#1F6B45;--upbg:#E3F1E8;--dnbg:#F7E3E3;',
      '--ev:#1F4A2C;--ml:#9AA7B8;--pd:#2E6DB4;--pr:#B83A32;--pu:#8C8577;--po:#CFC9BC;--a1:#C9D3E3;--a2:#8DA0C0;--a3:#52688F;--a4:#253551;',
      'color-scheme:light;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;color:var(--ink);background:transparent;margin:40px 0;font-size:16px;line-height:1.5}',
      S + ' *{box-sizing:border-box}',
      S + ' .tt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
      S + ' button,' + S + ' input,' + S + ' select{font-family:inherit}',
      S + ' :focus-visible{outline:2px solid var(--navy);outline-offset:2px}',
      /* kicker, matching the site's red uppercase labels */
      S + ' .tt-kick{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--red);margin-bottom:14px}',
      S + ' .tt-kick:before{content:"";width:18px;height:1px;background:var(--red)}',
      /* controls */
      S + ' .tt-ctl{display:block}',
      S + ' .tt-tabs{display:flex;gap:4px;border-bottom:2px solid var(--navy);overflow-x:auto;scrollbar-width:none}',
      S + ' .tt-tabs button{flex:none;background:var(--parch);border:1px solid var(--rule);border-bottom:0;border-radius:3px 3px 0 0;padding:11px 18px 10px;font-size:14px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--soft);cursor:pointer}',
      S + ' .tt-tabs button:hover{background:#ece5d6;color:var(--ink)}',
      S + ' .tt-tabs button.on{background:var(--navy);border-color:var(--navy);color:#fff}',
      S + ' .tt-find{position:relative;margin-top:16px}' + S + ' .tt-findl{display:block;font-size:14px;font-weight:700;color:var(--ink);margin-bottom:6px}',
      S + ' .tt-findi{width:100%;height:50px;border:2px solid var(--navy);border-radius:3px;background:#fff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2720%27 height=%2720%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23253551%27 stroke-width=%272.5%27 stroke-linecap=%27round%27%3E%3Ccircle cx=%2711%27 cy=%2711%27 r=%277%27/%3E%3Cpath d=%27M20 20l-4-4%27/%3E%3C/svg%3E") no-repeat 14px center;font-size:17px;padding:0 14px 0 44px;color:var(--ink);-webkit-appearance:none}' + S + ' .tt-findi:focus{outline:3px solid #c9d4e6;outline-offset:0}',
      S + ' .tt-findi::placeholder{color:var(--mute)}',
      S + ' .tt-res{position:absolute;left:0;right:0;top:100%;z-index:5;background:#fff;border:1px solid var(--ink);max-height:300px;overflow:auto}',
      S + ' .tt-ro{padding:9px 12px;cursor:pointer;font-size:15px;border-top:1px solid var(--rule)}' + S + ' .tt-ro:first-child{border-top:0}',
      S + ' .tt-ro.on,' + S + ' .tt-ro:hover{background:var(--parch)}' + S + ' .tt-rnone{color:var(--mute);cursor:default}',
      S + ' .tt-pick{display:flex;align-items:center;gap:8px;margin-top:14px}' + S + ' .tt-pick[hidden]{display:none}',
      S + ' .tt-sel{flex:1;min-width:0;height:38px;border:1px solid var(--rule);border-radius:2px;background:#fff;color:var(--ink);font-size:15px;padding:0 8px}',
      S + ' .tt-step{height:38px;width:38px;border:1px solid var(--rule);border-radius:2px;background:#fff;color:var(--ink);font-size:18px;line-height:1;cursor:pointer}',
      S + ' .tt-step:hover{border-color:var(--ink)}',
      /* headline figure */
      S + ' .tt-view{margin-top:22px}',
      S + ' .tt-brand{display:flex;flex-wrap:wrap;align-items:center;gap:4px 9px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid var(--navy)}' + S + ' .tt-brand img{width:26px;height:26px;border-radius:4px;flex:none}' + S + ' .tt-brand b{font-family:"Zilla Slab",Georgia,serif;font-size:19px;font-weight:700;color:var(--navy)}' + S + ' .tt-brand span{font-size:12px;font-weight:600;letter-spacing:.3px;color:var(--mute)}' + S + ' .tt-sec:not(.tt-gfx)::after{content:"Carolina Forward \u00B7 ' + CF_URL + '";display:table;margin:10px 0 0 auto;padding-left:19px;min-height:14px;line-height:14px;background:url(' + CF_LOGO + ') left center/14px 14px no-repeat;font:600 11px Inter,sans-serif;color:var(--mute)}' + 
      S + ' .tt-cmpnote{font-size:12px;color:var(--mute);margin:6px 0 10px}' + S + ' .tt-vreg{display:grid;grid-template-columns:repeat(3,auto) 1fr;align-items:end;gap:4px 24px;margin:12px 0 14px;padding:10px 0;border-top:1px solid var(--rule)}' + S + ' .tt-vreg div span{display:block;font:700 11px Inter,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mute)}' + S + ' .tt-vreg div b{font:700 26px "Zilla Slab",Georgia,serif}' + S + ' .tt-vreg p{grid-column:1/-1;margin:2px 0 0;font-size:13px;color:var(--soft)}' + S + ' .tt-vreg .tt-q{width:16px;height:16px;font-size:10px;margin-left:4px}' + '@media (max-width:600px){' + S + ' .tt-vreg{grid-template-columns:repeat(3,1fr);gap:4px 10px}' + S + ' .tt-vreg div b{font-size:22px}}' + S + ' .tt-yrhint{margin:2px 0 8px;font-size:13px;font-weight:600;color:var(--navy)}' + S + ' .tt-yrhint::before{content:"\\2191\\00A0"}' +
      S + ' .tt-crow{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 10px}' + S + ' .tt-crow>.tt-ypl:first-child{min-width:94px}' + S + ' .tt-crow .tt-who button{min-height:34px}' + S + ' .tt-sech+.tt-crow{margin-top:2px}' + S + ' .tt-crow+:not(.tt-crow){margin-top:14px}' +
      S + ' .tt-yin{vertical-align:middle;margin-left:6px}' + S + ' .tt-yin button{padding:2px 8px;font-size:11px;min-height:24px}' +
      '@media (max-width:600px){' + S + ' .tt-crow>.tt-ypl:first-child{flex:1 0 100%;min-width:0;margin-bottom:-2px}' + S + ' .tt-crow .tt-who,' + S + ' .tt-shh .tt-yin{display:flex;flex-wrap:wrap;border:0;gap:5px;overflow:visible}' + S + ' .tt-crow .tt-who button,' + S + ' .tt-shh .tt-yin button{border:1px solid var(--navy);border-radius:2px}' + S + ' .tt-crow .tt-who button+button,' + S + ' .tt-shh .tt-yin button+button{border-left:1px solid var(--navy)}' + S + ' .tt-shh .tt-yin{margin:6px 0 0}}' + S + ' .tt-lpmix{margin:12px 0 6px}' + S + ' .tt-lpmix.v .tt-lpr{grid-template-columns:48px 1fr 52px}' + S + ' .tt-lpt{font-size:12px;font-weight:600;color:var(--soft);font-variant-numeric:tabular-nums;text-align:right}' + S + ' .tt-yscap{margin:2px 0 0;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--mute)}' + S + ' .tt-lpr{display:grid;grid-template-columns:48px 1fr;align-items:center;gap:10px;margin:5px 0;padding:3px 4px;border:2px solid transparent;border-radius:3px}' +
      S + ' .tt-lpr.on{border-color:var(--navy)}' + S + ' .tt-lpy{font-weight:700;font-size:14px;color:var(--soft)}' + S + ' .tt-lpr.now .tt-lpy,' + S + ' .tt-lpr.on .tt-lpy{color:var(--ink);font-weight:800}' +
      S + ' .tt-lpb{display:flex;height:28px;border-radius:2px;overflow:hidden}' + S + ' .tt-lpr:not(.now):not(.on) .tt-lpb{opacity:.55;height:22px}' + S + ' .tt-lpr:not(.now):not(.on) .tt-lpb i{color:#111 !important}' +
      S + ' .tt-lpb i{display:flex;align-items:center;justify-content:center;font:700 12px Inter,sans-serif;font-style:normal;color:#fff}' +
      S + ' .tt-lpk{display:flex;flex-wrap:wrap;gap:4px 16px;margin:6px 0 4px 62px;font-size:13px;color:var(--soft)}' + S + ' .tt-lpk i{display:inline-block;width:10px;height:10px;margin-right:6px;border-radius:1px}' +
      S + ' .tt-lpmix+.tt-lpk+.tt-pfoot{margin-bottom:22px}' +
      S + ' .tt-yp{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 14px}' + S + ' .tt-ypl{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--mute)}' + S + ' .tt-yp .tt-who button{min-height:32px}' + S + ' .tt-place{font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--soft)}',
      S + ' .tt-head{font-family:"Zilla Slab",Georgia,serif;color:var(--ink);margin:2px 0 8px;line-height:1.05}',
      S + ' .tt-big{display:block;font-size:76px;font-weight:600;letter-spacing:-1.5px;font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1}',
      S + ' .tt-hl{display:block;font-size:24px;font-weight:500;margin-top:2px}',
      S + ' .tt-dek{max-width:62ch;font-size:15px;color:var(--soft);margin:0}',
      S + ' .tt-reg{font-size:17px;color:var(--soft);margin:-2px 0 8px}' + S + ' .tt-reg b{color:var(--navy);font-weight:700}',
      S + ' .tt-yrs{margin:14px 0 6px;font-size:14px}' + S + ' .tt-yr{display:grid;grid-template-columns:44px minmax(40px,1fr) 150px 72px;gap:10px;align-items:center;width:100%;background:none;border:0;border-radius:3px;padding:4px 6px;margin:2px 0;font:inherit;color:inherit;text-align:left}' + S + ' button.tt-yr{cursor:pointer}' + S + ' button.tt-yr:hover{background:#F4F1EA}' + S + ' .tt-yr.on{box-shadow:inset 0 0 0 2px var(--navy)}',
      S + ' .tt-yl{font-weight:600;color:var(--soft);font-variant-numeric:tabular-nums}' + S + ' .tt-yr.now .tt-yl,' + S + ' .tt-yr.on .tt-yl{font-weight:800;color:var(--ink)}' + S + ' .tt-ybar{display:block;height:20px}' + S + ' .tt-ybar i{display:block;height:100%;background:#C9CFDA;border-radius:1px}' + S + ' .tt-yr.now .tt-ybar i{background:var(--navy)}' + S + ' .tt-yr.on .tt-ybar i{background:#8C9AB3}',
      S + ' .tt-yv{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--soft)}' + S + ' .tt-yv b{color:var(--ink)}' + S + ' .tt-yr .tt-chip{justify-self:end}' + S + ' .tt-sharetot{margin:2px 0 0;font-size:15px;color:var(--soft)}' + S + ' .tt-calsec .tt-pace{margin-top:12px}' + S + ' .tt-calsec .tt-sharetot{margin-top:6px}' + S + ' .tt-sharetot b{color:var(--navy)}',
      '@media (max-width:600px){' + S + ' .tt-yr{grid-template-columns:38px minmax(24px,1fr) auto 64px;gap:8px;padding:4px 4px}' + S + ' .tt-yv{font-size:13px}}',
      S + ' .tt-cmp{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;margin:14px 0 8px;font-size:14px}',
      S + ' .tt-by{color:var(--soft);font-weight:600;font-variant-numeric:tabular-nums}',
      S + ' .tt-bb{display:flex;align-items:center;height:22px;min-width:0}' + S + ' .tt-bb i{display:block;height:100%;border-radius:1px;flex:none}' + S + ' .tt-bb i.now{background:var(--navy)}' + S + ' .tt-bb i.was{background:#C9CFDA}',
      S + ' .tt-bb b{margin-left:8px;font-variant-numeric:tabular-nums;white-space:nowrap}' + S + ' .tt-braw{margin-left:5px;color:var(--soft);font-variant-numeric:tabular-nums;white-space:nowrap}',
      S + ' .tt-cd{grid-column:1/-1;font:700 18px/1.3 "Zilla Slab",Georgia,serif;margin-top:2px}' + S + ' .tt-cd.up{color:var(--up)}' + S + ' .tt-cd.dn{color:var(--red)}',
      S + ' .tt-vs{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mute);margin:2px 0 10px}',
      S + ' .tt-seg{display:inline-flex;border:1px solid var(--navy);border-radius:2px;overflow:hidden}',
      S + ' .tt-seg button{background:#fff;border:0;padding:4px 11px;font-size:12px;font-weight:700;color:var(--navy);cursor:pointer}',
      S + ' .tt-seg button+button{border-left:1px solid var(--navy)}' + S + ' .tt-seg button.on{background:var(--navy);color:#fff}',
      S + ' .tt-dots{display:grid;grid-template-columns:118px 1fr 112px;align-items:center;row-gap:14px;column-gap:12px;margin-top:16px}',
      S + ' .tt-dsub{font-size:14px;color:var(--soft);margin:18px 0 0}',
      S + ' .tt-dg{font-size:14px;font-weight:600;line-height:1.25}',
      S + ' .tt-trk{position:relative;height:22px}' + S + ' .tt-trk:before{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:var(--rule)}',
      S + ' .tt-dot{position:absolute;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;z-index:2}',
      S + ' .tt-dot.was{background:#fff;border:2px solid;z-index:1;width:12px;height:12px;margin:-6px 0 0 -6px}',
      S + ' .tt-conn{position:absolute;top:50%;height:3px;margin-top:-1.5px;opacity:.35}',
      S + ' .tt-dv{font-size:14px;text-align:right;font-variant-numeric:tabular-nums}' + S + ' .tt-dv b{font-size:16px}' + S + ' .tt-dv span{display:block;font-size:12px;color:var(--mute);margin-top:3px}',
      S + '.tt-storymode>*:not(.tt-kick):not(.tt-story){display:none !important}',
      S + ' .tt-story{border-top:3px solid var(--navy);border-bottom:1px solid var(--rule);padding:16px 0 18px;outline:none}',
      S + ' .tt-sprog{display:flex;gap:4px;margin-bottom:18px}' + S + ' .tt-sprog i{flex:1;height:4px;background:var(--rule);border-radius:2px}' + S + ' .tt-sprog i.on{background:var(--navy)}',
      S + ' .tt-sstage{min-height:190px;display:flex;flex-direction:column;justify-content:center}',
      S + ' .tt-sbig{font:700 76px/1 "Zilla Slab",Georgia,serif;letter-spacing:-1px;font-variant-numeric:tabular-nums}' + S + ' .tt-shl{font:500 24px "Zilla Slab",Georgia,serif;margin-top:4px}',
      S + ' .tt-scmp{margin:0}' + S + ' .tt-scmp .tt-bb{height:34px}' + S + ' .tt-scmp .tt-by{font-size:16px}' + S + ' .tt-scmp .tt-bb b{font-size:17px}',
      S + ' .tt-grow{width:0;transition:width .9s cubic-bezier(.2,.7,.2,1)}' + S + ' .tt-grow-h{height:0;transition:height .7s cubic-bezier(.2,.7,.2,1)}' + S + ' .tt-fade{opacity:0;transition:opacity .3s .7s}',
      S + ' .tt-story.still .tt-grow,' + S + ' .tt-story.still .tt-grow-h,' + S + ' .tt-story.still .tt-fade{transition:none}',
      S + ' .tt-ssec{font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--mute);margin:18px 0 0}' + S + ' .tt-sbar .tt-ps{width:0}' + S + ' .tt-sbar{display:flex}',
      S + ' .tt-scal{display:grid;grid-template-columns:repeat(17,1fr);gap:3px;align-items:end;height:150px}',
      S + ' .tt-scol{display:flex;flex-direction:column;justify-content:flex-end;height:100%}' + S + ' .tt-scol i{display:block;background:#B9C4B6;border-radius:1px 1px 0 0}' + S + ' .tt-scol.last i{background:var(--ev)}',
      S + ' .tt-scol.f i{height:100% !important;background:repeating-linear-gradient(135deg,#f3efe6 0 3px,#fff 3px 6px)}' + S + ' .tt-scol span{font-size:10px;color:var(--mute);text-align:center;margin-top:3px}' + S + ' .tt-scol.last span{color:var(--ink);font-weight:700}',
      S + ' .tt-scap{font:700 24px/1.25 "Zilla Slab",Georgia,serif;color:var(--ink);margin:18px 0 6px}' + S + ' .tt-scap b{color:var(--navy)}' + S + ' .tt-scap b.tt-sup{color:var(--up)}' + S + ' .tt-scap b.tt-sdn{color:var(--red)}',
      S + ' .tt-ssub{font-size:14px;color:var(--soft);margin:0 0 16px;min-height:4.5em}',
      S + ' .tt-snav{display:flex;align-items:center;gap:12px;flex-wrap:wrap}' + S + ' .tt-snav button{font:600 14px Inter,sans-serif;cursor:pointer;border-radius:2px;padding:10px 16px}',
      S + ' .tt-snext{margin-left:auto;background:var(--navy);color:#fff;border:1px solid var(--navy)}' + S + ' .tt-sback{background:#fff;color:var(--navy);border:1px solid var(--navy)}' + S + ' .tt-sback[disabled]{opacity:.35;cursor:default}',
      S + ' .tt-snav .tt-sskip{display:none}' + S + ' .tt-sskip{display:block;width:100%;margin:0 0 22px;padding:20px 16px;background:#D8C7A0;border:0;border-radius:4px;color:var(--navy);text-align:center;cursor:pointer;box-shadow:0 3px 0 #A8956B}',
      S + ' .tt-ssk1{display:block;font:700 26px/1.15 "Zilla Slab",Georgia,serif}' + S + ' .tt-ssk2{display:block;font:600 16px/1.3 Inter,sans-serif;margin-top:4px;opacity:.95}',
      S + ' .tt-sskip:hover{background:#CBB78C}' + S + ' .tt-sskip:focus-visible{outline:3px solid var(--navy);outline-offset:3px}' + S + ' .tt-sskip:active{transform:translateY(2px);box-shadow:0 1px 0 #A8956B}',
      S + ' .tt-sgo{align-self:flex-start;background:var(--navy);color:#fff;border:0;border-radius:2px;padding:14px 20px;font:700 17px Inter,sans-serif;cursor:pointer}',
      S + ' .tt-footb{display:flex;gap:16px;flex-wrap:wrap}' + S + ' .tt-replay{background:none;border:0;padding:0;font:inherit;font-size:13px;color:var(--soft);text-decoration:underline;cursor:pointer}',
      '@media (max-width:600px){' + S + ' .tt-ssk1{font-size:24px}' + S + ' .tt-sskip{padding:18px 12px}' + S + ' .tt-sbig{font-size:60px}' + S + ' .tt-scap{font-size:21px}' + S + ' .tt-snav button{padding:10px 12px}}',
      S + ' .tt-shs{margin:16px 0 4px}' + S + ' .tt-shh{font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--mute);margin:0 0 4px}',
      S + ' .tt-sh{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-top:1px solid var(--rule);font-size:15px;line-height:1.4}' + S + ' .tt-sh:last-child{border-bottom:1px solid var(--rule)}',
      S + ' .tt-sh i{flex:none;width:11px;height:11px;border-radius:2px;display:inline-block;transform:translateY(1px)}' + S + ' .tt-shu{color:var(--up);font-weight:700}' + S + ' .tt-shd{color:var(--red);font-weight:700}' + S + ' .tt-she{color:var(--soft);font-weight:700}',
      S + ' .tt-score{margin-top:12px}' + S + ' .tt-srow{display:grid;grid-template-columns:1fr auto 100px;align-items:center;gap:2px 14px;padding:10px 0;border-top:1px solid var(--rule)}' + S + ' .tt-srow:last-child{border-bottom:1px solid var(--rule)}',
      S + ' .tt-scn{font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px}' + S + ' .tt-scn i{display:inline-block;width:12px;height:12px;border-radius:2px;flex:none}',
      S + ' .tt-scbig{font:700 26px/1 "Zilla Slab",Georgia,serif;text-align:right;font-variant-numeric:tabular-nums}' + S + ' .tt-sv{text-align:right}' + S + ' .tt-sv .tt-chip{font-size:14px;padding:6px 8px}',
      S + ' .tt-swas{grid-column:2/4;text-align:right;font-size:12px;color:var(--mute)}',
      '@media (max-width:600px){' + S + ' .tt-srow{grid-template-columns:1fr auto 84px;gap:2px 10px}' + S + ' .tt-scbig{font-size:23px}}',
      S + ' .tt-pq{font:700 19px/1.3 "Zilla Slab",Georgia,serif;margin:4px 0 2px}' + S + ' .tt-pqs{font-size:14px;color:var(--soft);margin:0 0 12px}',
      S + ' .tt-prow{display:grid;grid-template-columns:150px 1fr auto;align-items:center;gap:6px 14px;padding:13px 0;border-top:1px solid var(--rule)}' + S + ' .tt-prow:last-of-type{border-bottom:1px solid var(--rule)}',
      S + ' .tt-ppn{font-weight:700;display:flex;align-items:center;gap:8px}' + S + ' .tt-ppn i{display:inline-block;width:12px;height:12px;border-radius:2px}',
      S + ' .tt-pbig{font:700 34px/1 "Zilla Slab",Georgia,serif;font-variant-numeric:tabular-nums}' + S + ' .tt-pbig.dash{color:var(--mute)}' + S + ' .tt-pbs{font-size:13px;color:var(--soft);margin-top:4px}',
      S + ' .tt-pver{text-align:right}' + S + ' .tt-pver .tt-chip{font-size:15px;padding:7px 10px}' + S + ' .tt-pwas{display:block;font-size:12px;color:var(--mute);margin-top:5px}',
      '',
      S + ' .tt-lr{display:grid;grid-template-columns:150px minmax(60px,1fr) 210px;gap:10px;align-items:center;padding:8px 0;border-top:1px solid #ECE7DC}' + S + ' .tt-ll{font-weight:600;font-size:14px}' + S + ' .tt-ll i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:0}',
      S + ' .tt-lb{display:block;height:14px;background:#ECE7DC}' + S + ' .tt-edb{position:relative}' + S + ' .tt-edb s{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1.5px;background:#253551;text-decoration:none}' + S + ' .tt-lb i{display:block;height:100%;opacity:.85}' + S + ' .tt-lv{text-align:right;font-size:13px;color:var(--soft);font-variant-numeric:tabular-nums}' + S + ' .tt-lv b{font-size:16px;color:var(--ink)}' + S + ' .tt-lv em{display:block;font-style:normal;font-size:12px;color:var(--mute)}',
      S + ' .tt-xtw{overflow-x:auto}' + S + ' .tt-xt{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}' + S + ' .tt-xt th{text-align:left;font-weight:700;padding:7px 6px;border-top:1px solid #ECE7DC}' + S + ' .tt-xt thead th{text-align:right;font-size:12px;color:var(--mute);border-top:0}',
      S + ' .tt-xt td{text-align:right;padding:7px 6px;border-top:1px solid #ECE7DC}' + S + ' .tt-xt td b{display:block;font-size:15px}' + S + ' .tt-xt td span{display:block;font-size:12px;color:var(--mute)}',
      '@media (max-width:600px){' + S + ' .tt-lr{grid-template-columns:1fr auto;gap:4px 10px}' + S + ' .tt-lb{grid-column:1/-1;grid-row:2}}',
      S + ' .tt-cands{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;font-size:14px;margin:2px 0 12px;color:var(--ink)}' + S + ' .tt-cands .tt-candl{font:700 11px Inter,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mute)}' +
        S + ' .tt-cands .tt-cp{display:inline-block;min-width:17px;padding:1px 4px;margin-right:5px;border-radius:2px;color:#fff;font:700 11px Inter,sans-serif;text-align:center;vertical-align:1px}' + S + ' .tt-cands small{color:var(--mute);font-size:12px;margin-left:4px}',
      S + ' .tt-rkpast{display:block;font-size:11px;color:var(--mute);font-weight:400}' + S + ' .tt-rkx{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}' + S + ' .tt-rkx .tt-rkxg{flex:1 0 100%;font:700 10px Inter,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--mute);margin-top:4px}' +
        S + ' .tt-rkx button{background:#fff;border:1px solid var(--rule);border-radius:3px;padding:5px 9px;font:500 13px Inter,sans-serif;color:var(--ink);cursor:pointer}' + S + ' .tt-rkx button.on{background:var(--navy);border-color:var(--navy);color:#fff}' + S + ' .tt-rkx .tt-linkbtn{border:0;background:none;padding:5px 2px}',
      S + ' .tt-psbar{display:flex;height:10px;width:100%;min-width:70px;border-radius:2px;overflow:hidden;background:#ECE7DC}' + S + ' .tt-psbar i{display:block;height:100%}' + S + ' .tt-rkt td small.tt-psd{display:block;font-size:11px;color:var(--mute);font-weight:400}' + S + ' .tt-rkt tr.now td{font-weight:700}' + S + ' .tt-rkt.tt-fit{min-width:0}' + S + ' .tt-rkt.tt-fit th{white-space:normal;vertical-align:bottom;font-size:12.5px;line-height:1.25}' + S + ' .tt-pssel{font:500 14px Inter,sans-serif;padding:5px 6px;border:1px solid var(--rule);border-radius:3px;background:#fff;color:var(--ink)}' + S + ' .tt-dps{margin-top:22px;padding-top:14px;border-top:1px solid var(--rule)}' + S + ' .tt-dps h4{font:700 17px "Zilla Slab",Georgia,serif;color:var(--navy);margin:0 0 8px}',
      S + ' .tt-rkw{overflow-x:auto}' + S + ' .tt-rkt{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums;min-width:560px}',
      S + ' .tt-rkt th{text-align:right;padding:0;border-bottom:1px solid var(--rule)}' + S + ' .tt-rkt th:first-child,' + S + ' .tt-rkt td:first-child{text-align:left}' + S + ' .tt-rkt th button{background:none;border:0;padding:7px 6px;font:700 11px Inter,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mute);cursor:pointer;white-space:nowrap}' + S + ' .tt-rkt th.on button{color:var(--navy)}' + S + ' .tt-rkt th:not(.on) button:not(.tt-q)::after,' + S + ' .tt-srtd th:not(.on) .tt-sbtn::after,' + S + ' th.tt-dth:not(.asc):not(.desc)::after{content:" \\2195";opacity:.4}' +
      S + ' .tt-sbtn{background:none;border:0;padding:0;font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit;cursor:pointer;white-space:nowrap}' + S + ' .tt-srtd th.on .tt-sbtn{color:var(--navy)}' +
      S + ' th.tt-dth{cursor:pointer;white-space:nowrap}' + S + ' th.tt-dth.asc::after{content:" \\25B2";color:var(--navy)}' + S + ' th.tt-dth.desc::after{content:" \\25BC";color:var(--navy)}',
      S + ' .tt-rkt td{text-align:right;padding:8px 6px;border-bottom:1px solid #ECE7DC;white-space:nowrap}' + S + ' .tt-rkt tr.go{cursor:pointer}' + S + ' .tt-rkt tr.go:hover{background:#F4F1EA}' + S + ' .tt-rkt tr.me{background:#EEF1F6;font-weight:700}',
      S + ' .tt-rkn{display:inline-block;min-width:28px;color:var(--mute);font-size:12px}' + S + ' .tt-na{color:var(--mute)}' + S + ' .tt-rkt .tt-chip{font-size:13px;padding:3px 6px}',
      S + ' .tt-map svg.zoomed path[data-c]{stroke-width:.25}' + S + ' .tt-map svg.zoomed path.sel{stroke-width:.9}' + S + ' .tt-map svg.zoomed .tt-mlines{stroke-width:.15}' + S + ' .tt-map svg.zoomed .tt-mapmark,' + S + ' .tt-map svg.zoomed g[aria-hidden]{display:none}',
      S + ' .tt-mwrap{position:relative}' + S + ' .tt-zctl{display:flex;justify-content:flex-end;gap:4px;margin-top:6px}' + S + ' .tt-zctl button{min-width:34px;height:34px;padding:0 8px;border:1px solid var(--navy);background:#fff;color:var(--navy);font:700 18px/1 Inter,sans-serif;border-radius:3px;cursor:pointer}' + S + ' .tt-zctl .tt-zrs{font-size:13px}' + S + ' .tt-zctl button:focus-visible{outline:2px solid var(--navy);outline-offset:2px}' + S + ' .tt-canpan svg{cursor:grab;touch-action:none}' + S + ' .tt-canpan svg:active{cursor:grabbing}' + S + ' .tt-map svg.uzoom path{vector-effect:non-scaling-stroke}' + S + ' .tt-map svg.uzoom path[data-c]{stroke-width:.6px}' + S + ' .tt-map svg.uzoom path.sel{stroke-width:2px}' + S + ' .tt-map svg.uzoom .tt-mapmark,' + S + ' .tt-map svg.uzoom g[aria-hidden]{display:none}' + S + ' .tt-mtip{display:none;position:absolute;pointer-events:none;background:#fff;border:1px solid var(--rule);border-radius:3px;padding:4px 8px;font-size:13px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:4}' + S + ' .tt-mtip b{color:var(--navy)}',
      S + ' .tt-mcard{position:absolute;z-index:6;width:300px;background:#fff;border-radius:6px;box-shadow:0 10px 30px rgba(0,0,0,.22);padding:16px 18px 18px;font-size:14px}' + S + ' .tt-mcard.wide{position:relative;width:auto;margin-top:10px;box-shadow:0 4px 16px rgba(0,0,0,.14)}',
      S + ' .tt-mcx{position:absolute;right:8px;top:6px;background:none;border:0;font-size:22px;line-height:1;color:var(--mute);cursor:pointer;padding:4px 8px}' + S + ' .tt-mcn{font:700 20px "Zilla Slab",Georgia,serif;color:var(--navy);padding-right:24px}',
      S + ' .tt-mch{display:flex;align-items:center;gap:12px;margin:8px 0 8px}' + S + ' .tt-mcbig{font:700 40px/1 "Zilla Slab",Georgia,serif;color:var(--navy)}' + S + ' .tt-mcs{font-size:13px;line-height:1.35;color:var(--soft)}',
      S + ' .tt-mcg{margin-top:12px;border-top:1px solid var(--rule)}' + S + ' .tt-mcr{display:grid;grid-template-columns:1fr auto auto;gap:4px 10px;align-items:baseline;padding:7px 0;border-bottom:1px solid #ECE7DC}' + S + ' .tt-mcl{font-size:13px;color:var(--soft)}' + S + ' .tt-mcrace{margin-top:12px}' + S + ' .tt-mcrh{font:700 12px Inter,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--mute);margin-bottom:4px}' +
      S + ' .tt-mcard:has(.tt-mcrace){width:330px}' + S + ' .tt-mcard.wide:has(.tt-mcrace){width:auto}' + S + ' .tt-mcrace table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}' + S + ' .tt-mcrace th,' + S + ' .tt-mcrace td{padding:4px 0 4px 3px;text-align:right;border-bottom:1px solid #ECE7DC;white-space:nowrap}' +
      S + ' .tt-mcrace thead th{font-size:10px;font-weight:700;letter-spacing:.2px;text-transform:uppercase;color:var(--mute)}' + S + ' .tt-mcrace tbody th{text-align:left;padding-left:0;font-weight:600}' + S + ' .tt-mcrace tbody th i{display:inline-block;width:9px;height:9px;margin-right:5px;border-radius:1px}' +
      S + ' .tt-mcrace td{font-weight:700}' + S + ' .tt-mcrace td.up{color:var(--up)}' + S + ' .tt-mcrace td.dn{color:var(--red)}' + S + ' .tt-mcrace tr.on th,' + S + ' .tt-mcrace tr.on td{background:#F4F1EA}' + S + ' .tt-mcrace p{margin:6px 0 0;font-size:11.5px;line-height:1.35;color:var(--mute)}' + S + ' .tt-mcv{font-weight:700;font-size:15px;font-variant-numeric:tabular-nums}' + S + ' .tt-mcw{font-size:13px;color:var(--mute);font-variant-numeric:tabular-nums;min-width:74px;text-align:right}',
      S + ' .tt-whodl{display:block;margin:16px 0 0}' + S + ' .tt-topdl{margin:4px 0 22px}' + S + ' .tt-topdl .tt-whodl{margin:0}' + S + ' .tt-exsp{height:14px}' + S + ' .tt-whomsg{font-size:13px;color:var(--mute);margin:6px 0 0}' +
      S + '.tt-exp{position:fixed;left:-10000px;top:0;width:640px;padding:36px 36px 28px;background:#fff;color:var(--ink)}' + S + '.tt-exp45{width:540px;height:675px;box-sizing:border-box;padding:30px 32px 0;overflow:hidden}' + S + '.tt-exp45 .tt-exb{overflow:hidden}' + S + '.tt-exp45 .tt-exf{position:absolute;left:32px;right:32px;bottom:22px;margin:0}' + S + '.tt-exp45 .tt-ext{font-size:30px}' + S + '.tt-exp45.wide{width:720px;height:900px;padding:40px 44px 0}' + S + '.tt-exp45.wide .tt-exf{left:44px;right:44px;bottom:28px}' + S + '.tt-exp45.wide .tt-ext{font-size:36px}' + S + '.tt-exp45 .tt-exs{margin-bottom:14px;padding-bottom:12px}' + S + ' .tt-exk span{flex:1}' + S + ' .tt-exk em{font-style:normal;color:var(--mute);letter-spacing:1px}' + S + '.tt-exp .tt-sec{margin:0;padding:0;border:0}' + S + '.tt-exp .tt-sec::after{display:none}' + S + '.tt-exp *{font-variant-numeric:normal !important;font-feature-settings:normal !important}' + S + '.tt-exp .tt-yr.on{box-shadow:none !important;border:2px solid var(--navy);padding:2px 4px}' +
      S + ' .tt-exk{display:flex;align-items:center;gap:10px;font:800 12px Inter,sans-serif;letter-spacing:2.2px;text-transform:uppercase;color:var(--red)}' + S + ' .tt-exk i{display:block;width:26px;height:3px;background:var(--red)}' +
      S + ' .tt-ext{font:700 32px/1.12 "Zilla Slab",Georgia,serif;color:var(--navy);margin:12px 0 6px}' + S + ' .tt-exs{font:400 15px/1.4 Inter,sans-serif;color:var(--soft);margin:0 0 18px;padding-bottom:16px;border-bottom:2px solid var(--navy)}' +
      S + ' .tt-exf{display:flex;align-items:center;gap:12px;margin-top:22px;padding-top:14px;border-top:1px solid var(--rule)}' + S + ' .tt-exf img{width:38px;height:38px;border-radius:4px;flex:none}' +
      S + ' .tt-exf b{display:block;font:700 18px "Zilla Slab",Georgia,serif;color:var(--navy)}' + S + ' .tt-exf span{display:block;font:600 12px Inter,sans-serif;color:var(--mute)}' + S + ' .tt-exf p{flex:1;margin:0;font:400 11.5px/1.4 Inter,sans-serif;color:var(--mute)}' + S + ' .tt-exf{flex-wrap:wrap;row-gap:6px}' + S + ' .tt-exf .tt-exu{flex:1 0 100%;font:600 11px Inter,sans-serif;color:var(--navy);white-space:nowrap}' +
      S + ' .tt-mgo{width:100%;margin-top:14px}' + S + ' .tt-mapdl{margin-top:10px;background:#fff;color:var(--navy);border:1px solid var(--navy)}' + S + ' .tt-rkt th{white-space:nowrap;vertical-align:bottom}' + '@media (max-width:820px){' + S + ' .tt-hide-m{display:none}' + S + ' .tt-rkt th button{padding-left:4px;padding-right:4px}}' + S + ' .tt-rkt th button{display:inline-block;vertical-align:middle}' + S + ' .tt-rkt th button.tt-q{border:1px solid var(--navy);border-radius:50%;width:16px;height:16px;min-height:0;padding:0;margin:0 4px 0 0;color:var(--navy);font-size:10px;letter-spacing:0;vertical-align:middle}' + S + ' .tt-ypl .tt-q{width:16px;height:16px;font-size:10px;margin-left:5px;vertical-align:-3px}' + S + ' .tt-segq{display:flex;align-items:center;gap:8px;min-width:0;flex:0 1 auto}' + S + ' .tt-segq .tt-who{min-width:0}' + S + ' .tt-segq .tt-q{flex:0 0 auto;margin-left:0}' + S + ' .tt-sec{scroll-margin-top:84px}' + S + ' .tt-rkw{background:linear-gradient(90deg,#fff 30%,rgba(255,255,255,0)) left/24px 100% no-repeat local,linear-gradient(270deg,#fff 30%,rgba(255,255,255,0)) right/24px 100% no-repeat local,radial-gradient(farthest-side at 100% 50%,rgba(0,0,0,.18),rgba(0,0,0,0)) right/10px 100% no-repeat scroll;background-color:#fff}' + S + ' .tt-dlrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}' + S + ' .tt-dlrow .tt-whodl{margin:0}' + S + ' .tt-shdl.tt-csvdl{background:#fff;color:var(--navy);border:1px solid var(--navy)}' + S + ' .tt-mapdls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}' + S + ' .tt-mapdls .tt-shdl{margin:0}' + S + ' .tt-mapdll{font:700 12px Inter,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mute);margin-right:2px}' + S + ' .tt-mapdl small{font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;opacity:.8;margin-left:4px}' + S + ' .tt-mapdls{flex-direction:column;align-items:flex-start;gap:6px}' + S + ' .tt-dlg{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}' + S + ' .tt-dlk{font:600 13px Inter,sans-serif;color:var(--soft);min-width:84px}' + '@media (max-width:600px){' + S + ' .tt-dlk{flex:1 0 100%}}' + S + ' .tt-mapdls .tt-shdl,' + S + ' .tt-mapdls .tt-shdl.tt-csvdl{background:var(--navy);color:#fff;border:0;margin:0}' + S + ' .tt-map::after{margin:12px auto 0 0 !important}' + '@media (max-width:600px){' + S + ' .tt-mapdll{flex:1 0 100%}' + S + ' .tt-mapdls .tt-csvdl{margin-left:0}}' + S + ' .tt-dlrow .tt-csvdl{background:var(--navy);color:#fff;border:0}' + S + ' .tt-csvonly{display:none}' + S + ' .tt-ptt th .tt-q{margin-left:2px}' + S + ' .tt-csvdl{margin-top:8px;background:#fff;color:var(--navy);border:1px solid var(--navy)}' + S + ' .tt-map .tt-msub{margin:-4px 0 10px}',
      S + ' .tt-map svg{display:block;width:100%;height:auto;margin-top:4px}' + S + ' .tt-map path{stroke:#fff;stroke-width:.8;cursor:pointer}' + S + ' .tt-map svg.pct path{stroke-width:.6px;vector-effect:non-scaling-stroke}' + S + ' .tt-map svg.pct path:hover{stroke:#1a1a1a;stroke-width:1.5px}' + S + ' .tt-map .tt-pwrap svg{max-height:640px}' + S + ' .tt-daybar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:10px 0 14px;padding:9px 12px;background:var(--bg,#fff);border:1px solid var(--rule);border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,.06)}' +
      S + ' .tt-daybar label{display:flex;align-items:center;gap:8px;min-width:0;max-width:100%;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}' +
      S + ' .tt-daybar select{font:600 14px/1.2 inherit;font-family:inherit;text-transform:none;letter-spacing:0;padding:6px 28px 6px 9px;border:1px solid var(--ink);border-radius:2px;background:#fff;color:var(--ink);max-width:100%;min-width:0}' +
      S + ' .tt-daybar.on{background:#FFF4D6;border-color:#C9A23A}' + S + ' .tt-daybar.on select{border-color:#8A6A12;font-weight:700}' +
      S + ' .tt-daymsg{font-size:14px;color:var(--ink)}' + S + ' .tt-dayx{font:700 13px inherit;font-family:inherit;padding:6px 10px;border:1px solid var(--ink);background:#fff;border-radius:2px;cursor:pointer;color:var(--ink)}' +
      S + ' .tt-mclp{padding:7px 0;border-bottom:1px solid var(--rule)}' + S + ' .tt-mclpv{font-size:14px;margin-top:3px}' + S + ' .tt-mclp .tt-mcw{display:block;margin-top:2px}' +
      S + ' .tt-spark i.h{background:#C9A23A!important}' + S + ' .tt-mleg{flex-wrap:wrap;row-gap:6px}' + S + ' .tt-nl{display:inline-flex;align-items:center;gap:5px;margin-left:12px;font-size:12px;color:var(--mute)}' + S + ' .tt-nl i{display:inline-block;width:14px;height:12px;border-radius:2px}' +
      S + ' .tt-nl i.h{background:repeating-linear-gradient(45deg,#F1EDE4 0 3px,#B9B09F 3px 5px)}' + S + ' .tt-nl i.g{background:#E6E1D6}' +
      S + ' .tt-pace{font-size:14px;color:var(--ink);margin:6px 0 0;padding:8px 10px;background:#F4F1EA;border-left:3px solid var(--navy)}' + S + ' .tt-dmode button{font-size:12px!important}' +
      S + ' .tt-calavg{margin:8px 0 0;font-size:12px;color:var(--ink);border-top:1px solid #efeae0;padding-top:6px}' + S + ' .tt-cal.party .tt-d.sel .tt-b,' + S + ' .tt-cal.party .tt-d.lock .tt-b{filter:brightness(.85)}' +
      S + ' .tt-secbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 6px}' +
      S + ' .tt-ptag{display:inline-block;padding:3px 8px;border-radius:2px;background:#EEF1F6;border:1px solid #C9D1DE;color:var(--navy);font-size:12px;font-weight:700;letter-spacing:.03em}' +
      S + ' .tt-tostate{margin-left:auto;font:700 12px inherit;font-family:inherit;letter-spacing:.03em;padding:3px 8px;border:1px solid var(--rule);background:#fff;color:var(--navy);border-radius:2px;cursor:pointer}' +
      S + ' .tt-tostate:hover{border-color:var(--navy)}' + S + ' .tt-about{font:600 12px inherit;font-family:inherit;padding:3px 2px;border:0;background:none;color:var(--navy);text-decoration:underline;text-underline-offset:2px;cursor:pointer}' +
      S + ' .tt-secbar .tt-about:first-child{margin-left:auto}' + S + ' .tt-secbar .tt-about + .tt-tostate{margin-left:6px}' +
      S + ' details.tt-how p.tt-flash{animation:ttflash 2.4s ease-out}' + '@keyframes ttflash{0%,30%{background:#FFF4D6}100%{background:transparent}}' +
      S + ' .tt-q{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-left:6px;border-radius:50%;border:1px solid var(--navy);background:#fff;color:var(--navy);font:700 11px/1 inherit;font-family:inherit;cursor:pointer;vertical-align:middle;padding:0}' +
      S + '.tt-qpop{position:fixed;z-index:60;max-width:280px;background:#fff;border:1px solid var(--rule);border-radius:3px;box-shadow:0 4px 14px rgba(0,0,0,.18);padding:10px 12px;font-size:13px;line-height:1.4;color:var(--ink)}' + S + ' .tt-dtag{display:inline-block;margin:0;padding:3px 8px;border-radius:2px;background:#FFF4D6;border:1px solid #C9A23A;color:#5E4708;font-size:12px;font-weight:700;letter-spacing:.03em}' +
      S + ' .tt-dtag.off{background:#F1EEE7;border-color:var(--rule);color:var(--mute);font-weight:600}' +
      S + ' .tt-msel{font:600 13px/1.2 inherit;font-family:inherit;padding:7px 30px 7px 10px;border:1px solid var(--ink);border-radius:2px;background:#fff;color:var(--ink);max-width:100%}' + S + ' .tt-map path:hover{stroke:var(--ink);stroke-width:1.6}' + S + ' .tt-map path.sel{stroke:var(--ink);stroke-width:2.4}',
      S + ' .tt-minfo{font-size:14px;color:var(--soft);min-height:2.8em;margin-top:6px}' + '' + S + ' .tt-eth{margin-top:28px;padding-top:16px;border-top:1px solid var(--rule)}' + S + ' .tt-eh{font:700 17px "Zilla Slab",Georgia,serif;color:var(--navy);margin:0}' + S + ' .tt-es{font-size:13px;color:var(--mute);margin:2px 0 10px}' + S + ' .tt-ewarn{font-size:14px;background:var(--parch,#F4F1EA);padding:10px 12px;margin:12px 0 0;color:var(--soft)}' + S + ' .tt-shtabs{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px}' + S + ' .tt-shtabs button{background:#fff;border:1px solid var(--navy);border-radius:2px;padding:7px 12px;font:700 13px Inter,sans-serif;color:var(--navy);cursor:pointer}' + S + ' .tt-shtabs button.on{background:var(--navy);color:#fff}' + S + ' .tt-shcv canvas{display:block;width:100%;max-width:540px;height:auto;border:1px solid var(--rule)}' + S + ' .tt-shbtns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' + S + ' .tt-shdl{background:var(--navy);color:#fff;border:0;border-radius:2px;padding:12px 18px;font:700 14px Inter,sans-serif;letter-spacing:.4px;text-transform:uppercase;cursor:pointer;min-height:44px}' + S + ' .tt-shdl.tt-shall{background:#fff;color:var(--navy);border:1px solid var(--navy)}' + S + ' .tt-shnote{font-size:12px;color:var(--mute);margin:8px 0 0}' + S + ' .tt-msub{margin:10px 0 2px}' + S + ' .tt-mleg{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mute);margin-top:4px}' + S + ' .tt-mleg i{flex:1;max-width:260px;height:10px;border-radius:2px}' + S + ' .tt-mnote{font-size:12px;color:var(--mute);margin:6px 0 0}',
      S + ' .tt-pq2{margin-top:26px}' + S + ' .tt-ssubt{font-size:14px;color:var(--soft);margin:-4px 0 12px}',
      S + ' .tt-pfoot{font-size:13px;color:var(--mute);margin:12px 0 0}',
      '@media (max-width:600px){' + S + ' .tt-prow{grid-template-columns:1fr auto}' + S + ' .tt-prow .tt-ppn{grid-column:1/-1}' + S + ' .tt-pbig{font-size:30px}' + S + ' .tt-who button{padding-left:8px;padding-right:8px}' + S + ' .tt-sech:has(.tt-who){flex-wrap:wrap}' + S + ' .tt-sech .tt-who{flex:1 0 100%;display:flex;flex-wrap:wrap;gap:4px;border:0;overflow:visible}' + S + ' .tt-sech .tt-who button{flex:1 1 auto;border:1px solid var(--navy);border-radius:2px}' + S + ' .tt-sech .tt-who button+button{border-left:1px solid var(--navy)}' + S + ' .tt-sech .tt-who button{flex:1 1 auto}' + '' + '' + '}',
      S + ' .tt-natab{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0 14px;font-variant-numeric:tabular-nums}' + S + ' .tt-natab th{text-align:right;font-weight:600;color:var(--mute);font-size:11px;letter-spacing:.5px;text-transform:uppercase;padding:4px 0 4px 8px;border-bottom:1px solid var(--ink)}',
      S + ' .tt-natab th:first-child,' + S + ' .tt-natab td:first-child{text-align:left;padding-left:0}' + S + ' .tt-natab td{text-align:right;padding:6px 0 6px 8px;border-bottom:1px solid var(--rule);vertical-align:top}',
      S + ' .tt-natab small{display:block;color:var(--mute);font-size:12px}' + S + ' .tt-natag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--red);margin-left:4px}',
      S + ' .tt-nah{font-weight:700;margin:10px 0 0 !important}' + S + ' .tt-nanone{color:var(--mute)}',
      S + ' .tt-chip{display:inline-block;font-weight:700;font-size:14px;line-height:1;padding:5px 7px;border-radius:2px;white-space:nowrap}' + S + ' .tt-chip.up{background:var(--upbg);color:var(--up)}' + S + ' .tt-chip.dn{background:var(--dnbg);color:var(--red)}' + S + ' .tt-chip.ev{background:#EEECE6;color:var(--soft)}',
      S + ' .tt-aln{position:absolute;top:50%;height:3px;margin-top:-1.5px}',
      S + ' .tt-ah{position:absolute;top:50%;width:0;height:0;margin-top:-7px;border-top:7px solid transparent;border-bottom:7px solid transparent;z-index:3}' + S + ' .tt-ah.ar{border-left:10px solid}' + S + ' .tt-ah.al{border-right:10px solid}',
      S + ' .tt-lede{font-size:15px;margin:18px 0 0;padding:10px 14px;background:var(--parch);border-left:4px solid var(--navy)}' + S + ' .tt-karr{color:var(--navy);margin-right:6px}',
      S + ' .tt-axis{grid-column:2;display:flex;justify-content:space-between;font-size:11px;color:var(--mute);margin-top:-8px}',
      S + ' .tt-dkey{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:var(--soft);margin-top:12px}',
      S + ' .tt-dkey i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-1px}' + S + ' .tt-dkey .k1{background:var(--navy)}' + S + ' .tt-dkey .k2{border:2px solid var(--navy);background:#fff}',
      '@media (max-width:600px){' + S + ' .tt-dots{grid-template-columns:92px 1fr 96px;column-gap:8px}}',
      S + ' .tt-rates{font-size:13px;color:var(--soft);margin-top:8px}' + S + ' .tt-rates b{color:var(--ink);font-variant-numeric:tabular-nums}',
      /* agate-style stat row */
      S + ' .tt-row.four{grid-template-columns:repeat(4,1fr)}' + S + ' i.ed{background:var(--navy)}',
      S + ' .tt-row{display:grid;grid-template-columns:repeat(3,1fr);border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:20px}',
      S + ' .tt-cell{padding:10px 12px 12px 0}' + S + ' .tt-cell+.tt-cell{padding-left:14px;border-left:1px solid var(--rule)}',
      S + ' .tt-cl{font-size:14px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--ink);white-space:nowrap}',
      S + ' .tt-cl i{display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:-1px}' + S + ' i.ev{background:var(--ev)}' + S + ' i.ml{background:var(--ml)}',
      S + ' .tt-cn{font-family:"Zilla Slab",Georgia,serif;font-size:34px;font-weight:600;line-height:1.1;margin-top:2px;font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1}',
      S + ' .tt-cn.fix{color:var(--navy)}' + S + ' .tt-cn.dash{color:var(--mute);font-weight:500}',
      S + ' .tt-cs{font-size:12px;color:var(--mute)}',
      S + ' .tt-cure{font-size:14px;color:var(--soft);margin:10px 0 0}' + S + ' .tt-cure a{color:var(--navy);font-weight:600}',
      /* early-voting calendar strip */
      S + ' .tt-sec{margin-top:34px}',
      S + ' .tt-sech{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-family:"Zilla Slab",Georgia,serif;font-size:20px;font-weight:700;color:var(--navy);margin-bottom:12px}',
      S + ' .tt-sech span{font-family:Inter,sans-serif;font-size:12px;font-weight:500;color:var(--mute);white-space:nowrap}',
      S + ' .tt-fold{display:inline-flex;align-items:baseline;gap:9px;margin:0;padding:0;border:0;background:none;font:inherit;color:inherit;letter-spacing:inherit;line-height:inherit;text-align:left;cursor:pointer}' +
      S + ' .tt-fold:focus-visible{outline:2px solid var(--navy);outline-offset:3px}' +
      S + ' .tt-foldi{flex:none;align-self:center;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;box-sizing:border-box;border:1px solid var(--rule);border-radius:2px;background:#fff;font:700 15px/1 Inter,sans-serif;color:var(--navy)}' +
      S + ' .tt-foldi::before{content:"\\2212"}' + S + ' .tt-folded .tt-foldi::before{content:"+"}' + S + ' .tt-fold:hover .tt-foldi{border-color:var(--navy)}' +
      S + ' .tt-sec.tt-folded>:not(.tt-sech){display:none}' + S + ' .tt-sec.tt-folded>.tt-sech{margin-bottom:0}' + S + ' .tt-sec.tt-folded::after{display:none}' + S + ' .tt-folded .tt-sech .tt-who{display:none}' +
      S + ' .tt-edp{margin-top:26px;padding-top:18px;border-top:1px solid var(--rule)}' + S + ' .tt-edp .tt-shh{margin-bottom:10px}' +
      S + ' .tt-edpmap{position:relative;margin:4px 0 0}' + S + ' .tt-edpmap svg{display:block;width:100%;height:auto;max-height:560px}' + S + ' .tt-edpmap path{cursor:pointer}' + S + ' .tt-edpmap path.on{stroke:#1a1a1a!important;stroke-width:2px!important;vector-effect:non-scaling-stroke}' +
      S + ' .tt-edpleg{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;font-size:12px;color:var(--mute);margin:8px 0 0}' + S + ' .tt-edpleg .bar{display:inline-block;width:150px;height:10px;border:1px solid var(--rule)}' + S + ' .tt-edpleg i{display:inline-block;width:12px;height:12px;border:1px solid var(--rule);vertical-align:-2px;margin-right:4px}' +
      S + ' .tt-edpt th{white-space:normal!important;vertical-align:bottom}' + S + ' .tt-edpt th .tt-sbtn{white-space:normal;text-align:inherit}' + S + ' .tt-edpt td:first-child{white-space:normal;min-width:110px}' + S + ' .tt-edpcap{min-height:20px;font-size:14px;margin:8px 0 14px;color:var(--ink)}' +
      S + ' .tt-foldall{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:4px 16px;margin:26px 0 -24px}' +
      S + ' .tt-foldall button{font:600 12px Inter,sans-serif;padding:3px 2px;border:0;background:none;color:var(--navy);text-decoration:underline;text-underline-offset:2px;cursor:pointer}',
      S + ' .tt-cal{display:grid;grid-template-columns:repeat(17,minmax(0,1fr));gap:3px;align-items:end;outline:none}',
      S + ' .tt-d{display:flex;flex-direction:column;align-items:stretch;cursor:default}',
      S + ' .tt-v{height:16px;font-size:11px;font-weight:600;text-align:center;color:var(--ink);white-space:nowrap;visibility:hidden;font-variant-numeric:tabular-nums}',
      S + ' .tt-d.sel .tt-v{visibility:visible}',
      S + ' .tt-col{height:120px;display:flex;align-items:flex-end;border-bottom:1px solid var(--ink)}',
      S + ' .tt-b{width:100%;background:var(--ev);height:0;transition:height .5s ease-out}' + S + ' .tt-col{position:relative}' +
      S + ' .tt-cal.cmp .tt-col .tt-b,' + S + ' .tt-pb{position:absolute;left:0;right:0;bottom:0}' + S + ' .tt-pb{display:block;pointer-events:none}' +
      S + ' .tt-cal.cmp .tt-col .tt-b,' + S + ' .tt-pb{box-shadow:inset 0 2px 0 rgba(255,255,255,.55)}' +
      S + ' .tt-cal.cmp .tt-d.sel .tt-b,' + S + ' .tt-cal.cmp .tt-d.lock .tt-b{background:var(--ev)}' + S + ' .tt-cal.cmp .tt-d.sel .tt-col,' + S + ' .tt-cal.cmp .tt-d.lock .tt-col{outline:2px solid var(--navy);outline-offset:1px}' +
      S + ' .tt-caltip{position:absolute;z-index:30;min-width:200px;max-width:280px;background:#fff;border:1px solid var(--rule);border-radius:3px;box-shadow:0 4px 14px rgba(0,0,0,.15);padding:10px 12px;font-size:13px;line-height:1.35}' +
      S + ' .tt-caltip b.h{display:block;font-size:14px;margin-bottom:6px;color:var(--navy)}' + S + ' .tt-caltip table{width:100%;border-collapse:collapse}' + S + ' .tt-caltip td{padding:3px 0;border-top:1px solid #efeae0}' +
      S + ' .tt-caltip td.n{text-align:right;font-weight:700;padding-left:10px}' + S + ' .tt-caltip td.p{text-align:right;color:var(--mute);padding-left:8px;font-size:12px}' +
      S + ' .tt-caltip i{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px;border-radius:1px}' + S + ' .tt-caltip small{display:block;color:var(--mute);font-size:11px}' +
      S + ' .tt-caltip button{margin-top:8px;font:700 12px inherit;font-family:inherit;padding:6px 9px;border:1px solid var(--ink);background:#fff;border-radius:2px;cursor:pointer;color:var(--ink)}' + S + ' .tt-calx{position:absolute;top:4px;right:6px;border:0!important;margin:0!important;padding:2px 4px!important;font-size:16px!important}' +
      S + ' .tt-calsw{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px;border-radius:1px}' +
      S + ' .tt-calleg{display:flex;flex-wrap:wrap;gap:4px 14px;margin:8px 0 2px;font-size:12px;color:var(--mute)}' + S + ' .tt-calleg i{display:inline-block;width:12px;height:10px;margin-right:5px;vertical-align:-1px}' + S + ' .tt-calleg i.tk{height:3px;vertical-align:3px}' +
      S + ' .tt-calsub2{font-size:12px;color:var(--mute);margin:-2px 0 8px}',
      S + ' .tt-d.fut .tt-col{background:repeating-linear-gradient(135deg,transparent 0 4px,#ece7dc 4px 5px)}',
      S + ' .tt-d.sel .tt-b{background:var(--navy)}',
      S + ' .tt-dl{text-align:center;font-size:11px;line-height:1.25;color:var(--mute);padding-top:4px}',
      S + ' .tt-dl b{display:block;font-size:12px;color:var(--soft);font-weight:600}',
      S + ' .tt-d.sat .tt-dl b{color:var(--ink)}',
      S + ' .tt-calnote{font-size:13px;color:var(--soft);margin-top:10px;min-height:1.5em}',
      S + ' .tt-d.can{cursor:pointer}' + S + ' .tt-d.lock .tt-b{background:var(--navy)}' + S + ' .tt-d.after .tt-col>*{opacity:.28}' + S + '.tt-exp .tt-calsec .tt-col{height:290px}' + S + '.tt-exp .tt-calsec .tt-dl{font-size:12px}' + S + '.tt-exp .tt-calsec .tt-calnote{font-size:15px;margin-top:10px}' + S + ' .tt-d.lock .tt-v{visibility:visible}' + S + ' .tt-d.lock .tt-dl b{color:var(--navy);text-decoration:underline;text-underline-offset:2px}',
      S + ' .tt-calhint{font-size:13px;color:var(--mute);margin-top:2px}',
      /* early voting sites (mockup) */
      S + ' .tt-calsub{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;font-size:14px;color:var(--soft);margin:-4px 0 12px;padding:8px 12px;background:var(--parch)}' + S + ' .tt-calsub b{color:var(--ink)}',
      S + ' .tt-linkbtn{background:none;border:0;padding:0;color:var(--navy);font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:2px;cursor:pointer}',
      S + ' .tt-sites{width:100%;border-collapse:collapse;font-size:14px;margin:0}',
      S + ' .tt-sites th{text-align:right;font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--soft);border:0;border-bottom:2px solid var(--ink);padding:6px 8px;background:transparent;white-space:nowrap}',
      S + ' .tt-sites td{text-align:right;border:0;border-bottom:1px solid var(--rule);padding:9px 8px;vertical-align:middle;font-variant-numeric:tabular-nums;background:transparent;color:var(--ink)}',
      S + ' .tt-sites th:first-child,' + S + ' .tt-sites td:first-child{text-align:left;padding-left:0}',
      S + ' .tt-sites tr.go{cursor:pointer}' + S + ' .tt-sites tr.go:hover td{background:var(--parch)}',
      S + ' .tt-sites tr.on td{background:#e9edf4}' + S + ' .tt-sites tr.on td:first-child{box-shadow:inset 3px 0 0 var(--navy);padding-left:8px}',
      S + ' .tt-sn{font-weight:600;color:var(--navy)}' + S + ' .tt-sc{display:block;font-size:12px;color:var(--mute);font-weight:400}',
      S + ' .tt-spark{display:inline-flex;align-items:flex-end;gap:1px;height:22px;width:86px;vertical-align:middle}',
      S + ' .tt-spark i{flex:1;background:var(--ev);min-height:1px}' + S + ' .tt-spark i.f{background:#ece7dc;height:1px}',
      S + ' .tt-snote{font-size:13px;color:var(--mute);margin-top:8px}',
      S + ' .tt-more{margin-top:10px;background:#fff;border:1px solid var(--navy);border-radius:2px;color:var(--navy);font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:8px 14px;cursor:pointer}',
      '@media (max-width:600px){' + S + ' .tt-spark{width:56px}' + S + ' .tt-sites td,' + S + ' .tt-sites th{padding-left:4px;padding-right:4px}' + S + ' .tt-hide-s{display:none}}',
      /* party */
      S + ' .tt-pbar{display:flex;height:12px;background:#eee}',
      S + ' .tt-who{display:inline-flex;border:1px solid var(--navy);border-radius:2px;overflow:hidden}' + S + ' .tt-who button{background:#fff;border:0;padding:5px 12px;font:700 12px Inter,sans-serif;letter-spacing:.4px;text-transform:uppercase;color:var(--navy);cursor:pointer}',
      S + ' .tt-who .tt-qm{width:16px;height:16px;font-size:10px;margin-left:5px;vertical-align:-2px;text-transform:none;letter-spacing:0}' + S + ' .tt-who button.on .tt-qm{background:transparent;border-color:#fff;color:#fff}' + S + ' .tt-who button+button{border-left:1px solid var(--navy)}' + S + ' .tt-who button.on{background:var(--navy);color:#fff}',
      S + ' .a1{background:#C9D3E3}' + S + ' .a2{background:#8DA0C0}' + S + ' .a3{background:#52688F}' + S + ' .a4{background:#253551}',
      S + ' .tt-ps{display:block;height:100%}' + S + ' .d{background:var(--pd)}' + S + ' .r{background:var(--pr)}' + S + ' .u{background:var(--pu)}' + S + ' .o{background:var(--po)}',
      S + ' .tt-pleg{display:flex;flex-wrap:wrap;gap:6px 22px;margin-top:10px;font-size:14px;color:var(--soft)}',
      S + ' .tt-pk i{display:inline-block;width:9px;height:9px;margin-right:6px;vertical-align:0}',
      S + ' .tt-pk b{color:var(--ink);font-variant-numeric:tabular-nums}' + S + ' .tt-pk em{font-style:normal;color:var(--mute);margin-left:3px}',
      S + ' .tt-pnote{font-size:13px;color:var(--mute);margin-top:8px}',
      /* footer */
      S + ' .tt-foot{margin-top:30px;border-top:1px solid var(--rule);padding-top:12px;font-size:13px;color:var(--mute);display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 20px}',
      S + ' .tt-foot a{color:var(--soft)}',
      S + ' .tt-share{background:none;border:0;padding:0;color:var(--navy);font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px}',
      S + ' details.tt-how{margin-top:10px;font-size:13px;color:var(--soft);max-width:68ch}',
      S + ' details.tt-how summary{cursor:pointer;color:var(--navy);font-weight:600}',
      S + ' details.tt-how p{margin:8px 0 0}',
      S + ' .tt-none{font-size:15px;color:var(--mute);font-style:italic;padding:12px 0}',
      '@media (max-width:600px){' + S + ' .tt-row.four{grid-template-columns:repeat(2,1fr)}' + S + ' .tt-row.four .tt-cell:nth-child(3){padding-left:0;border-left:0}' + S + ' .tt-row.four .tt-cell:nth-child(n+3){border-top:1px solid var(--rule)}',
      '@media (max-width:600px){' + S + '{margin:28px 0}' + S + ' .tt-big{font-size:58px}' + S + ' .tt-hl{font-size:20px}' + S + ' .tt-cn{font-size:26px}',
      S + ' .tt-cell{padding-right:6px}' + S + ' .tt-cell+.tt-cell{padding-left:9px}' + S + ' .tt-cl{font-size:12px;letter-spacing:.2px;white-space:normal}' + S + ' .tt-tabs{gap:3px}' + S + ' .tt-tabs button{flex:1 1 auto;padding:10px 4px 9px;font-size:11px;letter-spacing:.2px}' + S + ' .tt-findi{font-size:16px}',
      S + ' .tt-cal{gap:2px}' + S + ' .tt-col{height:96px}' + S + ' .tt-dl{font-size:11px}' + S + ' .tt-dl b{font-size:10px}' + S + ' .tt-v{font-size:10px}}',
      '@media (prefers-reduced-motion:reduce){' + S + ' .tt-b{transition:none}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* Legend shares: whole numbers when they add up to 100 (allowing up to 1 point for each group shown as "<1"), otherwise one decimal, so a
     legend never reads 46% + 20% + 35%. */
  function legPct(vals) {
    var t = vals.reduce(function (a, b) { return a + b; }, 0), w = vals.map(function (v) { return t ? v / t * 100 : 0; });
    var ints = w.map(function (x, i) { return vals[i] && x < 1 ? '<1' : String(Math.round(x)); }), sum = 0, small = 0;
    ints.forEach(function (x) { if (x === '<1') small++; else sum += +x; });
    if (!t || sum === 100 || (small && sum < 100 && sum >= 100 - small)) return ints;
    return w.map(function (x, i) { return !vals[i] ? '0' : x < 0.1 ? '<0.1' : x.toFixed(1); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  var AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function apDate(iso) { var p = iso.split('-'); return AP[+p[1] - 1] + ' ' + (+p[2]); }
  function dow(iso) { return new Date(iso + 'T12:00:00Z').getUTCDay(); }
  function updatedLabel(D) {
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(D.updated || '');
    if (!m) return 'Data as of ' + apDate(D.asof);
    var h = +m[2], ap = h < 12 ? 'a.m.' : 'p.m.', h12 = h % 12 || 12;
    var t = (h === 12 && m[3] === '00') ? 'noon' : h12 + (m[3] === '00' ? '' : ':' + m[3]) + ' ' + ap;
    return 'Updated ' + apDate(m[1]) + ', ' + t;
  }
  // North Carolina county outlines (U.S. Census Bureau cartographic boundaries, via us-atlas), projected to SVG paths.
  var NC_MAP = {"w":800,"h":330,"c":{"Rockingham":"M390.4,19.9L418.4,20.2L436.3,20.4L434.5,52.6L434.2,53.6L389.4,51.4Z","Franklin":"M526.8,60.9L533.5,62L537.3,54.2L540.8,54.3L543.7,50.7L555.5,51.8L559,52.8L562,56.9L567.1,56.2L570.3,57.6L548.5,100.2L544,91.6L539.8,90L539.7,87.8L535.9,87.2L533,83L522.3,77.8L522.6,71.4Z","Randolph":"M388.1,88.7L433.4,91.3L433.3,97.6L431.8,133.8L412.8,134.1L385.6,134.5Z","Yadkin":"M314.8,52.7L325.7,49.9L331.5,49.4L334.4,51.3L337,47.5L339.8,49.4L343.7,47.7L344.9,50.6L351,50.7L352.3,52.8L353.4,64.1L346.3,69L348.1,74.2L330.5,73.4L313.5,72.6Z","Alexander":"M273.5,78.3L279.4,75.3L285.8,74.1L297.7,75L300.3,73.4L302.8,78.9L302.3,83.2L298.9,94.2L292.6,103.1L289.8,97.3L272.4,100.5L272.9,91.3L272.1,86.4Z","Onslow":"M601.9,193L605.1,191.8L617.5,193.3L630,199.8L633.2,196.4L638.7,197.8L643,202L645.5,210.4L648.4,213.2L652.1,216.2L654.9,225.5L654,229L647.8,231.5L634.6,241L621.9,248.3L617.1,251.8L611.5,247.9L608,236.6L601.6,221L601.8,213.9L604.2,198.6Z","Orange":"M458.9,53.4L468.1,53.6L486.1,53.9L483.5,74.1L480.3,95.5L474.5,95.8L459.4,94L458.1,89.9Z","Cabarrus":"M321.4,133.6L325.6,133.7L365.3,134.5L345.7,169.4L341.8,166.8L331.3,160.1L329.1,151.3L322.8,145.1L324.1,143.8Z","Iredell":"M300.3,73.4L305.1,72.1L313.5,72.6L330.5,73.4L328.8,95.3L322.7,115.2L325.6,133.7L321.4,133.6L310.1,132.3L306.5,134.9L305.6,128.7L308.7,120.4L301.8,110.6L296.6,110.4L296.4,107.4L292.6,103.1L298.9,94.2L302.3,83.2L302.8,78.9Z","Stokes":"M353.7,18.6L366.8,19.4L388.2,19.9L390.4,19.9L389.4,51.4L352.3,50.5Z","Guilford":"M388.5,78.7L389.4,51.4L434.2,53.6L433.4,91.3L388.1,88.7Z","Person":"M469.5,20.5L499.8,20.5L500.1,22.2L499.5,54.3L486.1,53.9L468.1,53.6Z","Vance":"M530.1,20.2L541.9,20.1L546.2,46.3L543.7,50.7L540.8,54.3L537.3,54.2L533.5,62L526.8,60.9L525.8,60.1L525.3,30L526.6,23.4Z","Lenoir":"M589.3,149.5L599.4,148.5L601,151.7L609.1,148.7L619,142.7L623.7,151.2L626.9,152.2L623.4,153.4L621.8,156.4L623.5,162L619.7,164.5L614.8,163.1L616.8,170.9L608.2,182.2L596.6,189.3L595.3,187.8L594.9,178.2L593.2,174.1L587,170.7L587.8,152.3Z","Cleveland":"M239.9,123.5L243.7,125.7L253.7,125.7L260.7,141.8L265.4,149.3L269.2,151.9L269.4,157.8L272.3,159.7L271.4,170.4L267.8,170.2L231.5,167.5L232.6,162.9L238.2,148.1Z","Transylvania":"M128,151.7L132.3,149.3L136.2,149.1L140.3,142.3L144.4,137.8L156.1,153.1L157.2,166.9L158.8,169.2L151.2,171.7L141.3,176.9L139.7,174.9L129.2,177.8L119,180.6L114.6,177.5L121.8,169.1L121.7,162.9L127.4,157.6Z","Craven":"M626.9,152.2L630.5,153.4L635.6,147.7L638.5,150.7L641.7,145.3L644.9,143.2L665.8,155.7L671.8,160.8L665.8,167.1L663.6,172L668.9,176L668.7,182.2L666.4,183.7L663.8,184.1L664.9,188.5L672.8,193.6L684.6,197.4L691.7,192.6L694.6,195.3L690.9,203L685.1,205.7L673.7,206L667.3,208.4L667.6,210.1L656.2,210.1L659.1,207.3L653.6,208L653.5,187.4L652.4,181.3L646.6,183.3L645.9,180.4L632.8,173.1L619.7,164.5L623.5,162L621.8,156.4L623.4,153.4Z","Edgecombe":"M597.9,62.6L602.7,64.3L604.1,66.7L612.1,68.8L613.2,75.1L618.3,75.2L624.8,78.7L630.1,89.6L629.6,99.1L626,97.7L622.9,100.8L618.7,101.3L614.9,105.7L601.8,115.5L596.9,109.6L593.9,98.7L586.7,94.4L591.7,78.6L597.3,66.8Z","Caldwell":"M230.9,64.5L242.8,63.6L254.3,64.5L257.8,66.8L262.2,67.5L263.5,69.7L267.6,70.4L272.3,75.3L273.5,78.3L272.1,86.4L272.9,91.3L272.4,100.5L269.7,103.5L266.5,104.5L262.7,101.6L252.7,102.1L248.7,96.6L239.2,90.9L233.3,82.7L230.7,81L237.5,69.5Z","Pitt":"M598.6,118L601.8,115.5L614.9,105.7L618.7,101.3L622.9,100.8L626,97.7L629.6,99.1L638.4,102.6L638.1,105L641.6,105.5L645.5,108.4L643.7,112.1L646.3,113.7L646.1,118.8L654,128.1L650.1,128.1L646,132L646.1,138.9L644.9,143.2L641.7,145.3L638.5,150.7L635.6,147.7L630.5,153.4L626.9,152.2L623.7,151.2L619,142.7L615.7,134.9L616.6,132.7L611.4,131L606.8,127.3Z","Jones":"M596.6,189.3L608.2,182.2L616.8,170.9L614.8,163.1L619.7,164.5L632.8,173.1L645.9,180.4L646.6,183.3L652.4,181.3L653.5,187.4L653.6,208L659.1,207.3L656.2,210.1L648.4,213.2L645.5,210.4L643,202L638.7,197.8L633.2,196.4L630,199.8L617.5,193.3L605.1,191.8L601.9,193Z","Forsyth":"M352.3,52.8L352.3,50.5L389.4,51.4L388.5,78.7L378.9,76.8L373.4,76.7L373.1,80L362.8,80L357,82.5L355.1,77.8L351,72.5L348.1,74.2L346.3,69L353.4,64.1Z","Wayne":"M565.8,125.8L566.4,124.5L571.9,125.7L587.8,125.6L587.6,143.4L589.6,145.6L589.3,149.5L587.8,152.3L587,170.7L581.8,174.2L578.6,171.3L574.7,172.1L573.7,170.2L568.2,169.3L565.3,171.2L557.5,169.7L557.5,168L550,165.7L544.4,158.9L546,155.9L550.2,155.3L552.5,152.9L558.3,151.8L557.9,144.4Z","Bladen":"M490.7,209.1L500.1,207.4L524.2,207.3L527.5,206.7L531.8,211.4L537,220.6L541.3,225L544.3,230.2L545,234.6L548.6,236.7L549.6,240L547.9,241.7L549.6,245L556.8,249.7L549.7,257.1L542.5,260.7L532.4,259.6L512,249.5L497.6,250.4L493.7,247.8L495.6,246.2L494.3,239.2L496,237.5L499.5,225.2L495,220Z","Polk":"M187.9,142.6L199.9,142.6L206.1,149.4L211.4,157L214,158.5L213.4,166.2L191.4,164.5L178.7,164.6L179.7,154.9Z","Mitchell":"M194.2,58.4L200.9,59.4L202,64.2L206.5,64.5L210,75.4L208,77.6L210.1,82.6L214.8,86.2L214.8,89L211.9,88.9L208.5,92.4L204,92.4L201,95.5L200.4,86L195.7,81L195.9,74.1L189.2,75.2L186.7,70.5L183.5,72.1L182.4,66L176.6,67.1L182.5,62.3L188,60.5L191.9,61.1Z","Currituck":"M720.4,16.3L737.3,15.8L760.2,15.1L761,20.6L767.2,43.7L769.7,50.1L767.8,50.6L765.6,44.2L763,42.1L763.8,38.4L762,30L758.7,27.2L757.3,22.7L749.3,21.7L748.8,17.9L744.7,20L746.8,25.7L752.1,30.1L755.6,29.1L755.8,35.4L761,48.1L764,53.8L763.8,56.3L767.5,63.3L767.7,67.7L761.4,61.8L761.6,58.3L757.3,52.7L756.2,49.1L752.9,47.9L753.8,44.7L749.6,42.2L747.5,38.3L744.3,36.7L738.9,37.1L734.9,32.7L734.5,29.8Z","Lincoln":"M253.7,125.2L305.6,128.7L306.5,134.9L307,138.9L305.6,145L260.7,141.8L253.7,125.7Z","Haywood":"M99.9,103.7L106.4,102.3L109.1,98.6L116,96.2L123.6,98.2L126.6,96.3L127.7,102.2L130.3,101.7L131.6,108.3L133.2,109.1L136.2,116.4L139.1,115L143.1,121.8L142.9,124.7L139.7,132.3L141.2,135.8L144.4,137.8L140.3,142.3L136.2,149.1L132.3,149.3L128,151.7L124.2,149L122.2,143.1L117.4,139.9L117.5,137.7L109.5,129.2L105.1,126.1L108.2,122L105.8,116.8L106.6,113.6L104.4,111.1L106.4,108.8L99.8,105.7Z","Durham":"M486.1,53.9L499.5,54.3L499.2,70.2L504,72.5L505,77.7L508.6,79L507.3,84.6L503.1,89.3L499.3,88.4L497,95L490.3,94.9L480.3,95.5L483.5,74.1Z","Greene":"M587.8,125.6L589.1,125.8L598.6,118L606.8,127.3L611.4,131L616.6,132.7L615.7,134.9L619,142.7L609.1,148.7L601,151.7L599.4,148.5L589.3,149.5L589.6,145.6L587.6,143.4Z","Johnston":"M508.1,133.5L529.3,113.2L548.5,100.2L549.2,105L554.4,109.8L557,113.6L560.6,123.9L565.8,125.8L557.9,144.4L558.3,151.8L552.5,152.9L550.2,155.3L546,155.9L544.4,158.9L535,162.6L527.6,161.7L523.4,155.8L524.3,153.8L512.3,136Z","New Hanover":"M570.4,264.4L573.7,263.8L574.3,259.9L576.6,258.7L579.5,261L589.3,257.9L590.4,261.3L597,268.4L599.6,267.9L594.8,273.8L589,282.8L584.5,293.4L579.4,308.8L578.4,304.2L579.6,297.9L579.2,287.4L577.5,284L577.1,275.1L571.7,268.7Z","Chatham":"M433.3,97.6L460.7,97.6L459.4,94L474.5,95.8L480.3,95.5L490.3,94.9L482.2,123.4L489.3,126.4L484.5,133.2L480.3,130.7L477.1,125L471.3,121.4L468.4,122.5L463.8,129.1L460,128L457,132.1L456.1,129.5L450.3,133.6L431.8,133.8Z","Richmond":"M384.6,174.6L389.4,175.3L393,173L400.5,172.6L405,170.3L414.1,171.5L420.9,171.4L426.4,172.7L430,177.2L429.6,183L436.4,183.7L440.3,186L429.9,191.7L428.9,195.7L430.8,200.7L424.9,207.1L425.2,209.9L419,212.3L397.5,211.9L399.8,206.6L404.8,201.4L402.9,195.8L403.2,192.5L400.3,190.1L402.3,186.7L399.4,183.2L398.2,177.8L396.2,177.4L392,181L385.2,178.1Z","Scotland":"M419,212.3L425.2,209.9L424.9,207.1L430.8,200.7L428.9,195.7L429.9,191.7L440.3,186L445.8,191.4L449.7,197.1L450.3,208.8L449.3,210.8L451.3,216.7L439.8,231.7L420.6,212.3Z","Davidson":"M357,82.5L362.8,80L373.1,80L373.4,76.7L378.9,76.8L388.5,78.7L388.1,88.7L385.6,134.5L375.3,134.6L373.1,126.1L362.3,115.1L362.1,110.5L358.5,110.8L350.8,107.8L351.8,105.3L348.4,97.8L353.5,98.3L354.2,95.8L357.8,95.6L354.9,92.7L359.1,92.2L358.6,83.7Z","Anson":"M362,210.7L366.5,168.6L368.4,166.9L371,173L375.8,174L381.4,168.9L384.6,174.6L385.2,178.1L392,181L396.2,177.4L398.2,177.8L399.4,183.2L402.3,186.7L400.3,190.1L403.2,192.5L402.9,195.8L404.8,201.4L399.8,206.6L397.5,211.9Z","Rutherford":"M187.9,134.4L191.5,131.2L190.9,128.8L196.8,128L198.4,129.2L208.4,127.9L211.7,125.8L214.9,128.8L220.4,127.2L226.2,127.3L227.9,123.7L234.5,119.6L239.9,123.5L238.2,148.1L232.6,162.9L231.5,167.5L222.2,166.8L213.4,166.2L214,158.5L211.4,157L206.1,149.4L199.9,142.6L187.9,142.6L186.5,137.1Z","Yancey":"M168.2,77.3L172.5,74.2L176.6,67.1L182.4,66L183.5,72.1L186.7,70.5L189.2,75.2L195.9,74.1L195.7,81L200.4,86L201,95.5L195.3,105.1L187.7,108.2L187.2,105.8L182.8,103L180.5,95.1L176.3,95.2L175.8,90.6L172.4,86L168.9,84.9L170.3,80.6Z","Swain":"M62.8,118.2L68,117.3L69.8,119.2L78.6,119L82.3,114.4L89.5,111.7L91.3,109.3L94.4,110.1L99.8,105.7L106.4,108.8L104.4,111.1L106.6,113.6L105.8,116.8L108.2,122L105.1,126.1L100.6,124.8L93.9,129.5L90,130.6L88.8,135.1L90.6,138.4L90.6,145.8L82.2,146L78.8,148.9L76.2,148.6L59.6,150L59.5,145.1L65.2,143.1L67.9,139.7L68.8,133.4L66.5,134.1L55.7,131.3L49.2,131.3L39.6,128.5L36,128.8L39.7,127.4L42.5,123L47.7,122.5L52.7,118.4Z","Hertford":"M641.6,51.7L647.9,30.9L648.8,26.7L653.3,25.6L651.3,21.4L646.5,20.8L644.8,18.5L666.9,18.3L668.2,20.8L664.1,26.5L665.6,34L675.9,38L681,39.1L686.9,45.3L687.6,47.3L685.1,51.1L662.8,52.2Z","Cumberland":"M472.8,171.7L473.2,169.7L481.9,167.2L492.6,165.4L497.5,162.2L506.5,161.4L516.3,163.7L515.3,171.9L512.4,182.3L513.8,191.8L520.6,197.7L527.5,206.7L524.2,207.3L500.1,207.4L490.7,209.1L485.8,200.6L478.3,196.2L478.7,195L473.8,186.3L471.5,177Z","Wilkes":"M254.3,64.5L258.5,61.8L262.5,55.5L260.7,51.1L266.6,46.6L270.8,46.5L271,38.2L275.2,36.7L278.6,38.8L281.2,37.6L287,34.1L289.4,30.4L291.5,32.7L295.4,29.7L299.8,33L301.4,37.2L305.5,37L306.9,34.2L315.3,42.7L314.8,52.7L313.5,72.6L305.1,72.1L300.3,73.4L297.7,75L285.8,74.1L279.4,75.3L273.5,78.3L272.3,75.3L267.6,70.4L263.5,69.7L262.2,67.5L257.8,66.8Z","Sampson":"M516.3,163.7L519.5,158L523.4,155.8L527.6,161.7L535,162.6L544.4,158.9L550,165.7L557.5,168L557.5,169.7L556.6,180.3L557.9,181.8L559,201.4L554.6,219.2L560.5,222.6L562.5,221.4L558.6,226.1L549.6,240L548.6,236.7L545,234.6L544.3,230.2L541.3,225L537,220.6L531.8,211.4L527.5,206.7L520.6,197.7L513.8,191.8L512.4,182.3L515.3,171.9Z","Pamlico":"M671.8,160.8L676.4,164.9L695.5,162.4L697.3,157.5L697.5,151L707.2,152.5L709.9,155.4L710.3,159.2L708.2,164.6L704.1,169.8L704.5,172.4L701.7,177.5L696.9,181.6L680.9,192.7L666.4,183.7L668.7,182.2L668.9,176L663.6,172L665.8,167.1Z","Washington":"M674.9,109.3L677.7,106L678.9,99.8L682.6,93.1L688.5,84.1L690.1,85.1L702.9,83.8L714.7,79.1L717.7,83.4L716.5,86.7L718.9,92.5L714.3,100.9L714.6,110.8L693.9,110.5L675.2,110.8Z","Moore":"M412.8,134.1L431.8,133.8L450.3,133.6L451.5,135.8L449.3,139L452.2,144.1L455.7,146.7L458,152.8L465.4,156.9L461.8,161.3L467,164.3L468,167.2L473.2,169.7L472.8,171.7L470.6,172.5L466,169.6L459.5,167.4L451.4,173.1L440.3,186L436.4,183.7L429.6,183L430,177.2L426.4,172.7L422.6,169.8L421,163.6L418.1,161.6L417.8,157.4L413.1,138.1Z","Robeson":"M439.8,231.7L451.3,216.7L449.3,210.8L450.3,208.8L464.3,209.3L478.3,196.2L485.8,200.6L490.7,209.1L495,220L499.5,225.2L496,237.5L494.3,239.2L495.6,246.2L493.7,247.8L484.5,254.2L484.5,257.5L480.9,259.4L477.6,267.1L475.4,268.4L459.3,252.2L449.2,241.1L440.8,232.8Z","Surry":"M312.9,16.7L318.7,17.1L330.5,16.9L338.8,17.5L353.7,18.6L352.3,50.5L352.3,52.8L351,50.7L344.9,50.6L343.7,47.7L339.8,49.4L337,47.5L334.4,51.3L331.5,49.4L325.7,49.9L314.8,52.7L315.3,42.7L306.9,34.2L308.5,32.4L306.3,28.5L310.6,23.3Z","Carteret":"M656.2,210.1L667.6,210.1L667.3,208.4L673.7,206L685.1,205.7L690.9,203L694.6,195.3L691.7,192.6L696.1,189.5L700.4,189.3L709.1,186.2L710.2,180.3L713.8,181.5L714.9,187.8L717.6,190.6L723.5,190.9L720.4,183.9L726.9,186.5L727.8,194.5L722.5,201.8L716.7,203.2L716.7,206.4L713.2,208.4L708.8,216.5L706.7,223.3L701.1,221.5L701.3,213.9L698,212.2L698.5,220L693.3,220.8L707.1,226.5L714.3,214.7L724.8,203L732.4,195.6L747.2,178.5L749.9,180.4L741,188.6L732.8,197.9L725.8,204L719.2,211.6L713.5,219.5L706.9,230.6L706,233.7L704.5,227.3L693,222.4L680.3,222.6L660.8,226.6L654,229L654.9,225.5L652.1,216.2L648.4,213.2Z","Alleghany":"M272.8,14.4L288.4,15L312.9,16.7L310.6,23.3L306.3,28.5L308.5,32.4L306.9,34.2L305.5,37L301.4,37.2L299.8,33L295.4,29.7L291.5,32.7L289.4,30.4L287,34.1L281.2,37.6L281.9,35.9L279.8,28.6L277.6,26.6L272.7,17.5Z","Harnett":"M465.4,156.9L484.5,133.2L489.3,126.4L508.1,133.5L512.3,136L524.3,153.8L523.4,155.8L519.5,158L516.3,163.7L506.5,161.4L497.5,162.2L492.6,165.4L481.9,167.2L473.2,169.7L468,167.2L467,164.3L461.8,161.3Z","Hoke":"M440.3,186L451.4,173.1L459.5,167.4L466,169.6L470.6,172.5L472.8,171.7L471.5,177L473.8,186.3L478.7,195L478.3,196.2L464.3,209.3L450.3,208.8L449.7,197.1L445.8,191.4Z","Perquimans":"M699.3,38.9L708.4,35.7L715.8,48.7L721,50.6L725,56.2L729.3,62.5L732.6,65L730.4,66.4L720.4,62.4L716.2,62L714.5,59.3L708.7,57.2L716.2,63.9L723,65.9L720.8,67.8L713.2,69L706.1,68.2L698.6,65.8L696.7,51.4L698.2,49.3Z","Granville":"M499.5,54.3L500.1,22.2L499.8,20.5L505.5,20.4L530.1,20.2L526.6,23.4L525.3,30L525.8,60.1L526.8,60.9L522.6,71.4L522.3,77.8L510.1,72.1L504,72.5L499.2,70.2Z","Hyde":"M775,164L775.4,165.6L758.1,175L752.1,180.1L754.5,173.5L757.1,173.4L772.1,164.8ZM693.9,110.5L714.6,110.8L726.8,111.2L724.8,120.3L731.9,121.3L735.3,114.9L735.8,110.1L738.1,109.6L743,113.1L747.2,113.4L750.1,112.9L760.1,112.6L763.3,122L759.2,127.1L756,128.1L755.2,132.2L753,133.3L750.9,140.1L746.8,141.6L745.9,146L740.5,148.6L739.6,150.9L731.1,148.7L721.7,149.4L713.3,147.9L711.6,145.6L708.4,147L703.4,142.8L699,132L709,131.5L709.5,126.6L706.2,123.8L703,123.7L697.3,118.1L697.2,114.3Z","Watauga":"M238.8,33.8L247,38.6L253.1,47.3L254.4,46.9L260.7,51.1L262.5,55.5L258.5,61.8L254.3,64.5L242.8,63.6L230.9,64.5L229.2,58.1L227,55.3L224.4,55.7L222.3,52.7L223.7,46.5L221.9,44.8L229.4,38.3L232.9,37.3L235.4,39.6L240.9,39.7Z","Macon":"M57.2,153.4L59.6,150L76.2,148.6L78.8,148.9L82.2,146L90.6,145.8L92.3,153.1L95.3,157.3L100.5,156.4L100.2,165.4L103.3,168.2L106.9,174.5L106.5,177.1L109.8,183.2L76,182.5L71.9,180.6L67.1,171.2L62.7,167.7L60.6,163.3L53.8,163.5L54.7,158.7L57.7,156Z","Clay":"M53.8,163.5L60.6,163.3L62.7,167.7L67.1,171.2L71.9,180.6L76,182.5L69.8,182.3L63.6,182.7L34.7,181.2L28.6,180.9L33.3,176.8L32.5,174.8L37.8,171.2L44.3,164.3L46.6,165Z","Chowan":"M687.6,47.3L686.9,45.3L692,41.5L694.5,42L699.3,38.9L698.2,49.3L696.7,51.4L698.6,65.8L706.1,68.2L713.2,69L709.1,74.7L704,77L698.6,77L695.9,74.1L689.5,73.1L685.4,61.7L685.3,55.9L688.9,48.4Z","Gates":"M666.9,18.3L666.8,17.4L700.3,16.8L704.9,21.1L705,25.7L708.4,35.7L699.3,38.9L694.5,42L692,41.5L686.9,45.3L681,39.1L675.9,38L665.6,34L664.1,26.5L668.2,20.8Z","Pasquotank":"M704.9,21.1L709.8,25.7L719.8,31L722.8,34.4L727.6,35.9L730,40.7L732.9,41.1L729.8,43.8L732.7,44.5L736,47.5L739,52.9L742.2,54.4L744.3,59.3L741.5,61.6L733.8,63.1L726.9,56.6L725,56.2L721,50.6L715.8,48.7L708.4,35.7L705,25.7Z","Graham":"M35.4,128.5L36,128.8L39.6,128.5L49.2,131.3L55.7,131.3L66.5,134.1L68.8,133.4L67.9,139.7L65.2,143.1L59.5,145.1L59.6,150L57.2,153.4L51,153.4L45.9,152.1L35.4,155.5L30.3,153.8L28.3,147.2L27.7,140.7L30.7,138.5L29.6,134.2Z","Cherokee":"M3.9,155.3L4.3,153.4L11.7,149.2L12.5,151.7L21.6,151.8L28.3,147.2L30.3,153.8L35.4,155.5L45.9,152.1L51,153.4L57.2,153.4L57.7,156L54.7,158.7L53.8,163.5L46.6,165L44.3,164.3L37.8,171.2L32.5,174.8L33.3,176.8L28.6,180.9L17.5,180.3L0,179.3Z","Brunswick":"M558.2,261.7L560.5,260.1L565.8,263.5L570.4,264.4L571.7,268.7L577.1,275.1L577.5,284L579.2,287.4L579.6,297.9L578.4,304.2L579.4,308.8L577.2,317.3L572.9,316.7L571.9,313.4L564.9,311.5L557.3,310.7L548.1,311L538.2,312.2L526.7,316.2L524.1,317.9L513.8,307.6L516.1,303.6L514.8,300.3L520.4,297.2L522.7,294L522,291.3L524,285L526.2,283.1L534.8,285.9L539,278.6L549.8,277.3Z","Halifax":"M570.3,57.6L575.9,46.9L578.7,37.5L579.5,24.1L586.9,24.4L590.7,26.4L602.2,26.5L603.5,29.7L610.3,33.2L611,38L608.2,40.8L609.2,44.7L611.8,45.9L620.7,43.4L623.7,50.1L626.3,51.6L625.7,55.6L634.4,60.5L636.7,61.4L638,66.4L640,67.3L632.6,69.2L631.4,71.3L624.8,78.7L618.3,75.2L613.2,75.1L612.1,68.8L604.1,66.7L602.7,64.3L597.9,62.6L593.4,62.3L588.3,64.5L581.3,63.9L578.3,59.7L573.8,58.4L573.2,60.6Z","Jackson":"M105.1,126.1L109.5,129.2L117.5,137.7L117.4,139.9L122.2,143.1L124.2,149L128,151.7L127.4,157.6L121.7,162.9L121.8,169.1L114.6,177.5L119,180.6L109.8,183.2L106.5,177.1L106.9,174.5L103.3,168.2L100.2,165.4L100.5,156.4L95.3,157.3L92.3,153.1L90.6,145.8L90.6,138.4L88.8,135.1L90,130.6L93.9,129.5L100.6,124.8Z","Warren":"M541.9,20.1L566.4,19.8L579.5,19.6L579.5,24.1L578.7,37.5L575.9,46.9L570.3,57.6L567.1,56.2L562,56.9L559,52.8L555.5,51.8L543.7,50.7L546.2,46.3Z","Northampton":"M579.5,19.6L591.3,19.4L633.1,18.9L644.8,18.5L646.5,20.8L651.3,21.4L653.3,25.6L648.8,26.7L647.9,30.9L641.6,51.7L639.8,55L633.7,56.1L634.4,60.5L625.7,55.6L626.3,51.6L623.7,50.1L620.7,43.4L611.8,45.9L609.2,44.7L608.2,40.8L611,38L610.3,33.2L603.5,29.7L602.2,26.5L590.7,26.4L586.9,24.4L579.5,24.1Z","Ashe":"M244.2,12.1L272.8,14.4L272.7,17.5L277.6,26.6L279.8,28.6L281.9,35.9L281.2,37.6L278.6,38.8L275.2,36.7L271,38.2L270.8,46.5L266.6,46.6L260.7,51.1L254.4,46.9L253.1,47.3L247,38.6L238.8,33.8L240.3,26.5L242.2,25.4L241.1,17.8Z","Buncombe":"M133.2,109.1L136.2,106.7L140,108.5L148.9,103.6L153.1,103.2L166.9,96.6L176.3,95.2L180.5,95.1L182.8,103L187.2,105.8L187.7,108.2L186.1,110.4L188.4,118.3L186,120.6L189.5,124.3L196.8,128L190.9,128.8L191.5,131.2L187.9,134.4L181.8,130.6L178.5,134.3L174.3,133.2L170.7,135.8L155.7,136.9L151,134L144.4,137.8L141.2,135.8L139.7,132.3L142.9,124.7L143.1,121.8L139.1,115L136.2,116.4Z","Burke":"M218.5,80.9L222.5,76.6L225,79.3L230.7,81L233.3,82.7L239.2,90.9L248.7,96.6L252.7,102.1L262.7,101.6L266.5,104.5L269.7,103.5L263.4,113.4L256.4,120.9L253.7,125.2L253.7,125.7L243.7,125.7L239.9,123.5L234.5,119.6L227.9,123.7L224.2,107.6L214.2,97.7L219.8,93.8L221.5,89.4Z","McDowell":"M187.7,108.2L195.3,105.1L201,95.5L204,92.4L208.5,92.4L211.9,88.9L214.8,89L214.8,86.2L218.5,80.9L221.5,89.4L219.8,93.8L214.2,97.7L224.2,107.6L227.9,123.7L226.2,127.3L220.4,127.2L214.9,128.8L211.7,125.8L208.4,127.9L198.4,129.2L196.8,128L189.5,124.3L186,120.6L188.4,118.3L186.1,110.4Z","Columbus":"M475.4,268.4L477.6,267.1L480.9,259.4L484.5,257.5L484.5,254.2L493.7,247.8L497.6,250.4L512,249.5L532.4,259.6L542.5,260.7L549.7,257.1L554.6,262.1L558.2,261.7L549.8,277.3L539,278.6L534.8,285.9L526.2,283.1L524,285L522,291.3L522.7,294L520.4,297.2L514.8,300.3L516.1,303.6L513.8,307.6Z","Caswell":"M436.3,20.4L440.1,20.5L451.3,20.5L462.5,20.4L469.5,20.5L468.1,53.6L458.9,53.4L434.5,52.6Z","Henderson":"M187.9,134.4L186.5,137.1L187.9,142.6L179.7,154.9L178.7,164.6L175.6,161.9L171.5,166.7L169.3,165.8L158.8,169.2L157.2,166.9L156.1,153.1L144.4,137.8L151,134L155.7,136.9L170.7,135.8L174.3,133.2L178.5,134.3L181.8,130.6Z","Gaston":"M260.7,141.8L305.6,145L302.7,147.2L308.5,149.5L302.9,151.6L299.8,159.3L300.2,171.9L297.3,172.5L271.4,170.4L272.3,159.7L269.4,157.8L269.2,151.9L265.4,149.3Z","Tyrrell":"M717.7,83.4L721.9,83L726,80L734.3,77.5L744.5,77.3L749.1,81L749.3,85.1L745,92.7L746.1,97.9L747.2,113.4L743,113.1L738.1,109.6L735.8,110.1L735.3,114.9L731.9,121.3L724.8,120.3L726.8,111.2L714.6,110.8L714.3,100.9L718.9,92.5L716.5,86.7Z","Davie":"M328.8,95.3L330.5,73.4L348.1,74.2L351,72.5L355.1,77.8L357,82.5L358.6,83.7L359.1,92.2L354.9,92.7L357.8,95.6L354.2,95.8L353.5,98.3L348.4,97.8L351.8,105.3L350.8,107.8L349.9,105L346.4,104.3L335.5,96.2Z","Avery":"M220.5,47.2L221.9,44.8L223.7,46.5L222.3,52.7L224.4,55.7L227,55.3L229.2,58.1L230.9,64.5L237.5,69.5L230.7,81L225,79.3L222.5,76.6L218.5,80.9L214.8,86.2L210.1,82.6L208,77.6L210,75.4L206.5,64.5L211.4,61.8Z","Pender":"M549.6,240L558.6,226.1L562.5,221.4L571.6,220.1L573.6,221.8L601.6,221L608,236.6L611.5,247.9L617.1,251.8L611.3,256.3L599.6,267.9L597,268.4L590.4,261.3L589.3,257.9L579.5,261L576.6,258.7L574.3,259.9L573.7,263.8L570.4,264.4L565.8,263.5L560.5,260.1L558.2,261.7L554.6,262.1L549.7,257.1L556.8,249.7L549.6,245L547.9,241.7Z","Catawba":"M269.7,103.5L272.4,100.5L289.8,97.3L292.6,103.1L296.4,107.4L296.6,110.4L301.8,110.6L308.7,120.4L305.6,128.7L253.7,125.2L256.4,120.9L263.4,113.4Z","Mecklenburg":"M297.3,172.5L300.2,171.9L299.8,159.3L302.9,151.6L308.5,149.5L302.7,147.2L305.6,145L307,138.9L306.5,134.9L310.1,132.3L321.4,133.6L324.1,143.8L322.8,145.1L329.1,151.3L331.3,160.1L341.8,166.8L321.7,185.5L315.2,189.2L309.5,180.9L306.9,177.4L297.1,184.1L295.5,182.1L297.8,177.6Z","Nash":"M548.5,100.2L570.3,57.6L573.2,60.6L573.8,58.4L578.3,59.7L581.3,63.9L588.3,64.5L593.4,62.3L597.9,62.6L597.3,66.8L591.7,78.6L586.7,94.4L585.5,97.8L582.6,96.5L577.5,98.6L554.4,109.8L549.2,105Z","Madison":"M133.1,79.6L137.3,79.4L139.7,82.5L146.5,73.4L157.3,67.2L159.8,70.1L158.5,77.7L163.3,79.7L168.2,77.3L170.3,80.6L168.9,84.9L172.4,86L175.8,90.6L176.3,95.2L166.9,96.6L153.1,103.2L148.9,103.6L140,108.5L136.2,106.7L133.2,109.1L131.6,108.3L130.3,101.7L127.7,102.2L126.6,96.3L128.1,92.8L132.4,87.6L131.7,81.6Z","Stanly":"M365.3,134.5L375.3,134.6L377.2,137.8L382,139.6L383.3,146L387.1,149.3L384.1,154.8L382.8,162.2L386.5,171.4L384.6,174.6L381.4,168.9L375.8,174L371,173L368.4,166.9L366.5,168.6L359.3,171.9L349.2,171.6L345.7,169.4Z","Dare":"M774.9,82.6L780.7,84.2L784.8,91.1L785.3,95.6L780.5,94.9L781,90.6ZM775,164L781.4,160.2L785.2,159.9L790.3,156.4L794.5,155.3L795.8,148.2L798.6,124.2L798.4,119.1L795.5,110.1L793.2,100.2L794.2,100.4L798.1,110.3L800,119.3L799.5,132.2L795.6,159.5L787.8,160.6L775.4,165.6ZM767.8,50.6L769.7,50.1L772.8,58.5L780.7,73.1L792.8,98.4L789.9,97.2L783.6,83.5L778.9,76.1L774.7,75.2L771.2,58.8ZM763.3,122L760.1,112.6L750.1,112.9L752,101.9L752.5,87.6L756.9,83.7L754.9,80.6L759.3,78.5L767.4,80.3L772.9,89L775.3,95.1L774.2,100.1L776.7,109.3L774.2,111.8L775.7,116.9L771.7,122.1L766.2,123.3Z","Wilson":"M586.7,94.4L593.9,98.7L596.9,109.6L601.8,115.5L598.6,118L589.1,125.8L587.8,125.6L571.9,125.7L566.4,124.5L565.8,125.8L560.6,123.9L557,113.6L554.4,109.8L577.5,98.6L582.6,96.5L585.5,97.8Z","Duplin":"M557.5,169.7L565.3,171.2L568.2,169.3L573.7,170.2L574.7,172.1L578.6,171.3L581.8,174.2L587,170.7L593.2,174.1L594.9,178.2L595.3,187.8L596.6,189.3L601.9,193L604.2,198.6L601.8,213.9L601.6,221L573.6,221.8L571.6,220.1L562.5,221.4L560.5,222.6L554.6,219.2L559,201.4L557.9,181.8L556.6,180.3Z","Martin":"M624.8,78.7L631.4,71.3L632.4,73.1L641.4,77.5L643.8,81.7L642.9,85.2L652.2,86.8L656.7,84.9L658.7,90.6L657.2,94.1L660.7,94.1L666.1,89.6L670.4,93.8L669.8,98L672.7,98.7L676.2,94.4L675.8,91.2L682.6,93.1L678.9,99.8L677.7,106L674.9,109.3L662.8,116.3L646.5,107.7L645.5,108.4L641.6,105.5L638.1,105L638.4,102.6L629.6,99.1L630.1,89.6Z","Wake":"M490.3,94.9L497,95L499.3,88.4L503.1,89.3L507.3,84.6L508.6,79L505,77.7L504,72.5L510.1,72.1L522.3,77.8L533,83L535.9,87.2L539.7,87.8L539.8,90L544,91.6L548.5,100.2L529.3,113.2L508.1,133.5L489.3,126.4L482.2,123.4Z","Lee":"M450.3,133.6L456.1,129.5L457,132.1L460,128L463.8,129.1L468.4,122.5L471.3,121.4L477.1,125L480.3,130.7L484.5,133.2L465.4,156.9L458,152.8L455.7,146.7L452.2,144.1L449.3,139L451.5,135.8Z","Bertie":"M631.4,71.3L632.6,69.2L640,67.3L638,66.4L636.7,61.4L634.4,60.5L633.7,56.1L639.8,55L641.6,51.7L662.8,52.2L685.1,51.1L683,54.6L682.5,61.8L685.3,70.7L689,77.9L688.5,84.1L682.6,93.1L675.8,91.2L676.2,94.4L672.7,98.7L669.8,98L670.4,93.8L666.1,89.6L660.7,94.1L657.2,94.1L658.7,90.6L656.7,84.9L652.2,86.8L642.9,85.2L643.8,81.7L641.4,77.5L632.4,73.1Z","Rowan":"M328.8,95.3L335.5,96.2L346.4,104.3L349.9,105L350.8,107.8L358.5,110.8L362.1,110.5L362.3,115.1L373.1,126.1L375.3,134.6L365.3,134.5L325.6,133.7L322.7,115.2Z","Alamance":"M433.4,91.3L434.2,53.6L434.5,52.6L458.9,53.4L458.1,89.9L459.4,94L460.7,97.6L433.3,97.6Z","Montgomery":"M375.3,134.6L385.6,134.5L412.8,134.1L413.1,138.1L417.8,157.4L418.1,161.6L421,163.6L422.6,169.8L426.4,172.7L420.9,171.4L414.1,171.5L405,170.3L400.5,172.6L393,173L389.4,175.3L384.6,174.6L386.5,171.4L382.8,162.2L384.1,154.8L387.1,149.3L383.3,146L382,139.6L377.2,137.8Z","Union":"M315.2,189.2L321.7,185.5L341.8,166.8L345.7,169.4L349.2,171.6L359.3,171.9L366.5,168.6L362,210.7L340.2,210L318.7,209.3L320.2,196.5Z","Camden":"M704.8,16.7L720.4,16.3L734.5,29.8L734.9,32.7L738.9,37.1L744.3,36.7L747.5,38.3L749.6,42.2L753.8,44.7L752.9,47.9L753.5,54.3L758.1,57.9L748.1,55.8L737.5,44.9L732.7,44.5L729.8,43.8L732.9,41.1L730,40.7L727.6,35.9L722.8,34.4L719.8,31L709.8,25.7L704.9,21.1L700.3,16.8Z","Beaufort":"M645.5,108.4L646.5,107.7L662.8,116.3L674.9,109.3L675.2,110.8L693.9,110.5L697.2,114.3L697.3,118.1L703,123.7L706.2,123.8L709.5,126.6L708.2,128.5L701.5,129.8L697.6,128.8L694.8,132L697.8,137.4L699.9,145.5L697.7,145.5L688.2,141.3L683.7,142.3L677.1,139.3L667.1,136.6L659.5,132.2L659.3,135L664.9,140.7L671.7,141L692.3,150.2L697.5,151L697.3,157.5L695.5,162.4L676.4,164.9L671.8,160.8L665.8,155.7L644.9,143.2L646.1,138.9L646,132L650.1,128.1L654,128.1L646.1,118.8L646.3,113.7L643.7,112.1Z"}};
  var GEO = [['state', 'Statewide'], ['county', 'County'], ['cd', 'Congress'], ['hd', 'NC House'], ['sd', 'NC Senate']];
  var LONG = {
    state: function () { return 'North Carolina'; },
    county: function (x) { return x + ' County'; },
    cd: function (x) { return 'Congressional District ' + x.replace(/\D/g, ''); },
    hd: function (x) { return 'NC House District ' + x.replace(/\D/g, ''); },
    sd: function (x) { return 'NC Senate District ' + x.replace(/\D/g, ''); }
  };
  var PARTY = [['Democratic', 'd'], ['Republican', 'r'], ['Unaffiliated', 'u'], ['Other', 'o']];
  var EV_DAYS = (function () {
    var out = [], d = new Date(Date.UTC(2026, 9, 15));
    for (var i = 0; i < 17; i++) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
    return out;
  })();

  function render(D) {
    var places = { state: [Object.assign({ name: 'North Carolina' }, D.state)] };
    ['county', 'cd', 'hd', 'sd'].forEach(function (k) { places[k] = D.geo[k]; });
    var state = { geo: 'state', sel: {} }, interacted = false, animated = false, site = null, allSites = false, daySitesHidden = false, numMode = 'pct', who = 'party', vs = '2022', dayI = null;   // dayI: early voting day picked on the day-by-day chart (null = all votes so far)
    ['county', 'cd', 'hd', 'sd'].forEach(function (k) {
      state.sel[k] = places[k].reduce(function (a, r) { return r.vc > a.vc ? r : a; }).name;
    });
    state.sel.state = 'North Carolina';
    var preEV = D.asof < EV_START;

    var h = '<div class="tt-kick">' + (D.final ? 'Final turnout' : updatedLabel(D)) + '</div>';
    h += '<div class="tt-ctl"><div class="tt-tabs" role="group" aria-label="Geography">';
    GEO.forEach(function (g, i) { h += '<button type="button" data-g="' + g[0] + '" aria-pressed="' + (i === 0) + '"' + (i === 0 ? ' class="on"' : '') + '>' + g[1] + '</button>'; });
    h += '</div><div class="tt-find"><label class="tt-findl" for="' + SLUG + '-find">Find your county, district or precinct</label>' +
      '<input id="' + SLUG + '-find" class="tt-findi" type="search" autocomplete="off" placeholder="e.g. Orange, House 22 or Durham 57" ' +
      'role="combobox" aria-expanded="false" aria-controls="' + SLUG + '-res" aria-autocomplete="list">' +
      '<div id="' + SLUG + '-res" class="tt-res" role="listbox" hidden></div></div></div>';
    h += '<div class="tt-pick" hidden><button type="button" class="tt-step" data-d="-1" aria-label="Previous">&#8249;</button>' +
      '<select class="tt-sel" aria-label="Choose a place"></select>' +
      '<button type="button" class="tt-step" data-d="1" aria-label="Next">&#8250;</button></div>';
    h += '<div class="tt-view" aria-live="polite"></div>';
    function naBlock() { return D.not_accepted ? '<div class="tt-na"></div>' : ''; }   // filled for the selected place by naFill()
    function naFill(r, k) {   // what happened to returned ballots that were not accepted here, by State Board status
      var box = mount.querySelector('div.tt-na'); if (!box) return;
      var N = k === 'state' ? D.not_accepted : (r.na || { ml: [], ev: [] }), where = k === 'state' ? 'statewide' : 'in ' + LONG[k](r.name);
      var CURE = { 'PENDING CURE': 1, 'PHOTO ID CURABLE': 1, 'ID NOT PROVIDED': 1, 'AFFIDAVIT REVIEW PENDING': 1, 'CONFLICT': 1, 'VOTER SIGNATURE MISSING': 1, 'AFFIDAVIT INCOMPLETE': 1, 'PHOTO ID NONCOMPLIANT': 1 };
      var NOTE = { 'SPOILED - EV': 'voided because the voter voted early in person instead' };
      function table(rows, kind) {
        if (!rows || !rows.length) return '<p class="tt-nanone">None so far.</p>';
        return '<table class="tt-natab tt-dsort"><thead><tr><th>State Board status</th><th>Ballots</th><th>Voters with no vote counted</th></tr></thead><tbody>' + rows.map(function (x) {
          var st = x[0].replace(' - EV', '-EV'), tag = kind === 'ml' && CURE[x[0]] ? ' <span class="tt-natag">need a fix</span>' : '';
          return '<tr><td>' + esc(st) + tag + (NOTE[x[0]] ? '<small>' + NOTE[x[0]] + '</small>' : '') + '</td><td>' + fmt(x[1]) + '</td><td>' + fmt(x[2]) + '</td></tr>';
        }).join('') + '</tbody></table>';
      }
      box.innerHTML = '<p><b>Ballots not accepted ' + esc(where) + ', as of ' + apDate(D.asof) + '.</b> Every returned ballot the State Board has not accepted, by its status code. A voter can have more than one ballot, so the last column counts voters who have no accepted ballot of any kind. ' +
        (k === 'state' ? 'Rejected ballots: ' + fmt(D.state.g_rej || 0) + ' so far.' : 'Change the place above to see another county or district.') + '</p>' +
        '<p class="tt-nah">Mail ballots</p>' + table(N.ml, 'ml') + '<p class="tt-nah">Early in-person ballots</p>' + table(N.ev, 'ev');
      dsort(box);
    }
    h += '<details class="tt-how"><summary>How we count</summary>' +
      '<p id="tt-ab-votes">Votes cast are early in-person and mail ballots the State Board lists as accepted. A mail ballot that needs a fix joins the count once it is accepted, ' +
      'on the day it arrived, so recent days can rise a little after they first appear. Mail ballot rules changed in 2023, and more people vote early every cycle, so being ahead early doesn\'t mean final turnout will be higher.</p>' +
      '<p id="tt-ab-fix">"Need a fix" counts returned mail ballots that are waiting on the voter and haven\'t been accepted. These are the State Board statuses PENDING CURE, PHOTO ID CURABLE, ID NOT PROVIDED, ' +
      'AFFIDAVIT REVIEW PENDING, CONFLICT, VOTER SIGNATURE MISSING, AFFIDAVIT INCOMPLETE and PHOTO ID NONCOMPLIANT. Voters who have since voted another way are left out. Rejected ballots ' +
      'and mail ballots replaced because the voter voted in person are not shown. "Fixed so far" counts mail ballots the State Board lists as ACCEPTED - CURED. Party is the voter\'s current registration; age is as listed in the State Board file.</p>' +
      (D.reg_as_of ? '<p>Registered voters are the active and inactive voters in the State Board\'s registration file, updated weekly until Election Day. Inactive voters can still vote, so counting them keeps turnout from being overstated. Voters who register during early voting are added the following week.</p>' : '') +
      '<p id="tt-ab-cmp">Comparisons with 2018, 2020, 2022 and 2024 (statewide, by county and by district) line up each year by day of early voting, which began Oct. 15, 2020, Oct. 20, 2022, Oct. 17, 2024 and Oct. 15, 2026. 2020 was a presidential election held during the pandemic, with far more mail voting than any other year. 2018\'s early voting ran one day longer, starting Wednesday, Oct. 17, so it is lined up by days before Election Day instead: its Thursday, Oct. 18 matches 2026\'s Thursday, Oct. 15, and the votes from Oct. 17 count toward its totals. They count accepted early and mail ballots the same way, from the State Board\'s final absentee files for those years, and turnout rates use registered voters as of each election.</p>' +
      '<p id="tt-ab-dist">District comparisons use today\'s congressional, NC House and NC Senate lines for every year. Each past precinct is placed in the district where most of its voters who still live at the same address are registered today, and its votes and registered voters count there. A few dozen precincts are split by today\'s lines; each is counted whole in the district that holds most of its voters.</p>' +
      (D.state.nv ? '<p id="tt-ab-new">New voters are people who registered to vote in North Carolina for the first time in 2026. They aren\'t in the State Board\'s November 2024 registration snapshot under any county, and they have no voting history here. Voters who moved between counties or registered here before don\'t count. The comparison years use the same test against their own Election Day registration snapshots. Same-day registrants registered, or updated their address, and voted in one visit to an early voting site; they come from the State Board\'s absentee file.</p>' : '') +
      (D.state.lp ? '<p id="tt-ab-prop">Voter Propensity measures how many of each party\'s voters are low-propensity voters: people who voted in 0 or 1 of the 3 preceding federal elections in North Carolina (November 2020, 2022 and 2024), plus people who voted in 2020 and 2024 but skipped the 2022 midterm. Voters are matched to the State Board\'s voter history file. That includes anyone who turned 18 or moved to North Carolina too recently to have voted in more than one of them. Voters who moved from one North Carolina county to another keep their voting history. The 2018 and 2022 comparisons use the same rule looking back at 2012, 2014 and 2016 (for 2018) and 2016, 2018 and 2020 (for 2022), including people who voted in both presidential elections but skipped the midterm. The 2020 and 2024 comparisons look back at 2014, 2016 and 2018 (for 2020) and 2018, 2020 and 2022 (for 2024) and count only people who voted in 0 or 1 of them. The State Board\'s current voter history file covers the last 10 years, so the 2012 and 2014 elections come from a copy of the same file saved by the Internet Archive on Nov. 8, 2022.</p>' +
      '<p><b>“How much of each party\'s vote is coming from low-propensity voters?”</b> shows what share of each party\'s voters so far are low-propensity voters, compared with previous cycles. A party\'s share appears once that party has at least ' + PROP_MIN + ' voters in the place you\'ve picked.</p>' +
      '<p><b>“How many low-propensity voters have voted so far?”</b> shows the share of each party\'s registered low-propensity voters who have voted.</p>' +
      '<p id="tt-ab-vreg">Vs. registration compares the party split of votes cast (Democratic minus Republican share of all votes) with the same split among registered voters in that county, district or precinct, using the State Board’s current registration file. If the votes so far are D+5 and the registration is D+1, the place shows D+4: Democrats are voting ahead of their share of the registration. Past years use that year’s registration.</p>' +
      '<p id="tt-ab-map">When you pick a county or district, the map, rankings and early voting sites show only what\'s inside it: the part of each county or district that falls inside, counting only the voters who live there, on today\'s lines. The tabs above the map choose the lines (counties, congressional, NC House or NC Senate districts, or precincts); with a place picked, “Inside” shows only its parts and “Whole state” shows every county or district with the picked place outlined. Share this view copies a link that reopens the same map, year, day and tables. The “Showing” bar at the top switches every section that has day-by-day counts to one day of early voting (early in-person votes cast that day); sections without day counts say so. Precincts with fewer than ' + ((PCTD && PCTD.min) || 10) + ' votes are hidden for privacy, along with one more where needed so a small precinct\'s count can\'t be worked out from the total. Download saves the map as an image (wide or tall) or its numbers as a spreadsheet (CSV); rankings and precinct tables download as CSV.</p>' +
      '<p id="tt-ab-rank">Rankings list every county or district by turnout, change since the picked year, party split, vs. registration and the two low-propensity measures; district comparisons use today\'s lines. "Haven\'t voted yet" counts registered voters with no accepted ballot so far, by the same groups as "Voted so far."</p>' : '') +
      (D.state.race ? '<p id="tt-ab-race">Race and Hispanic or Latino ethnicity are as voters listed them on their registration; both questions are optional. Statewide, every race the State Board records gets its own row. Elsewhere, American Indian, Other, two or more races and Pacific Islander each get their own row where they are at least ' + Math.round(RACE_SPLIT * 100) + '% of registered voters, and are otherwise combined as “Another race.” Many Hispanic and Latino voters choose “Other” for race. Ethnicity is shown separately because so many voters leave it blank; the real number of Hispanic and Latino voters is higher than shown. Groups with fewer than ' + RACE_MIN + ' votes in a place show a dash.</p>' : '') +
      '<p id="tt-ab-sites">Early voting sites count early in-person ballots at the site where they were cast. A site\'s party and age breakdown appears once it has ' + SITE_MIN + ' early votes.</p>' + naBlock() +
      (D.state.ed != null && !D.final ? '<p>Election Day votes come from the State Board\'s precinct results. They count the Election Day and provisional ballots cast in the U.S. Senate race, which nearly every voter marks, so they can run slightly below the true number of voters. Exact final turnout, including Election Day voters\' party and age, comes from the State Board\'s voter history a few weeks after the election.</p>' : '') +
      (D.final ? '<p>' + esc(D.final_note || 'Final count from the State Board\'s voter history.') + ' Every voter is counted once, with the party they were registered with when they voted.</p>' : '') + '</details>';
    h += '<div class="tt-foot"><span>Source: <a href="https://www.ncsbe.gov/results-data/absentee-data" target="_blank" rel="noopener">NC State Board of Elections</a>. Analysis: Carolina Forward.</span>' +
      '<span class="tt-footb"><button type="button" class="tt-replay">Replay the intro</button><button type="button" class="tt-share">Share this view</button></span></div>';
    mount.innerHTML = h;

    var pick = mount.querySelector('.tt-pick'), sel = mount.querySelector('.tt-sel'), view = mount.querySelector('.tt-view');

    function sorted(k) {
      var rows = places[k].slice();
      if (k === 'county') rows.sort(function (a, b) { return a.name.localeCompare(b.name); });
      else if (k !== 'state') rows.sort(function (a, b) { return parseInt(a.name.replace(/\D/g, ''), 10) - parseInt(b.name.replace(/\D/g, ''), 10); });
      return rows;
    }
    function newest(r) {
      for (var i = D.days.length - 1; i >= 0; i--) {
        if (D.days[i] >= D.asof) continue;   // the file date itself is incomplete
        var v = (r.tev[i] || 0) + (r.tml[i] || 0);
        if (v > 0) return { day: D.days[i], v: v, ev: r.tev[i] || 0, ml: r.tml[i] || 0 };
      }
      return null;
    }
    function tot(r) { return r.vc + (r.ed || 0); }
    function rate(a, b) { if (!b) return ''; var p = a / b * 100; if (p > 100) return '\u2014'; return (p > 0 && p < 0.1 ? '<0.1' : p.toFixed(1)) + '%'; }   // a dash if registration lags behind (never over 100%)
    var HAS_ED = D.state.ed != null, FINAL = !!D.final;
    function dek(r) {
      if (FINAL) return 'Final count from the State Board\'s voter history.';
      if (HAS_ED) return 'Election Day numbers are the State Board\'s unofficial count and may change slightly until results are certified.';
      if (!r.vc) return 'No votes have been cast here yet.';
      var s;
      if (!r.ev) s = (preEV ? 'All by mail so far. In-person early voting begins Thursday, Oct. 15.' : 'All by mail so far.');
      else s = '';
      return s;
    }
    function addedLine(r) {   // the newest day's votes, under the day-by-day chart
      if (FINAL || HAS_ED || !r.vc) return '';
      var nd = newest(r); if (!nd) return '';
      return '<p class="tt-sharetot tt-added">' + fmt(nd.v) + ' early and mail ' + (nd.v === 1 ? 'vote was' : 'votes were') + ' added for ' + apDate(nd.day) + (nd.ev && nd.ml ? ' (' + fmt(nd.ev) + ' in person, ' + fmt(nd.ml) + ' by mail)' : '') + '.</p>';
    }
    function countUp(el, to) {
      if (animated || !window.requestAnimationFrame || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { el.textContent = fmt(to); return; }
      var t0 = null, dur = 700;
      function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(Math.round(to * e)); if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }

    /* ---- comparisons with past years: statewide, by county, and by today's district lines (baseline_districts.json) ---- */
    function fullDay() {   // the last full day of votes in the file (the file date itself is partial)
      for (var i = D.days.length - 1; i >= 0; i--) if (D.days[i] < D.asof) return i;
      return D.days.length - 1;
    }
    function kNow() { return thruOn() ? dayI : kLatest(); }   // the day comparisons line up with: the picked day in "through" mode, else the latest
    function kLatest() { var i = fullDay(); return i < 0 ? null : Math.round((new Date(D.days[i] + 'T12:00:00Z') - new Date(EV_START + 'T12:00:00Z')) / 864e5); }
    var basedLoading = false;
    function baseRow(r, yr) {   // a past year's numbers for the place shown (the picked year by default): state, county, or today's district lines
      var k = state.geo; yr = yr || vs;
      if (!BASE || !BASE[yr]) return null;
      if (k === 'state' || k === 'county') return BASE[yr].places[k === 'state' ? 'North Carolina' : r.name] || null;
      if (BASED) return BASED[yr] && BASED[yr].districts[k] ? BASED[yr].districts[k][r.name] || null : null;
      loadBased();
      return null;
    }
    function loadBased() {   // past years on today's district lines, fetched the first time a district view or ranking needs them
      if (BASED || basedLoading || !DATA_URL) return;
      basedLoading = true;
      fetch(DATA_URL.replace(/data\.json(\?.*)?$/, 'baseline_districts.json')).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
        .then(function (j) { BASED = j; var y = window.scrollY; show(); window.scrollTo(0, y); }, function () { BASED = {}; });
    }
    var SIDE = {}, sideLoading = {};
    function side(f) {   // a small file next to data.json (candidates.json, edhist.json), fetched the first time a section needs it: undefined while loading, null if it can't load
      if (f in SIDE) return SIDE[f];
      if (!DATA_URL) return null;
      if (!sideLoading[f]) {
        sideLoading[f] = true;
        fetch(DATA_URL.replace(/data\.json(\?.*)?$/, f)).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
          .then(function (j) { SIDE[f] = j; }, function () { SIDE[f] = null; }).then(function () { var y = window.scrollY; show(); window.scrollTo(0, y); });
      }
      return undefined;
    }
    function cmp(r, yr) {
      yr = yr || vs;
      var k = state.geo, p = baseRow(r, yr), kn = kNow();
      if (!p) return null;
      var Y = BASE[yr];
      if (!p || kn === null || kn < Y.k0) return null;
      var last = p.c.length - 1, idx = Math.min(kn - Y.k0, last), now, then, what;
      if (FINAL) { now = tot(r); then = p.fin; what = 'turnout than in ' + yr; }
      else if (HAS_ED) { now = r.vc; then = p.c[last]; what = 'early and mail turnout than in ' + yr; }
      else {
        now = r.vc;   // same as the big number; the few votes dated today are too small to skew the comparison
        then = p.c[idx]; what = 'turnout than at this point in ' + yr;
      }
      // Compare turnout as a share of registered voters, so a larger electorate doesn't count as higher turnout.
      var nowR = r.reg ? now / r.reg * 100 : null, thenR = p.reg ? then / p.reg * 100 : null;
      return { p: p, idx: FINAL || HAS_ED ? last : idx, now: now, then: then, nowR: nowR, thenR: thenR, what: what };
    }
    /* The comparison with every past year: one row per year, each with its change; the outlined row is the picked
       year, which sets every comparison on the page. Tapping a row picks it. */
    var yrsAvail = [];   // past years this place can be compared with (set by cmpLine)
    /* Section controls: each row is a small label ("Show", "By", "Compare with") and a set of square buttons. */
    function crow(label, inner, cls) { return '<div class="tt-crow' + (cls ? ' ' + cls : '') + '"><span class="tt-ypl">' + label + '</span>' + inner + '</div>'; }
    function seg(btns, aria, cls) { return '<span class="tt-who' + (cls ? ' ' + cls : '') + '" role="group" aria-label="' + aria + '">' + btns + '</span>'; }
    function bt(attr, val, label, on, extra) { return '<button type="button" ' + attr + '="' + val + '" aria-pressed="' + !!on + '"' + (on ? ' class="on"' : '') + (extra || '') + '>' + label + '</button>'; }
    // the past years as buttons; any of them changes the year for the whole tracker. mark: highlight the picked year.
    function yrBtns(mark, extra) { return yrsAvail.map(function (y) { return bt('data-vs', y, y, mark && y === vs, extra ? extra(y) : ''); }).join(''); }
    // "2026 | Change since: 2024 2022 2020 2018" for Rankings and the map; attr is the data attribute their own code reads
    function viewYearRow(chg, attr) {
      if (!yrsAvail.length) return '';
      return crow('Year', seg(bt(attr, 'false', '2026', !chg), 'This year') + '<span class="tt-ypl tt-yplin">Change since</span>' +
        seg(yrBtns(chg, function (y) { return ' ' + attr + '="true" data-lab="Change since ' + y + '"'; }), 'Change since a past year'), 'tt-vyr');
    }
    function roundish(x) { return x >= 1e6 ? (x / 1e6).toFixed(x >= 1e7 ? 0 : 2).replace(/0$/, '') + ' million' : x >= 1e4 ? fmt(Math.round(x / 1000) * 1000) : fmt(Math.round(x / 10) * 10); }
    function paceLines(r) {   // under the day-by-day chart: votes so far as a share of the picked year's total turnout
      if (!BASE || !BASE[vs]) return '';
      var c = cmp(r, vs); if (!c || !c.nowR || !c.thenR) return '';
      var t = '';
      if (!FINAL && c.p.fin) t += '<p class="tt-sharetot">Early and mail votes so far are already <b>' + (c.now / c.p.fin * 100).toFixed(1) + '%</b> of ' + vs + '’s total turnout (' + fmt(c.p.fin) + ' votes, early, mail and Election Day).</p>';
      return t;
    }
    function cmpLine(r) {
      var yrs = Object.keys(BASE || {}).sort().reverse(), rows = [], mx = 0, now = null;
      yrs.forEach(function (y) { var c = cmp(r, y); if (c && c.nowR && c.thenR) { rows.push([y, c]); now = c; mx = Math.max(mx, c.thenR, c.nowR); } });
      yrsAvail = rows.map(function (x) { return x[0]; });
      if (!rows.length) return '';
      var pick = rows.filter(function (x) { return x[0] === vs; })[0];
      function pct(c) { return Math.round((c.nowR / c.thenR - 1) * 100); }
      function chip(d) { return '<span class="tt-chip ' + (d === 0 ? 'ev' : d > 0 ? 'up' : 'dn') + '">' + (d === 0 ? 'Same' : (d > 0 ? '▲ ' : '▼ ') + Math.abs(d) + '%') + '</span>'; }
      function bar(n) { return '<span class="tt-ybar"><i style="width:' + (n / mx * 100).toFixed(2) + '%"></i></span>'; }
      var t = '<div class="tt-yrs" role="group" aria-label="Compare with a past year">' +
        '<div class="tt-yr now"><span class="tt-yl">2026</span>' + bar(now.nowR) + '<span class="tt-yv"><b>' + now.nowR.toFixed(1) + '%</b> (' + fmt(now.now) + ')</span><span></span></div>' +
        rows.map(function (x) {
          var y = x[0], c = x[1], on = y === vs;
          return '<button type="button" class="tt-yr' + (on ? ' on' : '') + '" data-vs="' + y + '" aria-pressed="' + on + '" aria-label="Compare with ' + y + ': ' + c.thenR.toFixed(1) + '% at this point, change ' + pct(c) + '%">' +
            '<span class="tt-yl">' + y + '</span>' + bar(c.thenR) + '<span class="tt-yv"><b>' + c.thenR.toFixed(1) + '%</b> (' + fmt(c.then) + ')</span>' + chip(pct(c)) + '</button>';
        }).join('') + '</div>';
      t += '<p class="tt-yrhint">Click a row to display that year\u2019s stats on the rest of the tracker.</p>';
      if (pick) {
        var c = pick[1], d = pct(c), up = d >= 0;
        t += '<div class="tt-cd ' + (up ? 'up' : 'dn') + '">' + (up ? '▲ ' : '▼ ') + Math.abs(d) + '% ' + (up ? 'higher' : 'lower') + ' ' + c.what + '</div>';
      }
      return t + '<p class="tt-cmpnote">Share of registered voters who have voted, compared with the same point in each year. 2022, the last midterm, is the comparison until you pick another year; 2024 and 2020 were presidential years, when turnout runs much higher.</p>' +
        (vs === '2020' ? '<p class="tt-cmpnote">2020 was a presidential election held during the pandemic, with about 1 million mail ballots, far more than any other year here. Expect 2026 to trail it.</p>' : '') +
        (state.geo !== 'state' && state.geo !== 'county' ? '<p class="tt-cmpnote">Past years use today’s district lines: their votes are counted in the precincts that make up this district now.</p>' : '');
    }

    /* One day: picking a day (the bar pinned at the top, or a bar on the day-by-day chart) switches every section that has day
       counts to that day's early in-person votes; each section is tagged with the day, or says it shows all votes so far. */
    function setDay(i) { dayI = i; mapCard = null; var y = window.scrollY; show(); window.scrollTo(0, y); }
    function dayIso() { return EV_DAYS[dayI]; }
    function dayShort(i) { var d = EV_DAYS[i]; return WDL[dow(d)].slice(0, 3) + '., ' + apDate(d); }
    function dayBar(r) {
      var last = kLatest(), st = places.state[0];
      if (last === null || last < 0 || !st.dd || preEV) return '';
      var opts = '<option value=""' + (dayI === null ? ' selected' : '') + '>All votes so far</option>';
      opts = '<option value=""' + (dayI === null ? ' selected' : '') + '>All votes so far (early and mail)</option>';
      for (var i = 0; i <= Math.min(last, EV_DAYS.length - 1); i++) if (st.dd[i]) opts += '<option value="' + i + '"' + (dayI === i ? ' selected' : '') + '>' + (dayMode === 'thru' ? 'Through ' + dayShort(i) : 'Early in-person votes on ' + dayShort(i)) + ' (day ' + (i + 1) + ')</option>';
      var lab = dayI === null ? '' : WDL[dow(dayIso())] + ', ' + apDate(dayIso());
      return '<div class="tt-daybar' + (dayI !== null ? ' on' : '') + '"><label><span>Showing</span><select data-dayp aria-label="Show all votes so far, or one day of early voting">' + opts + '</select></label>' +
        (dayI !== null ? '<span class="tt-who tt-dmode" role="group" aria-label="One day or through that day">' + bt('data-dmode', 'only', 'Only that day', dayMode === 'only') + bt('data-dmode', 'thru', 'Through that day', dayMode === 'thru') + '</span>' +
          '<span class="tt-daymsg">' + (dayMode === 'thru' ? 'All early and mail votes cast through the end of <b>' + esc(lab) + '</b>' : 'Early in-person votes cast on <b>' + esc(lab) + '</b> only') + '</span><button type="button" class="tt-dayx">Back to all days</button>' : '') + '</div>';
    }
    function dayN(x) { return x ? x[0] + x[1] + x[2] + x[3] : 0; }
    function dayHead(r) {
      var x = r.dd[dayI], n = dayN(x), di = D.days.indexOf(dayIso()), ml = di >= 0 && r.tml ? r.tml[di] || 0 : 0;
      var t = '<div class="tt-head"><span class="tt-big" data-day="' + n + '">' + fmt(n) + '</span><span class="tt-hl">early in-person ' + (n === 1 ? 'vote' : 'votes') + ' on ' + esc(dayShort(dayI)) + '</span></div>';
      if (r.reg) t += '<div class="tt-reg"><b>' + (n / r.reg * 100).toFixed(2) + '%</b> of ' + fmt(r.reg) + ' registered voters voted early in person that day</div>';
      var yrs = Object.keys(BASE || {}).sort().reverse(), rows = [], mx = 0, nowR = r.reg ? n / r.reg * 100 : null;
      yrs.forEach(function (y) { var p = baseRow(r, y); if (p && p.dd && p.dd[dayI] && p.reg && nowR) { var th = dayN(p.dd[dayI]), tr = th / p.reg * 100; if (tr > 0) { rows.push([y, th, tr]); mx = Math.max(mx, tr, nowR); } } });
      yrsAvail = rows.map(function (q) { return q[0]; });
      if (rows.length) {
        var bar = function (v) { return '<span class="tt-ybar"><i style="width:' + (v / mx * 100).toFixed(2) + '%"></i></span>'; };
        var chip = function (d) { return '<span class="tt-chip ' + (d === 0 ? 'ev' : d > 0 ? 'up' : 'dn') + '">' + (d === 0 ? 'Same' : (d > 0 ? '▲ ' : '▼ ') + Math.abs(d) + '%') + '</span>'; };
        t += '<div class="tt-yrs" role="group" aria-label="Compare with the same day of early voting in a past year">' +
          '<div class="tt-yr now"><span class="tt-yl">2026</span>' + bar(nowR) + '<span class="tt-yv"><b>' + nowR.toFixed(2) + '%</b> (' + fmt(n) + ')</span><span></span></div>' +
          rows.map(function (q) { var on = q[0] === vs, d = Math.round((nowR / q[2] - 1) * 100);
            return '<button type="button" class="tt-yr' + (on ? ' on' : '') + '" data-vs="' + q[0] + '" aria-pressed="' + on + '"><span class="tt-yl">' + q[0] + '</span>' + bar(q[2]) + '<span class="tt-yv"><b>' + q[2].toFixed(2) + '%</b> (' + fmt(q[1]) + ')</span>' + chip(d) + '</button>'; }).join('') + '</div>';
        var pk = rows.filter(function (q) { return q[0] === vs; })[0];
        if (pk) { var d = Math.round((nowR / pk[2] - 1) * 100), bd = new Date(Date.parse(BASE[vs].ev_start + 'T12:00:00Z') + dayI * 864e5).toISOString().slice(0, 10);
          t += '<div class="tt-cd ' + (d >= 0 ? 'up' : 'dn') + '">' + (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d) + '% ' + (d >= 0 ? 'higher' : 'lower') + ' turnout than on day ' + (dayI + 1) + ' of early voting in ' + vs + ' (' + WDL[dow(bd)] + ', ' + apDate(bd) + ')</div>'; }
        t += '<p class="tt-cmpnote">Share of registered voters who voted early in person that day, compared with the same day of early voting in each year.</p>';
      }
      t += '<div class="tt-row"><div class="tt-cell"><div class="tt-cl"><i class="ev"></i>Early in person</div><div class="tt-cn">' + fmt(n) + '</div><div class="tt-cs">On ' + esc(dayShort(dayI)) + '</div></div>' +
        '<div class="tt-cell"><div class="tt-cl"><i class="ml"></i>By mail</div><div class="tt-cn">' + fmt(ml) + '</div><div class="tt-cs">Accepted on ' + esc(dayShort(dayI)) + '</div></div>' +
        '<div class="tt-cell"><div class="tt-cl">So far</div><div class="tt-cn">' + fmt(tot(r)) + '</div><div class="tt-cs">All early and mail votes</div></div></div>';
      return t;
    }
    /* "?" next to low-propensity labels: what the term means */
    var LP_DEF = 'Low-propensity voters voted in 0 or 1 of the last 3 federal elections (November 2020, 2022 and 2024), or voted in 2020 and 2024 but skipped 2022.';
    function lpQ() { return '<button type="button" class="tt-q" aria-label="What does low-propensity mean?" data-q="lp">?</button>'; }
    function regQ() { return '<button type="button" class="tt-q" aria-label="What does vs. registration mean?" data-q="vreg">?</button>'; }
    function mq(k2) { var l = MAPS[k2].label; return l + '<span class="tt-q tt-qm" role="button" tabindex="0" aria-label="What does ' + esc(l) + ' mean?" data-q="m:' + k2 + '">?</span>'; }
    function mapDef(k2) {   // one Color by button's "?"
      var l = MAPS[k2].label, lp = k2 === 'lpturn' || k2 === 'lpgap';
      return '<p style="margin:0 0 6px"><b>' + esc(l) + ':</b> ' + esc(MAP_DEFS[l] || '') + '</p>' +
        (lp ? '<p style="margin:0 0 6px">' + esc(LP_DEF) + '</p>' : '') +
        (k2 !== 'turn' ? '<p style="margin:0;font-style:italic">Party is registration, not vote choice.</p>' : '');
    }
    var rkCtx = {};
    function rkQ(k) { return '<button type="button" class="tt-q" aria-label="What does this column mean?" data-q="rk:' + k + '">?</button>'; }
    function rkDef(k) {   // a Rankings column's "?": what it is, how it changes in Change since mode, and the caveats that apply to it
      var y = rkCtx.vs, ch = rkCtx.chg, P = '<p style="margin:0 0 6px">', t;
      if (/^x:/.test(k)) { var xk = k.slice(2), xd = RK_XDEF[xk] || '';
        if (rkCtx.day) xd = xd.replace(/who have voted/g, 'who voted that day').replace(/Early in-person and mail votes cast/, 'Early in-person votes cast that day').replace(/Votes cast/, 'Early in-person votes cast that day');
        return P + '<b>' + esc(rkX(xk)[1]) + ':</b> ' + esc(xd) + '</p>' + (ch ? P + 'Beneath: the same number at the same ' + (rkCtx.day ? 'day' : 'point') + ' in ' + y + (rkCtx.geo !== 'county' ? ', on today\u2019s district lines' : '') + '.</p>' : '') +
          (/^l/.test(xk) ? P + esc(LP_DEF) + '</p>' : '') + (/^(v|s|r|l|regm)/.test(xk) && xk !== 'votes' && xk !== 'reg' ? '<p style="margin:0;font-style:italic">Party is registration, not vote choice.</p>' : ''); }
      var base = { turn: '<b>Turnout:</b> share of registered voters who have voted.', party: '<b>Party split:</b> Democratic minus Republican share of votes so far.',
        vreg: '<b>Vs. registration:</b> the party split minus the party split of registered voters here.',
        lpturn: '<b>Low-prop. turnout:</b> the share of registered low-propensity Democrats and of registered low-propensity Republicans who have voted. Click the heading again to sort by the D rate, the R rate or the gap between them.',
        lpgap: '<b>Low-prop. margin:</b> Democratic minus Republican share of the low-propensity voters who have voted.' }[k];
      if (rkCtx.votes) base = { turn: '<b>Votes:</b> early and mail votes cast so far.', party: '<b>Net votes:</b> Democratic votes minus Republican votes so far.',
        vreg: '<b>Vs. registration, in votes:</b> how many more votes Democrats (D) or Republicans (R) have than they would if the votes split the same way as registered voters here.',
        lpturn: '<b>Low-prop. voters:</b> low-propensity Democrats and Republicans who have voted. Click the heading again to sort by Democrats, Republicans or the gap between them.',
        lpgap: '<b>Low-prop. net:</b> low-propensity Democrats who have voted minus low-propensity Republicans.' }[k];
      if (rkCtx.day) base = base.replace(/who have voted/g, 'who voted that day').replace(/ so far/g, ' that day').replace(/early and mail votes cast/, 'early in-person votes cast');
      t = P + base + '</p>';
      if (ch && rkCtx.votes) t += P + 'Change in votes since the same ' + (rkCtx.day ? 'day' : 'point') + ' in ' + y + '. More people are registered than in past years, so counts tend to rise even when turnout rates don\u2019t.' + (rkCtx.geo !== 'county' ? ' Past years use today\u2019s district lines.' : '') + '</p>';
      else if (ch) t += P + (k === 'turn' ? 'Change since the same ' + (rkCtx.day ? 'day' : 'point') + ' in ' + y + ', in percentage points.' : k === 'lpturn' ? 'The change in the Democratic rate minus the change in the Republican rate since the same ' + (rkCtx.day ? 'day' : 'point') + ' in ' + y + ', in percentage points.' : 'The shift toward Democrats (D) or Republicans (R) since the same ' + (rkCtx.day ? 'day' : 'point') + ' in ' + y + ', in percentage points.') + (rkCtx.geo !== 'county' ? ' Past years use today\u2019s district lines.' : '') + '</p>';
      if (k === 'lpturn' || k === 'lpgap') t += P + esc(LP_DEF) + '</p>';
      if (rkCtx.pick) t += P + 'Each row is only the part inside ' + esc(rkCtx.pick) + ', with only the voters who live there, on today\u2019s lines.</p>';
      if (k !== 'turn') t += '<p style="margin:0;font-style:italic">Party is registration, not vote choice.</p>';
      return t;
    }
    function mapQ() { return '<button type="button" class="tt-q" aria-label="What do these mean?" data-q="map">?</button>'; }
    /* the map's "?": one bolded heading per Color by button, in the order shown, then the shared definition and caveat */
    var MAP_DEFS = {
      'Turnout': 'share of registered voters who have voted.',
      'Party split': 'Democratic minus Republican share of votes so far, by party registration.',
      'Vs. registration': 'party split of votes minus party split of registered voters. Votes D+5 and registration D+1 gives D+4.',
      'Low-propensity turnout': 'which party is turning out more of its own low-propensity voters. Each party\u2019s rate is the share of its registered low-propensity voters who have voted, and each place is colored by the party with the higher rate. Click or tap a place for both rates.',
      'Low-propensity margin': 'who makes up the low-propensity vote so far: the Democratic share of low-propensity voters who have voted minus the Republican share. Unlike low-propensity turnout, it also reflects how many low-propensity voters each party has to begin with.',
      'By race': 'turnout and party split for each racial and ethnic group.'
    };
    function mapDefs(b) {
      var row = b.closest('.tt-crow'), labs = row ? Array.prototype.map.call(row.querySelectorAll('[data-map]'), function (x) { return x.textContent.trim(); }) : Object.keys(MAP_DEFS);
      return labs.filter(function (l) { return MAP_DEFS[l]; }).map(function (l) { return '<p style="margin:0 0 6px"><b>' + esc(l) + ':</b> ' + esc(MAP_DEFS[l]) + '</p>'; }).join('') +
        '<p style="margin:0;font-style:italic">Low-propensity = voted in 0 or 1 of the last 3 November elections, or in 2020 and 2024 but not 2022. Party is registration, not vote choice.</p>';
    }
    var VREG_DEF = 'Vs. registration compares the party split of votes cast with the party split of registered voters in the same place. If votes are D+5 and registration is D+1, that\u2019s D+4: Democrats are voting ahead of their share of the registration. Party is registration, not vote choice.';
    function qWire() {
      if (mount.getAttribute('data-qw')) return; mount.setAttribute('data-qw', '1');
      function close() { var o = document.querySelector('.tt-qpop'); if (o) o.parentNode.removeChild(o); }
      mount.addEventListener('keydown', function (e) { var q = e.target.closest && e.target.closest('span.tt-q'); if (q && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); q.click(); } }, true);
      mount.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.tt-q');
        if (!b) { close(); return; }
        e.stopPropagation(); e.preventDefault();
        var open = document.querySelector('.tt-qpop'), same = open && open.__btn === b; close();
        b.setAttribute('aria-expanded', same ? 'false' : 'true');
        if (same) return;   // a second click on the same ? closes it
        var pop = document.createElement('div'); pop.__btn = b; pop.className = SLUG + ' tt-qpop'; pop.setAttribute('role', 'note'); var qk = b.getAttribute('data-q'); if (qk === 'map') pop.innerHTML = mapDefs(b); else if (qk.indexOf('rk:') === 0) pop.innerHTML = rkDef(qk.slice(3)); else if (qk.indexOf('m:') === 0) pop.innerHTML = mapDef(qk.slice(2)); else pop.textContent = qk === 'vreg' ? VREG_DEF : LP_DEF; pop.setAttribute('data-y', window.scrollY); document.body.appendChild(pop);
        var rc = b.getBoundingClientRect(), w = pop.offsetWidth;
        pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, rc.left + rc.width / 2 - w / 2)) + 'px';
        pop.style.top = (rc.bottom + 6 + pop.offsetHeight > window.innerHeight ? rc.top - pop.offsetHeight - 6 : rc.bottom + 6) + 'px';
      }, true);
      window.addEventListener('scroll', function () { var o = document.querySelector('.tt-qpop'); if (o && Math.abs(window.scrollY - (+o.getAttribute('data-y'))) > 60) close(); }, { passive: true });   // a small nudge doesn't close it
    }
    function dayTags() {
      qWire();   // a bar above each section: the day it shows (if one is picked), whether it covers all of the picked place, and a way back to statewide
      var pick = state.geo !== 'state';
      Array.prototype.forEach.call(view.querySelectorAll(':scope > .tt-sec'), function (sec) {
        var h = sec.querySelector('.tt-sech'); if (!h) return;
        var bits = [];
        if (dayI !== null && !sec.classList.contains('tt-edh')) {
          var ok = thruOn() ? /tt-map|tt-rank|tt-calsec|tt-sitesec|tt-pctab/.test(sec.className)
            : !sec.classList.contains('tt-gfx') && !sec.classList.contains('tt-pctsec') && !sec.classList.contains('tt-nodayp');
          bits.push('<span class="tt-dtag' + (ok ? '' : ' off') + '">' + (ok ? (thruOn() ? 'Through ' + esc(dayShort(dayI)) : esc(dayShort(dayI)) + ' only') : 'All votes so far \u00B7 not available ' + (thruOn() ? 'for an earlier day' : 'by day')) + '</span>');
        }
        if (pick && (sec.classList.contains('tt-whosec') || sec.classList.contains('tt-gfx') || sec.classList.contains('tt-calsec')))
          bits.push('<span class="tt-ptag">All of ' + esc(shortPick()) + '</span>');
        var ab = sec.classList.contains('tt-map') || sec.classList.contains('tt-pctab') ? 'map' : sec.classList.contains('tt-rank') ? 'rank' : sec.classList.contains('tt-calsec') ? 'cmp' : sec.classList.contains('tt-sitesec') ? 'sites' :
          sec.classList.contains('tt-gfx') ? 'prop' : sec.classList.contains('tt-whosec') ? ({ prop: 'prop', race: 'race', new: 'new' }[who] || 'votes') : null;
        if (ab && view.ownerDocument.getElementById('tt-ab-' + ab)) bits.push('<button type="button" class="tt-about" data-ab="' + ab + '">About this</button>');
        if (pick) bits.push('<button type="button" class="tt-tostate">\u2190 Statewide</button>');
        if (bits.length) h.insertAdjacentHTML('beforebegin', '<div class="tt-secbar">' + bits.join('') + '</div>');
      });
      Array.prototype.forEach.call(view.querySelectorAll('.tt-about'), function (b) { b.addEventListener('click', function () {
        var p = document.getElementById('tt-ab-' + b.getAttribute('data-ab')), d = mount.querySelector('details.tt-how'); if (!p || !d) return;
        d.open = true; p.scrollIntoView({ block: 'center', behavior: 'smooth' }); p.classList.remove('tt-flash'); void p.offsetWidth; p.classList.add('tt-flash');
      }); });
      Array.prototype.forEach.call(view.querySelectorAll('.tt-tostate'), function (b) { b.addEventListener('click', function () {
        var top = mount.getBoundingClientRect().top + window.scrollY - 10; setGeo('state'); window.scrollTo(0, top); }); });
    }
    /* Collapsible sections: every section's heading is a button that folds the section down to its heading. Which
       sections are folded stays put across places and redraws, and rides along in shared links (fold=map.rank). */
    var folded = {}, FOLD_SKIP = { 'tt-sec': 1, 'tt-nodl': 1, 'tt-nodayp': 1, 'tt-folded': 1, 'tt-flash': 1 };
    var FOLD_KEYS = ['map', 'pctab', 'rank', 'calsec', 'edh', 'sitesec', 'precincts', 'whosec', 'tiers', 'gfx'];
    function foldKey(sec) {
      var c = Array.prototype.filter.call(sec.classList, function (x) { return !FOLD_SKIP[x]; })[0];
      return c ? c.replace(/^tt-/, '') : 'precincts';   // "Turnout by precinct" has no class of its own
    }
    function foldWire() {
      var secs = view.querySelectorAll(':scope > .tt-sec'), anyShut = false, anyOpen = false;
      Array.prototype.forEach.call(secs, function (sec) {
        var h = sec.querySelector(':scope > .tt-sech'); if (!h || h.querySelector('.tt-fold')) return;
        var key = foldKey(sec), shut = !!folded[key], b = document.createElement('button');
        b.type = 'button'; b.className = 'tt-fold'; b.setAttribute('data-fold', key); b.setAttribute('aria-expanded', String(!shut));
        b.title = shut ? 'Show this section' : 'Hide this section';
        b.innerHTML = '<i class="tt-foldi" aria-hidden="true"></i>';
        while (h.firstChild && h.firstChild.nodeType === 3) b.appendChild(h.firstChild);   // the heading text becomes the button
        h.insertBefore(b, h.firstChild);
        sec.classList.toggle('tt-folded', shut);
        if (shut) anyShut = true; else anyOpen = true;
      });
      var first = secs[0];
      if (first && secs.length > 1) first.insertAdjacentHTML('beforebegin', '<div class="tt-foldall">' +
        (anyOpen ? '<button type="button" data-foldall="1">Collapse all sections</button>' : '') +
        (anyShut ? '<button type="button" data-foldall="0">Expand all sections</button>' : '') + '</div>');
    }
    function edpShow(path) {
      var F = EDP[edpYr]; if (!F || !path) return;
      edpPick = path.getAttribute('data-edp');
      var o = edpRows(F).filter(function (x) { return x.name === edpPick; })[0], cap = view.querySelector('.tt-edpcap');
      Array.prototype.forEach.call(view.querySelectorAll('.tt-edpmap path.on'), function (x) { x.classList.remove('on'); });
      path.classList.add('on'); path.parentNode.appendChild(path);   // on top, so its outline shows
      if (cap) cap.innerHTML = edpCap(o);
    }
    view.addEventListener('click', function (e) { var p = e.target.closest && e.target.closest('.tt-edpmap path'); if (p) edpShow(p); });
    view.addEventListener('mouseover', function (e) { var p = e.target.closest && e.target.closest('.tt-edpmap path'); if (p && !p.classList.contains('on')) edpShow(p); });
    view.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-fold],[data-foldall]'); if (!b || !view.contains(b)) return;
      e.preventDefault();
      var key = b.getAttribute('data-fold'), sec = b.closest('.tt-sec'), top = (sec || b).getBoundingClientRect().top;
      if (key) { if (folded[key]) delete folded[key]; else folded[key] = 1; }
      else {
        folded = {};
        if (b.getAttribute('data-foldall') === '1') {
          FOLD_KEYS.forEach(function (k) { folded[k] = 1; });
          Array.prototype.forEach.call(view.querySelectorAll(':scope > .tt-sec'), function (x) { folded[foldKey(x)] = 1; });
        }
      }
      interacted = true;
      var y = window.scrollY; show(); window.scrollTo(0, y);
      var nb = key ? view.querySelector('[data-fold="' + key + '"]') : view.querySelector('.tt-foldall button');
      if (nb) { window.scrollBy(0, (nb.closest('.tt-sec') || nb).getBoundingClientRect().top - top); try { nb.focus({ preventScroll: true }); } catch (er) { nb.focus(); } }
    });
    function vregHead(r) {   // party split of the votes vs. the party split of registered voters here
      var m = measures(r).now; if (m.party === null || m.party === undefined || m.regm === null) return '';
      var col = function (x) { return x > 0.5 ? 'var(--pd)' : x < -0.5 ? 'var(--pr)' : 'var(--ink)'; }, v = m.vreg, a = Math.round(Math.abs(v));
      return '<div class="tt-vreg"><div><span>Party split of ' + (dayOn() ? 'votes that day' : 'votes so far') + '</span><b style="color:' + col(m.party) + '">' + dr(m.party, 0) + '</b></div>' +
        '<div><span>Party split of registered voters</span><b style="color:' + col(m.regm) + '">' + rdr(m.regm) + '</b></div>' +
        '<div><span>Vs. registration' + regQ() + '</span><b style="color:' + col(v) + '">' + dr(v, 0) + '</b></div>' +
        '<p>' + (a < 1 ? 'The votes so far split about the same way as the registration here.' : (v > 0 ? 'Democrats' : 'Republicans') + ' are voting ' + a + (a === 1 ? ' point' : ' points') + ' ahead of their registration margin here.') + ' Party is registration, not vote choice.</p></div>';
    }
    function show() {
      var k = state.geo, r = places[k].filter(function (x) { return x.name === state.sel[k]; })[0];
      if (!r) return;
      dynCache = {};
      var cu = r.cure || 0;
      var v = '<div class="tt-brand"><img src="' + CF_LOGO + '" alt="" width="26" height="26"><b>Carolina Forward</b><span>NC Turnout Tracker \u00B7 ' + CF_URL + '</span></div>';
      v += '<div class="tt-place">' + esc(LONG[k](r.name)) + '</div>';
      v += candLine(r);
      v += dayBar(r);
      var r0 = r; r = asOf(r);   // through a day: the headline, map and rankings use the numbers as of that day
      if (dayOn() && r.dd && r.dd[dayI]) v += dayHead(r); else {
      v += '<div class="tt-head"><span class="tt-big">' + fmt(tot(r)) + '</span><span class="tt-hl">' + (tot(r) === 1 ? 'vote' : 'votes') + (thruOn() ? ' cast through ' + esc(dayShort(dayI)) : HAS_ED ? ' cast' : ' cast so far') + '</span></div>';
      if (r.reg) v += '<div class="tt-reg"><b>' + rate(tot(r), r.reg) + '</b> of ' + fmt(r.reg) + ' registered voters have voted</div>';
      v += cmpLine(r);
      if (!thruOn()) { var dk = dek(r); if (dk) v += '<p class="tt-dek">' + dk + '</p>'; }
      v += '<div class="tt-row' + (HAS_ED && !FINAL ? ' four' : '') + '">' +
        '<div class="tt-cell"><div class="tt-cl"><i class="ev"></i>Early in person</div><div class="tt-cn' + (r.ev || !preEV ? '' : ' dash') + '">' + (r.ev || !preEV ? fmt(r.ev) : 'Oct. 15') + '</div>' +
        '<div class="tt-cs">' + (thruOn() ? 'Through ' + esc(dayShort(dayI)) : preEV ? 'Begins Thursday' : D.asof > '2026-10-31' ? 'Early voting is over' : 'Sites close 3 p.m. Sat., Oct. 31') + '</div></div>' +
        '<div class="tt-cell"><div class="tt-cl"><i class="ml"></i>By mail</div><div class="tt-cn">' + fmt(r.ml) + '</div><div class="tt-cs">' + (thruOn() ? 'Accepted through ' + esc(dayShort(dayI)) : 'Mail ballots accepted so far') + '</div></div>' +
        (HAS_ED ? '<div class="tt-cell"><div class="tt-cl"><i class="ed"></i>Election Day</div><div class="tt-cn">' + fmt(r.ed || 0) + '</div><div class="tt-cs">' + (FINAL ? 'Final' : 'Unofficial count') + '</div></div>' : '') +
        (FINAL || thruOn() ? '' : '<div class="tt-cell"><div class="tt-cl">Mail ballots needing a fix</div><div class="tt-cn' + (cu ? ' fix' : '') + '">' + fmt(cu) + '</div><div class="tt-cs">Waiting on the voter' + (r.cured != null ? ' \u00B7 ' + fmt(r.cured) + ' fixed so far' : '') + '</div></div>') + '</div>';
      }
      v = v.replace(/(<div class="tt-row[^"]*">)(?![\s\S]*<div class="tt-row)/, function (m0) { return vregHead(r) + m0; });
      if (!FINAL) v += '<p class="tt-cure">Voted by mail? <a href="' + LOOKUP + '" target="_blank" rel="noopener">Look up your ballot</a> to see whether it has been accepted or needs a fix (a missing signature, ID or witness, for example). The same State Board lookup shows your precinct and districts.</p>';
      r = r0;   // every section below works from the full record (the map and rankings apply the day themselves)
      var sites = k === 'county' ? ((D.sites || {})[r.name] || []) : [], cur = site && sites.filter(function (x) { return x[0] === site; })[0];
      if (!cur) site = null;
      v += mapBlock(r);
      if (k !== 'state' && !precinctBlock(r)) v += pctTable(r);
      v += rankBlock(r);
      v += '<div class="tt-sec tt-calsec"><div class="tt-sech">Early voting, day by day<span class="tt-dayof"></span></div>' + (cur ? '' : calYrRow(r)) +
        (cur ? '<div class="tt-calsub"><span>Showing <b>' + esc(site) + '</b> only</span><button type="button" class="tt-linkbtn tt-allsites">Show all of ' + esc(r.name) + ' County</button></div>' : '') +
        '<div class="tt-cal" tabindex="0" role="group" aria-label="Early votes cast each day, Oct. 15 to 31. Use arrow keys to read each day."></div><div class="tt-calnote" aria-live="polite"></div>' + (cur ? '' : paceLines(r) + addedLine(r) + dayPartyBlock(r)) + '</div>';
      if (!cur) v += edBlock(r);
      lastArgs = { k: k, r: r, sites: sites };
      v += sitesBlock(k, r, sites);
      if (k !== 'state') v += precinctBlock(r);
      v += partyBlock(cur ? { vc: cur[1].reduce(function (a, b) { return a + b; }, 0), pty: cur[2], age: cur[3], race: cur[4], eth: cur[5], site: cur[0], county: r.name, regRow: r } : r);
      if (!cur && /^(state|county|cd|hd|sd)$/.test(k)) v += tierBlock(r);
      if (!cur) v += shareBlock(r);
      view.innerHTML = v;
      dayTags();
      foldWire();
      Array.prototype.forEach.call(view.querySelectorAll('[data-dayp]'), function (sel) { sel.addEventListener('change', function () { setDay(sel.value === '' ? null : +sel.value); }); });
      Array.prototype.forEach.call(view.querySelectorAll('.tt-dayx'), function (b) { b.addEventListener('click', function () { setDay(null); }); });
      Array.prototype.forEach.call(view.querySelectorAll('[data-dmode]'), function (b) { b.addEventListener('click', function () { dayMode = b.getAttribute('data-dmode'); setDay(dayI); }); });
      var bigEl = view.querySelector('.tt-big'); if (bigEl) { if (bigEl.hasAttribute('data-day')) bigEl.textContent = fmt(+bigEl.getAttribute('data-day')); else countUp(bigEl, tot(r)); }
      if (yrsAvail.length > 1) {
        // Who has voted: the years sit in its "Compared with the same point in ____" heading when it has one, else as a control row
        var ws = view.querySelector(':scope > .tt-whosec');
        if (ws) {
          var hh = ws.querySelector('.tt-shh'), m = hh && /^(Compared with (?:the same point in|early and mail voting in)) (\d{4})$/.exec(hh.textContent.trim());
          if (m) hh.innerHTML = esc(m[1]) + ' <span class="tt-who tt-yin" role="group" aria-label="Compare with">' + yrBtns(true) + '</span>';
          else { var rows = ws.querySelectorAll('.tt-crow'); var last = rows[rows.length - 1] || ws.querySelector('.tt-sech'); last.insertAdjacentHTML('afterend', crow('Compare with', seg(yrBtns(true), 'Compare with'))); }
        }
        var gs = view.querySelector(':scope > .tt-gfx .tt-sech'); if (gs) gs.insertAdjacentHTML('afterend', crow('Compare with', seg(yrBtns(true), 'Compare with')));
      }
      Array.prototype.forEach.call(view.querySelectorAll('[data-vs]'), function (b) {
        b.addEventListener('click', function () {   // keep the section that was clicked where it is on screen
          var sec = b.closest('.tt-sec'), secs = Array.prototype.slice.call(view.querySelectorAll(':scope > .tt-sec')), i = secs.indexOf(sec), top = sec ? sec.getBoundingClientRect().top : 0, y = window.pageYOffset;
          vs = b.getAttribute('data-vs');
          if (b.hasAttribute('data-rkc')) rkChg = true;
          if (b.hasAttribute('data-mchg')) mapChg = true;
          if (b.hasAttribute('data-ptc')) ptChg = true;
          show(); window.scrollTo(0, y);
          if (i >= 0) { var now = view.querySelectorAll(':scope > .tt-sec')[i]; if (now) window.scrollBy(0, now.getBoundingClientRect().top - top); }
        });
      });
      drawCal(view.querySelector('.tt-cal'), cur ? siteRow(cur) : r);
      Array.prototype.forEach.call(view.querySelectorAll('[data-calp]'), function (b) { b.addEventListener('click', function () { calParty = b.getAttribute('data-calp') === '1'; var sy = window.scrollY; show(); window.scrollTo(0, sy); }); });
      Array.prototype.forEach.call(view.querySelectorAll('[data-calyr]'), function (b) { b.addEventListener('click', function () {
        var y = b.getAttribute('data-calyr'), i = calYrs.indexOf(y); if (i >= 0) calYrs.splice(i, 1); else calYrs.push(y); var sy = window.scrollY; show(); window.scrollTo(0, sy); }); });
      var pss = view.querySelector('[data-psday]'); if (pss) pss.addEventListener('change', function () { psDay = +pss.value; var y = window.scrollY; show(); window.scrollTo(0, y); });
      Array.prototype.forEach.call(view.querySelectorAll('[data-psthru],[data-psv]'), function (b) { b.addEventListener('click', function () {
        if (b.hasAttribute('data-psthru')) psThru = b.getAttribute('data-psthru') === '1'; else psVotes = b.getAttribute('data-psv') === '1';
        var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      naFill(r, k);
      wireMap();
      wireRank();
      wireDl();
      wireShare(r);
      wireTier(r);
      Array.prototype.forEach.call(view.querySelectorAll('.tt-sites tr.go'), function (tr) {
        function go() {
          var c = tr.getAttribute('data-c'), n = tr.getAttribute('data-s');
          delete folded.calsec;
          if (c && state.geo !== 'county') { state.sel.county = c; site = n; setGeo('county'); }
          else { site = site === n ? null : n; show(); }
          var cal = view.querySelector(':scope > .tt-calsec') || view.querySelector('.tt-sec'); if (cal && cal.scrollIntoView) cal.scrollIntoView({ block: 'start' });
        }
        tr.addEventListener('click', go);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      });
      Array.prototype.forEach.call(view.querySelectorAll('.tt-allsites,.tt-allsites2'), function (b) { b.addEventListener('click', function () { site = null; show(); }); });
      Array.prototype.forEach.call(view.querySelectorAll('.tt-alldays'), function (b) { b.addEventListener('click', function () { dayI = null; var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      Array.prototype.forEach.call(view.querySelectorAll('[data-left]'), function (b) { b.addEventListener('click', function () { leftMode = b.getAttribute('data-left') === 'true'; var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      Array.prototype.forEach.call(view.querySelectorAll('.tt-who button[data-who]'), function (b) { b.addEventListener('click', function () { who = b.getAttribute('data-who'); var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      var epa = view.querySelector('.tt-edpall'); if (epa) epa.addEventListener('click', function () { edpAll = !edpAll; var y = window.scrollY; show(); window.scrollTo(0, y); });
      Array.prototype.forEach.call(view.querySelectorAll('[data-edpy],[data-edpm]'), function (b) { b.addEventListener('click', function () {
        if (b.hasAttribute('data-edpy')) edpYr = b.getAttribute('data-edpy'); else edpM = b.getAttribute('data-edpm');
        var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      var pta = view.querySelector('.tt-ptall'); if (pta) pta.addEventListener('click', function () { ptAll = !ptAll; var y = window.scrollY; show(); window.scrollTo(0, y); });
      Array.prototype.forEach.call(view.querySelectorAll('.tt-pctab [data-ptc]:not([data-vs])'), function (b) { b.addEventListener('click', function () { ptChg = b.getAttribute('data-ptc') === 'true'; var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      var mp = view.querySelector('.tt-morepct'); if (mp) mp.addEventListener('click', function () { allPct = !allPct; show(); });
      [['data-ss', siteSort], ['data-ps', pctSort], ['data-pts', ptSort], ['data-edps', edpSort]].forEach(function (z) {
        Array.prototype.forEach.call(view.querySelectorAll('[' + z[0] + ']'), function (b) {
          b.addEventListener('click', function () { var key = b.getAttribute(z[0]), st = z[1]; if (st.k === key) st.d = -st.d; else { st.k = key; st.d = key === 'name' ? 1 : -1; } var y = window.scrollY; show(); window.scrollTo(0, y); });
        });
      });
      dsort(view);
      var ss = view.querySelectorAll('.tt-showsites');
      Array.prototype.forEach.call(ss, function (b) { b.addEventListener('click', function () { if (dayI === null) showStateSites = !showStateSites; else daySitesHidden = !daySitesHidden; var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      var more = view.querySelector('.tt-moresites'); if (more) more.addEventListener('click', function () { allSites = !allSites; show(); });
      animated = true;
      if (interacted) setHash();
    }

    /* Early voting sites. Counts are early in-person ballots only, by the site where they were cast. */
    function siteRow(x) {
      var tev = D.days.map(function (d) { var i = EV_DAYS.indexOf(d); return i === -1 ? 0 : (x[1][i] || 0); });
      return { tev: tev, name: x[0] };
    }
    function lastDay() {
      for (var i = EV_DAYS.length - 1; i >= 0; i--) if (EV_DAYS[i] < D.asof && D.days.indexOf(EV_DAYS[i]) !== -1) return i;   // the file date itself is partial
      return -1;
    }
    function spark(vals, max, hi) {
      var li = lastDay();
      return '<span class="tt-spark" aria-hidden="true">' + EV_DAYS.map(function (d, i) {
        return i > li ? '<i class="f"></i>' : '<i' + (i === hi ? ' class="h"' : '') + ' style="height:' + (max ? Math.max(4, vals[i] / max * 100) : 0).toFixed(0) + '%"></i>';
      }).join('') + '</span>';
    }
    /* County map. Three measures, each shown for 2026 or as the change since the year picked at the top:
       party split (D share of votes minus R share), low-propensity turnout (share of registered low-propensity voters who
       have voted) and the low-propensity gap (that share for Democrats minus Republicans). Clicking a county opens a card. */
    var mapMode = 'party', mapChg = false, mapCard = null, mapZoom = null, dmapLoading = false, raceG = 'B', raceM = 'turn';
    /* Which map: the tabs above it pick the lines (counties, congressional, NC House, NC Senate districts, or precincts once a
       place is picked); with a place picked, "Inside" shows only its parts and "Whole state" shows every county or district with
       the picked place marked. mapLayer is what's drawn: 'base' (whole state), 'pct', or a layer of parts. */
    var mapTab = 'county', mapScope = 'in';
    var TAB_NAME = { county: 'Counties', cd: 'Congress', hd: 'NC House', sd: 'NC Senate', pct: 'Precincts' };
    /* + and - buttons and drag-to-move on every map. The reader's view is kept while they stay on the same map (same tab,
       place and area) and dropped when they switch. Dragging only moves a zoomed-in map, so the page still scrolls on phones. */
    var userVB = null, userVBKey = '';
    function panZoom(wrap, svg, fullVB) {
      var key = [mapTab, mapScopeNow(), state.geo, state.sel[state.geo], mapLayer].join('|');
      if (key !== userVBKey) { userVB = null; userVBKey = key; }
      var F = fullVB.split(/\s+/).map(Number), start = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      function cur() { return svg.getAttribute('viewBox').split(/\s+/).map(Number); }
      function clamp(v) {
        var w = Math.min(v[2], F[2]), h = v[3] * w / v[2];
        var x = Math.max(F[0] - w * 0.25, Math.min(F[0] + F[2] - w * 0.75, v[0])), y = Math.max(F[1] - h * 0.25, Math.min(F[1] + F[3] - h * 0.75, v[1]));
        return [x, y, w, h];
      }
      function set(v, user) {
        svg.setAttribute('viewBox', v.map(function (x) { return x.toFixed(1); }).join(' '));
        if (user) userVB = v;
        var zin = v[2] < F[2] * 0.98; svg.classList.toggle('uzoom', !!userVB); wrap.classList.toggle('tt-canpan', zin);
        if (rs) rs.hidden = !userVB;
      }
      wrap.insertAdjacentHTML('beforeend', '<div class="tt-zctl"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">\u2212</button><button type="button" data-z="reset" class="tt-zrs" hidden>Reset</button></div>');
      var rs = wrap.querySelector('.tt-zrs');
      if (userVB) set(userVB, false); else set(start, false);
      function zoom(f, cx, cy) {
        var v = cur(); cx = cx === undefined ? v[0] + v[2] / 2 : cx; cy = cy === undefined ? v[1] + v[3] / 2 : cy;
        var w = v[2] * f, h = v[3] * f;
        if (w > F[2]) { w = F[2]; h = w * v[3] / v[2]; }
        if (w < F[2] / 40) return;
        var nv = clamp([cx - (cx - v[0]) * w / v[2], cy - (cy - v[1]) * h / v[3], w, h]);
        if (f > 1 && nv[2] >= F[2] * 0.98) {   // all the way out: the whole map (or the starting view, if that was already the whole map)
          if (start[2] >= F[2] * 0.98) { userVB = null; set(start, false); } else set(F.slice(), true);
          return;
        }
        set(nv, true);
      }
      Array.prototype.forEach.call(wrap.querySelectorAll('[data-z]'), function (b) { b.addEventListener('click', function (e) {
        e.stopPropagation(); var z = b.getAttribute('data-z');
        if (z === 'reset') { userVB = null; set(start, false); } else zoom(z === 'in' ? 0.6 : 1 / 0.6);
      }); });
      var drag = null, moved = false;
      svg.addEventListener('pointerdown', function (e) {
        if (!wrap.classList.contains('tt-canpan') || e.button) return;
        drag = { x: e.clientX, y: e.clientY, v: cur(), id: e.pointerId }; moved = false;
      });
      svg.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
        if (!moved) { moved = true; try { svg.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
        var k = drag.v[2] / svg.clientWidth;
        set(clamp([drag.v[0] - dx * k, drag.v[1] - dy * k, drag.v[2], drag.v[3]]), true);
        e.preventDefault();
      });
      function end(e) { if (drag && e.pointerId === drag.id) { drag = null; if (moved) setTimeout(function () { moved = false; }, 0); } }
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      svg.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);   // a drag isn't a click on a place
      svg.addEventListener('dblclick', function (e) {   // double-click zooms in where you click
        var rc = svg.getBoundingClientRect(), v = cur(); zoom(0.6, v[0] + (e.clientX - rc.left) / rc.width * v[2], v[1] + (e.clientY - rc.top) / rc.height * v[3]); e.preventDefault();
      });
    }
    function zoomOn() {   // the reader's choice, or by default: zoom to House and Senate districts and counties, not to the much larger congressional districts
      if (mapZoom !== null) return mapZoom;
      return state.geo !== 'cd';
    }
    function mapGeo() { return pieceOn() ? mapLayer : mapLayer === 'base' ? mapTab : state.geo === 'state' || state.geo === 'county' ? 'county' : state.geo; }
    function shortPick() { return state.geo === 'county' ? state.sel.county + ' County' : PRE[state.geo] + ' ' + String(state.sel[state.geo]).replace(/\D/g, ''); }
    function mapScopeNow() { return state.geo === 'state' || mapTab === state.geo ? 'state' : mapTab === 'pct' ? 'in' : mapScope; }
    function inPick() {   // names of the places in the shown lines that overlap the picked place (to mark them on the whole-state map)
      if (state.geo === 'state' || mapLayer !== 'base' || mapTab === state.geo) return null;
      var P = pieceData(); if (!P || !P.p || !P.p[mapTab]) return null;
      var o = {}; Object.keys(P.p[mapTab]).forEach(function (k) { o[pieceName(mapTab, k)] = 1; }); return o;
    }   // counties, or today's districts of the type picked
    /* Precinct layer: when a county or district is picked, its precincts (State Board lines from Aug. 2026). Votes are early and mail votes by
       the voter's home precinct (pct.json, from the daily build); shapes are one file per county (precincts/<County>.json),
       loaded only when needed. Precincts with fewer than 10 votes have no counts and show gray. 2026 only: precinct lines move
       between elections, so there is no change view. */
    var PCL = /*__PCL__*/null;   // county borders for the statewide precinct map (precinct_counties.json)
    var mapLayer = 'base', PCTD = /*__PCT__*/null, PSH = /*__PSH__*/{}, pctLoading = {};
    /* Past years on today's precincts (pct_base/<year>/<County>.json, from build_precinct_baselines.py): each past voter is
       placed in today's precinct where they live now if they haven't moved, and otherwise spread like their old neighbors. */
    var PBASE = /*__PBASE__*/{}, PCT_CMAX = { turn: 10, party: 20, vreg: 20, lpturn: 6, lpgap: 20 };
    /* Pieces: once a county or district is picked, every other layer shows only what's inside it, and only the part inside:
       "Wake County (part)" in Congressional District 4 has just the Wake voters in CD 4. pieces/<layer>/<name>.json (votes and
       registered voters, from the daily build), piece_shapes/<layer>/<name>.json (outlines) and pieces_base/<year>/... (past
       years on today's lines) are fetched when a place is picked. */
    var PIECES = /*__PIECES__*/{}, PSHAPES = /*__PSHAPES__*/{}, PPAST = /*__PPAST__*/{};
    var PRE = { cd: 'CD', hd: 'HD', sd: 'SD' }, LAYER_NAME = { county: 'Counties', cd: 'Congress', hd: 'NC House', sd: 'NC Senate', pct: 'Precincts' };
    function pickKey() { return state.geo === 'state' ? null : state.geo + '|' + (state.geo === 'county' ? state.sel.county : String(state.sel[state.geo]).replace(/\D/g, '')); }
    function pieceLayers() { return state.geo === 'state' ? [] : ['county', 'cd', 'hd', 'sd'].filter(function (g) { return g !== state.geo; }); }
    function pieceFile(store, dir, key, after) {
      if (store[key]) return store[key];
      var lk = 'pf|' + dir + key;
      if (!pctLoading[lk]) { pctLoading[lk] = 1; var kp = key.split('|'); pctFetch(dir + kp[0] + '/' + encodeURIComponent(kp[1]) + '.json', function (j) { store[key] = j || { p: {} }; if (after) after(); pctRedraw(); }); }
      return null;
    }
    function pieceData() { var k = pickKey(); return k ? pieceFile(PIECES, 'pieces/', k) : null; }
    function pieceShapes() { var k = pickKey(); return k ? pieceFile(PSHAPES, 'piece_shapes/', k) : null; }
    function piecePastFile(yr) { var k = pickKey(); if (!k || !yr || !BASE || !BASE[yr]) return null; var f = PPAST[yr + '|' + k]; if (f) return f;
      var lk = 'pp|' + yr + k; if (!pctLoading[lk]) { pctLoading[lk] = 1; var kp = k.split('|');
        pctFetch('pieces_base/' + yr + '/' + kp[0] + '/' + encodeURIComponent(kp[1]) + '.json', function (j) { PPAST[yr + '|' + k] = j || { p: {} }; pctRedraw(); }); }
      return null; }
    function pieceName(g, key) { return g === 'county' ? key : PRE[g] + ' ' + key; }
    function pieceLabel(g, name) { return (g === 'county' ? name + ' County' : LONG[g](name)) + (state.geo !== 'state' ? ' (part)' : ''); }
    var pieceCache = {};
    function pieceRows(g) {   // the picked place's pieces in layer g, shaped like the place rows in data.json
      var P = pieceData(); if (!P || !P.p || !P.p[g]) return [];
      var ck = pickKey() + '|' + g; if (pieceCache[ck]) return pieceCache[ck];
      var rows = Object.keys(P.p[g]).map(function (key) { return Object.assign({ name: pieceName(g, key), key: key, piece: g }, P.p[g][key]); });
      rows.sort(function (a, b) { return a.key.localeCompare(b.key, undefined, { numeric: true }); });
      return (pieceCache[ck] = rows);
    }
    function piecePast(row, yr) {   // that year's block for a piece: {p, k0}
      var F = piecePastFile(yr || vs); if (!F || !F.p || !F.p[row.piece]) return null;
      var b = F.p[row.piece][row.key]; return b ? { p: b, k0: F.k0 || 0 } : null;
    }
    function pieceOn() { return state.geo !== 'state' && ['county', 'cd', 'hd', 'sd'].indexOf(mapLayer) >= 0; }
    function pieceDims() {
      var S = pieceShapes(), g = mapLayer, b = [1e9, 1e9, -1e9, -1e9];
      ((S && S[g]) ? Object.keys(S[g]) : []).forEach(function (k) { var x = S[g][k].b; b = [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])]; });
      var pad = Math.max(b[2] - b[0], b[3] - b[1]) * 0.02;
      return { x: b[0] - pad, y: b[1] - pad, w: b[2] - b[0] + pad * 2, h: b[3] - b[1] + pad * 2 };
    }
    function pieceSvg(forPng) {
      var S = pieceShapes(), g = mapLayer, dm = pieceDims(), mx = lpTurnMax(), sw = Math.max(dm.w, dm.h) / 700; nullCt = { few: 0, none: 0 };
      var paths = mapRows().map(function (row) { var sh = S[g][row.key]; return sh ? '<path d="' + sh.d + '" fill="' + fillFor(row, mx) + '" data-c="' + esc(row.name) + '"></path>' : ''; }).join('');
      return '<svg xmlns="http://www.w3.org/2000/svg" class="pct" viewBox="0 0 ' + dm.w.toFixed(1) + ' ' + dm.h.toFixed(1) + '" role="img" aria-label="' + esc(LAYER_NAME[g]) + ' in ' + esc(LONG[state.geo](state.sel[state.geo])) + ': ' + esc(mapTitle()) + '">' +
        hatchDefs(dm.w) + '<style>path{stroke:#fff;stroke-width:' + (sw * 1.6).toFixed(2) + 'px}</style><g transform="translate(' + (-dm.x).toFixed(1) + ',' + (-dm.y).toFixed(1) + ')">' + paths + '</g></svg>';
    }
    function pctPastReady(counties) {   // true once the picked year's files for these counties are in
      var miss = counties.filter(function (c) { return !PBASE[vs + '|' + c]; });
      miss.forEach(function (c) {
        var key = vs + '|' + c; if (pctLoading[key]) return; pctLoading[key] = 1;
        pctFetch('pct_base/' + vs + '/' + encodeURIComponent(c) + '.json', function (j) { PBASE[key] = j || { p: {} }; if (counties.every(function (x) { return PBASE[vs + '|' + x]; })) pctRedraw(); });
      });
      return !miss.length;
    }
    function pctPast(row) {   // the picked year's numbers for this precinct at the same point: {reg, c, D, R, lpD, lpR}, or null
      var B = PBASE[vs + '|' + row.county], code = row.name.slice(row.county.length + 1), r = B && B.p && B.p[code], kn = kNow();
      if (!r || kn === null) return null;
      var i = Math.min(Math.max(kn - B.k0, 0), r[1].length - 1);
      return { reg: r[0], c: r[1][i], D: r[2][i], R: r[3][i], lpD: r[4][i], lpR: r[5][i], lpU: r[7] ? r[7][i] : null };
    }
    function pctPastVal(row, m) {
      if (dayOn()) {   // that year's early in-person votes on the same day of early voting: [all, D, R, low D, low R]
        var B = PBASE[vs + '|' + row.county], r0 = B && B.p && B.p[row.name.slice(row.county.length + 1)], x = r0 && r0[6] && r0[6][dayI];
        if (!x) return null;
        if (m === 'turn') return r0[0][0] >= 20 ? x[0] / r0[0][0] * 100 : null;
        if (m === 'party') return x[0] >= ((PCTD && PCTD.min) || 10) ? (x[1] - x[2]) / x[0] * 100 : null;
        if (m === 'vreg') return x[0] >= ((PCTD && PCTD.min) || 10) && r0[0][0] >= 20 ? (x[1] - x[2]) / x[0] * 100 - (r0[0][1] - r0[0][2]) / r0[0][0] * 100 : null;
        if (m === 'lpturn') return r0[0][3] >= 20 && r0[0][4] >= 20 ? x[3] / r0[0][3] * 100 - x[4] / r0[0][4] * 100 : null;
        if (m === 'lpgap') { var lt0 = x.length > 5 ? x[3] + x[4] + x[5] : 0; return lt0 >= 10 ? (x[3] - x[4]) / lt0 * 100 : null; }
        return null;
      }
      var P = pctPast(row); if (!P) return null;
      if (m === 'turn') return P.reg[0] >= 20 ? Math.min(100, P.c / P.reg[0] * 100) : null;
      if (m === 'party') return P.c >= ((PCTD && PCTD.min) || 10) ? (P.D - P.R) / P.c * 100 : null;
      if (m === 'vreg') return P.c >= ((PCTD && PCTD.min) || 10) && P.reg[0] >= 20 ? (P.D - P.R) / P.c * 100 - (P.reg[1] - P.reg[2]) / P.reg[0] * 100 : null;
      if (m === 'lpturn') return P.reg[3] >= 20 && P.reg[4] >= 20 ? P.lpD / P.reg[3] * 100 - P.lpR / P.reg[4] * 100 : null;
      if (m === 'lpgap') { var lt = P.lpU === null ? 0 : P.lpD + P.lpR + P.lpU; return lt >= 10 ? (P.lpD - P.lpR) / lt * 100 : null; }
      return null;
    }
    function pctOn() { return mapLayer === 'pct'; }
    function pctFetch(path, done) {
      if (!DATA_URL) return setTimeout(function () { done(null); }, 0);
      fetch(DATA_URL.replace(/data\.json(\?.*)?$/, path)).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); }).then(done, function () { done(null); });
    }
    function pctRedraw() { var y = window.scrollY; show(); window.scrollTo(0, y); }
    function pctNeed() {   // {keys, counties} for the picked place, or null while files load
      if (!PCTD) {
        if (!pctLoading.d) { pctLoading.d = 1; pctFetch('pct.json', function (j) { PCTD = j || { c: {}, reg: {} }; pctRedraw(); }); }
        return null;
      }
      var k = state.geo, sel = state.sel[k], counties = [], keys = [];
      if (k === 'state') {   // every precinct in the state, and the county borders drawn over them
        counties = Object.keys(PCTD.reg); counties.forEach(function (c) { Object.keys(PCTD.reg[c]).forEach(function (p) { keys.push(c + '|' + p); }); });
        if (!PCL && !pctLoading.cl) { pctLoading.cl = 1; pctFetch('precinct_counties.json', function (j) { PCL = j || {}; pctRedraw(); }); }
      } else if (k === 'county') { counties = [sel]; Object.keys(PCTD.reg[sel] || {}).forEach(function (p) { keys.push(sel + '|' + p); }); }
      else {
        var di = { cd: 0, hd: 1, sd: 2 }[k], n = +String(sel).replace(/\D/g, '');
        Object.keys(PCTD.reg).forEach(function (c) {
          Object.keys(PCTD.reg[c]).forEach(function (p) { var d = PCTD.reg[c][p][7]; if (d && d[di] === n) { keys.push(c + '|' + p); if (counties.indexOf(c) < 0) counties.push(c); } });
        });
      }
      var miss = counties.filter(function (c) { return !PSH[c]; });
      miss.forEach(function (c) {
        if (pctLoading[c]) return; pctLoading[c] = 1;
        pctFetch('precincts/' + encodeURIComponent(c) + '.json', function (j) { PSH[c] = j || { p: {}, n: {}, b: {} }; if (counties.every(function (x) { return PSH[x]; })) pctRedraw(); });
      });
      return miss.length ? null : { keys: keys, counties: counties };
    }
    function titleish(x) { return String(x || '').toLowerCase().replace(/(^|[\s\-\/(#])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(?=\w*\d)\w+\b/g, function (w) { return /^\d+(st|nd|rd|th)$/i.test(w) ? w.toLowerCase() : w.toUpperCase(); }); }
    var pctCache = null;
    function pctRows() {
      var need = pctNeed(); if (!need) return [];
      var key = state.geo + ':' + state.sel[state.geo] + ':' + need.keys.length;
      if (pctCache && pctCache.key === key) return pctCache.rows;
      var rows = need.keys.map(function (k) {
        var c = k.split('|')[0], p = k.slice(c.length + 1), sh = PSH[c] || { p: {}, n: {}, b: {} }, g = PCTD.reg[c][p];
        return { name: k, label: (!sh.n[p] || sh.n[p] === p ? 'Precinct ' + p : titleish(sh.n[p])) + (need.counties.length > 1 ? ' (' + c + ')' : ''), county: c, reg: g, v: (PCTD.c[c] || {})[p] || null, path: sh.p[p], box: sh.b[p] };
      }).filter(function (x) { return x.path; });
      pctCache = { key: key, rows: rows };
      return rows;
    }
    var PCTDAYS = /*__PCTDAYS__*/null;
    function pctDaysReady() {
      if (PCTDAYS) return true;
      if (!pctLoading.days) { pctLoading.days = 1; pctFetch('pct_days.json', function (j) { PCTDAYS = j || { c: {} }; pctRedraw(); }); }
      return false;
    }
    function pctDayV(row) {   // [votes, D, R, U, low-propensity D, R, U] on the picked day (null under the minimum)
      var c = PCTDAYS && PCTDAYS.c[row.county], a = c && c[row.name.slice(row.county.length + 1)];
      var i = PCTDAYS && PCTDAYS.days ? PCTDAYS.days.indexOf(EV_DAYS[dayI]) : -1;
      return a && i >= 0 ? a[i] : null;
    }
    function pctThruV(row) {   // votes so far at the end of the picked day: [votes, D, R, U, low D, R, U] (null under the minimum)
      var c = PCTDAYS && PCTDAYS.t && PCTDAYS.t[row.county], a = c && c[row.name.slice(row.county.length + 1)];
      var i = PCTDAYS && PCTDAYS.days ? PCTDAYS.days.indexOf(EV_DAYS[dayI]) : -1;
      return a && i >= 0 ? a[i] : null;
    }
    function pctVal(row, m) {
      var v = dayOn() ? pctDayV(row) : thruOn() ? pctThruV(row) : row.v, g = row.reg; if (!v || !g) return null;
      if (m === 'turn') return g[0] ? Math.min(100, v[0] / g[0] * 100) : null;
      if (m === 'party') return (v[1] - v[2]) / v[0] * 100;
      if (m === 'regm') return g[0] >= 20 ? (g[1] - g[2]) / g[0] * 100 : null;
      if (m === 'vreg') return g[0] >= 20 ? (v[1] - v[2]) / v[0] * 100 - (g[1] - g[2]) / g[0] * 100 : null;
      if (m === 'lpturn') return g[4] >= 20 && g[5] >= 20 ? v[4] / g[4] * 100 - v[5] / g[5] * 100 : null;   // D rate minus R rate
      if (m === 'lprates') return [4, 5, 6].map(function (j) { return g[j] >= 20 ? v[j] / g[j] * 100 : null; });
      if (m === 'lpgap') { var lt = v[4] + v[5] + v[6]; return lt >= 10 ? (v[4] - v[5]) / lt * 100 : null; }   // margin
      return null;
    }
    function pctDims() {
      var b = [1e9, 1e9, -1e9, -1e9]; pctRows().forEach(function (r) { var x = r.box; b = [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])]; });
      var pad = Math.max(b[2] - b[0], b[3] - b[1]) * 0.02;
      return { x: b[0] - pad, y: b[1] - pad, w: b[2] - b[0] + pad * 2, h: b[3] - b[1] + pad * 2 };
    }
    function pctSvg(forPng) {
      var all = state.geo === 'state', dm = pctDims(), mx = lpTurnMax(), sw = Math.max(dm.w, dm.h) / (all ? 3200 : 700); nullCt = { few: 0, none: 0 };
      var paths = pctRows().map(function (row) { return '<path d="' + row.path + '" fill="' + fillFor(row, mx) + '" data-c="' + esc(row.name) + '"></path>'; }).join('') +
        (all && PCL && PCL.lines ? '<path d="' + PCL.lines + '" fill="none" style="stroke:#2a2a2a;' + (forPng ? 'stroke-width:' + (sw * 4).toFixed(2) + 'px' : 'stroke-width:1px;vector-effect:non-scaling-stroke') + ';stroke-opacity:.75" pointer-events="none"></path>' : '');
      return '<svg xmlns="http://www.w3.org/2000/svg" class="pct" viewBox="0 0 ' + dm.w.toFixed(1) + ' ' + dm.h.toFixed(1) + '" role="img" aria-label="Precinct map: ' + esc(mapTitle()) + '">' +
        hatchDefs(dm.w) + '<style>path{stroke:#fff;stroke-width:' + sw.toFixed(2) + 'px}</style><g transform="translate(' + (-dm.x).toFixed(1) + ',' + (-dm.y).toFixed(1) + ')">' + paths + '</g></svg>';
    }
    function pctCardHtml(name) {
      var row = pctRows().filter(function (x) { return x.name === name; })[0]; if (!row) return '';
      var t = pctVal(row, 'turn'), g = row.reg, v = row.v;
      var col = function (x) { return x === null ? 'var(--mute)' : x > 0.05 ? 'var(--pd)' : x < -0.05 ? 'var(--pr)' : 'var(--ink)'; };
      var hasP = !!PBASE[vs + '|' + row.county] && !!(BASE && BASE[vs]);
      var f = function (x, party) { return x === null ? '\u2014' : party === 3 ? rdr(x) : party ? dr(x, party === 2 ? 0 : 1) : x.toFixed(1) + '%'; };
      var line = function (l, x, party, m) { var th = hasP && m ? pctPastVal(row, m) : null;
        return '<div class="tt-mcr"><span class="tt-mcl">' + l + '</span><span class="tt-mcv" style="color:' + (party ? col(x) : x === null ? 'var(--mute)' : 'var(--ink)') + '">' + f(x, party) + '</span><span class="tt-mcw">' + (th === null ? '' : vs + ': ' + f(th, party)) + '</span></div>'; };
      var tt = hasP ? pctPastVal(row, 'turn') : null;
      var lpn = v ? v[4] + v[5] + v[6] : 0, lpd = lpn >= 10 ? v[4] / lpn * 100 : null;
      return '<div class="tt-mcard" role="dialog" aria-label="' + esc(row.label) + '"><button type="button" class="tt-mcx" aria-label="Close">\u00D7</button>' +
        '<div class="tt-mcn">' + esc(row.label) + '</div><div class="tt-mcs">' + (row.label.indexOf(name.slice(row.county.length + 1)) >= 0 ? '' : 'Precinct ' + esc(name.slice(row.county.length + 1)) + ', ') + esc(row.county) + ' County</div>' +
        '<div class="tt-mch"><span class="tt-mcbig">' + (t === null ? '\u2014' : t.toFixed(1) + '%') + '</span><span class="tt-mcs">of registered voters have voted<br>' + (v ? fmt(v[0]) + ' votes so far' : 'Hidden for privacy (fewer than ' + ((PCTD && PCTD.min) || 10) + ' votes, or a nearby small precinct)') + ' \u00B7 ' + fmt(g[0]) + ' registered' + (tt === null ? '' : '<br>' + vs + ' at this point: ' + tt.toFixed(1) + '%') + '</span></div>' +
        '<div class="tt-mcg">' + line('Party split', pctVal(row, 'party'), 2, 'party') + line('Party split of registered voters', pctVal(row, 'regm'), 3) + line('Vs. registration' + regQ(), pctVal(row, 'vreg'), 2, 'vreg') + lpRateRow(pctVal(row, 'lprates'), null) + line('Low-propensity margin' + lpQ(), pctVal(row, 'lpgap'), 2, 'lpgap') + '</div></div>';
    }
    function mapShapes(geo) {   // {w, h, c: {name: path}, lines}
      if (geo === 'county') return { w: NC_MAP.w, h: NC_MAP.h, c: NC_MAP.c, lines: '' };
      if (!DMAP) {
        if (!dmapLoading && DATA_URL) {
          dmapLoading = true;
          fetch(DATA_URL.replace(/data\.json(\?.*)?$/, 'district_map.json')).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
            .then(function (j) { DMAP = j; var y = window.scrollY; show(); window.scrollTo(0, y); }, function () { DMAP = { w: 0 }; });
        }
        return null;
      }
      if (!DMAP[geo]) return null;
      var pre = { cd: 'CD ', hd: 'HD ', sd: 'SD ' }[geo], c = {};
      Object.keys(DMAP[geo]).forEach(function (n) { c[pre + n] = DMAP[geo][n]; });
      return { w: DMAP.w, h: DMAP.h, c: c, lines: DMAP.lines };
    }
    function mapRows() { if (pieceOn()) { var S = pieceShapes(); return pieceRows(mapLayer).filter(function (r) { return S && S[mapLayer] && S[mapLayer][r.key]; }).map(asOf); } return pctOn() ? pctRows() : (places[mapGeo()] || []).map(asOf); }
    function placeLabel(geo, name) { return geo === 'county' ? name + ' County' : LONG[geo](name); }
    var MAPS = {
      party: { label: 'Party split', what: 'Democratic minus Republican share of votes so far, by party registration (not vote choice)', max: 50, cmax: 10 },
      lpturn: { label: 'Low-propensity turnout', what: 'Which party\u2019s low-propensity voters are turning out at the higher rate: the share of registered low-propensity Democrats who have voted minus the share of low-propensity Republicans (colored by the party ahead; hover for each party\u2019s rate)', max: 5, cmax: 3 },
      lpgap: { label: 'Low-propensity margin', what: 'Democratic minus Republican share of low-propensity voters who have voted, by party registration', max: 50, cmax: 10 },
      vreg: { label: 'Vs. registration', what: 'The party split of votes so far minus the party split of registered voters here, showing how far Democrats (D) or Republicans (R) are voting ahead of their share of the registration', max: 25, cmax: 10 },
      race: { label: 'By race' },
      turn: { label: 'Turnout', what: 'Share of registered voters who have voted so far (early and mail votes)', max: null, cmax: 10 }
    };
    /* County map, "By race": one group at a time (race as listed on registration; Hispanic or Latino is the separate ethnicity
       question). A county shows a group only where it is at least RACE_PCT% of the votes so far. Low-propensity turnout comes from
       the race x age x propensity counts, which cover Black, White and Asian voters only. */
    var RACE_G = [['B', 'Black'], ['W', 'White'], ['HL', 'Hispanic or Latino'], ['A', 'Asian'], ['I', 'American Indian']];
    var RACE_HUE = { B: '#5B2C83', W: '#7A5A12', HL: '#A02F57', A: '#1F6E69', I: '#7A4A1E' };
    var RACE_NOUN = { B: 'Black voters', W: 'White voters', HL: 'Hispanic or Latino voters', A: 'Asian voters', I: 'American Indian voters' };
    var RACE_M = {
      turn: { label: 'Turnout', what: 'Share of the group\u2019s registered voters who have voted', cmax: 5 },
      lpturn: { label: 'Low-propensity turnout', what: 'Share of the group\u2019s registered low-propensity voters who have voted', cmax: 3 },
      party: { label: 'Party split', what: 'Democratic minus Republican share of the group\u2019s votes so far, by party registration (not vote choice)', max: 60, cmax: 10 },
      share: { label: 'Share of electorate', what: 'The group\u2019s share of votes so far minus its share of registered voters', max: 8, cmax: 3 }
    };
    var RACE_PCT = 5, RACE_PCT_HL = 3, RACE_ORDER = ['B', 'W', 'A', 'I', 'O', 'M', 'P', 'U'], XRI = { B: 0, A: 2, W: 3 };
    function raceLpOK(g) { return g in XRI || g === 'HL'; }
    function racePct(g) { return g === 'HL' ? RACE_PCT_HL : RACE_PCT; }   // ethnicity is often left blank, so Hispanic voters get a lower bar
    function raceN(g) { return mapRows().filter(function (row) { return raceHas(raceCounts(row, g)); }).length; }
    function raceHas(o) { return !!o && (o.v > 0 || o.r > 0); }   // the map colors every county where the group has cast a vote; small groups are flagged, not hidden
    function raceCounts(row, g, Y, i, X, k) {   // the group's counts in a 2026 row, or (Y, i) a past year's place at day index i
      var o = {}, j = RACE_ORDER.indexOf(g), gi = ['B', 'W', 'A', 'I', 'HL'].indexOf(g);
      var dx = dayOn() ? (Y ? Y.ddr : row.ddr) : null;
      if (dayOn()) {   // one day's early in-person votes: [RACES..., ETHS...]; no party or propensity by race for a single day
        if (!dx || !dx[dayI] || !(Y ? Y.rr : row.rrace)) return null;
        var dv = dx[dayI];
        o.v = g === 'HL' ? dv[8] : dv[j]; o.tv = dv.slice(0, 8).reduce(function (t, a) { return t + a; }, 0);
        o.r = g === 'HL' ? ((Y ? Y.re : row.reth) || [0])[0] : (Y ? Y.rr : row.rrace)[j]; o.tr = sum(Y ? Y.rr : row.rrace); o.gp = null;
        return o;
      }
      if (!Y) {
        if (!row.race || !row.rrace) return null;
        o.v = g === 'HL' ? (row.eth || [0])[0] : row.race[j]; o.r = g === 'HL' ? (row.reth || [0])[0] : row.rrace[j];
        o.tv = sum(row.race); o.tr = sum(row.rrace);
        o.gp = row.gp ? row.gp[gi] : null;
        if (g === 'HL' && row.hv && row.hr) { o.lv = row.hv[0]; o.lr = row.hr[0]; }
        if (g in XRI && row.xv && row.xr) { o.lv = 0; o.lr = 0; for (var a = 0; a < 4; a++) { o.lv += row.xv[(XRI[g] * 4 + a) * 2]; o.lr += row.xr[(XRI[g] * 4 + a) * 2]; } }
      } else {
        if (!Y.r || !Y.rr) return null;
        o.v = g === 'HL' ? (Y.e ? Y.e[0][i] : 0) : Y.r[j][i]; o.r = g === 'HL' ? (Y.re || [0])[0] : Y.rr[j];
        o.tv = Y.r.reduce(function (t, a) { return t + a[i]; }, 0); o.tr = sum(Y.rr);
        o.gp = Y.gp ? Y.gp[gi].map(function (a) { return a[i]; }) : null;
        if (g === 'HL' && X && X.hv && X.hv[k] && X.hr) { o.lv = X.hv[k][0]; o.lr = X.hr[0]; }
        if (g in XRI && X && X.v && X.v[k]) { o.lv = 0; o.lr = 0; for (var b = 0; b < 4; b++) { o.lv += X.v[k][(XRI[g] * 4 + b) * 2]; o.lr += X.r[(XRI[g] * 4 + b) * 2]; } }
      }
      return o;
    }
    function raceVal(o, m) {
      if (!o) return null;
      if (m === 'turn') return o.r ? o.v / o.r * 100 : null;
      if (m === 'lpturn') return o.lr ? o.lv / o.lr * 100 : null;
      if (m === 'party') return o.gp && o.v > 0 ? (o.gp[0] - o.gp[1]) / o.v * 100 : null;
      if (m === 'share') return o.tv && o.tr ? o.v / o.tv * 100 - o.r / o.tr * 100 : null;
      return null;
    }
    function raceBig(o, g) { return !!o && o.tv > 0 && o.v / o.tv * 100 >= racePct(g || raceG); }
    var XTL = {};   // xtab<year>.json being loaded for the map
    function racePastCounts(row, g) {
      var Y = BASE && BASE[vs], kn = kNow();
      if (row && row.piece) { var pq = piecePast(row); if (!pq || kn === null) return null; return raceCounts(row, g, pq.p, Math.min(Math.max(kn - pq.k0, 0), pq.p.c.length - 1), null, 0); }
      if (!Y || kn === null || mapGeo() !== 'county') return null;
      var p = Y.places[row.name]; if (!p) return null;
      var i = FINAL || HAS_ED ? p.c.length - 1 : Math.min(Math.max(kn - Y.k0, 0), p.c.length - 1), X = null, k = Math.min(Math.max(kn, 0), 19);
      if (raceLpOK(g)) {
        var XS = XTS[vs];
        if (!XS && DATA_URL && !XTL[vs]) {
          var yr = vs; XTL[yr] = 1;
          fetch(DATA_URL.replace(/data\.json(\?.*)?$/, 'xtab' + yr + '.json')).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
            .then(function (j) { XTS[yr] = j; if (mapMode === 'race' && raceM === 'lpturn') { var y = window.scrollY; show(); window.scrollTo(0, y); } }, function () {});
        }
        X = XS && XS.places ? XS.places[row.name] : null;
        if (X && !(X.v && X.v[k])) X = null;   // (Hispanic counts are hv/hr in the same file)
      }
      return raceCounts(row, g, p, i, X, k);
    }
    function raceMapVal(row) {
      var o = raceCounts(row, raceG); if (!raceHas(o)) return null;
      var a = raceVal(o, raceM); if (!mapChg) return a;
      var b = raceVal(racePastCounts(row, raceG), raceM);
      return a === null || b === null ? null : a - b;
    }
    function raceMax() {   // 95th percentile, so a county with a handful of voters doesn't wash out the scale
      var vv = mapRows().map(function (r) { var o = raceCounts(r, raceG); return raceHas(o) ? raceVal(o, raceM) : null; }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
      return Math.max(1, Math.ceil(vv.length ? vv[Math.floor((vv.length - 1) * 0.95)] : 1));
    }
    function mapPartisan() { return mapMode === 'party' || mapMode === 'vreg' || mapMode === 'lpgap' || mapMode === 'lpturn' || (mapMode === 'race' && raceM === 'party'); }
    function mix(a, b, t) {   // blend two hex colors
      var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); }), pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
      return 'rgb(' + pa.map(function (x, i) { return Math.round(x + (pb[i] - x) * t); }).join(',') + ')';
    }
    function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
    /* "Vs. registration": the party split of votes cast minus the party split of registered voters in the same place, both
       Democratic minus Republican share of the whole (unaffiliated and other voters count in the totals). D+5 votes in a place
       registered D+1 is D+4: Democrats are voting ahead of their share of the registration. */
    function regM(rp) { var n = rp ? sum(rp) : 0; return n > 0 ? (rp[0] - rp[1]) / n * 100 : null; }
    function vsReg(party, reg) { return party === null || party === undefined || reg === null || reg === undefined ? null : party - reg; }
    function mapPast(row) {   // the picked year's numbers for a county or district at the same point, or null
      var geo = mapGeo(), Y = BASE && BASE[vs], kn = kNow();
      if (row && row.piece) { var pp = piecePast(row); return pp && kn !== null ? { p: pp.p, i: Math.min(Math.max(kn - pp.k0, 0), pp.p.c.length - 1) } : null; }
      var p = !Y ? null : geo === 'county' ? Y.places[row.name] : BASED && BASED[vs] && BASED[vs].districts[geo] ? BASED[vs].districts[geo][row.name] : (loadBased(), null);
      if (!p || kn === null) return null;
      return { p: p, i: Math.min(Math.max(kn - Y.k0, 0), p.c.length - 1) };
    }
    /* Day view: when a day is picked on the day-by-day chart (dayI), the county and district maps show only that day's early
       in-person votes (dd: [DEM, REP, UNA, OTH, four age groups, low-propensity DEM, REP, UNA]; ddr: by race and ethnicity),
       compared with the same day of early voting in the picked year. Mail ballots aren't counted by day. */
    var dayMode = 'only';   // 'only': votes cast on the picked day; 'thru': all votes cast through the end of it
    function dayOn() { return dayI !== null && dayMode === 'only'; }
    function thruOn() { return dayI !== null && dayMode === 'thru'; }
    function asOf(row) {   // a place's numbers as they stood at the end of the picked day ("through" mode)
      if (!thruOn() || !row || !row.cdd || !row.cdd[dayI]) return row;
      var c = row.cdd[dayI];
      return Object.assign({}, row, { vc: c[0], pty: c.slice(1, 5), lp: c.slice(5, 8), ev: c[8], ml: c[9], asof: true });
    }
    function dayLab() { var d = EV_DAYS[dayI]; return WDL[dow(d)] + ', ' + apDate(d); }
    function dayMeasures(row) {
      var now = {}, then = {}, b = mapPast(row);
      function fill(o, x, reg, lpr) {
        if (!x) return;
        var n = x[0] + x[1] + x[2] + x[3], lp = x.length > 8 ? x[8] + x[9] + x[10] : null;
        o.party = n > 0 ? (x[0] - x[1]) / n * 100 : null;
        o.turn = reg ? n / reg * 100 : null;
        o.lprates = lp !== null && lpr ? [8, 9, 10].map(function (j, q) { return lpr[q] ? x[j] / lpr[q] * 100 : null; }) : null;
        o.lpturn = o.lprates && o.lprates[0] !== null && o.lprates[1] !== null ? o.lprates[0] - o.lprates[1] : null;
        o.lpgap = lp ? (x[8] - x[9]) / lp * 100 : null;
        o.lpshare = lp !== null && n ? lp / n * 100 : null;
        o.lpdsh = lp ? x[8] / lp * 100 : null;
        o.n = n;
      }
      fill(now, row.dd && row.dd[dayI], row.reg, row.lpr);
      if (b) fill(then, b.p.dd && b.p.dd[dayI], b.p.reg, b.p.lpr);
      now.regm = regM(row.rpty); now.vreg = vsReg(now.party, now.regm);
      if (b) { then.regm = regM(b.p.rp); then.vreg = vsReg(then.party, then.regm); }
      return { now: now, then: then };
    }
    var dynCache = {};
    function dynMax(def) {   // in day view, one day's numbers are small: scale the colors to them (95th percentile)
      if (!dayOn()) return def;
      var key = [mapMode, mapChg, dayI, vs, raceG, raceM, mapGeo()].join('|');
      if (!(key in dynCache)) {
        var vv = mapRows().map(function (r) { var v = mapVal(r); return v === null || v === undefined || isNaN(v) ? null : Math.abs(v); }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
        var x = vv.length ? vv[Math.floor((vv.length - 1) * 0.95)] : def;
        dynCache[key] = x <= 0 ? def : x < 1 ? Math.ceil(x * 10) / 10 : x < 10 ? Math.ceil(x * 2) / 2 : Math.ceil(x);
      }
      return dynCache[key];
    }
    function measures(row) {   // {party, lpturn, lpgap, lpshare} for 2026 and the picked year
      if (dayOn()) return dayMeasures(row);
      var n = sum(row.pty), now = {}, then = {}, b = mapPast(row);
      now.party = n > 0 ? (row.pty[0] - row.pty[1]) / n * 100 : null;
      // low-propensity turnout: each party's rate (lprates), mapped as D rate minus R rate; low-propensity margin: D minus R share of
      // the low-propensity voters who have voted (unaffiliated voters count in the total, as in Party split)
      now.lprates = row.lp && row.lpr ? [0, 1, 2].map(function (j) { return row.lpr[j] ? row.lp[j] / row.lpr[j] * 100 : null; }) : null;
      now.lpturn = now.lprates && now.lprates[0] !== null && now.lprates[1] !== null ? now.lprates[0] - now.lprates[1] : null;
      now.lpgap = row.lp && sum(row.lp) > 0 ? (row.lp[0] - row.lp[1]) / sum(row.lp) * 100 : null;
      now.lpshare = row.lp && n >= PROP_MIN ? sum(row.lp) / (row.pty[0] + row.pty[1] + row.pty[2]) * 100 : null;
      now.turn = row.reg ? row.vc / row.reg * 100 : null;
      now.lpdsh = row.lp && sum(row.lp) >= LP_MIN * 3 ? row.lp[0] / sum(row.lp) * 100 : null;   // Democrats' share of low-propensity voters who have voted
      now.regm = regM(row.rpty); now.vreg = vsReg(now.party, now.regm);
      if (b) {
        var p = b.p, i = b.i, pn = p.p[0][i] + p.p[1][i] + p.p[2][i] + p.p[3][i];
        then.party = pn > 0 ? (p.p[0][i] - p.p[1][i]) / pn * 100 : null;
        then.lprates = p.lp && p.lpr ? [0, 1, 2].map(function (j) { return p.lpr[j] ? p.lp[j][i] / p.lpr[j] * 100 : null; }) : null;
        then.lpturn = then.lprates && then.lprates[0] !== null && then.lprates[1] !== null ? then.lprates[0] - then.lprates[1] : null;
        var tlp = p.lp ? p.lp[0][i] + p.lp[1][i] + p.lp[2][i] : 0;
        then.lpgap = tlp > 0 ? (p.lp[0][i] - p.lp[1][i]) / tlp * 100 : null;
        then.lpshare = p.lp && pn >= PROP_MIN ? (p.lp[0][i] + p.lp[1][i] + p.lp[2][i]) / (p.p[0][i] + p.p[1][i] + p.p[2][i]) * 100 : null;
        then.turn = p.reg ? p.c[i] / p.reg * 100 : null;
        then.lpdsh = p.lp && (p.lp[0][i] + p.lp[1][i] + p.lp[2][i]) >= LP_MIN * 3 ? p.lp[0][i] / (p.lp[0][i] + p.lp[1][i] + p.lp[2][i]) * 100 : null;
        then.regm = regM(p.rp); then.vreg = vsReg(then.party, then.regm);
      }
      return { now: now, then: then };
    }
    function mapVal(row) {
      if (pctOn()) {
        if (!row) return null;
        var pn = pctVal(row, mapMode); if (!mapChg) return pn;
        var pt = pctPastVal(row, mapMode); return pn === null || pt === null ? null : pn - pt;
      }
      if (mapMode === 'race') return raceMapVal(row);
      var m = measures(row), a = m.now[mapMode], b = m.then[mapMode];
      if (!mapChg) return a;
      return a === null || b === null || b === undefined ? null : a - b;
    }
    function lpTurnMax() {
      if (pctOn()) { var vv = pctRows().map(function (r) { return pctVal(r, mapMode === 'turn' ? 'turn' : 'lpturn'); }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
        var q95 = vv.length ? vv[Math.floor((vv.length - 1) * 0.95)] : 1;
        return dayOn() ? (q95 <= 0 ? 1 : q95 < 1 ? Math.ceil(q95 * 10) / 10 : Math.ceil(q95 * 2) / 2) : Math.max(1, Math.ceil(q95)); }   // 95th percentile: one tiny precinct shouldn't wash out the rest
      if (dayOn()) { var dm = dynCache['mx|' + [mapMode, dayI, raceG, raceM, mapGeo()].join('|')];
        if (dm === undefined) { var dv = mapRows().map(function (r) { if (mapMode === 'race') { var o = raceCounts(r, raceG); return raceHas(o) ? raceVal(o, raceM) : null; } return measures(r).now.lpturn; }).filter(function (x) { return x !== null && x !== undefined; }).sort(function (a, b) { return a - b; });
          var x = dv.length ? dv[Math.floor((dv.length - 1) * 0.95)] : 1; dm = dynCache['mx|' + [mapMode, dayI, raceG, raceM, mapGeo()].join('|')] = x <= 0 ? 1 : x < 1 ? Math.ceil(x * 10) / 10 : x < 10 ? Math.ceil(x * 2) / 2 : Math.ceil(x); }
        return dm; }
      if (mapMode === 'race') return raceMax(); var mx = 0; mapRows().forEach(function (r) { var m = measures(r).now.lpturn; if (m > mx) mx = m; }); return Math.max(1, Math.ceil(mx)); }
    function mapColor(v, mx) {
      if (v === null || v === undefined || isNaN(v)) return '#E6E1D6';
      if (pctOn() && mapChg) {
        var tc = Math.min(1, Math.abs(v) / dynMax(PCT_CMAX[mapMode]));
        if (mapMode === 'turn') return v >= 0 ? mix('#F4F1EA', '#1F4A2C', tc) : mix('#F4F1EA', '#B07A1F', tc);
        return v >= 0 ? mix('#F4F1EA', '#2E6DB4', tc) : mix('#F4F1EA', '#B83A32', tc);
      }
      if (mapMode === 'turn') return mix('#F4F1EA', '#253551', Math.min(1, v / mx));
      if (mapMode === 'race') {
        var RM = RACE_M[raceM], hue = RACE_HUE[raceG];
        if (raceM === 'party') { var tp = Math.min(1, Math.abs(v) / (mapChg ? RM.cmax : RM.max)); return v >= 0 ? mix('#F4F1EA', '#2E6DB4', tp) : mix('#F4F1EA', '#B83A32', tp); }
        if (!mapChg && raceM !== 'share') return mix('#F4F1EA', hue, Math.min(1, v / mx));
        var tu = Math.min(1, Math.abs(v) / dynMax(mapChg ? RM.cmax : RM.max));
        return v >= 0 ? mix('#F4F1EA', mapChg ? '#1F4A2C' : hue, tu) : mix('#F4F1EA', '#B07A1F', tu);
      }
      var t = Math.min(1, Math.abs(v) / (mapMode === 'lpturn' || (mapChg && dayOn()) ? dynMax(mapChg ? MAPS[mapMode].cmax : MAPS[mapMode].max) : mapChg ? MAPS[mapMode].cmax : MAPS[mapMode].max));
      return v >= 0 ? mix('#F4F1EA', '#2E6DB4', t) : mix('#F4F1EA', '#B83A32', t);
    }
    function lpRatesTxt(rt) {   // "D 11.4% · R 5.0% · Unaff. 6.6%": each party's low-propensity turnout
      var dq = dayOn() ? 2 : 1, f = function (x) { return x === null || x === undefined ? '\u2014' : x.toFixed(dq) + '%'; };
      return '<span style="color:var(--pd);font-weight:700">D ' + f(rt[0]) + '</span> \u00B7 <span style="color:var(--pr);font-weight:700">R ' + f(rt[1]) + '</span> \u00B7 <span style="color:var(--mute)">Unaff. ' + f(rt[2]) + '</span>';
    }
    /* No color: hatched when there are too few votes (or voters) to show a number; plain gray when the comparison year has no data */
    var nullCt = { few: 0, none: 0 };
    function fillFor(row, mx) {
      var v = mapVal(row); if (v !== null && v !== undefined && !isNaN(v)) return mapColor(v, mx);
      var few;
      if (pctOn()) few = pctVal(row, mapMode) === null;
      else if (mapMode === 'race') { var o = raceCounts(row, raceG); few = !raceHas(o) || raceVal(o, raceM) === null; }
      else { var m = measures(row); few = m.now[mapMode] === null || m.now[mapMode] === undefined; }
      nullCt[few ? 'few' : 'none']++;
      return few ? 'url(#tth)' : '#E6E1D6';
    }
    function hatchDefs(w) { var z = (w / 160).toFixed(2); return '<defs><pattern id="tth" width="' + z + '" height="' + z + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="' + z + '" height="' + z + '" fill="#F1EDE4"/><rect width="' + (z / 3).toFixed(2) + '" height="' + z + '" fill="#B9B09F"/></pattern></defs>'; }
    function nullLegend() {
      return (nullCt.few ? '<span class="tt-nl"><i class="h"></i>Too few votes to show</span>' : '') + (nullCt.none ? '<span class="tt-nl"><i class="g"></i>No data for ' + vs + '</span>' : '');
    }
    function rdr(x) { if (x === null || x === undefined || isNaN(x)) return '\u2014'; return (x >= 0 ? 'D+' : 'R+') + Math.round(Math.abs(x)); }   // registration split: D+0, not "even", so it reads like its neighbors
    function dr(x, dec) { return x === null || x === undefined ? '—' : Math.abs(x) < 0.5 * Math.pow(10, -(dec || 0)) ? 'even' : (x > 0 ? 'D+' : 'R+') + Math.abs(x).toFixed(dec || 0); }
    function fmtM(v, mode, chg) {
      if (v === null || v === undefined) return '—';
      if (mode === 'turn') return chg ? (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(1) + ' pts' : v.toFixed(1) + '%';
      if (mode === 'race') {
        if (raceM === 'party') mode = 'party';
        else if (raceM === 'share' || chg) return (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(1) + ' pts';
        else return v.toFixed(1) + '%';
      }
      var dq = dayOn() ? 2 : 1;
      if (chg) return (Math.abs(v) < 0.5 * Math.pow(10, -(mode === 'lpturn' ? dq : 1)) ? 'no change' : (v > 0 ? 'toward D ' : 'toward R ') + Math.abs(v).toFixed(mode === 'lpturn' ? dq : 1) + ' pts');
      if (mode === 'lpturn') return Math.abs(v) < 0.5 * Math.pow(10, -dq) ? 'same rate' : (v > 0 ? 'D' : 'R') + ' +' + Math.abs(v).toFixed(dq) + ' pts';
      return dr(v, 0);
    }
    function mapLegend(mx) {
      var M = MAPS[mapMode], RB = 'linear-gradient(90deg,#B83A32,#F4F1EA,#2E6DB4)';
      if (pctOn() && mapChg) return mapMode === 'turn' ? ['\u2212' + dynMax(PCT_CMAX.turn) + ' pts', 'linear-gradient(90deg,#B07A1F,#F4F1EA,#1F4A2C)', '+' + dynMax(PCT_CMAX.turn) + ' pts']
        : ['Toward R ' + dynMax(PCT_CMAX[mapMode]) + ' pts', RB, 'Toward D ' + dynMax(PCT_CMAX[mapMode]) + ' pts'];
      if (mapMode === 'turn') return ['0%', 'linear-gradient(90deg,#F4F1EA,#253551)', mx + '%+'];
      if (mapMode === 'race') {
        var RM = RACE_M[raceM], hue = RACE_HUE[raceG];
        if (raceM === 'party') return mapChg ? ['Toward R', RB, 'Toward D'] : ['R+' + RM.max + ' or more', RB, 'D+' + RM.max + ' or more'];
        if (mapChg) return ['Lower than ' + vs, 'linear-gradient(90deg,#B07A1F,#F4F1EA,#1F4A2C)', 'Higher than ' + vs];
        if (raceM === 'share') return ['\u2212' + dynMax(RM.max) + ' pts', 'linear-gradient(90deg,#B07A1F,#F4F1EA,' + hue + ')', '+' + dynMax(RM.max) + ' pts'];
        return ['0%', 'linear-gradient(90deg,#F4F1EA,' + hue + ')', mx + '%+'];
      }
      if (mapMode === 'lpturn' && !mapChg) { var lm = dynMax(M.max); return ['R rate higher by ' + lm + '+ pts', RB, 'D rate higher by ' + lm + '+ pts']; }
      if (mapChg) return ['Toward R', RB, 'Toward D'];
      var mm = M.max;
      return ['R+' + mm + ' or more', RB, 'D+' + mm + ' or more'];
    }
    function mapLabel() { return mapMode === 'race' ? RACE_NOUN[raceG] + ': ' + RACE_M[raceM].label.toLowerCase() : MAPS[mapMode].label; }
    function mapTitle() { return mapLabel() + (thruOn() ? ', through ' + dayLab() + (mapChg ? ' vs. ' + vs : '') : dayOn() ? ', ' + dayLab() + (mapChg ? ' vs. ' + vs : '') : mapChg ? ', change since ' + vs : ', 2026'); }
    function mapYr() { return thruOn() ? 'Through ' + apDate(EV_DAYS[dayI]) + (mapChg ? ' vs. ' + vs : '') : dayOn() ? apDate(EV_DAYS[dayI]) + (mapChg ? ' vs. ' + vs : '') : mapChg ? 'Change since ' + vs : '2026'; }
    function dayNote() {
      if (!dayOn()) return '';
      var bd = BASE && BASE[vs] ? new Date(Date.parse(BASE[vs].ev_start + 'T12:00:00Z') + dayI * 864e5).toISOString().slice(0, 10) : null;
      return 'Early in-person votes cast on ' + dayLab() + ' (day ' + (dayI + 1) + ' of early voting) only; mail ballots aren\u2019t counted by day' +
        (mapChg && bd ? '. Compared with day ' + (dayI + 1) + ' of early voting in ' + vs + ' (' + WDL[dow(bd)] + ', ' + apDate(bd) + ')' : '') + '. ';
    }
    function mapNote() {   // with the registration caveat under the party-split maps
      var t = mapNote0();
      if (mapMode === 'party' || (mapMode === 'race' && raceM === 'party')) t = t.replace(/ \(not vote choice\)/, '') + ' Registration, not vote choice. A smaller D margin can mean more unaffiliated voters.';
      return t;
    }
    function mapNote0() {
      if (pctOn()) return (thruOn() ? 'Votes cast through the end of ' + dayLab() + '. ' : '') + (dayOn() ? 'Early in-person votes cast on ' + dayLab() + ' (day ' + (dayI + 1) + ' of early voting) only. ' : '') + (mapChg ? MAPS[mapMode].what + ': 2026 minus the same point in ' + vs + ' (percentage points). Past votes are placed on today\u2019s precincts: voters still at the same address count where they live now; voters who have since moved are spread like their old neighbors.' : MAPS[mapMode].what + (mapMode === 'party' ? '' : mapMode === 'lpgap' ? ' (percentage points)' : '') + '.') + ' Precincts are the State Board\u2019s August 2026 lines; each early or mail vote is counted in the voter\u2019s home precinct.' + (state.geo === 'county' || state.geo === 'state' ? '' : ' A precinct split between districts is shown with the district where most of its voters live.') + ' Hatched: fewer than ' + ((PCTD && PCTD.min) || 10) + ' votes so far, too few registered voters to measure, or hidden so a nearby small precinct\u2019s count can\u2019t be worked out' + (mapChg ? '; gray: too few votes in ' + vs : '') + '.';
      if (thruOn()) return 'Votes cast through the end of ' + dayLab() + ' (early in person and mail)' + (mapChg ? ', compared with the same point in ' + vs : '') + '. ' + baseNote();
      if (dayOn()) return dayNote() + baseNote().replace(/ so far/g, ' that day').replace(/ who have voted/g, ' who voted that day').replace('2026 minus the same point in', '2026 minus the same day in');
      return baseNote();
    }
    function baseNote() {
      if (mapMode === 'race') {
        var RM = RACE_M[raceM];
        return (mapChg ? RM.what + ': 2026 minus the same point in ' + vs + ' (percentage points).' : RM.what + (raceM === 'party' ? '.' : raceM === 'share' ? ' (percentage points).' : '.')) +
          ' In counties where ' + RACE_NOUN[raceG] + ' are under ' + racePct(raceG) + '% of the vote, these numbers rest on few ballots and can swing a lot; hover or tap a county to see its count.' +
          (raceG === 'HL' ? ' Hispanic or Latino is a separate question on the registration form that about a third of voters skip, so these counts are low.' : ' Race as listed on voter registration.');
      }
      var M = MAPS[mapMode];
      return mapChg ? M.what + ': 2026 minus the same point in ' + vs + ' (percentage points).' : M.what + (mapMode === 'party' ? '.' : ' (percentage points).');
    }
    function mapSvg(r, forPng) {
      if (pctOn()) return pctSvg(forPng);
      if (pieceOn()) return pieceSvg(forPng);
      nullCt = { few: 0, none: 0 };
      var mx = lpTurnMax(), geo = mapGeo(), S = mapShapes(geo), sel = state.geo === geo && state.geo !== 'state' ? (r ? r.name : state.sel[geo]) : null, NC_MAP = { w: S.w, h: S.h }, inS = inPick();
      var paths = mapRows().map(function (row) {
        var d = S.c[row.name]; if (!d) return '';
        return '<path d="' + d + '" fill="' + fillFor(row, mx) + '" data-c="' + esc(row.name) + '"' + (!forPng && (row.name === sel || (inS && inS[row.name])) ? ' class="sel"' : '') + '></path>';
      }).join('') + (S.lines ? '<path class="tt-mlines" d="' + S.lines + '" fill="none" stroke="#3a3a3a" stroke-width=".35" stroke-opacity=".55" pointer-events="none"></path>' : '');
      if (forPng && (sel || inS)) paths += mapRows().map(function (row) {   // the picked place's outline, drawn last so it sits on top
        var d = S.c[row.name]; return d && (row.name === sel || (inS && inS[row.name])) ? '<path d="' + d + '" fill="none" style="stroke:#111;stroke-width:2.2;stroke-linejoin:round"></path>' : '';
      }).join('');
      var yr = mapYr();
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + NC_MAP.w + ' ' + NC_MAP.h + '" role="img" aria-label="Map of North Carolina ' + (geo === 'county' ? 'counties' : 'districts') + ': ' + esc(mapTitle()) + '">' +
        hatchDefs(NC_MAP.w) + (forPng ? '<style>path{stroke:#fff;stroke-width:.8}path[fill=none]{stroke:#3a3a3a;stroke-width:.35}</style>' + paths + '</svg>' : paths +
        '<g aria-hidden="true"><text x="6" y="' + (NC_MAP.h - 26) + '" font-family="Zilla Slab,Georgia,serif" font-weight="700" font-size="26" fill="#253551">' + esc(yr) + '</text>' +
        '<text x="6" y="' + (NC_MAP.h - 8) + '" font-family="Inter,sans-serif" font-weight="600" font-size="13" fill="#6b6b6b">' + esc(mapLabel()) + '</text></g>' +
        '<g class="tt-mapmark" aria-hidden="true"><image href="' + CF_LOGO + '" x="' + (NC_MAP.w - 204) + '" y="' + (NC_MAP.h - 38) + '" width="32" height="32"/>' +
        '<text x="' + (NC_MAP.w - 6) + '" y="' + (NC_MAP.h - 17) + '" text-anchor="end" font-family="Zilla Slab,Georgia,serif" font-weight="700" font-size="21" fill="#253551">Carolina Forward</text>' +
        '<text x="' + (NC_MAP.w - 6) + '" y="' + (NC_MAP.h - 1) + '" text-anchor="end" font-family="Inter,sans-serif" font-size="13" fill="#6b6b6b">' + CF_URL + '</text></g></svg>');
    }
    function mapBlock(r) {
      var pickd = state.geo !== 'state';
      var scope = mapScopeNow();
      mapLayer = mapTab === 'pct' ? 'pct' : !pickd ? 'base' : scope === 'in' ? mapTab : 'base';
      var geo = mapGeo();
      if (!places[geo] && mapLayer !== 'pct') return '';
      var layerRow = crow('Map of', seg(['county', 'cd', 'hd', 'sd', 'pct'].map(function (g) { return bt('data-mtab', g, TAB_NAME[g], mapTab === g); }).join(''), 'Map of', 'tt-mtabs')) +
        (pickd && mapTab !== 'pct' && mapTab !== state.geo ? crow('Area', seg(bt('data-mscope', 'in', 'Inside ' + esc(shortPick()), scope === 'in') + bt('data-mscope', 'state', 'Whole state', scope === 'state'), 'Area')) : '');
      var inPlace = state.geo !== 'state' ? LONG[state.geo](state.sel[state.geo]) : '';
      if (pctOn()) {
        if (['turn', 'party', 'vreg', 'lpturn', 'lpgap'].indexOf(mapMode) < 0) mapMode = 'turn';
        var pHead = pickd ? 'Precincts in ' + esc(inPlace) : 'Precincts statewide';
        var hasPastP = !!(BASE && BASE[vs]);
        if (!hasPastP) mapChg = false;
        var yrRow = hasPastP ? viewYearRow(mapChg, 'data-mchg') : '', needP = pctNeed();
        if (!needP || (mapChg && !pctPastReady(needP.counties)) || ((dayOn() || thruOn()) && !pctDaysReady())) return '<div class="tt-sec tt-map"><div class="tt-sech">' + pHead + '</div>' + layerRow + yrRow + '<p class="tt-mnote">Loading precincts' + (pickd ? '' : ' for all 100 counties (about 1 MB)') + '\u2026</p></div>';
        var tbp = function (k2) { return bt('data-map', k2, mq(k2), mapMode === k2); }, lgp = mapLegend(lpTurnMax());
        return '<div class="tt-sec tt-map"><div class="tt-sech">' + pHead + '<span>' + fmt(pctRows().length) + ' precincts</span></div>' + layerRow +
          crow('Color by', seg(tbp('turn') + tbp('party') + tbp('vreg') + tbp('lpturn') + tbp('lpgap'), 'Map shows', 'tt-mapsw')) + yrRow +
          '<div class="tt-mwrap tt-pwrap">' + mapSvg(r) + '<div class="tt-mtip" aria-hidden="true"></div></div>' +
          '<div class="tt-mleg"><span>' + lgp[0] + '</span><i style="background:' + lgp[1] + '"></i><span>' + lgp[2] + '</span>' + nullLegend() + '</div>' +
          '<p class="tt-mnote">Click or tap the map to see specific numbers.</p>' +
          mapDlBtns() + '</div>';
      }
      if (mapMode === 'turn') mapMode = 'party';
      if (pieceOn() && (!pieceData() || !pieceShapes() || (mapChg && BASE && BASE[vs] && !piecePastFile(vs)))) return '<div class="tt-sec tt-map"><div class="tt-sech">' + LAYER_NAME[mapLayer] + ' in ' + esc(inPlace) + '</div>' + layerRow + '<p class="tt-mnote">Loading\u2026</p></div>';
      if (!pieceOn() && !mapShapes(geo)) return '<div class="tt-sec tt-map"><div class="tt-sech">District map</div><p class="tt-mnote">Loading the district map\u2026</p></div>';
      var hasLp = mapRows().some(function (x) { return x.lp && x.lpr; });
      if (!hasLp && (mapMode === 'lpturn' || mapMode === 'lpgap')) mapMode = 'party';
      var raceOK = (geo === 'county' || pieceOn()) && !thruOn();
      if (mapMode === 'race' && !raceOK) mapMode = 'party';
      if (mapMode === 'race' && raceM === 'lpturn' && (!raceLpOK(raceG) || (pieceOn() && mapChg))) raceM = 'turn';
      if (mapMode === 'race' && dayOn() && (raceM === 'lpturn' || raceM === 'party')) raceM = 'turn';   // not available for a single day
      var raceCnt = {}; RACE_G.forEach(function (g) { raceCnt[g[0]] = raceOK ? raceN(g[0]) : 0; });
      var racesShown = RACE_G.filter(function (g) { return raceCnt[g[0]] > 0; });   // a group with no votes anywhere is hidden
      if (mapMode === 'race' && !raceCnt[raceG] && racesShown.length) raceG = racesShown[0][0];
      var hasPast = !!(BASE && BASE[vs]);
      if (!hasPast) mapChg = false;
      var tb = function (k2) { return '<button type="button" data-map="' + k2 + '" aria-pressed="' + (mapMode === k2) + '"' + (mapMode === k2 ? ' class="on"' : '') + '>' + mq(k2) + '</button>'; };
      var lg = mapLegend(lpTurnMax());
      var zoomable = pickd && !pieceOn() && (mapTab === state.geo ? geo !== 'county' : true);
      var head = pieceOn() ? { county: 'Counties', cd: 'Congressional districts', hd: 'NC House districts', sd: 'NC Senate districts' }[geo] + ' in ' + esc(inPlace) + '<span>' + mapRows().length + ' (' + (mapRows().length === 1 ? 'part' : 'parts') + ' inside)</span>'
        : (geo === 'county' ? 'County map' : { cd: 'Congressional districts', hd: 'NC House districts', sd: 'NC Senate districts' }[geo]) + (pickd ? '<span>' + esc(shortPick()) + ' outlined</span>' : '');
      return '<div class="tt-sec tt-map"><div class="tt-sech">' + head + '</div>' + layerRow +
        crow('Color by', seg(tb('party', MAPS.party.label) + tb('vreg', MAPS.vreg.label) + (hasLp ? tb('lpturn', MAPS.lpturn.label) + tb('lpgap', MAPS.lpgap.label) : '') + (raceOK ? tb('race', MAPS.race.label) : ''), 'Map shows', 'tt-mapsw')) +
        (mapMode === 'race' ? crow('Race', seg(racesShown.map(function (g) { return bt('data-mrace', g[0], g[1], raceG === g[0]); }).join(''), 'Race')) +
          crow('Measure', seg(['turn', 'lpturn', 'party', 'share'].filter(function (m) { return dayOn() ? m === 'turn' || m === 'share' : m !== 'lpturn' || (raceLpOK(raceG) && !(pieceOn() && mapChg)); }).map(function (m) { return bt('data-mrm', m, RACE_M[m].label, raceM === m); }).join(''), 'Measure')) : '') +
        (hasPast ? viewYearRow(mapChg, 'data-mchg') : '') +
        (zoomable ? crow('Zoom', seg(bt('data-mzoom', 'true', 'Zoom to ' + esc(shortPick()), zoomOn()) + bt('data-mzoom', 'false', 'Whole map', !zoomOn()), 'Zoom')) : '') +
        '<div class="tt-mwrap' + (pieceOn() ? ' tt-pwrap' : '') + '">' + mapSvg(r) + '<div class="tt-mtip" aria-hidden="true"></div></div>' +
        '<div class="tt-mleg"><span>' + lg[0] + '</span><i style="background:' + lg[1] + '"></i><span>' + lg[2] + '</span>' + nullLegend() + '</div>' +
        '<p class="tt-mnote">Click or tap the map to see specific numbers.</p>' +
        mapDlBtns() + '</div>';
    }
    function lpRateRow(now, then) {   // each party's low-propensity turnout, with the picked year's under it
      var dq = dayOn() ? 2 : 1, f = function (a) { return a && a[0] !== null && a[1] !== null ? 'D ' + a[0].toFixed(dq) + '% \u00B7 R ' + a[1].toFixed(dq) + '%' : ''; };
      return '<div class="tt-mclp"><div class="tt-mcl">Low-propensity turnout' + lpQ() + '</div><div class="tt-mclpv">' + (now ? lpRatesTxt(now) : '\u2014') + '</div>' +
        (then && f(then) ? '<div class="tt-mcw">' + vs + ': ' + f(then) + '</div>' : '') + '</div>';
    }
    function cardRow(label, now, then, mode) {
      var col = function (v) { return v === null || v === undefined ? 'var(--mute)' : mode === 'lpturn' || mode === 'turn' || mode === 'lpshare' ? 'var(--ink)' : v > 0.05 ? 'var(--pd)' : v < -0.05 ? 'var(--pr)' : 'var(--ink)'; };
      var f = function (v) { return mode === 'reg' ? rdr(v) : mode === 'lpturn' || mode === 'turn' || mode === 'lpshare' ? (v === null || v === undefined ? '—' : v.toFixed(1) + '%') : dr(v, mode === 'lpgap' ? 1 : 0); };
      return '<div class="tt-mcr"><span class="tt-mcl">' + label + '</span><span class="tt-mcv" style="color:' + col(now) + '">' + f(now) + '</span>' +
        '<span class="tt-mcw">' + (then === null || then === undefined ? '' : vs + ': ' + f(then)) + '</span></div>';
    }
    function raceCard(row) {   // every group that is at least RACE_PCT% of the vote here, side by side
      var SHORT = { B: 'Black', W: 'White', HL: 'Hispanic', A: 'Asian', I: 'Am. Indian' }, hasPast = !!(BASE && BASE[vs]);
      var rows = RACE_G.map(function (g) {
        var o = raceCounts(row, g[0]); if (!raceBig(o, g[0])) return '';
        var t = raceVal(o, 'turn'), pt = hasPast ? raceVal(racePastCounts(row, g[0]), 'turn') : null, d = t !== null && pt !== null ? t - pt : null;
        var pr = raceVal(o, 'party'), un = o.gp && o.v ? o.gp[2] / o.v * 100 : null;
        return '<tr' + (mapMode === 'race' && raceG === g[0] ? ' class="on"' : '') + '><th><i style="background:' + RACE_HUE[g[0]] + '"></i>' + SHORT[g[0]] + '</th><td>' + (t === null ? '\u2014' : t.toFixed(1) + '%') + '</td>' +
          (hasPast ? '<td class="' + (d === null ? '' : d >= 0.05 ? 'up' : d <= -0.05 ? 'dn' : '') + '">' + (d === null ? '\u2014' : (d >= 0 ? '+' : '\u2212') + Math.abs(d).toFixed(1)) + '</td>' : '') +
          '<td style="color:' + (pr === null ? 'var(--mute)' : pr > 0.5 ? 'var(--pd)' : pr < -0.5 ? 'var(--pr)' : 'var(--ink)') + '">' + (pr === null ? '\u2014' : dr(pr, 0)) + '</td><td>' + (un === null ? '\u2014' : Math.round(un) + '%') + '</td></tr>';
      }).join('');
      if (!rows) return '';
      return '<div class="tt-mcrace"><div class="tt-mcrh">By race</div><table class="tt-dsort"><thead><tr><th></th><th>Turnout</th>' + (hasPast ? '<th>vs. ' + vs + '</th>' : '') + '<th>Party</th><th>Unaff.</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p>Groups over ' + RACE_PCT + '% of the vote here (' + RACE_PCT_HL + '% for Hispanic or Latino voters). Turnout change in points; party is D minus R share of the group\u2019s votes; Unaff.: unaffiliated share of its votes.</p></div>';
    }
    function mapCardHtml(name) {
      if (pctOn()) return pctCardHtml(name);
      var geo = mapGeo(), row = mapRows().filter(function (x) { return x.name === name; })[0]; if (!row) return '';
      var lab = row.piece ? pieceLabel(geo, name) : placeLabel(geo, name);
      var m = measures(row), d = m.now.turn && m.then.turn ? Math.round((m.now.turn / m.then.turn - 1) * 100) : null;
      return '<div class="tt-mcard" role="dialog" aria-label="' + esc(lab) + '"><button type="button" class="tt-mcx" aria-label="Close">\u00D7</button>' +
        '<div class="tt-mcn">' + esc(lab) + '</div>' + (row.piece ? '<div class="tt-mcs">Only the voters inside ' + esc(LONG[state.geo](state.sel[state.geo])) + '</div>' : '') +
        '<div class="tt-mch"><span class="tt-mcbig">' + (m.now.turn === null ? '—' : m.now.turn.toFixed(dayOn() ? 2 : 1) + '%') + '</span><span class="tt-mcs">' + (dayOn() ? 'of registered voters voted early in person on ' + dayLab() + '<br>' + fmt(m.now.n || 0) + ' votes that day' : 'of registered voters have voted<br>' + fmt(row.vc) + ' votes so far') + '</span></div>' +
        (d === null ? '' : '<span class="tt-chip ' + (d === 0 ? 'ev' : d > 0 ? 'up' : 'dn') + '">' + (d === 0 ? 'Same' : (d > 0 ? '▲ ' : '▼ ') + Math.abs(d) + '%') + ' vs. ' + (dayOn() ? 'the same day in ' : 'same point in ') + vs + '</span>') +
        '<div class="tt-mcg">' + cardRow('Party split', m.now.party, m.then.party, 'party') + cardRow('Party split of registered voters', m.now.regm, m.then.regm, 'reg') + cardRow('Vs. registration' + regQ(), m.now.vreg, m.then.vreg, 'party') +
        lpRateRow(m.now.lprates, m.then.lprates) + cardRow('Low-propensity margin' + lpQ(), m.now.lpgap, m.then.lpgap, 'party') + '</div>' +
        ((geo === 'county' || row.piece) && !dayOn() ? raceCard(row) : '') +
        (state.geo === geo && name === state.sel[geo] ? '' : '<button type="button" class="tt-shdl tt-mgo" data-c="' + esc(name) + '">Open ' + (row.piece ? 'all of ' : '') + esc(geo === 'county' ? name + ' County' : name) + ' \u2192</button>') + '</div>';
    }
    function mapDlBtns() {
      return '<div class="tt-mapdls"><span class="tt-mapdll">Download</span>' +
        '<div class="tt-dlg"><span class="tt-dlk">Map image</span><button type="button" class="tt-shdl tt-mapdl" data-fmt="wide">Wide <small>X, Facebook</small></button>' +
        '<button type="button" class="tt-shdl tt-mapdl" data-fmt="tall">Tall <small>Instagram</small></button></div>' +
        '<div class="tt-dlg"><span class="tt-dlk">Map data</span><button type="button" class="tt-shdl tt-csvdl tt-mapcsv">CSV</button></div></div>';
    }
    function mapPng(fmt) {   // fmt: 'wide' (1200 x 675, for X, Facebook, LinkedIn, Bluesky) or 'tall' (1080 x 1350, for Instagram)   // the map as a 1080 x 1350 (4:5) PNG: title, map, legend and the Carolina Forward name (rankings go in the CSV)
      var svgStr = mapSvg(null, true), FV = (/viewBox="([^"]+)"/.exec(svgStr) || [0, '0 0 1 1'])[1].split(/\s+/).map(Number);
      // names on the map when there are only a few places (the parts of a picked place, or the 14 congressional districts);
      // positions come from the shapes on the page, in the map's own coordinates
      var labs = [], live = view.querySelector('.tt-map svg'), lps = live ? live.querySelectorAll('path[data-c]') : [];
      if (!pctOn() && lps.length && lps.length <= 20 && live.getScreenCTM) {
        var inv = live.getScreenCTM().inverse(), lg0 = pieceOn() ? mapLayer : mapGeo(), rowsNow = mapRows();
        Array.prototype.forEach.call(lps, function (pth) {
          var bb = pth.getBBox(), M = inv.multiply(pth.getScreenCTM()), cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
          if (pth.isPointInFill && window.DOMPoint) {   // the middle of the box can fall outside an odd shape: use the inside point nearest it with room around it
            var ins = function (x, y) { try { return pth.isPointInFill(new DOMPoint(x, y)); } catch (e) { return true; } };
            var dx = bb.width / 12, dy = bb.height / 12, best = null;
            for (var i = 1; i < 12; i++) for (var j = 1; j < 12; j++) {
              var x = bb.x + i * dx, y = bb.y + j * dy;
              if (!ins(x, y) || !ins(x - dx, y) || !ins(x + dx, y) || !ins(x, y - dy) || !ins(x, y + dy)) continue;
              var d = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (!best || d < best[2]) best = [x, y, d];
            }
            if (best) { cx = best[0]; cy = best[1]; }
          }
          var nm = pth.getAttribute('data-c');
          labs.push({ x: M.a * cx + M.c * cy + M.e, y: M.b * cx + M.d * cy + M.f, w: bb.width * M.a, t: lg0 === 'county' ? nm : PRE[lg0] + ' ' + String(nm).replace(/\D/g, ''),
            v: (function () { var rw = rowsNow.filter(function (x) { return x.name === nm; })[0], v = rw ? mapVal(rw) : null; return v === null || v === undefined || isNaN(v) ? '' : fmtM(v, mapMode, mapChg); })() });
        });
      }
      var img = new Image(), last = D.days[fullDay()], geo = mapGeo(), NC_MAP = pctOn() ? pctDims() : pieceOn() ? pieceDims() : mapShapes(geo), PCT = pctOn() || pieceOn();
      // the whole state is wide: a 1200 x 675 (16:9) landscape image; a picked place's parts or precincts fill a 1080 x 1350 portrait
      var LAND = fmt ? fmt === 'wide' : !PCT || state.geo === 'state', W = LAND ? 1200 : 1080, Hh = LAND ? 675 : 1350, X = LAND ? 48 : 56, MW = W - 2 * X, FT = LAND ? 86 : 124;
      var cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; var c = cv.getContext('2d');
      // the note without what only works on the page (hover, tap, click)
      var note = mapNote().replace(/[;,]? ?(?:hover|tap)\b[^.;)]*/g, '').replace(/\s*Click or tap an? [^.]* for its numbers\./g, '').replace(/\) \(percentage points\)/, ', in percentage points)').replace(/\s+\./g, '.');
      img.onload = function () {
        c.fillStyle = '#F4EFE5'; c.fillRect(0, 0, W, Hh);
        var HY = LAND ? 46 : 70;
        c.fillStyle = '#A50000'; c.fillRect(X, HY, 36, 3); c.font = '800 ' + (LAND ? 15 : 17) + 'px Inter, sans-serif'; c.textBaseline = 'middle';
        c.fillText('NC TURNOUT TRACKER · ' + (PCT ? (pctOn() ? 'PRECINCTS' : { county: 'COUNTIES', cd: 'CONGRESSIONAL DISTRICTS', hd: 'NC HOUSE DISTRICTS', sd: 'NC SENATE DISTRICTS' }[geo]) + (state.geo === 'state' ? ' · STATEWIDE' : ' IN ' + LONG[state.geo](state.sel[state.geo]).toUpperCase()) : (geo === 'county' ? 'COUNTY MAP' : { cd: 'CONGRESSIONAL DISTRICTS', hd: 'NC HOUSE DISTRICTS', sd: 'NC SENATE DISTRICTS' }[geo]) + (state.geo !== 'state' ? ' · ' + LONG[state.geo](state.sel[state.geo]).toUpperCase() + ' OUTLINED' : '')), X + 50, HY + 2); c.textBaseline = 'alphabetic';
        c.fillStyle = '#253551'; c.font = '700 ' + (LAND ? 38 : 52) + 'px "Zilla Slab", Georgia, serif'; var y = shWrap(c, mapTitle(), X, LAND ? 98 : 146, MW, LAND ? 44 : 58);
        c.fillStyle = '#3a3a3a'; c.font = '400 ' + (LAND ? 16 : 21) + 'px Inter, sans-serif';
        if (LAND) {   // whole sentences, up to three lines
          var sents = note.match(/[^.]+(?:\.(?=\s|$)|$)/g) || [note], keep = '';
          var lines = function (t) { var n = 0, line = ''; t.split(' ').forEach(function (w) { var tt = line ? line + ' ' + w : w; if (c.measureText(tt).width > MW && line) { n++; line = w; } else line = tt; }); return n + (line ? 1 : 0); };
          sents.forEach(function (st) { var tr = (keep + st).trim(); if (!keep || lines(tr) <= 3) { if (lines(tr) <= 3 || !keep) keep = tr + ' '; } });
          note = keep.trim();
        }
        y = shWrap(c, note, X, y + (LAND ? 0 : 4), MW, LAND ? 22 : 30);
        var nulls = !!(nullCt.few || nullCt.none);
        var my = y + (LAND ? 8 : 18), mw = MW, mh = MW * NC_MAP.h / NC_MAP.w;
        var room = Hh - FT - (LAND ? 12 : 40) - (LAND ? (nulls ? 78 : 50) : 110) - my;   // what's left above the legend and the footer: the map gets all of it
        if (mh > room) { mh = room; mw = mh * NC_MAP.w / NC_MAP.h; }
        if (mw > MW) { mw = MW; mh = mw * NC_MAP.h / NC_MAP.w; }
        my += Math.max(0, (room - mh) / 2);   // a wide map sits in the middle of the space
        var sc = mw / NC_MAP.w;
        c.drawImage(img, X + (MW - mw) / 2, my, mw, mh);
        if (labs.length) {
          var kx = mw / FV[2], ky = mh / FV[3], fs = labs.length > 8 ? 18 : 22;
          c.font = '700 ' + fs + 'px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
          var taken = [];   // skip a name that wouldn't fit in its shape or would run into another (the CSV has every place)
          labs.sort(function (a, b) { return b.w - a.w; });
          labs.forEach(function (l) {
            var px = X + (MW - mw) / 2 + (l.x - FV[0]) * kx, py = my + (l.y - FV[1]) * ky;
            c.font = '700 ' + fs + 'px Inter, sans-serif';
            var tw = Math.max(c.measureText(l.t).width, l.v ? c.measureText(l.v).width * 0.85 : 0), th = l.v ? fs * 2.3 : fs * 1.2;
            var box = [px - tw / 2 - 4, py - th / 2, px + tw / 2 + 4, py + th / 2];
            if (l.w * kx < tw * 0.8 || taken.some(function (o) { return box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]; })) return;
            taken.push(box);
            if (l.v) py -= fs * 0.6;
            c.font = '700 ' + fs + 'px Inter, sans-serif'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.92)'; c.strokeText(l.t, px, py); c.fillStyle = '#1a1a1a'; c.fillText(l.t, px, py);
            if (l.v) { c.font = '600 ' + Math.round(fs * 0.85) + 'px Inter, sans-serif'; c.strokeText(l.v, px, py + fs * 1.2); c.fillStyle = '#253551'; c.fillText(l.v, px, py + fs * 1.2); }
          });
          c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        }
        var by = my + mh;   // the year label, drawn here so it gets the web fonts
        if (!PCT) { c.fillStyle = '#253551'; c.font = '700 ' + Math.round(26 * sc) + 'px "Zilla Slab", Georgia, serif'; c.fillText(mapYr(), X + (MW - mw) / 2 + 6 * sc, by - 26 * sc);
        c.fillStyle = '#6b6b6b'; c.font = '600 ' + Math.round(13 * sc) + 'px Inter, sans-serif'; c.fillText(mapLabel(), X + (MW - mw) / 2 + 6 * sc, by - 8 * sc); }
        var lg = mapLegend(lpTurnMax()), ly = by + (LAND ? 18 : 36);
        c.font = '600 ' + (LAND ? 16 : 18) + 'px Inter, sans-serif';
        var lw = c.measureText(lg[0]).width, rw = c.measureText(lg[2]).width, gw = Math.min(LAND ? 520 : 660, MW - 2 * Math.max(lw, rw) - 40), gx = X + (MW - gw) / 2;   // the end labels always fit
        var gr = c.createLinearGradient(gx, 0, gx + gw, 0);
        var stops = lg[1].match(/#[0-9A-Fa-f]{6}/g); stops.forEach(function (st, i) { gr.addColorStop(i / (stops.length - 1), st); });
        c.fillStyle = '#3a3a3a'; c.textAlign = 'right'; c.fillText(lg[0], gx - 12, ly + 14); c.textAlign = 'left'; c.fillText(lg[2], gx + gw + 12, ly + 14);
        c.fillStyle = gr; c.fillRect(gx, ly, gw, 18);
        // what the hatched and gray places mean, if there are any
        var chips = [], cx = X + MW / 2, cy = ly + (LAND ? 46 : 52);
        if (nullCt.few) chips.push(['h', 'Too few votes to show']);
        if (nullCt.none) chips.push(['g', 'No data for ' + vs]);
        if (chips.length) {
          c.font = '500 16px Inter, sans-serif';
          var tw = chips.reduce(function (a, ch) { return a + 28 + c.measureText(ch[1]).width; }, 0) + (chips.length - 1) * 28, x1 = cx - tw / 2;
          chips.forEach(function (ch) {
            c.fillStyle = ch[0] === 'g' ? '#E6E1D6' : '#F4F1EA'; c.fillRect(x1, cy - 14, 18, 18);
            if (ch[0] === 'h') { c.save(); c.beginPath(); c.rect(x1, cy - 14, 18, 18); c.clip(); c.strokeStyle = '#B8AE98'; c.lineWidth = 2; for (var d = -18; d < 36; d += 6) { c.beginPath(); c.moveTo(x1 + d, cy + 4); c.lineTo(x1 + d + 18, cy - 14); c.stroke(); } c.restore(); }
            c.strokeStyle = '#CFC6B4'; c.lineWidth = 1; c.strokeRect(x1 + .5, cy - 13.5, 17, 17);
            c.fillStyle = '#3a3a3a'; c.fillText(ch[1], x1 + 28, cy); x1 += 28 + c.measureText(ch[1]).width + 28;
          });
        }
        c.fillStyle = '#D8D2C4'; c.fillRect(X, Hh - FT, MW, 2);
        var LS = LAND ? 44 : 52, fy = Hh - FT + (LAND ? 18 : 22);
        if (SH_LOGO && SH_LOGO.naturalWidth) c.drawImage(SH_LOGO, X, fy, LS, LS);
        c.fillStyle = '#253551'; c.font = '700 ' + (LAND ? 22 : 26) + 'px "Zilla Slab", Georgia, serif'; c.fillText('Carolina Forward', X + LS + 14, fy + LS * 0.48); c.fillStyle = '#6b6b6b'; c.font = '600 ' + (LAND ? 14 : 16) + 'px Inter, sans-serif'; c.fillText(CF_URL, X + LS + 14, fy + LS * 0.92);
        var what = thruOn() ? 'Votes cast through ' + dayLab() + (mapChg ? ', vs. the same point in ' + vs : '') + '.' : dayOn() ? 'Early in-person votes on ' + dayLab() + ' only' + (mapChg ? ', vs. the same day of early voting in ' + vs : '') + '.' : mapChg ? 'Compared with the same point in ' + vs + '.' : '';
        c.font = '400 ' + (LAND ? 13 : 15) + 'px Inter, sans-serif'; var uy = shWrap(c, srcLine((what + (mapPartisan() ? ' Party is registration, not vote choice.' : mapMode === 'race' ? ' Race as listed on voter registration.' : '')).trim()), X + (LAND ? 290 : 330), fy + (LAND ? 10 : 14), MW - (LAND ? 290 : 330), LAND ? 17 : 20);
        c.fillStyle = '#253551'; c.font = '600 ' + (LAND ? 13 : 15) + 'px Inter, sans-serif'; c.fillText(URL_LINE, X + (LAND ? 290 : 330), uy + 2);
        shSave(cv, 'carolina-forward-' + (PCT ? (pctOn() ? 'precincts' : geo) + (state.geo === 'state' ? '-statewide' : '-in-' + LONG[state.geo](state.sel[state.geo]).toLowerCase().replace(/[^a-z0-9]+/g, '-')) : (geo === 'county' ? 'county' : geo) + (state.geo !== 'state' ? '-' + LONG[state.geo](state.sel[state.geo]).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-outlined' : '')) + '-map-' + (mapMode === 'race' ? 'race-' + RACE_G.filter(function (g) { return g[0] === raceG; })[0][1].toLowerCase().replace(/[^a-z]+/g, '-') + '-' + raceM : mapMode) + (thruOn() ? '-through-' + EV_DAYS[dayI] : dayOn() ? '-' + EV_DAYS[dayI] + '-only' : '') + (mapChg ? '-vs' + vs : '') + '-' + (LAND ? 'wide' : 'tall') + '-' + last + '.png');
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    }
    function wireMap() {
      var box = view.querySelector('.tt-map'); if (!box) return;
      Array.prototype.forEach.call(box.querySelectorAll('[data-mtab]'), function (b) { b.addEventListener('click', function () {
        var to = b.getAttribute('data-mtab'); if (to === mapTab) return;
        if (to === 'pct') { if (mapMode === 'race') mapMode = 'turn'; } else if (mapMode === 'turn') mapMode = 'party';
        mapTab = to; mapCard = null; var y = window.scrollY; show(); window.scrollTo(0, y);
      }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-mscope]'), function (b) { b.addEventListener('click', function () {
        mapScope = b.getAttribute('data-mscope'); mapCard = null; var y = window.scrollY; show(); window.scrollTo(0, y);
      }); });
      var wrap = box.querySelector('.tt-mwrap'), tip = box.querySelector('.tt-mtip'); if (!wrap) return;   // still loading the district shapes
      function closeCard() { var o = wrap.querySelector('.tt-mcard'); if (o) o.parentNode.removeChild(o); mapCard = null; }
      function openCard(name, ev) {
        closeCard(); mapCard = name;
        wrap.insertAdjacentHTML('beforeend', mapCardHtml(name)); dsort(wrap);
        var card = wrap.querySelector('.tt-mcard'), W = wrap.clientWidth;
        if (W > 560 && ev) {
          var rc = wrap.getBoundingClientRect(), x = ev.clientX - rc.left, cw = card.offsetWidth;
          card.style.left = Math.max(0, Math.min(W - cw, x < W / 2 ? x + 16 : x - cw - 16)) + 'px'; card.style.top = '8px';
        } else card.classList.add('wide');
        card.querySelector('.tt-mcx').addEventListener('click', closeCard);
        var go = card.querySelector('.tt-mgo'), geo = mapGeo(); if (go) go.addEventListener('click', function () { state.sel[geo] = name; site = null; mapCard = null; setGeo(geo); });
      }
      var svg = wrap.querySelector('svg'), selps = svg ? svg.querySelectorAll('path.sel') : [], fullVB = svg ? svg.getAttribute('viewBox') : null;
      if (svg && selps.length && zoomOn() && mapLayer === 'base' && state.geo !== 'state' && !(mapTab === state.geo && mapGeo() === 'county')) {   // zoom to the picked place, keeping the map's shape
        var bb = Array.prototype.reduce.call(selps, function (a, pth) { var q = pth.getBBox(); if (!a) return { x: q.x, y: q.y, width: q.width, height: q.height };
          var x0 = Math.min(a.x, q.x), y0 = Math.min(a.y, q.y); return { x: x0, y: y0, width: Math.max(a.x + a.width, q.x + q.width) - x0, height: Math.max(a.y + a.height, q.y + q.height) - y0 }; }, null), vb = svg.viewBox.baseVal, asp = vb.width / vb.height, pad = Math.max(bb.width, bb.height) * (selps.length > 1 ? 0.2 : 0.6) + 6;
        var w2 = Math.max(bb.width + pad * 2, (bb.height + pad * 2) * asp), h2 = w2 / asp;
        svg.setAttribute('viewBox', [bb.x + bb.width / 2 - w2 / 2, bb.y + bb.height / 2 - h2 / 2, w2, h2].map(function (x) { return x.toFixed(1); }).join(' '));
        svg.classList.add('zoomed');
      }
      if (svg) panZoom(wrap, svg, fullVB);
      Array.prototype.forEach.call(wrap.querySelectorAll('path[data-c]'), function (pth) {
        var name = pth.getAttribute('data-c');
        pth.addEventListener('mousemove', function (e) {
          var rc = wrap.getBoundingClientRect(), trow = mapRows().filter(function (x) { return x.name === name; })[0], v = mapVal(trow);
          if (pctOn()) { tip.innerHTML = '<b>' + esc(trow ? trow.label : name) + '</b> ' + (trow && !trow.v ? 'Hidden for privacy' : fmtM(v, mapMode, mapChg) + (mapMode === 'vreg' && !mapChg && trow ? '<br>Votes ' + dr(pctVal(trow, 'party'), 0) + ' \u00B7 registered ' + dr(pctVal(trow, 'regm'), 0) : '')); tip.style.display = 'block';
            tip.style.left = Math.min(e.clientX - rc.left + 12, wrap.clientWidth - tip.offsetWidth) + 'px'; tip.style.top = (e.clientY - rc.top + 14) + 'px'; return; }
          var ro = mapMode === 'race' ? raceCounts(trow, raceG) : null, small = ro && !raceBig(ro);
          var rt = mapMode === 'lpturn' && trow ? measures(trow).now.lprates : null, vr = mapMode === 'vreg' && trow && !mapChg ? measures(trow).now : null;
          tip.innerHTML = '<b>' + esc(name) + '</b> ' + fmtM(v, mapMode, mapChg) + (rt ? '<br>' + lpRatesTxt(rt) : '') + (vr ? '<br>Votes ' + dr(vr.party, 0) + ' \u00B7 registered ' + dr(vr.regm, 0) : '') + (ro ? ' <span style="color:var(--mute)">(' + fmt(ro.v || 0) + ' ' + (ro.v === 1 ? 'vote' : 'votes') + (small ? ', small group' : '') + ')</span>' : ''); tip.style.display = 'block';
          tip.style.left = Math.min(e.clientX - rc.left + 12, wrap.clientWidth - tip.offsetWidth) + 'px'; tip.style.top = (e.clientY - rc.top + 14) + 'px';
        });
        pth.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
        pth.addEventListener('click', function (e) { tip.style.display = 'none'; openCard(name, e); });
      });
      if (mapCard) openCard(mapCard, null);
      Array.prototype.forEach.call(box.querySelectorAll('[data-mrace]'), function (b) { b.addEventListener('click', function () { raceG = b.getAttribute('data-mrace'); var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-mrm]'), function (b) { b.addEventListener('click', function () { raceM = b.getAttribute('data-mrm'); var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-map]'), function (b) { b.addEventListener('click', function () { mapMode = b.getAttribute('data-map'); var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-mzoom]'), function (b) { b.addEventListener('click', function () { mapZoom = b.getAttribute('data-mzoom') === 'true'; var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-mchg]:not([data-vs])'), function (b) { b.addEventListener('click', function () { mapChg = b.getAttribute('data-mchg') === 'true'; var y = window.scrollY; show(); window.scrollTo(0, y); }); });
      Array.prototype.forEach.call(box.querySelectorAll('.tt-mapdl'), function (b) { b.addEventListener('click', function () { var f = b.getAttribute('data-fmt'); shFonts().then(function () { shLogo(function () { mapPng(f); }); }); }); });
    }
    /* Rankings: every county or district, sortable. Turnout, change since the picked year, and the 2026 party and
       low-propensity measures. Past years for districts use today's lines (baseline_districts.json). */
    var rkGeo = 'county', rkSort = 'turn', rkDir = -1, rkAll = false, rkChg = false, rkLpBy = 'D';   // rkLpBy: low-propensity turnout sorted by the D rate, the R rate or the gap   // rkChg: show the change since the picked year
    var RKG = [['county', 'Counties'], ['cd', 'Congress'], ['hd', 'NC House'], ['sd', 'NC Senate']];
    /* Build your own table: the five measures, and the numbers they're built from, each switched on or off */
    var RK_MAIN = ['turn', 'party', 'vreg', 'lpturn', 'lpgap'], RK_DEF_COLS = RK_MAIN.slice(), rkCols = RK_MAIN.slice(), rkPick = false;
    var RK_X = [   // [key, label, format: n count, s share, m registration split, group]
      ['votes', 'Votes cast', 'n', 'v'], ['reg', 'Registered voters', 'n', 'v'],
      ['vD', 'Dem. votes', 'n', 'p'], ['vR', 'Rep. votes', 'n', 'p'], ['vU', 'Unaff. votes', 'n', 'p'], ['vO', 'Other votes', 'n', 'p'], ['sD', 'Dem. share', 's', 'p'], ['sR', 'Rep. share', 's', 'p'],
      ['rD', 'Registered Dems', 'n', 'r'], ['rR', 'Registered Reps', 'n', 'r'], ['rU', 'Registered unaff.', 'n', 'r'], ['regm', 'Registration split', 'm', 'r'],
      ['lD', 'Low-prop. Dems voted', 'n', 'l'], ['lR', 'Low-prop. Reps voted', 'n', 'l'], ['lU', 'Low-prop. unaff. voted', 'n', 'l'], ['lrD', 'Registered low-prop. Dems', 'n', 'l'], ['lrR', 'Registered low-prop. Reps', 'n', 'l']];
    var RK_XG = { v: 'Turnout is built from', p: 'Party split is built from', r: 'Vs. registration also uses', l: 'Low-propensity columns are built from' };
    var RK_XDEF = { votes: 'Early in-person and mail votes cast.', reg: 'Registered voters (active and inactive).', vD: 'Votes cast by registered Democrats.', vR: 'Votes cast by registered Republicans.',
      vU: 'Votes cast by unaffiliated voters.', vO: 'Votes cast by voters registered with other parties (Libertarian, Green, No Labels and others).', sD: 'Registered Democrats\u2019 share of the votes cast.', sR: 'Registered Republicans\u2019 share of the votes cast.',
      rD: 'Registered Democrats.', rR: 'Registered Republicans.', rU: 'Registered unaffiliated voters.', regm: 'Democratic minus Republican share of registered voters. Vs. registration is the party split minus this.',
      lD: 'Low-propensity Democrats who have voted.', lR: 'Low-propensity Republicans who have voted.', lU: 'Low-propensity unaffiliated voters who have voted.', lrD: 'Registered low-propensity Democrats.', lrR: 'Registered low-propensity Republicans.' };
    function rkX(k) { for (var i = 0; i < RK_X.length; i++) if (RK_X[i][0] === k) return RK_X[i]; return null; }
    function rkComp(pt, reg, rp, lp, lpr) {   // the numbers a row's measures are built from
      var n = pt ? pt[0] + pt[1] + pt[2] + (pt[3] || 0) : null, g = function (a, i) { return a && a[i] !== undefined && a[i] !== null ? a[i] : null; };
      return { votes: n, reg: reg || null, vD: g(pt, 0), vR: g(pt, 1), vU: g(pt, 2), vO: g(pt, 3), sD: n ? pt[0] / n * 100 : null, sR: n ? pt[1] / n * 100 : null,
        rD: g(rp, 0), rR: g(rp, 1), rU: g(rp, 2), regm: regM(rp), lD: g(lp, 0), lR: g(lp, 1), lU: g(lp, 2), lrD: g(lpr, 0), lrR: g(lpr, 1) };
    }
    function rkXfmt(k, v) { var f = rkX(k)[2]; if (v === null || v === undefined || isNaN(v)) return '\u2014'; return f === 's' ? v.toFixed(1) + '%' : f === 'm' ? rdr(v) : fmt(v); }
    function rkPast(geo, name) {
      if (!BASE || !BASE[vs]) return null;
      if (geo === 'county') return BASE[vs].places[name] || null;
      if (!BASED) { loadBased(); return null; }
      return BASED[vs] && BASED[vs].districts[geo] ? BASED[vs].districts[geo][name] || null : null;
    }
    function rkRows(geo) {
      var kn = kNow(), pick = state.geo !== 'state';
      return (pick ? pieceRows(geo) : places[geo] || []).map(asOf).map(function (row) {
        var pq = pick ? piecePast(row) : null;
        var n = sum(row.pty || [0]), p = pick ? pq && pq.p : rkPast(geo, row.name), Y = pick ? (pq ? { k0: pq.k0 } : null) : BASE && BASE[vs], o = { row: row };
        if (dayOn()) {   // one day of early in-person voting, and the same day of early voting in the picked year
          var dm = function (x, reg, lpr) {
            var q = { turn: null, party: null, lpturn: null, lpgap: null }; if (!x) return q;
            var dn = dayN(x), lp = x.length > 8 ? x[8] + x[9] + x[10] : null;
            q.turn = reg ? dn / reg * 100 : null; q.party = dn > 0 ? (x[0] - x[1]) / dn * 100 : null;
            q.lprates = lp !== null && lpr ? [lpr[0] ? x[8] / lpr[0] * 100 : null, lpr[1] ? x[9] / lpr[1] * 100 : null] : null;
            q.lpturn = q.lprates && q.lprates[0] !== null && q.lprates[1] !== null ? q.lprates[0] - q.lprates[1] : null;
            q.lpgap = lp ? (x[8] - x[9]) / lp * 100 : null;
            q.c = { turn: dn, party: x[0] - x[1], lp: lp !== null ? [x[8], x[9]] : null };   // the same in votes
            return q;
          };
          var a = dm(row.dd && row.dd[dayI], row.reg, row.lpr), b = p ? dm(p.dd && p.dd[dayI], p.reg, p.lpr) : {};
          o.lprates = a.lprates;
          var dx = row.dd && row.dd[dayI], px0 = p && p.dd && p.dd[dayI];
          o.cx = dx ? rkComp(dx.slice(0, 4), row.reg, row.rpty, dx.length > 8 ? dx.slice(8, 11) : null, row.lpr) : rkComp(null, row.reg, row.rpty, null, row.lpr);
          o.px = p ? (px0 ? rkComp(px0.slice(0, 4), p.reg, p.rp, px0.length > 8 ? px0.slice(8, 11) : null, p.lpr) : rkComp(null, p.reg, p.rp, null, p.lpr)) : null;
          a.vreg = vsReg(a.party, regM(row.rpty)); if (p) b.vreg = vsReg(b.party, regM(p.rp));
          o.regm = regM(row.rpty);
          ['turn', 'party', 'vreg', 'lpturn', 'lpgap'].forEach(function (m) { o[m] = a[m]; o['d' + m] = a[m] !== null && b[m] !== null && b[m] !== undefined ? a[m] - b[m] : null; });
          if (votesOn()) rkVotes(o, a.c || { turn: null, party: null, lp: null }, b && b.c, dayN(row.dd && row.dd[dayI] || [0]), p ? dayN(p.dd && p.dd[dayI] || [0]) : 0, b.vreg);
          o.name = geo === 'county' ? row.name : +row.name.replace(/\D/g, '');
          return o;
        }
        o.turn = row.reg ? row.vc / row.reg * 100 : null;
        o.party = n > 0 ? (row.pty[0] - row.pty[1]) / n * 100 : null;
        // low-propensity turnout: D and R rates (sorted by D minus R); margin: D minus R share of low-propensity voters who have voted
        o.lprates = row.lp && row.lpr ? [row.lpr[0] ? row.lp[0] / row.lpr[0] * 100 : null, row.lpr[1] ? row.lp[1] / row.lpr[1] * 100 : null] : null;
        o.lpturn = o.lprates && o.lprates[0] !== null && o.lprates[1] !== null ? o.lprates[0] - o.lprates[1] : null;
        o.lpgap = row.lp && sum(row.lp) > 0 ? (row.lp[0] - row.lp[1]) / sum(row.lp) * 100 : null;
        o.regm = regM(row.rpty); o.vreg = vsReg(o.party, o.regm); o.dvreg = null;
        o.cx = rkComp(row.pty, row.reg, row.rpty, row.lp, row.lpr); o.px = null;
        // change since the picked year, in percentage points: 2026 minus the same point that year (final numbers once 2026 is final)
        o.dturn = o.dparty = o.dlpturn = o.dlpgap = null;
        if (p && Y && kn !== null) {
          var i = FINAL || HAS_ED ? p.c.length - 1 : Math.min(Math.max(kn - Y.k0, 0), p.c.length - 1), th = FINAL ? p.fin : p.c[i];
          var pp = FINAL && p.fp ? p.fp : p.p.map(function (a) { return a[i]; }), pn = pp[0] + pp[1] + pp[2] + pp[3];
          var tParty = pn > 0 ? (pp[0] - pp[1]) / pn * 100 : null;
          var tLp = p.lp && p.lpr && p.lpr[0] && p.lpr[1] ? p.lp[0][i] / p.lpr[0] * 100 - p.lp[1][i] / p.lpr[1] * 100 : null;
          var tlpn = p.lp ? p.lp[0][i] + p.lp[1][i] + p.lp[2][i] : 0, tGap = tlpn > 0 ? (p.lp[0][i] - p.lp[1][i]) / tlpn * 100 : null;
          if (o.turn !== null && p.reg && th) o.dturn = o.turn - th / p.reg * 100;
          if (o.party !== null && tParty !== null) o.dparty = o.party - tParty;
          var tV = vsReg(tParty, regM(p.rp)); if (o.vreg !== null && tV !== null) o.dvreg = o.vreg - tV;
          if (o.lpturn !== null && tLp !== null) o.dlpturn = o.lpturn - tLp;
          if (o.lpgap !== null && tGap !== null) o.dlpgap = o.lpgap - tGap;
          var pastC = { turn: th, party: pp[0] - pp[1], lp: p.lp ? [p.lp[0][i], p.lp[1][i]] : null }, pastN = pn, pastV = tV;
          o.px = rkComp(pp, p.reg, p.rp, p.lp ? [p.lp[0][i], p.lp[1][i], p.lp[2][i]] : null, p.lpr);
        }
        if (votesOn()) rkVotes(o, { turn: row.vc, party: n > 0 ? row.pty[0] - row.pty[1] : null, lp: row.lp ? [row.lp[0], row.lp[1]] : null }, pastC || null, n, pastN || 0, pastV);
        o.name = geo === 'county' ? row.name : +row.name.replace(/\D/g, '');
        return o;
      });
    }
    /* Rankings in votes: votes cast; net votes (D minus R); net votes beyond the registration split; low-propensity voters (D and R)
       and their net; and each one's change in votes since the same point in the picked year. */
    function rkVotes(o, c, pc, n, pn, pastV) {
      var vr = o.vreg !== null && o.vreg !== undefined && n ? o.vreg / 100 * n : null, pvr = pc && pastV !== null && pastV !== undefined && pn ? pastV / 100 * pn : null;
      var d = function (a, b) { return a === null || a === undefined || b === null || b === undefined ? null : a - b; };
      var lpn = c.lp ? c.lp[0] - c.lp[1] : null, plpn = pc && pc.lp ? pc.lp[0] - pc.lp[1] : null;
      o.dturn = d(c.turn, pc && pc.turn); o.dparty = d(c.party, pc && pc.party); o.dvreg = d(vr, pvr); o.dlpturn = o.dlpgap = d(lpn, plpn);
      o.turn = c.turn; o.party = c.party; o.vreg = vr; o.lprates = c.lp; o.lpturn = lpn; o.lpgap = lpn;
    }
    function rankBlock(r) {
      var canChg = !!(BASE && BASE[vs]); if (!canChg) rkChg = false;
      var D0 = rkChg ? 'd' : '', base = rkSort === 'name' || /^x:/.test(rkSort) ? rkSort : rkSort.replace(/^d/, '');
      if (!rkCols.length) rkCols = RK_DEF_COLS.slice();
      if (base !== 'name' && rkCols.indexOf(base.replace(/^x:/, '')) < 0) base = rkX(rkCols[0]) ? 'x:' + rkCols[0] : rkCols[0];   // a hidden column can't stay sorted
      rkSort = base === 'name' || /^x:/.test(base) ? base : D0 + base;   // the same column stays sorted when switching views
      var pick = state.geo !== 'state', tabs = pick ? pieceLayers().map(function (g) { return [g, LAYER_NAME[g]]; }) : RKG;
      if (tabs.every(function (g) { return g[0] !== rkGeo; })) rkGeo = tabs[0][0];
      if (pick && !pieceData()) return '<div class="tt-sec tt-rank"><div class="tt-sech">Rankings</div><p class="tt-mnote">Loading\u2026</p></div>';
      if (pick && rkChg && canChg && !piecePastFile(vs)) return '<div class="tt-sec tt-rank"><div class="tt-sech">Rankings</div><p class="tt-mnote">Loading ' + vs + '\u2026</p></div>';
      var ML = { turn: votesOn() ? 'Votes' : 'Turnout', party: votesOn() ? 'Net votes' : 'Party split', vreg: 'Vs. registration', lpturn: votesOn() ? 'Low-prop. voters' : 'Low-prop. turnout', lpgap: votesOn() ? 'Low-prop. net' : 'Low-prop. margin' };
      var geo = rkGeo, rs = rkRows(geo), cols = [['name', geo === 'county' ? 'County' : 'District']]
        .concat(RK_MAIN.filter(function (k2) { return rkCols.indexOf(k2) >= 0; }).map(function (k2) { return [D0 + k2, ML[k2]]; }))
        .concat(RK_X.filter(function (x) { return rkCols.indexOf(x[0]) >= 0; }).map(function (x) { return ['x:' + x[0], x[1]]; }));
      var sv = function (o) { return /^x:/.test(rkSort) ? (o.cx ? o.cx[rkSort.slice(2)] : null) : rkSort === 'lpturn' && rkLpBy !== 'gap' ? (o.lprates ? o.lprates[rkLpBy === 'D' ? 0 : 1] : null) : o[rkSort]; };
      rs.sort(function (a, b) {
        var x = sv(a), y = sv(b);
        if (x === null) return 1; if (y === null) return -1;
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * rkDir;
      });
      var cur = state.geo === geo ? r.name : null, shown = rkAll ? rs : rs.slice(0, 10);
      if (!rkAll && cur && shown.every(function (o) { return o.row.name !== cur; })) { var me = rs.filter(function (o) { return o.row.name === cur; })[0]; if (me) shown = shown.concat([me]); }
      var DQ = dayOn() ? 2 : 1;
      function chip(v) { if (v === null) return '<span class="tt-na">—</span>'; var z = Math.abs(v) < (DQ === 2 ? 0.005 : 0.05); return '<span class="tt-chip ' + (z ? 'ev' : v > 0 ? 'up' : 'dn') + '">' + (z ? 'Same' : (v > 0 ? '▲ ' : '▼ ') + Math.abs(v).toFixed(DQ) + ' pts') + '</span>'; }
      function shift(v) { return v === null ? '<span class="tt-na">—</span>' : Math.abs(v) < 0.05 ? '<span style="font-weight:700">No change</span>' : '<span style="color:' + (v > 0 ? 'var(--pd)' : 'var(--pr)') + ';font-weight:700">' + (v > 0 ? 'D' : 'R') + ' +' + Math.abs(v).toFixed(1) + '</span>'; }
      function lpCell(rt, dq) {   // "D 11.4% · R 5.0%", the higher rate in bold
        if (!rt || rt[0] === null || rt[1] === null) return '<span class="tt-na">—</span>';
        var dw = rt[0] >= rt[1] ? 700 : 400, rw = rt[1] > rt[0] ? 700 : 400;
        return '<span class="tt-lprt"><span style="color:var(--pd);font-weight:' + dw + '">D\u00A0' + rt[0].toFixed(dq) + '%</span> \u00B7 <span style="color:var(--pr);font-weight:' + rw + '">R\u00A0' + rt[1].toFixed(dq) + '%</span></span>';
      }
      function drc(v, dec) { return v === null ? '<span class="tt-na">—</span>' : '<span style="color:' + (v > 0.05 ? 'var(--pd)' : v < -0.05 ? 'var(--pr)' : 'var(--ink)') + ';font-weight:700">' + dr(v, dec) + '</span>'; }
      if (votesOn()) {   // the same cells, in votes
        var V0 = function (v) { return v === null || v === undefined || isNaN(v); };
        chip = function (v) { if (V0(v)) return '<span class="tt-na">\u2014</span>'; v = Math.round(v); return '<span class="tt-chip ' + (!v ? 'ev' : v > 0 ? 'up' : 'dn') + '">' + (!v ? 'Same' : (v > 0 ? '\u25B2 ' : '\u25BC ') + fmt(Math.abs(v))) + '</span>'; };
        shift = function (v) { if (V0(v)) return '<span class="tt-na">\u2014</span>'; v = Math.round(v); return !v ? '<span style="font-weight:700">No change</span>' : '<span style="color:' + (v > 0 ? 'var(--pd)' : 'var(--pr)') + ';font-weight:700">' + (v > 0 ? 'D' : 'R') + ' +' + fmt(Math.abs(v)) + '</span>'; };
        drc = function (v) { if (V0(v)) return '<span class="tt-na">\u2014</span>'; v = Math.round(v); return '<span style="color:' + (v > 0 ? 'var(--pd)' : v < 0 ? 'var(--pr)' : 'var(--ink)') + ';font-weight:700">' + (!v ? 'even' : (v > 0 ? 'D' : 'R') + ' +' + fmt(Math.abs(v))) + '</span>'; };
        lpCell = function (rt) { if (!rt || V0(rt[0]) || V0(rt[1])) return '<span class="tt-na">\u2014</span>'; return '<span class="tt-lprt"><span style="color:var(--pd);font-weight:' + (rt[0] >= rt[1] ? 700 : 400) + '">D\u00A0' + fmt(rt[0]) + '</span> \u00B7 <span style="color:var(--pr);font-weight:' + (rt[1] > rt[0] ? 700 : 400) + '">R\u00A0' + fmt(rt[1]) + '</span></span>'; };
      }
      var t = '<div class="tt-sec tt-rank" data-csv="rank"><div class="tt-sech">Rankings' + (pick ? ' in ' + esc(LONG[state.geo](state.sel[state.geo])) : '') + '<span>' + (pick ? rs.length + (rs.length === 1 ? ' part' : ' parts') + ' inside' : rkAll ? 'All ' + rs.length : 'Top 10 of ' + rs.length) + '</span></div>' +
        crow('Rank', seg(tabs.map(function (g) { return bt('data-rkg', g[0], g[1], geo === g[0]); }).join(''), 'Rank', 'tt-rkg')) +
        (canChg ? viewYearRow(rkChg, 'data-rkc').replace(/tt-vyr/, 'tt-vyr tt-rkc') : '') + numCtl() +
        crow('Columns', '<button type="button" class="tt-linkbtn tt-rkpick" aria-expanded="' + rkPick + '">' + (rkPick ? 'Done choosing columns' : 'Choose columns (' + rkCols.length + ' shown)') + '</button>') +
        (rkPick ? '<div class="tt-rkx" role="group" aria-label="Columns to show"><span class="tt-rkxg">Measures</span>' + RK_MAIN.map(function (k2) { return bt('data-rkx', k2, ML[k2], rkCols.indexOf(k2) >= 0); }).join('') +
          ['v', 'p', 'r', 'l'].map(function (g) { return '<span class="tt-rkxg">' + RK_XG[g] + '</span>' + RK_X.filter(function (x) { return x[3] === g; }).map(function (x) { return bt('data-rkx', x[0], x[1], rkCols.indexOf(x[0]) >= 0); }).join(''); }).join('') +
          '<span class="tt-rkxg"></span><button type="button" class="tt-linkbtn tt-rkxr">Back to the standard five</button>' + (rkChg ? '<span class="tt-mnote" style="margin:4px 0 0;flex:1 0 100%">With Change since on, the extra columns show 2026 with ' + vs + ' beneath.</span>' : '') + '</div>' : '') +
        '<div class="tt-rkw"><table class="tt-rkt"><thead><tr>' + cols.map(function (c) {
          var on = rkSort === c[0], lab = c[1] + (on && c[0] === 'lpturn' ? ' (by ' + { D: 'D rate', R: 'R rate', gap: 'D \u2212 R' }[rkLpBy] + ')' : '');
          var two = csvAll && rkChg && /^x:/.test(c[0]) ? '<th>' + c[1] + ' (' + vs + ')</th>' : '';
          return '<th data-rks="' + c[0] + '"' + (on ? ' class="on" aria-sort="' + (rkDir > 0 ? 'ascending' : 'descending') + '"' : '') + '><button type="button"' + (c[0] === 'lpturn' ? ' title="Click again to sort by the D rate, the R rate, or the gap"' : '') + '>' + lab + (two ? ' (2026)' : '') + (on ? (rkDir > 0 ? ' ▲' : ' ▼') : '') + '</button>' +
            (c[0] === 'name' ? '' : rkQ(c[0].replace(/^d(?=turn|party|vreg|lp)/, ''))) + '</th>' + two;
        }).join('') + '</tr></thead><tbody>' +
        shown.map(function (o) {
          var rank = rs.indexOf(o) + 1;
          return '<tr class="go' + (o.row.name === cur ? ' me' : '') + '" tabindex="0" data-rkn="' + esc(o.row.name) + '"><td><span class="tt-rkn">' + rank + '</span>' + esc(geo === 'county' ? o.row.name : o.row.name) + '</td>' +
            cols.slice(1).map(function (c) {
              var k2 = c[0].replace(/^d(?=turn|party|vreg|lp)/, '');
              if (/^x:/.test(k2)) { var xk = k2.slice(2), now = rkXfmt(xk, o.cx ? o.cx[xk] : null), was = rkChg && o.px ? rkXfmt(xk, o.px[xk]) : null;
                return csvAll && rkChg ? '<td>' + now + '</td><td>' + (was === null ? '' : was) + '</td>' : '<td>' + now + (was === null ? '' : '<small class="tt-rkpast">' + vs + ': ' + was + '</small>') + '</td>'; }
              if (rkChg) return '<td>' + (k2 === 'turn' ? chip(o.dturn) : shift(o['d' + k2])) + '</td>';
              return '<td>' + (k2 === 'turn' ? '<b>' + (o.turn === null ? '—' : votesOn() ? fmt(o.turn) : o.turn.toFixed(DQ) + '%') + '</b>' : k2 === 'lpturn' ? lpCell(o.lprates, DQ) : drc(o[k2], 0)) + '</td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        (rs.length > 10 ? '<button type="button" class="tt-more tt-rkall">' + (rkAll ? 'Show the top 10' : 'Show all ' + rs.length) + '</button>' : '') +
        '<p class="tt-pfoot">Click or tap a row to open ' + (pick ? 'all of it' : 'it') + '.</p></div>';
      rkCtx = { vs: vs, chg: rkChg, day: dayOn(), votes: votesOn(), geo: geo, pick: pick ? LONG[state.geo](state.sel[state.geo]) : null };
      return t;
    }
    /* "Who has voted" as a PNG: the section as shown, re-laid at a fixed width with the Carolina Forward name, title and source.
       html2canvas is loaded from cdnjs only when someone clicks Download. */
    var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', H2C_SRI = 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H', h2cP = null;
    function h2c() {
      if (window.html2canvas) return Promise.resolve(window.html2canvas);
      if (!h2cP) h2cP = new Promise(function (ok, no) {
        var sc = document.createElement('script'); sc.src = H2C; sc.integrity = H2C_SRI; sc.crossOrigin = 'anonymous';
        sc.onload = function () { if (window.html2canvas) ok(window.html2canvas); else { h2cP = null; no(); } };
        sc.onerror = function () { h2cP = null; no(); };
        document.head.appendChild(sc);
      });
      return h2cP;
    }
    var WHO_SUB = { party: 'By party registration', age: 'By age', race: 'By race and ethnicity', prop: 'By voting history (propensity)', new: 'First-time registrants' };
    var KEEP = '.tt-eh, .tt-es, .tt-shh, .tt-lede, .tt-pq, .tt-pqs, .tt-ssec, .tt-pbar, .tt-pleg';
    var DL_DROP = '.tt-hint, .tt-secbar, .tt-calhint, .tt-pace, .tt-caltip, .tt-dlrow, .tt-csvdl, .tt-zctl, .tt-tostate, .tt-about, .tt-q, .tt-crow, .tt-yp, .tt-who, .tt-leftsw, .tt-more, .tt-linkbtn, .tt-step, .tt-shdl, .tt-secdl, .tt-whomsg, .tt-cure, .tt-yrhint, .tt-foldall';
    function secPng(btn) {
      var top = btn.getAttribute('data-top') === '1', sec = top ? null : btn.closest('.tt-sec');
      var place = state.geo === 'state' ? 'North Carolina' : LONG[state.geo](state.sel[state.geo]);
      var c = document.createElement('div'), title = '', sub = '';
      if (top) {   // the headline block: everything from the vote count through the early/mail row
        var on = false;
        Array.prototype.forEach.call(view.children, function (x) {
          if (x.classList.contains('tt-head')) on = true;
          if (on && !x.classList.contains('tt-sec') && !x.classList.contains('tt-topdl')) c.appendChild(x.cloneNode(true));
          if (x.classList.contains('tt-row')) on = false;
        });
      } else {
        c.appendChild(sec.cloneNode(true));
        var h = c.querySelector('.tt-sech'), meta = h && h.querySelector('span:not(.tt-who)'), fb = h && h.querySelector('.tt-fold');
        if (fb) { var fi = fb.querySelector('.tt-foldi'); if (fi) fi.parentNode.removeChild(fi); fb.parentNode.replaceChild(document.createTextNode(fb.textContent), fb); }
        var pressed = Array.prototype.map.call(sec.querySelectorAll('.tt-rkg .on, .tt-rkc .on'), function (x) { return x.getAttribute('data-lab') || x.textContent.trim(); });
        if (sec.classList.contains('tt-whosec')) {
          if (sec.querySelector('.tt-leftsw .on[data-left="true"]')) title = 'Who hasn’t voted yet';
          sub = [WHO_SUB[who] || WHO_SUB.party, vs ? 'compared with ' + vs : ''].filter(Boolean).join(' · ');
        } else {
          sub = [meta ? meta.textContent.trim() : ''].concat(pressed.map(function (t) { return t.charAt(0) + t.slice(1).toLowerCase(); })).filter(Boolean).join(' · ');
        }
        if (h) {
          Array.prototype.forEach.call(h.querySelectorAll('span, button'), function (x) { x.parentNode && x.parentNode.removeChild(x); });
          title = title || h.textContent.replace(/\s+/g, ' ').trim();
          h.parentNode.removeChild(h);
        }
      }
      Array.prototype.forEach.call(c.querySelectorAll('.tt-yin'), function (x) { x.parentNode.replaceChild(document.createTextNode(vs), x); });
      Array.prototype.forEach.call(c.querySelectorAll(DL_DROP), function (x) { x.parentNode && x.parentNode.removeChild(x); });
      (function strip(n) {   // instructions for the live page ("Click a day…", "Tap a year…") mean nothing in a picture
        if (n.nodeType === 3) { n.nodeValue = n.nodeValue.replace(/\s*(?:Click|Tap|Select)(?: or tap)? (?:a|an|on|any) [^.]*\./g, '').replace(/ the comparison until you pick another year/, ' the comparison year').replace(/[;,]? ?(?:hover|tap)\b[^.;)]*/g, ''); return; }
        if (n.nodeType === 1 && /^\s*If you (?:click|tap)/.test(n.textContent) && n.textContent.length < 300) { n.parentNode.removeChild(n); return; }
        Array.prototype.slice.call(n.childNodes).forEach(strip);
      })(c);
      Array.prototype.forEach.call(c.querySelectorAll('p'), function (x) { if (!x.textContent.trim()) x.parentNode.removeChild(x); });
      Array.prototype.forEach.call(c.querySelectorAll('[style*="repeating-linear-gradient"]'), function (x) { x.style.background = '#D9D2C3'; });   // the image renderer can't draw hatching
      Array.prototype.forEach.call(c.querySelectorAll('.tt-d.fut .tt-col'), function (x) { x.style.background = 'none'; });
      Array.prototype.forEach.call(c.querySelectorAll('.tt-col'), function (col) {   // layered day bars: biggest first, so the smallest paints on top
        var bars = Array.prototype.slice.call(col.children).filter(function (b) { return b.classList.contains('tt-b') || b.classList.contains('tt-pb'); });
        if (bars.length < 2) return;
        bars.sort(function (a, b) { return (+a.style.zIndex || 0) - (+b.style.zIndex || 0); });
        bars.forEach(function (b) { b.style.boxShadow = 'none'; b.style.borderTop = b.classList.contains('tt-pb') ? '2px solid rgba(255,255,255,.6)' : '0'; b.style.boxSizing = 'border-box'; b.style.zIndex = 'auto'; col.appendChild(b); });
      });
      if (sec && sec.classList.contains('tt-calsec')) c.classList.add('tt-excal');
      var upd = updatedLabel(D).replace(/\.$/, ''), partyNote = !!sec && (/party|rank|map/i.test(title + sub) || (sec.classList.contains('tt-whosec') && (who === 'party' || who === 'prop')));
      // Every image is 1080 x 1350 (4:5, drawn at 540 x 675 and scaled 2x), the portrait size Instagram, Facebook, X and Threads
      // all show in full. Content that doesn't fit flows onto more slides (1/2, 2/2 ...) for a carousel; tables repeat their header.
      var pages = [], cur = null, wide = false;   // wide: a table too wide for the 540px slide gets a 720 x 900 one, scaled 1.5x
      function newPage() {
        var box = document.createElement('div'); box.className = SLUG + ' tt-exp tt-exp45' + (wide ? ' wide' : ''); box.setAttribute('aria-hidden', 'true');
        box.innerHTML = '<div class="tt-exk"><i></i><span>NC Turnout Tracker · ' + esc(place) + '</span><em class="tt-expg"></em></div>' + (title ? '<div class="tt-ext">' + esc(title) + '</div>' : '') +
          (title ? '<p class="tt-exs">' + esc(sub) + '</p>' : '<div class="tt-exsp"></div>') +
          '<div class="tt-exb"></div><div class="tt-exf"><img src="' + CF_LOGO + '" alt=""><div><b>Carolina Forward</b><span>' + CF_URL + '</span></div>' +
          '<p>' + esc(srcLine(partyNote ? 'Party is registration, not vote choice.' : '')) + '</p><div class="tt-exu">' + esc(URL_LINE) + '</div></div>';
        document.body.appendChild(box);
        var exb = box.querySelector('.tt-exb'), f = box.querySelector('.tt-exf');
        exb.style.height = Math.max(200, f.offsetTop - exb.offsetTop - 24) + 'px';
        cur = { box: box, exb: exb, n: 0 }; pages.push(cur); return cur;
      }
      function fits() { var e = cur.exb, l = e.lastElementChild; return e.scrollHeight <= e.clientHeight + 1 && (!l || l.getBoundingClientRect().bottom <= e.getBoundingClientRect().bottom + 1); }
      var shells = [];
      function kidsOf(node) {   // how a block that doesn't fit can be split: table rows, or its child blocks; small blocks stay whole
        if (node.nodeType !== 1 || /^(TR|P|SPAN|B|I|EM|SVG|BUTTON|IMG|CANVAS)$/i.test(node.tagName)) return null;
        if (node.tagName === 'TABLE') {
          var tb = node.tBodies[0]; if (!tb || tb.rows.length < 2) return null;
          var rows = Array.prototype.slice.call(tb.rows);
          return { kids: rows, shell: function () { var t = node.cloneNode(true), b2 = t.tBodies[0]; while (b2.firstChild) b2.removeChild(b2.firstChild); return { el: t, inner: b2 }; } };
        }
        if (node.__h < 140 || node.children.length < 1) return null;
        var kids = Array.prototype.slice.call(node.childNodes).filter(function (k) { return k.nodeType === 1 || (k.nodeType === 3 && k.nodeValue.trim()); });
        if (kids.length < 2 && !(kids[0] && kids[0].nodeType === 1 && kidsOf(kids[0]))) return null;
        return { kids: kids, shell: function () { var e = node.cloneNode(false); return { el: e, inner: e }; } };
      }
      function flow(node, target) {
        var t = target(); t.appendChild(node);
        if (fits()) { cur.n++; return; }
        node.__h = node.offsetHeight || 0; t.removeChild(node);
        var sp = kidsOf(node);
        if (sp) {
          var mine = null, minePage = null;
          var inner = function () { if (minePage !== cur) { var sh = sp.shell(); target().appendChild(sh.el); shells.push(sh.el); mine = sh.inner; minePage = cur; } return mine; };
          sp.kids.forEach(function (k) { flow(k, inner); });
          return;
        }
        if (cur.n) {
          var carry = [];   // a heading, intro line or bar left at the bottom of a slide moves on with what it introduces
          while (t.lastElementChild && t.lastElementChild.matches && t.lastElementChild.matches(KEEP)) carry.unshift(t.removeChild(t.lastElementChild));
          if (carry.length && !cur.exb.textContent.trim()) { carry.forEach(function (e) { t.appendChild(e); }); carry = []; }
          newPage(); t = target(); carry.forEach(function (e) { t.appendChild(e); });
        }
        t.appendChild(node); cur.n++;   // too tall for a whole slide: it runs to the bottom edge rather than vanish
      }
      newPage();
      // one slide when it fits; when it's just over (up to ~30%), lay it out a bit wider and scale it down rather than leave a
      // nearly empty second slide
      var all = Array.prototype.slice.call(c.childNodes), ex = cur.exb, avail = ex.clientHeight;
      var wrap = document.createElement('div'); wrap.style.display = 'flow-root'; all.forEach(function (k) { wrap.appendChild(k); }); ex.appendChild(wrap);
      var tooWide = wrap.scrollWidth > ex.clientWidth + 2 || Array.prototype.some.call(wrap.querySelectorAll('table, div'), function (e) { return e.scrollWidth > e.clientWidth + 2; });
      if (tooWide && !wide) {   // too wide: start over on the bigger slide
        all.forEach(function (k0) { c.appendChild(k0); }); document.body.removeChild(cur.box); pages = []; wide = true; newPage();
        ex = cur.exb; avail = ex.clientHeight; all.forEach(function (k0) { wrap.appendChild(k0); }); ex.appendChild(wrap);
      }
      var H = wrap.offsetHeight, k = 1;
      if (H > avail && H <= avail * 1.3) {
        for (var it = 0; it < 3 && wrap.offsetHeight * k > avail; it++) { k = Math.min(k, avail / wrap.offsetHeight) * 0.995; wrap.style.width = (ex.clientWidth / k) + 'px'; }
        if (wrap.offsetHeight * k <= avail) { wrap.style.transform = 'scale(' + k + ')'; wrap.style.transformOrigin = '0 0'; H = wrap.offsetHeight * k; }
        else { wrap.style.width = ''; k = 1; }
      }
      if (H <= avail) {
        cur.n = 1;
        if (H < avail - 40) { ex.style.display = 'flex'; ex.style.flexDirection = 'column'; ex.style.justifyContent = 'center'; wrap.style.marginTop = '-20px'; }
      } else {
        ex.removeChild(wrap);
        // whole groups per slide where they fit: a new group starts at "Turnout by group", the Hispanic/Latino block, and each question heading
        var groups = [], g = null, kids = all, secShell = null;
        if (all.length === 1 && all[0].nodeType === 1 && all[0].classList.contains('tt-sec')) { secShell = all[0]; kids = Array.prototype.slice.call(secShell.childNodes); }
        kids.forEach(function (k2) { if (k2.nodeType === 3 && !k2.nodeValue.trim()) return; if (!g || (k2.nodeType === 1 && k2.matches && k2.matches('.tt-lede, .tt-eth, .tt-pq, .tt-shs') && g.length)) { g = []; groups.push(g); } g.push(k2); });
        if (secShell) groups = groups.map(function (gr) { var sh = secShell.cloneNode(false); gr.forEach(function (k3) { sh.appendChild(k3); }); return [sh]; });   // each group keeps the section's styles
        function squeeze() {   // a slide that's just over (up to 25%): lay it out a bit wider and scale it down, then call it full
          var ex2 = cur.exb, av = ex2.clientHeight; if (ex2.scrollHeight > av * 1.3) return false;
          var w2 = document.createElement('div'); w2.style.display = 'flow-root'; while (ex2.firstChild) w2.appendChild(ex2.firstChild); ex2.appendChild(w2);
          var k2 = 1; for (var it2 = 0; it2 < 8 && w2.offsetHeight * k2 > av; it2++) { k2 = Math.min(k2, av / w2.offsetHeight) * 0.995; w2.style.width = (ex2.clientWidth / k2) + 'px'; }
          if (w2.offsetHeight * k2 > av) { while (w2.firstChild) ex2.insertBefore(w2.firstChild, w2); ex2.removeChild(w2); return false; }
          w2.style.transform = 'scale(' + k2 + ')'; w2.style.transformOrigin = '0 0'; cur.full = true; cur.n++; return true;
        }
        groups.forEach(function (gr) {
          if (cur.full) newPage();
          var tgt = cur.exb; gr.forEach(function (k3) { tgt.appendChild(k3); });
          if (fits()) { cur.n++; return; }
          if (squeeze()) return;
          gr.forEach(function (k3) { tgt.removeChild(k3); });
          if (cur.n) { newPage(); tgt = cur.exb; gr.forEach(function (k3) { tgt.appendChild(k3); }); if (fits()) { cur.n++; return; } if (squeeze()) return; gr.forEach(function (k3) { tgt.removeChild(k3); }); }
          gr.forEach(function (k3) { flow(k3, function () { return cur.exb; }); });
        });
      }
      shells.forEach(function (e) { if (!e.textContent.trim() && !e.querySelector('i,span,img')) e.parentNode && e.parentNode.removeChild(e); });
      pages = pages.filter(function (pg) { if (pg.exb.textContent.trim()) return true; pg.box.parentNode.removeChild(pg.box); return false; });
      if (pages.length > 1) pages.forEach(function (pg, i) { pg.box.querySelector('.tt-expg').textContent = (i + 1) + '/' + pages.length; });
      var old = btn.textContent; btn.textContent = 'Making image…'; btn.disabled = true;
      var holder = btn.parentNode;
      function done(msg) {
        pages.forEach(function (pg) { if (pg.box.parentNode) pg.box.parentNode.removeChild(pg.box); }); btn.textContent = old; btn.disabled = false;
        var m = btn.nextElementSibling; if (m && m.classList.contains('tt-whomsg')) m.parentNode.removeChild(m);
        if (msg && holder) btn.insertAdjacentHTML('afterend', '<p class="tt-whomsg">' + msg + '</p>');
      }
      var slug = function (x) { return x.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
      var name = 'carolina-forward-' + slug(state.geo === 'state' ? 'statewide' : place) + '-' + slug(title || 'turnout') + (sec && sec.classList.contains('tt-whosec') ? '-' + (who || 'party') : '') + (vs ? '-vs' + vs : '') + (!sec || !/ on |through/i.test(title) ? (thruOn() ? '-through-' + EV_DAYS[dayI] : dayOn() ? '-' + EV_DAYS[dayI] + '-only' : '') : '') + '-' + D.days[fullDay()];
      // html2canvas finds each font's baseline with a 1x1 <img> placed on the page itself; a site-wide reset like img{display:block}
      // breaks that and pushes every line of text down, so keep its probe inline while the image is drawn
      var fix = document.createElement('style');
      fix.textContent = 'body>div>img[width="1"][height="1"]{display:inline !important;max-width:none !important;width:1px !important;height:1px !important;float:none !important;position:static !important}';
      document.head.appendChild(fix);
      function unfix() { if (fix.parentNode) fix.parentNode.removeChild(fix); }
      shFonts().then(h2c).then(function (H) {
        var out = [];
        return pages.reduce(function (pr, pg) {
          return pr.then(function () { return H(pg.box, { scale: wide ? 1.5 : 2, width: wide ? 720 : 540, height: wide ? 900 : 675, backgroundColor: '#ffffff', logging: false, useCORS: true, windowWidth: 1200 }).then(function (cv) { out.push(cv); }); });
        }, Promise.resolve()).then(function () { return out; });
      }).then(function (cvs) {
        unfix();
        cvs.forEach(function (cv, i) { setTimeout(function () { shSave(cv, name + (cvs.length > 1 ? '-' + (i + 1) + 'of' + cvs.length : '') + '.png'); }, i * 600); });
        done('');
      }, function () { unfix(); done('Couldn’t make the image. Check your connection and try again.'); });
    }
    function dlBtn(top) { return '<button type="button" class="tt-shdl tt-whodl tt-secdl"' + (top ? ' data-top="1"' : '') + '>Download ' + (top ? 'these numbers' : 'this view') + ' (PNG)</button>'; }
    var dlBusy = false;
    function wireDl() {   // a download button at the end of every section that doesn't already have one (the map and graphics do)
      if (dlBusy) return; dlBusy = true;
      Array.prototype.forEach.call(view.querySelectorAll('.tt-sec:not(.tt-map):not(.tt-gfx):not(.tt-nodl)'), function (sec) {
        if (sec.parentNode !== view || sec.querySelector(':scope > .tt-secdl, :scope > .tt-dlrow')) return;
        sec.insertAdjacentHTML('beforeend', sec.hasAttribute('data-csv') ? '<div class="tt-dlrow">' + csvBtn() + '</div>' : dlBtn(false));   // tables download as data (CSV), pictures as PNG
      });
      var row = view.querySelector(':scope > .tt-row') || view.querySelector(':scope > .tt-head');
      if (row && !view.querySelector('.tt-topdl')) row.insertAdjacentHTML('afterend', '<div class="tt-topdl">' + dlBtn(true) + '</div>');
      dlBusy = false;
    }
    view.addEventListener('click', function (e) {   // Percentages / Votes: one switch for Who has voted, Rankings and the crosstabs; keep the clicked section where it is on screen
      var nb = e.target.closest && e.target.closest('[data-num]'); if (!nb) return;
      var sec = nb.closest('.tt-sec'), cls = sec ? '.' + Array.prototype.filter.call(sec.classList, function (c) { return c !== 'tt-sec'; })[0] : null, top = sec ? sec.getBoundingClientRect().top : 0;
      numMode = nb.getAttribute('data-num'); show();
      var ns = cls && view.querySelector(cls); if (ns) window.scrollBy(0, ns.getBoundingClientRect().top - top);
    });
    view.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.tt-secdl'); if (b && !b.disabled) secPng(b);
      var cb = e.target.closest && e.target.closest('.tt-csvdl'); if (cb) csvFor(cb.closest('[data-csv]') || cb.closest('.tt-sec')); });
    /* CSV downloads: the same table as on the page, with every row (not just the top 10 or 15), as plain text. The map's CSV
       lists every place on the map with the value it's colored by. */
    var csvAll = false, lastArgs = null;
    function csvBtn(map) { return '<button type="button" class="tt-shdl tt-csvdl">Download ' + (map ? 'map data' : 'table') + ' (CSV)</button>'; }
    function csvCell(x) { x = x === null || x === undefined ? '' : String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
    function csvText(t) { return t.replace(/\u00A0/g, ' ').replace(/\u25B2\s*/g, '+').replace(/\u25BC\s*/g, '-').replace(/\u2014/g, '').replace(/\s+/g, ' ').trim(); }
    function tableRows(html) {
      var box = document.createElement('div'); box.innerHTML = html;
      var tb = box.querySelector('table'); if (!tb) return null;
      Array.prototype.forEach.call(tb.querySelectorAll('.tt-q, .tt-dots, .tt-hide-csv'), function (b) { b.parentNode.removeChild(b); });
      Array.prototype.forEach.call(tb.querySelectorAll('.tt-rkn'), function (x) { x.textContent = x.textContent + '. '; });
      return Array.prototype.map.call(tb.querySelectorAll('tr'), function (tr) { return Array.prototype.map.call(tr.children, function (td) { return td.tagName === 'TH' ? csvText(td.textContent.replace(/[\u25B2\u25BC]/g, '')) : csvText(td.textContent); }); })
        .filter(function (row) { return row.some(function (x) { return x !== ''; }); });
    }
    function csvName(kind) {
      var where = state.geo === 'state' ? 'statewide' : LONG[state.geo](state.sel[state.geo]).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return 'carolina-forward-' + kind + '-' + where + (thruOn() ? '-through-' + EV_DAYS[dayI] : dayOn() ? '-' + EV_DAYS[dayI] + '-only' : '') + '-' + D.asof + '.csv';
    }
    function csvFor(sec) {
      if (!sec || !lastArgs) return;
      var kind = sec.getAttribute('data-csv') || (sec.classList.contains('tt-map') ? 'map' : ''), rows = null;
      try {
        csvAll = true;
        if (kind === 'rank') { var ra = rkAll; rkAll = true; rows = tableRows(rankBlock(lastArgs.r)); rkAll = ra; kind = 'rankings'; }
        else if (kind === 'pct') { var pa = ptAll; ptAll = true; rows = tableRows(pctTable(lastArgs.r)); ptAll = pa; kind = 'precincts' + (ptChg ? '-vs' + vs : '');
          if (rows) rows = rows.map(function (row) { return row.slice(-2).concat(row.slice(0, -2)); });   // county and code first
          if (rows && ptChg) rows[0] = rows[0].map(function (h, j) { return j > 2 ? h + ' (change since ' + vs + ')' : h; }); }
        else if (kind === 'dps') { rows = tableRows(dayPartyBlock(lastArgs.r)); kind = 'party-split-by-day-' + (psThru ? 'through-' : '') + 'day-' + (dayPartyRows(lastArgs.r).i + 1) + (psVotes ? '-votes' : ''); }
        else if (kind === 'edp') { rows = tableRows(edpBlock(lastArgs.r)); kind = 'election-day-precincts-' + edpYr; }
        else if (kind === 'edh') { rows = tableRows(edBlock(lastArgs.r)); kind = 'election-day-past-years' + (votesOn() ? '-votes' : ''); }
        else if (kind === 'sites') { rows = tableRows(sitesBlock(lastArgs.k, lastArgs.r, lastArgs.sites)); kind = 'early-voting-sites'; }
        else if (kind === 'map') {
          var unit = pctOn() ? 'Precinct' : { county: 'County', cd: 'Congressional district', hd: 'NC House district', sd: 'NC Senate district' }[mapGeo()] || 'Place';
          rows = [[unit, mapTitle()]].concat(mapRows().map(function (rw) {
            var nm = rw.piece ? pieceLabel(rw.piece, rw.name) : rw.label || (pctOn() ? rw.name : (LONG[mapGeo()] ? LONG[mapGeo()](rw.name) : rw.name)), v = mapVal(rw);
            return [csvText(String(nm)), v === null || v === undefined || isNaN(v) ? '' : +v.toFixed(dayOn() ? 2 : 1)];
          }));
          kind = 'map-' + (mapMode === 'race' ? 'race' : mapMode) + (mapChg ? '-vs' + vs : '');
        }
      } finally { csvAll = false; }
      if (!rows || !rows.length) return;
      if (rows.length > 1) {   // drop columns with nothing in them (sparklines, buttons)
        var keep = rows[0].map(function (_, j) { return rows.slice(1).some(function (row) { return row[j] !== '' && row[j] !== undefined; }); });
        rows = rows.map(function (row) { return row.filter(function (_, j) { return keep[j]; }); });
      }
      var txt = '\uFEFF' + rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n') + '\r\n';
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = csvName(kind);
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
    }
    var dlQueued = false;
    if (window.MutationObserver) new MutationObserver(function () { if (dlQueued) return; dlQueued = true; setTimeout(function () { dlQueued = false; wireDl(); }, 0); }).observe(view, { childList: true, subtree: true });
    function wireRank() {
      var box = view.querySelector('.tt-rank'); if (!box) return;
      function re() { var y = window.scrollY; show(); window.scrollTo(0, y); }
      Array.prototype.forEach.call(box.querySelectorAll('[data-rkg]'), function (b) { b.addEventListener('click', function () { rkGeo = b.getAttribute('data-rkg'); re(); }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-rks]'), function (th) { th.addEventListener('click', function () {
        var k2 = th.getAttribute('data-rks');
        if (k2 === 'lpturn' && rkSort === 'lpturn') { rkLpBy = { D: 'R', R: 'gap', gap: 'D' }[rkLpBy]; rkDir = -1; }   // cycle: D rate, R rate, gap
        else if (rkSort === k2) rkDir = -rkDir; else { rkSort = k2; rkDir = k2 === 'name' ? 1 : -1; if (k2 === 'lpturn') rkLpBy = 'D'; }
        re(); }); });
      var all = box.querySelector('.tt-rkall'); if (all) all.addEventListener('click', function () { rkAll = !rkAll; re(); });
      var pk = box.querySelector('.tt-rkpick'); if (pk) pk.addEventListener('click', function () { rkPick = !rkPick; re(); });
      var rr = box.querySelector('.tt-rkxr'); if (rr) rr.addEventListener('click', function () { rkCols = RK_DEF_COLS.slice(); re(); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-rkx]'), function (b) { b.addEventListener('click', function () {
        var k2 = b.getAttribute('data-rkx'), i = rkCols.indexOf(k2);
        if (i >= 0) { if (rkCols.length > 1) rkCols.splice(i, 1); } else rkCols.push(k2);
        var order = RK_MAIN.concat(RK_X.map(function (x) { return x[0]; })); rkCols.sort(function (a, b2) { return order.indexOf(a) - order.indexOf(b2); });
        re(); }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-rkc]:not([data-vs])'), function (b) { b.addEventListener('click', function () { rkChg = b.getAttribute('data-rkc') === 'true'; re(); }); });
      Array.prototype.forEach.call(box.querySelectorAll('tr[data-rkn]'), function (tr) {
        function go() { state.sel[rkGeo] = tr.getAttribute('data-rkn'); site = null; setGeo(rkGeo); window.scrollTo(0, mount.getBoundingClientRect().top + window.scrollY - 10); }
        tr.addEventListener('click', go); tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      });
    }
    /* Precinct table: every precinct in the picked county or district, sortable, under the map. It follows the day picker
       and the year picked (change since). Precincts with fewer than 10 votes show a dash. */
    var ptSort = { k: 'turn', d: -1 }, ptAll = false, ptChg = false;
    function pctTableRows() {
      var need = pctNeed(); if (!need) return null;
      return need.keys.map(function (k2) {
        var c = k2.split('|')[0], code = k2.slice(c.length + 1), sh = PSH[c] || { n: {} }, nm = sh.n[code];
        var row = { name: k2, county: c, label: (!nm || nm === code ? 'Precinct ' + code : titleish(nm)) + (need.counties.length > 1 ? ' (' + c + ')' : ''), reg: PCTD.reg[c][code], v: (PCTD.c[c] || {})[code] || null };
        var vv = dayOn() ? pctDayV(row) : thruOn() ? pctThruV(row) : row.v;
        row.votes = vv ? vv[0] : null; row.turn = pctVal(row, 'turn'); row.party = pctVal(row, 'party'); row.vreg = pctVal(row, 'vreg'); row.lpr = pctVal(row, 'lprates'); row.lpturn = pctVal(row, 'lpturn'); row.lpgap = pctVal(row, 'lpgap');
        if (ptChg) ['turn', 'party', 'vreg', 'lpturn', 'lpgap'].forEach(function (m) { var t = pctPastVal(row, m); row['d' + m] = row[m] !== null && t !== null ? row[m] - t : null; });
        return row;
      });
    }
    function pctTable(r) {
      var place = LONG[state.geo](state.sel[state.geo]), hasPast = !!(BASE && BASE[vs]);
      if (!hasPast) ptChg = false;
      var head = '<div class="tt-sec tt-pctab" data-csv="pct"><div class="tt-sech">Precinct by precinct in ' + esc(place) + '<span>' + (pctNeed() ? fmt(pctNeed().keys.length) + ' precincts' : '') + '</span></div>';
      var rows = pctTableRows();
      if (!rows || (ptChg && !pctPastReady(pctNeed().counties)) || ((dayOn() || thruOn()) && !pctDaysReady())) return head + '<p class="tt-mnote">Loading precincts\u2026</p></div>';
      var DQ = dayOn() ? 2 : 1, n = rows.length;
      var get = function (o, key) { return key === 'name' ? o.label : key === 'lpr' ? (o.lpr && o.lpr[0] !== null ? o.lpr[0] : null) : o[key]; };
      if (!ptChg && /^d/.test(ptSort.k)) ptSort.k = ptSort.k.slice(1);
      if (ptChg && ['turn', 'party', 'vreg', 'lpturn', 'lpgap'].indexOf(ptSort.k) >= 0) ptSort.k = 'd' + ptSort.k;
      rows.sort(bySort(ptSort, get));
      var shown = ptAll ? rows : rows.slice(0, 15), na = '<span class="tt-na">\u2014</span>';
      var pc = function (x) { return x === null || x === undefined ? na : x.toFixed(DQ) + '%'; };
      var sh = function (x) { return x === null || x === undefined ? na : Math.abs(x) < 0.05 ? 'No change' : '<span style="color:' + (x > 0 ? 'var(--pd)' : 'var(--pr)') + ';font-weight:700">' + (x > 0 ? 'D' : 'R') + ' +' + Math.abs(x).toFixed(1) + '</span>'; };
      var ch = function (x) { return x === null || x === undefined ? na : '<span class="tt-chip ' + (Math.abs(x) < 0.05 ? 'ev' : x > 0 ? 'up' : 'dn') + '">' + (Math.abs(x) < 0.05 ? 'Same' : (x > 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(x).toFixed(1) + ' pts') + '</span>'; };
      var drp = function (x, d) { return x === null || x === undefined ? na : '<b style="color:' + (x > 0.05 ? 'var(--pd)' : x < -0.05 ? 'var(--pr)' : 'var(--ink)') + '">' + dr(x, d) + '</b>'; };
      var cols = ptChg ? [['name', 'Precinct'], ['dturn', 'Turnout'], ['dparty', 'Party split'], ['dvreg', 'Vs. registration'], ['dlpturn', 'Low-prop. turnout'], ['dlpgap', 'Low-prop. margin']]
        : [['name', 'Precinct'], ['votes', dayOn() ? 'Votes that day' : 'Votes'], ['turn', 'Turnout'], ['party', 'Party split'], ['vreg', 'Vs. registration'], ['lpr', 'Low-prop. turnout'], ['lpgap', 'Low-prop. margin']];
      var t = head + (hasPast ? viewYearRow(ptChg, 'data-ptc') : '') +
        '<div class="tt-rkw"><table class="tt-rkt tt-ptt"><thead><tr>' + cols.map(function (c) { return sortTh('data-pts', c[0], c[1], ptSort, c[0] === 'votes' ? 'tt-hide-m' : '') + ''; }).join('').replace(/(Low-prop\. (?:turnout|margin)[^<]*<\/button>)/g, '$1' + lpQ()).replace(/(Vs\. registration[^<]*<\/button>)/g, '$1' + regQ()) + '<th class="tt-csvonly">County</th><th class="tt-csvonly">Precinct code</th></tr></thead><tbody>' +
        shown.map(function (o) {
          var cv = '<td class="tt-csvonly">' + esc(o.county) + '</td><td class="tt-csvonly">' + esc(o.name.slice(o.county.length + 1)) + '</td>';
          return '<tr><td>' + esc(o.label) + '</td>' + (ptChg ? '<td>' + ch(o.dturn) + '</td><td>' + sh(o.dparty) + '</td><td>' + sh(o.dvreg) + '</td><td>' + sh(o.dlpturn) + '</td><td>' + sh(o.dlpgap) + '</td>'
            : '<td class="tt-hide-m">' + (o.votes === null ? na : fmt(o.votes)) + '</td><td><b>' + pc(o.turn) + '</b></td><td>' + drp(o.party, 0) + '</td><td>' + drp(o.vreg, 0) + '</td><td>' + (o.lpr && o.lpr[0] !== null && o.lpr[1] !== null ? '<span style="color:var(--pd)">D\u00A0' + o.lpr[0].toFixed(DQ) + '%</span> \u00B7 <span style="color:var(--pr)">R\u00A0' + o.lpr[1].toFixed(DQ) + '%</span>' : na) + '</td><td>' + drp(o.lpgap, 0) + '</td>') + cv + '</tr>';
        }).join('') + '</tbody></table></div>' +
        (n > 15 ? '<button type="button" class="tt-more tt-ptall">' + (ptAll ? 'Show the top 15' : 'Show all ' + n + ' precincts') + '</button>' : '') +
        '<p class="tt-pfoot">' + (dayOn() ? 'Early in-person votes on ' + esc(dayShort(dayI)) + ' only. ' : thruOn() ? 'Votes cast through ' + esc(dayShort(dayI)) + '. ' : '') +
        (ptChg ? 'Change from the same ' + (dayOn() ? 'day' : 'point') + ' in ' + vs + ', in percentage points, on today\u2019s precinct lines (past voters placed where they live now). ' : '') +
        'Each vote is counted in the voter\u2019s home precinct (State Board lines, Aug. 2026). Vs. registration: the party split minus the party split of the precinct\u2019s registered voters. A dash: fewer than ' + ((PCTD && PCTD.min) || 10) + ' votes, too few registered voters to measure, or hidden so a nearby small precinct\u2019s count can\u2019t be worked out. Party is registration, not vote choice.</p></div>';
      return t;
    }
    var showStateSites = false;   // statewide: the busiest-sites table opens on click; county: always shown
    /* "Whose unreliable voters are showing up?": a back-to-back pyramid of turnout by voting history, one party on each side.
       Rows (bottom to top): voted in all 3 of the last three November elections, 2 of 3, 1 of 3, 0 of 3, and new voters (not
       registered, or not old enough, for all three). Bars: the share of each party's registered voters in the row who have voted
       so far, in 2026 (darkest) and each past year turned on (lighter the further back), at the same point in early voting.
       Extra voters: how many more (or fewer) of the row have voted than if it had turned out at that year's rate.
       2026 counts are tv / tr in data.json (statewide and by county); past years are tiers<year>.json, loaded when needed. */
    var TIER_LAB = ['All 3 of 3', '2 of 3', '1 of 3', '0 of 3', 'New voters'], TIER_SHORT = ['All 3', '2 of 3', '1 of 3', '0 of 3', 'New'];
    var TIER_P = [['Democrats', 'Dems', '#2E6DB4'], ['Republicans', 'Reps', '#B83A32'], ['Unaffiliated', 'Unaff.', '#8C8577']];
    var TIER_YRS = ['2024', '2022', '2020', '2018'], tierOn = { '2024': false, '2022': true, '2020': false, '2018': false }, tierL = 0, tierR = 1;
    var TIERS_PAST = {}, TIER_MINR = 100, tierMode = 'rate';   // 'rate': turnout within each group; 'share': each group's share of the party's votes so far   // a cell needs this many registered voters to show a rate
    function tierMix(hex, t) { var c = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); }); return 'rgb(' + c.map(function (v) { return Math.round(v + (255 - v) * t); }).join(',') + ')'; }
    function tierShade(p, y) { return tierMix(TIER_P[p][2], { '2026': 0, '2024': 0.28, '2022': 0.46, '2020': 0.6, '2018': 0.7 }[y]); }   // the further back, the lighter
    function tierK() { var k = kLatest();   // always all votes so far (2026's groups aren't counted day by day)
       return k === null ? null : Math.max(0, Math.min(19, k)); }
    function tierDist() { return /^(cd|hd|sd)$/.test(state.geo); }
    function tierPlace(r) { return state.geo === 'state' ? 'Statewide' : placeLabel(state.geo, r.name); }
    function tierSets(r) {   // {year: {v: 15 voters so far, r: 15 registered}} for 2026 and each past year turned on and loaded
      var out = {}, k = tierK();
      if (r.tv && r.tr) out['2026'] = { v: r.tv, r: r.tr };
      TIER_YRS.forEach(function (y) {
        var J = TIERS_PAST[y], P = J && (tierDist() ? J.districts && J.districts[state.geo] && J.districts[state.geo][r.name] : J.places && J.places[state.geo === 'state' ? 'North Carolina' : r.name]);
        if (tierOn[y] && P && k !== null && P.v[k]) out[y] = { v: P.v[k], r: P.r };
      });
      return out;
    }
    function tierRate(S, p, t) { var i = p * 5 + t; return S && S.r[i] >= TIER_MINR ? S.v[i] / S.r[i] * 100 : null; }
    function tierShare(S, p, t) { if (!S) return null; var tot = 0; for (var q = 0; q < 5; q++) tot += S.v[p * 5 + q]; return tot >= 50 ? S.v[p * 5 + t] / tot * 100 : null; }
    function tierVal(S, p, t) { return tierMode === 'share' ? tierShare(S, p, t) : tierRate(S, p, t); }
    function tierPts(n) { return n === null || isNaN(n) ? '\u2014' : (Math.abs(n) < 0.05 ? '' : n > 0 ? '+' : '\u2212') + Math.abs(n).toFixed(1); }
    function tierExtra(S, p, t, B) {   // extra voters in 2026 vs. year B's pace: (rate now - rate then) x registered now
      var a = tierRate(S['2026'], p, t), b = tierRate(S[B], p, t); return a === null || b === null ? null : (a - b) / 100 * S['2026'].r[p * 5 + t];
    }
    function tierK3(n) {   // +18K, +2.1K, +340
      if (n === null || isNaN(n)) return '—';
      var a = Math.abs(n), s = n >= 0.5 ? '+' : n <= -0.5 ? '−' : '';
      return s + (a >= 9950 ? Math.round(a / 1000) + 'K' : a >= 995 ? (a / 1000).toFixed(1) + 'K' : a >= 100 ? String(Math.round(a / 10) * 10) : String(Math.round(a)));   // exact under 100, for small counties
    }
    function tierPct(v) { return v === null ? '—' : v.toFixed(v < 9.95 ? 1 : 0) + '%'; }
    /* The chart as drawing steps, so the page (SVG) and the image downloads (canvas) share one layout.
       W: width in px; f: text scale (1 on the page). Returns {ops, H}. */
    function tierLayout(r, W, f, bs) {   // bs: bar thickness multiplier (the tall image uses thicker bars to fill its height)
      bs = bs || 1;
      var S = tierSets(r), yrs = ['2026'].concat(TIER_YRS.filter(function (y) { return S[y]; })), past = yrs.slice(1), ops = [], P2 = [tierL, tierR];
      var narrow = W < 620, fs = function (n) { return n * f; };
      var colW = narrow ? Math.min(78 * f, (W - 52 * f) / Math.max(1, past.length)) : 86 * f, labC = narrow ? 52 * f : 56 * f;
      var dW = narrow || !past.length ? 0 : Math.max(labC + past.length * colW, 150 * f) + 10 * f, PW = W - dW;
      var barH = (narrow ? 7 : 9) * f * bs, gap = 2 * f * Math.min(bs, 2), gridH = past.length ? 2 * 15 * f + 6 * f : 0;
      var rowPad = narrow ? gridH + 16 * f : (22 + (bs - 1) * 14) * f, rowH = yrs.length * (barH + gap) + rowPad, head = (past.length ? 54 : 26) * f;
      var labW = (narrow ? 50 : 88) * f, cx = PW / 2, side = PW / 2 - labW / 2 - (narrow ? 34 : 50) * f, mx = 0;
      var SH = tierMode === 'share';
      yrs.forEach(function (y) { P2.forEach(function (p) { for (var t = 0; t < 5; t++) { var v = tierVal(S[y], p, t); if (v !== null) mx = Math.max(mx, v); } }); });
      mx = (mx || 1) * 1.04;
      var T = function (x, y, s, size, wt, fill, anc) { ops.push(['t', x, y, s, fs(size), wt, fill, anc || 'start']); };
      var gx0 = narrow ? (W - labC - past.length * colW) / 2 : PW + 10 * f;   // the extra-voters grid: label column, then one column per year
      var colX = function (j) { return gx0 + labC + j * colW; };
      var grid = function (y, rows, bold) {   // rows: [[label, color, [value per year], weight]]
        if (narrow) for (var j = 1; j <= past.length; j++) ops.push(['l', colX(j), y - 11 * f, colX(j), y + (rows.length - 1) * 15 * f + 4 * f, '#E2DACB', 1]);
        rows.forEach(function (rw, n) {
          var yy = y + n * 15 * f;
          T(gx0, yy, rw[0], 11.5, 700, rw[1]);
          rw[2].forEach(function (v, j) { T(colX(j + 1) - 7 * f, yy, v, 11.5, rw[3] || 600, rw[1], 'end'); });
        });
      };
      // headings
      T(cx - labW / 2 - 4 * f, 13 * f, '← ' + TIER_P[tierL][0], 12.5, 700, TIER_P[tierL][2], 'end');
      T(cx + labW / 2 + 4 * f, 13 * f, TIER_P[tierR][0] + ' →', 12.5, 700, TIER_P[tierR][2]);
      if (past.length) {
        var hy = narrow ? 32 * f : 13 * f;
        if (!narrow) { T(gx0, hy - 2 * f, SH ? 'CHANGE IN SHARE' : 'EXTRA VOTERS', 10, 700, '#6b6b6b'); T(gx0, hy + 10 * f, SH ? 'points vs. each year' : 'vs. each year\u2019s pace', 10, 400, '#6b6b6b'); }
        past.forEach(function (y, j) { T(colX(j + 1) - 7 * f, narrow ? hy : 40 * f, 'vs \u2019' + y.slice(2), 10.5, 700, '#6b6b6b', 'end'); });
      }
      var gridTop = head - 8 * f, gridBot;
      for (var t = 0; t < 5; t++) {
        var y0 = head + (4 - t) * rowH, block = yrs.length * (barH + gap) - gap, mid = y0 + block / 2;
        if (t < 4) ops.push(['l', 0, y0 + rowH - (narrow ? 7 : 11) * f, W, y0 + rowH - (narrow ? 7 : 11) * f, '#ECE5D7', 1]);
        T(cx, mid + 4 * f, narrow ? TIER_SHORT[t] : TIER_LAB[t], narrow ? 11 : 12, 600, '#3a3a3a', 'middle');
        yrs.forEach(function (y, k) {
          var by = y0 + k * (barH + gap);
          P2.forEach(function (p, side_) {
            var dir = side_ ? 1 : -1, v = tierVal(S[y], p, t), x0 = cx + dir * labW / 2, w = v === null ? 0 : Math.max(v / mx * side, 1.5);
            if (w) ops.push(['r', dir < 0 ? x0 - w : x0, by, w, barH, tierShade(p, y)]);
            if (k === 0 || !narrow) T(dir < 0 ? x0 - w - 5 * f : x0 + w + 5 * f, by + barH - 1 * f, (k ? '’' + y.slice(2) + ' ' : '') + tierPct(v), k ? 9.5 : 11.5, k ? 500 : 700, k ? '#8a8a8a' : TIER_P[p][2], dir < 0 ? 'end' : 'start');
          });
        });
        if (past.length) grid(narrow ? y0 + block + 14 * f : mid - 3 * f, P2.map(function (p) { return [TIER_P[p][1], TIER_P[p][2], past.map(function (y) { if (SH) { var a = tierShare(S['2026'], p, t), b = tierShare(S[y], p, t); return tierPts(a === null || b === null ? null : a - b); } return tierK3(tierExtra(S, p, t, y)); })]; }));
      }
      var by2 = head + 5 * rowH;
      gridBot = by2;
      if (past.length && !SH) {   // all groups together, with the net (in votes, so not in the share view, where every party adds up to 100%)
        var ty = by2 + 12 * f, tot = function (p, y) { var s = 0, any = false; for (var q = 0; q < 5; q++) { var e = tierExtra(S, p, q, y); if (e !== null) { s += e; any = true; } } return any ? s : null; };
        T(gx0, ty, 'ALL GROUPS', 10, 700, '#6b6b6b');
        grid(ty + 16 * f, P2.map(function (p) { return [TIER_P[p][1], TIER_P[p][2], past.map(function (y) { return tierK3(tot(p, y)); })]; }));
        var ny = ty + 16 * f + 30 * f;
        ops.push(['l', gx0, ny - 11 * f, gx0 + labC + past.length * colW, ny - 11 * f, '#B9B09E', 1]);
        T(gx0, ny, 'Net', 11.5, 800, '#1a1a1a');
        if (narrow) for (var jn = 1; jn <= past.length; jn++) ops.push(['l', colX(jn), ny - 11 * f, colX(jn), ny + 4 * f, '#E2DACB', 1]);
        past.forEach(function (y, j) {
          var a = tot(tierL, y), b = tot(tierR, y), n = a === null || b === null ? null : a - b, wp = n === null || Math.abs(n) < 50 ? null : n > 0 ? tierL : tierR;
          T(colX(j + 1) - 7 * f, ny, n === null ? '—' : wp === null ? 'Even' : (narrow ? TIER_P[wp][1].charAt(0) : TIER_P[wp][1]) + ' +' + tierK3(Math.abs(n)).replace('+', ''), 11.5, 800, wp === null ? '#6b6b6b' : TIER_P[wp][2], 'end');
        });
        gridBot = ny + 6 * f;
        for (var j = 0; j <= past.length; j++) { var vx = colX(j) + (j ? 0 : -6 * f); if (j && !narrow) ops.push(['l', vx, gridTop, vx, gridBot, '#E2DACB', 1]); }   // the columns' dividers (phones draw them beside each grid)
      }
      // year key
      var ky = narrow ? gridBot + 14 * f : by2 + 12 * f, kx = 0;
      yrs.forEach(function (y) {
        P2.forEach(function (p, j) { ops.push(['r', kx + j * 11 * f, ky - 9 * f, 10 * f, 10 * f, tierShade(p, y)]); });
        T(kx + 26 * f, ky, y, 11.5, y === '2026' ? 700 : 500, '#3a3a3a'); kx += 66 * f; if (kx + 60 * f > (narrow ? W : PW)) { kx = 0; ky += 18 * f; }
      });
      return { ops: ops, H: Math.max(gridBot, ky + 8 * f) + 4 * f, past: past, S: S };
    }
    function tierSvg(L, W) {
      return '<svg viewBox="0 0 ' + W + ' ' + L.H + '" width="100%" role="img" aria-label="Turnout by voting history, ' + TIER_P[tierL][0] + ' and ' + TIER_P[tierR][0] + '" style="display:block;overflow:visible;font-family:Inter,sans-serif">' +
        L.ops.map(function (o) {
          if (o[0] === 'r') return '<rect x="' + o[1].toFixed(1) + '" y="' + o[2].toFixed(1) + '" width="' + o[3].toFixed(1) + '" height="' + o[4].toFixed(1) + '" fill="' + o[5] + '" rx="1"/>';
          if (o[0] === 'l') return '<line x1="' + o[1].toFixed(1) + '" y1="' + o[2].toFixed(1) + '" x2="' + o[3].toFixed(1) + '" y2="' + o[4].toFixed(1) + '" stroke="' + o[5] + '" stroke-width="' + o[6] + '"/>';
          return '<text x="' + o[1].toFixed(1) + '" y="' + o[2].toFixed(1) + '" font-size="' + o[4] + '" font-weight="' + o[5] + '" fill="' + o[6] + '" text-anchor="' + o[7] + '" style="font-variant-numeric:tabular-nums">' + esc(o[3]) + '</text>';
        }).join('') + '</svg>';
    }
    function tierCanvas(c, L, x0, y0, s) {   // draw the steps at (x0, y0), scaled by s
      L.ops.forEach(function (o) {
        if (o[0] === 'r') { c.fillStyle = o[5]; c.fillRect(x0 + o[1] * s, y0 + o[2] * s, o[3] * s, o[4] * s); }
        else if (o[0] === 'l') { c.strokeStyle = o[5]; c.lineWidth = o[6] * s; c.beginPath(); c.moveTo(x0 + o[1] * s, y0 + o[2] * s); c.lineTo(x0 + o[3] * s, y0 + o[4] * s); c.stroke(); }
        else { c.fillStyle = o[6]; c.font = o[5] + ' ' + (o[4] * s).toFixed(1) + 'px Inter, sans-serif'; c.textAlign = o[7] === 'middle' ? 'center' : o[7] === 'end' ? 'right' : 'left'; c.textBaseline = 'alphabetic'; c.fillText(o[3], x0 + o[1] * s, y0 + o[2] * s); }
      });
      c.textAlign = 'left';
    }
    function tierNote() {
      var G = 'Groups: how many of the three November general elections before each year a voter cast a ballot in, in North Carolina; new voters weren’t registered, or weren’t old enough, for all three. ';
      var DN = tierDist() ? 'For past years, voters are placed in today\u2019s districts by the precinct they lived in at the time. ' : '';
      return DN + (tierMode === 'share'
        ? 'Share of votes: of each party’s early and mail votes so far, the share from each group, compared with the same point in each year. ' + G + 'Change in share: 2026’s share minus that year’s, in percentage points. Party is registration, not vote choice.'
        : 'Turnout rate: of each party’s registered voters in each group, the share who have voted so far, compared with the same point in each year. ' + G +
          'Extra voters: how many more (or fewer) of each group have voted than if it had turned out at that year’s rate. Net: the left side’s extra voters minus the right side’s. Party is registration, not vote choice.');
    }
    /* 2022 Election Day voters in the early vote: of each party's early and mail votes so far, the share cast by people who
       voted on Election Day in November 2022; the marker is the same share at the same point in 2022 (from 2018 Election Day
       voters, docs/edbase2022.json; districts are today's lines, placed by precinct). "Still to vote": 2022 Election
       Day voters, still registered, who haven't voted yet. */
    var ED_BASE = null, edLoading = false;
    function edBench(r, i) {
      if (!ED_BASE) return null;
      var P = tierDist() ? ED_BASE.districts && ED_BASE.districts[state.geo] && ED_BASE.districts[state.geo][r.name] : ED_BASE.places && ED_BASE.places[state.geo === 'state' ? 'North Carolina' : r.name], k = tierK();
      if (!P || k === null || !P.v[k] || P.v[k][i] < 100) return null;
      return P.e[k][i] / P.v[k][i] * 100;
    }
    function tierCannib(r) {
      if (!r.e22v || !r.e22r || !r.pty || HAS_ED || FINAL) return '';
      var rows = TIER_P.map(function (p, i) {
        var v = r.pty[i], n = r.e22v[i];
        return { p: p, pc: v >= 100 ? n / v * 100 : null, b: edBench(r, i), left: Math.max(0, r.e22r[i] - n) };
      });
      var mx = 0; rows.forEach(function (o) { mx = Math.max(mx, o.pc || 0, o.b || 0); });
      var top = Math.max(20, Math.ceil(mx * 1.2 / 5) * 5), hasB = rows.some(function (o) { return o.b !== null; });
      return '<div class="tt-edw"><p class="tt-pq tt-pq2">How much of the early vote comes from 2022 Election Day voters?</p>' +
        '<p class="tt-pqs">Of each party’s early and mail votes so far, the share cast by people who voted on Election Day in November 2022' +
        (hasB ? '. The dark tick marks the same share at this point in 2022, from 2018 Election Day voters.' : '.') + '</p>' +
        '<div class="tt-left">' + rows.map(function (o) {
          var w = function (x) { return (Math.min(x, top) / top * 100).toFixed(1); };
          return '<div class="tt-lr"><span class="tt-ll"><i style="background:' + o.p[2] + '"></i>' + o.p[0] + '</span>' +
            '<span class="tt-lb tt-edb"><i style="width:' + w(o.pc || 0) + '%;background:' + o.p[2] + '"></i>' +
            (o.b !== null ? '<s style="left:' + w(o.b) + '%" title="2022: ' + o.b.toFixed(1) + '%"></s>' : '') + '</span>' +
            '<span class="tt-lv">' + (o.pc === null ? '\u2014' : '<b>' + o.pc.toFixed(1) + '%</b> of their votes') +
            (o.b !== null ? '<em>2022 at this point: ' + o.b.toFixed(1) + '%</em>' : '') +
            '<em>' + fmt(o.left) + ' still to vote</em></span></div>';
        }).join('') + '</div>' +
        '<p class="tt-pfoot">Bars run from 0 to ' + top + '%. Some of these votes would otherwise have come on Election Day, so they don\u2019t all add to turnout. ' +
        'Still to vote: people who voted on Election Day in 2022, are still registered and haven\u2019t voted yet. Election Day voters: in person, curbside, provisional or transfer ballots, from the State Board\u2019s voter history' +
        (tierDist() ? '. For districts, 2022 voters are placed in today\u2019s districts by the precinct they lived in then' : '') + '. Party is registration, not vote choice.</p></div>';
    }
    function tierBlock(r) {
      if (!r || !r.tv || !r.tr) return '';
      var seg3 = function (attr, cur) { return seg(TIER_P.map(function (p, i) { return bt(attr, String(i), p[0], cur === i); }).join(''), attr === 'data-tl' ? 'Left side' : 'Right side'); };
      var place = tierPlace(r);
      return '<div class="tt-sec tt-nodl tt-tiers"><div class="tt-sech">Whose unreliable voters are showing up?<span>' + esc(place) + '</span></div>' +
        '<p class="tt-pqs">Turnout by how many of the last three November elections voters took part in, one party on each side' + (dayI !== null ? '. This chart always counts all votes so far' : '') + '.</p>' +
        crow('Left', seg3('data-tl', tierL)) + crow('Right', seg3('data-tr', tierR)) +
        crow('Years', seg('<button type="button" aria-pressed="true" disabled class="on">2026</button>' + TIER_YRS.map(function (y) { return bt('data-ty', y, y, tierOn[y]); }).join(''), 'Years')) +
        crow('Show', seg(bt('data-tm', 'rate', 'Turnout rate', tierMode === 'rate') + bt('data-tm', 'share', 'Share of votes', tierMode === 'share'), 'Show')) +
        '<div class="tt-tierc"></div><p class="tt-snote tt-tiernote">' + esc(tierNote()) + '</p>' + tierCannib(r) +
        '<div class="tt-mapdls"><span class="tt-mapdll">Download</span><div class="tt-dlg"><span class="tt-dlk">Chart image</span><button type="button" class="tt-shdl tt-tierpng" data-fmt="wide">Wide <small>X, Facebook</small></button>' +
        '<button type="button" class="tt-shdl tt-tierpng" data-fmt="tall">Tall <small>Instagram</small></button></div>' +
        '<div class="tt-dlg"><span class="tt-dlk">Chart data</span><button type="button" class="tt-shdl tt-tiercsv">CSV</button></div></div></div>';
    }
    var tierLoading = {};
    function wireTier(r) {
      var box = view.querySelector('.tt-tiers'); if (!box) return;
      var chart = box.querySelector('.tt-tierc');
      function draw() { var W = Math.max(280, chart.clientWidth); chart.innerHTML = tierSvg(tierLayout(r, W, 1), W); }
      function need() {   // load the past years turned on
        TIER_YRS.forEach(function (y) {
          if (!tierOn[y] || TIERS_PAST[y] || tierLoading[y] || !DATA_URL) return;
          tierLoading[y] = true;
          fetch(DATA_URL.replace(/data\.json(\?.*)?$/, 'tiers' + y + '.json')).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
            .then(function (j) { TIERS_PAST[y] = j; tierLoading[y] = false; if (document.body.contains(chart)) draw(); }, function () { tierLoading[y] = false; });
        });
      }
      draw(); need();
      if (!ED_BASE && !edLoading && DATA_URL && box.querySelector('.tt-edw')) {   // the 2022 comparison for the Election Day voters chart
        edLoading = true;
        fetch(DATA_URL.replace(/data\.json(\?.*)?$/, 'edbase2022.json')).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
          .then(function (j) { ED_BASE = j; edLoading = false; var w = box.querySelector('.tt-edw'); if (w && document.body.contains(w)) w.outerHTML = tierCannib(r); }, function () { edLoading = false; });
      }
      if (!box.__rs) { box.__rs = true; var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (document.body.contains(chart)) draw(); }, 150); }); }
      Array.prototype.forEach.call(box.querySelectorAll('[data-tl],[data-tr]'), function (b) { b.addEventListener('click', function () {
        var left = b.hasAttribute('data-tl'), v = +b.getAttribute(left ? 'data-tl' : 'data-tr');
        if (left) { if (v === tierR) tierR = tierL; tierL = v; } else { if (v === tierL) tierL = tierR; tierR = v; }
        Array.prototype.forEach.call(box.querySelectorAll('[data-tl]'), function (o) { var on = +o.getAttribute('data-tl') === tierL; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); });
        Array.prototype.forEach.call(box.querySelectorAll('[data-tr]'), function (o) { var on = +o.getAttribute('data-tr') === tierR; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); });
        draw();
      }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-tm]'), function (b) { b.addEventListener('click', function () {
        tierMode = b.getAttribute('data-tm');
        Array.prototype.forEach.call(box.querySelectorAll('[data-tm]'), function (o) { var on = o.getAttribute('data-tm') === tierMode; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); });
        box.querySelector('.tt-tiernote').textContent = tierNote(); draw();
      }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-ty]'), function (b) { b.addEventListener('click', function () {
        var y = b.getAttribute('data-ty'); tierOn[y] = !tierOn[y]; b.classList.toggle('on', tierOn[y]); b.setAttribute('aria-pressed', tierOn[y]); draw(); need();
      }); });
      Array.prototype.forEach.call(box.querySelectorAll('.tt-tierpng'), function (b) { b.addEventListener('click', function () { tierPng(r, b.getAttribute('data-fmt')); }); });
      box.querySelector('.tt-tiercsv').addEventListener('click', function () { tierCsv(r); });
    }
    function tierFile(r, ext, fmt) {
      return 'carolina-forward-voting-history-' + (tierMode === 'share' ? 'share-' : '') + tierPlace(r).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + D.days[fullDay()] + (fmt ? '-' + fmt : '') + '.' + ext;
    }
    function tierCsv(r) {   // every party and group, for 2026 and each past year turned on: voters so far, registered, rate, extra voters
      var S = tierSets(r), yrs = ['2026'].concat(TIER_YRS.filter(function (y) { return S[y]; })), rows = [['Party', 'Voting history', 'Year', 'Voted so far', 'Registered', 'Turnout rate (%)', 'Share of the party’s votes (%)', 'Extra voters in 2026 vs. this year’s pace']];
      TIER_P.forEach(function (p, pi) { for (var t = 0; t < 5; t++) yrs.forEach(function (y) {
        var X = S[y], i = pi * 5 + t, rt = tierRate(X, pi, t), ex = y === '2026' ? null : tierExtra(S, pi, t, y);
        var sh = tierShare(X, pi, t); rows.push([p[0], TIER_LAB[t], y, X.v[i], X.r[i], rt === null ? '' : rt.toFixed(2), sh === null ? '' : sh.toFixed(2), ex === null ? '' : Math.round(ex)]);
      }); });
      var txt = rows.map(function (rw) { return rw.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' })); a.download = tierFile(r, 'csv');
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
    }
    function tierPng(r, fmt) {   // 1200 x 675 (X, Facebook) or 1080 x 1350 (Instagram): title, chart, note and the Carolina Forward name
      shFonts().then(function () { shLogo(function () {
        var LAND = fmt === 'wide', W = LAND ? 1200 : 1080, Hh = LAND ? 675 : 1350, X = LAND ? 48 : 56, MW = W - 2 * X, FT = LAND ? 86 : 124;
        var cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; var c = cv.getContext('2d');
        c.fillStyle = '#F4EFE5'; c.fillRect(0, 0, W, Hh);
        var HY = LAND ? 46 : 70; c.fillStyle = '#A50000'; c.fillRect(X, HY, 36, 3); c.font = '800 ' + (LAND ? 15 : 17) + 'px Inter, sans-serif'; c.textBaseline = 'middle';
        c.fillText('NC TURNOUT TRACKER · ' + tierPlace(r).toUpperCase(), X + 48, HY + 1.5);
        c.textBaseline = 'alphabetic'; c.fillStyle = '#253551'; c.font = '700 ' + (LAND ? 36 : 50) + 'px "Zilla Slab", Georgia, serif';
        var y = shWrap(c, 'Whose unreliable voters are showing up?', X, LAND ? 96 : 144, MW, LAND ? 42 : 56);
        c.fillStyle = '#3a3a3a'; c.font = '400 ' + (LAND ? 16 : 21) + 'px Inter, sans-serif';
        y = shWrap(c, tierMode === 'share' ? 'Where each party’s votes so far are coming from: the share from voters who took part in 3, 2, 1 or 0 of the last three November elections, and new voters.' : 'Share of each party’s registered voters who have voted so far, by how many of the last three November elections they voted in.', X, y + 2, MW, LAND ? 22 : 29);
        // the chart: laid out at a width that keeps text readable, then scaled to fit what's left above the footer
        var room = Hh - FT - (LAND ? 18 : 36) - (y + 6) - 16, f = LAND ? 1.05 : 1.45, lw = MW / f, L = tierLayout(r, lw, 1), bs = 1;
        while (bs < 2) { var L2 = tierLayout(r, lw, 1, bs + 0.25); if (L2.H * f > room) break; bs += 0.25; L = L2; }   // thicker bars until the chart fills the space
        var s = Math.min(f, room / L.H), cw = lw * s;
        c.save(); c.fillStyle = '#fff'; c.fillRect(X - 12, y + 2, MW + 24, L.H * s + 16); c.restore();
        tierCanvas(c, L, X + (MW - cw) / 2, y + 12, s);
        c.fillStyle = '#D8D2C4'; c.fillRect(X, Hh - FT, MW, 2);
        var LS = LAND ? 44 : 52, fy = Hh - FT + (LAND ? 18 : 22);
        if (SH_LOGO && SH_LOGO.naturalWidth) c.drawImage(SH_LOGO, X, fy, LS, LS);
        c.fillStyle = '#253551'; c.font = '700 ' + (LAND ? 22 : 26) + 'px "Zilla Slab", Georgia, serif'; c.fillText('Carolina Forward', X + LS + 14, fy + LS * 0.48);
        c.fillStyle = '#6b6b6b'; c.font = '600 ' + (LAND ? 14 : 16) + 'px Inter, sans-serif'; c.fillText(CF_URL, X + LS + 14, fy + LS * 0.92);
        c.font = '400 ' + (LAND ? 13 : 15) + 'px Inter, sans-serif';
        var uy = shWrap(c, srcLine((L.past.length ? (tierMode === 'share' ? 'Change in share: points vs. each year. ' : 'Extra voters: more (or fewer) than at each year’s rate. ') : '') + 'Party is registration, not vote choice.'), X + (LAND ? 290 : 330), fy + (LAND ? 10 : 14), MW - (LAND ? 290 : 330), LAND ? 17 : 20);
        c.fillStyle = '#253551'; c.font = '600 ' + (LAND ? 13 : 15) + 'px Inter, sans-serif'; c.fillText(URL_LINE, X + (LAND ? 290 : 330), uy + 2);
        shSave(cv, tierFile(r, 'png', fmt));
      }); });
    }
    function sitesBlock(k, r, sites) {
      var li = lastDay();
      if (li < 0) return '';
      var rows, title, meta, dist = k !== 'county' && k !== 'state';
      if (dist) {   // a district: the sites its voters used (in any county), with only their votes
        var PD = pieceData(); if (!PD) return '';
        rows = [];
        Object.keys(PD.sites || {}).forEach(function (c) { PD.sites[c].forEach(function (x) { rows.push({ c: c, x: x }); }); });
        title = 'Early voting sites used by ' + LONG[k](r.name) + ' voters';
        meta = fmt(rows.length) + (rows.length === 1 ? ' site' : ' sites');
      } else if (k === 'state') {
        rows = [];
        Object.keys(D.sites || {}).forEach(function (c) { D.sites[c].forEach(function (x) { rows.push({ c: c, x: x }); }); });
        title = 'Busiest early voting sites' + (thruOn() ? ' through ' + dayShort(dayI) : dayI !== null ? ' on ' + dayShort(dayI) : ''); meta = 'Statewide, top 10';
      } else {
        rows = sites.map(function (x) { return { c: null, x: x }; });
        title = 'Early voting sites'; meta = fmt(rows.length) + (rows.length === 1 ? ' site' : ' sites') + ' in ' + r.name + ' County';
      }
      if (!rows.length) return '';
      var DY = dayI !== null, TH = thruOn();
      rows.forEach(function (o) {
        o.tot = TH ? o.x[1].slice(0, dayI + 1).reduce(function (a, b) { return a + b; }, 0) : DY ? o.x[1][dayI] || 0 : o.x[1].reduce(function (a, b) { return a + b; }, 0);
        var dp = DY && o.x[6] ? (TH ? o.x[6].slice(0, dayI + 1).reduce(function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]]; }, [0, 0, 0, 0]) : o.x[6][dayI]) : null, dn = dp ? dp[0] + dp[1] + dp[2] + dp[3] : 0;
        o.last = DY ? (dn ? (dp[0] - dp[1]) / dn * 100 : null) : o.x[1][li] || 0;
      });
      rows.sort(function (a, b) { return b.tot - a.tot || a.x[0].localeCompare(b.x[0]); });
      if (dist) rows = rows.filter(function (o) { return o.tot > 0; });
      if (k !== 'state') rows.sort(bySort(siteSort, function (o, key) { return key === 'name' ? o.x[0] : key === 'last' ? (o.last === null ? -1e9 : o.last) : key === 'peak' ? Math.max.apply(null, o.x[1]) : o.tot; }));
      var LIM = k === 'state' ? 10 : 8, shown = csvAll || (k !== 'state' && allSites) ? rows : rows.slice(0, LIM);
      if (!rows.length) return '';
      var max = 0; shown.forEach(function (o) { o.x[1].forEach(function (v) { if (v > max) max = v; }); });
      var sub = dist || k === 'state' ? '' : '';
      var hid = k === 'state' && (dayI === null ? !showStateSites : daySitesHidden);   // statewide list: folded until asked for; with a day picked, open until hidden
      if (hid) return '<div class="tt-sec tt-nodl tt-sitesec"><div class="tt-sech">' + title + '<span>' + meta + '</span></div>' +
        '<button type="button" class="tt-more tt-showsites">Show the 10 busiest sites ' + (dayI === null ? 'statewide' : (TH ? 'through ' : 'on ') + esc(dayShort(dayI))) + '</button></div>';
      var t = '<div class="tt-sec tt-sitesec" data-csv="sites"><div class="tt-sech">' + title + '<span>' + meta + '</span></div>' + (k === 'state' ? '<table class="tt-sites"><thead><tr><th>Site</th><th>' + (TH ? 'Through ' + apDate(dayIso()) : DY ? 'Votes on ' + apDate(dayIso()) : 'Early votes') + '</th><th class="tt-hide-s">' + (DY ? 'Party split' : apDate(EV_DAYS[li])) + '</th><th>By day</th></tr></thead><tbody>'
        : '<table class="tt-sites tt-srtd"><thead><tr>' + sortTh('data-ss', 'name', 'Site', siteSort) + sortTh('data-ss', 'tot', TH ? 'Through ' + apDate(dayIso()) : DY ? 'Votes on ' + apDate(dayIso()) : 'Early votes', siteSort) + sortTh('data-ss', 'last', DY ? 'Party split' : apDate(EV_DAYS[li]), siteSort, 'tt-hide-s') + sortTh('data-ss', 'peak', 'By day', siteSort) + '</tr></thead><tbody>');
      shown.forEach(function (o) {
        var on = !o.c && o.x[0] === site;
        t += '<tr class="go' + (on ? ' on' : '') + '" tabindex="0" data-s="' + esc(o.x[0]) + '"' + (o.c ? ' data-c="' + esc(o.c) + '"' : '') + '><td><span class="tt-sn">' + esc(o.x[0]) + '</span>' + (o.c ? '<span class="tt-sc">' + esc(o.c) + ' County</span>' : '') + '</td>' +
          '<td><b>' + fmt(o.tot) + '</b></td><td class="tt-hide-s">' + (DY ? (o.last === null ? '\u2014' : '<b style="color:' + (o.last > 0.5 ? 'var(--pd)' : o.last < -0.5 ? 'var(--pr)' : 'var(--ink)') + '">' + dr(o.last, 0) + '</b>') : fmt(o.last)) + '</td><td>' + spark(o.x[1], max, DY ? dayI : -1) + '</td></tr>';
      });
      t += '</tbody></table>' + sub;
      if (k === 'state') t += '<button type="button" class="tt-more tt-showsites">Hide sites</button>';
      if (k !== 'state' && rows.length > LIM) t += '<button type="button" class="tt-more tt-moresites">' + (allSites ? 'Show fewer' : 'Show all ' + rows.length + ' sites') + '</button>';
      if (DY) t += '<p class="tt-snote">' + (TH ? 'Early in-person votes cast through ' + esc(dayShort(dayI)) : 'Early in-person votes cast on ' + esc(dayShort(dayI)) + ' (highlighted in the By day bars)') + '; party split is Democratic minus Republican share of ' + (TH ? 'those votes' : 'that day\u2019s votes') + ' at the site, by party registration.</p>';
      t += '<p class="tt-snote">' + (dist ? 'Votes from ' + esc(LONG[k](r.name)) + ' voters only, wherever they voted. Select a site to open its county. ' : k === 'state' ? 'Select a site to see its county. ' : 'Select a site to see its days in the chart above and its party, age and race breakdown in \u201cWho has voted,\u201d below. ') +
        'Early in-person votes only, counted where they were cast. Mail ballots aren\'t tied to a site. Counts trail by about a day, so they don\'t show today\'s lines.</p></div>';
      return t;
    }

    var AGE = [['18–25', 'a1'], ['26–40', 'a2'], ['41–65', 'a3'], ['66 and older', 'a4']];   // the State Board's age groups
    /* Turnout by precinct (published from Election Day on). Precincts under D.precinct_min votes are combined. */
    var allPct = false;
    /* Sortable columns: click a header to sort by it; click again to flip. Sites and precincts sort all rows before the list is
       cut to the top few, so "Show all" isn't needed to see, say, the smallest site. */
    var siteSort = { k: 'tot', d: -1 }, pctSort = { k: 'votes', d: -1 };
    // Small tables that always show every row (ballots not accepted, the map card's race table, the race x age table) sort in place.
    function cellNum(td) {
      var t = (td.querySelector('b') || td).textContent.trim();
      if (!t || t === '\u2014' || t === '-') return null;
      var m = /^([DR])\+(\d+(?:\.\d+)?)/.exec(t); if (m) return (m[1] === 'D' ? 1 : -1) * parseFloat(m[2]);
      if (/^even$/i.test(t)) return 0;
      var n = parseFloat(t.replace(/\u2212/g, '-').replace(/[^0-9.\-]/g, '')); return isNaN(n) ? t.toLowerCase() : n;
    }
    function dsort(root) {
      Array.prototype.forEach.call(root.querySelectorAll('table.tt-dsort'), function (tb) {
        if (tb.__s) return; tb.__s = 1;
        Array.prototype.forEach.call(tb.tHead.rows[0].cells, function (th, ci) {
          if (!th.textContent.trim()) return;
          th.classList.add('tt-dth'); th.tabIndex = 0; th.setAttribute('role', 'button');
          function go() {
            var d = th.classList.contains('desc') ? 1 : -1;   // first click: largest first (A to Z for the first column)
            if (ci === 0 && !th.classList.contains('asc') && !th.classList.contains('desc')) d = 1;
            Array.prototype.forEach.call(tb.tHead.rows[0].cells, function (o) { o.classList.remove('asc', 'desc'); });
            th.classList.add(d > 0 ? 'asc' : 'desc');
            var body = tb.tBodies[0], rows = Array.prototype.slice.call(body.rows);
            rows.sort(function (a, b) {
              var x = ci === 0 ? a.cells[0].textContent.trim().toLowerCase() : cellNum(a.cells[ci]), y = ci === 0 ? b.cells[0].textContent.trim().toLowerCase() : cellNum(b.cells[ci]);
              if (x === null) return 1; if (y === null) return -1;
              return (typeof x === 'string' || typeof y === 'string' ? String(x).localeCompare(String(y)) : x - y) * d;
            });
            rows.forEach(function (rw) { body.appendChild(rw); });
          }
          th.addEventListener('click', go); th.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
        });
      });
    }
    function sortTh(attr, key, label, st, cls) {
      var on = st.k === key;
      return '<th' + (cls ? ' class="' + cls + (on ? ' on' : '') + '"' : on ? ' class="on"' : '') + (on ? ' aria-sort="' + (st.d > 0 ? 'ascending' : 'descending') + '"' : '') + '><button type="button" class="tt-sbtn" ' + attr + '="' + key + '">' + label + (on ? (st.d > 0 ? ' \u25B2' : ' \u25BC') : '') + '</button></th>';
    }
    function bySort(st, get) { return function (a, b) { var x = get(a, st.k), y = get(b, st.k); if (x === null) return 1; if (y === null) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * st.d; }; }
    function precinctBlock(r) {
      var k = state.geo, P = k === 'county' ? (D.precincts || {})[r.name] : ((D.dprecincts || {})[k] || {})[r.name];
      if (!P) return '';
      var rows = P.rows.slice(), LIM = 15;
      var hasReg = rows.some(function (x) { return x[4]; });
      rows.sort(bySort(pctSort, function (x, key) { return key === 'name' ? x[0] : key === 'ev' ? x[1] : key === 'ml' ? x[2] : key === 'ed' ? x[3] : key === 'turn' ? (x[4] ? (x[1] + x[2] + x[3]) / x[4] : null) : x[1] + x[2] + x[3]; }));
      var shown = allPct ? rows : rows.slice(0, LIM);
      var t = '<div class="tt-sec tt-nodayp"><div class="tt-sech">Turnout by precinct<span>' + fmt(rows.length + (P.small ? P.small[0] : 0)) + ' precincts in ' + esc(k === 'county' ? r.name + ' County' : r.name) + '</span></div>' +
        '<table class="tt-sites tt-srtd"><thead><tr>' + sortTh('data-ps', 'name', 'Precinct', pctSort) + sortTh('data-ps', 'votes', 'Votes', pctSort) + sortTh('data-ps', 'ev', 'Early', pctSort, 'tt-hide-s') + sortTh('data-ps', 'ml', 'Mail', pctSort, 'tt-hide-s') + sortTh('data-ps', 'ed', 'Election Day', pctSort) + (hasReg ? sortTh('data-ps', 'turn', 'Turnout', pctSort) : '') + '</tr></thead><tbody>';
      function row(name, ev, ml, ed, rg, cls) {
        return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + name + '</td><td><b>' + fmt(ev + ml + ed) + '</b></td><td class="tt-hide-s">' + fmt(ev) + '</td><td class="tt-hide-s">' + fmt(ml) + '</td><td>' + fmt(ed) + '</td>' +
          (hasReg ? '<td>' + (rg ? rate(ev + ml + ed, rg) : '') + '</td>' : '') + '</tr>';
      }
      shown.forEach(function (x) { t += row(esc(x[0]), x[1], x[2], x[3], x[4]); });
      if (P.small && (allPct || rows.length <= LIM)) t += row('<span class="tt-sn" style="color:var(--soft)">Small precincts (' + P.small[0] + '), combined</span>', P.small[1], P.small[2], P.small[3], P.small[4]);
      t += '</tbody></table>';
      if (rows.length > LIM) t += '<button type="button" class="tt-more tt-morepct">' + (allPct ? 'Show fewer' : 'Show all ' + rows.length + ' precincts') + '</button>';
      t += '<p class="tt-snote">To protect voter privacy, precincts with fewer than ' + (D.precinct_min || 10) + ' votes are combined. Votes are counted in the voter\'s home precinct, not where they voted early. ' + (k === 'county' ? '' : 'A precinct split by today\'s district lines is counted in the district where most of its voters are. ') +
        (FINAL ? 'Final count from the State Board\'s voter history.' : 'Election Day votes are the State Board\'s unofficial count; early and mail votes come from its absentee file.') + '</p></div>';
      return t;
    }

    /* Voter Propensity: what share of each party's voters so far are low-propensity voters (voted in 0 or 1 of the
       last three November elections), compared with the same point in an earlier year. */
    /* Scoreboard rows for Party and Age: each group's turnout rate, a change badge and the earlier year's rate.
       rows: [[label, code], rate now, rate then (or null)] */
    /* Percent or votes, for Who has voted, Rankings and the shareable crosstabs (one switch, shared by all three). */
    function numCtl() { return crow('Show', seg(bt('data-num', 'pct', 'Percentages', numMode === 'pct') + bt('data-num', 'votes', 'Votes', numMode === 'votes'), 'Show percentages or votes')); }
    function votesOn() { return numMode === 'votes'; }
    function sgnN(n) { return (n > 0 ? '+' : n < 0 ? '\u2212' : '') + fmt(Math.abs(n)); }
    function rateLede(what) { return votesOn() ? '<p class="tt-lede">Votes by ' + what + ', below' + (BASE && BASE[vs] ? ', compared with ' + (FINAL ? vs : HAS_ED ? 'early and mail voting in ' + vs : 'the same point in ' + vs) : '') + '. More people are registered than in past years, so counts tend to run higher than rates.</p>'
      : '<p class="tt-lede">Turnout by ' + what + ', below: the share of each ' + what + '\'s registered voters who have voted.</p>'; }
    function scoreRows(rows, isAge, wasText) {
      return '<div class="tt-score">' + rows.map(function (d) {
        var col = d[0][2] || 'var(--' + (isAge ? '' : 'p') + d[0][1] + ')', now = d[1], then = d[2], chip = '', was = '';
        var big = now === null || now > 100 ? '\u2014' : now.toFixed(1) + '%';
        if (votesOn() && d[3]) {   // votes: the count now, and the change in votes since the same point in the picked year
          var vn = d[3][0], vt = d[3][1];
          big = vn === null || vn === undefined ? '\u2014' : fmt(vn);
          if (vn !== null && vn !== undefined && vt !== null && vt !== undefined) {
            var dv = vn - vt;
            chip = '<span class="tt-chip ' + (dv === 0 ? 'ev' : dv > 0 ? 'up' : 'dn') + '">' + (dv === 0 ? 'Same' : (dv > 0 ? '\u25B2 ' : '\u25BC ') + fmt(Math.abs(dv))) + '</span>';
            was = '<span class="tt-swas">' + fmt(vt) + ' ' + wasText + '</span>';
          }
        } else if (now !== null && then !== null && now <= 100 && then <= 100) {   // a rate over 100% means the vote and registration files disagree for a tiny group
          var x = Math.round(now * 10) / 10 - Math.round(then * 10) / 10;
          chip = '<span class="tt-chip ' + (Math.abs(x) < 0.05 ? 'ev' : x > 0 ? 'up' : 'dn') + '">' + (Math.abs(x) < 0.05 ? 'Same' : (x > 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(x).toFixed(1) + ' pts') + '</span>';
          was = '<span class="tt-swas">' + then.toFixed(1) + '% ' + wasText + '</span>';
        }
        return '<div class="tt-srow"><div class="tt-scn"><i style="background:' + col + '"></i>' + d[0][0] + '</div><div class="tt-scbig">' + big + '</div><div class="tt-sv">' + chip + '</div>' + was + '</div>';
      }).join('') + '</div>';
    }
    /* Under the Party/Age bar: each group's share of the votes compared with the earlier year, as sentences. */
    function shareSentences(r, c, isAge, sumv) {
      if (!c || !c.p || r.site) return '';
      var vals = isAge ? r.age : r.pty, B = FINAL ? (isAge ? c.p.fa : c.p.fp) : (isAge ? c.p.a : c.p.p);
      if (!B) return '';
      var then = B.map(function (x) { return FINAL ? x : x[c.idx]; }), tsum = then.reduce(function (a2, b2) { return a2 + b2; }, 0);
      if (!tsum || !sumv) return '';
      var NOUN = isAge ? ['Voters 18\u201325', 'Voters 26\u201340', 'Voters 41\u201365', 'Voters 66 and older'] : ['Democrats', 'Republicans', 'Unaffiliated voters'];
      var COL = isAge ? AGE.map(function (g) { return 'var(--' + g[1] + ')'; }) : ['var(--pd)', 'var(--pr)', 'var(--pu)'];
      var of = FINAL ? 'of all votes' : HAS_ED ? 'of early and mail votes' : 'of votes so far';
      var when = FINAL ? 'in ' + vs : HAS_ED ? 'in ' + vs + '\u2019s early and mail voting' : 'at this point in ' + vs;
      var f = function (x, small) { return small ? x.toFixed(1) : String(Math.round(x)); };
      var t = '<div class="tt-shs"><p class="tt-shh">Compared with ' + (FINAL ? vs : HAS_ED ? 'early and mail voting in ' + vs : 'the same point in ' + vs) + '</p>';
      NOUN.forEach(function (n, i) {
        var a = vals[i] / sumv * 100, b = then[i] / tsum * 100, small = a < 10 || b < 10;
        var d = small ? +a.toFixed(1) - +b.toFixed(1) : Math.round(a) - Math.round(b);   // the difference of the numbers shown, so they add up
        var ds = small ? Math.abs(d).toFixed(1) : String(Math.abs(d));
        var chg = Math.abs(d) < 0.5 ? '<span class="tt-she">about the same</span> as' : '<span class="' + (d > 0 ? 'tt-shu' : 'tt-shd') + '">' + ds + (ds === '1' ? ' point ' : ' points ') + (d > 0 ? 'more' : 'less') + '</span> than';
        t += '<div class="tt-sh"><i style="background:' + COL[i] + '"></i><span>' + n + ' make up ' + f(a, small) + '% ' + of + ', ' + chg + ' ' + when + ' (' + f(b, small) + '%).</span></div>';
      });
      return t + '</div>';
    }
    /* First-time North Carolina registrants who have voted, and same-day registrants, compared with the same point earlier. */
    function newBlock(r) {
      var c = cmp(r), B = c && c.p && c.p.nv && c.p.nwr ? c : null, bv = B ? B.p.nv[B.idx] : null;
      var N = r.nwr + (r.nv[3] || 0), n = r.nv[0], where = state.geo === 'state' ? 'statewide' : 'in ' + esc(LONG[state.geo](r.name));
      var voted = HAS_ED ? 'have voted early or by mail' : 'have already voted', at = HAS_ED ? 'in ' + vs + '\u2019s early and mail voting' : 'at this point in ' + vs;
      function chip(now, then, pts) {
        if (then === null || then === undefined || now === null) return '';
        var d = pts ? Math.round((now - then) * 10) / 10 : (then ? Math.round((now / then - 1) * 100) : null);
        if (d === null) return '';
        var up = d > 0, txt = d === 0 ? 'Same' : (up ? '\u25B2 ' : '\u25BC ') + Math.abs(d) + (pts ? (Math.abs(d) === 1 ? ' pt' : ' pts') : '%');
        return '<span class="tt-chip ' + (d === 0 ? 'ev' : up ? 'up' : 'dn') + '">' + txt + '</span>';
      }
      function row(name, big, ch, was) {
        return '<div class="tt-srow"><div class="tt-scn">' + name + '</div><div class="tt-scbig">' + big + '</div><div class="tt-sv">' + ch + '</div>' + (was ? '<span class="tt-swas">' + was + '</span>' : '') + '</div>';
      }
      var ok = function (x) { return x !== null && x >= 10; };   // too few to compare below 10
      var share = N ? n / N * 100 : null, bshare = B && ok(bv[0]) ? bv[0] / B.p.nwr * 100 : null;
      var part = r.vc ? n / r.vc * 100 : null, bpart = B && ok(bv[0]) && B.p.c[B.idx] ? bv[0] / B.p.c[B.idx] * 100 : null;
      var t = '<p class="tt-pq">How many first-time North Carolina voters are turning out?</p>' +
        '<p class="tt-pqs">People who registered to vote in North Carolina for the first time this year. Voters who moved between counties or registered here before aren\u2019t counted.</p>' +
        '<div class="tt-prow"><div class="tt-ppn">First-time registrants who have voted</div><div><div class="tt-pbig">' + fmt(n) + '</div><div class="tt-pbs">' + where.charAt(0).toUpperCase() + where.slice(1) + (HAS_ED ? ' (early and mail votes)' : '') + ', out of ' + fmt(N) + ' people who registered in North Carolina for the first time this year</div></div>' +
        '<div class="tt-pver">' + (B && ok(bv[0]) ? chip(n, bv[0]) + '<span class="tt-pwas">' + fmt(bv[0]) + ' ' + at + '</span>' : B ? '<span class="tt-pwas">Too few to compare<br>with ' + vs + '</span>' : '') + '</div></div>' +
        '<div class="tt-score">' +
        row('Turnout so far among first-time registrants', share === null ? '\u2014' : share.toFixed(1) + '%', bshare === null ? '' : chip(share, bshare, true), bshare === null ? '' : bshare.toFixed(1) + '% ' + at) +
        row('First-time registrants\u2019 share of all voters so far', part === null ? '\u2014' : part.toFixed(1) + '%', bpart === null ? '' : chip(part, bpart, true), bpart === null ? '' : bpart.toFixed(1) + '% ' + at) + '</div>';
      t += '<p class="tt-pq tt-pq2">Registered at an early voting site</p>' +
        '<p class="tt-pqs">During early voting, North Carolinians can register (or update their address) and vote in the same visit.</p><div class="tt-score">' +
        row('Registered and voted the same day', fmt(r.nv[1]), B && ok(bv[1]) ? chip(r.nv[1], bv[1]) : '', B ? fmt(bv[1]) + ' ' + at : '') +
        row('\u2026 who were new to North Carolina', fmt(r.nv[2]), B && ok(bv[2]) ? chip(r.nv[2], bv[2]) : '', B ? fmt(bv[2]) + ' ' + at : '') + '</div>';
      return t + '<p class="tt-pfoot">First-time registrants are matched across the State Board\u2019s registration snapshots and voter history. Same-day registrants include voters who updated their address.</p>';
    }
    /* Who are the low-propensity voters showing up? The party makeup of low-propensity voters who have voted, 2026 and every past
       year at the same point, so the trend reads at a glance; the picked year is outlined and named in the sentence. */
    // Stacked bars, one per year: 2026 in full color, the picked year outlined, other years faded. rows: [[year, counts]].
    function shortV(n) { return n >= 1e6 ? (n / 1e6).toFixed(2).replace(/0$/, '') + 'M' : short(n); }
    function yearStack(rows, C, ink) {
      var V = votesOn(), mxT = Math.max.apply(null, rows.map(function (x) { return sum(x[1]); })) || 1;
      return '<div class="tt-lpmix' + (V ? ' v' : '') + '">' + rows.map(function (x) {
        var t = sum(x[1]) || 1, tw = V ? t / mxT * 100 : 100;   // votes: each year's bar is as long as its total
        return '<div class="tt-lpr' + (x[0] === '2026' ? ' now' : x[0] === vs ? ' on' : '') + '"><span class="tt-lpy">' + x[0] + '</span><span class="tt-lpb"' + (V ? ' style="width:' + tw.toFixed(2) + '%;flex:none"' : '') + '>' +
          x[1].map(function (n, j) { var w = n / t * 100; return '<i style="width:' + w.toFixed(2) + '%;background:' + C[j] + (ink && ink[j] ? ';color:' + ink[j] : '') + '">' + (w * tw / 100 >= (V ? 11 : 9) ? (V ? shortV(n) : Math.round(w) + '%') : '') + '</i>'; }).join('') + '</span>' + (V ? '<span class="tt-lpt">' + shortV(t) + '</span>' : '') + '</div>';
      }).join('') + '</div>';
    }
    function lpMixBlock(r) {
      if (!r.lp || sum(r.lp) < LP_MIN * 3) return '';
      var rows = [['2026', r.lp]];
      Object.keys(BASE || {}).sort().reverse().forEach(function (y) {
        var c = cmp(r, y); if (c && c.p && c.p.lp) { var i = c.idx, v = [c.p.lp[0][i], c.p.lp[1][i], c.p.lp[2][i]]; if (sum(v) >= LP_MIN * 3) rows.push([y, v]); }
      });
      var sh = function (v) { var t = sum(v); return v.map(function (x) { return x / t * 100; }); };
      var now = sh(r.lp), pick = rows.filter(function (x) { return x[0] === vs; })[0], line = '';
      if (pick) {
        var then = sh(pick[1]), d = Math.round(now[0]) - Math.round(then[0]);
        line = '<b>Democrats are ' + Math.round(now[0]) + '%</b> of low-propensity voters who have voted' + (HAS_ED ? '' : ' so far') + ', ' +
          (d >= 1 ? 'up from ' : d <= -1 ? 'down from ' : 'about the same as ') + Math.round(then[0]) + '% ' + (HAS_ED || FINAL ? 'in ' + vs : 'at this point in ' + vs) + '.';
      } else line = '<b>Democrats are ' + Math.round(now[0]) + '%</b> of low-propensity voters who have voted' + (HAS_ED ? '' : ' so far') + '.';
      var C = ['var(--pd)', 'var(--pr)', 'var(--pu)'];
      return '<p class="tt-pq">Who are the low-propensity voters showing up?' + lpQ() + '</p><p class="tt-pqs">' + line + '</p>' + yearStack(rows, C) + '<div class="tt-lpk"><span><i style="background:var(--pd)"></i>Democrats</span><span><i style="background:var(--pr)"></i>Republicans</span><span><i style="background:var(--pu)"></i>Unaffiliated</span></div>' +
        '<p class="tt-pfoot">Party makeup of the low-propensity voters who have voted, at the same point in each year.</p>';
    }
    function propBlock(r) {
      var c = cmp(r), P = [['Democrats', 'd', 'Democratic'], ['Republicans', 'r', 'Republican'], ['Unaffiliated', 'u', 'unaffiliated']];
      var base = c && c.p && c.p.lp ? c : null, who26 = HAS_ED ? 'early and mail voters' : 'voters so far';
      var t = lpMixBlock(r) + '<p class="tt-pq">How much of each party\'s vote is coming from low-propensity voters?</p><p class="tt-pqs">Share of each party\'s ' + who26 + ' who are low-propensity voters' +
        (base ? ', compared with ' + (HAS_ED ? 'early and mail voting in ' : 'the same point in ') + vs : '') + '.</p>';
      P.forEach(function (p, i) {
        var n = r.pty[i], big, chip = '', was = '';
        if (n < PROP_MIN) big = '<div class="tt-pbig dash">—</div><div class="tt-pbs">Fewer than ' + PROP_MIN + ' ' + p[2] + ' votes so far</div>';
        else {
          var now = r.lp[i] / n * 100, bn = base ? base.p.p[i][base.idx] : 0, bl = base ? base.p.lp[i][base.idx] : 0;
          big = '<div class="tt-pbig">' + Math.round(now) + '%</div><div class="tt-pbs">of ' + p[2] + ' ' + who26 + ' (' + fmt(r.lp[i]) + ' of ' + fmt(n) + ')</div>';
          if (base && bn >= PROP_MIN && r.lp[i] >= LP_MIN && bl >= LP_MIN) {
            var then = bl / bn * 100, d = Math.round(now) - Math.round(then);
            chip = '<span class="tt-chip ' + (d === 0 ? 'ev' : d > 0 ? 'up' : 'dn') + '">' + (d === 0 ? 'Same' : (d > 0 ? '▲ ' : '▼ ') + Math.abs(d) + (Math.abs(d) === 1 ? ' pt' : ' pts')) + '</span>';
            was = '<span class="tt-pwas">' + Math.round(then) + '% at this point in ' + vs + '</span>';
          } else if (base) was = '<span class="tt-pwas">Too few to compare<br>with ' + vs + ' yet</span>';
        }
        t += '<div class="tt-prow"><div class="tt-ppn"><i class="' + p[1] + '"></i>' + p[0] + '</div><div>' + big + '</div><div class="tt-pver">' + chip + was + '</div></div>';
      });
      // Progress: what share of each party's registered low-propensity voters have voted, now and at the same point earlier.
      if (r.lpr) {
        var prow = [];
        P.forEach(function (p, i) {
          if (!r.lpr[i] || r.lp[i] < LP_MIN) { prow.push([[p[0], p[1]], null, null]); return; }
          var now = r.lp[i] / r.lpr[i] * 100, then = null, thenV = null;
          if (base && base.p.lpr && base.p.lpr[i] && base.p.lp[i][base.idx] >= LP_MIN) { then = base.p.lp[i][base.idx] / base.p.lpr[i] * 100; thenV = base.p.lp[i][base.idx]; }
          prow.push([[p[0], p[1]], now, then, [r.lp[i], thenV]]);
        });
        t += '<p class="tt-pq tt-pq2">How many low-propensity voters have voted so far?</p><p class="tt-pqs">' + (votesOn() ? 'Low-propensity voters in each party who have ' : 'Share of each party\'s registered low-propensity voters who have ') + (HAS_ED ? 'voted early or by mail' : 'already voted') +
          (base && base.p.lpr ? ', compared with ' + (HAS_ED ? 'early and mail voting in ' : 'the same point in ') + vs : '') + '.</p>' +
          scoreRows(prow, false, (HAS_ED ? 'in ' + vs + ' early and mail voting' : 'at this point in ' + vs)) +
          '<p class="tt-pfoot">' + P.map(function (p, i) { return r.lpr[i] ? p[0] + ': ' + fmt(r.lp[i]) + ' of ' + fmt(r.lpr[i]) : ''; }).filter(Boolean).join(' \u00B7 ') + ' registered low-propensity voters have voted.</p>';
      }
      if (base && (vs === '2024' || vs === '2020')) t += '<p class="tt-pfoot"><b>About the ' + vs + ' comparison:</b> it looks back at the ' + (vs - 6) + ', ' + (vs - 4) + ' and ' + (vs - 2) + ' elections and counts voters who voted in 0 or 1 of them. A presidential year has no equivalent of the voters who skipped the last midterm, so the midterm years (2018 and 2022) are the closer comparisons.</p>';
      return t;
    }
    /* "Who voted early on <day>": early in-person voters on the day picked on the chart, compared with the same day of early voting earlier. */
    /* ---- Race and ethnicity, as voters list them on their registration (both optional) ----
       Data arrays follow the State Board codes in this order: B, W, A, I, O, M, P, U (race) and HL, NL, UN (ethnicity). */
    var RCODES = ['B', 'W', 'A', 'I', 'O', 'M', 'P', 'U'];
    var RLAB = { B: 'Black', W: 'White', A: 'Asian', I: 'American Indian', O: 'Other race', M: 'Two or more races', P: 'Pacific Islander', X: 'Another race', U: 'Undesignated' };
    var RNOUN = { B: 'Black voters', W: 'White voters', A: 'Asian voters', I: 'American Indian voters', O: 'Voters who listed “Other” for race', M: 'Voters of two or more races', P: 'Pacific Islander voters', X: 'Voters of another race', U: 'Voters with no race listed' };
    var RCOL = { B: '#7A4E9C', W: '#C9B27C', A: '#3F8F8A', I: '#8C5A2B', O: '#D98B5F', M: '#7F9C6B', P: '#4A6C8C', X: '#A88F7A', U: '#BDB6A8' };
    var HCOL = ['#B5476B', '#9FB3C8', 'repeating-linear-gradient(135deg,#E6E1D6 0 3px,#bdb3a0 3px 5px)'];
    /* The groups shown for a place: statewide, every category; elsewhere American Indian, Other, two or more races and
       Pacific Islander each get a row where they are at least 5% of registered voters, and the rest are combined. */
    function raceGroups(r, statewide) {
      var g = [{ k: 'B', ix: [0] }, { k: 'W', ix: [1] }, { k: 'A', ix: [2] }], rest = [];
      [3, 4, 5, 6].forEach(function (i) {
        var share = r.rrace && r.reg ? r.rrace[i] / r.reg : (r.race && r.vc ? r.race[i] / r.vc : 0);
        if (statewide || share >= RACE_SPLIT) g.push({ k: RCODES[i], ix: [i] }); else rest.push(i);
      });
      if (rest.length) g.push({ k: 'X', ix: rest, of: rest.map(function (i) { return RLAB[RCODES[i]]; }) });
      g.push({ k: 'U', ix: [7] });
      return g;
    }
    function gsum(arr, gr, at) { return gr.ix.reduce(function (s, i) { var v = arr[i]; return s + (at == null ? v : v[at]); }, 0); }
    function neutralChange(a, b, small) {
      var dd = small ? +a.toFixed(1) - +b.toFixed(1) : Math.round(a) - Math.round(b), ds = small ? Math.abs(dd).toFixed(1) : String(Math.abs(dd));
      return Math.abs(dd) < (small ? 0.05 : 0.5) ? '<span class="tt-she">about the same</span> as' : '<b>' + (dd > 0 ? '▲ ' : '▼ ') + ds + (ds === '1' ? ' point ' : ' points ') + (dd > 0 ? 'more' : 'less') + '</b> than';
    }
    /* o: { votes, eth, regs, reth, regRow, statewide, base: { votes, eth, regs, reth } or null, of, when, cmpHead, rates } */
    function raceView(o) {
      var G = raceGroups(o.regRow, o.statewide), tot = o.votes.reduce(function (a2, b2) { return a2 + b2; }, 0), t = '', bar = '', leg = '';
      var f = function (z, small) { return z > 0 && z < 0.05 ? '<0.1' : small ? z.toFixed(1) : String(Math.round(z)); };
      var LPr = legPct(G.map(function (gr) { return gsum(o.votes, gr); })), gi = 0;
      G.forEach(function (gr) {
        var v = gsum(o.votes, gr), w = v / (tot || 1) * 100;
        if (v) bar += '<span class="tt-ps" style="width:' + w.toFixed(2) + '%;background:' + RCOL[gr.k] + '"></span>';
        leg += '<span class="tt-pk"><i style="background:' + RCOL[gr.k] + '"></i>' + RLAB[gr.k] + ' <b>' + fmt(v) + '</b><em>' + LPr[gi++] + '%</em></span>';
      });
      var ycap = FINAL ? ', each year' : HAS_ED ? ', early and mail votes, each year' : ', at the same point in each year';
      t += (o.yrs && o.yrs.length
        ? '<p class="tt-yscap">Votes by race' + ycap + '</p>' + yearStack([['2026', G.map(function (gr) { return gsum(o.votes, gr); })]].concat(o.yrs.map(function (x) { return [x[0], G.map(function (gr) { return gsum(x[1], gr); })]; })), G.map(function (gr) { return RCOL[gr.k]; }))
        : '<div class="tt-pbar" role="img" aria-label="Votes by race">' + bar + '</div>') + '<div class="tt-pleg">' + leg + '</div>';
      var B = o.base, btot = B ? B.votes.reduce(function (a2, b2) { return a2 + b2; }, 0) : 0;
      if (B && btot >= PROP_MIN && tot && !votesOn()) {   // shares of the vote: percentages only
        t += '<div class="tt-shs"><p class="tt-shh">' + o.cmpHead + '</p>';
        G.forEach(function (gr) {
          var v = gsum(o.votes, gr), bv = gsum(B.votes, gr);
          if (v < RACE_MIN || bv < RACE_MIN) { t += '<div class="tt-sh"><i style="background:' + RCOL[gr.k] + '"></i><span>' + RNOUN[gr.k] + ': too few votes to compare.</span></div>'; return; }
          var a = v / tot * 100, b = bv / btot * 100, small = a < 10 || b < 10;
          t += '<div class="tt-sh"><i style="background:' + RCOL[gr.k] + '"></i><span>' + RNOUN[gr.k] + ' make up ' + f(a, small) + '% ' + o.of + ', ' + neutralChange(a, b, small) + ' ' + o.when + ' (' + f(b, small) + '%).</span></div>';
        });
        t += '</div>';
      }
      if (o.rates && o.regs) {
        var rows = G.map(function (gr) {
          var v = gsum(o.votes, gr), rg = gsum(o.regs, gr), now = rg && v >= RACE_MIN ? v / rg * 100 : null, then = null;
          if (B && B.regs) { var bv = gsum(B.votes, gr), br = gsum(B.regs, gr); if (br && bv >= RACE_MIN) then = bv / br * 100; }
          return [[RLAB[gr.k], gr.k, RCOL[gr.k]], now, then, [v >= RACE_MIN ? v : null, B && B.votes ? gsum(B.votes, gr) : null]];
        });
        t += rateLede('group') + scoreRows(rows, false, o.wasText);
      }
      var x = G.filter(function (gr) { return gr.k === 'X'; })[0];
      t += '<div class="tt-pnote">Race as voters listed it on their registration (optional). ' + (x ? '“Another race” here combines ' + x.of.join(', ').replace(/, ([^,]*)$/, ' and $1') + '. ' : '') +
        (G.some(function (gr) { return gr.k === 'O'; }) ? 'Many Hispanic and Latino voters choose “Other” for race; see ethnicity below. ' : '') + 'Groups with fewer than ' + RACE_MIN + ' votes show a dash.</div>';
      // Hispanic or Latino: a separate question on the form, which many voters leave blank.
      var e = o.eth, etot = e[0] + e[1] + e[2];
      if (etot) {
        var hs = e[0] / etot * 100, bl = e[2] / etot * 100, ns = e[1] / etot * 100;
        t += '<div class="tt-eth"><p class="tt-eh">Hispanic or Latino voters</p><p class="tt-es">Ethnicity is a separate question on the registration form, so it\'s shown on its own. Many voters skip it.</p>' +
          (o.yrs && o.yrs.some(function (x) { return x[2]; })
            ? '<p class="tt-yscap">Votes by ethnicity' + ycap + '</p>' + yearStack([['2026', [e[0], e[1], e[2]]]].concat(o.yrs.filter(function (x) { return x[2]; }).map(function (x) { return [x[0], x[2]]; })), HCOL, [0, 'var(--navy)', 'var(--navy)'])
            : '<div class="tt-pbar" role="img" aria-label="Votes by ethnicity"><span class="tt-ps" style="width:' + hs.toFixed(2) + '%;background:' + HCOL[0] + '"></span><span class="tt-ps" style="width:' + ns.toFixed(2) + '%;background:' + HCOL[1] + '"></span><span class="tt-ps" style="width:' + bl.toFixed(2) + '%;background:' + HCOL[2] + '"></span></div>') +
          '<div class="tt-pleg"><span class="tt-pk"><i style="background:' + HCOL[0] + '"></i>Hispanic or Latino <b>' + fmt(e[0]) + '</b><em>' + hs.toFixed(1) + '%</em></span><span class="tt-pk"><i style="background:' + HCOL[1] + '"></i>Not Hispanic or Latino <b>' + fmt(e[1]) + '</b><em>' + Math.round(ns) + '%</em></span><span class="tt-pk"><i style="background:' + HCOL[2] + '"></i>Left blank <b>' + fmt(e[2]) + '</b><em>' + Math.round(bl) + '%</em></span></div>';
        var be = B && B.eth, betot = be ? be[0] + be[1] + be[2] : 0;
        if (be && betot >= PROP_MIN && e[0] >= RACE_MIN && be[0] >= RACE_MIN && !votesOn()) {
          var hb = be[0] / betot * 100;
          t += '<div class="tt-shs"><div class="tt-sh"><i style="background:' + HCOL[0] + '"></i><span>Voters who marked Hispanic or Latino make up ' + hs.toFixed(1) + '% ' + o.of + ', ' + neutralChange(hs, hb, true) + ' ' + o.when + ' (' + hb.toFixed(1) + '%).</span></div></div>';
        }
        if (o.rates && o.reth && o.reth[0]) {
          var hn = e[0] >= RACE_MIN ? e[0] / o.reth[0] * 100 : null, ht = B && B.reth && B.reth[0] && B.eth[0] >= RACE_MIN ? B.eth[0] / B.reth[0] * 100 : null;
          t += scoreRows([[['Hispanic or Latino', 'hl', HCOL[0]], hn, ht, [e[0] >= RACE_MIN ? e[0] : null, B && B.eth ? B.eth[0] : null]]], false, o.wasText);
        }
        var regBl = o.reth ? o.reth[2] / (o.reth[0] + o.reth[1] + o.reth[2]) * 100 : null, thenBl = betot ? be[2] / betot * 100 : null;
        t += '<p class="tt-ewarn"><b>' + Math.round(bl) + '% of ' + o.whoBlank + ' (' + fmt(e[2]) + ') left ethnicity blank</b>' + (regBl !== null ? ', as did ' + Math.round(regBl) + '% of all registered voters here' : '') +
          (thenBl !== null ? ' (it was ' + Math.round(thenBl) + '% ' + o.when + ')' : '') + '. The real number of Hispanic and Latino voters is higher than shown.</p></div>';
      }
      return t;
    }
    function dayBlock(r) {
      var x = r.dd[dayI], d = EV_DAYS[dayI], pty = x.slice(0, 4), age = x.slice(4, 8), lp = x.length > 8 ? x.slice(8, 11) : null;
      var vc = pty.reduce(function (a2, b2) { return a2 + b2; }, 0), hasProp = !!lp, xr = r.ddr && r.ddr[dayI], hasRace = !!xr;
      var hasNewD = !!(r.dn && r.dn[dayI]);
      if ((!hasProp && who === 'prop') || (!hasRace && who === 'race') || (!hasNewD && who === 'new')) who = 'party';
      var isAge = who === 'age', label = WDL[dow(d)] + ', ' + apDate(d), nday = 'day ' + (dayI + 1) + ' of early voting';
      var tb = function (k, l) { return '<button type="button" data-who="' + k + '" aria-pressed="' + (who === k) + '"' + (who === k ? ' class="on"' : '') + '>' + l + '</button>'; };
      var t = '<div class="tt-sec tt-whosec"><div class="tt-sech">Who voted early on ' + label + '</div>' + crow('By', '<span class="tt-who tt-whotab" role="group" aria-label="Break down by">' + tb('party', 'Party') + tb('age', 'Age') + (hasRace ? tb('race', 'Race') : '') + (hasProp ? tb('prop', 'Propensity') : '') + (hasNewD ? tb('new', 'New voters') : '') + '</span>') +
        '<div class="tt-calsub tt-hint"><span>Showing early in-person voters on <b>' + label + '</b> only (' + nday + ')</span><button type="button" class="tt-linkbtn tt-alldays">Show all votes so far</button></div>';
      if (vc < PROP_MIN) return t + '<p class="tt-pnote" style="font-size:14px;color:var(--soft)">Too few early votes that day (' + fmt(vc) + ') to show a breakdown.</p></div>';
      var k = state.geo, Y = baseRow(r);
      var bd = BASE && BASE[vs] ? new Date(Date.parse(BASE[vs].ev_start + 'T12:00:00Z') + dayI * 864e5).toISOString().slice(0, 10) : null;
      var bday = bd ? WDL[dow(bd)] + ', ' + apDate(bd) + ', ' + vs : nday + ' in ' + vs;
      var bx = Y && Y.dd && Y.dd[dayI] ? Y.dd[dayI] : null, when = 'on ' + bday;
      if (who === 'race') {
        var bxr = Y && Y.ddr && Y.ddr[dayI];
        return t + raceView({ votes: xr.slice(0, 8), eth: xr.slice(8, 11), regRow: r, statewide: k === 'state', base: bxr ? { votes: bxr.slice(0, 8), eth: bxr.slice(8, 11) } : null,
          of: 'of early voters that day', when: when, cmpHead: 'Compared with ' + bday, whoBlank: 'early voters that day' }) +
          '<div class="tt-pnote">Early in-person votes cast that day only; mail ballots are left out.</div></div>';
      }
      if (who === 'new') {   // first-time registrants who voted that day (early in person or mail accepted that day)
        var dn = r.dn[dayI], dayAll = (r.tev[D.days.indexOf(d)] || 0) + (r.tml[D.days.indexOf(d)] || 0), pk = Y && Y.nv ? dayI - BASE[vs].k0 : null;
        var pn = pk !== null && Y.nv[pk] && Y.nv[pk - 1] ? Y.nv[pk].map(function (x, j) { return x - Y.nv[pk - 1][j]; }) : null;
        var pall = pk !== null && Y.c[pk] !== undefined && Y.c[pk - 1] !== undefined ? Y.c[pk] - Y.c[pk - 1] : null;
        function cmpn(now, then) { if (then === null || then === undefined || then < 10) return ''; var x = Math.round((now / then - 1) * 100); return '<span class="tt-chip ' + (x === 0 ? 'ev' : x > 0 ? 'up' : 'dn') + '">' + (x === 0 ? 'Same' : (x > 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(x) + '%') + '</span><span class="tt-pwas">' + fmt(then) + ' ' + when + '</span>'; }
        t += '<p class="tt-pq">First-time North Carolina voters on ' + label + '</p><p class="tt-pqs">People who registered in North Carolina for the first time this year and voted that day, early in person or by mail.</p>' +
          '<div class="tt-prow"><div class="tt-ppn">First-time registrants</div><div><div class="tt-pbig">' + fmt(dn[0]) + '</div><div class="tt-pbs">' + (dayAll ? (dn[0] / dayAll * 100).toFixed(1) + '% of that day\u2019s ' + fmt(dayAll) + ' voters' : '') + '</div></div><div class="tt-pver">' + cmpn(dn[0], pn && pn[0]) + '</div></div>' +
          '<div class="tt-prow"><div class="tt-ppn">Registered and voted the same day</div><div><div class="tt-pbig">' + fmt(dn[1]) + '</div><div class="tt-pbs">' + fmt(dn[2]) + ' of them new to North Carolina</div></div><div class="tt-pver">' + cmpn(dn[1], pn && pn[1]) + '</div></div>';
        return t + '<div class="tt-pnote">Counts ballots accepted that day. Same-day registrants include voters who updated their address.</div></div>';
      }
      if (who === 'prop') {
        if (bx && bx.length <= 8) bx = null;   // no propensity counts for that year (2018)
        var P = [['Democrats', 'd', 'Democratic'], ['Republicans', 'r', 'Republican'], ['Unaffiliated', 'u', 'unaffiliated']];
        t += '<p class="tt-pq">How much of each party\'s early vote that day came from low-propensity voters?</p><p class="tt-pqs">Share of each party\'s early voters on ' + label + ' who are low-propensity voters' + (bx ? ', compared with ' + bday : '') + '.</p>';
        P.forEach(function (p, i) {
          var n = pty[i], big, chip = '', was = '';
          if (n < PROP_MIN) big = '<div class="tt-pbig dash">\u2014</div><div class="tt-pbs">Fewer than ' + PROP_MIN + ' ' + p[2] + ' early votes that day</div>';
          else {
            var now = lp[i] / n * 100, bn = bx ? bx[i] : 0, bl = bx && bx.length > 8 ? bx[8 + i] : 0;
            big = '<div class="tt-pbig">' + Math.round(now) + '%</div><div class="tt-pbs">of ' + p[2] + ' early voters that day (' + fmt(lp[i]) + ' of ' + fmt(n) + ')</div>';
            if (bx && bn >= PROP_MIN && lp[i] >= LP_MIN && bl >= LP_MIN) {
              var then = bl / bn * 100, dd = Math.round(now) - Math.round(then);
              chip = '<span class="tt-chip ' + (dd === 0 ? 'ev' : dd > 0 ? 'up' : 'dn') + '">' + (dd === 0 ? 'Same' : (dd > 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(dd) + (Math.abs(dd) === 1 ? ' pt' : ' pts')) + '</span>';
              was = '<span class="tt-pwas">' + Math.round(then) + '% ' + when + '</span>';
            } else if (bx) was = '<span class="tt-pwas">Too few to compare<br>with ' + vs + '</span>';
          }
          t += '<div class="tt-prow"><div class="tt-ppn"><i class="' + p[1] + '"></i>' + p[0] + '</div><div>' + big + '</div><div class="tt-pver">' + chip + was + '</div></div>';
        });
        return t + '<div class="tt-pnote">Early in-person votes cast that day only; mail ballots are left out.</div></div>';
      }
      var vals = isAge ? age : pty, sumv = vals.reduce(function (a2, b2) { return a2 + b2; }, 0), bar = '', leg = '', L = isAge ? AGE : PARTY.map(function (p) { return [p[0], p[1]]; });
      var LPd = legPct(vals);
      L.forEach(function (p, i) {
        var v2 = vals[i], w = v2 / (sumv || 1) * 100;
        if (v2) bar += '<span class="tt-ps ' + p[1] + '" style="width:' + w.toFixed(2) + '%"></span>';
        leg += '<span class="tt-pk"><i class="' + p[1] + '"></i>' + p[0] + ' <b>' + fmt(v2) + '</b><em>' + LPd[i] + '%</em></span>';
      });
      t += '<div class="tt-pbar" role="img" aria-label="Early votes on ' + label + ' by ' + (isAge ? 'age' : 'party registration') + '">' + bar + '</div><div class="tt-pleg">' + leg + '</div>';
      if (bx) {
        var then = isAge ? bx.slice(4, 8) : bx.slice(0, 4), tsum = then.reduce(function (a2, b2) { return a2 + b2; }, 0);
        if (tsum >= PROP_MIN && sumv) {
          var NOUN = isAge ? ['Voters 18\u201325', 'Voters 26\u201340', 'Voters 41\u201365', 'Voters 66 and older'] : ['Democrats', 'Republicans', 'Unaffiliated voters'];
          var COL = isAge ? AGE.map(function (g) { return 'var(--' + g[1] + ')'; }) : ['var(--pd)', 'var(--pr)', 'var(--pu)'];
          var f = function (z, small) { return small ? z.toFixed(1) : String(Math.round(z)); };
          t += '<div class="tt-shs"><p class="tt-shh">Compared with ' + bday + '</p>';
          NOUN.forEach(function (n, i) {
            var a = vals[i] / sumv * 100, b = then[i] / tsum * 100, small = a < 10 || b < 10;
            var dd = small ? +a.toFixed(1) - +b.toFixed(1) : Math.round(a) - Math.round(b), ds = small ? Math.abs(dd).toFixed(1) : String(Math.abs(dd));
            var chg = Math.abs(dd) < 0.5 ? '<span class="tt-she">about the same</span> as' : '<span class="' + (dd > 0 ? 'tt-shu' : 'tt-shd') + '">' + ds + (ds === '1' ? ' point ' : ' points ') + (dd > 0 ? 'more' : 'less') + '</span> than';
            t += '<div class="tt-sh"><i style="background:' + COL[i] + '"></i><span>' + n + ' made up ' + f(a, small) + '% of early voters that day, ' + chg + ' ' + when + ' (' + f(b, small) + '%).</span></div>';
          });
          t += '</div>';
        }
      }
      return t + '<div class="tt-pnote">Early in-person votes cast that day only; mail ballots are left out. ' + (isAge ? 'Age as listed in the State Board file.' : 'Party registration, not vote choice: in a general election, every voter can vote for any candidate, whatever their party.') + '</div></div>';
    }
    /* ---- Shareable graphics: three 1080 x 1350 slides drawn on a canvas, compared with the same day of early voting in
       2022, statewide or for the county picked above. The Carolina Forward name and logo are part of the drawing. ---- */
    var shareSlide = 0, shareYear = '2022', XTS = { '2022': XT, '2018': XT18, '2020': XT20, '2024': XT24 };   // the graphics compare with the year picked at the top
    var NOPROP = {};   // years without the voting history for a low/high-propensity split (none now: 2012-2014 come from an archived history file)
    /* slides in the order shown: by party first. shOrder maps each position to the slide drawn (0 low-propensity grid or
       all-voters grid, 1 high-propensity grid, last by party) */
    function shOrder() { return NOPROP[shareYear] ? [1, 0] : [2, 0, 1]; }
    function shLabs() {
      var pn = shPartyName(), g = pn ? pn : 'voters';
      return NOPROP[shareYear] ? ['By party', 'By race and age' + (pn ? ': ' + pn : '')] : ['By party', 'Low-propensity ' + g + ' by race and age', 'High-propensity ' + g + ' by race and age'];
    }
    var shParty = -1, shMode = 'rate', XTP = {}, XTPD = {};   // party filter for the race x age images (-1: all); 'rate' or 'share' (share of the party's votes)
    var SH_PN = ['Democrats', 'Republicans', 'Unaffiliated voters'];
    function shPartyName() { return shParty < 0 ? '' : SH_PN[shParty]; }
    function shPartyOK(r) { return !!(r && r.xpv && r.xpr); }
    function shShare() { return shMode === 'share'; }
    function shPSrc() { return shDist() ? XTPD[shareYear] : XTP[shareYear]; }
    function sharePPlace(r) {   // the party-split past year (xtabp<year>.json) for this place
      var X = shPSrc(); if (!X) return null;
      return shDist() ? X.districts && X.districts[state.geo] && X.districts[state.geo][r.name] : X.places && X.places[state.geo === 'state' ? 'North Carolina' : r.name];
    }
    function shFit(c, text, maxW, size, wt, fam) {   // the largest font size, up to size, that fits text in maxW
      for (var f = size; f > 10; f--) { c.font = wt + ' ' + f + 'px ' + fam; if (c.measureText(text).width <= maxW) return f; }
      return 10;
    }
    var XR = ['Black', 'Other race*', 'Asian', 'White'], XA = ['18–25', '26–40', '41–65', '66+'];
    var WDS = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'];
    function shareK() { var kn = kLatest(); return kn === null ? null : kn; }
    function shareOK(r) { var kn = shareK(); return !!(r && r.xv && r.xr && r.pv && r.pr && kn !== null && kn >= 0 && kn <= 16 && !HAS_ED && !FINAL); }
    var XTD = /*__XTD__*/{};   // past years for today's districts, per year (xtab_districts<year>.json, loaded when a district's graphics are drawn)
    function shDist() { return state.geo !== 'state' && state.geo !== 'county'; }
    function shSrc() { return shDist() ? XTD[shareYear] : XTS[shareYear]; }
    function sharePlace(r) {
      var X = shSrc(); if (!X) return null;
      return shDist() ? X.districts && X.districts[state.geo] && X.districts[state.geo][r.name] : X.places && X.places[state.geo === 'state' ? 'North Carolina' : r.name];
    }
    function shPlaceName(r) { return state.geo === 'state' ? '' : state.geo === 'county' ? r.name + ' County' : LONG[state.geo](r.name); }
    function shareBlock(r) {
      if (!shareOK(r)) return '';
      if (!shPartyOK(r)) shParty = -1;
      shareYear = vs;
      var lab = shLabs(); if (shareSlide >= lab.length) shareSlide = 0;
      return '<div class="tt-sec tt-gfx"><div class="tt-sech">Share these crosstabs<span>' + (state.geo === 'state' ? 'Statewide' : esc(shPlaceName(r))) + '</span></div>' +
        (state.geo === 'state' ? '<p class="tt-ssubt">To see trends in a specific county or district, select it above.</p>' : '') +
        crow('Measure', seg(bt('data-shm', 'rate', 'Turnout rate', !shShare()) + bt('data-shm', 'share', 'Share of votes', shShare()), 'Measure')) +
        (shPartyOK(r) ? crow('Party', seg(bt('data-shp', '-1', 'All', shParty < 0) + bt('data-shp', '0', 'Democrats', shParty === 0) + bt('data-shp', '1', 'Republicans', shParty === 1) + bt('data-shp', '2', 'Unaffiliated', shParty === 2), 'Party')) : '') +
        (shShare() ? '' : numCtl()) + '<p class="tt-shnote" style="margin:0 0 10px">' + (shShare() ? 'Share of votes: each group’s share of ' + (shParty < 0 ? 'all' : 'that party’s') + ' early and mail votes so far. ' : 'Turnout rate: the share of each group’s registered voters who have voted so far. ') +
        (shParty >= 0 ? 'The party filter applies to the race-and-age images. ' : '') + 'Compared with ' + shareYear + ', the year picked above.' + (NOPROP[shareYear] ? ' ' + shareYear + ' has no low-/high-propensity split: that needs voting history back to ' + (shareYear - 6) + ', and the State Board\u2019s file now starts in 2016.' : '') + '</p>' +
        '<div class="tt-shtabs" role="group" aria-label="Graphic">' + lab.map(function (l, i) { return '<button type="button" data-slide="' + i + '" aria-pressed="' + (shareSlide === i) + '"' + (shareSlide === i ? ' class="on"' : '') + '>' + (i + 1) + '. ' + l + '</button>'; }).join('') + '</div>' +
        '<div class="tt-shcv"><canvas width="1080" height="1350" role="img" aria-label="Shareable graphic: ' + lab[shareSlide] + '"></canvas></div>' +
        '<div class="tt-shbtns"><button type="button" class="tt-shdl">Download PNG</button><button type="button" class="tt-shdl tt-shall">Download all ' + lab.length + '</button></div>' +
        '<p class="tt-shnote">1080 × 1350 (Instagram 4:5). Groups with too few voters show a dash.</p></div>';
    }
    function shRound(c, x, y, w, h, rad) { c.beginPath(); c.moveTo(x + rad, y); c.arcTo(x + w, y, x + w, y + h, rad); c.arcTo(x + w, y + h, x, y + h, rad); c.arcTo(x, y + h, x, y, rad); c.arcTo(x, y, x + w, y, rad); c.closePath(); }
    function shWrap(c, text, x, y, maxW, lh) {
      var words = text.split(' '), line = '';
      words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y); y += lh; line = w; } else line = t; });
      if (line) { c.fillText(line, x, y); y += lh; }
      return y;
    }
    function shGreen(t) { var a = [244, 239, 229], b = [31, 74, 44]; t = Math.max(0, Math.min(1, t)); return 'rgb(' + a.map(function (x, i) { return Math.round(x + (b[i] - x) * t); }).join(',') + ')'; }
    var SH_LOGO = null;
    function shLogo(done) {
      if (SH_LOGO && SH_LOGO.complete) return done();
      SH_LOGO = new Image(); SH_LOGO.onload = done; SH_LOGO.onerror = done; SH_LOGO.src = CF_LOGO;
    }
    function shDayLabel(iso) { return WDS[dow(iso)] + ', ' + apDate(iso); }
    // the same source line on every image: what the votes run through, when the data was updated, and where the live tracker is
    function srcLine(extra) {
      return 'Source: NC State Board of Elections. Votes through ' + shDayLabel(D.days[fullDay()]) + '; ' + updatedLabel(D).replace(/^Updated/, 'updated').replace(/\.$/, '') + '.' + (extra ? ' ' + extra : '');
    }
    var URL_LINE = 'See the live tracker: ' + TRACK_URL;
    function shHeader(c, n, place, title, dek) {
      c.fillStyle = '#F4EFE5'; c.fillRect(0, 0, 1080, 1350);
      c.fillStyle = '#A50000'; c.fillRect(64, 70, 40, 3);
      c.font = '800 19px Inter, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
      try { c.letterSpacing = '4px'; } catch (e) { /* older browsers */ }
      c.fillText(('NC Turnout Tracker' + (place ? ' · ' + place : '')).toUpperCase(), 118, 72);
      c.textAlign = 'right'; c.fillStyle = '#6b6b6b'; c.fillText(n + '/' + shLabs().length, 1016, 72);
      try { c.letterSpacing = '0px'; } catch (e) { /* older browsers */ }
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillStyle = '#253551'; c.font = '700 58px "Zilla Slab", Georgia, serif';
      var y = shWrap(c, title, 64, 160, 952, 64);
      c.fillStyle = '#3a3a3a'; c.font = '400 23px Inter, sans-serif';
      return shWrap(c, dek, 64, y + 8, 952, 32);
    }
    function shFooter(c, src) {
      c.fillStyle = '#D8D2C4'; c.fillRect(64, 1236, 952, 2);
      if (SH_LOGO && SH_LOGO.naturalWidth) { c.save(); shRound(c, 64, 1256, 52, 52, 8); c.clip(); c.drawImage(SH_LOGO, 64, 1256, 52, 52); c.restore(); }
      c.fillStyle = '#253551'; c.font = '700 24px "Zilla Slab", Georgia, serif'; c.fillText('Carolina Forward', 128, 1281); c.fillStyle = '#6b6b6b'; c.font = '600 15px Inter, sans-serif'; c.fillText(CF_URL, 128, 1304);
      c.fillStyle = '#6b6b6b'; c.font = '400 15px Inter, sans-serif'; var fy2 = shWrap(c, src, 336, 1262, 680, 20);
      c.fillStyle = '#253551'; c.font = '600 15px Inter, sans-serif'; c.fillText(URL_LINE, 336, Math.max(fy2 + 2, 1322));
    }
    function shCell(c, x, y, w, h, now, then, share) {
      if (now === null || then === null) {
        c.fillStyle = '#ECE7DC'; shRound(c, x, y, w, h, 8); c.fill();
        c.fillStyle = '#8a8478'; c.textAlign = 'center'; c.font = '700 44px "Zilla Slab", Georgia, serif'; c.fillText('—', x + w / 2, y + h / 2 + 4);
        c.font = '400 17px Inter, sans-serif'; c.fillText('too few voters', x + w / 2, y + h / 2 + 36); c.textAlign = 'left'; return;
      }
      var k = now / then, d = now - then, up = share ? d > 0 : k >= 1, u = share ? Math.min(1, Math.abs(d) / 4) : up ? Math.min(1, (k - 1) / 2.5) : Math.min(1, (1 - k) / 0.75), dark;
      var A = [236, 231, 220];
      if (share) {   // shares go up for one group only as they go down for others, so no good/bad colors: navy for a bigger share, sand for a smaller one
        var Z = up ? [37, 53, 81] : [176, 160, 128]; dark = up && u > 0.5;
        c.fillStyle = 'rgb(' + A.map(function (v, i) { return Math.round(v + (Z[i] - v) * u); }).join(',') + ')';
      } else if (!up) {   // behind the comparison year: a red scale
        var Rd = [184, 87, 74]; dark = u > 0.6;
        c.fillStyle = 'rgb(' + A.map(function (v, i) { return Math.round(v + (Rd[i] - v) * u); }).join(',') + ')';
      } else { c.fillStyle = shGreen(u); dark = u > 0.5; }
      shRound(c, x, y, w, h, 8); c.fill();
      var head = share ? (Math.abs(d) < 0.05 ? 'same' : (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' pts') : (Math.abs(k - 1) < 0.05 ? 'same' : k.toFixed(1) + '×');
      var sub = share ? now.toFixed(1) + '% vs ' + then.toFixed(1) + '%' : votesOn() ? fmt(now) + ' vs ' + fmt(then) : now.toFixed(1) + '% vs ' + then.toFixed(1) + '%';
      c.textAlign = 'center'; c.fillStyle = dark ? '#ffffff' : '#1a1a1a';
      shFit(c, head, w - 20, 54, '700', '"Zilla Slab", Georgia, serif'); c.fillText(head, x + w / 2, y + h / 2 + 4);
      c.fillStyle = dark ? 'rgba(255,255,255,.85)' : '#5a5a5a'; shFit(c, sub, w - 16, 19, '400', 'Inter, sans-serif');
      c.fillText(sub, x + w / 2, y + h / 2 + 40); c.textAlign = 'left';
    }
    function shRate(v, rg, v2, r2, minV) {
      if (!rg || !r2 || rg < 100 || r2 < 100 || v < minV || v2 < minV) return [null, null];
      return votesOn() ? [v, v2] : [v / rg * 100, v2 / r2 * 100];   // votes: the counts themselves
    }
    function shGrid(c, y, r, P, k, mode, PP) {   // mode: 'low' (low-propensity), 'reg' (high-propensity) or 'all'; PP: the party-split past year
      var x0 = 64 + 170, cw = (952 - 170 - 30) / 4, ch = 150, low = mode === 'low', pn = shPartyName(), SH = shShare();
      var g = pn || 'voters';
      c.fillStyle = '#253551'; c.font = '700 36px "Zilla Slab", Georgia, serif'; c.fillText(mode === 'all' ? (pn ? 'All ' + pn : 'All voters') : (low ? 'Low-propensity ' : 'High-propensity ') + g, 64, y + 40);
      c.fillStyle = '#6b6b6b'; c.font = '400 19px Inter, sans-serif'; c.fillText(mode === 'all' ? 'Every registered voter in each group' : low ? 'Voted in 0–1 of the last 3 Novembers, or skipped the midterm' : 'Everyone who isn’t a low-propensity voter', 64, y + 72);
      // getters for 2026 votes and registered, and the past year's, for cell i (party-filtered when a party is picked)
      var o = shParty < 0 ? 0 : shParty * 32;
      var V = shParty < 0 ? function (i) { return r.xv[i]; } : function (i) { return r.xpv[o + i]; };
      var R = shParty < 0 ? function (i) { return r.xr[i]; } : function (i) { return r.xpr[o + i]; };
      var PV = shParty < 0 ? function (i) { return P.v[k][i]; } : function (i) { return PP.v[Math.min(k, PP.v.length - 1)][o + i]; };
      var PR = shParty < 0 ? function (i) { return P.r[i]; } : function (i) { return PP.r[o + i]; };
      var T = 0, PT = 0;   // share of votes: of the party's (or all three parties') early and mail votes so far
      if (SH) [0, 1, 2].forEach(function (q) { if (shParty < 0 || shParty === q) { T += r.pv[q * 2] + r.pv[q * 2 + 1]; PT += P.pv[k][q * 2] + P.pv[k][q * 2 + 1]; } });
      function val(ix) {   // ix: the cells to add together
        var v = 0, rg = 0, v2 = 0, r2 = 0; ix.forEach(function (i) { v += V(i); rg += R(i); v2 += PV(i); r2 += PR(i); });
        if (SH) return T >= 100 && PT >= 100 && v >= 10 && v2 >= 10 ? [v / T * 100, v2 / PT * 100] : [null, null];
        return shRate(v, rg, v2, r2, 10);
      }
      y += 110; c.fillStyle = '#3a3a3a'; c.font = '700 20px Inter, sans-serif'; c.textAlign = 'center';
      XA.forEach(function (a, ai) { c.fillText(a, x0 + ai * (cw + 10) + cw / 2, y); }); c.textAlign = 'left'; y += 16;
      XR.forEach(function (lab, ri) {
        c.fillStyle = '#1a1a1a'; c.font = '700 24px Inter, sans-serif'; c.fillText(lab, 64, y + ch / 2 + 8);
        XA.forEach(function (a, ai) {
          var i = (ri * 4 + ai) * 2 + (low ? 0 : 1);
          var rt = mode === 'all' ? val([i - 1, i]) : val([i]);   // 'all' adds the low-propensity cell to the high-propensity one
          shCell(c, x0 + ai * (cw + 10), y, cw, ch, rt[0], rt[1], SH);
        });
        y += ch + 10;
      });
      return y;
    }
    function shPartyCard(c, x, y, w, h, title, sub, now, then, col, light, mx) {
      var SH = shShare();
      c.fillStyle = '#ffffff'; shRound(c, x, y, w, h, 10); c.fill();
      c.fillStyle = '#1a1a1a'; c.font = '700 26px "Zilla Slab", Georgia, serif'; c.fillText(title, x + 22, y + 40);
      if (sub) { c.fillStyle = '#6b6b6b'; c.font = '400 16px Inter, sans-serif'; c.fillText(sub, x + 22, y + 62); }
      if (now === null) { c.fillStyle = '#8a8478'; c.font = '400 18px Inter, sans-serif'; c.fillText('Too few voters to compare', x + 22, y + h - 30); return; }
      var k = now / then, d = now - then, good = SH ? d >= 0.5 : k >= 1.05, bad = SH ? d <= -0.5 : k <= 0.95;
      var head = SH ? (Math.abs(d) < 0.05 ? 'same' : (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' pts') : (Math.abs(k - 1) < 0.05 ? 'same' : k.toFixed(1) + '×');
      c.textAlign = 'right'; c.fillStyle = SH ? '#253551' : good ? '#1F6B45' : bad ? '#A50000' : '#3a3a3a';
      shFit(c, head, w * 0.45, 54, '700', '"Zilla Slab", Georgia, serif'); c.fillText(head, x + w - 22, y + 56); c.textAlign = 'left';
      var lab = function (v) { return SH || !votesOn() ? v.toFixed(1) + '%' : fmt(v); };
      c.font = '800 21px Inter, sans-serif'; var vw = Math.max(c.measureText(lab(now)).width, c.measureText(lab(then)).width);
      var bw = Math.max(40, w - 86 - 22 - vw - 16);   // the bars stop short of the numbers
      [[2026, now, col, '#1a1a1a', '800'], [shareYear, then, light, '#6b6b6b', '600']].forEach(function (b, j) {
        var by = y + h - 76 + j * 40;
        c.fillStyle = b[3]; c.font = b[4] + ' 17px Inter, sans-serif'; c.fillText(String(b[0]), x + 22, by + 20);
        c.fillStyle = b[2]; shRound(c, x + 86, by + 2, Math.max(4, bw * b[1] / mx), 28, 3); c.fill();
        c.textAlign = 'right'; c.fillStyle = b[3]; c.font = b[4] + ' 21px Inter, sans-serif'; c.fillText(lab(b[1]), x + w - 22, by + 22); c.textAlign = 'left';
      });
    }
    function drawSlide(cv, n, r) {
      var pg = n + 1; n = shOrder()[n];   // pg: the page number shown; n: which slide
      var c = cv.getContext('2d'), P = sharePlace(r), k = Math.min(Math.max(shareK(), 0), 19);
      var place = shPlaceName(r) || 'North Carolina';
      var Y = shareYear, X = shSrc(), d26 = D.days[fullDay()], SH = shShare(), pn = shPartyName();
      var dY = new Date(Date.parse(((X && X.ev_start) || (BASE && BASE[Y] && BASE[Y].ev_start) || '2022-10-20') + 'T12:00:00Z') + k * 864e5).toISOString().slice(0, 10);
      var days = k + 1, after = 'after ' + (days === 1 ? 'one day' : days + ' days') + ' of early voting';
      var src = 'NC State Board of Elections data through ' + shDayLabel(d26) + ', 2026 vs. ' + shDayLabel(dY) + ', ' + Y + '.' + (Y === '2018' ? ' 2018 lined up by days before Election Day.' : '');
      var raceNote = ' Race as listed on voter registration. *Statewide, about 62% of “Other race” voters are Hispanic or Latino.' +
        (SH ? ' Shares don’t add to 100%: voters with no race or age listed aren’t in any group.' : '') + (pn ? ' Party is registration, not vote choice.' : '');
      var grid = n < 2 || NOPROP[Y], PP = grid && shParty >= 0 ? sharePPlace(r) : null;
      if (!P || (grid && shParty >= 0 && !PP)) { shHeader(c, pg, place, 'Loading the ' + Y + ' comparison…', ''); return; }
      var whose = pn ? pn + '’' : 'all';   // "Democrats’ early and mail votes" / "all early and mail votes"
      var dekRate = votesOn() ? 'Votes cast by each group' + (pn ? ' of ' + pn : '') + ', ' + after + ', vs. the same point in ' + Y + '. 2.0× = twice as many votes as in ' + Y + '.'
        : 'Share of each group’s registered ' + (pn || 'voters') + ' who have already voted, ' + after + ', vs. the same point in ' + Y + '. 2.0× = double the ' + Y + ' pace.';
      var dekShare = 'Each group’s share of ' + whose + ' early and mail votes, ' + after + ', vs. the same point in ' + Y + '. +2.0 pts = two percentage points more of the vote than in ' + Y + '.';
      var tGrid = SH ? (pn ? 'Where ' + pn + '’ early votes are coming from' : 'Where the early vote is coming from') : (pn ? 'Which ' + pn + ' are showing up early' : 'Who’s showing up early');
      if (NOPROP[Y] && n === 0) {
        var y0 = shHeader(c, pg, place, tGrid + ', compared with ' + Y, SH ? dekShare : dekRate);
        shGrid(c, y0 + 10, r, P, k, 'all', PP);
        shFooter(c, src + raceNote);
        return;
      }
      if (!NOPROP[Y] && n < 2) {
        var y = shHeader(c, pg, place, n === 0 || SH ? tGrid + ', compared with ' + Y : 'High-propensity ' + (pn || 'voters') + ', compared with ' + Y,
          n === 0 ? (SH ? dekShare : dekRate) : SH ? dekShare : '');
        shGrid(c, y + (n === 0 ? 10 : 20), r, P, k, n === 0 ? 'low' : 'reg', PP);
        shFooter(c, src + raceNote);
        return;
      }
      // By party. Turnout rate: share of each group's registered voters who have voted. Share of votes: low- and high-propensity
      // voters' share of each party's early and mail votes (the top cards: of all three parties' votes).
      var y3 = shHeader(c, pg, place, SH ? 'Where each party’s early votes are coming from' : votesOn() ? 'Votes by party registration' : 'Turnout by party registration',
        SH ? 'Low- and high-propensity voters’ share of each party’s early and mail votes, ' + after + ', vs. the same point in ' + Y + '.' : (votesOn() ? 'Votes cast, ' : 'Share of registered voters who have already voted, ') + after + ', vs. the same point in ' + Y + '.');
      function shr(ix, den) { var a = 0, b = 0, a2 = 0, b2 = 0; ix.forEach(function (i) { a += r.pv[i]; a2 += P.pv[k][i]; }); den.forEach(function (i) { b += r.pv[i]; b2 += P.pv[k][i]; }); return b >= 100 && b2 >= 100 && a >= 10 && a2 >= 10 ? [a / b * 100, a2 / b2 * 100] : [null, null]; }
      function pr(i) { return SH ? shr([i], [i - i % 2, i - i % 2 + 1]) : shRate(r.pv[i], r.pr[i], P.pv[k][i], P.pr[i], 10); }
      function tot(off) { if (SH) return shr([off, 2 + off, 4 + off], [0, 1, 2, 3, 4, 5]); var a = 0, b = 0, a2 = 0, b2 = 0; [0, 2, 4].forEach(function (i) { a += r.pv[i + off]; b += r.pr[i + off]; a2 += P.pv[k][i + off]; b2 += P.pr[i + off]; }); return shRate(a, b, a2, b2, 10); }
      if (NOPROP[Y]) {   // no propensity split: all voters, then each party
        var all = (function () { var a = 0, b = 0, a2 = 0, b2 = 0; for (var i = 0; i < 6; i++) { a += r.pv[i]; b += r.pr[i]; a2 += P.pv[k][i]; b2 += P.pr[i]; } return shRate(a, b, a2, b2, 10); })();
        function both(j) { var i = j * 2; return shRate(r.pv[i] + r.pv[i + 1], r.pr[i] + r.pr[i + 1], P.pv[k][i] + P.pv[k][i + 1], P.pr[i] + P.pr[i + 1], 10); }
        var PS = [['Democrats', '#2E6DB4', '#A9C3E4'], ['Republicans', '#B83A32', '#E3AFAA'], ['Unaffiliated', '#8C8577', '#CFCAC0']].map(function (p, j) { return p.concat([both(j)]); });
        var mx18 = Math.max.apply(null, PS.map(function (p) { return Math.max(p[3][0] || 0, p[3][1] || 0); }).concat([all[0] || 0, all[1] || 0])) || 1;
        c.fillStyle = '#253551'; c.font = '700 30px "Zilla Slab", Georgia, serif'; c.fillText('All voters', 64, y3 + 30);
        shPartyCard(c, 64, y3 + 46, 952, 160, 'All registered voters', '', all[0], all[1], '#1F4A2C', '#B9B19F', mx18);
        var y18 = y3 + 46 + 160 + 62; c.fillStyle = '#253551'; c.font = '700 30px "Zilla Slab", Georgia, serif'; c.fillText('By party registration', 64, y18 - 16);
        PS.forEach(function (p, j) { var ch = Math.min(180, (1214 - y18 - 2 * 14) / 3); shPartyCard(c, 64, y18 + j * (ch + 14), 952, ch, p[0], '', p[3][0], p[3][1], p[1], p[2], mx18); });
        shFooter(c, src + ' Party is registration, not vote choice.');
        return;
      }
      var tl = tot(0), tr = tot(1), cw = (952 - 16) / 2;
      var mxa = Math.max(tl[0] || 0, tl[1] || 0, tr[0] || 0, tr[1] || 0) || 1;
      c.fillStyle = '#253551'; c.font = '700 30px "Zilla Slab", Georgia, serif'; c.fillText(SH ? 'All three parties' : 'All voters', 64, y3 + 30);
      shPartyCard(c, 64, y3 + 46, cw, 150, 'All low-propensity', SH ? 'share of all votes' : '', tl[0], tl[1], '#1F4A2C', '#B9B19F', mxa);
      shPartyCard(c, 64 + cw + 16, y3 + 46, cw, 150, 'All high-propensity', SH ? 'share of all votes' : '', tr[0], tr[1], '#1F4A2C', '#B9B19F', mxa);
      var yy = y3 + 46 + 150 + 62; c.fillStyle = '#253551'; c.font = '700 30px "Zilla Slab", Georgia, serif'; c.fillText('Low- and high-propensity voters, by party', 64, yy - 16);
      var PC = [['Democrats', '#2E6DB4', '#A9C3E4'], ['Republicans', '#B83A32', '#E3AFAA'], ['Unaffiliated', '#8C8577', '#CFCAC0']];
      var mxl = 0, mxr = 0; PC.forEach(function (p, j) { var a = pr(j * 2), b = pr(j * 2 + 1); mxl = Math.max(mxl, a[0] || 0, a[1] || 0); mxr = Math.max(mxr, b[0] || 0, b[1] || 0); });
      if (SH) mxl = mxr = Math.max(mxl, mxr);   // shares: one scale for both columns
      PC.forEach(function (p, j) {
        var a = pr(j * 2), b = pr(j * 2 + 1), ch = Math.min(172, (1214 - yy - 2 * 14) / 3), cy = yy + j * (ch + 14);
        shPartyCard(c, 64, cy, cw, ch, p[0], SH ? 'low-propensity share' : 'low-propensity', a[0], a[1], p[1], p[2], mxl || 1);
        shPartyCard(c, 64 + cw + 16, cy, cw, ch, p[0], SH ? 'high-propensity share' : 'high-propensity', b[0], b[1], p[1], p[2], mxr || 1);
      });
      shFooter(c, src + ' Party is registration, not vote choice.');
    }
    function shFonts() {
      if (!document.fonts || !document.fonts.load) return Promise.resolve();
      return Promise.all(['700 40px "Zilla Slab"', '400 20px Inter', '700 20px Inter', '800 20px Inter'].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
    }
    function shareFile(r, n) { return 'carolina-forward-turnout-' + (state.geo === 'state' ? 'statewide' : shPlaceName(r).toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '-' + D.days[fullDay()] + '-vs' + shareYear + (shParty >= 0 ? '-' + ['dem', 'rep', 'una'][shParty] : '') + (shShare() ? '-share' : votesOn() ? '-votes' : '') + '-' + (n + 1) + '.png'; }
    function shSave(cv, name) {
      if (!cv.toBlob) return;
      cv.toBlob(function (blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000); }, 'image/png');
    }
    function wireShare(r) {
      var box = view.querySelector('.tt-gfx'); if (!box) return;
      var cv = box.querySelector('canvas');
      function paint() { shFonts().then(function () { shLogo(function () { drawSlide(cv, shareSlide, r); }); }); }
      var yr = shareYear, dist = shDist(), store = dist ? XTD : XTS;
      if (!store[yr] && DATA_URL) {
        drawSlide(cv, shareSlide, r);
        fetch(DATA_URL.replace(/data\.json(\?.*)?$/, (dist ? 'xtab_districts' : 'xtab') + yr + '.json')).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
          .then(function (j) { store[yr] = j; if (shareYear === yr) paint(); }, function () { box.parentNode && box.parentNode.removeChild(box); });
      } else paint();
      function needP() {   // the party-split past year, when a party is picked
        var ps = dist ? XTPD : XTP;
        if (shParty < 0 || ps[yr] || ps['_' + yr] || !DATA_URL) return;
        ps['_' + yr] = true;
        fetch(DATA_URL.replace(/data\.json(\?.*)?$/, 'xtabp' + yr + '.json')).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
          .then(function (j) { ps[yr] = j; if (shareYear === yr && document.body.contains(cv)) paint(); }, function () { ps['_' + yr] = false; });
      }
      needP();
      function rerender() { var y = window.scrollY, top = box.getBoundingClientRect().top; show(); var nb = view.querySelector('.tt-gfx'); if (nb) window.scrollTo(0, y + nb.getBoundingClientRect().top - top); }
      Array.prototype.forEach.call(box.querySelectorAll('[data-shm]'), function (b) { b.addEventListener('click', function () { shMode = b.getAttribute('data-shm'); rerender(); }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-shp]'), function (b) { b.addEventListener('click', function () { shParty = +b.getAttribute('data-shp'); rerender(); }); });
      Array.prototype.forEach.call(box.querySelectorAll('[data-slide]'), function (b) {
        b.addEventListener('click', function () { shareSlide = +b.getAttribute('data-slide'); Array.prototype.forEach.call(box.querySelectorAll('[data-slide]'), function (o) { var on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); }); paint(); });
      });
      box.querySelector('.tt-shdl:not(.tt-shall)').addEventListener('click', function () { if (shSrc() && (shParty < 0 || shPSrc())) shSave(cv, shareFile(r, shareSlide)); });
      box.querySelector('.tt-shall').addEventListener('click', function () {
        if (!shSrc() || (shParty >= 0 && !shPSrc())) return;
        shFonts().then(function () { shLogo(function () {
          shLabs().forEach(function (l, n) { setTimeout(function () { var o = document.createElement('canvas'); o.width = 1080; o.height = 1350; drawSlide(o, n, r); shSave(o, shareFile(r, n)); }, n * 600); });
        }); });
      });
    }
    var leftMode = false;
    /* Who hasn't voted yet: registered (active and inactive) minus accepted ballots, by the same groups as "Voted so far". */
    function leftBlock(r) {
      var c = cmp(r), P = c && c.p, i = c ? c.idx : 0, at = HAS_ED ? 'in ' + vs + '’s early and mail voting' : 'at this point in ' + vs;
      function rows(list) {   // [label, css color, still to vote, registered, past share still to vote or null]
        return '<div class="tt-left">' + list.filter(function (x) { return x[3] > 0; }).map(function (x) {
          var pc = x[2] / x[3] * 100;
          return '<div class="tt-lr"><span class="tt-ll"><i style="background:' + x[1] + '"></i>' + x[0] + '</span><span class="tt-lb"><i style="width:' + pc.toFixed(1) + '%;background:' + x[1] + '"></i></span>' +
            '<span class="tt-lv"><b>' + fmt(x[2]) + '</b> ' + pc.toFixed(1) + '% left' + (x[4] === null || x[4] === undefined ? '' : '<em>' + x[4].toFixed(1) + '% ' + at + '</em>') + '</span></div>';
        }).join('') + '</div>';
      }
      function was(v, rg) { return P && rg ? (1 - v / rg) * 100 : null; }
      var total = r.reg - r.vc, t = '<p class="tt-pq">' + fmt(total) + ' registered voters haven’t voted yet</p>';
      if (who === 'party' || !who) {
        t += '<p class="tt-pqs">Registered voters with no accepted ballot so far, by party registration' + (P ? ', with the share left at the same point in ' + vs : '') + '.</p>' +
          rows(PARTY.map(function (p, j) { return [p[0], 'var(--p' + p[1] + ')', r.rpty[j] - r.pty[j], r.rpty[j], P && P.rp ? was(P.p[j][i], P.rp[j]) : null]; }));
      } else if (who === 'age') {
        t += '<p class="tt-pqs">By age group' + (P ? ', with the share left at the same point in ' + vs : '') + '.</p>' +
          rows(AGE.map(function (a, j) { return [a[0], 'var(--' + a[1] + ')', r.rage[j] - r.age[j], r.rage[j], P && P.ra ? was(P.a[j][i], P.ra[j]) : null]; }));
      } else if (who === 'race') {
        var L = [];
        RCODES.forEach(function (code, j) { if (r.rrace && r.rrace[j] >= 100) L.push([RLAB[code], '#8C9AB3', r.rrace[j] - r.race[j], r.rrace[j], P && P.rr && P.r ? was(P.r[j][i], P.rr[j]) : null]); });
        if (r.reth) L.push(['Hispanic or Latino', '#B07A1F', r.reth[0] - (r.eth || [0])[0], r.reth[0], P && P.re && P.e ? was(P.e[0][i], P.re[0]) : null]);
        L.sort(function (a, b) { return b[3] - a[3]; });
        t += '<p class="tt-pqs">By race and ethnicity, as listed on voter registration' + (P ? ', with the share left at the same point in ' + vs : '') + '.</p>' + rows(L);
      } else if (who === 'prop' && r.lp && r.lpr) {
        t += '<p class="tt-pqs">Registered low-propensity voters who haven’t voted yet, by party' + (P && P.lpr ? ', with the share left at the same point in ' + vs : '') + '.</p>' +
          rows([['Democrats', 'var(--pd)', 0], ['Republicans', 'var(--pr)', 1], ['Unaffiliated', 'var(--pu)', 2]].map(function (x) {
            var j = x[2]; return [x[0], x[1], r.lpr[j] - r.lp[j], r.lpr[j], P && P.lpr && P.lp ? was(P.lp[j][i], P.lpr[j]) : null]; }));
        if (r.xr && r.xv) {   // race x age x propensity: low- and high-propensity voters still to vote
          var XRL = ['Black', 'Other race*', 'Asian', 'White'], XAL = ['18–25', '26–40', '41–65', '66+'];
          t += '<p class="tt-pq tt-pq2">By race and age</p><p class="tt-pqs">How many in each group haven’t voted yet: low-propensity voters in bold, high-propensity voters below.</p>' +
            '<div class="tt-xtw"><table class="tt-xt tt-dsort"><thead><tr><th></th>' + XAL.map(function (a) { return '<th>' + a + '</th>'; }).join('') + '</tr></thead><tbody>' +
            XRL.map(function (lab, ri) {
              return '<tr><th>' + lab + '</th>' + XAL.map(function (a, ai) {
                var lo = (ri * 4 + ai) * 2, re = lo + 1;
                return '<td><b>' + fmt(r.xr[lo] - r.xv[lo]) + '</b><span>' + fmt(r.xr[re] - r.xv[re]) + '</span></td>';
              }).join('') + '</tr>';
            }).join('') + '</tbody></table></div><p class="tt-pfoot">*Statewide, about 62% of “Other race” voters are Hispanic or Latino.</p>';
        }
      } else if (who === 'new' && r.nv && r.nwr != null) {
        var N = r.nwr + (r.nv[3] || 0);
        t += '<p class="tt-pqs">People who registered in North Carolina for the first time this year and haven’t voted yet.</p>' +
          rows([['First-time registrants', 'var(--navy)', N - r.nv[0], N, P && P.nwr && P.nv ? (1 - P.nv[i][0] / P.nwr) * 100 : null]]);
      } else t += rows(PARTY.map(function (p, j) { return [p[0], 'var(--p' + p[1] + ')', r.rpty[j] - r.pty[j], r.rpty[j], null]; }));
      return t + '<p class="tt-pfoot">Registered voters are active and inactive voters in the State Board’s weekly registration file. Voters who register during early voting are added the following week.</p>';
    }
    function partyBlock(r) {
      if (!r.vc) return '';
      if (dayOn() && !r.site && r.dd && r.dd[dayI]) return dayBlock(r);
      var hasAge = !!(r.age && r.age.some(function (x) { return x; }));
      var hasProp = !!r.lp && !r.site, hasRace = !!(r.race && r.race.some(function (x) { return x; }));
      var hasNew = !!(r.nv && r.nwr != null && !r.site && !FINAL);
      if ((!hasAge && who === 'age') || (!hasProp && who === 'prop') || (!hasRace && who === 'race') || (!hasNew && who === 'new')) who = 'party';
      var isAge = who === 'age';
      var tb = function (k, label) { return '<button type="button" data-who="' + k + '" aria-pressed="' + (who === k) + '"' + (who === k ? ' class="on"' : '') + '>' + label + '</button>'; };
      var toggle = !hasAge && !hasProp ? '' : '<span class="tt-who tt-whotab" role="group" aria-label="Break down by">' + tb('party', 'Party') + (hasAge ? tb('age', 'Age') : '') + (hasRace ? tb('race', 'Race') : '') + (hasProp ? tb('prop', 'Propensity') : '') + (hasNew ? tb('new', 'New voters') : '') + '</span>';
      var head = '<div class="tt-sec tt-whosec tt-nodayp"><div class="tt-sech">Who has voted' + (r.site ? ' here' : '') + '</div>' +
        (r.site ? '<div class="tt-calsub"><span>Showing <b>' + esc(r.site) + '</b> only</span><button type="button" class="tt-linkbtn tt-allsites2">Show all of ' + esc(r.county) + ' County</button></div>' : '');
      if (r.site && r.vc < SITE_MIN) return head + '<p class="tt-pnote" style="font-size:14px;color:var(--soft)">Too few early votes here so far (' + fmt(r.vc) + ') to show a breakdown. It appears once a site reaches ' + SITE_MIN + '.</p></div>';
      var canLeft = !r.site && !FINAL && !!r.rpty;   // "Haven't voted yet": registered voters with no accepted ballot so far
      if (canLeft) head += crow('View', seg(bt('data-left', 'false', 'Voted so far', !leftMode) + bt('data-left', 'true', 'Haven\u2019t voted yet', leftMode), 'Show', 'tt-leftsw'));
      if (toggle) head += crow('By', toggle + (who === 'prop' ? lpQ() : ''));
      if (!(canLeft && leftMode) && who !== 'new') head += numCtl();
      if (canLeft && leftMode) return head + leftBlock(r) + '</div>';
      if (who === 'prop') return head + propBlock(r) + '</div>';
      if (who === 'new') return head + newBlock(r) + '</div>';
      if (who === 'race') {
        var rc = r.site ? null : cmp(r), P2 = rc && rc.p && rc.p.r ? rc.p : null;
        var bse = P2 ? (FINAL ? { votes: P2.fr, eth: P2.fe, regs: P2.rr, reth: P2.re } : { votes: P2.r.map(function (a2) { return a2[rc.idx]; }), eth: P2.e.map(function (a2) { return a2[rc.idx]; }), regs: P2.rr, reth: P2.re }) : null;
        if (bse && !bse.votes) bse = null;
        var yrs = [];   // every past year at the same point, for the year-by-year bars
        if (!r.site) Object.keys(BASE || {}).sort().reverse().forEach(function (y) {
          var cy = cmp(r, y); if (!cy || !cy.p || !cy.p.r) return;
          var v = FINAL ? cy.p.fr : cy.p.r.map(function (a2) { return a2[cy.idx]; }), ev = FINAL ? cy.p.fe : cy.p.e && cy.p.e.map(function (a2) { return a2[cy.idx]; });
          if (v && sum(v) >= PROP_MIN) yrs.push([y, v, ev]);
        });
        return head + raceView({ yrs: yrs, votes: r.race, eth: r.eth || [0, 0, 0], regs: r.rrace, reth: r.reth, regRow: r.site ? (r.regRow || r) : r, statewide: state.geo === 'state' && !r.site, base: bse,
          of: FINAL ? 'of all votes' : HAS_ED ? 'of early and mail votes' : 'of votes so far', when: FINAL ? 'in ' + vs : HAS_ED ? 'in ' + vs + '\u2019s early and mail voting' : 'at this point in ' + vs,
          cmpHead: 'Compared with ' + (FINAL ? vs : HAS_ED ? 'early and mail voting in ' + vs : 'the same point in ' + vs), rates: !r.site, wasText: FINAL ? 'in ' + vs : HAS_ED ? 'in ' + vs + ' early and mail voting' : 'at this point in ' + vs,
          whoBlank: r.site ? 'early voters here' : FINAL ? 'voters' : 'voters so far' }) + '</div>';
      }
      if (!hasAge) head = head.replace('Who has voted' + (r.site ? ' here' : ''), 'Who has voted' + (r.site ? ' here' : '') + ', by party registration');
      var sumv = (isAge ? r.age : r.pty).reduce(function (a2, b2) { return a2 + b2; }, 0);
      var regs = isAge ? r.rage : r.rpty, rates = '', c = r.site ? null : cmp(r);
      if (regs && c && c.then) {
        var bp = isAge ? c.p.a : c.p.p, br = isAge ? c.p.ra : c.p.rp, bf = isAge ? c.p.fa : c.p.fp, LL = isAge ? AGE : PARTY, rowsD = [], mx = 0;
        LL.forEach(function (g, i) {
          var nowR = regs[i] ? (isAge ? r.age : r.pty)[i] / regs[i] * 100 : null;
          var thenR = br[i] ? (FINAL ? bf[i] : bp[i][c.idx]) / br[i] * 100 : null;
          rowsD.push([g, nowR, thenR, [(isAge ? r.age : r.pty)[i], FINAL ? bf[i] : bp[i][c.idx]]]); mx = Math.max(mx, nowR || 0, thenR || 0);
        });
        mx = Math.min(100, Math.ceil(mx * 1.15 / 10) * 10 || 10);
        var gap = FINAL ? 'their ' + vs + ' turnout' : HAS_ED ? vs + '’s early and mail pace' : vs + '’s pace';
        var NOUN = isAge ? ['Voters 18–25', 'Voters 26–40', 'Voters 41–65', 'Voters 66 and older'] : ['Democrats', 'Republicans', 'Unaffiliated voters', 'Other-party voters'];
        var ahead = [], behind = [], even = [];
        rowsD.forEach(function (d, i) {
          if (d[1] === null || d[2] === null || (!isAge && i === 3)) return;   // small "Other" group stays out of the sentence
          var x = d[1] - d[2];
          (x >= 0.2 ? ahead : x <= -0.2 ? behind : even).push(NOUN[i]);
        });
        function lc(t) { return t.replace(/^(Voters|Unaffiliated|Other)/, function (m) { return m.toLowerCase(); }); }
        function join(a) { return a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
        function list(a) {
          if (isAge) return a.length === 4 ? 'All age groups' : 'Voters ' + join(a.map(function (x) { return x.replace(/^Voters /, ''); }));
          return join(a.map(function (x, j) { return j ? lc(x) : x; }));
        }
        var parts = [];
        if (ahead.length) parts.push(list(ahead) + ' are ' + (FINAL ? 'above ' : 'ahead of ') + gap);
        if (behind.length) parts.push(parts.length ? lc(list(behind)) + ' are ' + (FINAL ? 'below' : 'behind') : list(behind) + ' are ' + (FINAL ? 'below ' : 'behind ') + gap);
        if (even.length) parts.push(parts.length ? lc(list(even)) + ' are about even' : list(even) + ' are about even with ' + (FINAL ? 'their ' + vs + ' turnout' : vs));
        var lede = parts.length ? '<b>' + parts[0] + '</b>' + (parts.length > 1 ? '; ' + parts.slice(1).join('; ') : '') + '. ' : '';
        rates = rateLede(isAge ? 'age group' : 'group') +
          scoreRows(rowsD, isAge, FINAL ? 'in ' + vs : HAS_ED ? 'in ' + vs + ' early and mail voting' : 'at this point in ' + vs);
      } else if (regs && !r.site) {
        rates = rateLede(isAge ? 'age group' : 'group') +
          scoreRows((isAge ? AGE : PARTY).map(function (p, i) { var v = isAge ? r.age : r.pty; return [p, regs[i] ? v[i] / regs[i] * 100 : null, null, [v[i], null]]; }), isAge, '');
      }
      var bar = '', leg = '', L = isAge ? AGE : PARTY.map(function (p) { return [p[0], p[1]]; }), vals = isAge ? r.age : r.pty;
      var LPp = legPct(vals);
      L.forEach(function (p, i) {
        var x = vals[i], w = x / (sumv || 1) * 100;
        if (x) bar += '<span class="tt-ps ' + p[1] + '" style="width:' + w.toFixed(2) + '%"></span>';
        leg += '<span class="tt-pk"><i class="' + p[1] + '"></i>' + p[0] + ' <b>' + fmt(x) + '</b><em>' + LPp[i] + '%</em></span>';
      });
      var yrows = [];
      if (!r.site) Object.keys(BASE || {}).sort().reverse().forEach(function (y) {
        var cy = cmp(r, y); if (!cy || !cy.p) return;
        var v = FINAL ? (isAge ? cy.p.fa : cy.p.fp) : (isAge ? cy.p.a : cy.p.p).map(function (a) { return a[cy.idx]; });
        if (v && sum(v) >= PROP_MIN) yrows.push([y, v]);
      });
      var top = yrows.length
        ? '<p class="tt-yscap">' + (isAge ? 'Votes by age' : 'Votes by party registration') + (FINAL ? ', each year' : HAS_ED ? ', early and mail votes, each year' : ', at the same point in each year') + '</p>' +
          yearStack([['2026', vals]].concat(yrows), isAge ? ['var(--a1)', 'var(--a2)', 'var(--a3)', 'var(--a4)'] : ['var(--pd)', 'var(--pr)', 'var(--pu)', 'var(--po)'], isAge ? ['var(--navy)', 'var(--navy)'] : [0, 0, 0, 'var(--navy)'])
        : '<div class="tt-pbar" role="img" aria-label="Votes cast by ' + (isAge ? 'age' : 'party registration') + '">' + bar + '</div>';
      return head + top + '<div class="tt-pleg">' + leg + '</div>' + (votesOn() ? '' : shareSentences(r, c, isAge, sumv)) + rates +
        '<div class="tt-pnote">' + (isAge ? (FINAL ? 'All voters, including Election Day. ' : HAS_ED ? 'Early and mail votes only. ' : '') + 'Age as listed in the State Board file. Mail voters tend to be older than early in-person voters.' : (FINAL ? 'All voters, including Election Day. ' : HAS_ED ? 'Early and mail votes only; the State Board doesn\'t report Election Day voters by party or age until weeks later. ' : '') + 'Party registration, not vote choice: in a general election, every voter can vote for any candidate, whatever their party.') + '</div></div>';
    }

    /* 2026 candidates on a district's page (candidates.json, the district lean widget's list) */
    var CAND_COL = { D: 'var(--pd)', R: 'var(--pr)' };
    function candLine(r) {
      if (!/^(cd|hd|sd)$/.test(state.geo)) return '';
      var C = side('candidates.json'), c = C && C[state.geo] ? C[state.geo][r.name] : null;
      if (!c || !c.length) return '';
      return '<div class="tt-cands"><span class="tt-candl">On the ballot</span>' + c.map(function (q) {
        return '<span><i class="tt-cp" style="background:' + (CAND_COL[q[1]] || '#6b6b6b') + '">' + esc(q[1]) + '</i>' + esc(q[0]) + (q[2] ? '<small>incumbent</small>' : '') + '</span>'; }).join('') +
        (c.some(function (q) { return q[2]; }) ? '' : '<span><small style="margin:0">Open seat</small></span>') + '</div>';
    }

    /* Party split on a day of early voting, 2026 and each past year: that day's early in-person votes (or every day through it),
       by party registration, as shares or as votes. Years line up by day of early voting, as on the chart. */
    var psDay = null, psThru = false, psVotes = false, PS_P = [['Dem.', '#2E6DB4'], ['Rep.', '#B83A32'], ['Unaff.', '#8C8577'], ['Other', '#CFC9BC']];
    function isoAdd(iso, n) { return new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10); }
    function psSum(dd, i, thru) {
      if (!dd) return null; var a = [0, 0, 0, 0], any = false;
      for (var j = thru ? 0 : i; j <= i; j++) { var x = dd[j]; if (!x) continue; any = true; for (var q = 0; q < 4; q++) a[q] += x[q] || 0; }
      return any ? a : null;
    }
    function psLast(r) { var l = -1; EV_DAYS.forEach(function (d, i) { if (d < D.asof && r.dd && r.dd[i]) l = i; }); return l; }
    function dayPartyRows(r) {
      var last = psLast(r), i = psDay !== null ? psDay : dayI !== null ? dayI : Math.max(0, last);
      var rows = ['2026'].concat(Object.keys(BASE || {}).sort().reverse()).map(function (y) {
        var dd = y === '2026' ? r.dd : (baseRow(r, y) || {}).dd, a = y === '2026' && EV_DAYS[i] >= D.asof ? null : psSum(dd, i, psThru);
        return { y: y, a: a, date: y === '2026' ? EV_DAYS[i] : isoAdd(BASE[y].ev_start, i) };
      }).filter(function (q) { return q.y === '2026' || q.a; });
      return { i: i, rows: rows };
    }
    function dayPartyBlock(r) {
      if (!r.dd || !BASE) return '';
      var P = dayPartyRows(r), i = P.i; if (P.rows.length < 2) return '';
      var opts = EV_DAYS.map(function (d, j) { return '<option value="' + j + '"' + (j === i ? ' selected' : '') + '>Day ' + (j + 1) + ' · ' + WDS[dow(d)] + ' ' + apDate(d) + '</option>'; }).join('');
      var cell = function (a, q) { var n = dayN(a); return psVotes ? fmt(a[q]) : n ? (a[q] / n * 100).toFixed(1) + '%' : '—'; };
      var net = function (a) { var n = dayN(a), m = a[0] - a[1];
        if (psVotes) { var c = m > 0 ? 'var(--pd)' : m < 0 ? 'var(--pr)' : 'var(--ink)'; return '<span style="color:' + c + ';font-weight:700">' + (!m ? 'even' : (m > 0 ? 'D' : 'R') + ' +' + fmt(Math.abs(m))) + '</span>'; }
        var v = n ? m / n * 100 : null; return v === null ? '—' : '<span style="color:' + (v > 0.05 ? 'var(--pd)' : v < -0.05 ? 'var(--pr)' : 'var(--ink)') + ';font-weight:700">' + dr(v, 1) + '</span>'; };
      var bar = function (a) { var n = dayN(a); return '<span class="tt-psbar" aria-hidden="true">' + PS_P.map(function (q, j) { return '<i style="width:' + (n ? a[j] / n * 100 : 0).toFixed(2) + '%;background:' + q[1] + '"></i>'; }).join('') + '</span>'; };
      var when = psThru ? 'Days 1–' + (i + 1) : 'Day ' + (i + 1);
      return '<div class="tt-dps" data-csv="dps"><h4>Party split by day, compared with past years</h4>' +
        crow('Day', '<select class="tt-pssel" data-psday aria-label="Day of early voting">' + opts + '</select>') +
        crow('Count', seg(bt('data-psthru', '0', 'That day', !psThru) + bt('data-psthru', '1', 'Through that day', psThru), 'That day or through that day')) +
        crow('Show', seg(bt('data-psv', '0', 'Share', !psVotes) + bt('data-psv', '1', 'Votes', psVotes), 'Share or votes')) +
        '<div class="tt-rkw"><table class="tt-rkt tt-pst tt-fit"><thead><tr><th style="text-align:left;padding:7px 6px">Year</th>' + PS_P.map(function (q, j) { return '<th' + (j >= 2 ? ' class="tt-hide-s"' : '') + ' style="padding:7px 6px">' + q[0] + '</th>'; }).join('') +
        '<th style="padding:7px 6px">D − R</th><th style="padding:7px 6px">Votes</th>' + (psVotes ? '' : '<th class="tt-hide-s tt-hide-csv" style="padding:7px 6px"></th>') + '</tr></thead><tbody>' +
        P.rows.map(function (q) {
          var a = q.a, lab = '<td style="text-align:left">' + q.y + ' <small class="tt-psd">' + (psThru ? 'through ' : '') + WDS[dow(q.date)] + ' ' + apDate(q.date) + '</small></td>';
          if (!a) return '<tr class="now">' + lab + '<td colspan="' + (psVotes ? 6 : 7) + '" style="text-align:left;color:var(--mute);font-weight:400">Not yet reported</td></tr>';
          return '<tr' + (q.y === '2026' ? ' class="now"' : '') + '>' + lab + PS_P.map(function (_, j) { return '<td' + (j >= 2 ? ' class="tt-hide-s"' : '') + '>' + cell(a, j) + '</td>'; }).join('') +
            '<td>' + net(a) + '</td><td>' + fmt(dayN(a)) + '</td>' + (psVotes ? '' : '<td class="tt-hide-s tt-hide-csv" style="width:110px">' + bar(a) + '</td>') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="tt-calsub2" style="margin-top:8px">' + when + ' of early voting: early in-person votes only, by party registration, not vote choice. ' +
        (psVotes ? 'More people are registered than in past years, so counts tend to rise even when the split doesn’t change.' : 'Shares are of that ' + (psThru ? 'stretch’s' : 'day’s') + ' early in-person votes.') +
        (state.geo !== 'state' && state.geo !== 'county' ? ' Past years use today’s district lines.' : '') + '</p><div class="tt-dlrow">' + csvBtn() + '</div></div>';
    }

    /* Election Day in past years: votes cast at the polls on Election Day (in person, curbside, provisional, transfer), their share
       of all votes, and their party mix, next to early and mail voters' (edhist.json, from the State Board's final history counts). */
    var ED_YRS = ['2024', '2022', '2020', '2018'];
    function edOf(E, y, r) { var Y = E.years[y], k = state.geo; if (!Y) return null; return k === 'state' ? Y.state : (Y[k] || {})[r.name] || null; }
    /* Election Day in past years, by precinct (pct_ed/<year>.json, from build_pct_ed.py): each past year's final Election Day
       and early-and-mail votes from the State Board's voter history counts, placed on TODAY's precinct lines (each past
       precinct spread over today's precincts like its voters who still live at the same address). For poll greeters: where
       Election Day voting has been heaviest. Counties and districts only; a precinct under 10 Election Day votes has no counts. */
    var EDP = {}, edpYr = '2022', edpM = 'share', edpSort = { k: 'ed', d: -1 }, edpAll = false;
    var EDP_M = { share: 'Share of votes cast on Election Day', votes: 'Election Day votes', rate: 'Election Day votes per 100 registered', party: 'Election Day party split' };
    function edpFile(y) {   // undefined while loading, null if it can't load
      if (EDP[y] !== undefined) return EDP[y];
      if (!pctLoading['edp' + y]) { pctLoading['edp' + y] = 1; pctFetch('pct_ed/' + y + '.json', function (j) { EDP[y] = j || null; pctRedraw(); }); }
      return undefined;
    }
    function edpRows(F) {
      return pctRows().map(function (row) {
        var code = row.name.slice(row.county.length + 1), v = ((F.c || {})[row.county] || {})[code] || null, g = ((F.reg || {})[row.county] || {})[code] || 0;
        var o = { name: row.name, county: row.county, code: code, label: row.label, path: row.path, reg: g, ed: null, share: null, rate: null, party: null, emparty: null };
        if (v) {
          var ed = v[0] + v[1] + v[2] + v[3], em = v[4] + v[5] + v[6] + v[7];
          o.ed = ed; o.share = ed + em ? ed / (ed + em) * 100 : null; o.rate = g >= 20 ? Math.min(100, ed / g * 100) : null;
          o.party = ed ? (v[0] - v[1]) / ed * 100 : null; o.emparty = em >= (F.min || 10) ? (v[4] - v[5]) / em * 100 : null;
        }
        return o;
      });
    }
    function edpVal(o) { return o[edpM === 'votes' ? 'ed' : edpM]; }
    function edpColor(x, mx) {
      if (x === null || x === undefined) return 'url(#tth)';
      if (edpM === 'party') { var t = Math.min(Math.abs(x) / 50, 1); return Math.abs(x) < 0.5 ? '#F3F0EA' : tierMix(x > 0 ? '#2E6DB4' : '#B83A32', 1 - (0.12 + 0.88 * t)); }
      return tierMix('#253551', 1 - (0.08 + 0.92 * Math.max(0, Math.min(x / (mx || 1), 1))));
    }
    function edpFmt(o, m) {
      var x = o[m]; if (x === null || x === undefined) return '\u2014';
      if (m === 'ed') return fmt(x);
      if (m === 'party' || m === 'emparty') return dr(x, 0);
      return m === 'rate' ? x.toFixed(1) : x.toFixed(1) + '%';
    }
    function edpCap(o) {
      if (!o) return '<span class="tt-hint">Tap or hover over a precinct.</span>';
      if (o.ed === null) return '<b>' + esc(o.label) + '</b>: hidden for privacy (fewer than 10 Election Day votes in ' + edpYr + ', or a nearby small precinct).';
      return '<b>' + esc(o.label) + '</b>: ' + fmt(o.ed) + ' Election Day ' + (o.ed === 1 ? 'vote' : 'votes') + ' in ' + edpYr + (o.share === null ? '' : ', ' + o.share.toFixed(0) + '% of all votes') +
        (o.party === null ? '' : '; Election Day voters were <b style="color:' + (o.party > 0.5 ? 'var(--pd)' : o.party < -0.5 ? 'var(--pr)' : 'var(--ink)') + '">' + dr(o.party, 0) + '</b> by party registration') + '.';
    }
    var edpPick = null;
    function edpBlock(r) {
      if (state.geo === 'state') return '<div class="tt-edp"><div class="tt-shh">By precinct</div><p class="tt-pnote" style="margin-top:0">Pick a county or district to see where Election Day voting has been heaviest, precinct by precinct.</p></div>';
      var F = edpFile(edpYr), head = '<div class="tt-edp" data-csv="edp"><div class="tt-shh">By precinct</div>' +
        crow('Year', seg(ED_YRS.map(function (y) { return bt('data-edpy', y, y, y === edpYr); }).join(''), 'Year')) +
        crow('Map', seg(Object.keys(EDP_M).map(function (m) { return bt('data-edpm', m, { share: 'Share on Election Day', votes: 'Votes', rate: 'Per 100 registered', party: 'Party split' }[m], m === edpM); }).join(''), 'Color the map by'));
      if (F === null) return head + '<p class="tt-mnote">Precinct counts for ' + edpYr + ' aren\u2019t available right now.</p></div>';
      if (F === undefined || !pctNeed()) return head + '<p class="tt-mnote">Loading precincts\u2026</p></div>';
      var rows = edpRows(F), shown = rows.filter(function (o) { return o.path; });
      if (!rows.length) return '';
      var vals = shown.map(edpVal).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
      var mx = edpM === 'party' ? 50 : vals.length ? vals[Math.floor((vals.length - 1) * 0.95)] : 1;
      if (edpM === 'share' || edpM === 'rate') mx = Math.max(mx, 1);
      var dm = pctDims(), sw = Math.max(dm.w, dm.h) / 700;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dm.w.toFixed(1) + ' ' + dm.h.toFixed(1) + '" role="img" aria-label="' + esc(EDP_M[edpM] + ' by precinct, ' + edpYr) + '">' + hatchDefs(dm.w) +
        '<style>path{stroke:#fff;stroke-width:' + sw.toFixed(2) + 'px}</style><g transform="translate(' + (-dm.x).toFixed(1) + ',' + (-dm.y).toFixed(1) + ')">' +
        shown.map(function (o) { return '<path d="' + o.path + '" fill="' + edpColor(edpVal(o), mx) + '" data-edp="' + esc(o.name) + '"' + (o.name === edpPick ? ' class="on"' : '') + '></path>'; }).join('') + '</g></svg>';
      var lfmt = function (x) { return edpM === 'votes' ? fmt(Math.round(x)) : edpM === 'party' ? dr(x, 0) : Math.round(x) + (edpM === 'share' ? '%' : ''); };
      var grad = edpM === 'party' ? 'linear-gradient(90deg,' + edpColor(-50) + ',#F3F0EA,' + edpColor(50) + ')' : 'linear-gradient(90deg,' + edpColor(0, mx) + ',' + edpColor(mx, mx) + ')';
      var leg = '<div class="tt-edpleg"><span>' + (edpM === 'party' ? 'R+50' : lfmt(0)) + '</span><span class="bar" style="background:' + grad + '"></span><span>' + (edpM === 'party' ? 'D+50' : lfmt(mx) + ' or more') + '</span>' +
        (shown.some(function (o) { return o.ed === null; }) ? '<span><i style="background:repeating-linear-gradient(45deg,#F1EDE4 0 3px,#C9C2B3 3px 4px)"></i>Too few votes to show</span>' : '') + '</div>';
      var get = function (o, k) { return k === 'name' ? o.label : o[k]; };
      rows.sort(bySort(edpSort, get));
      var list = edpAll || csvAll ? rows : rows.slice(0, 15), n = rows.length, na = '<span class="tt-na">\u2014</span>';
      var drp = function (x) { return x === null ? na : '<b style="color:' + (x > 0.5 ? 'var(--pd)' : x < -0.5 ? 'var(--pr)' : 'var(--ink)') + '">' + dr(x, 0) + '</b>'; };
      var cols = [['name', 'Precinct', ''], ['ed', 'Election Day votes', ''], ['share', 'Share of all votes', ''], ['rate', 'Per 100 registered', 'tt-hide-s'], ['party', 'D \u2212 R', ''], ['emparty', 'Early &amp; mail D \u2212 R', 'tt-hide-s']];
      return head + '<div class="tt-edpmap">' + svg + '</div>' + leg + '<p class="tt-edpcap" aria-live="polite">' + edpCap(rows.filter(function (o) { return o.name === edpPick; })[0]) + '</p>' +
        '<div class="tt-rkw"><table class="tt-rkt tt-ptt tt-edpt tt-fit"><thead><tr>' + cols.map(function (c) { return sortTh('data-edps', c[0], c[1], edpSort, c[2]); }).join('') +
        '<th class="tt-csvonly">County</th><th class="tt-csvonly">Precinct code</th><th class="tt-csvonly">Registered then</th></tr></thead><tbody>' +
        list.map(function (o) {
          return '<tr><td>' + esc(o.label) + '</td><td><b>' + (o.ed === null ? na : fmt(o.ed)) + '</b></td><td>' + (o.share === null ? na : o.share.toFixed(1) + '%') + '</td><td class="tt-hide-s">' + (o.rate === null ? na : o.rate.toFixed(1)) + '</td><td>' + drp(o.party) + '</td><td class="tt-hide-s">' + drp(o.emparty) + '</td>' +
            '<td class="tt-csvonly">' + esc(o.county) + '</td><td class="tt-csvonly">' + esc(o.code) + '</td><td class="tt-csvonly">' + (o.reg || '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (n > 15 ? '<button type="button" class="tt-more tt-edpall">' + (edpAll ? 'Show the top 15' : 'Show all ' + n + ' precincts') + '</button>' : '') +
        '<div class="tt-dlrow"><button type="button" class="tt-shdl tt-csvdl">Download precincts (CSV)</button></div>' +
        '<p class="tt-pfoot">' + edpYr + ' votes on today\u2019s precinct lines: each ' + edpYr + ' precinct is spread over today\u2019s precincts in the same proportions as its voters who still live at the same address. ' +
        'Per 100 registered: Election Day votes for every 100 people registered there in ' + edpYr + '. Early &amp; mail D \u2212 R is the same precinct\u2019s early in-person and mail voters, for contrast. ' +
        'A dash: fewer than ' + (F.min || 10) + ' Election Day votes, or hidden so a nearby small precinct\u2019s count can\u2019t be worked out. Final counts from the State Board\u2019s voter history files. Party is registration, not vote choice.</p></div>';
    }
    function edBlock(r) {
      if (!/^(state|county|cd|hd|sd)$/.test(state.geo)) return '';
      var E = side('edhist.json');
      if (E === undefined) return '<div class="tt-sec tt-edh tt-nodl"><div class="tt-sech">Election Day in past years</div><p class="tt-mnote">Loading…</p></div>';
      if (!E) return '';
      var V = votesOn(), rows = ED_YRS.map(function (y) { var b = edOf(E, y, r); if (!b) return null;
        var ed = b[0], em = [0, 1, 2, 3].map(function (j) { return b[1][j] + b[2][j]; }), nE = dayN(ed), nM = dayN(em);
        return { y: y, ed: ed, em: em, nE: nE, nM: nM, all: nE + nM }; }).filter(function (q) { return q && q.all; });
      if (!rows.length) return '';
      var pc = function (a, j, n) { return V ? fmt(a[j]) : n ? (a[j] / n * 100).toFixed(1) + '%' : '—'; };
      var net = function (a, n) { var m = a[0] - a[1];
        if (V) return '<span style="color:' + (m > 0 ? 'var(--pd)' : m < 0 ? 'var(--pr)' : 'var(--ink)') + ';font-weight:700">' + (!m ? 'even' : (m > 0 ? 'D' : 'R') + ' +' + fmt(Math.abs(m))) + '</span>';
        var v = n ? m / n * 100 : null; return v === null ? '—' : '<span style="color:' + (v > 0.05 ? 'var(--pd)' : v < -0.05 ? 'var(--pr)' : 'var(--ink)') + ';font-weight:700">' + dr(v, 1) + '</span>'; };
      var m22 = rows.filter(function (q) { return q.y === '2022'; })[0], lede = '';
      if (m22 && m22.nE && m22.nM) { var a = (m22.ed[0] - m22.ed[1]) / m22.nE * 100, b = (m22.em[0] - m22.em[1]) / m22.nM * 100;
        lede = '<p class="tt-lede">In 2022, the last midterm, <b>' + fmt(m22.nE) + '</b> people voted on Election Day here, <b>' + (m22.nE / m22.all * 100).toFixed(1) + '%</b> of all votes. By party registration, Election Day voters were <b>' + dr(a, 0) + '</b>; early and mail voters were <b>' + dr(b, 0) + '</b>.</p>'; }
      var th = function (s, cls) { return '<th' + (cls ? ' class="' + cls + '"' : '') + ' style="padding:7px 6px">' + s + '</th>'; };
      return '<div class="tt-sec tt-edh" data-csv="edh"><div class="tt-sech">Election Day in past years<span>2018–2024, final</span></div>' + lede + numCtl() +
        '<div class="tt-rkw"><table class="tt-rkt tt-fit"><thead><tr><th style="text-align:left;padding:7px 6px">Year</th>' + th('Election Day votes') + th('Share of all votes') +
        th('Dem.', 'tt-hide-s') + th('Rep.', 'tt-hide-s') + th('Unaff.', 'tt-hide-s') + th('Other', 'tt-hide-s') + th('D − R') + th('Early &amp; mail D − R') + '</tr></thead><tbody>' +
        rows.map(function (q) {
          return '<tr><td style="text-align:left">' + q.y + '</td><td><b>' + fmt(q.nE) + '</b></td><td>' + (q.nE / q.all * 100).toFixed(1) + '%</td>' +
            [0, 1, 2, 3].map(function (j) { return '<td class="tt-hide-s">' + pc(q.ed, j, q.nE) + '</td>'; }).join('') +
            '<td>' + net(q.ed, q.nE) + '</td><td>' + net(q.em, q.nM) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="tt-pnote">Election Day votes are ballots cast at the polls on Election Day: in person, curbside, provisional and transfer. ' + (V ? 'Party columns are Election Day votes by party; D − R is Democratic minus Republican votes.' : 'Party columns are shares of Election Day votes.') +
        ' Final counts from the State Board’s voter history files. Party is registration, not vote choice.' +
        (state.geo === 'cd' || state.geo === 'hd' || state.geo === 'sd' ? ' Past years use today’s district lines: each past precinct is counted in the district that holds most of its voters.' : '') + '</p>' +
        '<div class="tt-dlrow">' + csvBtn() + '</div>' + edpBlock(r) + '</div>';
    }

    function short(n) { return n < 1000 ? fmt(n) : n < 1e5 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : Math.round(n / 1000) + 'K'; }   // bar labels; the caption shows the full number
    /* Past years on the day-by-day chart: any of them can be laid over the 2026 bars as a colored tick on each day, lined up
       by day of early voting (every year here starts early voting on a Thursday). Early in-person votes only, like the bars. */
    var calYrs = [], CAL_COL = { 2024: '#F08C00', 2022: '#7E3FB0', 2020: '#18A9C7', 2018: '#8A8A8A' };   // set apart from 2026's dark green and from party blue and red
    function calPast(r, y) { var p = baseRow(r, y); if (!p || !p.dd) return null; return EV_DAYS.map(function (d, i) { return p.dd[i] ? dayN(p.dd[i]) : null; }); }
    var calParty = false, CAL_PTY = [['Democrats', 'var(--pd)', '#2E6DB4'], ['Republicans', 'var(--pr)', '#B83A32'], ['Unaffiliated', '#8C8577', '#8C8577'], ['Other', '#CFC9BC', '#CFC9BC']];
    function calYrRow(r) {
      var prow = r.dd ? crow('Show', seg(bt('data-calp', '0', 'Total', !calParty) + bt('data-calp', '1', 'By party', calParty), 'Total or by party')) : '';
      if (calParty && r.dd) return prow.replace("crow('Show'", "crow('Show'") + '<p class="tt-calsub2">Each day\u2019s early in-person votes by party registration (not vote choice). <span class="tt-hint">Switch to Total to compare past years.</span></p>';
      var yrs = Object.keys(BASE || {}).sort().reverse().filter(function (y) { return calPast(r, y); });
      calYrs = calYrs.filter(function (y) { return yrs.indexOf(y) >= 0; });
      if (!yrs.length) return prow;
      return prow + crow('Compare with', seg(yrs.map(function (y) { var on = calYrs.indexOf(y) >= 0;
        return '<button type="button" data-calyr="' + y + '" aria-pressed="' + on + '"' + (on ? ' class="on"' : '') + '><i class="tt-calsw" style="background:' + CAL_COL[y] + '"></i>' + y + '</button>'; }).join(''), 'Lay past years over the chart', 'tt-calyrs')) +
        '<p class="tt-calsub2' + (calYrs.length ? '' : ' tt-hint') + '">' + (calYrs.length ? 'Years line up by day of early voting, not by calendar date: each year\u2019s first day of early voting sits over Oct. 15.' : 'Pick one or more years to lay their early in-person votes on each day over 2026\u2019s bars.') + '</p>';
    }
    function drawCal(el, r) {
      var vals = [], max = 0, last = -1, canDay = !!(r.dd && r.dd.length);   // a place's day can be picked; a single site's can't
      EV_DAYS.forEach(function (day, i) {
        var j = D.days.indexOf(day), v = (day >= D.asof || j === -1) ? null : (r.tev[j] || 0);   // the file date itself is partial
        vals.push(v); if (v !== null) last = i; if (v > max) max = v;
      });
      var PM = calParty && !!r.dd;   // by party: each bar split by the day's party mix
      var past = {}; if (!r.site && r.dd && !PM) calYrs.forEach(function (y) { var a = calPast(r, y); if (a) { past[y] = a; a.forEach(function (x) { if (x > max) max = x; }); } });
      var dayof = el.parentNode.querySelector('.tt-dayof');
      dayof.textContent = D.asof > '2026-10-31' ? 'Oct. 15–31, final' : last >= 0 ? 'Day ' + (last + 1) + ' of 17' : 'Oct. 15–31';
      var h = '';
      EV_DAYS.forEach(function (day, i) {
        var cls = 'tt-d' + (vals[i] === null ? ' fut' : canDay ? ' can' : '') + (dow(day) === 6 ? ' sat' : '') + (canDay && dayI === i ? ' lock' : '') + (canDay && thruOn() && i > dayI ? ' after' : '');
        h += '<div class="' + cls + '" data-i="' + i + '"><div class="tt-v">' + (vals[i] === null ? '' : short(vals[i])) + '</div>' +
          '<div class="tt-col">' + (function () {   // layered: the shortest bar in front, so each color shows its own increment
            var L = [['2026', vals[i]]].concat(Object.keys(past).map(function (y) { return [y, past[y][i]]; })).filter(function (q) { return q[1] !== null; });
            L.sort(function (a, b) { return b[1] - a[1]; });
            var z = {}; L.forEach(function (q, n) { z[q[0]] = n + 1; });
            var grad = '';
            if (PM && r.dd[i]) { var x = r.dd[i], n = x[0] + x[1] + x[2] + x[3], acc = 0;
              grad = ';background:linear-gradient(to top,' + CAL_PTY.map(function (q, j2) { var a0 = acc; acc += n ? x[j2] / n * 100 : 0; return q[2] + ' ' + a0.toFixed(1) + '% ' + acc.toFixed(1) + '%'; }).join(',') + ')'; }
            return '<div class="tt-b" style="z-index:' + (z['2026'] || 1) + grad + '" data-h="' + (max && vals[i] ? (vals[i] / max * 100).toFixed(1) : 0) + '"></div>' +
              Object.keys(past).map(function (y) { var x = past[y][i]; return x === null ? '' : '<i class="tt-pb" style="z-index:' + z[y] + ';height:' + (max && x ? x / max * 100 : 0).toFixed(1) + '%;background:' + CAL_COL[y] + '"></i>'; }).join('');
          })() + '</div>' +
          '<div class="tt-dl">' + WD[dow(day)].charAt(0) + '<b>' + (+day.slice(8)) + '</b></div></div>';
      });
      el.innerHTML = h;
      el.classList.toggle('cmp', Object.keys(past).length > 0); el.classList.toggle('party', PM);
      var oldLeg = el.parentNode.querySelector('.tt-calleg'); if (oldLeg) oldLeg.parentNode.removeChild(oldLeg);
      if (PM) el.insertAdjacentHTML('afterend', '<div class="tt-calleg">' + CAL_PTY.map(function (q) { return '<span><i style="background:' + q[2] + '"></i>' + q[0] + '</span>'; }).join('') + '</div>');
      else if (Object.keys(past).length) el.insertAdjacentHTML('afterend', '<div class="tt-calleg"><span><i style="background:var(--ev)"></i>2026</span>' +
        Object.keys(past).sort().reverse().map(function (y) { return '<span><i style="background:' + CAL_COL[y] + '"></i>' + y + ' (same day of early voting)</span>'; }).join('') + '</div>');
      var note = el.parentNode.querySelector('.tt-calnote'), cols = el.querySelectorAll('.tt-d'), cur = last;
      function pick(i) {
        if (i < 0) { note.textContent = preEV ? 'Early voting sites open Thursday, Oct. 15, and close at 3 p.m. Saturday, Oct. 31.' : 'No early votes reported here yet.'; return; }
        cur = Math.max(0, Math.min(16, i));
        Array.prototype.forEach.call(cols, function (c, j) { c.classList.toggle('sel', j === cur && vals[j] !== null); });
        var d = EV_DAYS[cur];
        note.textContent = (vals[cur] === null ? WDL[dow(d)] + ', ' + apDate(d) + ': not yet reported.'
          : WDL[dow(d)] + ', ' + apDate(d) + ': ' + fmt(vals[cur]) + ' early ' + (vals[cur] === 1 ? 'vote' : 'votes') + ' (day ' + (cur + 1) + ' of 17).') +
          Object.keys(past).sort().reverse().map(function (y) { var x = past[y][cur]; return x === null ? '' : ' ' + y + ', day ' + (cur + 1) + ': ' + fmt(x) + '.'; }).join('');
        if (canDay && thruOn() && cur === dayI && vals[cur] !== null) {   // through a day: the running total, not just that day
          var tot = vals.slice(0, cur + 1).reduce(function (a, b) { return a + (b || 0); }, 0);
          note.textContent = 'Through ' + WDL[dow(d)] + ', ' + apDate(d) + ': ' + fmt(tot) + ' early votes in the first ' + (cur + 1) + ' days of early voting (' + fmt(vals[cur]) + ' that day).';
        }
      }
      var home = canDay && dayI !== null && vals[dayI] !== null ? dayI : last;
      pick(home);
      if (canDay && last >= 0) el.parentNode.querySelector('.tt-calnote').insertAdjacentHTML('afterend', '<div class="tt-calhint">' +
        (dayI === null ? (Object.keys(past).length ? 'Click a day to compare the years, and to switch the whole tracker to that day.' : 'Pick a day in the \u201cShowing\u201d bar at the top, or click a day here, to switch the whole tracker to that day.') : 'Click the day again, or <button type="button" class="tt-linkbtn tt-alldays">show all votes so far</button>.') + '</div>');
      Array.prototype.forEach.call(cols, function (c, j) {
        c.addEventListener('mouseenter', function () { pick(j); });
        c.addEventListener('click', function (ev) {
          pick(j);
          if (Object.keys(past).length || (PM && r.dd[j])) { calTip(j, c); ev.stopPropagation(); return; }   // comparing years: show every year's count for the day
          if (!canDay || vals[j] === null || !r.dd[j]) return;
          dayI = dayI === j ? null : j; var y = window.scrollY; show(); window.scrollTo(0, y);
        });
      });
      el.addEventListener('mouseleave', function () { pick(home); });
      function calTip(j, col) {
        var old = el.parentNode.querySelector('.tt-caltip'); if (old) old.parentNode.removeChild(old);
        var d = EV_DAYS[j], rows = [['2026', vals[j], r.reg, d]].concat(Object.keys(past).sort().reverse().map(function (y) {
          var p = baseRow(r, y), bd = BASE[y] ? new Date(Date.parse(BASE[y].ev_start + 'T12:00:00Z') + j * 864e5).toISOString().slice(0, 10) : null;
          return [y, past[y][j], p && p.reg, bd];
        }));
        var avgL = '';
        if (!PM) { var pv = rows.slice(1).filter(function (q) { return q[1] !== null && q[2]; });
          if (pv.length > 1 && vals[j] !== null && r.reg) { var avgR = pv.reduce(function (a, q) { return a + q[1] / q[2]; }, 0) / pv.length, dd2 = Math.round((vals[j] / r.reg / avgR - 1) * 100);
            avgL = '<p class="tt-calavg">Average of the ' + pv.length + ' years: ' + (avgR * 100).toFixed(2) + '% of registered. 2026: ' + (dd2 >= 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(dd2) + '% ' + (dd2 >= 0 ? 'above' : 'below') + ' that.</p>'; } }
        if (PM) { var px = r.dd[j], pn = px[0] + px[1] + px[2] + px[3]; rows = CAL_PTY.map(function (q, j2) { return [q[0], px[j2], null, null, q[2], pn ? px[j2] / pn * 100 : 0]; }); }
        var t = '<div class="tt-caltip" role="dialog"><button type="button" class="tt-calx" aria-label="Close">\u00D7</button><b class="h">' + (PM ? WDS[dow(d)] + ' ' + apDate(d) + ': early in-person votes by party' : 'Day ' + (j + 1) + ' of early voting') + '</b><table>' +
          (PM ? rows.map(function (q) { return '<tr><td><i style="background:' + q[4] + '"></i>' + q[0] + '</td><td class="n">' + fmt(q[1]) + '</td><td class="p">' + q[5].toFixed(1) + '%</td></tr>'; }).join('') : '') +
          (PM ? [] : rows).map(function (q) {
            return '<tr><td><i style="background:' + (q[0] === '2026' ? 'var(--ev)' : CAL_COL[q[0]]) + '"></i>' + q[0] + (q[3] ? '<small>' + WDS[dow(q[3])] + ' ' + apDate(q[3]) + '</small>' : '') + '</td>' +
              '<td class="n">' + (q[1] === null ? 'not yet' : fmt(q[1])) + '</td><td class="p">' + (q[1] !== null && q[2] ? (q[1] / q[2] * 100).toFixed(2) + '% of reg.' : '') + '</td></tr>';
          }).join('') + '</table>' + avgL +
          (canDay && vals[j] !== null && r.dd[j] ? '<button type="button" class="tt-calgo">' + (dayI === j ? 'Back to all days' : 'Show ' + WDS[dow(d)] + ' ' + apDate(d) + ' across the tracker') + '</button>' : '') + '</div>';
        var wrap = el.parentNode; if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
        wrap.insertAdjacentHTML('beforeend', t);
        var tip = wrap.querySelector('.tt-caltip'), wr = wrap.getBoundingClientRect(), cr = col.getBoundingClientRect();
        var x = cr.left - wr.left + cr.width / 2 - tip.offsetWidth / 2; tip.style.left = Math.max(0, Math.min(wrap.clientWidth - tip.offsetWidth, x)) + 'px';
        tip.style.top = Math.max(0, cr.top - wr.top - tip.offsetHeight - 6) + 'px';
        tip.querySelector('.tt-calx').addEventListener('click', function () { tip.parentNode.removeChild(tip); });
        var go = tip.querySelector('.tt-calgo'); if (go) go.addEventListener('click', function () { dayI = dayI === j ? null : j; var y = window.scrollY; show(); window.scrollTo(0, y); });
        setTimeout(function () { document.addEventListener('click', function off(e) { if (!tip.contains(e.target)) { if (tip.parentNode) tip.parentNode.removeChild(tip); document.removeEventListener('click', off); } }); }, 0);
      }
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); pick((cur < 0 ? 0 : cur) + (ev.key === 'ArrowRight' ? 1 : -1)); }
      });
      // bars grow once on first draw
      var bars = el.querySelectorAll('.tt-b');
      function grow() { Array.prototype.forEach.call(bars, function (b) { b.style.height = b.getAttribute('data-h') + '%'; }); }
      if (animated) { Array.prototype.forEach.call(bars, function (b) { b.style.transition = 'none'; }); grow(); }
      else requestAnimationFrame(function () { requestAnimationFrame(grow); });
    }

    function fill() {
      var k = state.geo;
      pick.hidden = k === 'state';
      if (k !== 'state') {
        var rows = sorted(k);
        sel.innerHTML = rows.map(function (r) { return '<option value="' + esc(r.name) + '">' + esc(LONG[k](r.name)) + '</option>'; }).join('');
        sel.value = state.sel[k];
      }
      show();
    }
    function setGeo(k) {
      if (k !== 'county') site = null;
      state.geo = k;
      Array.prototype.forEach.call(mount.querySelectorAll('.tt-tabs button'), function (b) {
        var on = b.getAttribute('data-g') === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      });
      fill();
    }

    /* Shareable links: #nc-turnout=county:Orange */
    function hashKey() { return state.geo === 'state' ? 'state' : state.geo + ':' + state.sel[state.geo].replace(/^[A-Z]+ /, ''); }
    /* The rest of the view rides along after the place, so a shared link opens on the same map, year, day and table:
       #nc-turnout=cd:4&map=county&area=in&show=lpgap&chg=1&vs=2022&day=6&rank=hd&rkchg=1&who=age */
    var VIEW_DEF = { byp: '0', dm: 'only', map: 'county', area: 'in', show: 'party', race: 'B.turn', chg: '0', vs: '2022', day: '', rank: 'county', rkchg: '0', who: 'party', cal: '', rkcols: RK_MAIN.join('.'), fold: '', edpy: '2022', edpm: 'share' };
    function viewNow() {
      return { byp: calParty ? '1' : '0', dm: dayMode, map: mapTab, area: mapScope, show: mapMode, race: raceG + '.' + raceM, chg: mapChg ? '1' : '0', vs: vs, day: dayI === null ? '' : String(dayI + 1),
        rank: rkGeo, rkchg: rkChg ? '1' : '0', who: who, cal: calYrs.slice().sort().join('.'), rkcols: rkCols.join('.'), fold: Object.keys(folded).sort().join('.'), edpy: edpYr, edpm: edpM };
    }
    function hashFull() {
      var v = viewNow(), extra = Object.keys(VIEW_DEF).filter(function (k) { return v[k] !== VIEW_DEF[k] && !(k === 'race' && v.show !== 'race'); })
        .map(function (k) { return k + '=' + encodeURIComponent(v[k]); });
      return '#nc-turnout=' + encodeURIComponent(hashKey()) + (extra.length ? '&' + extra.join('&') : '');
    }
    function readView() {
      var q = {}; (location.hash || '').replace(/^#/, '').split('&').slice(1).forEach(function (x) { var i = x.indexOf('='); if (i > 0) q[x.slice(0, i)] = decodeURIComponent(x.slice(i + 1)); });
      if (q.map && TAB_NAME[q.map]) mapTab = q.map;
      if (q.dm === 'thru') dayMode = 'thru';
      if (q.byp === '1') calParty = true;
      if (q.area === 'in' || q.area === 'state') mapScope = q.area;
      if (q.show && (MAPS[q.show] || q.show === 'race')) mapMode = q.show;
      if (q.race) { var rr = q.race.split('.'); if (RACE_HUE[rr[0]]) raceG = rr[0]; if (RACE_M[rr[1]]) raceM = rr[1]; }
      if (q.vs && BASE && BASE[q.vs]) vs = q.vs;
      if (q.chg === '1') mapChg = true;
      if (q.day && /^\d+$/.test(q.day) && +q.day >= 1 && +q.day <= EV_DAYS.length) dayI = +q.day - 1;
      if (q.rank && RKG.some(function (g) { return g[0] === q.rank; })) rkGeo = q.rank;
      if (q.rkchg === '1') rkChg = true;
      if (q.rkcols) { var kc = q.rkcols.split('.').filter(function (x) { return RK_MAIN.indexOf(x) >= 0 || rkX(x); }); if (kc.length) rkCols = kc; }
      if (q.who && WHO_SUB[q.who]) who = q.who;
      if (q.edpy && ED_YRS.indexOf(q.edpy) >= 0) edpYr = q.edpy;
      if (q.edpm && EDP_M[q.edpm]) edpM = q.edpm;
      if (q.fold) q.fold.split('.').forEach(function (k) { if (/^[a-z]+$/.test(k)) folded[k] = 1; });
      if (q.cal) calYrs = q.cal.split('.').filter(function (y) { return BASE && BASE[y]; });
    }
    function setHash() { try { if (history.replaceState) history.replaceState(null, '', hashFull()); } catch (e) { /* ignore */ } }
    function readHash() {
      var m = /nc-turnout=([^&]+)/.exec(location.hash || '');
      if (!m) return;
      var p = decodeURIComponent(m[1]).split(':'), k = p[0];
      if (!places[k]) return;
      if (k !== 'state' && p[1]) {
        var want = p[1].toLowerCase();
        var hit = places[k].filter(function (r) { return r.name.toLowerCase() === want || r.name.replace(/\D/g, '') === want; })[0];
        if (hit) state.sel[k] = hit.name;
      }
      state.geo = k;
      readView();
    }
    var shareBtn = mount.querySelector('.tt-share');
    shareBtn.addEventListener('click', function () {
      var url = location.href.split('#')[0] + hashFull();
      function done(ok) { shareBtn.textContent = ok ? 'Link copied' : url; setTimeout(function () { shareBtn.textContent = 'Share this view'; }, 2500); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });

    Array.prototype.forEach.call(mount.querySelectorAll('.tt-tabs button'), function (b) {
      b.addEventListener('click', function () { setGeo(b.getAttribute('data-g')); });
    });
    sel.addEventListener('change', function () { state.sel[state.geo] = sel.value; site = null; allSites = false; show(); });
    Array.prototype.forEach.call(mount.querySelectorAll('.tt-step'), function (b) {
      b.addEventListener('click', function () {
        var i = sel.selectedIndex + (+b.getAttribute('data-d')), n = sel.options.length;
        sel.selectedIndex = (i + n) % n; state.sel[state.geo] = sel.value; show();
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
    /* precincts join the index once their names arrive (pct_names.json: {County: {code: name or ""}}), on the first keystroke.
       A precinct hit opens its county with the precinct map, and the precinct's card. */
    var PNAMES = /*__PNAMES__*/null, pnLoading = false;
    function addPrecincts() {
      if (!PNAMES || addPrecincts.done) return; addPrecincts.done = true;
      Object.keys(PNAMES).forEach(function (c) {
        Object.keys(PNAMES[c]).forEach(function (code) {
          var nm = PNAMES[c][code], lab = c + ' County precinct ' + code + (nm ? ' \u00B7 ' + titleish(nm) : '');
          INDEX.push({ k: 'pct', county: c, code: code, name: c + '|' + code, label: lab, hay: (lab + ' precinct pct ' + code).toLowerCase(), num: code.replace(/\D/g, ''), pc: code.toLowerCase() });
        });
      });
    }
    function needNames() {
      if (PNAMES) return addPrecincts();
      if (pnLoading || !DATA_URL) return; pnLoading = true;
      pctFetch('pct_names.json', function (j) { if (!j) return; PNAMES = j; addPrecincts(); if (find.value.trim()) { hits = match(find.value); hi = hits.length ? 0 : -1; paint(); } });
    }
    var find = mount.querySelector('.tt-findi'), res = mount.querySelector('.tt-res'), hits = [], hi = -1;
    function match(q) {
      q = q.trim().toLowerCase(); if (!q) return [];
      var words = q.split(/\s+/);
      var out = INDEX.filter(function (e) {
        if (e.k === 'pct') return words.every(function (w) { return e.pc === w || e.hay.indexOf(w) !== -1; }) && (words.length > 1 || q.length >= 4);   // a precinct needs a county or a few letters
        return words.every(function (w) { return /^\d+$/.test(w) ? e.num === w : e.hay.indexOf(w) !== -1; }); });
      out.sort(function (a, b) {
        var as = a.label.toLowerCase().indexOf(q) === 0 ? 0 : 1, bs = b.label.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        return as - bs || (a.k === 'pct' ? 1 : 0) - (b.k === 'pct' ? 1 : 0) || (a.k === 'county' ? 0 : 1) - (b.k === 'county' ? 0 : 1);
      });
      return out.slice(0, 8);
    }
    function paint() {
      res.hidden = !hits.length; find.setAttribute('aria-expanded', hits.length ? 'true' : 'false');
      res.innerHTML = hits.map(function (e, i) {
        return '<div class="tt-ro' + (i === hi ? ' on' : '') + '" role="option" id="' + SLUG + '-o' + i + '" aria-selected="' + (i === hi) + '" data-i="' + i + '">' + esc(e.label) + '</div>';
      }).join('');
      if (hi >= 0) find.setAttribute('aria-activedescendant', SLUG + '-o' + hi); else find.removeAttribute('aria-activedescendant');
    }
    function choose(e) {
      interacted = true;
      find.value = ''; hits = []; hi = -1; paint();
      if (e.k === 'pct') { state.sel.county = e.county; mapTab = 'pct'; setGeo('county'); mapCard = e.name; show();
        var mp = view.querySelector('.tt-map'); if (mp) window.scrollTo(0, mp.getBoundingClientRect().top + window.scrollY - 70); return; }
      state.sel[e.k] = e.name;
      setGeo(e.k);
    }
    find.addEventListener('input', function () {
      needNames();
      hits = match(find.value); hi = hits.length ? 0 : -1; paint();
      if (find.value.trim() && !hits.length) { res.hidden = false; res.innerHTML = '<div class="tt-ro tt-rnone">No county, district or precinct matches. For a precinct, try the county and precinct number, like \u201cWake 01-05.\u201d</div>'; }
    });
    find.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' && hits.length) { ev.preventDefault(); hi = (hi + 1) % hits.length; paint(); }
      else if (ev.key === 'ArrowUp' && hits.length) { ev.preventDefault(); hi = (hi - 1 + hits.length) % hits.length; paint(); }
      else if (ev.key === 'Enter' && hi >= 0) { ev.preventDefault(); choose(hits[hi]); }
      else if (ev.key === 'Escape') { hits = []; hi = -1; paint(); }
    });
    res.addEventListener('mousedown', function (ev) {
      var o = ev.target.closest('[data-i]'); if (o && hits[+o.getAttribute('data-i')]) { ev.preventDefault(); choose(hits[+o.getAttribute('data-i')]); }
    });
    find.addEventListener('blur', function () { setTimeout(function () { hits = []; hi = -1; paint(); }, 150); });

    /* ---- Click-through intro: a few statewide steps, then the full tracker ---- */
    var STORY_KEY = 'nc-turnout-story-seen';
    function storySeen() { try { return !!localStorage.getItem(STORY_KEY); } catch (e) { return false; } }
    function markSeen() { try { localStorage.setItem(STORY_KEY, D.asof); } catch (e) { /* private mode */ } }
    function storySteps() {
      var r = places.state[0], steps = [], c = cmp(r), nd = newest(r), still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      steps.push({ k: 'big', cap: r.reg ? '<b>' + rate(tot(r), r.reg) + '</b> of North Carolina\'s registered voters have already cast a ballot.' : 'North Carolinians have started voting.',
        sub: (preEV ? 'Mail ballots so far. In-person early voting begins Thursday, Oct. 15.' : 'Early voting began Thursday, Oct. 15, and runs through Saturday, Oct. 31.') + ' Election Day is Tuesday, Nov. 3.',
        html: '<div class="tt-sbig" data-to="' + tot(r) + '">' + fmt(still ? tot(r) : 0) + '</div><div class="tt-shl">votes cast so far</div>' });
      if (c && c.nowR && c.thenR) {
        var d = Math.round((c.nowR / c.thenR - 1) * 100), up = d >= 0, mx = Math.max(c.nowR, c.thenR);
        var bar = function (y, n, v, cls) { return '<div class="tt-by">' + y + '</div><div class="tt-bb"><i class="' + cls + ' tt-grow" data-w="calc((100% - 150px) * ' + (n / mx).toFixed(4) + ')"></i><b>' + n.toFixed(1) + '%</b><span class="tt-braw">(' + fmt(v) + ')</span></div>'; };
        steps.push({ k: 'cmp', cap: 'That\'s <b class="' + (up ? 'tt-sup' : 'tt-sdn') + '">' + Math.abs(d) + '% ' + (up ? 'higher' : 'lower') + '</b> turnout than at this point in ' + vs + '.',
          sub: 'Turnout is the share of registered voters who have voted, counted the same way on the same day of early voting in both years.',
          html: '<div class="tt-cmp tt-scmp">' + bar('2026', c.nowR, c.now, 'now') + bar(vs, c.thenR, c.then, 'was') + '</div>' });
      }
      if (nd && !preEV) {
        var li = -1, vals = EV_DAYS.map(function (day, i) { var j = D.days.indexOf(day); if (j > -1 && day < D.asof) li = i; return j > -1 && day < D.asof ? (r.tev[j] || 0) + (r.tml[j] || 0) : null; });
        var mxv = Math.max.apply(null, vals.map(function (v) { return v || 0; })) || 1;
        var cols = EV_DAYS.map(function (day, i) {
          return '<div class="tt-scol' + (i === li ? ' last' : '') + (vals[i] === null ? ' f' : '') + '"><i class="tt-grow-h" data-h="' + (vals[i] === null ? 0 : Math.max(3, vals[i] / mxv * 100)).toFixed(1) + '%"></i><span>' + (+day.slice(8)) + '</span></div>';
        }).join('');
        steps.push({ k: 'day', cap: '<b>' + fmt(nd.v) + '</b> ' + (nd.v === 1 ? 'vote was' : 'votes were') + ' added on ' + apDate(nd.day) + '.',
          sub: 'Each bar is one day of early voting. The State Board posts each day\'s votes the next morning.', html: '<div class="tt-scal">' + cols + '</div>' });
      }
      function groupStep(isAge) {
        var L = isAge ? AGE : PARTY, vals = isAge ? r.age : r.pty, regs = isAge ? r.rage : r.rpty, sum = vals.reduce(function (x, y) { return x + y; }, 0) || 1;
        var NOUN = isAge ? ['Voters 18–25', 'Voters 26–40', 'Voters 41–65', 'Voters 66 and older'] : ['Democrats', 'Republicans', 'Unaffiliated voters'];
        // who has voted: share of votes cast
        var bar = '', leg = '', big = 0, LPs = legPct(vals);
        L.forEach(function (g, j) {
          var w = vals[j] / sum * 100; if (vals[j] > vals[big]) big = j;
          if (vals[j]) bar += '<span class="tt-ps ' + g[1] + ' tt-grow" data-w="' + w.toFixed(2) + '%"></span>';
          leg += '<span class="tt-pk"><i class="' + g[1] + '"></i>' + g[0] + ' <b>' + fmt(vals[j]) + '</b><em>' + LPs[j] + '%</em></span>';
        });
        var html = '<div class="tt-pbar tt-sbar" role="img" aria-label="Votes cast by ' + (isAge ? 'age' : 'party registration') + '">' + bar + '</div><div class="tt-pleg">' + leg + '</div>';
        // turnout compared with the earlier year
        var cap, sub, parts = [];
        if (c && c.then && regs) {
          var rows = [], ahead = [], behind = [], even = [], mxr = 0, bp = isAge ? c.p.a : c.p.p, br = isAge ? c.p.ra : c.p.rp;
          L.forEach(function (g, j) {
            if (!isAge && j === 3) return;   // the small "Other" group stays off this step
            var nowR = regs[j] ? vals[j] / regs[j] * 100 : null, thenR = br[j] ? bp[j][c.idx] / br[j] * 100 : null;
            if (nowR === null || thenR === null) return;
            rows.push([g, nowR, thenR]); mxr = Math.max(mxr, nowR, thenR);
            var x = nowR - thenR; (x >= 0.2 ? ahead : x <= -0.2 ? behind : even).push(NOUN[j]);
          });
          mxr = Math.ceil(mxr * 1.15) || 1;
          var first = true, lc = function (a) { return a.map(function (n) { var o = first ? n : n.replace(/^(Unaffiliated|Voters)/, function (m) { return m.toLowerCase(); }); first = false; return o; }); };
          var join = function (a) {
            if (isAge && a.length === 4) return 'All age groups';
            return a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
          };
          if (ahead.length) parts.push('<b>' + join(lc(ahead)) + '</b> ' + (ahead.length === 1 && isAge && false ? 'is' : 'are') + ' ahead of ' + vs + '’s pace');
          if (behind.length) parts.push('<b>' + join(lc(behind)) + '</b> are behind' + (parts.length ? '' : ' ' + vs + '’s pace'));
          if (even.length) parts.push('<b>' + join(lc(even)) + '</b> are about even' + (parts.length ? '' : ' with ' + vs));
          html += '<p class="tt-ssec">Turnout so far vs. the same point in ' + vs + '</p>' + scoreRows(rows, isAge, 'at this point in ' + vs);
        }
        if (isAge) {
          cap = '<b>' + NOUN[big] + '</b> have cast ' + Math.round(vals[big] / sum * 100) + '% of the votes so far.';
          sub = (parts.length ? parts.join('; ').replace(/<\/?b>/g, '') + '. ' : '') + 'Age groups are the State Board’s.';
        } else {
          cap = parts.length ? parts.join('; ') + '.' : 'Votes cast so far, by party registration.';
          sub = 'Party is registration, not vote choice: in a general election, every voter can vote for any candidate, whatever their party.';
        }
        steps.push({ k: isAge ? 'age' : 'party', cap: cap, sub: sub, html: html });
      }
      if (r.pty) groupStep(false);
      return steps;
    }
    function startStory(force) {
      if (D.final || D.state.ed != null) return;   // the intro covers the early-voting period
      if (!force && (storySeen() || /nc-turnout=/.test(location.hash || ''))) return;
      var steps = storySteps(), i = 0, box = document.createElement('div'), x0 = null;
      box.className = 'tt-story'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Turnout so far, step by step');
      mount.querySelector('.tt-kick').insertAdjacentElement('afterend', box);
      mount.classList.add('tt-storymode');
      function finish(focus) {
        markSeen(); box.remove(); mount.classList.remove('tt-storymode');
        if (mount.getBoundingClientRect().top < 0) mount.scrollIntoView({ block: 'start' });
        if (focus) { var f = mount.querySelector('.tt-findi'); if (f) f.focus(); }
      }
      function paint() {
        var s = steps[i];
        var last = i === steps.length - 1;
        box.innerHTML = (last ? '' : '<button type="button" class="tt-sskip"><span class="tt-ssk1">Skip the intro</span><span class="tt-ssk2">Go straight to the full tracker \u2192</span></button>') + '<div class="tt-sprog">' + steps.map(function (x, j) { return '<i' + (j <= i ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' +
          '<div class="tt-sstage tt-s-' + s.k + '">' + s.html + '</div>' +
          '<p class="tt-scap" aria-live="polite">' + s.cap + '</p>' + (s.sub ? '<p class="tt-ssub">' + s.sub + '</p>' : '') +
          '<div class="tt-snav"><button type="button" class="tt-sback"' + (i ? '' : ' disabled') + '>← Back</button>' +
          '<button type="button" class="tt-snext">' + (last ? 'See the full tracker' : 'Next') + ' \u2192</button></div>';
        box.querySelector('.tt-sback').addEventListener('click', function () { if (i) { i--; paint(); } });
        var sk = box.querySelector('.tt-sskip'); if (sk) sk.addEventListener('click', function () { finish(false); });
        box.querySelector('.tt-snext').addEventListener('click', function () { if (last) finish(false); else { i++; paint(); } });
        // animate: bars and lines grow, the big number counts up
        var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        var grow = box.querySelectorAll('.tt-grow'), growH = box.querySelectorAll('.tt-grow-h'), fade = box.querySelectorAll('.tt-fade');
        function settle() {
          Array.prototype.forEach.call(grow, function (e) { e.style.width = e.getAttribute('data-w'); });
          Array.prototype.forEach.call(growH, function (e) { e.style.height = e.getAttribute('data-h'); });
          Array.prototype.forEach.call(fade, function (e) { e.style.opacity = 1; });
        }
        if (still) { box.classList.add('still'); settle(); }
        else requestAnimationFrame(function () { requestAnimationFrame(settle); });
        var big = box.querySelector('.tt-sbig');
        if (big && !still) {
          var to = +big.getAttribute('data-to'), t0 = null;
          requestAnimationFrame(function step(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / 900); big.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); });
        }
      }
      box.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' && i < steps.length - 1) { i++; paint(); }
        else if (e.key === 'ArrowLeft' && i) { i--; paint(); }
      });
      box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (dx < -50 && i < steps.length - 1) { i++; paint(); } else if (dx > 50 && i) { i--; paint(); }
      });
      paint();
    }
    readHash();
    setGeo(state.geo);
    startStory(false);
    var rp = mount.querySelector('.tt-replay');
    if (rp) { if (D.final || D.state.ed != null) rp.remove(); else rp.addEventListener('click', function () { setGeo('state'); startStory(true); mount.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); }
    mount.addEventListener('click', function () { interacted = true; }, true);
    mount.addEventListener('change', function () { interacted = true; }, true);
  }

  mount.classList.add(SLUG);
  function go(D) {
    if (BASE || !DATA_URL) { render(D); return; }
    // The 2022/2024 baselines sit next to data.json; the tracker works without them if they can't load.
    fetch(DATA_URL.replace(/data\.json(\?.*)?$/, 'baseline.json')).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (b) { BASE = b; }, function () { BASE = null; }).then(function () { render(D); });
  }
  if (DATA_URL) {
    mount.innerHTML = '<div class="tt-none">Loading turnout data…</div>';
    fetch(DATA_URL, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(go)
      .catch(function () {
        if (EMBEDDED) go(EMBEDDED);
        else mount.innerHTML = '<div class="tt-none">Turnout data could not be loaded right now. Please try again later.</div>';
      });
  } else if (EMBEDDED) {
    render(EMBEDDED);
  }
})();
