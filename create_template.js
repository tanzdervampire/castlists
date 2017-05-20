const fs = require('fs');
const sql = require('sql.js');
const moment = require('moment');

const db = (function () {
    const buffer = fs.readFileSync('db.sqlite');
    return new sql.Database(buffer);
})();

let likelyCast = {};
const dbProductions = db.exec('SELECT * FROM PRODUCTION');

const getProduction = (date) => {
    const showDate = moment(date, 'DD.MM.YYYY');
    let _ = (column) => {
        return dbProductions[0]['columns'].indexOf(column);
    };

    for (let i = 0; i < dbProductions[0]['values'].length; i++) {
        const production = dbProductions[0]['values'][i];

        if (production[_('LOCATION')] === 'Wien') {
            continue;
        }

        const startDate = moment(production[_('START')], 'YYYY-MM-DD HH:mm:ss.SSS');
        const endDate = moment(production[_('END')], 'YYYY-MM-DD HH:mm:ss.SSS');

        if (!showDate.isBefore(startDate) && !showDate.isAfter(endDate)) {
            return {
                'id': +production[_('ID')],
                'location': production[_('LOCATION')],
            };
        }
    }

    console.log('Could not get production ID for date = ' + date.format('DD.MM.YYYY'));
    throw {};
};

const dbPersons = db.exec('SELECT * FROM PERSON');
const toName = (personId) => {
    let _ = (column) => {
        return dbPersons[0]['columns'].indexOf(column);
    };

    for (let i = 0; i < dbPersons[0]['values'].length; i++) {
        if (dbPersons[0]['values'][i][_('ID')] === personId) {
            return dbPersons[0]['values'][i][_('NAME')];
        }
    }

    console.log('Cannot convert personId ' + personId + ' to name');
    throw {};
};

const calculateLikelyCast = (productionId) => {
    const statement = db.prepare(`
        SELECT
            "CAST".PERSON_ID AS PERSON_ID
        FROM "CAST"
        WHERE
            "CAST".SHOW_ID IN (
                SELECT ID FROM SHOW WHERE PRODUCTION_ID = :productionId
            )
            AND "CAST".ROLE = :role
        GROUP BY "CAST".ROLE, "CAST".PERSON_ID
        ORDER BY "CAST".ROLE, COUNT( * ) DESC
    `);

    let cast = {
        'Graf von Krolock': [],
        'Sarah': [],
        'Alfred': [],
        'Professor Abronsius': [],
        'Chagal': [],
        'Magda': [],
        'Rebecca': [],
        'Herbert': [],
        'Koukol': [],
        'Tanzsolisten': [],
        'Gesangssolisten': [],
        'Tanzensemble': [],
        'Gesangsensemble': [],
        'Dirigent': [],
    };

    // TODO Also get the other cast members? :/
    try {
        [
            'Graf von Krolock',
            'Alfred',
            'Sarah',
            'Professor Abronsius',
            'Chagal',
            'Magda',
            'Rebecca',
            'Koukol',
            'Herbert',
            'Dirigent'
        ].forEach((role) => {
            statement.bind({
                ':productionId': productionId,
                ':role': role,
            });

            statement.step();
            const result = statement.getAsObject();
            const personId = +result['PERSON_ID'];
            if (isNaN(personId)) {
                return;
            }

            cast[role] = [toName(personId)];
        });
    } finally {
        statement.free();
    }

    return cast;
};

(() => {
    let _ = (column) => {
        return dbProductions[0]['columns'].indexOf(column);
    };

    for (let i = 0; i < dbProductions[0]['values'].length; i++) {
        const production = dbProductions[0]['values'][i];
        const productionId = production[_('ID')];
        likelyCast[productionId] = calculateLikelyCast(productionId);
    }
})();

const getTemplate = (date) => {
    const day = date.format('DD.MM.YYYY');
    const time = date.format('HH:mm');
    const type = ((+date.format('HH')) < 18) ? 'Matinée' : 'Soirée';
    const production = getProduction(date);

    return {
        'date': day,
        'time': time,
        'type': type,
        'location': production['location'],
        'cast': likelyCast[production['id']],
    };
};

fs.readdir('./images', (err, items) => {
    if (err) {
        throw err;
    }

    const sortedFiles = items.sort((a, b) => {
        const dateA = moment(a.split(/\./)[0], 'DD_MM_YYYY_HHmm');
        const dateB = moment(b.split(/\./)[0], 'DD_MM_YYYY_HHmm');
        return dateA.isBefore(dateB) ? -1 : +1;
    });

    const result = sortedFiles.map((file) => {
        try {
            return getTemplate(moment(file.split(/\./)[0], 'DD_MM_YYYY_HHmm'));
        } catch (e) {
            console.log('Failed for ' + file);
        }
    });

    // TODO write to file
    console.log(JSON.stringify(result, null, 4));
});