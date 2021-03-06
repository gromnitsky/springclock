#!/usr/bin/env -S mocha --ui=tdd
'use strict';

let assert = require('assert')
let {future_date, future_date_select, seasons, events_parse} = require('./main')
process.env.TZ = 'Europe/Kiev'

suite('future_date', function() {
    test('YYYY, D', function() {
        // tomorrow
        assert.equal(future_date('18', new Date('2019-11-17T11:11:11')).s(),
                     '2019-11-18T00:00:00.000+02:00')
        assert.equal(future_date('31', new Date('2019-12-30T11:11:11')).s(),
                     '2019-12-31T00:00:00.000+02:00')
        assert.equal(future_date('1',  new Date('2019-12-30T11:11:11')).s(),
                     '2020-01-01T00:00:00.000+02:00')

        assert.throws(() => future_date('32'))
        assert.throws(() => future_date('first'))

        // date in the next month
        assert.equal(future_date('2', new Date('2019-11-17T11:11:11')).s(),
                     '2019-12-02T00:00:00.000+02:00')

        // next year
        assert.equal(future_date('2020', new Date('2019-11-17T11:11:11')).s(),
                     '2020-01-01T00:00:00.000+02:00')
        assert.equal(future_date('2021', new Date('2019-11-17T11:11:11')).s(),
                     '2021-01-01T00:00:00.000+02:00')
    })

    test('M D, m M, h H', function() {
        // the next month
        assert.equal(future_date('m 12', new Date('2019-11-17T11:11:11')).s(),
                     '2019-12-01T00:00:00.000+02:00')
        // some month in the next year
        assert.equal(future_date('m 2', new Date('2019-11-17T11:11:11')).s(),
                     '2020-02-01T00:00:00.000+02:00')

        assert.throws(() => future_date('m december'))
        assert.throws(() => future_date('m 123'))

        // later this day
        assert.equal(future_date('h 23', new Date('2019-11-17T11:11:11')).s(),
                     '2019-11-17T23:00:00.000+02:00')
        // the next day
        assert.equal(future_date('h 2', new Date('2019-11-17T11:11:11')).s(),
                     '2019-11-18T02:00:00.000+02:00')
        assert.equal(future_date('h 2', new Date('2019-12-31T11:11:11')).s(),
                     '2020-01-01T02:00:00.000+02:00')

        assert.throws(() => future_date('h 25'))

        // M D, later this month
        assert.equal(future_date('11 18', new Date('2019-11-17T11:11:11')).s(),
                     '2019-11-18T00:00:00.000+02:00')
        // this year
        assert.equal(future_date('12 1', new Date('2019-11-17T11:11:11')).s(),
                     '2019-12-01T00:00:00.000+02:00')
        // next year
        assert.equal(future_date('11 2', new Date('2019-11-17T11:11:11')).s(),
                     '2020-11-02T00:00:00.000+02:00')
        // the new year
        assert.equal(future_date('1 1', new Date('2019-11-17T11:11:11')).s(),
                     '2020-01-01T00:00:00.000+02:00')

        assert.throws(() => future_date('2 31'))
        assert.throws(() => future_date('next dec'))
    })

    test('hm H M, YYYY M D', function() {
        // later this hour
        assert.equal(future_date('hm 13 12', new Date('2019-11-17T11:11:11')).s(), '2019-11-17T13:12:00.000+02:00')
        // later this day
        assert.equal(future_date('hm 20 00', new Date('2019-11-17T11:11:11')).s(), '2019-11-17T20:00:00.000+02:00')
        // next day
        assert.equal(future_date('hm 10 11', new Date('2019-11-17T11:11:11')).s(), '2019-11-18T10:11:00.000+02:00')

        assert.throws(() => future_date('hm 24 60'))

        assert.equal(future_date('2019 11 18', new Date('2019-11-17T11:11:11')).s(), '2019-11-18T00:00:00.000+02:00')

        assert.throws(() => future_date('2019 11 16'))
    })

    test('YYYY M D H, YYYY M D H M', function() {
        assert.equal(future_date('2019 11 17 20', new Date('2019-11-17T11:11:11')).s(), '2019-11-17T20:00:00.000+02:00')
        assert.equal(future_date('2019 11 17 20 12', new Date('2019-11-17T11:11:11')).s(), '2019-11-17T20:12:00.000+02:00')

        assert.throws(() => future_date('2019 11 16 20 12'))
    })
})

suite('future date selection', function() {
    test('future_date_select', function() {
        assert.equal(future_date_select(seasons, true, new Date('2019-11-17T11:11:11')).event.desc, 'Winter')
        assert.equal(future_date_select(seasons, true, new Date('2019-01-17T11:11:11')).event.desc, 'Spring')
    })

    test('events_parse', function() {
        assert.deepEqual(events_parse(''), [])
        assert.deepEqual(events_parse('1  1\n  hm 1 1  , omglol'),
                         [{spec: '1  1', desc: ''}, {spec: '  hm 1 1  ', desc: ' omglol'}])

        assert.throws(() => events_parse('1  1\n omglol'),
                      /Error: line 2: " omglol" is invalid: YYYY, D/)
    })
})

Date.prototype.s = function() {
    var z  = n =>  ('0' + n).slice(-2);
    var zz = n => ('00' + n).slice(-3);
    var off = this.getTimezoneOffset();
    var sign = off < 0? '+' : '-';
    off = Math.abs(off);

    return this.getFullYear() + '-'
        + z(this.getMonth()+1) + '-' +
        z(this.getDate()) + 'T' +
        z(this.getHours()) + ':'  +
        z(this.getMinutes()) + ':' +
        z(this.getSeconds()) + '.' +
        zz(this.getMilliseconds()) +
        sign + z(off/60|0) + ':' + z(off%60);
}
