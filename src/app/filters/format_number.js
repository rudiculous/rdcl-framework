"use strict";

exports = module.exports = function format_number(amount, options) {
    if (options == null) options = {};
    let decimal = options.decimal;
    let grouping = options.grouping;
    let precision = options.precision;
    let groupSize = 3;

    if (decimal == null) decimal = '.';
    if (grouping == null) grouping = '';
    if (precision == null) precision = 2;

    amount = Number(amount).toFixed(precision);

    // let [integerPart, decimalPart] = amount.split('.');
    let parts = amount.split('.');
    let integerPart = parts[0];
    let decimalPart = parts[1];
    let sign = '';

    if (integerPart[0] === '-') {
        sign = '-';
        integerPart = integerPart.substring(1);
    }

    if (integerPart.length > groupSize) {
        let grouped = '';

        for (let i = integerPart.length; i > 0; i -= groupSize) {
            grouped =
                integerPart.substring(i < groupSize ? 0 : (i - groupSize), i) +
                (grouped ? grouping + grouped : '');
        }

        integerPart = grouped;
    }

    return sign + integerPart + decimal + decimalPart;
};
