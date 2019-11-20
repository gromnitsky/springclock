'use strict';
/* global moment, dialogPolyfill */

if (typeof window !== 'undefined') {
    window.exports = {}
    document.addEventListener('DOMContentLoaded', main)
}

function main() {
    Settings()
    let events = get_events_from_url().concat(seasons)
    console.log(events)

    let now = () => new Date()
    let select_event = () => future_date_select(events)

    let upd = update_screen(select_event, now)
    window.setInterval(upd, 1*1000)
}

function get_events_from_url() {
    let params = new URLSearchParams(window.location.search)
    try {
        return events_parse(params.get('e'))
    } catch (e) {
        console.log(e)
    }
    return []
}

function update_screen(select_event, now) {
    let transition = new Widget('#transition')
    let countdown = new Countdown('#countdown')

    let event = select_event()
    return () => {
        $('#now').innerText = new Date()

        let diff = moment(event.date).diff(now())
        if (diff < 0) {
            diff = -1 * ((diff / 1000) | 0)
            if (diff < 30) {
                transition.update(event, diff)
                countdown.live = false
            } else {
                console.log('select next event')
                event = select_event()
            }
            return
        }
        countdown.update(event, diff)
        transition.live = false
    }
}

function $(q) { return document.querySelector(q) }

class Widget {
    constructor(css_query) {
        this.live = false
        this.css_query = css_query
    }
    install() {
        if (this.live) return
        console.log(this.css_query)
        $('#widget').innerHTML = ''
        $('#widget').appendChild(document.importNode($(this.css_query).content, true))
        this.dom_setup()
        this.live = true
    }
    update(event, diff) {
        this.install()
        this.dom_update(event, diff)
    }

    dom_setup() {               // overridable
        [this.seconds, this.event_name] = document.querySelectorAll('#seconds, .event_name')
    }
    dom_update(event, diff) {   // overridable
        [this.seconds.innerText, this.event_name.innerText] = [diff, event.desc || `'${event.spec}'`]
    }
}

class Countdown extends Widget {
    dom_setup() {
        super.dom_setup()
        ;['years','months','days',
          'hours','minutes'].forEach( v => this[v] = $('#'+v))
    }
    dom_update(event, diff) {
        let left = moment.duration(diff)
        ;['years','months','days'].forEach( v => this[v].innerText = left[v]())
        ;['hours','minutes','seconds'].forEach( v => {
            this[v].innerText = pad(left[v]())
        })
        this.event_name.innerText = event.desc || `'${event.spec}'`
    }
}

function Settings() {
    let dlg = $('dialog')
    let params = new URLSearchParams(window.location.search)
    dlg.querySelector('textarea').value = params.get('e')

    dlg.querySelector('form').onsubmit = evt => {
        evt.preventDefault()
        let text = dlg.querySelector('textarea').value
        let events
        try {
            events = events_parse(text)
        } catch(e) {
            alert(e)
            return
        }
        let params = new URLSearchParams(window.location.search)
        events.length ? params.set('e', text) : params.delete('e')
        window.location.replace(window.location.pathname + '?' + params)
    }

    dlg.querySelector('button').onclick = evt => {
        evt.preventDefault()
        dlg.close()
    }

    dialogPolyfill.registerDialog(dlg)
    $('#now').onclick = () => dlg.showModal()
}

let seasons = [
    { spec: '12 1', desc: 'Winter' },
    { spec: '1 1', desc: 'The New Year' }, // Event
    { spec: '3 1', desc: 'Spring' },
    { spec: '6 1', desc: 'Summer' },
    { spec: '9 1', desc: 'Autumn' },
]
exports.seasons = seasons

// `dates` - [ {events: Event, desc: String }, ...]
function future_date_select(events, now) {
    events = events.slice().map( v => { // silently ignore invalid events
        let date
        try {
            date = future_date(v.spec, now)
        } catch (e) {
            return false
        }
        return { date, spec: v.spec, desc: v.desc }
    }).filter(Boolean)
    now = now || new Date()
    for (let event of events) {
        if (now <= event.date) return event
    }
    throw new Error('no suitable future event found')
}
exports.future_date_select = future_date_select

/* spec:
     YYYY, D,
     M D, m M, h H,
     hm H M, YYYY M D,
     YYYY M D H, YYYY M D H M
   return Date */
