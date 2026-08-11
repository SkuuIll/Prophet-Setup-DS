'use strict';

var schemas = require('../generated/schemas.cjs');
var commandFactory = require('../utils/commandFactory.cjs');

const getQuest = commandFactory.schemaCommandFactory(schemas.Command.GET_QUEST);

exports.getQuest = getQuest;
