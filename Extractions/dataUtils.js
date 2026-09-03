const fs = require('fs');
const path = require('path');

const kickedFilePath = path.join(__dirname, 'kicked.json');

function getUniqueKicked() {
    try {
        if (!fs.existsSync(kickedFilePath)) {
            return { count: 0, ids: [] };
        }

        const raw = fs.readFileSync(kickedFilePath, 'utf8');
        const data = JSON.parse(raw);
        const ids = Object.keys(data);
        return { count: ids.length, ids };
    } catch (err) {
        console.error('Error getUniqueKicked:', err);
        return { count: 0, ids: [] };
    }
}

function addKicked(lids) {
    try {
        let data = {};
        if (fs.existsSync(kickedFilePath)) {
            const raw = fs.readFileSync(kickedFilePath, 'utf8');
            data = JSON.parse(raw);
        }

        lids.forEach(lid => {
            data[lid] = { timestamp: Date.now() };
        });

        fs.writeFileSync(kickedFilePath, JSON.stringify(data, null, 2));

        return { count: Object.keys(data).length };
    } catch (err) {
        console.error('Error addKicked:', err);
        return { count: 0 };
    }
}

module.exports = { getUniqueKicked, addKicked };