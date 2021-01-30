const failure = require('../services/csvPipeline/failure');
const validate = require('jsonschema').validate;

const DEFAULTS = {
	common: {
		headerRow: 'false',
		update: 'false'
	},
	meters: {
	},
	readings: {
		createMeter: 'false',
		cumulative: 'false',
		cumulativeReset: 'false',
		duplications: '1',
		timeSort: 'increasing',
	}
}

class PARAM {
	/**
	 * @param {string} paramName - The name of the parameter.
	 * @param {string} description - The description of what the parameter needs to be.
	 */
	constructor(paramName, description) {
		this.field = paramName;
		this.description = description;
		this.message = function (provided) {
			return `Provided value ${this.field}=${provided} is invalid. ${this.description}\n`
		}
	}
}

class ENUM_PARAM extends PARAM {
	/**
	 * @param {string} paramName - The name of the parameter
	 * @param {array} enums - The array of values to check against. enums.length must be greater or equal to one.
	 */
	constructor(paramName, enums) {
		super(paramName, `${paramName} can ${enums.length > 1 ? 'be one of' : 'be'} ${enums.toString()}.`);
		this.enum = enums;
	}
}
class BOOLEAN_PARAM extends ENUM_PARAM {
	/**
	 * @param {string} paramName - The name of the parameter.
	 */
	constructor(paramName) {
		super(paramName, ['true', 'false']);
	}
}

class STRING_PARAM extends PARAM {
	/**
	 * 
	 * @param {string} paramName - The name of the parameter.
	 * @param {string} pattern - Regular expression pattern to be used in validation. This can be undefined to avoid checking.
	 * @param {string} description - The description of what the parameter needs to be.
	 */
	constructor(paramName, pattern, description) {
		super(paramName, description);
		this.pattern = pattern;
		this.type = 'string';
	}
}

const COMMON_PROPERTIES = {
	headerrow: new BOOLEAN_PARAM('headerrow'),
	password: new STRING_PARAM('password', undefined, undefined), // This is put here so it would not trigger the additionalProperties error.
	update: new BOOLEAN_PARAM('update')
}

const VALIDATION = {
	meters: {
		type: 'object',
		properties: {
			...COMMON_PROPERTIES
		},
		additionalProperties: false // This protects us from unintended parameters.
	},
	readings: {
		type: 'object',
		required: ['meter'],
		properties: {
			...COMMON_PROPERTIES,
			createmeter: new BOOLEAN_PARAM('createmeter'),
			cumulative: new BOOLEAN_PARAM('cumulative'),
			cumulativeReset: new BOOLEAN_PARAM('cumulativereset'),
			duplications: new STRING_PARAM('duplications', '^\\d+$', 'duplications must be an integer.'),
			meter: new STRING_PARAM('meter', undefined, undefined),
			timesort: new ENUM_PARAM('timesort', ['increasing'])
		},
		additionalProperties: false // This protects us from unintended parameters.
	}
}

/**
 * This validates the body of the request. If there is an error, it will throw an error with the appropriate message. 
 */
function validateRequestParams(body, schema) {
	const { errors } = validate(body, schema);
	let responseMessage = '';
	if (errors.length !== 0) {
		errors.forEach(err => {
			if (err.schema instanceof PARAM) {
				responseMessage = responseMessage + err.schema.message(err.instance);
			} else if (err.name === 'required') {
				responseMessage = responseMessage + `${err.argument} must be provided as the field ${err.argument}=.\n`;
			} else if (err.name === 'additionalProperties') {
				responseMessage = responseMessage + err.argument + ' is an unexpected argument.\n';
			} else {
				responseMessage = responseMessage + err.message;
			}
		});
		return {
			responseMessage: responseMessage,
			success: false
		}
	}
	return {
		responseMessage: responseMessage,
		success: true
	}
}

function validateReadingsCsvUploadParams(req, res, next) {
	const { responseMessage, success } = validateRequestParams(req.body, VALIDATION.readings);
	if (!success) {
		failure(req, res, new Error(responseMessage));
		return;
	}
	const { createmeter: createMeter, cumulative, cumulativereset: cumulativeReset, duplications,
		length, headerrow: headerRow, timesort: timeSort, update } = req.body; // extract query parameters
	if (!createMeter) {
		req.body.createmeter = DEFAULTS.readings.createMeter;
	}
	if (!cumulative) {
		req.body.cumulative = DEFAULTS.readings.cumulative;
	}
	if (!duplications) {
		req.body.duplications = DEFAULTS.readings.duplications;
	}
	if (!headerRow) {
		req.body.headerrow = DEFAULTS.common.headerRow;
	}
	if (!timeSort) {
		req.body.timesort = DEFAULTS.readings.timeSort;
	}
	if (!update) {
		req.body.update = DEFAULTS.common.update;
	}
	next();
}

function validateMetersCsvUploadParams(req, res, next) {
	const { responseMessage, success } = validateRequestParams(req.body, VALIDATION.meters);
	if (!success) {
		failure(req, res, new Error(responseMessage));
		return;
	}
	const { headerrow: headerRow, update } = req.body; // extract query parameters
	if (!headerRow) {
		req.body.headerrow = DEFAULTS.common.headerRow;
	}
	if (!update) {
		req.body.update = DEFAULTS.common.update; // set default update param if not supplied
	}
	next();
}

module.exports = {
	validateMetersCsvUploadParams,
	validateReadingsCsvUploadParams
};