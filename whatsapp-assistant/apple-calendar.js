async function handler(request, env) {
  // Agent tool: read and write the owner's iCloud calendar over CalDAV.
  // Secrets: APPLE_ID (Apple ID email), APPLE_APP_PASSWORD (app-specific password).
  const TZ = "Asia/Jerusalem";
  const ROOT = "https://caldav.icloud.com";

  function reply(obj, status) {
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body = {};
  try { body = await request.json(); } catch (e) {}
  let input = body.input || body;
  if (input.input && typeof input.input === "object") input = input.input;
  const action = input.action;

  if (!env.APPLE_ID || !env.APPLE_APP_PASSWORD) {
    return reply({ ok: false, error: "Apple Calendar is not connected yet (missing APPLE_ID / APPLE_APP_PASSWORD secrets)." });
  }
  const auth = "Basic " + btoa(env.APPLE_ID + ":" + env.APPLE_APP_PASSWORD);

  async function dav(method, url, xml, headers) {
    const res = await fetch(url, {
      method: method,
      headers: Object.assign({ Authorization: auth, "Content-Type": "application/xml; charset=utf-8" }, headers || {}),
      body: xml
    });
    const text = await res.text();
    if (res.status === 401) throw new Error("Apple rejected the credentials (401). Check the Apple ID and app-specific password.");
    if (res.status >= 400) throw new Error(method + " " + url + " failed: " + res.status + " " + text.slice(0, 300));
    return text;
  }

  function tag(xml, name) {
    const m = xml.match(new RegExp("<(?:[\\w-]+:)?" + name + "[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?" + name + ">", "i"));
    return m ? m[1] : null;
  }

  function hrefIn(xml, name) {
    const inner = tag(xml, name);
    return inner ? tag(inner, "href").trim() : null;
  }

  function absolute(href, base) {
    return new URL(href, base).toString();
  }

  async function calendarHome() {
    const cached = env.KV ? await env.KV.get("apple_cal_home") : null;
    if (cached) return cached;
    const p1 = await dav("PROPFIND", ROOT + "/", '<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>', { Depth: "0" });
    const principal = absolute(hrefIn(p1, "current-user-principal"), ROOT);
    const p2 = await dav("PROPFIND", principal, '<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>', { Depth: "0" });
    const home = absolute(hrefIn(p2, "calendar-home-set"), principal);
    if (env.KV) await env.KV.put("apple_cal_home", home);
    return home;
  }

  async function listCalendars() {
    const home = await calendarHome();
    const xml = await dav("PROPFIND", home, '<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:displayname/><d:resourcetype/><c:supported-calendar-component-set/></d:prop></d:propfind>', { Depth: "1" });
    const out = [];
    const responses = xml.split(/<(?:[\w-]+:)?response[\s>]/i).slice(1);
    for (const r of responses) {
      if (!/calendar[\s/>]/i.test(tag(r, "resourcetype") || "")) continue;
      const comps = tag(r, "supported-calendar-component-set") || "";
      if (comps && !/VEVENT/i.test(comps)) continue;
      out.push({ name: (tag(r, "displayname") || "").trim(), url: absolute(tag(r, "href").trim(), home) });
    }
    return out;
  }

  async function pickCalendar(name) {
    const cals = await listCalendars();
    if (!cals.length) throw new Error("No event calendars found in iCloud.");
    if (name) {
      const hit = cals.find(function (c) { return c.name.toLowerCase() === String(name).toLowerCase(); });
      if (hit) return hit;
    }
    const pref = env.APPLE_CALENDAR_NAME && cals.find(function (c) { return c.name === env.APPLE_CALENDAR_NAME; });
    return pref || cals[0];
  }

  // "2026-10-30T10:00" (local Israel time) -> "20261030T100000"
  function icsLocal(s) {
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) throw new Error("Bad date/time: " + s + " (use YYYY-MM-DDTHH:MM, Israel time)");
    return m[1] + m[2] + m[3] + (m[4] ? "T" + m[4] + m[5] + "00" : "");
  }

  function utcStamp(d) {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function esc(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  const VTIMEZONE = [
    "BEGIN:VTIMEZONE", "TZID:Asia/Jerusalem",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0300", "TZNAME:IDT", "DTSTART:19700327T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=FR;BYMONTHDAY=23,24,25,26,27,28,29", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0200", "TZNAME:IST", "DTSTART:19701025T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"
  ];

  function buildIcs(uid, ev) {
    const allDay = !/T|\s\d/.test(String(ev.start));
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//whatsapp-assistant//EN", "CALSCALE:GREGORIAN"].concat(VTIMEZONE);
    lines.push("BEGIN:VEVENT", "UID:" + uid, "DTSTAMP:" + utcStamp(new Date()), "SUMMARY:" + esc(ev.title));
    if (allDay) {
      const end = ev.end || ev.start;
      const d = new Date(end.slice(0, 10) + "T00:00:00Z");
      if (!ev.end) d.setUTCDate(d.getUTCDate() + 1);
      lines.push("DTSTART;VALUE=DATE:" + icsLocal(ev.start), "DTEND;VALUE=DATE:" + utcStamp(d).slice(0, 8));
    } else {
      let end = ev.end;
      if (!end) {
        const m = String(ev.start).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
        const t = new Date(m[1] + "T" + m[2] + ":" + m[3] + ":00Z");
        t.setUTCMinutes(t.getUTCMinutes() + (Number(ev.duration_minutes) || 60));
        end = t.toISOString().slice(0, 16);
      }
      lines.push("DTSTART;TZID=" + TZ + ":" + icsLocal(ev.start), "DTEND;TZID=" + TZ + ":" + icsLocal(end));
    }
    if (ev.location) lines.push("LOCATION:" + esc(ev.location));
    if (ev.notes) lines.push("DESCRIPTION:" + esc(ev.notes));
    const alarms = ev.alarm_minutes === undefined || ev.alarm_minutes === null ? [] : [].concat(ev.alarm_minutes);
    for (const a of alarms) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(ev.title), "TRIGGER:-PT" + Number(a) + "M", "END:VALARM");
    }
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }

  function unfold(ics) {
    return ics.replace(/\r?\n[ \t]/g, "");
  }

  function prop(block, name) {
    const m = block.match(new RegExp("^" + name + "((?:;[^:\\r\\n]*)?):(.*)$", "mi"));
    return m ? { params: m[1], value: m[2].trim() } : null;
  }

  function fmt(p) {
    if (!p) return null;
    const v = p.value;
    const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
    if (!m) return v;
    if (!m[4]) return m[1] + "-" + m[2] + "-" + m[3];
    if (m[7]) {
      const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
      return parts.replace(", ", "T");
    }
    const tz = (p.params.match(/TZID=([^;]+)/) || [])[1];
    return m[1] + "-" + m[2] + "-" + m[3] + "T" + m[4] + ":" + m[5] + (tz && tz !== TZ ? " (" + tz + ")" : "");
  }

  function unesc(s) {
    return s ? s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1") : s;
  }

  // Israel local "YYYY-MM-DD[THH:MM]" -> UTC stamp, using the zone's actual offset on that date.
  function localToUtc(s) {
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    const guess = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)));
    const shown = new Date(guess.toLocaleString("en-US", { timeZone: TZ }));
    const asUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
    return utcStamp(new Date(guess.getTime() - (shown - asUtc)));
  }

  async function listEvents(from, to, calendarName) {
    const cals = calendarName ? [await pickCalendar(calendarName)] : await listCalendars();
    const query = '<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop>' +
      '<c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="' + localToUtc(from) + '" end="' + localToUtc(to) + '"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>';
    const events = [];
    for (const cal of cals) {
      const xml = await dav("REPORT", cal.url, query, { Depth: "1" });
      const responses = xml.split(/<(?:[\w-]+:)?response[\s>]/i).slice(1);
      for (const r of responses) {
        const data = tag(r, "calendar-data");
        if (!data) continue;
        const ics = unfold(data.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&#13;/g, ""));
        const vevents = ics.split("BEGIN:VEVENT").slice(1);
        for (const v of vevents) {
          const block = v.split("END:VEVENT")[0];
          events.push({
            calendar: cal.name,
            uid: (prop(block, "UID") || {}).value,
            href: absolute(tag(r, "href").trim(), cal.url),
            title: unesc((prop(block, "SUMMARY") || {}).value || ""),
            start: fmt(prop(block, "DTSTART")),
            end: fmt(prop(block, "DTEND")),
            location: unesc((prop(block, "LOCATION") || {}).value || null),
            recurring: !!prop(block, "RRULE")
          });
        }
      }
    }
    events.sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); });
    return events;
  }

  try {
    if (action === "list_calendars") {
      return reply({ ok: true, calendars: (await listCalendars()).map(function (c) { return c.name; }) });
    }
    if (action === "list_events") {
      if (!input.from || !input.to) return reply({ ok: false, error: "list_events needs from and to (YYYY-MM-DD or YYYY-MM-DDTHH:MM, Israel time)" });
      return reply({ ok: true, events: await listEvents(input.from, input.to, input.calendar) });
    }
    if (action === "create_event") {
      if (!input.title || !input.start) return reply({ ok: false, error: "create_event needs title and start" });
      const cal = await pickCalendar(input.calendar);
      const uid = crypto.randomUUID();
      const url = cal.url.replace(/\/?$/, "/") + uid + ".ics";
      await dav("PUT", url, buildIcs(uid, input), { "Content-Type": "text/calendar; charset=utf-8", "If-None-Match": "*" });
      return reply({ ok: true, created: { uid: uid, href: url, calendar: cal.name, title: input.title, start: input.start, end: input.end || null } });
    }
    if (action === "update_event") {
      if (!input.href || !input.title || !input.start) return reply({ ok: false, error: "update_event needs href (from list_events) plus the full new title and start" });
      const uid = input.uid || input.href.split("/").pop().replace(/\.ics$/, "");
      await dav("PUT", input.href, buildIcs(uid, input), { "Content-Type": "text/calendar; charset=utf-8" });
      return reply({ ok: true, updated: { href: input.href, title: input.title, start: input.start, end: input.end || null } });
    }
    if (action === "delete_event") {
      if (!input.href) return reply({ ok: false, error: "delete_event needs href (from list_events)" });
      await dav("DELETE", input.href, undefined, {});
      return reply({ ok: true, deleted: input.href });
    }
    return reply({ ok: false, error: "Unknown action. Use list_calendars, list_events, create_event, update_event or delete_event." });
  } catch (e) {
    if (env.KV) await env.KV.delete("apple_cal_home");
    return reply({ ok: false, error: String(e && e.message || e) });
  }
}
