let prefix = '.';

module.exports = {
    botName: 'Trauma',
    version: '2.5.0',
    owner: '967784533190',

    defaultPrefix: '.',
    get prefix() { return prefix; },
    set prefix(newPrefix) { if (newPrefix && typeof newPrefix === 'string') prefix = newPrefix; },

    allowedGroups: [],
    messages: {},
    colors: {}
};
