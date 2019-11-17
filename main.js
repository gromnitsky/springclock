if (typeof window === 'undefined') {
    run_tests()                 // mocha --ui=tdd
} else {
    document.addEventListener('DOMContentLoaded', main)
}

function main() {
}

let seasons = [
    { spec: '1 1', desc: 'New Year' },
    { spec: '3 1', desc: 'Spring' },
    { spec: '6 1', desc: 'Summer' },
    { spec: '9 1', desc: 'Autumn' },
    { spec: '12 1', desc: 'Winter' }
]

// `dates` - [ {events: Event, desc: String }, ...]
function future_date_select(events, now) {
    events = events.slice().map( v => ({
        date: future_date(v.spec, now),
        spec: v.spec,
        desc: v.desc,
    }) ).sort( (a, b) => a.date - b.date)
    now = now || new Date()
    for (let event of events) {
        if (now <= event.date) return event
    }
    throw new Error('no suitable future event found')
}

/* spec:
     YYYY, D,
     M D, m M, h H,
     hm H M, YYYY M D,
     YYYY M D H, YYYY M D H M
   return an UTC date */
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
        if (n >= now.getDate() && n <= days_in_month(cur.year, cur.month+1)) {
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
        if (! (m >= 1 && m <= 12)) throw new error
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

        throw new error
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

function future_date_is_fixed(spec) { return /\s*\d{4}\b/.test(spec) }

// `m` is 1-indexed
function days_in_month (y, m) {
    let now = new Date()
    return new Date(y || now.getFullYear(), m || now.getMonth()+1, 0).getDate()
}

function pad(s) { return ('0'+s).slice(-2) }

// `month` is 1-indexed
function mk_date_utc(year, month = 1, date = 1, hour = 0, minutes = 0) {
    return new Date(`${year}-${pad(month)}-${pad(date)}T${pad(hour)}:${pad(minutes)}:00.000Z`)
}

function run_tests() {
    let assert = require('assert')
    process.env.TZ = 'Europe/Kiev'

    suite('future_date', function() {
        test('YYYY, D', function() {
            // tomorrow
            assert.equal(future_date('18', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-18T00:00:00.000Z')
            assert.equal(future_date('31', new Date('2019-12-30T11:11:11.000Z')).toISOString(), '2019-12-31T00:00:00.000Z')
            assert.equal(future_date('1', new Date('2019-12-30T11:11:11.000Z')).toISOString(), '2020-01-01T00:00:00.000Z')

            assert.throws(() => future_date('32'))
            assert.throws(() => future_date('first'))

            // date in the next month
            assert.equal(future_date('2', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-12-02T00:00:00.000Z')

            // next year
            assert.equal(future_date('2020', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2020-01-01T00:00:00.000Z')
            assert.equal(future_date('2021', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2021-01-01T00:00:00.000Z')
        })

        test('M D, m M, h H', function() {
            // the next month
            assert.equal(future_date('m 12', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-12-01T00:00:00.000Z')
            // some month in the next year
            assert.equal(future_date('m 2', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2020-02-01T00:00:00.000Z')

            assert.throws(() => future_date('m december'))
            assert.throws(() => future_date('m 123'))

            // later this day
            assert.equal(future_date('h 23', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-17T23:00:00.000Z')
            // the next day
            assert.equal(future_date('h 2', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-18T02:00:00.000Z')
            assert.equal(future_date('h 2', new Date('2019-12-31T11:11:11.000Z')).toISOString(), '2020-01-01T02:00:00.000Z')

            assert.throws(() => future_date('h 25'))

            // M D, later this month
            assert.equal(future_date('11 18', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-18T00:00:00.000Z')
            // this year
            assert.equal(future_date('12 1', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-12-01T00:00:00.000Z')
            // next year
            assert.equal(future_date('11 2', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2020-11-02T00:00:00.000Z')
            // the new year
            assert.equal(future_date('1 1', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2020-01-01T00:00:00.000Z')

            assert.throws(() => future_date('2 31'))
            assert.throws(() => future_date('next dec'))
        })

        test('hm H M, YYYY M D', function() {
            // later this hour
            assert.equal(future_date('hm 13 12', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-17T13:12:00.000Z')
            // later this day
            assert.equal(future_date('hm 20 00', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-17T20:00:00.000Z')
            // next day
            assert.equal(future_date('hm 13 11', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-18T13:11:00.000Z')

            assert.throws(() => future_date('hm 24 60'))

            assert.equal(future_date('2019 11 18', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-18T00:00:00.000Z')

            assert.throws(() => future_date('2019 11 16'))
        })

        test('YYYY M D H, YYYY M D H M', function() {
            assert.equal(future_date('2019 11 17 20', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-17T20:00:00.000Z')
            assert.equal(future_date('2019 11 17 20 12', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-17T20:12:00.000Z')

            assert.throws(() => future_date('2019 11 16 20 12'))
        })

        test('future_date_is_fixed', function() {
            assert.equal(future_date_is_fixed(' 2000 '), true)
            assert.equal(future_date_is_fixed('2000'), true)
            assert.equal(future_date_is_fixed('1'), false)

            assert.equal(future_date_is_fixed('1 2'), false)
            assert.equal(future_date_is_fixed('m 1'), false)
            assert.equal(future_date_is_fixed('h 1'), false)

            assert.equal(future_date_is_fixed('hm 1 2'), false)
            assert.equal(future_date_is_fixed('2000 1 1'), true)

            assert.equal(future_date_is_fixed('2000 1 1 1'), true)
            assert.equal(future_date_is_fixed('2000 1 1 1 1'), true)
        })
    })

    suite('future date selection', function() {
        test('future_date_select', function() {
            assert.equal(future_date_select(seasons, new Date('2019-11-17T11:11:11.000Z')).desc, 'Winter')
            assert.equal(future_date_select(seasons, new Date('2019-12-17T11:11:11.000Z')).desc, 'New Year')

            let events = seasons.concat({spec: '12 14', desc: 'omglol'})
            assert.equal(future_date_select(events, new Date('2019-12-13T11:11:11.000Z')).desc, 'omglol')
        })
    })
}
