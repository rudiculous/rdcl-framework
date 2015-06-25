"use strict";

exports = module.exports = function money(amount, options) {
    if (options == null) options = {}; 
    let decimal = options.decimal || '.';
    let grouping = options.grouping || ''; 

    amount = String(Math.round(100 * Number(amount)));

    if (amount.match(/\d{3,}$/)) {
        let pivot = amount.length - 2;
        let integerPart = amount.substring(0, pivot);
        let grouped = ''; 

        for (let i = integerPart.length; i > 0; i -= 3) {
            grouped =
                integerPart.substring(i < 3 ? 0 : (i - 3), i) +
                (grouped ? grouping + grouped : '');
        }   

        amount = grouped + decimal + amount.substring(pivot);
    }   
    else {
        if (!amount.match(/\d{2,}$/)) {
            amount = '0' + amount;
        }   

        amount = '0' + decimal + amount;
    }   

    return amount;
};
