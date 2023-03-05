/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GPSPoint } from './calibration';
import { UnitData, DisplayableType, UnitRepresentType, UnitType, UnitDataById } from '../types/redux/units';
import { SelectOption } from '../types/items';
import * as _ from 'lodash';

// Notifies user of msg.
// TODO isValidGPSInput uses alert so continue that. Maybe all should be changed but this impacts other parts of the code.
// Note this causes the modal to close but the state is not reset.
// Use a function so can easily change how it works.
/**
 * Causes a window popup with msg
 * @param msg message to display
 */
export function notifyUser(msg: string) {
	window.alert(msg);
}

/**
 * get string value from GPSPoint or null.
 * @param gps GPS point to get value from and can be null
 * @returns string to represent the GPS value or empty string if null
 */
export function getGPSString(gps: GPSPoint | null) {
	if (gps === null) {
		//  if gps is null return empty string value
		return '';
	}
	else if (typeof gps === 'object') {
		// if gps is an object parse GPSPoint and return string value
		const json = JSON.stringify({ gps });
		const obj = JSON.parse(json);
		return `${obj.gps.latitude}, ${obj.gps.longitude}`;
	}
	else {
		// Assume it is a string that was input.
		return gps
	}
}

/**
 * Checks if the input is null and returns empty string if that is the case. Otherwise return input.
 * This is needed because React does not want values to be of type null for display and null is the
 * state for some of DB values. This only should change what is displayed and not the state or props.
 * @param item item to check if null and convert to empty string
 * @returns item if not null or empty string
 */
export function nullToEmptyString(item: any) {
	if (item === null) {
		return '';
	} else {
		return item;
	}
}

/**
 * Calculates the set of all possible graphic units for a meter/group.
 * This is any unit that is of type unit or suffix.
 * @returns The set of all possible graphic units for a meter/group
 */
export function potentialGraphicUnits(units: UnitDataById) {
	// Set of possible graphic units
	let possibleGraphicUnits = new Set<UnitData>();

	// The default graphic unit can be any unit of type unit or suffix.
	Object.values(units).forEach(unit => {
		if (unit.typeOfUnit == UnitType.unit || unit.typeOfUnit == UnitType.suffix) {
			possibleGraphicUnits.add(unit);
		}
	});
	// Put in alphabetical order.
	possibleGraphicUnits = new Set(_.sortBy(Array.from(possibleGraphicUnits), unit => unit.identifier.toLowerCase(), 'asc'));
	// The default graphic unit can also be no unit/-99 but that is not desired so put last in list.
	possibleGraphicUnits.add(noUnit);
	return possibleGraphicUnits;
}

/**
 * updates deepMeters to only have the ones after changes in meter selection between selectedMeters and newSelectedMeterOptions
 * as a new returned array
 * @param {number[]} deepMeters array of ids of all the current deep meters of the group
 * @param {SelectOption[]} selectedMeters array of the meters that were previously selected
 * @param {SelectOption[]} newSelectedMeterOptions array of currently selected meters
 * @returns new array with the updated deep meters
 */
export function updateDeepMetersOnMeter(deepMeters: number[] = [], selectedMeters: SelectOption[], newSelectedMeterOptions: SelectOption[]) {
	// Clone the state since will update in component.
	const localDeepMeters = [...deepMeters]
	// Find the meters that were removed
	const removedMeters = _.difference(selectedMeters, newSelectedMeterOptions);
	// Find the meters that were added.
	const addedMeters = _.difference(newSelectedMeterOptions, selectedMeters);
	// Remove those meters from localDeepMeters
	removedMeters.forEach((item) => {
		localDeepMeters.splice(deepMeters.indexOf(item.value), 1); 
	});
	// Add new meter to localDeepMeters
	addedMeters.forEach((item) => {
		localDeepMeters.push(item.value); 
	});
	return localDeepMeters;
}

// A non-unit
export const noUnit: UnitData = {
	// Only needs the id and identifier, others are dummy values.
	id: -99,
	name: '',
	identifier: 'no unit',
	unitRepresent: UnitRepresentType.unused,
	secInRate: 99,
	typeOfUnit: UnitType.unit,
	unitIndex: -99,
	suffix: '',
	displayable: DisplayableType.none,
	preferredDisplay: false,
	note: ''
}
