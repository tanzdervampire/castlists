const fs = require('fs');
const sql = require('sql.js');
const moment = require('moment');
const business = require('moment-business');

const allowedTimes = ['14:00', '14:30', '18:00', '18:30', '19:00', '19:30'];
let dateCount = {};

const processFile = (filename) => {
    const date = moment(filename.split(/\./)[0], 'DD_MM_YYYY_HHmm');
    if (!allowedTimes.includes(date.format('HH:mm'))) {
        console.log(filename + ': invalid showtime');
    }

    const isMatinee = (+date.format('HH')) < 18;
    if (isMatinee && business.isWeekDay(date)) {
        console.log(filename + ': matinee on a weekday');
    }

    const day = date.format('DDMMYYYY');
    dateCount[day] = dateCount[day] || 0;
    dateCount[day]++;

    if (dateCount[day] > 2) {
        console.log(filename + ': more than two shows a day');
    }

    const newTimestamp = date.toDate();
    fs.utimesSync('./images/' + filename, newTimestamp, newTimestamp);
};

fs.readdir('./images', (err, items) => {
    if (err) {
        throw err;
    }

    items.forEach(processFile);
});
