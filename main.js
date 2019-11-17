#!/usr/bin/env -S mocha --ui=tdd

if (typeof window === 'undefined') run_tests(); else main()

function main() {
    document.addEventListener('DOMContentLoaded', app)
}

// spec: YYYY, D, M D, m M, h H, hm H M, YYYY M D, YYYY M D H, YYYY M D H M
// return an UTC date
function future_date(spec, now) {
    spec = spec.split(/\s+/).filter(Boolean)
    now = now || new Date()
    let cur_month = now.getMonth() // 0-indexed
    let cur_year = now.getFullYear()

    if (spec.length === 1) {
        // YYYY (a year) or D (a date in the current/next month)
        let n = Number(spec[0])
        if (n >= now.getDate() && n <= days_in_month(cur_year, cur_month+1)) {
            return mk_date_utc(cur_year, cur_month+1, n)
        } else if (n <= 31 && n <= days_in_month(cur_year, cur_month+2)) {
            return mk_date_utc(cur_year, cur_month+2, n)
        } else if (n > cur_year) {
            return mk_date_utc(n)
        }

        throw new Error('YYYY or D')
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

    suite('future_date', function() {
        test('YYYY or D', function() {
            // tomorrow
            assert.equal(future_date('18', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-11-18T00:00:00.000Z')
            assert.equal(future_date('31', new Date('2019-12-30T11:11:11.000Z')).toISOString(), '2019-12-31T00:00:00.000Z')

            // date in the next month
            assert.equal(future_date('2', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2019-12-02T00:00:00.000Z')

            // next year
            assert.equal(future_date('2020', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2020-01-01T00:00:00.000Z')
            assert.equal(future_date('2021', new Date('2019-11-17T11:11:11.000Z')).toISOString(), '2021-01-01T00:00:00.000Z')
        })
    })
}