function future_date(spec, now) {
    spec = spec.split(/\s+/).filter(Boolean)
    now = now || new Date()
    let datetime = now => ({
        year: now.getFullYear(),
        month: now.getMonth(), // 0-indexed
        date: now.getDate(),
        hour: now.getHours(),
        minutes: now.getMinutes()
    })
    let cur = datetime(now)

    if (spec.length === 1) {
        // YYYY (a year) or D (a date in the current/next month)
        let n = Number(spec[0])
        if (n >= cur.date && n <= days_in_month(cur.year, cur.month+1)) {
            return mk_date_utc(cur.year, cur.month+1, n)
        } else if (n <= 31 && n <= days_in_month(cur.year, cur.month+2)) {
            let d = mk_date_utc(cur.year, cur.month+1, n)
            return datetime_add_months(d, 1)
        } else if (n > cur.year) {
            return mk_date_utc(n)
        }

        throw new Error('YYYY, D')
    }

    if (spec.length === 2) {
        // M D (a month & a date), m M (a month only), h H (an hour only)
        if (spec[0] === 'm') {
            // TODO: recognize month names, i.e., 'jan', 'feb', &c
            let m = Number(spec[1])
            if (m >= cur.month + 2 && m <= 12) return mk_date_utc(cur.year, m)
            if (m >= 1 && m <= 12) return mk_date_utc(cur.year+1, m)
            throw new Error('m M')

        } else if (spec[0] === 'h') {
            let h = Number(spec[1])
            if (h >= cur.hour+1 && h <= 23) // later this day
                return mk_date_utc(cur.year, cur.month+1, cur.date, h)
            if (h >= 1 && h <= 23) { // the next day
                cur = datetime(new Date(now.valueOf() + 60*60*24 * 1000))
                return mk_date_utc(cur.year, cur.month+1, cur.date, h)
            }
            throw new Error('h H')
        }

        let [m, d] = spec.map(Number)
        let error = Error('M D')
        if (! (m >= 1 && m <= 12)) throw error
        let vadid_date = (cur, d) => d >= 1 && d <= days_in_month(cur.year, m)

        if (m < cur.month+1) { // the next year
            cur = datetime(mk_date_utc(cur.year+1, m))
            if (vadid_date(cur, d)) return mk_date_utc(cur.year, m, d)
        }

        if (m === cur.month+1) {
            if (d <= cur.date) { // the next year
                cur = datetime(mk_date_utc(cur.year+1, m))
                if (vadid_date(cur, d)) return mk_date_utc(cur.year, m, d)
            } else { // this year
                if (vadid_date(cur, d)) return mk_date_utc(cur.year, m, d)
            }
        }

        if (m > cur.month+1) { // this year
            if (vadid_date(cur, d)) return mk_date_utc(cur.year, m, d)
        }

        throw error
    }

    if (spec.length === 3) { // hm H M, YYYY M D
        if (spec[0] === 'hm') {
            let [h, m] = spec.slice(1).map(Number)
            if (! (h >= 0 && h <= 23 && m >= 0 && m <= 59))
                throw new Error('hm H M')

            if (h < cur.hour
                || (h === cur.hour && m <= cur.minutes) ) { // the next day
                cur = datetime(new Date(now.valueOf() + 60*60*24 * 1000))
                return mk_date_utc(cur.year, cur.month+1, cur.date, h, m)
            }

            // later this day
            return mk_date_utc(cur.year, cur.month+1, cur.date, h, m)
        }

        let d = mk_date_utc(...spec)
        if (isNaN(d) || d < now) throw new Error('YYYY M D')
        return d
    }

    if (spec.length >= 4 && spec.length <= 5) { // YYYY M D H, YYYY M D H M
        let d = mk_date_utc(...spec)
        if (isNaN(d) || d < now) throw new Error('YYYY M D H, YYYY M D H M')
        return d
    }

    throw new Error('invalid date spec')
}

function datetime_add_months(datetime, months) {
    datetime = new Date(datetime.getTime()) // clone
    var d = datetime.getDate()
    datetime.setMonth(datetime.getMonth() + +months)
    if (datetime.getDate() !== d) datetime.setDate(0)
    return datetime
}

// `m` is 1-indexed
function days_in_month (y, m) {
    let now = new Date()
    return new Date(y || now.getFullYear(), m || now.getMonth()+1, 0).getDate()
}

function pad(s) { return ('0'+s).slice(-2) }

// `month` is 1-indexed
function mk_date_utc(year, month = 1, date = 1, hour = 0, minutes = 0) {
    return new Date(`${year}-${pad(month)}-${pad(date)}T${pad(hour)}:${pad(minutes)}:00`)
}

exports.future_date = future_date

function events_parse(str) {
    return (str || '').split("\n").map( (line, idx) => {
        let [spec, desc] = line.split(',')
        if (!spec.trim()) return false
        try {
            future_date(spec)
        } catch (e) {
            throw new Error(`line ${idx+1}: "${spec}" is invalid: ${e.message}`)
        }
        return {spec, desc: desc || ''}
    }).filter(Boolean)
}

exports.events_parse = events_parse
