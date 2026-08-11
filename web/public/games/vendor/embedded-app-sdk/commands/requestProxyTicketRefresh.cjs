'use strict';

var schemas = require('../generated/schemas.cjs');
var commandFactory = require('../utils/commandFactory.cjs');

const requestProxyTicketRefresh = commandFactory.schemaCommandFactory(schemas.Command.REQUEST_PROXY_TICKET_REFRESH);

exports.requestProxyTicketRefresh = requestProxyTicketRefresh;
