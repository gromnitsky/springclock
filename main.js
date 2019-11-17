if (typeof window === 'undefined') {
    run_tests()                 // mocha --ui=tdd
} else {
    document.addEventListener('DOMContentLoaded', main)
}

function main() {
}

// spec: YYYY, D, M D, m M, h H, hm H M, YYYY M D, YYYY M D H, YYYY M D H M
// return an UTC date
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
            // FIXME: adding to december won't do
            return mk_date_utc(cur.year, cur.month+2, n)
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
        let dmax = days_in_month(cur.year, m)
        if (m >= cur.month+1 && m <= 12) { // probably later this year
            if (d >= cur.date && d <= dmax) // definitely later this year
                return mk_date_utc(cur.year, m, d)
            // in the next year
            cur = datetime(mk_date_utc(cur.year+1, m))
            dmax = days_in_month(cur.year, m)
            if (d >= 1 && d <= dmax) return mk_date_utc(cur.year, m, d)

        } else if (m >= 1 && m <= 12) { // in the next year
            cur = datetime(mk_date_utc(cur.year+1, m))
            dmax = days_in_month(cur.year, m)
            if (d >= 1 && d <= dmax) return mk_date_utc(cur.year, m, d)
        }
        throw new Error('M D')
    }

    throw new Error('invalid date spec')
}

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
            // next year
            assert.equal(future_date('11 2', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2020-11-02T00:00:00.000Z')

            assert.throws(() => future_date('2 31'))
            assert.throws(() => future_date('next dec'))
        })
    })
}
